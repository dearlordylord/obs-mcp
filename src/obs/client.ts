import { Option, Schema } from "effect"
import { randomUUID } from "node:crypto"
import WebSocket from "ws"

import { type ObsConfig, redactedObsWebSocketUrl } from "../config/config.js"
import { ObsNumber, ObsString, UnknownRecord } from "../domain/schemas/shared.js"
import { calculateObsAuthentication } from "./auth.js"
import { ObsProtocolError, ObsRequestError, ObsTimeoutError } from "./errors.js"
import {
  createObsEventBuffer,
  type ObsEventBufferSnapshot,
  type ObsEventBufferSnapshotInput,
  type ObsEventListener,
  type ObsEventMatcher,
  type ObsEventWaitOptions,
  type ObsEventWaitResult
} from "./events.js"
import {
  decodeEventEnvelope,
  decodeJsonTextEnvelope,
  OP_EVENT,
  OP_IDENTIFIED,
  OP_IDENTIFY,
  OP_REQUEST,
  OP_REQUEST_BATCH,
  OP_REQUEST_BATCH_RESPONSE,
  OP_REQUEST_RESPONSE,
  type RequestBatchResponseEnvelope,
  type RequestResponseEnvelope,
  SAFE_EVENT_SUBSCRIPTION_MASK
} from "./protocol.js"
import { GetVersion, type ObsRequestDescriptor } from "./requests.js"

const SUPPORTED_RPC_VERSION = 1

interface PendingRequestMetadata {
  readonly requestType: string
  readonly timer: NodeJS.Timeout
}

interface PendingRequestCallbacks {
  readonly resolve: (value: Record<string, unknown>) => void
  readonly reject: (error: Error) => void
}

type PendingRequest = PendingRequestMetadata & PendingRequestCallbacks

interface BatchRequestItem {
  readonly requestType: string
  readonly requestId?: string
  readonly requestData?: Record<string, unknown>
}

interface BatchRequestPayload {
  readonly executionType: number
  readonly haltOnFailure: boolean
  readonly requests: ReadonlyArray<BatchRequestItem>
}

export interface BatchRequestResult {
  readonly requestType: string
  readonly requestId?: string | undefined
  readonly requestStatus: {
    readonly result: boolean
    readonly code: number
    readonly comment?: string | undefined
  }
  readonly responseData?: Record<string, unknown> | undefined
}

interface ObsClientState {
  readonly negotiatedRpcVersion: number
  readonly availableRequests: ReadonlyArray<string>
}

interface ObsClientCommands {
  request<Output extends Record<string, unknown>>(
    descriptor: ObsRequestDescriptor<Output>,
    requestData?: Record<string, unknown>
  ): Promise<Output>
  requestBatch(batch: BatchRequestPayload): Promise<ReadonlyArray<BatchRequestResult>>
  getBufferedEvents(input?: ObsEventBufferSnapshotInput): ObsEventBufferSnapshot
  waitForBufferedEvent(match: ObsEventMatcher, options: ObsEventWaitOptions): Promise<ObsEventWaitResult>
  addEventListener(listener: ObsEventListener): () => void
  close(): Promise<void>
}

export type ObsClient = ObsClientState & ObsClientCommands

interface ObsClientOptions {
  readonly eventBufferCapacity?: number
}

