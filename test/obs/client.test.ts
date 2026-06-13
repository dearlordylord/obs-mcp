import { Option } from "effect"
import { afterEach, describe, expect, it } from "vitest"

import type { ObsConfig } from "../../src/config/config.js"
import { createObsClient, type ObsClient } from "../../src/obs/client.js"
import { ObsProtocolError, ObsRequestError, ObsTimeoutError } from "../../src/obs/errors.js"
import { EventSubscription, SAFE_EVENT_SUBSCRIPTION_MASK } from "../../src/obs/protocol.js"
import {
  GetCurrentProgramScene,
  GetGroupSceneItemList,
  GetSceneItemId,
  GetSceneItemList,
  GetSceneItemSource,
  SetCurrentProgramScene
} from "../../src/obs/requests.js"
import { FakeObsServer } from "./fake-obs-server.js"

const servers: Array<FakeObsServer> = []
const clients: Array<ObsClient> = []

const configFor = (url: string, password?: string, timeout = 300): ObsConfig => ({
  url,
  password: password === undefined ? Option.none() : Option.some(password),
  connectionTimeoutMs: timeout,
  enabledToolsets: ["scenes"]
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
  })

  it("accepts safe low-volume event frames without surfacing a stream", async () => {
    const server = await FakeObsServer.start({
      eventBeforeResponse: {
        eventType: "CurrentProgramSceneChanged",
        eventIntent: EventSubscription.Scenes,
        eventData: { sceneName: "Intro", sceneUuid: "scene-intro" }
      }
    })
    servers.push(server)
    const client = await createObsClient(configFor(server.url))
    clients.push(client)
    await expect(client.request(GetCurrentProgramScene)).resolves.toMatchObject({ sceneName: "Intro" })
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

    expect(server.requests.slice(-4)).toEqual([
      { requestType: "GetSceneItemList", requestData: { sceneName: "Main", canvasUuid: "canvas-main" } },
      { requestType: "GetGroupSceneItemList", requestData: { sceneUuid: "scene-group" } },
      { requestType: "GetSceneItemId", requestData: { sceneName: "Main", sourceName: "Camera", searchOffset: 0 } },
      { requestType: "GetSceneItemSource", requestData: { sceneUuid: "scene-main", sceneItemId: 7 } }
    ])
  })
})
