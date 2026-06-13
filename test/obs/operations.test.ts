import { Option, Schema } from "effect"
import { afterEach, describe, expect, it } from "vitest"

import type { ObsConfig } from "../../src/config/config.js"
import { createObsClient, type ObsClient } from "../../src/obs/client.js"
import { getVersion } from "../../src/obs/operations/general.js"
import { getSpecialInputs, listInputKinds, listInputs } from "../../src/obs/operations/inputs.js"
import { getCurrentScene, listScenes, setCurrentScene } from "../../src/obs/operations/scenes.js"
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

  it("discovers inputs and input kinds through the fake OBS protocol", async () => {
    const server = await FakeObsServer.start()
    servers.push(server)
    const client = await createObsClient(configFor(server.url))
    clients.push(client)
    await expect(listInputs(client, {})).resolves.toEqual({
      inputs: [
        {
          inputName: "Desktop Audio",
          inputUuid: "input-desktop-audio",
          inputKind: "wasapi_output_capture",
          unversionedInputKind: "wasapi_output_capture"
        },
        {
          inputName: "Mic/Aux",
          inputUuid: "input-mic-aux",
          inputKind: "wasapi_input_capture",
          unversionedInputKind: "wasapi_input_capture"
        }
      ]
    })
    await expect(listInputs(client, { inputKind: "wasapi_input_capture" })).resolves.toEqual({
      inputs: [{
        inputName: "Mic/Aux",
        inputUuid: "input-mic-aux",
        inputKind: "wasapi_input_capture",
        unversionedInputKind: "wasapi_input_capture"
      }]
    })
    await expect(listInputKinds(client, { unversioned: false })).resolves.toEqual({
      inputKinds: ["wasapi_output_capture", "wasapi_input_capture"]
    })
    await expect(listInputKinds(client, { unversioned: true })).resolves.toEqual({
      inputKinds: ["wasapi_output_capture", "wasapi_input_capture"]
    })
  })

  it("returns nullable special inputs for unassigned fake OBS channels", async () => {
    const server = await FakeObsServer.start()
    servers.push(server)
    const client = await createObsClient(configFor(server.url))
    clients.push(client)
    await expect(getSpecialInputs(client)).resolves.toEqual({
      desktop1: "Desktop Audio",
      desktop2: null,
      mic1: "Mic/Aux",
      mic2: null,
      mic3: null,
      mic4: null
    })
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
})
