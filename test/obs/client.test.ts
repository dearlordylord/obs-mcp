import { Duration, Effect, Fiber, Option, TestClock, TestContext } from "effect"
import { afterEach, describe, expect, it } from "vitest"

import type { ObsConfig } from "../../src/config/config.js"
import { createObsClient, type ObsClient } from "../../src/obs/client.js"
import { ObsProtocolError, ObsRequestError, ObsTimeoutError } from "../../src/obs/errors.js"
import {
  confirmObsCanvasInventoryChange,
  confirmObsConfigWorkflow,
  confirmObsInputIdentityChange,
  confirmObsStudioModeStateChange,
  confirmObsTransitionWorkflow
} from "../../src/obs/operations/events.js"
import {
  EventSubscription,
  HIGH_VOLUME_EVENT_SUBSCRIPTIONS,
  SAFE_EVENT_SUBSCRIPTION_MASK
} from "../../src/obs/protocol.js"
import { createReconnectingObsClient, createReconnectingObsClientEffect } from "../../src/obs/reconnecting-client.js"
import {
  GetCurrentProgramScene,
  GetGroupSceneItemList,
  GetSceneItemBlendMode,
  GetSceneItemEnabled,
  GetSceneItemId,
  GetSceneItemIndex,
  GetSceneItemList,
  GetSceneItemLocked,
  GetSceneItemSource,
  GetSourceActive,
  SetCurrentProgramScene,
  SetSceneItemBlendMode,
  SetSceneItemEnabled,
  SetSceneItemIndex,
  SetSceneItemLocked
} from "../../src/obs/requests.js"
import { FakeObsServer } from "./fake-obs-server.js"

const servers: Array<FakeObsServer> = []
const clients: Array<ObsClient> = []

const configFor = (
  url: string,
  password?: string,
  timeout = 300,
  enabledToolsets: ObsConfig["enabledToolsets"] = ["scenes"]
): ObsConfig => ({
  url,
  password: password === undefined ? Option.none() : Option.some(password),
  connectionTimeoutMs: timeout,
  enabledToolsets
})

const emptyEventSnapshot = {
  capacity: 1,
  droppedEvents: 0,
  oldestSequence: 0,
  latestSequence: 0,
  missedEvents: false,
  events: []
}

const fakeClient = (overrides: Partial<ObsClient> = {}): ObsClient => ({
  negotiatedRpcVersion: 1,
  availableRequests: ["GetCurrentProgramScene"],
  request: <Output extends Record<string, unknown>>(): Promise<Output> =>
    Promise.resolve(JSON.parse("{\"sceneName\":\"Intro\"}") as Output),
  requestBatch: async () => [],
  getBufferedEvents: () => emptyEventSnapshot,
  waitForBufferedEvent: async () => ({ timedOut: true, baselineSequence: 0, snapshot: emptyEventSnapshot }),
  addEventListener: () => () => undefined,
  close: async () => undefined,
  ...overrides
})

const flushPromiseWork = (): Effect.Effect<void> =>
  Effect.promise(() => new Promise<void>((resolve) => setImmediate(resolve)))

const waitForPredicate = async (predicate: () => boolean, remainingMs = 500): Promise<void> => {
  while (!predicate()) {
    if (remainingMs <= 0) {
      throw new Error("Timed out waiting for predicate")
    }
    await new Promise((resolve) => setTimeout(resolve, 10))
    remainingMs -= 10
  }
}

afterEach(async () => {
  await Promise.all(clients.splice(0).map((client) => client.close().catch(() => undefined)))
  await Promise.all(servers.splice(0).map((server) => server.stop()))
})