export const createObsClient = async (config: ObsConfig, options: ObsClientOptions = {}): Promise<ObsClient> => {
  const eventBufferCapacity = options.eventBufferCapacity ?? config.eventBufferCapacity
  const eventBuffer = createObsEventBuffer(
    eventBufferCapacity === undefined ? {} : { capacity: eventBufferCapacity }
  )
  const ws = new WebSocket(config.url, "obswebsocket.json")
  let pending = new Map<string, PendingRequest>()
  let pendingBatches = new Map<string, PendingRequestCallbacks & { readonly timer: NodeJS.Timeout }>()
  let queuedMessages: ReadonlyArray<{ readonly data: WebSocket.RawData; readonly isBinary: boolean }> = []
  let messageWaiters: ReadonlyArray<{
    readonly resolve: (message: { readonly data: WebSocket.RawData; readonly isBinary: boolean }) => void
  }> = []
  let negotiatedRpcVersion = 0
  let closed = false
  let eventListeners: ReadonlyArray<ObsEventListener> = []

  const onBufferedMessage = (data: WebSocket.RawData, isBinary: boolean): void => {
    const [waiter, ...remainingWaiters] = messageWaiters
    messageWaiters = remainingWaiters
    if (waiter === undefined) {
      queuedMessages = [...queuedMessages, { data, isBinary }]
      return
    }
    waiter.resolve({ data, isBinary })
  }
  ws.on("message", onBufferedMessage)

  const rejectAll = (error: Error): void => {
    for (const request of pending.values()) {
      clearTimeout(request.timer)
      request.reject(error)
    }
    pending = new Map()
    for (const request of pendingBatches.values()) {
      clearTimeout(request.timer)
      request.reject(error)
    }
    pendingBatches = new Map()
  }

  const handleResponse = (response: RequestResponseEnvelope): void => {
    const pendingRequest = pending.get(response.d.requestId)
    if (pendingRequest === undefined) {
      return
    }
    pending = new Map([...pending].filter(([requestId]) => requestId !== response.d.requestId))
    clearTimeout(pendingRequest.timer)
    if (response.d.requestStatus.result === false) {
      pendingRequest.reject(
        new ObsRequestError(response.d.requestType, response.d.requestStatus.code, response.d.requestStatus.comment)
      )
      return
    }
    pendingRequest.resolve(response.d.responseData ?? {})
  }

  const handleBatchResponse = (response: RequestBatchResponseEnvelope): void => {
    const pendingRequest = pendingBatches.get(response.d.requestId)
    if (pendingRequest === undefined) {
      return
    }
    pendingBatches = new Map([...pendingBatches].filter(([requestId]) => requestId !== response.d.requestId))
    clearTimeout(pendingRequest.timer)
    pendingRequest.resolve({ results: response.d.results })
  }

  const handlePostHandshakeMessage = (data: WebSocket.RawData, isBinary: boolean): void => {
    if (isBinary) {
      rejectAll(new ObsProtocolError("OBS sent a binary frame; JSON text frames are required"))
      ws.close()
      return
    }
    try {
      const text = data.toString("utf8")
      const envelope = decodeJsonTextEnvelope(text)
      if (envelope.op === OP_REQUEST_RESPONSE) {
        handleResponse(envelope)
        return
      }
      if (envelope.op === OP_REQUEST_BATCH_RESPONSE) {
        handleBatchResponse(envelope)
        return
      }
      if (envelope.op === OP_EVENT) {
        const before = eventBuffer.snapshot().latestSequence
        eventBuffer.record(decodeEventEnvelope(text))
        const [bufferedEvent] = eventBuffer.snapshot({ sinceSequence: before }).events
        if (bufferedEvent !== undefined) {
          for (const listener of eventListeners) {
            listener(bufferedEvent)
          }
        }
      }
    } catch (error) {
      /* v8 ignore next */
      const protocolError = error instanceof Error ? error : new ObsProtocolError(String(error))
      rejectAll(protocolError)
      ws.close()
    }
  }

  const waitForOpen = async (): Promise<void> =>
    new Promise((resolve, reject) => {
      /* v8 ignore next 3 */
      const timer = setTimeout(() => {
        reject(new ObsTimeoutError(`Timed out connecting to OBS at ${redactedObsWebSocketUrl(config.url)}`))
        ws.close()
      }, config.connectionTimeoutMs)
      ws.once("open", () => {
        clearTimeout(timer)
        resolve()
      })
      /* v8 ignore next 4 */
      ws.once("error", (error) => {
        clearTimeout(timer)
        reject(error)
      })
    })

  const nextTextMessage = async (): Promise<string> =>
    new Promise((resolve, reject) => {
      /* v8 ignore next 4 */
      const timer = setTimeout(
        () => reject(new ObsTimeoutError("Timed out waiting for OBS handshake")),
        config.connectionTimeoutMs
      )
      /* v8 ignore next 4 */
      const onClose = (): void => {
        cleanup()
        reject(new ObsProtocolError("OBS closed the socket during handshake"))
      }
      /* v8 ignore next 4 */
      const onError = (error: Error): void => {
        cleanup()
        reject(error)
      }
      const cleanup = (): void => {
        clearTimeout(timer)
        ws.off("close", onClose)
        ws.off("error", onError)
      }
      const handleMessage = (data: WebSocket.RawData, isBinary: boolean): void => {
        cleanup()
        if (isBinary) {
          reject(new ObsProtocolError("OBS sent a binary frame; JSON text frames are required"))
          return
        }
        resolve(data.toString("utf8"))
      }
      const [queued, ...remainingQueuedMessages] = queuedMessages
      if (queued !== undefined) {
        queuedMessages = remainingQueuedMessages
        handleMessage(queued.data, queued.isBinary)
        return
      }
      messageWaiters = [...messageWaiters, { resolve: (message) => handleMessage(message.data, message.isBinary) }]
      ws.once("close", onClose)
      ws.once("error", onError)
    })

  try {
    await waitForOpen()
    const hello = decodeJsonTextEnvelope(await nextTextMessage())
    if (hello.op !== 0) {
      throw new ObsProtocolError("Expected OBS Hello message")
    }
    if (hello.d.rpcVersion < SUPPORTED_RPC_VERSION) {
      throw new ObsProtocolError(`OBS websocket RPC version ${hello.d.rpcVersion} is not supported`)
    }

    const password = Option.getOrUndefined(config.password)
    const eventSubscriptions = SAFE_EVENT_SUBSCRIPTION_MASK
    let authentication: string | undefined
    if (hello.d.authentication !== undefined) {
      if (password === undefined || password.length === 0) {
        throw new ObsProtocolError("OBS requires authentication but OBS_WEBSOCKET_PASSWORD is not configured")
      }
      authentication = calculateObsAuthentication(password, hello.d.authentication)
    }
    const identifyData: Record<string, unknown> = {
      rpcVersion: SUPPORTED_RPC_VERSION,
      eventSubscriptions,
      ...(authentication === undefined ? {} : { authentication })
    }
    ws.send(JSON.stringify({ op: OP_IDENTIFY, d: identifyData }))

    const identified = decodeJsonTextEnvelope(await nextTextMessage())
    if (identified.op !== OP_IDENTIFIED) {
      throw new ObsProtocolError("Expected OBS Identified message")
    }
    negotiatedRpcVersion = identified.d.negotiatedRpcVersion
    ws.off("message", onBufferedMessage)
    ws.on("message", handlePostHandshakeMessage)
    const bufferedMessages = queuedMessages
    queuedMessages = []
    for (const queued of bufferedMessages) {
      handlePostHandshakeMessage(queued.data, queued.isBinary)
    }
  } catch (error) {
    ws.off("message", onBufferedMessage)
    if (ws.readyState !== WebSocket.CLOSED && ws.readyState !== WebSocket.CLOSING) {
      ws.close()
    }
    throw error
  }

  ws.on("close", () => {
    closed = true
    eventBuffer.close(new ObsProtocolError("OBS websocket closed"))
    rejectAll(new ObsProtocolError("OBS websocket closed"))
  })
  /* v8 ignore next 3 */
  ws.on("error", (error) => {
    eventBuffer.close(error)
    rejectAll(error)
  })

  const sendRawRequest = async (
    requestType: string,
    requestData?: Record<string, unknown>
  ): Promise<Record<string, unknown>> =>
    new Promise((resolve, reject) => {
      if (closed) {
        reject(new ObsProtocolError("OBS websocket is closed"))
        return
      }
      const requestId = randomUUID()
      const timer = setTimeout(() => {
        pending = new Map([...pending].filter(([pendingRequestId]) => pendingRequestId !== requestId))
        reject(new ObsTimeoutError(`Timed out waiting for OBS ${requestType} response`))
      }, config.connectionTimeoutMs)
      pending = new Map([...pending, [requestId, { requestType, resolve, reject, timer }]])
      ws.send(JSON.stringify({
        op: OP_REQUEST,
        d: requestData === undefined
          ? { requestType, requestId }
          : { requestType, requestId, requestData }
      }))
    })

  const request = async <Output extends Record<string, unknown>>(
    descriptor: ObsRequestDescriptor<Output>,
    requestData?: Record<string, unknown>
  ): Promise<Output> => {
    const decodedRequestData = requestData === undefined
      ? undefined
      : Schema.decodeUnknownSync(UnknownRecord)(Schema.decodeUnknownSync(descriptor.requestDataSchema)(requestData))
    return Schema.decodeUnknownSync(descriptor.responseSchema)(
      await sendRawRequest(descriptor.requestType, decodedRequestData)
    )
  }

  const requestBatch = async (batch: BatchRequestPayload): Promise<ReadonlyArray<BatchRequestResult>> =>
    new Promise((resolve, reject) => {
      if (closed) {
        reject(new ObsProtocolError("OBS websocket is closed"))
        return
      }
      const requestId = randomUUID()
      const timer = setTimeout(() => {
        pendingBatches = new Map([...pendingBatches].filter(([pendingRequestId]) => pendingRequestId !== requestId))
        reject(new ObsTimeoutError("Timed out waiting for OBS request batch response"))
      }, config.connectionTimeoutMs)
      pendingBatches = new Map([
        ...pendingBatches,
        [
          requestId,
          {
            timer,
            resolve: (value) => {
              const decoded = Schema.decodeUnknownSync(Schema.Struct({
                results: Schema.Array(Schema.Struct({
                  requestType: ObsString,
                  requestId: Schema.optional(ObsString),
                  requestStatus: Schema.Struct({
                    result: Schema.Boolean,
                    code: ObsNumber,
                    comment: Schema.optional(ObsString)
                  }),
                  responseData: Schema.optional(UnknownRecord)
                }))
              }))(value)
              resolve(decoded.results)
            },
            reject
          }
        ]
      ])
      ws.send(JSON.stringify({
        op: OP_REQUEST_BATCH,
        d: {
          requestId,
          haltOnFailure: batch.haltOnFailure,
          executionType: batch.executionType,
          requests: batch.requests
        }
      }))
    })

  const getVersion = await request(GetVersion)
  const availableRequests = Schema.decodeUnknownSync(Schema.Array(ObsString))(getVersion["availableRequests"])

  return {
    negotiatedRpcVersion,
    availableRequests,
    request,
    requestBatch,
    getBufferedEvents: (input) => eventBuffer.snapshot(input),
    waitForBufferedEvent: (match, options) => eventBuffer.waitFor(match, options),
    addEventListener: (listener) => {
      eventListeners = [...eventListeners, listener]
      return () => {
        eventListeners = eventListeners.filter((entry) => entry !== listener)
      }
    },
    close: async () => {
      eventBuffer.close(new ObsProtocolError("OBS client closed"))
      rejectAll(new ObsProtocolError("OBS client closed"))
      if (ws.readyState === WebSocket.CLOSED) {
        return
      }
      await new Promise<void>((resolve) => {
        ws.once("close", () => resolve())
        ws.close()
      })
    }
  }
}
