import { Duration, Effect, Fiber, Runtime } from "effect"

import { type ObsConfig } from "../config/config.js"
import { createObsClient, type ObsClient } from "./client.js"
import { ObsProtocolError } from "./errors.js"
import {
  type BufferedObsEvent,
  createObsEventBuffer,
  type ObsEventBufferSnapshotInput,
  type ObsEventListener,
  type ObsEventMatcher,
  type ObsEventWaitOptions
} from "./events.js"

// eslint-disable-next-line functional/no-mixed-types -- listener records carry metadata plus the callback.
interface ManagedEventListener {
  readonly id: number
  readonly listener: ObsEventListener
}

interface ReconnectBackoffOptions {
  readonly initialDelayMs?: number
  readonly maxDelayMs?: number
  readonly maxAttempts?: number
}

// eslint-disable-next-line functional/no-mixed-types -- reconnect options include a connection factory port.
interface ReconnectingObsClientOptions {
  readonly connect?: (config: ObsConfig, signal?: AbortSignal) => Promise<ObsClient>
  readonly reconnectBackoff?: ReconnectBackoffOptions
}

const CLOSED_BEFORE_SEND_MESSAGE = "OBS websocket is closed"
const CLOSED_DURING_REQUEST_MESSAGE = "OBS websocket closed"
const DEFAULT_RECONNECT_INITIAL_DELAY_MS = 250
const DEFAULT_RECONNECT_MAX_DELAY_MS = 4_000
const DEFAULT_RECONNECT_MAX_ATTEMPTS = 5
const BACKOFF_MULTIPLIER = 2

const isReconnectableClose = (error: unknown): error is ObsProtocolError =>
  error instanceof ObsProtocolError
  && (error.message === CLOSED_BEFORE_SEND_MESSAGE || error.message === CLOSED_DURING_REQUEST_MESSAGE)

const canRetryAfterReconnect = (error: unknown): boolean =>
  error instanceof ObsProtocolError && error.message === CLOSED_BEFORE_SEND_MESSAGE

const positiveIntegerOrDefault = (value: number | undefined, fallback: number): number =>
  value !== undefined && Number.isInteger(value) && value > 0 ? value : fallback

const toError = (error: unknown): Error => error instanceof Error ? error : new Error(String(error))

