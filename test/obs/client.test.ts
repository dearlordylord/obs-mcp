import { Option } from "effect"
import { afterEach, describe, expect, it } from "vitest"

import type { ObsConfig } from "../../src/config/config.js"
import { createObsClient, type ObsClient } from "../../src/obs/client.js"
import { ObsProtocolError, ObsRequestError, ObsTimeoutError } from "../../src/obs/errors.js"
import {
  EventSubscription,
  HIGH_VOLUME_EVENT_SUBSCRIPTIONS,
  SAFE_EVENT_SUBSCRIPTION_MASK
} from "../../src/obs/protocol.js"
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

afterEach(async () => {
  await Promise.all(clients.splice(0).map((client) => client.close().catch(() => undefined)))
  await Promise.all(servers.splice(0).map((server) => server.stop()))
})

describe("OBS websocket client", () => {
  it("connects through an unauthenticated handshake and caches available requests", async () => {
    const server = await FakeObsServer.start()
    servers.push(server)
    const client = await createObsClient(configFor(server.url))
    clients.push(client)
    expect(client.negotiatedRpcVersion).toBe(1)
    expect(client.availableRequests).toContain("GetSceneList")
    expect(server.lastIdentifyEventSubscriptions).toBe(SAFE_EVENT_SUBSCRIPTION_MASK)
    const subscriptions = server.lastIdentifyEventSubscriptions as number
    expect(subscriptions & EventSubscription.Vendors).toBe(0)
    for (const subscription of HIGH_VOLUME_EVENT_SUBSCRIPTIONS) {
      expect(subscriptions & EventSubscription[subscription]).toBe(0)
    }
  })

  it("keeps raw vendor, custom, and high-volume subscriptions disabled for the events toolset", async () => {
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

  it("rejects malformed Hello messages", async () => {
    const server = await FakeObsServer.start({ malformedHello: true })
    servers.push(server)
    await expect(createObsClient(configFor(server.url))).rejects.toThrow()
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
        eventType: "SceneListChanged",
        eventIntent: EventSubscription.Scenes,
        eventData: { scenes: [{ sceneName: "Intro", sceneUuid: "scene-intro", sceneIndex: 0 }] }
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

  it("rejects malformed events queued immediately after Identified", async () => {
    const server = await FakeObsServer.start({ sendMalformedAfterIdentify: true })
    servers.push(server)
    await expect(createObsClient(configFor(server.url))).rejects.toThrow()
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
    await expect(client.request(GetCurrentProgramScene)).rejects.toThrow()
    expect(client.getBufferedEvents().events).toEqual([])
  })

  it("rejects pending requests on malformed typed event payloads", async () => {
    const server = await FakeObsServer.start({
      eventBeforeResponse: {
        eventType: "InputMuteStateChanged",
        eventIntent: EventSubscription.Inputs,
        eventData: { inputName: "Mic/Aux", inputMuted: true }
      },
      eventBeforeResponseFor: "GetCurrentProgramScene"
    })
    servers.push(server)
    const client = await createObsClient(configFor(server.url))
    clients.push(client)

    await expect(client.request(GetCurrentProgramScene)).rejects.toThrow()
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
    await expect(malformedClient.request(GetCurrentProgramScene)).rejects.toThrow()

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