describe("OBS websocket client", () => {
  it("subscribes to safe events even when the events toolset is disabled", async () => {
    const server = await FakeObsServer.start()
    servers.push(server)
    const client = await createObsClient(configFor(server.url))
    clients.push(client)
    expect(client.negotiatedRpcVersion).toBe(1)
    expect(client.availableRequests).toContain("GetSceneList")
    expect(server.lastIdentifyEventSubscriptions).toBe(SAFE_EVENT_SUBSCRIPTION_MASK)
  })

  it("subscribes to safe events and keeps raw vendor/custom/high-volume subscriptions disabled for the events toolset", async () => {
    const server = await FakeObsServer.start()
    servers.push(server)
    const client = await createObsClient(configFor(server.url, undefined, 300, ["events"]))
    clients.push(client)

    expect(server.lastIdentifyEventSubscriptions).toBe(SAFE_EVENT_SUBSCRIPTION_MASK)
    const subscriptions = server.lastIdentifyEventSubscriptions as number
    expect(subscriptions & EventSubscription.Vendors).toBe(0)
    for (const subscription of HIGH_VOLUME_EVENT_SUBSCRIPTIONS) {
      expect(subscriptions & EventSubscription[subscription]).toBe(0)
    }
  })

  it("connects through an authenticated handshake", async () => {
    const server = await FakeObsServer.start({ password: "secret" })
    servers.push(server)
    const client = await createObsClient(configFor(server.url, "secret"))
    clients.push(client)
    expect(client.availableRequests).toContain("SetCurrentProgramScene")
  })

  it("reconnects after OBS drops the websocket before the next request", async () => {
    const server = await FakeObsServer.start()
    servers.push(server)
    const client = await createReconnectingObsClient(configFor(server.url))
    clients.push(client)

    expect(client.negotiatedRpcVersion).toBe(1)
    expect(client.availableRequests).toContain("SetCurrentProgramScene")
    expect(client.getBufferedEvents().events).toEqual([])
    await expect(client.request(GetCurrentProgramScene)).resolves.toMatchObject({ sceneName: "Intro" })
    expect(server.connectedClientCount).toBe(1)

    await server.disconnectClients()
    expect(server.connectedClientCount).toBe(0)

    await expect(client.request(GetCurrentProgramScene)).resolves.toMatchObject({ sceneName: "Intro" })
    expect(server.connectedClientCount).toBe(1)
  })

  it("backs off reconnect attempts with Effect TestClock", async () => {
    let connectCalls = 0
    const closedClient = fakeClient({
      request: async () => {
        throw new ObsProtocolError("OBS websocket is closed")
      }
    })
    const connect = async (): Promise<ObsClient> => {
      connectCalls += 1
      if (connectCalls === 1) {
        return closedClient
      }
      if (connectCalls < 4) {
        throw new Error("OBS is still down")
      }
      return fakeClient()
    }

    const program = Effect.gen(function*() {
      const client = yield* createReconnectingObsClientEffect(configFor("ws://127.0.0.1:1"), {
        connect,
        reconnectBackoff: { initialDelayMs: 100, maxDelayMs: 200, maxAttempts: 4 }
      })

      const pending = yield* Effect.fork(Effect.promise(() => client.request(GetCurrentProgramScene)))
      yield* flushPromiseWork()
      yield* Effect.yieldNow()
      expect(connectCalls).toBe(2)

      yield* TestClock.adjust(Duration.millis(99))
      yield* flushPromiseWork()
      yield* Effect.yieldNow()
      expect(connectCalls).toBe(2)

      yield* TestClock.adjust(Duration.millis(1))
      yield* flushPromiseWork()
      yield* Effect.yieldNow()
      expect(connectCalls).toBe(3)

      yield* TestClock.adjust(Duration.millis(199))
      yield* flushPromiseWork()
      yield* Effect.yieldNow()
      expect(connectCalls).toBe(3)

      yield* TestClock.adjust(Duration.millis(1))
      yield* flushPromiseWork()
      yield* Effect.yieldNow()
      expect(connectCalls).toBe(4)
      yield* Fiber.join(pending)
    })

    await Effect.runPromise(Effect.provide(program, TestContext.TestContext))
  })

  it("normalizes non-Error OBS connection failures", async () => {
    await expect(Effect.runPromise(createReconnectingObsClientEffect(configFor("ws://127.0.0.1:1"), {
      connect: async () => Promise.reject(new Error("OBS refused the websocket"))
    }))).rejects.toThrow("OBS refused the websocket")

    await expect(Effect.runPromise(createReconnectingObsClientEffect(configFor("ws://127.0.0.1:1"), {
      connect: async () => Promise.reject("OBS refused the websocket")
    }))).rejects.toThrow("OBS refused the websocket")
  })

  it("aborts OBS websocket connection attempts", async () => {
    const controller = new AbortController()
    const pending = createObsClient(configFor("ws://127.0.0.1:9", undefined, 10_000), { signal: controller.signal })

    controller.abort()

    await expect(pending).rejects.toThrow("OBS client connection aborted")
  })

  it("aborts OBS websocket handshakes", async () => {
    const server = await FakeObsServer.start({ skipIdentified: true })
    servers.push(server)
    const controller = new AbortController()
    const pending = createObsClient(configFor(server.url, undefined, 10_000), { signal: controller.signal })

    await new Promise((resolve) => setTimeout(resolve, 10))
    controller.abort()

    await expect(pending).rejects.toThrow("OBS client connection aborted")
  })

  it("closes OBS websocket when initial capability discovery fails", async () => {
    const server = await FakeObsServer.start({ skipResponsesFor: ["GetVersion"] })
    servers.push(server)

    await expect(createObsClient(configFor(server.url, undefined, 50))).rejects.toThrow("Timed out")
    await waitForPredicate(() => server.connectedClientCount === 0)
  })

  it("aborts initial capability discovery requests without leaking OBS websocket connections", async () => {
    const server = await FakeObsServer.start({ skipResponsesFor: ["GetVersion"] })
    servers.push(server)
    const controller = new AbortController()
    const pending = createObsClient(configFor(server.url, undefined, 10_000), { signal: controller.signal })

    await waitForPredicate(() => server.requests.some((request) => request.requestType === "GetVersion"))
    controller.abort()

    await expect(pending).rejects.toThrow("OBS client connection aborted")
    await waitForPredicate(() => server.connectedClientCount === 0)
  })

  it("notifies OBS connection close listeners registered after the socket has closed", async () => {
    const server = await FakeObsServer.start()
    servers.push(server)
    const client = await createObsClient(configFor(server.url))
    let closeMessages: ReadonlyArray<string> = []

    await client.close()
    client.onConnectionClosed?.((error) => {
      closeMessages = [...closeMessages, error.message]
    })

    expect(closeMessages).toEqual(["OBS websocket closed"])
  })

  it("surfaces the last reconnect failure after max backoff attempts", async () => {
    let connectCalls = 0
    const closedClient = fakeClient({
      request: async () => {
        throw new ObsProtocolError("OBS websocket is closed")
      }
    })
    const connect = async (): Promise<ObsClient> => {
      connectCalls += 1
      if (connectCalls === 1) {
        return closedClient
      }
      return Promise.reject("OBS is still down")
    }

    const client = await createReconnectingObsClient(configFor("ws://127.0.0.1:1"), {
      connect,
      reconnectBackoff: { maxAttempts: 1 }
    })

    await expect(client.request(GetCurrentProgramScene)).rejects.toThrow("OBS is still down")
    expect(connectCalls).toBe(2)
  })

  it("shares a pending reconnect across concurrent requests", async () => {
    let connectCalls = 0
    let listenerAttached = false
    let bridgeRemoved = false
    let resolveReconnect: (client: ObsClient) => void = () => {
      throw new Error("reconnect resolver was not initialized")
    }
    const reconnectClient = new Promise<ObsClient>((resolve) => {
      resolveReconnect = resolve
    })
    const closedClient = fakeClient({
      request: async () => {
        throw new ObsProtocolError("OBS websocket is closed")
      }
    })
    const nextClient = fakeClient({
      addEventListener: () => {
        listenerAttached = true
        return () => {
          bridgeRemoved = true
        }
      }
    })
    const connect = async (): Promise<ObsClient> => {
      connectCalls += 1
      if (connectCalls === 1) {
        return closedClient
      }
      return reconnectClient
    }
    const client = await createReconnectingObsClient(configFor("ws://127.0.0.1:1"), { connect })

    const first = client.request(GetCurrentProgramScene)
    await Effect.runPromise(flushPromiseWork())
    expect(connectCalls).toBe(2)

    const removeListener = client.addEventListener(() => undefined)
    const second = client.request(GetCurrentProgramScene)
    await Effect.runPromise(flushPromiseWork())
    expect(connectCalls).toBe(2)

    resolveReconnect(nextClient)
    await expect(first).resolves.toMatchObject({ sceneName: "Intro" })
    await expect(second).resolves.toMatchObject({ sceneName: "Intro" })
    expect(listenerAttached).toBe(true)

    removeListener()
    await client.close()
    expect(bridgeRemoved).toBe(true)
  })

  it("replays already-buffered OBS events into the reconnecting event cursor", async () => {
    const client = await createReconnectingObsClient(configFor("ws://127.0.0.1:1"), {
      connect: async () =>
        fakeClient({
          getBufferedEvents: () => ({
            capacity: 100,
            droppedEvents: 0,
            oldestSequence: 1,
            latestSequence: 1,
            missedEvents: false,
            events: [{
              sequence: 1,
              eventType: "CurrentProgramSceneChanged",
              eventIntent: EventSubscription.Scenes,
              eventData: JSON.parse("{\"sceneName\":\"Intro\",\"sceneUuid\":\"scene-intro\"}")
            }]
          })
        })
    })

    expect(client.getBufferedEvents().events).toMatchObject([{
      sequence: 1,
      eventType: "CurrentProgramSceneChanged",
      eventData: { sceneName: "Intro", sceneUuid: "scene-intro" }
    }])
  })

  it("reconnects after an underlying websocket closes before the wrapper close hook is attached", async () => {
    let connectCalls = 0
    const connect = async (): Promise<ObsClient> => {
      connectCalls += 1
      return connectCalls === 1
        ? fakeClient({
          onConnectionClosed: (listener) => {
            listener(new ObsProtocolError("OBS websocket closed"))
            return () => undefined
          }
        })
        : fakeClient()
    }
    const client = await createReconnectingObsClient(configFor("ws://127.0.0.1:1"), { connect })

    client.addEventListener(() => undefined)
    await waitForPredicate(() => connectCalls === 2)

    await expect(client.request(GetCurrentProgramScene)).resolves.toMatchObject({ sceneName: "Intro" })
  })

  it("keeps retrying passive reconnects after a failed backoff cycle", async () => {
    let connectCalls = 0
    let closeListener: ((error: Error) => void) | undefined
    let eventTypes: ReadonlyArray<string> = []
    const connect = async (): Promise<ObsClient> => {
      connectCalls += 1
      if (connectCalls === 1) {
        return fakeClient({
          onConnectionClosed: (listener) => {
            closeListener = listener
            return () => undefined
          }
        })
      }
      if (connectCalls < 4) {
        throw new Error("OBS is still down")
      }
      return fakeClient({
        addEventListener: (listener) => {
          listener({
            sequence: 1,
            eventType: "CurrentProgramSceneChanged",
            eventIntent: EventSubscription.Scenes,
            eventData: JSON.parse("{\"sceneName\":\"Intro\",\"sceneUuid\":\"scene-intro\"}")
          })
          return () => undefined
        }
      })
    }

    const program = Effect.gen(function*() {
      const client = yield* createReconnectingObsClientEffect(configFor("ws://127.0.0.1:1"), {
        connect,
        reconnectBackoff: { initialDelayMs: 100, maxDelayMs: 200, maxAttempts: 1 }
      })
      client.addEventListener((event) => {
        eventTypes = [...eventTypes, event.eventType]
      })
      closeListener?.(new ObsProtocolError("OBS websocket closed"))
      yield* flushPromiseWork()
      yield* Effect.yieldNow()
      expect(connectCalls).toBe(2)

      yield* TestClock.adjust(Duration.millis(200))
      yield* flushPromiseWork()
      yield* Effect.yieldNow()
      expect(connectCalls).toBe(3)

      yield* TestClock.adjust(Duration.millis(200))
      yield* flushPromiseWork()
      yield* Effect.yieldNow()
      expect(connectCalls).toBe(4)
    })

    await Effect.runPromise(Effect.provide(program, TestContext.TestContext))
    expect(eventTypes).toEqual(["CurrentProgramSceneChanged"])
  })

  it("ignores OBS websocket close failures while reconnecting", async () => {
    let connectCalls = 0
    const closedClient = fakeClient({
      request: async () => {
        throw new ObsProtocolError("OBS websocket is closed")
      },
      close: async () => {
        throw new Error("close failed")
      }
    })
    const connect = async (): Promise<ObsClient> => {
      connectCalls += 1
      return connectCalls === 1 ? closedClient : fakeClient()
    }
    const client = await createReconnectingObsClient(configFor("ws://127.0.0.1:1"), { connect })

    await expect(client.request(GetCurrentProgramScene)).resolves.toMatchObject({ sceneName: "Intro" })
    await Effect.runPromise(flushPromiseWork())
    expect(connectCalls).toBe(2)
  })

  it("closes cleanly while a reconnect is pending", async () => {
    let connectCalls = 0
    let reconnectAborted = false
    let closeSettled = false
    const closedClient = fakeClient({
      request: async () => {
        throw new ObsProtocolError("OBS websocket is closed")
      }
    })
    const connect = async (_config: ObsConfig, signal?: AbortSignal): Promise<ObsClient> => {
      connectCalls += 1
      if (connectCalls === 1) {
        return closedClient
      }
      return await new Promise<ObsClient>((_resolve, reject) => {
        signal?.addEventListener("abort", () => {
          reconnectAborted = true
          reject(new Error("reconnect aborted"))
        }, { once: true })
      })
    }
    const client = await createReconnectingObsClient(configFor("ws://127.0.0.1:1"), { connect })
    const request = client.request(GetCurrentProgramScene)
    void request.catch(() => undefined)
    await Effect.runPromise(flushPromiseWork())
    expect(connectCalls).toBe(2)

    const close = client.close().then(() => {
      closeSettled = true
    })
    await Effect.runPromise(flushPromiseWork())

    await expect(close).resolves.toBeUndefined()
    await expect(request).rejects.toThrow("OBS client closed")
    expect(closeSettled).toBe(true)
    expect(reconnectAborted).toBe(true)
  })

  it("reconnects request batches after OBS drops the websocket", async () => {
    const server = await FakeObsServer.start()
    servers.push(server)
    const client = await createReconnectingObsClient(configFor(server.url))
    clients.push(client)

    await server.disconnectClients()

    await expect(client.requestBatch({
      executionType: 0,
      haltOnFailure: false,
      requests: [{ requestType: "GetCurrentProgramScene" }]
    })).resolves.toEqual([{
      requestType: "GetCurrentProgramScene",
      requestStatus: { result: true, code: 100 },
      responseData: { sceneName: "Intro", sceneUuid: "scene-intro" }
    }])
  })

  it("does not retry request batches that were in flight when OBS closed", async () => {
    const server = await FakeObsServer.start({ closeAfterReceivingBatch: true })
    servers.push(server)
    const client = await createReconnectingObsClient(configFor(server.url))
    clients.push(client)

    await expect(client.requestBatch({
      executionType: 0,
      haltOnFailure: false,
      requests: [{ requestType: "GetCurrentProgramScene" }]
    })).rejects.toThrow("OBS websocket closed")
    expect(server.requests.filter((request) => request.requestType === "GetCurrentProgramScene")).toHaveLength(1)

    await expect(client.request(GetCurrentProgramScene)).resolves.toMatchObject({ sceneName: "Intro" })
    expect(server.requests.filter((request) => request.requestType === "GetCurrentProgramScene")).toHaveLength(2)
  })

  it("reattaches event listeners after reconnecting to OBS", async () => {
    const server = await FakeObsServer.start({
      eventBeforeResponse: {
        eventType: "CurrentProgramSceneChanged",
        eventIntent: EventSubscription.Scenes,
        eventData: { sceneName: "Intro", sceneUuid: "scene-intro" }
      },
      eventBeforeResponseFor: "GetCurrentProgramScene"
    })
    servers.push(server)
    const client = await createReconnectingObsClient(configFor(server.url))
    clients.push(client)
    let eventTypes: ReadonlyArray<string> = []
    const removeListener = client.addEventListener((event) => {
      eventTypes = [...eventTypes, event.eventType]
    })

    await expect(client.request(GetCurrentProgramScene)).resolves.toMatchObject({ sceneName: "Intro" })
    await server.disconnectClients()
    await expect(client.request(GetCurrentProgramScene)).resolves.toMatchObject({ sceneName: "Intro" })

    expect(eventTypes).toEqual(["CurrentProgramSceneChanged", "CurrentProgramSceneChanged"])

    removeListener()
    await expect(client.request(GetCurrentProgramScene)).resolves.toMatchObject({ sceneName: "Intro" })
    expect(eventTypes).toEqual(["CurrentProgramSceneChanged", "CurrentProgramSceneChanged"])
  })

  it("keeps event waits usable through the reconnecting client", async () => {
    const server = await FakeObsServer.start({
      eventBeforeResponse: {
        eventType: "CurrentProgramSceneChanged",
        eventIntent: EventSubscription.Scenes,
        eventData: { sceneName: "Intro", sceneUuid: "scene-intro" }
      },
      eventBeforeResponseFor: "GetCurrentProgramScene"
    })
    servers.push(server)
    const client = await createReconnectingObsClient(configFor(server.url))
    clients.push(client)

    const event = client.waitForBufferedEvent(
      (candidate) => candidate.eventType === "CurrentProgramSceneChanged",
      { afterSequence: 0, timeoutMs: 100 }
    )
    await expect(client.request(GetCurrentProgramScene)).resolves.toMatchObject({ sceneName: "Intro" })
    await expect(event).resolves.toMatchObject({
      event: {
        sequence: 1,
        eventType: "CurrentProgramSceneChanged",
        eventData: { sceneName: "Intro", sceneUuid: "scene-intro" }
      }
    })
  })

  it("keeps event cursors stable across reconnects", async () => {
    const server = await FakeObsServer.start({
      eventBeforeResponse: {
        eventType: "CurrentProgramSceneChanged",
        eventIntent: EventSubscription.Scenes,
        eventData: { sceneName: "Intro", sceneUuid: "scene-intro" }
      },
      eventBeforeResponseFor: "GetCurrentProgramScene"
    })
    servers.push(server)
    const client = await createReconnectingObsClient(configFor(server.url))
    clients.push(client)

    await expect(client.request(GetCurrentProgramScene)).resolves.toMatchObject({ sceneName: "Intro" })
    expect(client.getBufferedEvents()).toMatchObject({ latestSequence: 1 })
    const event = client.waitForBufferedEvent(
      (candidate) => candidate.eventType === "CurrentProgramSceneChanged",
      { afterSequence: 1, timeoutMs: 200 }
    )

    await server.disconnectClients()
    await expect(client.request(GetCurrentProgramScene)).resolves.toMatchObject({ sceneName: "Intro" })
    await expect(event).resolves.toMatchObject({
      baselineSequence: 1,
      event: {
        sequence: 2,
        eventType: "CurrentProgramSceneChanged",
        eventData: { sceneName: "Intro", sceneUuid: "scene-intro" }
      }
    })
    expect(client.getBufferedEvents({ sinceSequence: 1 }).events).toMatchObject([{ sequence: 2 }])
  })

  it("uses configured event buffer capacity across reconnects", async () => {
    const server = await FakeObsServer.start({
      eventBeforeResponse: {
        eventType: "CurrentProgramSceneChanged",
        eventIntent: EventSubscription.Scenes,
        eventData: { sceneName: "Intro", sceneUuid: "scene-intro" }
      },
      eventBeforeResponseFor: "GetCurrentProgramScene"
    })
    servers.push(server)
    const client = await createReconnectingObsClient({
      ...configFor(server.url),
      eventBufferCapacity: 1
    })
    clients.push(client)

    await expect(client.request(GetCurrentProgramScene)).resolves.toMatchObject({ sceneName: "Intro" })
    await server.disconnectClients()
    await expect(client.request(GetCurrentProgramScene)).resolves.toMatchObject({ sceneName: "Intro" })

    expect(client.getBufferedEvents()).toMatchObject({
      capacity: 1,
      droppedEvents: 1,
      oldestSequence: 2,
      latestSequence: 2,
      events: [{ sequence: 2 }]
    })
  })

  it("reconnects idle OBS event listeners after a passive websocket close", async () => {
    const server = await FakeObsServer.start({
      eventBeforeResponse: {
        eventType: "CurrentProgramSceneChanged",
        eventIntent: EventSubscription.Scenes,
        eventData: { sceneName: "Intro", sceneUuid: "scene-intro" }
      },
      eventBeforeResponseFor: "GetCurrentProgramScene"
    })
    servers.push(server)
    const client = await createReconnectingObsClient(configFor(server.url))
    clients.push(client)
    let eventTypes: ReadonlyArray<string> = []
    client.addEventListener((event) => {
      eventTypes = [...eventTypes, event.eventType]
    })

    await server.disconnectClients()
    await waitForPredicate(() => server.connectedClientCount === 1)
    await expect(client.request(GetCurrentProgramScene)).resolves.toMatchObject({ sceneName: "Intro" })

    expect(eventTypes).toEqual(["CurrentProgramSceneChanged"])
  })

  it("reconnects when an event listener is added after a passive websocket close", async () => {
    const server = await FakeObsServer.start({
      eventBeforeResponse: {
        eventType: "CurrentProgramSceneChanged",
        eventIntent: EventSubscription.Scenes,
        eventData: { sceneName: "Intro", sceneUuid: "scene-intro" }
      },
      eventBeforeResponseFor: "GetCurrentProgramScene"
    })
    servers.push(server)
    const client = await createReconnectingObsClient(configFor(server.url))
    clients.push(client)
    let eventTypes: ReadonlyArray<string> = []

    await server.disconnectClients()
    expect(server.connectedClientCount).toBe(0)
    client.addEventListener((event) => {
      eventTypes = [...eventTypes, event.eventType]
    })
    await waitForPredicate(() => server.connectedClientCount === 1)
    await expect(client.request(GetCurrentProgramScene)).resolves.toMatchObject({ sceneName: "Intro" })

    expect(eventTypes).toEqual(["CurrentProgramSceneChanged"])
  })

  it("reconnects event waits started after a passive websocket close", async () => {
    const server = await FakeObsServer.start({
      eventBeforeResponse: {
        eventType: "CurrentProgramSceneChanged",
        eventIntent: EventSubscription.Scenes,
        eventData: { sceneName: "Intro", sceneUuid: "scene-intro" }
      },
      eventBeforeResponseFor: "GetCurrentProgramScene"
    })
    servers.push(server)
    const client = await createReconnectingObsClient(configFor(server.url))
    clients.push(client)

    await server.disconnectClients()
    const event = client.waitForBufferedEvent(
      (candidate) => candidate.eventType === "CurrentProgramSceneChanged",
      { afterSequence: 0, timeoutMs: 200 }
    )
    await waitForPredicate(() => server.connectedClientCount === 1)
    await expect(client.request(GetCurrentProgramScene)).resolves.toMatchObject({ sceneName: "Intro" })

    await expect(event).resolves.toMatchObject({
      event: {
        sequence: 1,
        eventType: "CurrentProgramSceneChanged",
        eventData: { sceneName: "Intro", sceneUuid: "scene-intro" }
      }
    })
  })

  it("does not retry requests that were in flight when OBS closed", async () => {
    const server = await FakeObsServer.start({ closeAfterReceivingRequestFor: "GetCurrentProgramScene" })
    servers.push(server)
    const client = await createReconnectingObsClient(configFor(server.url))
    clients.push(client)

    await expect(client.request(GetCurrentProgramScene)).rejects.toThrow("OBS websocket closed")
    expect(server.requests.filter((request) => request.requestType === "GetCurrentProgramScene")).toHaveLength(1)
    await expect(client.request(GetCurrentProgramScene)).resolves.toMatchObject({ sceneName: "Intro" })
    expect(server.requests.filter((request) => request.requestType === "GetCurrentProgramScene")).toHaveLength(2)
  })

  it("passes through non-close OBS request errors without reconnecting", async () => {
    const server = await FakeObsServer.start({
      failRequests: { GetCurrentProgramScene: { code: 608, comment: "Parameter: sceneName" } }
    })
    servers.push(server)
    const client = await createReconnectingObsClient(configFor(server.url))
    clients.push(client)

    await expect(client.request(GetCurrentProgramScene)).rejects.toBeInstanceOf(ObsRequestError)
    expect(server.connectedClientCount).toBe(1)
  })

  it("allows closing a reconnecting OBS client repeatedly", async () => {
    const server = await FakeObsServer.start()
    servers.push(server)
    const client = await createReconnectingObsClient(configFor(server.url))

    await client.close()
    await client.close()

    await expect(client.request(GetCurrentProgramScene)).rejects.toThrow("OBS client closed")
  })

  it("rejects malformed Hello messages", async () => {
    const server = await FakeObsServer.start({ malformedHello: true })
    servers.push(server)
    await expect(createObsClient(configFor(server.url))).rejects.toThrow(/obsStudioVersion/)
  })

  it("rejects binary Hello messages", async () => {
    const server = await FakeObsServer.start({ binaryHello: true })
    servers.push(server)
    await expect(createObsClient(configFor(server.url))).rejects.toThrow("binary frame")
  })

  it("rejects non-Hello and non-Identified handshake opcodes", async () => {
    const nonHello = await FakeObsServer.start({ helloOp: 5 })
    servers.push(nonHello)
    await expect(createObsClient(configFor(nonHello.url))).rejects.toThrow("Expected OBS Hello")

    const nonIdentified = await FakeObsServer.start({ identifiedOp: 5 })
    servers.push(nonIdentified)
    await expect(createObsClient(configFor(nonIdentified.url))).rejects.toThrow("Expected OBS Identified")
  })

  it("rejects auth-required handshakes without a configured password", async () => {
    const server = await FakeObsServer.start({ password: "secret" })
    servers.push(server)
    await expect(createObsClient(configFor(server.url))).rejects.toThrow("requires authentication")
    await new Promise((resolve) => setTimeout(resolve, 20))
    expect(server.connectedClientCount).toBe(0)
  })

  it("rejects unsupported older RPC versions and negotiates supported RPC v1", async () => {
    const oldRpc = await FakeObsServer.start({ rpcVersion: 0 })
    servers.push(oldRpc)
    await expect(createObsClient(configFor(oldRpc.url))).rejects.toThrow("not supported")

    const futureRpc = await FakeObsServer.start({ rpcVersion: 2 })
    servers.push(futureRpc)
    const client = await createObsClient(configFor(futureRpc.url))
    clients.push(client)
    expect(client.negotiatedRpcVersion).toBe(1)
  })

  it("rejects authentication/socket close failures", async () => {
    const server = await FakeObsServer.start({ password: "secret" })
    servers.push(server)
    await expect(createObsClient(configFor(server.url, "wrong"))).rejects.toBeInstanceOf(ObsProtocolError)
  })

  it("times out delayed responses", async () => {
    const server = await FakeObsServer.start({ delayResponsesMs: 500 })
    servers.push(server)
    await expect(createObsClient(configFor(server.url, undefined, 50))).rejects.toBeInstanceOf(ObsTimeoutError)
  })

  it("times out requests after connection", async () => {
    const server = await FakeObsServer.start({ skipResponsesFor: ["GetCurrentProgramScene"] })
    servers.push(server)
    const client = await createObsClient(configFor(server.url, undefined, 50))
    clients.push(client)
    await expect(client.request(GetCurrentProgramScene)).rejects.toBeInstanceOf(ObsTimeoutError)
  })

  it("correlates request IDs and ignores unrelated out-of-order responses", async () => {
    const server = await FakeObsServer.start({ sendUnrelatedResponseBeforeReal: true })
    servers.push(server)
    const client = await createObsClient(configFor(server.url))
    clients.push(client)
    await expect(client.request(GetCurrentProgramScene)).resolves.toMatchObject({ sceneName: "Intro" })
  })

  it("ignores high-volume event frames by default", async () => {
    const server = await FakeObsServer.start({
      eventBeforeResponse: {
        eventType: "InputVolumeMeters",
        eventIntent: EventSubscription.InputVolumeMeters,
        eventData: { inputs: [] }
      }
    })
    servers.push(server)
    const client = await createObsClient(configFor(server.url))
    clients.push(client)
    await expect(client.request(GetCurrentProgramScene)).resolves.toMatchObject({ sceneName: "Intro" })
    expect(client.getBufferedEvents()).toMatchObject({ droppedEvents: 0, events: [] })
  })

  it("drops high-volume event bursts without leaking raw payloads", async () => {
    const stdoutBytesBefore = process.stdout.bytesWritten
    const server = await FakeObsServer.start({
      eventBurstBeforeResponse: [
        {
          eventType: "InputVolumeMeters",
          eventIntent: EventSubscription.InputVolumeMeters,
          eventData: { inputs: [{ inputName: "Mic/Aux", levels: [[0.5, 0.25]], raw: true }] }
        },
        {
          eventType: "InputActiveStateChanged",
          eventIntent: EventSubscription.InputActiveStateChanged,
          eventData: { inputName: "Camera", inputUuid: "input-camera", videoActive: true, raw: true }
        },
        {
          eventType: "InputShowStateChanged",
          eventIntent: EventSubscription.InputShowStateChanged,
          eventData: { inputName: "Camera", inputUuid: "input-camera", videoShowing: true, raw: true }
        },
        {
          eventType: "SceneItemTransformChanged",
          eventIntent: EventSubscription.SceneItemTransformChanged,
          eventData: { sceneName: "Scene", sceneUuid: "scene", sceneItemId: 1, sceneItemTransform: { raw: true } }
        },
        {
          eventType: "CurrentProgramSceneChanged",
          eventIntent: EventSubscription.Scenes,
          eventData: { sceneName: "Intro", sceneUuid: "scene-intro" }
        }
      ],
      eventBeforeResponseFor: "GetCurrentProgramScene"
    })
    servers.push(server)
    const client = await createObsClient({ ...configFor(server.url), enabledToolsets: ["events"] }, {
      eventBufferCapacity: 1
    })
    clients.push(client)

    await expect(client.request(GetCurrentProgramScene)).resolves.toMatchObject({ sceneName: "Intro" })
    expect(client.getBufferedEvents()).toEqual({
      capacity: 1,
      droppedEvents: 0,
      oldestSequence: 1,
      latestSequence: 1,
      missedEvents: false,
      events: [{
        sequence: 1,
        eventType: "CurrentProgramSceneChanged",
        eventIntent: EventSubscription.Scenes,
        eventData: { sceneName: "Intro", sceneUuid: "scene-intro" }
      }]
    })
    expect(process.stdout.bytesWritten).toBe(stdoutBytesBefore)
  })

  it("buffers safe low-volume event frames without surfacing a stream", async () => {
    const server = await FakeObsServer.start({
      eventBeforeResponse: {
        eventType: "CurrentProgramSceneChanged",
        eventIntent: EventSubscription.Scenes,
        eventData: { sceneName: "Intro", sceneUuid: "scene-intro" }
      },
      eventBeforeResponseFor: "GetCurrentProgramScene"
    })
    servers.push(server)
    const client = await createObsClient(configFor(server.url))
    clients.push(client)
    await expect(client.request(GetCurrentProgramScene)).resolves.toMatchObject({ sceneName: "Intro" })
    expect(client.getBufferedEvents()).toMatchObject({
      droppedEvents: 0,
      events: [{
        sequence: 1,
        eventType: "CurrentProgramSceneChanged",
        eventIntent: EventSubscription.Scenes,
        eventData: { sceneName: "Intro", sceneUuid: "scene-intro" }
      }]
    })
  })

  it("buffers typed low-volume event payloads from websocket frames", async () => {
    const cases = [
      {
        eventType: "CurrentProfileChanging",
        eventIntent: EventSubscription.Config,
        eventData: { profileName: "Profile A" }
      },
      {
        eventType: "CurrentProfileChanged",
        eventIntent: EventSubscription.Config,
        eventData: { profileName: "Profile B" }
      },
      {
        eventType: "ProfileListChanged",
        eventIntent: EventSubscription.Config,
        eventData: { profiles: ["Profile A", "Profile B"] }
      },
      {
        eventType: "CurrentSceneCollectionChanging",
        eventIntent: EventSubscription.Config,
        eventData: { sceneCollectionName: "Collection A" }
      },
      {
        eventType: "CurrentSceneCollectionChanged",
        eventIntent: EventSubscription.Config,
        eventData: { sceneCollectionName: "Collection B" }
      },
      {
        eventType: "SceneCollectionListChanged",
        eventIntent: EventSubscription.Config,
        eventData: { sceneCollections: ["Collection A", "Collection B"] }
      },
      {
        eventType: "ExitStarted",
        eventIntent: EventSubscription.General,
        eventData: {}
      },
      {
        eventType: "SceneCreated",
        eventIntent: EventSubscription.Scenes,
        eventData: { sceneName: "Program", sceneUuid: "scene-program", isGroup: false }
      },
      {
        eventType: "SceneRemoved",
        eventIntent: EventSubscription.Scenes,
        eventData: { sceneName: "Old Scene", sceneUuid: "scene-old", isGroup: false }
      },
      {
        eventType: "SceneNameChanged",
        eventIntent: EventSubscription.Scenes,
        eventData: { sceneUuid: "scene-program", oldSceneName: "Old Program", sceneName: "Program" }
      },
      {
        eventType: "CurrentProgramSceneChanged",
        eventIntent: EventSubscription.Scenes,
        eventData: { sceneName: "Program", sceneUuid: "scene-program" }
      },
      {
        eventType: "CurrentPreviewSceneChanged",
        eventIntent: EventSubscription.Scenes,
        eventData: { sceneName: "Preview", sceneUuid: "scene-preview" }
      },
      {
        eventType: "SceneListChanged",
        eventIntent: EventSubscription.Scenes,
        eventData: { scenes: [{ sceneName: "Intro", sceneUuid: "scene-intro", sceneIndex: 0 }] }
      },
      {
        eventType: "SceneItemCreated",
        eventIntent: EventSubscription.SceneItems,
        eventData: {
          sceneName: "Program",
          sceneUuid: "scene-program",
          sourceName: "Camera",
          sourceUuid: "source-camera",
          sceneItemId: 12,
          sceneItemIndex: 1
        }
      },
      {
        eventType: "SceneItemRemoved",
        eventIntent: EventSubscription.SceneItems,
        eventData: {
          sceneName: "Program",
          sceneUuid: "scene-program",
          sourceName: "Camera",
          sourceUuid: "source-camera",
          sceneItemId: 12
        }
      },
      {
        eventType: "SceneItemListReindexed",
        eventIntent: EventSubscription.SceneItems,
        eventData: {
          sceneName: "Program",
          sceneUuid: "scene-program",
          sceneItems: [{ sceneItemId: 12, sceneItemIndex: 0 }]
        }
      },
      {
        eventType: "SceneItemEnableStateChanged",
        eventIntent: EventSubscription.SceneItems,
        eventData: {
          sceneName: "Program",
          sceneUuid: "scene-program",
          sceneItemId: 12,
          sceneItemEnabled: true
        }
      },
      {
        eventType: "SceneItemLockStateChanged",
        eventIntent: EventSubscription.SceneItems,
        eventData: {
          sceneName: "Program",
          sceneUuid: "scene-program",
          sceneItemId: 12,
          sceneItemLocked: true
        }
      },
      {
        eventType: "SceneItemSelected",
        eventIntent: EventSubscription.SceneItems,
        eventData: { sceneName: "Program", sceneUuid: "scene-program", sceneItemId: 12 }
      },
      {
        eventType: "InputRemoved",
        eventIntent: EventSubscription.Inputs,
        eventData: { inputName: "Camera", inputUuid: "input-camera" }
      },
      {
        eventType: "InputNameChanged",
        eventIntent: EventSubscription.Inputs,
        eventData: { inputUuid: "input-camera", oldInputName: "Old Camera", inputName: "Camera" }
      },
      {
        eventType: "InputMuteStateChanged",
        eventIntent: EventSubscription.Inputs,
        eventData: { inputName: "Mic/Aux", inputUuid: "input-mic", inputMuted: true }
      },
      {
        eventType: "InputVolumeChanged",
        eventIntent: EventSubscription.Inputs,
        eventData: { inputName: "Mic/Aux", inputUuid: "input-mic", inputVolumeMul: 0.5, inputVolumeDb: -6 }
      },
      {
        eventType: "InputAudioBalanceChanged",
        eventIntent: EventSubscription.Inputs,
        eventData: { inputName: "Mic/Aux", inputUuid: "input-mic", inputAudioBalance: 0.25 }
      },
      {
        eventType: "InputAudioSyncOffsetChanged",
        eventIntent: EventSubscription.Inputs,
        eventData: { inputName: "Mic/Aux", inputUuid: "input-mic", inputAudioSyncOffset: -250 }
      },
      {
        eventType: "InputAudioTracksChanged",
        eventIntent: EventSubscription.Inputs,
        eventData: {
          inputName: "Mic/Aux",
          inputUuid: "input-mic",
          inputAudioTracks: { "1": true, "2": false, "3": false, "4": true, "5": false, "6": true }
        }
      },
      {
        eventType: "InputAudioMonitorTypeChanged",
        eventIntent: EventSubscription.Inputs,
        eventData: {
          inputName: "Mic/Aux",
          inputUuid: "input-mic",
          monitorType: "OBS_MONITORING_TYPE_MONITOR_AND_OUTPUT"
        }
      },
      {
        eventType: "RecordStateChanged",
        eventIntent: EventSubscription.Outputs,
        eventData: {
          outputActive: false,
          outputState: "OBS_WEBSOCKET_OUTPUT_STOPPED",
          outputPath: "/tmp/recording.mkv"
        }
      },
      {
        eventType: "CurrentSceneTransitionChanged",
        eventIntent: EventSubscription.Transitions,
        eventData: { transitionName: "Fade", transitionUuid: "transition-fade" }
      },
      {
        eventType: "CurrentSceneTransitionDurationChanged",
        eventIntent: EventSubscription.Transitions,
        eventData: { transitionDuration: 300 }
      },
      {
        eventType: "SceneTransitionStarted",
        eventIntent: EventSubscription.Transitions,
        eventData: { transitionName: "Fade", transitionUuid: "transition-fade" }
      },
      {
        eventType: "SceneTransitionEnded",
        eventIntent: EventSubscription.Transitions,
        eventData: { transitionName: "Fade", transitionUuid: "transition-fade" }
      },
      {
        eventType: "SceneTransitionVideoEnded",
        eventIntent: EventSubscription.Transitions,
        eventData: { transitionName: "Fade", transitionUuid: "transition-fade" }
      },
      {
        eventType: "MediaInputPlaybackStarted",
        eventIntent: EventSubscription.MediaInputs,
        eventData: { inputName: "Media", inputUuid: "input-media" }
      },
      {
        eventType: "MediaInputPlaybackEnded",
        eventIntent: EventSubscription.MediaInputs,
        eventData: { inputName: "Media", inputUuid: "input-media" }
      },
      {
        eventType: "MediaInputActionTriggered",
        eventIntent: EventSubscription.MediaInputs,
        eventData: {
          inputName: "Media",
          inputUuid: "input-media",
          mediaAction: "OBS_WEBSOCKET_MEDIA_INPUT_ACTION_RESTART"
        }
      }
    ] as const

    for (const event of cases) {
      const server = await FakeObsServer.start({
        eventBeforeResponse: event,
        eventBeforeResponseFor: "GetCurrentProgramScene"
      })
      servers.push(server)
      const client = await createObsClient(configFor(server.url))
      clients.push(client)

      await expect(client.request(GetCurrentProgramScene)).resolves.toMatchObject({ sceneName: "Intro" })
      expect(client.getBufferedEvents().events).toEqual([{
        sequence: 1,
        eventType: event.eventType,
        eventIntent: event.eventIntent,
        eventData: event.eventData
      }])
    }
  })

  it("buffers events queued immediately after Identified", async () => {
    const server = await FakeObsServer.start({
      eventAfterIdentify: {
        eventType: "CurrentProgramSceneChanged",
        eventIntent: EventSubscription.Scenes,
        eventData: { sceneName: "Intro", sceneUuid: "scene-intro" }
      }
    })
    servers.push(server)
    const client = await createObsClient(configFor(server.url))
    clients.push(client)

    expect(client.getBufferedEvents()).toMatchObject({
      droppedEvents: 0,
      events: [{
        sequence: 1,
        eventType: "CurrentProgramSceneChanged",
        eventIntent: EventSubscription.Scenes,
        eventData: { sceneName: "Intro", sceneUuid: "scene-intro" }
      }]
    })
  })

  it("buffers typed output, transition, ui, canvas, and filter event bursts", async () => {
    const burst = [
      {
        eventType: "RecordFileChanged",
        eventIntent: EventSubscription.Outputs,
        eventData: { newOutputPath: "/tmp/recording-2.mkv" }
      },
      {
        eventType: "CurrentSceneTransitionChanged",
        eventIntent: EventSubscription.Transitions,
        eventData: { transitionName: "Fade", transitionUuid: "transition-fade" }
      },
      {
        eventType: "StudioModeStateChanged",
        eventIntent: EventSubscription.Ui,
        eventData: { studioModeEnabled: true }
      },
      {
        eventType: "CanvasNameChanged",
        eventIntent: EventSubscription.Canvases,
        eventData: { canvasUuid: "canvas-a", oldCanvasName: "Old Canvas", canvasName: "Canvas A" }
      },
      {
        eventType: "SourceFilterCreated",
        eventIntent: EventSubscription.Filters,
        eventData: {
          sourceName: "Camera",
          filterName: "Color",
          filterKind: "color_filter",
          filterIndex: 0,
          filterSettings: { secret: true },
          defaultFilterSettings: { secret: false }
        }
      },
      {
        eventType: "SourceFilterSettingsChanged",
        eventIntent: EventSubscription.Filters,
        eventData: { sourceName: "Camera", filterName: "Color", filterSettings: { secret: true } }
      }
    ] as const
    const server = await FakeObsServer.start({
      eventBurstBeforeResponse: burst,
      eventBeforeResponseFor: "GetCurrentProgramScene"
    })
    servers.push(server)
    const client = await createObsClient(configFor(server.url))
    clients.push(client)

    await expect(client.request(GetCurrentProgramScene)).resolves.toMatchObject({ sceneName: "Intro" })
    expect(client.getBufferedEvents().events).toEqual([
      {
        sequence: 1,
        eventType: "RecordFileChanged",
        eventIntent: EventSubscription.Outputs,
        eventData: { newOutputPath: "/tmp/recording-2.mkv" }
      },
      {
        sequence: 2,
        eventType: "CurrentSceneTransitionChanged",
        eventIntent: EventSubscription.Transitions,
        eventData: { transitionName: "Fade", transitionUuid: "transition-fade" }
      },
      {
        sequence: 3,
        eventType: "StudioModeStateChanged",
        eventIntent: EventSubscription.Ui,
        eventData: { studioModeEnabled: true }
      },
      {
        sequence: 4,
        eventType: "CanvasNameChanged",
        eventIntent: EventSubscription.Canvases,
        eventData: { canvasUuid: "canvas-a", oldCanvasName: "Old Canvas", canvasName: "Canvas A" }
      },
      {
        sequence: 5,
        eventType: "SourceFilterCreated",
        eventIntent: EventSubscription.Filters,
        eventData: {
          sourceName: "Camera",
          filterName: "Color",
          filterKind: "color_filter",
          filterIndex: 0
        }
      },
      {
        sequence: 6,
        eventType: "SourceFilterSettingsChanged",
        eventIntent: EventSubscription.Filters,
        eventData: { sourceName: "Camera", filterName: "Color" }
      }
    ])
  })

  it("rejects malformed events queued immediately after Identified", async () => {
    const server = await FakeObsServer.start({ sendMalformedAfterIdentify: true })
    servers.push(server)
    await expect(createObsClient(configFor(server.url))).rejects.toThrow(ObsProtocolError)
  })

  it("drops oldest buffered events when capacity is exceeded", async () => {
    const server = await FakeObsServer.start({
      eventBeforeResponse: {
        eventType: "CurrentProgramSceneChanged",
        eventIntent: EventSubscription.Scenes,
        eventData: { sceneName: "Intro", sceneUuid: "scene-intro" }
      },
      eventBeforeResponseFor: "GetCurrentProgramScene"
    })
    servers.push(server)
    const client = await createObsClient(configFor(server.url), { eventBufferCapacity: 2 })
    clients.push(client)

    await expect(client.request(GetCurrentProgramScene)).resolves.toMatchObject({ sceneName: "Intro" })
    await expect(client.request(GetCurrentProgramScene)).resolves.toMatchObject({ sceneName: "Intro" })
    await expect(client.request(GetCurrentProgramScene)).resolves.toMatchObject({ sceneName: "Intro" })

    expect(client.getBufferedEvents()).toMatchObject({
      capacity: 2,
      droppedEvents: 1,
      events: [
        { sequence: 2, eventType: "CurrentProgramSceneChanged" },
        { sequence: 3, eventType: "CurrentProgramSceneChanged" }
      ]
    })
  })

  it("uses configured event buffer capacity", async () => {
    const server = await FakeObsServer.start({
      eventBurstBeforeResponse: Array.from({ length: 3 }, (_, index) => ({
        eventType: "CurrentProgramSceneChanged",
        eventIntent: EventSubscription.Scenes,
        eventData: { sceneName: `Scene ${index + 1}`, sceneUuid: `scene-${index + 1}` }
      })),
      eventBeforeResponseFor: "GetCurrentProgramScene"
    })
    servers.push(server)
    const client = await createObsClient({ ...configFor(server.url), eventBufferCapacity: 2 })
    clients.push(client)

    await expect(client.request(GetCurrentProgramScene)).resolves.toMatchObject({ sceneName: "Intro" })
    expect(client.getBufferedEvents()).toMatchObject({
      capacity: 2,
      droppedEvents: 1,
      events: [
        { sequence: 2, eventData: { sceneName: "Scene 2", sceneUuid: "scene-2" } },
        { sequence: 3, eventData: { sceneName: "Scene 3", sceneUuid: "scene-3" } }
      ]
    })
  })

  it("keeps event buffer capacity bounded under burst input", async () => {
    const server = await FakeObsServer.start({
      eventBurstBeforeResponse: Array.from({ length: 5 }, (_, index) => ({
        eventType: "CurrentProgramSceneChanged",
        eventIntent: EventSubscription.Scenes,
        eventData: { sceneName: `Scene ${index + 1}`, sceneUuid: `scene-${index + 1}` }
      })),
      eventBeforeResponseFor: "GetCurrentProgramScene"
    })
    servers.push(server)
    const client = await createObsClient(configFor(server.url), { eventBufferCapacity: 3 })
    clients.push(client)

    await expect(client.request(GetCurrentProgramScene)).resolves.toMatchObject({ sceneName: "Intro" })
    expect(client.getBufferedEvents()).toMatchObject({
      capacity: 3,
      droppedEvents: 2,
      events: [
        { sequence: 3, eventData: { sceneName: "Scene 3", sceneUuid: "scene-3" } },
        { sequence: 4, eventData: { sceneName: "Scene 4", sceneUuid: "scene-4" } },
        { sequence: 5, eventData: { sceneName: "Scene 5", sceneUuid: "scene-5" } }
      ]
    })
  })

  it("rejects invalid event buffer capacity before connecting", async () => {
    await expect(createObsClient(configFor("ws://127.0.0.1:1"), { eventBufferCapacity: 0 }))
      .rejects.toThrow("capacity")
  })

  it("filters vendor and custom events even when OBS sends them", async () => {
    const vendor = await FakeObsServer.start({
      eventBeforeResponse: {
        eventType: "VendorEvent",
        eventIntent: EventSubscription.Vendors,
        eventData: { vendorName: "plugin" }
      }
    })
    servers.push(vendor)
    const vendorClient = await createObsClient(configFor(vendor.url, undefined, 300, ["events"]))
    clients.push(vendorClient)
    await expect(vendorClient.request(GetCurrentProgramScene)).resolves.toMatchObject({ sceneName: "Intro" })
    expect(vendorClient.getBufferedEvents().events).toEqual([])

    const custom = await FakeObsServer.start({
      eventBeforeResponse: {
        eventType: "CustomEvent",
        eventIntent: EventSubscription.General,
        eventData: { name: "custom" }
      }
    })
    servers.push(custom)
    const customClient = await createObsClient(configFor(custom.url, undefined, 300, ["events"]))
    clients.push(customClient)
    await expect(customClient.request(GetCurrentProgramScene)).resolves.toMatchObject({ sceneName: "Intro" })
    expect(customClient.getBufferedEvents().events).toEqual([])
  })

  it("ignores non-event protocol envelopes after the handshake", async () => {
    const server = await FakeObsServer.start({
      envelopeBeforeResponse: { op: 2, d: { negotiatedRpcVersion: 1 } },
      envelopeBeforeResponseFor: "GetCurrentProgramScene"
    })
    servers.push(server)
    const client = await createObsClient(configFor(server.url))
    clients.push(client)
    await expect(client.request(GetCurrentProgramScene)).resolves.toMatchObject({ sceneName: "Intro" })
  })

  it("rejects pending requests on malformed event frames", async () => {
    const server = await FakeObsServer.start({
      eventBeforeResponse: {
        eventType: "CurrentProgramSceneChanged",
        eventIntent: "Scenes",
        eventData: { sceneName: "Intro", sceneUuid: "scene-intro" }
      },
      eventBeforeResponseFor: "GetCurrentProgramScene"
    })
    servers.push(server)
    const client = await createObsClient(configFor(server.url))
    clients.push(client)
    await expect(client.request(GetCurrentProgramScene)).rejects.toThrow(/eventIntent/)
    expect(client.getBufferedEvents().events).toEqual([])
  })

  it("drops malformed typed event payloads without surfacing raw data", async () => {
    const server = await FakeObsServer.start({
      eventBurstBeforeResponse: [
        {
          eventType: "InputNameChanged",
          eventIntent: EventSubscription.Inputs,
          eventData: { inputUuid: "input-camera", inputName: "Camera" }
        },
        {
          eventType: "InputRemoved",
          eventIntent: EventSubscription.Inputs,
          eventData: { inputName: "Camera", inputUuid: "input-camera", inputSettings: { secret: true } }
        },
        {
          eventType: "InputNameChanged",
          eventIntent: EventSubscription.Inputs,
          eventData: {
            inputUuid: "input-camera",
            oldInputName: "Old Camera",
            inputName: "Camera",
            inputKind: "dshow_input"
          }
        },
        {
          eventType: "SceneItemCreated",
          eventIntent: EventSubscription.SceneItems,
          eventData: {
            sceneName: "Program",
            sceneUuid: "scene-program",
            sourceName: "Camera",
            sourceUuid: "source-camera",
            sceneItemId: -1,
            sceneItemIndex: 0
          }
        },
        {
          eventType: "SourceFilterListReindexed",
          eventIntent: EventSubscription.Filters,
          eventData: {
            sourceName: "Camera",
            filters: [{ filterName: "Color", filterIndex: Number.MAX_SAFE_INTEGER + 1 }]
          }
        },
        {
          eventType: "InputVolumeChanged",
          eventIntent: EventSubscription.Inputs,
          eventData: {
            inputName: "Mic/Aux",
            inputUuid: "input-mic",
            inputVolumeMul: 0.5,
            inputVolumeDb: -6,
            inputSettings: { secret: true }
          }
        },
        {
          eventType: "MediaInputPlaybackEnded",
          eventIntent: EventSubscription.MediaInputs,
          eventData: {
            inputName: "Media",
            inputUuid: "input-media",
            mediaCursor: 1000
          }
        },
        {
          eventType: "MediaInputActionTriggered",
          eventIntent: EventSubscription.MediaInputs,
          eventData: {
            inputName: "Media",
            inputUuid: "input-media",
            mediaAction: "OBS_WEBSOCKET_MEDIA_INPUT_ACTION_PLAY",
            inputSettings: { secret: true }
          }
        },
        {
          eventType: "StudioModeStateChanged",
          eventIntent: EventSubscription.Ui,
          eventData: {
            studioModeEnabled: true,
            savedScreenshotPath: "/tmp/screenshot.png"
          }
        }
      ],
      eventBeforeResponseFor: "GetCurrentProgramScene"
    })
    servers.push(server)
    const client = await createObsClient(configFor(server.url))
    clients.push(client)

    await expect(client.request(GetCurrentProgramScene)).resolves.toMatchObject({ sceneName: "Intro" })
    expect(client.getBufferedEvents().events).toEqual([])
  })

  it("does not confirm malformed ingested studio-mode state payloads", async () => {
    const server = await FakeObsServer.start({
      eventBurstBeforeResponse: [
        {
          eventType: "StudioModeStateChanged",
          eventIntent: EventSubscription.Ui,
          eventData: { studioModeEnabled: "yes" }
        },
        {
          eventType: "StudioModeStateChanged",
          eventIntent: EventSubscription.Ui,
          eventData: {
            studioModeEnabled: true,
            savedScreenshotPath: "/tmp/screenshot.png"
          }
        },
        {
          eventType: "ScreenshotSaved",
          eventIntent: EventSubscription.Ui,
          eventData: { savedScreenshotPath: "/tmp/screenshot.png" }
        }
      ],
      eventBeforeResponseFor: "GetCurrentProgramScene"
    })
    servers.push(server)
    const client = await createObsClient(configFor(server.url))
    clients.push(client)

    await expect(client.request(GetCurrentProgramScene)).resolves.toMatchObject({ sceneName: "Intro" })
    expect(client.getBufferedEvents().events).toEqual([
      {
        sequence: 1,
        eventType: "ScreenshotSaved",
        eventIntent: EventSubscription.Ui,
        eventData: { savedScreenshotPath: "/tmp/screenshot.png" }
      }
    ])
    await expect(confirmObsStudioModeStateChange(client, {
      target: "studio_mode",
      outcome: "enabled",
      afterSequence: 0,
      timeoutMs: 1
    }, { maxTimeoutMs: 5 })).resolves.toMatchObject({
      confirmed: false,
      timedOut: true,
      latestSequence: 1
    })
  })

  it("does not confirm malformed ingested transition workflow payloads", async () => {
    const server = await FakeObsServer.start({
      eventBurstBeforeResponse: [
        {
          eventType: "CurrentSceneTransitionDurationChanged",
          eventIntent: EventSubscription.Transitions,
          eventData: { transitionDuration: 0 }
        },
        {
          eventType: "CurrentSceneTransitionDurationChanged",
          eventIntent: EventSubscription.Transitions,
          eventData: { transitionDuration: 49 }
        },
        {
          eventType: "CurrentSceneTransitionDurationChanged",
          eventIntent: EventSubscription.Transitions,
          eventData: { transitionDuration: 20001 }
        },
        {
          eventType: "CurrentSceneTransitionDurationChanged",
          eventIntent: EventSubscription.Transitions,
          eventData: { transitionDuration: 300.5 }
        },
        {
          eventType: "CurrentSceneTransitionDurationChanged",
          eventIntent: EventSubscription.Transitions,
          eventData: { transitionDuration: 300, transitionName: "Fade" }
        },
        {
          eventType: "SceneTransitionStarted",
          eventIntent: EventSubscription.Transitions,
          eventData: {
            transitionName: "Fade",
            transitionUuid: "transition-fade",
            transitionSettings: { secret: true }
          }
        }
      ],
      eventBeforeResponseFor: "GetCurrentProgramScene"
    })
    servers.push(server)
    const client = await createObsClient(configFor(server.url))
    clients.push(client)

    await expect(client.request(GetCurrentProgramScene)).resolves.toMatchObject({ sceneName: "Intro" })
    expect(client.getBufferedEvents().events).toEqual([
      {
        sequence: 1,
        eventType: "CurrentSceneTransitionDurationChanged",
        eventIntent: EventSubscription.Transitions,
        eventData: { transitionDuration: 0 }
      },
      {
        sequence: 2,
        eventType: "CurrentSceneTransitionDurationChanged",
        eventIntent: EventSubscription.Transitions,
        eventData: { transitionDuration: 49 }
      },
      {
        sequence: 3,
        eventType: "CurrentSceneTransitionDurationChanged",
        eventIntent: EventSubscription.Transitions,
        eventData: { transitionDuration: 20001 }
      }
    ])
    await expect(confirmObsTransitionWorkflow(client, {
      target: "current_scene_transition",
      outcome: "duration_changed",
      afterSequence: 0,
      timeoutMs: 1
    }, { maxTimeoutMs: 5 })).resolves.toMatchObject({
      confirmed: false,
      timedOut: true,
      latestSequence: 3
    })
    await expect(confirmObsTransitionWorkflow(client, {
      target: "scene_transition",
      outcome: "started",
      afterSequence: 0,
      timeoutMs: 1
    }, { maxTimeoutMs: 5 })).resolves.toMatchObject({
      confirmed: false,
      timedOut: true,
      latestSequence: 3
    })
  })

  it("does not confirm malformed ingested config workflow payloads", async () => {
    const server = await FakeObsServer.start({
      eventBurstBeforeResponse: [
        {
          eventType: "CurrentProfileChanged",
          eventIntent: EventSubscription.Config,
          eventData: { profileName: "" }
        },
        {
          eventType: "ProfileListChanged",
          eventIntent: EventSubscription.Config,
          eventData: { profiles: ["Profile A", ""] }
        },
        {
          eventType: "ProfileListChanged",
          eventIntent: EventSubscription.Config,
          eventData: { profiles: "Profile A" }
        },
        {
          eventType: "ProfileListChanged",
          eventIntent: EventSubscription.Config,
          eventData: { profiles: ["Profile A", 1] }
        },
        {
          eventType: "ProfileListChanged",
          eventIntent: EventSubscription.Config,
          eventData: { profiles: ["Profile A"], profileName: "Profile A" }
        }
      ],
      eventBeforeResponseFor: "GetCurrentProgramScene"
    })
    servers.push(server)
    const client = await createObsClient(configFor(server.url))
    clients.push(client)

    await expect(client.request(GetCurrentProgramScene)).resolves.toMatchObject({ sceneName: "Intro" })
    expect(client.getBufferedEvents().events).toEqual([
      {
        sequence: 1,
        eventType: "CurrentProfileChanged",
        eventIntent: EventSubscription.Config,
        eventData: { profileName: "" }
      },
      {
        sequence: 2,
        eventType: "ProfileListChanged",
        eventIntent: EventSubscription.Config,
        eventData: { profiles: ["Profile A", ""] }
      }
    ])
    await expect(confirmObsConfigWorkflow(client, {
      target: "profile",
      outcome: "changed",
      afterSequence: 0,
      timeoutMs: 1
    }, { maxTimeoutMs: 5 })).resolves.toMatchObject({
      confirmed: false,
      timedOut: true,
      latestSequence: 2
    })
    await expect(confirmObsConfigWorkflow(client, {
      target: "profile",
      outcome: "list_changed",
      afterSequence: 0,
      timeoutMs: 1
    }, { maxTimeoutMs: 5 })).resolves.toMatchObject({
      confirmed: false,
      timedOut: true,
      latestSequence: 2
    })
  })

  it("retains diagnostic canvas empty strings without confirming canvas inventory changes", async () => {
    const server = await FakeObsServer.start({
      eventBurstBeforeResponse: [
        {
          eventType: "CanvasCreated",
          eventIntent: EventSubscription.Canvases,
          eventData: { canvasName: "", canvasUuid: "canvas-a" }
        },
        {
          eventType: "CanvasRemoved",
          eventIntent: EventSubscription.Canvases,
          eventData: { canvasName: "Canvas B", canvasUuid: "" }
        },
        {
          eventType: "CanvasNameChanged",
          eventIntent: EventSubscription.Canvases,
          eventData: { oldCanvasName: "", canvasName: "Canvas C", canvasUuid: "canvas-c" }
        }
      ],
      eventBeforeResponseFor: "GetCurrentProgramScene"
    })
    servers.push(server)
    const client = await createObsClient(configFor(server.url))
    clients.push(client)

    await expect(client.request(GetCurrentProgramScene)).resolves.toMatchObject({ sceneName: "Intro" })
    expect(client.getBufferedEvents().events).toEqual([
      {
        sequence: 1,
        eventType: "CanvasCreated",
        eventIntent: EventSubscription.Canvases,
        eventData: { canvasName: "", canvasUuid: "canvas-a" }
      },
      {
        sequence: 2,
        eventType: "CanvasRemoved",
        eventIntent: EventSubscription.Canvases,
        eventData: { canvasName: "Canvas B", canvasUuid: "" }
      },
      {
        sequence: 3,
        eventType: "CanvasNameChanged",
        eventIntent: EventSubscription.Canvases,
        eventData: { oldCanvasName: "", canvasName: "Canvas C", canvasUuid: "canvas-c" }
      }
    ])
    await expect(confirmObsCanvasInventoryChange(client, {
      target: "canvas",
      outcome: "created",
      afterSequence: 0,
      timeoutMs: 1
    }, { maxTimeoutMs: 5 })).resolves.toMatchObject({
      confirmed: false,
      timedOut: true,
      latestSequence: 3
    })
    await expect(confirmObsCanvasInventoryChange(client, {
      target: "canvas",
      outcome: "removed",
      afterSequence: 0,
      timeoutMs: 1
    }, { maxTimeoutMs: 5 })).resolves.toMatchObject({
      confirmed: false,
      timedOut: true,
      latestSequence: 3
    })
    await expect(confirmObsCanvasInventoryChange(client, {
      target: "canvas",
      outcome: "renamed",
      afterSequence: 0,
      timeoutMs: 1
    }, { maxTimeoutMs: 5 })).resolves.toMatchObject({
      confirmed: false,
      timedOut: true,
      latestSequence: 3
    })
  })

  it("does not confirm malformed or excluded ingested input identity payloads", async () => {
    const server = await FakeObsServer.start({
      eventBurstBeforeResponse: [
        {
          eventType: "InputRemoved",
          eventIntent: EventSubscription.Inputs,
          eventData: { inputName: "", inputUuid: "input-camera" }
        },
        {
          eventType: "InputNameChanged",
          eventIntent: EventSubscription.Inputs,
          eventData: { inputUuid: "input-camera", oldInputName: "", inputName: "Camera" }
        },
        {
          eventType: "InputCreated",
          eventIntent: EventSubscription.Inputs,
          eventData: {
            inputName: "Camera",
            inputUuid: "input-camera",
            inputKind: "dshow_input",
            inputSettings: { secret: true }
          }
        },
        {
          eventType: "InputSettingsChanged",
          eventIntent: EventSubscription.Inputs,
          eventData: { inputName: "Camera", inputUuid: "input-camera", inputSettings: { secret: true } }
        }
      ],
      eventBeforeResponseFor: "GetCurrentProgramScene"
    })
    servers.push(server)
    const client = await createObsClient(configFor(server.url))
    clients.push(client)

    await expect(client.request(GetCurrentProgramScene)).resolves.toMatchObject({ sceneName: "Intro" })
    expect(client.getBufferedEvents().events).toEqual([
      {
        sequence: 1,
        eventType: "InputRemoved",
        eventIntent: EventSubscription.Inputs,
        eventData: { inputName: "", inputUuid: "input-camera" }
      },
      {
        sequence: 2,
        eventType: "InputNameChanged",
        eventIntent: EventSubscription.Inputs,
        eventData: { inputUuid: "input-camera", oldInputName: "", inputName: "Camera" }
      },
      {
        sequence: 3,
        eventType: "InputCreated",
        eventIntent: EventSubscription.Inputs,
        eventData: undefined
      },
      {
        sequence: 4,
        eventType: "InputSettingsChanged",
        eventIntent: EventSubscription.Inputs,
        eventData: undefined
      }
    ])
    await expect(confirmObsInputIdentityChange(client, {
      target: "input",
      outcome: "removed",
      afterSequence: 0,
      timeoutMs: 1
    }, { maxTimeoutMs: 5 })).resolves.toMatchObject({
      confirmed: false,
      timedOut: true,
      latestSequence: 4
    })
    await expect(confirmObsInputIdentityChange(client, {
      target: "input",
      outcome: "renamed",
      afterSequence: 0,
      timeoutMs: 1
    }, { maxTimeoutMs: 5 })).resolves.toMatchObject({
      confirmed: false,
      timedOut: true,
      latestSequence: 4
    })
  })

  it("drops typed input and media events with mismatched event intents", async () => {
    const server = await FakeObsServer.start({
      eventBurstBeforeResponse: [
        {
          eventType: "InputNameChanged",
          eventIntent: EventSubscription.General,
          eventData: { inputUuid: "input-camera", oldInputName: "Old Camera", inputName: "Camera" }
        },
        {
          eventType: "MediaInputPlaybackStarted",
          eventIntent: EventSubscription.Inputs,
          eventData: { inputName: "Media", inputUuid: "input-media" }
        }
      ],
      eventBeforeResponseFor: "GetCurrentProgramScene"
    })
    servers.push(server)
    const client = await createObsClient(configFor(server.url))
    clients.push(client)

    await expect(client.request(GetCurrentProgramScene)).resolves.toMatchObject({ sceneName: "Intro" })
    expect(client.getBufferedEvents().events).toEqual([])
  })

  it("drops no-payload events with unexpected raw event data", async () => {
    const server = await FakeObsServer.start({
      eventBeforeResponse: {
        eventType: "ExitStarted",
        eventIntent: EventSubscription.General,
        eventData: { raw: true }
      },
      eventBeforeResponseFor: "GetCurrentProgramScene"
    })
    servers.push(server)
    const client = await createObsClient(configFor(server.url))
    clients.push(client)

    await expect(client.request(GetCurrentProgramScene)).resolves.toMatchObject({ sceneName: "Intro" })
    expect(client.getBufferedEvents().events).toEqual([])
  })

  it("keeps buffered event snapshots readable after close", async () => {
    const server = await FakeObsServer.start({
      eventBeforeResponse: {
        eventType: "CurrentProgramSceneChanged",
        eventIntent: EventSubscription.Scenes,
        eventData: { sceneName: "Intro", sceneUuid: "scene-intro" }
      },
      eventBeforeResponseFor: "GetCurrentProgramScene"
    })
    servers.push(server)
    const client = await createObsClient(configFor(server.url))
    clients.push(client)
    await expect(client.request(GetCurrentProgramScene)).resolves.toMatchObject({ sceneName: "Intro" })
    await client.close()
    expect(client.getBufferedEvents().events).toHaveLength(1)
  })

  it("rejects malformed GetVersion availableRequests", async () => {
    const server = await FakeObsServer.start({ availableRequestsValue: "not-an-array" })
    servers.push(server)
    await expect(createObsClient(configFor(server.url))).rejects.toThrow("availableRequests")
  })

  it("sends requests without data", async () => {
    const server = await FakeObsServer.start()
    servers.push(server)
    const client = await createObsClient(configFor(server.url))
    clients.push(client)
    await expect(client.request(GetCurrentProgramScene)).resolves.toMatchObject({ sceneName: "Intro" })
  })

  it("handles successful responses without responseData", async () => {
    const server = await FakeObsServer.start({ omitResponseDataFor: "GetCurrentProgramScene" })
    servers.push(server)
    const client = await createObsClient(configFor(server.url))
    clients.push(client)
    await expect(client.request(GetCurrentProgramScene)).resolves.toEqual({})
  })

  it("rejects pending requests on malformed and binary post-handshake messages", async () => {
    const malformed = await FakeObsServer.start({
      sendMalformedBeforeResponse: true,
      badFrameBeforeResponseFor: "GetCurrentProgramScene"
    })
    servers.push(malformed)
    const malformedClient = await createObsClient(configFor(malformed.url))
    clients.push(malformedClient)
    await expect(malformedClient.request(GetCurrentProgramScene)).rejects.toThrow(/JSON/)

    const binary = await FakeObsServer.start({
      sendBinaryBeforeResponse: true,
      badFrameBeforeResponseFor: "GetCurrentProgramScene"
    })
    servers.push(binary)
    const binaryClient = await createObsClient(configFor(binary.url))
    clients.push(binaryClient)
    await expect(binaryClient.request(GetCurrentProgramScene)).rejects.toThrow("binary frame")
  })

  it("rejects requests after close and allows repeated close", async () => {
    const server = await FakeObsServer.start()
    servers.push(server)
    const client = await createObsClient(configFor(server.url))
    clients.push(client)
    await client.close()
    await client.close()
    await expect(client.request(GetCurrentProgramScene)).rejects.toThrow("closed")
  })

  it("surfaces failed OBS request status", async () => {
    const server = await FakeObsServer.start({
      failRequests: { SetCurrentProgramScene: { code: 608, comment: "Parameter: sceneName" } }
    })
    servers.push(server)
    const client = await createObsClient(configFor(server.url))
    clients.push(client)
    await expect(client.request(SetCurrentProgramScene, { sceneName: "Missing" })).rejects.toBeInstanceOf(
      ObsRequestError
    )
  })

  it("sends and decodes scene-item discovery requests", async () => {
    const server = await FakeObsServer.start()
    servers.push(server)
    const client = await createObsClient(configFor(server.url))
    clients.push(client)

    await expect(client.request(GetSceneItemList, { sceneName: "Main", canvasUuid: "canvas-main" }))
      .resolves.toEqual({
        sceneItems: [
          {
            sceneItemId: 7,
            sceneItemIndex: 0,
            sourceName: "Camera",
            sourceUuid: "source-camera",
            sourceType: "OBS_SOURCE_TYPE_INPUT",
            inputKind: "dshow_input",
            isGroup: null
          },
          {
            sceneItemId: 9,
            sceneItemIndex: 1,
            sourceName: "Lower Third",
            sourceUuid: "source-lower-third",
            sourceType: "OBS_SOURCE_TYPE_SCENE",
            inputKind: null,
            isGroup: true
          }
        ]
      })
    await expect(client.request(GetGroupSceneItemList, { sceneUuid: "scene-group" }))
      .resolves.toEqual({
        sceneItems: [{ sceneItemId: 3, sceneItemIndex: 0, sourceName: "Nested", sourceUuid: "source-nested" }]
      })
    await expect(client.request(GetSceneItemId, { sceneName: "Main", sourceName: "Camera", searchOffset: 0 }))
      .resolves.toEqual({ sceneItemId: 7 })
    await expect(client.request(GetSceneItemSource, { sceneUuid: "scene-main", sceneItemId: 7 }))
      .resolves.toEqual({ sourceName: "Camera", sourceUuid: "source-camera" })
    await expect(client.request(GetSceneItemEnabled, { sceneName: "Main", sceneItemId: 7 }))
      .resolves.toEqual({ sceneItemEnabled: true })
    await expect(client.request(SetSceneItemEnabled, {
      sceneName: "Main",
      sceneItemId: 7,
      sceneItemEnabled: false
    })).resolves.toEqual({})
    await expect(client.request(GetSceneItemLocked, { sceneName: "Main", sceneItemId: 9 }))
      .resolves.toEqual({ sceneItemLocked: true })
    await expect(client.request(SetSceneItemLocked, {
      sceneUuid: "scene-main",
      sceneItemId: 9,
      sceneItemLocked: false
    })).resolves.toEqual({})
    await expect(client.request(GetSceneItemIndex, { sceneName: "Main", sceneItemId: 9 }))
      .resolves.toEqual({ sceneItemIndex: 1 })
    await expect(client.request(GetSceneItemBlendMode, { sceneUuid: "scene-main", sceneItemId: 9 }))
      .resolves.toEqual({ sceneItemBlendMode: "OBS_BLEND_MULTIPLY" })
    await expect(client.request(SetSceneItemIndex, {
      sceneName: "Main",
      sceneItemId: 9,
      sceneItemIndex: 0
    })).resolves.toEqual({})
    await expect(client.request(SetSceneItemBlendMode, {
      sceneUuid: "scene-main",
      sceneItemId: 9,
      sceneItemBlendMode: "OBS_BLEND_SCREEN"
    })).resolves.toEqual({})
    await expect(client.request(GetSourceActive, { sourceName: "Camera", canvasUuid: "canvas-main" }))
      .resolves.toEqual({ videoActive: true, videoShowing: true })
    await expect(client.request(GetSourceActive, { sourceUuid: "source-missing" }))
      .resolves.toEqual({ videoActive: false, videoShowing: false })

    expect(server.requests.slice(-14)).toEqual([
      { requestType: "GetSceneItemList", requestData: { sceneName: "Main", canvasUuid: "canvas-main" } },
      { requestType: "GetGroupSceneItemList", requestData: { sceneUuid: "scene-group" } },
      { requestType: "GetSceneItemId", requestData: { sceneName: "Main", sourceName: "Camera", searchOffset: 0 } },
      { requestType: "GetSceneItemSource", requestData: { sceneUuid: "scene-main", sceneItemId: 7 } },
      { requestType: "GetSceneItemEnabled", requestData: { sceneName: "Main", sceneItemId: 7 } },
      {
        requestType: "SetSceneItemEnabled",
        requestData: { sceneName: "Main", sceneItemId: 7, sceneItemEnabled: false }
      },
      { requestType: "GetSceneItemLocked", requestData: { sceneName: "Main", sceneItemId: 9 } },
      {
        requestType: "SetSceneItemLocked",
        requestData: { sceneUuid: "scene-main", sceneItemId: 9, sceneItemLocked: false }
      },
      { requestType: "GetSceneItemIndex", requestData: { sceneName: "Main", sceneItemId: 9 } },
      { requestType: "GetSceneItemBlendMode", requestData: { sceneUuid: "scene-main", sceneItemId: 9 } },
      { requestType: "SetSceneItemIndex", requestData: { sceneName: "Main", sceneItemId: 9, sceneItemIndex: 0 } },
      {
        requestType: "SetSceneItemBlendMode",
        requestData: { sceneUuid: "scene-main", sceneItemId: 9, sceneItemBlendMode: "OBS_BLEND_SCREEN" }
      },
      { requestType: "GetSourceActive", requestData: { sourceName: "Camera", canvasUuid: "canvas-main" } },
      { requestType: "GetSourceActive", requestData: { sourceUuid: "source-missing" } }
    ])
  })

  it("maps failed scene-item state requests to OBS request errors", async () => {
    const server = await FakeObsServer.start({
      failRequests: { SetSceneItemEnabled: { code: 601, comment: "Scene item not found" } }
    })
    servers.push(server)
    const client = await createObsClient(configFor(server.url))
    clients.push(client)

    await expect(client.request(SetSceneItemEnabled, {
      sceneName: "Main",
      sceneItemId: 404,
      sceneItemEnabled: true
    })).rejects.toMatchObject({
      requestType: "SetSceneItemEnabled",
      code: 601,
      comment: "Scene item not found"
    })
  })

  it("maps failed scene-item index requests to OBS request errors", async () => {
    const server = await FakeObsServer.start({
      failRequests: { SetSceneItemIndex: { code: 601, comment: "Scene item not found" } }
    })
    servers.push(server)
    const client = await createObsClient(configFor(server.url))
    clients.push(client)

    await expect(client.request(SetSceneItemIndex, {
      sceneName: "Main",
      sceneItemId: 404,
      sceneItemIndex: 2
    })).rejects.toMatchObject({
      requestType: "SetSceneItemIndex",
      code: 601,
      comment: "Scene item not found"
    })
  })
})
