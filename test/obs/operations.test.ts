import { Option, Schema } from "effect"
import { afterEach, describe, expect, it } from "vitest"

import type { ObsConfig } from "../../src/config/config.js"
import { getEnabledTools } from "../../src/mcp/tools/registry.js"
import { createObsClient, type ObsClient } from "../../src/obs/client.js"
import type { ObsRequestError } from "../../src/obs/errors.js"
import { getObsStats, getRecordStatus, getVersion } from "../../src/obs/operations/general.js"
import {
  getInputMute,
  getSpecialInputs,
  listInputKinds,
  listInputs,
  setInputMute,
  toggleInputMute
} from "../../src/obs/operations/inputs.js"
import {
  getVirtualCamStatus,
  startVirtualCam,
  stopVirtualCam,
  toggleVirtualCam
} from "../../src/obs/operations/outputs.js"
import { pauseRecord, resumeRecord, toggleRecordPause } from "../../src/obs/operations/record.js"
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

  it("returns OBS stats and record status from fake OBS", async () => {
    const server = await FakeObsServer.start()
    servers.push(server)
    const client = await createObsClient(configFor(server.url))
    clients.push(client)
    await expect(getObsStats(client)).resolves.toMatchObject({
      cpuUsage: 3.5,
      activeFps: 60,
      webSocketSessionOutgoingMessages: 11
    })
    await expect(getRecordStatus(client)).resolves.toEqual({
      outputActive: true,
      outputPaused: false,
      outputTimecode: "00:00:12.345",
      outputDuration: 12345,
      outputBytes: 67890
    })
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

  it("controls input mute over the OBS protocol", async () => {
    const server = await FakeObsServer.start()
    servers.push(server)
    const client = await createObsClient({ ...configFor(server.url), enabledToolsets: ["inputs"] })
    clients.push(client)
    await expect(getInputMute(client, { inputName: "Mic/Aux" })).resolves.toEqual({ inputMuted: false })
    await expect(setInputMute(client, { inputName: "Mic/Aux", inputMuted: true })).resolves.toEqual({
      inputMuted: true
    })
    await expect(getInputMute(client, { inputUuid: "input-mic-aux" })).resolves.toEqual({ inputMuted: true })
    await expect(toggleInputMute(client, { inputUuid: "input-mic-aux" })).resolves.toEqual({ inputMuted: false })
    expect(server.requests.filter((request) => request.requestType.includes("InputMute"))).toEqual([
      { requestType: "GetInputMute", requestData: { inputName: "Mic/Aux" } },
      { requestType: "SetInputMute", requestData: { inputName: "Mic/Aux", inputMuted: true } },
      { requestType: "GetInputMute", requestData: { inputUuid: "input-mic-aux" } },
      { requestType: "ToggleInputMute", requestData: { inputUuid: "input-mic-aux" } }
    ])
  })

  it("surfaces OBS failures for input mute controls", async () => {
    const server = await FakeObsServer.start({
      failRequests: { SetInputMute: { code: 600, comment: "Input not found" } }
    })
    servers.push(server)
    const client = await createObsClient({ ...configFor(server.url), enabledToolsets: ["inputs"] })
    clients.push(client)
    await expect(setInputMute(client, { inputName: "Missing", inputMuted: true })).rejects.toMatchObject(
      {
        requestType: "SetInputMute",
        code: 600,
        comment: "Input not found"
      } satisfies Partial<ObsRequestError>
    )
  })

  it("controls the virtual camera over the OBS protocol", async () => {
    const server = await FakeObsServer.start()
    servers.push(server)
    const client = await createObsClient(configFor(server.url))
    clients.push(client)
    await expect(getVirtualCamStatus(client)).resolves.toEqual({ outputActive: false })
    await expect(startVirtualCam(client)).resolves.toEqual({ outputActive: true, switched: true })
    await expect(getVirtualCamStatus(client)).resolves.toEqual({ outputActive: true })
    await expect(toggleVirtualCam(client)).resolves.toEqual({ outputActive: false, switched: true })
    await expect(stopVirtualCam(client)).resolves.toEqual({ outputActive: false, switched: true })
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

  it("pauses, resumes, and toggles record pause through fake OBS", async () => {
    const server = await FakeObsServer.start()
    servers.push(server)
    const client = await createObsClient({ ...configFor(server.url), enabledToolsets: ["record"] })
    clients.push(client)
    await expect(pauseRecord(client)).resolves.toEqual({
      requestedAction: "pause",
      requestType: "PauseRecord",
      acknowledged: true
    })
    await expect(resumeRecord(client)).resolves.toEqual({
      requestedAction: "resume",
      requestType: "ResumeRecord",
      acknowledged: true
    })
    await expect(toggleRecordPause(client)).resolves.toEqual({
      requestedAction: "toggle_pause",
      requestType: "ToggleRecordPause",
      acknowledged: true
    })
  })

  it("surfaces OBS failures for record pause controls", async () => {
    const server = await FakeObsServer.start({
      failRequests: { PauseRecord: { code: 500, comment: "Record output is not active" } }
    })
    servers.push(server)
    const client = await createObsClient({ ...configFor(server.url), enabledToolsets: ["record"] })
    clients.push(client)
    await expect(pauseRecord(client)).rejects.toThrow("PauseRecord failed")
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

  it("filters input mute tools when OBS does not advertise input mute capabilities", async () => {
    const server = await FakeObsServer.start({
      availableRequestsValue: ["GetVersion", "GetInputList", "GetInputKindList", "GetSpecialInputs"]
    })
    servers.push(server)
    const client = await createObsClient({ ...configFor(server.url), enabledToolsets: ["inputs"] })
    clients.push(client)
    expect(getEnabledTools(["inputs"], client.availableRequests).map((tool) => tool.name)).toEqual([
      "list_inputs",
      "list_input_kinds",
      "get_special_inputs"
    ])
  })
})