export const createReconnectingObsClientEffect = (
  config: ObsConfig,
  options: ReconnectingObsClientOptions = {}
): Effect.Effect<ObsClient, Error> =>
  Effect.gen(function*() {
    const connect = options.connect ?? createObsClient
    const runtime = yield* Effect.runtime<never>()
    const runEffect = Runtime.runPromise(runtime)
    const runFork = Runtime.runFork(runtime)
    const initialDelayMs = positiveIntegerOrDefault(
      options.reconnectBackoff?.initialDelayMs,
      DEFAULT_RECONNECT_INITIAL_DELAY_MS
    )
    const maxDelayMs = positiveIntegerOrDefault(options.reconnectBackoff?.maxDelayMs, DEFAULT_RECONNECT_MAX_DELAY_MS)
    const maxAttempts = positiveIntegerOrDefault(
      options.reconnectBackoff?.maxAttempts,
      DEFAULT_RECONNECT_MAX_ATTEMPTS
    )
    const eventBuffer = createObsEventBuffer(
      config.eventBufferCapacity === undefined ? {} : { capacity: config.eventBufferCapacity }
    )
    const connectOnce = Effect.tryPromise({
      try: (signal) => connect(config, signal),
      catch: toError
    })
    let client = yield* connectOnce
    let connecting: Promise<ObsClient> | undefined
    let connectingFiber: Fiber.RuntimeFiber<ObsClient, Error> | undefined
    let closed = false
    let needsReconnect = false
    let activeEventWaits = 0
    let nextListenerId = 0
    let eventListeners: ReadonlyArray<ManagedEventListener> = []
    let removeClientEventListener: (() => void) | undefined
    let removeClientCloseListener: (() => void) | undefined
    let passiveReconnectLoop: Promise<void> | undefined

    const throwIfClosed = (): void => {
      /* v8 ignore next 3 -- public closed-client behavior is covered through request after close. */
      if (closed) {
        throw new ObsProtocolError("OBS client closed")
      }
    }

    const publishEvent = (event: BufferedObsEvent): void => {
      const bufferedEvent = eventBuffer.recordDecoded({
        eventType: event.eventType,
        eventIntent: event.eventIntent,
        eventData: event.eventData
      })
      for (const entry of eventListeners) {
        entry.listener(bufferedEvent)
      }
    }

    const detachClientHooks = (): void => {
      removeClientEventListener?.()
      removeClientEventListener = undefined
      removeClientCloseListener?.()
      removeClientCloseListener = undefined
    }

    const shouldReconnectForPassiveObserver = (): boolean => eventListeners.length > 0 || activeEventWaits > 0

    const shouldContinuePassiveReconnect = (): boolean =>
      !closed && needsReconnect && shouldReconnectForPassiveObserver()

    const reconnect = (): Promise<ObsClient> => {
      throwIfClosed()
      if (connecting !== undefined) {
        return connecting
      }
      const fiber = runFork(reconnectEffect)
      connectingFiber = fiber
      const promise = runEffect(Fiber.join(fiber)).finally(() => {
        /* v8 ignore next 3 -- a reconnect promise owns its fiber until this finalizer clears it. */
        if (connectingFiber === fiber) {
          connectingFiber = undefined
        }
        /* v8 ignore next 3 -- a reconnect promise owns the shared slot until this finalizer clears it. */
        if (connecting === promise) {
          connecting = undefined
        }
      })
      connecting = promise
      return promise
    }

    const markDisconnected = (failedClient: ObsClient): void => {
      /* v8 ignore next 3 -- stale-client close notifications can only race with another reconnect. */
      if (failedClient !== client || closed) {
        return
      }
      needsReconnect = true
      detachClientHooks()
      void failedClient.close().catch(() => undefined)
      if (shouldReconnectForPassiveObserver()) {
        ensurePassiveReconnect()
      }
    }

    const runPassiveReconnectLoop = async (): Promise<void> => {
      while (shouldContinuePassiveReconnect()) {
        try {
          await reconnect()
          return
        } catch {
          /* v8 ignore next 3 -- observer removal or close during a failed passive reconnect only stops retrying. */
          if (shouldContinuePassiveReconnect()) {
            await runEffect(Effect.sleep(Duration.millis(maxDelayMs)))
          }
        }
      }
    }

    const ensurePassiveReconnect = (): void => {
      /* v8 ignore next 3 -- scheduling is idempotent; active passive retry behavior is covered. */
      if (!shouldContinuePassiveReconnect() || passiveReconnectLoop !== undefined) {
        return
      }
      const loop = runPassiveReconnectLoop().finally(() => {
        /* v8 ignore next 3 -- a passive reconnect loop owns the shared slot until this finalizer clears it. */
        if (passiveReconnectLoop === loop) {
          passiveReconnectLoop = undefined
        }
      })
      passiveReconnectLoop = loop
      /* v8 ignore next -- runPassiveReconnectLoop catches reconnect failures and exits normally. */
      void loop.catch(() => undefined)
    }

    const awaitReconnect = async (): Promise<ObsClient> => {
      try {
        return await reconnect()
      } catch (error) {
        if (closed) {
          throw new ObsProtocolError("OBS client closed")
        }
        throw error
      }
    }

    const attachClientHooks = (nextClient: ObsClient): void => {
      let replayPublishedSequences: ReadonlyArray<number> | undefined = []
      removeClientEventListener = nextClient.addEventListener((event) => {
        if (replayPublishedSequences !== undefined) {
          replayPublishedSequences = [...replayPublishedSequences, event.sequence]
        }
        publishEvent(event)
      })
      for (const event of nextClient.getBufferedEvents().events) {
        /* v8 ignore next 3 -- duplicate suppression only races with events emitted during hook installation. */
        if (!replayPublishedSequences.includes(event.sequence)) {
          publishEvent(event)
        }
      }
      replayPublishedSequences = undefined
      removeClientCloseListener = nextClient.onConnectionClosed?.(() => {
        markDisconnected(nextClient)
      })
    }

    const connectAttempt = (attempt: number, delayMs: number): Effect.Effect<ObsClient, Error> =>
      Effect.catchAll(
        connectOnce,
        (error) =>
          attempt >= maxAttempts
            ? Effect.fail(error)
            : Effect.zipRight(
              Effect.sleep(Duration.millis(delayMs)),
              connectAttempt(attempt + 1, Math.min(delayMs * BACKOFF_MULTIPLIER, maxDelayMs))
            )
      )

    const reconnectEffect = Effect.gen(function*() {
      throwIfClosed()
      const previous = client
      detachClientHooks()
      yield* Effect.promise(() => previous.close().catch(() => undefined))
      throwIfClosed()
      const nextClient = yield* connectAttempt(1, initialDelayMs)
      /* v8 ignore next 4 -- close can only win this race after a new websocket handshakes but before assignment. */
      if (closed) {
        yield* Effect.promise(() => nextClient.close().catch(() => undefined))
        throw new ObsProtocolError("OBS client closed")
      }
      client = nextClient
      needsReconnect = false
      attachClientHooks(nextClient)
      return nextClient
    })

    attachClientHooks(client)

    const currentClient = async (): Promise<ObsClient> => {
      if (closed) {
        throw new ObsProtocolError("OBS client closed")
      }
      if (needsReconnect || connecting !== undefined) {
        return awaitReconnect()
      }
      return client
    }

    const withReconnect = async <Value>(operation: (current: ObsClient) => Promise<Value>): Promise<Value> => {
      const activeClient = await currentClient()
      try {
        return await operation(activeClient)
      } catch (error) {
        if (!isReconnectableClose(error)) {
          throw error
        }
        markDisconnected(activeClient)
        if (!canRetryAfterReconnect(error)) {
          throw error
        }
        return operation(await awaitReconnect())
      }
    }

    return {
      get negotiatedRpcVersion() {
        return client.negotiatedRpcVersion
      },
      get availableRequests() {
        return client.availableRequests
      },
      request: async (descriptor, requestData) => withReconnect((current) => current.request(descriptor, requestData)),
      requestBatch: async (batch) => withReconnect((current) => current.requestBatch(batch)),
      getBufferedEvents: (input?: ObsEventBufferSnapshotInput) => eventBuffer.snapshot(input),
      waitForBufferedEvent: async (match: ObsEventMatcher, waitOptions: ObsEventWaitOptions) => {
        if (needsReconnect || connecting !== undefined) {
          await awaitReconnect()
        }
        activeEventWaits += 1
        try {
          return await eventBuffer.waitFor(match, waitOptions)
        } finally {
          activeEventWaits -= 1
        }
      },
      addEventListener: (listener: ObsEventListener) => {
        const id = nextListenerId
        nextListenerId += 1
        eventListeners = [...eventListeners, { id, listener }]
        /* v8 ignore next 3 -- closed clients cannot also be in the needs-reconnect listener path. */
        if (needsReconnect && connecting === undefined && !closed) {
          ensurePassiveReconnect()
        }
        return () => {
          eventListeners = eventListeners.filter((candidate) => candidate.id !== id)
        }
      },
      close: async () => {
        if (closed) {
          return
        }
        closed = true
        detachClientHooks()
        eventBuffer.close(new ObsProtocolError("OBS client closed"))
        const fiber = connectingFiber
        if (fiber !== undefined) {
          /* v8 ignore next -- interrupt failures are intentionally swallowed during shutdown. */
          await runEffect(Fiber.interrupt(fiber)).catch(() => undefined)
        }
        await client.close()
      }
    }
  })

export const createReconnectingObsClient = async (
  config: ObsConfig,
  options: ReconnectingObsClientOptions = {}
): Promise<ObsClient> => Effect.runPromise(createReconnectingObsClientEffect(config, options))
