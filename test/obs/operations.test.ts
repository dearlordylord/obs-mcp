import { Option, Schema } from "effect"
import { afterEach, describe, expect, it } from "vitest"

import type { ObsConfig } from "../../src/config/config.js"
import { getEnabledTools } from "../../src/mcp/tools/registry.js"
import { createObsClient, type ObsClient } from "../../src/obs/client.js"
import type { ObsRequestError } from "../../src/obs/errors.js"
import { getVersion } from "../../src/obs/operations/general.js"
import { getCurrentScene, listScenes, setCurrentScene } from "../../src/obs/operations/scenes.js"
import { getStreamStatus, startStream, stopStream, toggleStream } from "../../src/obs/operations/stream.js"
import type { ObsRequestType } from "../../src/obs/requests.js"
import { FakeObsServer } from "./fake-obs-server.js"

const servers: Array<FakeObsServer> = []
const clients: Array<ObsClient> = []

const configFor = (url: string): ObsConfig => ({
  url,
  password: Option.none(),
  connectionTimeoutMs: 300,
  enabledToolsets: ["scenes"]
})

const fakeClient = (handler: (requestType: ObsRequestType) => Promise<unknown>): ObsClient => ({
  negotiatedRpcVersion: 1,
  availableRequests: [],
  request: async (descriptor) =>
    Schema.decodeUnknownSync(descriptor.responseSchema)(await handler(descriptor.requestType)),
  close: async () => undefined
})

afterEach(async () => {
  await Promise.all(clients.splice(0).map((client) => client.close().catch(() => undefined)))
  await Promise.all(servers.splice(0).map((server) => server.stop()))
})

describe("OBS operations", () => {
  it("returns version data with negotiated RPC version", async () => {
    const server = await FakeObsServer.start()
    servers.push(server)
    const client = await createObsClient(configFor(server.url))
    clients.push(client)
    await expect(getVersion(client)).resolves.toMatchObject({ obsVersion: "31.0.0", negotiatedRpcVersion: 1 })
  })

  it("lists scenes and can filter groups", async () => {
    const server = await FakeObsServer.start()
    servers.push(server)
    const client = await createObsClient(configFor(server.url))
    clients.push(client)
    const allScenes = await listScenes(client, { includeGroups: true })
    const noGroups = await listScenes(client, { includeGroups: false })
    expect(allScenes.scenes).toHaveLength(3)
    expect(noGroups.scenes.map((scene) => scene.sceneName)).toEqual(["Intro", "Main"])
  })

  it("gets and sets the current scene", async () => {
    const server = await FakeObsServer.start()
    servers.push(server)
    const client = await createObsClient(configFor(server.url))
    clients.push(client)
    await expect(getCurrentScene(client)).resolves.toEqual({ sceneName: "Intro", sceneUuid: "scene-intro" })
    await expect(setCurrentScene(client, { sceneName: "Main" })).resolves.toEqual({ sceneName: "Main", switched: true })
    await expect(getCurrentScene(client)).resolves.toEqual({ sceneName: "Main", sceneUuid: "scene-main" })
  })

  it("rejects current scene responses without a scene name", async () => {
    await expect(getCurrentScene(fakeClient(async () => ({})))).rejects.toThrow("current program scene name")
  })

  it("uses deprecated current program scene fields as fallbacks", async () => {
    await expect(getCurrentScene(fakeClient(async () => ({
      currentProgramSceneName: "Fallback",
      currentProgramSceneUuid: "fallback-uuid"
    })))).resolves.toEqual({ sceneName: "Fallback", sceneUuid: "fallback-uuid" })
  })

  it("gets and controls stream lifecycle state", async () => {
    const server = await FakeObsServer.start()
    servers.push(server)
    const client = await createObsClient(configFor(server.url))
    clients.push(client)
    await expect(getStreamStatus(client)).resolves.toMatchObject({ outputActive: false, outputDuration: 0 })
    await expect(startStream(client)).resolves.toEqual({ outputActive: true })
    await expect(getStreamStatus(client)).resolves.toMatchObject({ outputActive: true, outputDuration: 12345 })
    await expect(toggleStream(client)).resolves.toEqual({ outputActive: false })
    await expect(stopStream(client)).resolves.toEqual({ outputActive: false })
  })

  it("surfaces OBS stream lifecycle request failures", async () => {
    const server = await FakeObsServer.start({
      failRequests: { StartStream: { code: 207, comment: "Output already active" } }
    })
    servers.push(server)
    const client = await createObsClient(configFor(server.url))
    clients.push(client)
    await expect(startStream(client)).rejects.toMatchObject(
      {
        requestType: "StartStream",
        code: 207,
        comment: "Output already active"
      } satisfies Partial<ObsRequestError>
    )
  })

  it("filters stream tools when OBS does not advertise stream capabilities", async () => {
    const server = await FakeObsServer.start({
      availableRequestsValue: ["GetVersion", "GetSceneList", "GetCurrentProgramScene", "SetCurrentProgramScene"]
    })
    servers.push(server)
    const client = await createObsClient(configFor(server.url))
    clients.push(client)
    expect(getEnabledTools(["stream"], client.availableRequests)).toEqual([])
  })
})
