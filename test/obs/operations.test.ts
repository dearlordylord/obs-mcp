import { Option, Schema } from "effect"
import { afterEach, describe, expect, it } from "vitest"

import type { ObsConfig } from "../../src/config/config.js"
import { getEnabledTools } from "../../src/mcp/tools/registry.js"
import { createObsClient, type ObsClient } from "../../src/obs/client.js"
import type { ObsRequestError } from "../../src/obs/errors.js"
import { getObsStats, getRecordStatus, getVersion } from "../../src/obs/operations/general.js"
import {
  getInputAudioBalance,
  getInputAudioMonitorType,
  getInputAudioSyncOffset,
  getInputMute,
  getInputVolume,
  getMediaInputStatus,
  getSpecialInputs,
  listInputKinds,
  listInputs,
  offsetMediaInputCursor,
  setInputAudioBalance,
  setInputAudioMonitorType,
  setInputAudioSyncOffset,
  setInputMute,
  setInputVolume,
  setMediaInputCursor,
  toggleInputMute,
  triggerMediaInputAction
} from "../../src/obs/operations/inputs.js"
import {
  getLastReplayBufferReplay,
  getReplayBufferStatus,
  getVirtualCamStatus,
  saveReplayBuffer,
  startReplayBuffer,
  startVirtualCam,
  stopReplayBuffer,
  stopVirtualCam,
  toggleReplayBuffer,
  toggleVirtualCam
} from "../../src/obs/operations/outputs.js"
import {
  createRecordChapter,
  pauseRecord,
  resumeRecord,
  splitRecordFile,
  startRecord,
  stopRecord,
  toggleRecord,
  toggleRecordPause
} from "../../src/obs/operations/record.js"
import {
  createScene,
  getCurrentPreviewScene,
  getCurrentScene,
  getSceneItemTransform,
  getSceneTransitionOverride,
  listGroups,
  listScenes,
  removeScene,
  setCurrentPreviewScene,
  setCurrentScene,
  setSceneName,
  setSceneTransitionOverride
} from "../../src/obs/operations/scenes.js"
import {
  getStreamStatus,
  sendStreamCaption,
  startStream,
  stopStream,
  toggleStream
} from "../../src/obs/operations/stream.js"
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
  getBufferedEvents: () => ({ capacity: 0, droppedEvents: 0, events: [] }),
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
      outputActive: false,
      outputPaused: false,
      outputTimecode: "00:00:00.000",
      outputDuration: 0,
      outputBytes: 0
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

  it("lists groups through the fake OBS protocol", async () => {
    const server = await FakeObsServer.start()
    servers.push(server)
    const client = await createObsClient(configFor(server.url))
    clients.push(client)
    await expect(listGroups(client)).resolves.toEqual({ groups: ["Group"] })
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

  it("gets and sets the current studio mode preview scene", async () => {
    const server = await FakeObsServer.start()
    servers.push(server)
    const client = await createObsClient(configFor(server.url))
    clients.push(client)
    await expect(getCurrentPreviewScene(client)).resolves.toEqual({ sceneName: "Intro", sceneUuid: "scene-intro" })
    await expect(setCurrentPreviewScene(client, { sceneUuid: "scene-main" }))
      .resolves.toEqual({ sceneUuid: "scene-main", updated: true })
    await expect(getCurrentPreviewScene(client)).resolves.toEqual({ sceneName: "Main", sceneUuid: "scene-main" })
  })

  it("creates, renames, and removes scenes through the fake OBS protocol", async () => {
    const server = await FakeObsServer.start()
    servers.push(server)
    const client = await createObsClient(configFor(server.url))
    clients.push(client)
    await expect(createScene(client, { sceneName: "Break" }))
      .resolves.toEqual({ sceneName: "Break", sceneUuid: "scene-break", created: true })
    await expect(createScene(client, { sceneName: "Temp" }))
      .resolves.toEqual({ sceneName: "Temp", sceneUuid: "scene-temp", created: true })
    await expect(removeScene(client, { sceneUuid: "scene-temp" }))
      .resolves.toEqual({ sceneUuid: "scene-temp", removed: true })
    await expect(listScenes(client, { includeGroups: true }))
      .resolves.toMatchObject({
        scenes: expect.arrayContaining([expect.objectContaining({ sceneName: "Break", sceneUuid: "scene-break" })])
      })
    await expect(setSceneName(client, {
      sceneName: "Break",
      canvasUuid: "canvas-main",
      newSceneName: "Intermission"
    })).resolves.toEqual({
      sceneName: "Break",
      canvasUuid: "canvas-main",
      newSceneName: "Intermission",
      renamed: true
    })
    await expect(listScenes(client, { includeGroups: true }))
      .resolves.toMatchObject({
        scenes: expect.arrayContaining([
          expect.objectContaining({ sceneName: "Intermission", sceneUuid: "scene-break" })
        ])
      })
    await expect(removeScene(client, { sceneName: "Intermission", canvasUuid: "canvas-main" }))
      .resolves.toEqual({ sceneName: "Intermission", canvasUuid: "canvas-main", removed: true })
    const scenes = await listScenes(client, { includeGroups: true })
    expect(scenes.scenes.map((scene) => scene.sceneName)).not.toContain("Intermission")
  })

  it("surfaces duplicate and missing scene lifecycle OBS errors", async () => {
    const server = await FakeObsServer.start()
    servers.push(server)
    const client = await createObsClient(configFor(server.url))
    clients.push(client)
    await expect(createScene(client, { sceneName: "Intro" })).rejects.toMatchObject({
      requestType: "CreateScene",
      code: 601,
      comment: "Scene already exists"
    })
    await expect(removeScene(client, { sceneName: "Missing" })).rejects.toMatchObject({
      requestType: "RemoveScene",
      code: 600,
      comment: "Scene not found"
    })
    await expect(setSceneName(client, { sceneName: "Missing", newSceneName: "Other" })).rejects.toMatchObject({
      requestType: "SetSceneName",
      code: 600,
      comment: "Scene not found"
    })
  })

  it("gets, sets, replaces, and clears scene transition overrides", async () => {
    const server = await FakeObsServer.start()
    servers.push(server)
    const client = await createObsClient(configFor(server.url))
    clients.push(client)
    await expect(getSceneTransitionOverride(client, { sceneName: "Intro" }))
      .resolves.toEqual({ transitionName: null, transitionDuration: null })
    await expect(setSceneTransitionOverride(client, {
      sceneName: "Intro",
      transitionName: "Fade",
      transitionDuration: 300
    })).resolves.toEqual({
      sceneName: "Intro",
      transitionName: "Fade",
      transitionDuration: 300,
      updated: true
    })
    await expect(getSceneTransitionOverride(client, { sceneUuid: "scene-intro" }))
      .resolves.toEqual({ transitionName: "Fade", transitionDuration: 300 })
    await expect(setSceneTransitionOverride(client, { sceneUuid: "scene-intro", transitionName: "Cut" }))
      .resolves.toEqual({ sceneUuid: "scene-intro", transitionName: "Cut", updated: true })
    await expect(getSceneTransitionOverride(client, { sceneName: "Intro" }))
      .resolves.toEqual({ transitionName: "Cut", transitionDuration: 300 })
    await expect(setSceneTransitionOverride(client, { sceneUuid: "scene-intro", transitionDuration: 500 }))
      .resolves.toEqual({ sceneUuid: "scene-intro", transitionDuration: 500, updated: true })
    await expect(getSceneTransitionOverride(client, { sceneName: "Intro" }))
      .resolves.toEqual({ transitionName: "Cut", transitionDuration: 500 })
    await expect(setSceneTransitionOverride(client, {
      sceneName: "Intro",
      transitionName: null,
      transitionDuration: null
    })).resolves.toEqual({
      sceneName: "Intro",
      transitionName: null,
      transitionDuration: null,
      updated: true
    })
    await expect(getSceneTransitionOverride(client, { sceneName: "Intro" }))
      .resolves.toEqual({ transitionName: null, transitionDuration: null })
  })

  it("gets scene item transform fields through the fake OBS protocol", async () => {
    const server = await FakeObsServer.start()
    servers.push(server)
    const client = await createObsClient(configFor(server.url))
    clients.push(client)
    await expect(getSceneItemTransform(client, { sceneName: "Intro", sceneItemId: 9 }))
      .resolves.toEqual({
        sceneItemTransform: {
          alignment: 5,
          boundsAlignment: 5,
          boundsHeight: 120,
          boundsType: "OBS_BOUNDS_SCALE_INNER",
          boundsWidth: 640,
          cropBottom: 4,
          cropLeft: 8,
          cropRight: 0,
          cropTop: 0,
          cropToBounds: true,
          height: 120,
          positionX: 64.5,
          positionY: 512.25,
          rotation: 0.5,
          scaleX: 0.5,
          scaleY: 0.5,
          sourceHeight: 240,
          sourceWidth: 1280,
          width: 640
        }
      })
  })

  it("surfaces scene item transform OBS errors", async () => {
    const server = await FakeObsServer.start({
      failRequests: { GetSceneItemTransform: { code: 601, comment: "Scene item not found" } }
    })
    servers.push(server)
    const client = await createObsClient(configFor(server.url))
    clients.push(client)
    await expect(getSceneItemTransform(client, { sceneName: "Intro", sceneItemId: 99 })).rejects.toMatchObject({
      requestType: "GetSceneItemTransform",
      code: 601,
      comment: "Scene item not found"
    })
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

  it("controls input volume over the OBS protocol", async () => {
    const server = await FakeObsServer.start()
    servers.push(server)
    const client = await createObsClient({ ...configFor(server.url), enabledToolsets: ["inputs"] })
    clients.push(client)
    await expect(getInputVolume(client, { inputName: "Mic/Aux" })).resolves.toEqual({
      inputVolumeMul: 1,
      inputVolumeDb: 0
    })
    await expect(setInputVolume(client, { inputName: "Mic/Aux", inputVolumeMul: 0.5 })).resolves.toEqual({
      inputVolumeMul: 0.5,
      acknowledged: true
    })
    const volume = await getInputVolume(client, { inputUuid: "input-mic-aux" })
    expect(volume.inputVolumeMul).toBe(0.5)
    expect(volume.inputVolumeDb).toBeCloseTo(-6.0206, 4)
    await expect(setInputVolume(client, { inputUuid: "input-mic-aux", inputVolumeDb: -6 })).resolves.toEqual({
      inputVolumeDb: -6,
      acknowledged: true
    })
    expect(server.requests.filter((request) => request.requestType.includes("InputVolume"))).toEqual([
      { requestType: "GetInputVolume", requestData: { inputName: "Mic/Aux" } },
      { requestType: "SetInputVolume", requestData: { inputName: "Mic/Aux", inputVolumeMul: 0.5 } },
      { requestType: "GetInputVolume", requestData: { inputUuid: "input-mic-aux" } },
      { requestType: "SetInputVolume", requestData: { inputUuid: "input-mic-aux", inputVolumeDb: -6 } }
    ])
  })

  it("surfaces OBS failures for input volume controls", async () => {
    const server = await FakeObsServer.start({
      failRequests: { SetInputVolume: { code: 601, comment: "Volume out of range" } }
    })
    servers.push(server)
    const client = await createObsClient({ ...configFor(server.url), enabledToolsets: ["inputs"] })
    clients.push(client)
    await expect(setInputVolume(client, { inputName: "Mic/Aux", inputVolumeMul: 21 })).rejects.toThrow(
      "Expected a number less than or equal to 20"
    )
    await expect(setInputVolume(client, { inputName: "Mic/Aux", inputVolumeMul: 1 })).rejects.toMatchObject(
      {
        requestType: "SetInputVolume",
        code: 601,
        comment: "Volume out of range"
      } satisfies Partial<ObsRequestError>
    )
  })

  it("controls input audio balance and monitor type over the OBS protocol", async () => {
    const server = await FakeObsServer.start()
    servers.push(server)
    const client = await createObsClient({ ...configFor(server.url), enabledToolsets: ["inputs"] })
    clients.push(client)
    await expect(getInputAudioBalance(client, { inputName: "Mic/Aux" })).resolves.toEqual({
      inputAudioBalance: 0.5
    })
    await expect(setInputAudioBalance(client, { inputName: "Mic/Aux", inputAudioBalance: 0.75 })).resolves.toEqual({
      inputAudioBalance: 0.75,
      acknowledged: true
    })
    await expect(getInputAudioBalance(client, { inputUuid: "input-mic-aux" })).resolves.toEqual({
      inputAudioBalance: 0.75
    })
    await expect(getInputAudioMonitorType(client, { inputName: "Mic/Aux" })).resolves.toEqual({
      monitorType: "OBS_MONITORING_TYPE_NONE"
    })
    await expect(setInputAudioMonitorType(client, {
      inputUuid: "input-mic-aux",
      monitorType: "OBS_MONITORING_TYPE_MONITOR_AND_OUTPUT"
    })).resolves.toEqual({
      monitorType: "OBS_MONITORING_TYPE_MONITOR_AND_OUTPUT",
      acknowledged: true
    })
    await expect(getInputAudioMonitorType(client, { inputName: "Mic/Aux" })).resolves.toEqual({
      monitorType: "OBS_MONITORING_TYPE_MONITOR_AND_OUTPUT"
    })
    expect(server.requests.filter((request) => request.requestType.includes("InputAudio"))).toEqual([
      { requestType: "GetInputAudioBalance", requestData: { inputName: "Mic/Aux" } },
      { requestType: "SetInputAudioBalance", requestData: { inputName: "Mic/Aux", inputAudioBalance: 0.75 } },
      { requestType: "GetInputAudioBalance", requestData: { inputUuid: "input-mic-aux" } },
      { requestType: "GetInputAudioMonitorType", requestData: { inputName: "Mic/Aux" } },
      {
        requestType: "SetInputAudioMonitorType",
        requestData: {
          inputUuid: "input-mic-aux",
          monitorType: "OBS_MONITORING_TYPE_MONITOR_AND_OUTPUT"
        }
      },
      { requestType: "GetInputAudioMonitorType", requestData: { inputName: "Mic/Aux" } }
    ])
  })

  it("surfaces OBS failures for input audio controls", async () => {
    const server = await FakeObsServer.start({
      failRequests: { SetInputAudioMonitorType: { code: 602, comment: "Monitor unavailable" } }
    })
    servers.push(server)
    const client = await createObsClient({ ...configFor(server.url), enabledToolsets: ["inputs"] })
    clients.push(client)
    await expect(setInputAudioBalance(client, { inputName: "Mic/Aux", inputAudioBalance: 2 })).rejects.toThrow(
      "Expected a number less than or equal to 1"
    )
    await expect(setInputAudioMonitorType(client, {
      inputName: "Mic/Aux",
      monitorType: "OBS_MONITORING_TYPE_MONITOR_ONLY"
    })).rejects.toMatchObject(
      {
        requestType: "SetInputAudioMonitorType",
        code: 602,
        comment: "Monitor unavailable"
      } satisfies Partial<ObsRequestError>
    )
  })

  it("controls input audio sync offset over the OBS protocol", async () => {
    const server = await FakeObsServer.start()
    servers.push(server)
    const client = await createObsClient({ ...configFor(server.url), enabledToolsets: ["inputs"] })
    clients.push(client)
    await expect(getInputAudioSyncOffset(client, { inputName: "Mic/Aux" })).resolves.toEqual({
      inputAudioSyncOffset: 0
    })
    await expect(setInputAudioSyncOffset(client, { inputName: "Mic/Aux", inputAudioSyncOffset: -250 }))
      .resolves.toEqual({
        inputAudioSyncOffset: -250,
        acknowledged: true
      })
    await expect(getInputAudioSyncOffset(client, { inputUuid: "input-mic-aux" })).resolves.toEqual({
      inputAudioSyncOffset: -250
    })
    await expect(setInputAudioSyncOffset(client, { inputUuid: "input-mic-aux", inputAudioSyncOffset: 125 }))
      .resolves.toEqual({
        inputAudioSyncOffset: 125,
        acknowledged: true
      })
    expect(server.requests.filter((request) => request.requestType.includes("InputAudioSyncOffset"))).toEqual([
      { requestType: "GetInputAudioSyncOffset", requestData: { inputName: "Mic/Aux" } },
      { requestType: "SetInputAudioSyncOffset", requestData: { inputName: "Mic/Aux", inputAudioSyncOffset: -250 } },
      { requestType: "GetInputAudioSyncOffset", requestData: { inputUuid: "input-mic-aux" } },
      { requestType: "SetInputAudioSyncOffset", requestData: { inputUuid: "input-mic-aux", inputAudioSyncOffset: 125 } }
    ])
  })

  it("surfaces OBS failures for input audio sync offset controls", async () => {
    const server = await FakeObsServer.start({
      failRequests: { SetInputAudioSyncOffset: { code: 603, comment: "Sync offset rejected" } }
    })
    servers.push(server)
    const client = await createObsClient({ ...configFor(server.url), enabledToolsets: ["inputs"] })
    clients.push(client)
    await expect(setInputAudioSyncOffset(client, { inputName: "Mic/Aux", inputAudioSyncOffset: 1.5 }))
      .rejects.toThrow("Expected an integer")
    await expect(setInputAudioSyncOffset(client, { inputName: "Mic/Aux", inputAudioSyncOffset: 20000 }))
      .rejects.toMatchObject(
        {
          requestType: "SetInputAudioSyncOffset",
          code: 603,
          comment: "Sync offset rejected"
        } satisfies Partial<ObsRequestError>
      )
  })

  it("gets nullable and playing media input status over the OBS protocol", async () => {
    const server = await FakeObsServer.start({
      inputs: [
        {
          inputName: "Media Source",
          inputUuid: "input-media-source",
          inputKind: "ffmpeg_source",
          unversionedInputKind: "ffmpeg_source",
          mediaState: "OBS_MEDIA_STATE_PLAYING",
          mediaDuration: 120000,
          mediaCursor: 4500
        },
        {
          inputName: "Stopped Media",
          inputUuid: "input-stopped-media",
          inputKind: "vlc_source",
          unversionedInputKind: "vlc_source"
        }
      ]
    })
    servers.push(server)
    const client = await createObsClient({ ...configFor(server.url), enabledToolsets: ["inputs"] })
    clients.push(client)
    await expect(getMediaInputStatus(client, { inputName: "Media Source" })).resolves.toEqual({
      mediaState: "OBS_MEDIA_STATE_PLAYING",
      mediaDuration: 120000,
      mediaCursor: 4500
    })
    await expect(getMediaInputStatus(client, { inputUuid: "input-stopped-media" })).resolves.toEqual({
      mediaState: "OBS_MEDIA_STATE_STOPPED",
      mediaDuration: null,
      mediaCursor: null
    })
    expect(server.requests.filter((request) => request.requestType === "GetMediaInputStatus")).toEqual([
      { requestType: "GetMediaInputStatus", requestData: { inputName: "Media Source" } },
      { requestType: "GetMediaInputStatus", requestData: { inputUuid: "input-stopped-media" } }
    ])
  })

  it("surfaces OBS failures for media input status", async () => {
    const server = await FakeObsServer.start({
      failRequests: { GetMediaInputStatus: { code: 604, comment: "Media input unavailable" } }
    })
    servers.push(server)
    const client = await createObsClient({ ...configFor(server.url), enabledToolsets: ["inputs"] })
    clients.push(client)
    await expect(getMediaInputStatus(client, { inputName: "Missing Media" })).rejects.toMatchObject(
      {
        requestType: "GetMediaInputStatus",
        code: 604,
        comment: "Media input unavailable"
      } satisfies Partial<ObsRequestError>
    )
  })

  it("sets and offsets media input cursor over the OBS protocol", async () => {
    const server = await FakeObsServer.start({
      inputs: [{
        inputName: "Media Source",
        inputUuid: "input-media-source",
        inputKind: "ffmpeg_source",
        unversionedInputKind: "ffmpeg_source",
        mediaState: "OBS_MEDIA_STATE_PLAYING",
        mediaDuration: 10000,
        mediaCursor: 1000
      }]
    })
    servers.push(server)
    const client = await createObsClient({ ...configFor(server.url), enabledToolsets: ["inputs"] })
    clients.push(client)
    await expect(setMediaInputCursor(client, { inputName: "Media Source", mediaCursor: 2500 })).resolves.toEqual({
      mediaCursor: 2500,
      acknowledged: true
    })
    await expect(getMediaInputStatus(client, { inputUuid: "input-media-source" })).resolves.toMatchObject({
      mediaCursor: 2500
    })
    await expect(offsetMediaInputCursor(client, {
      inputUuid: "input-media-source",
      mediaCursorOffset: -3000
    })).resolves.toEqual({
      mediaCursorOffset: -3000,
      acknowledged: true
    })
    await expect(getMediaInputStatus(client, { inputName: "Media Source" })).resolves.toMatchObject({
      mediaCursor: -500
    })
    expect(server.requests.filter((request) => request.requestType.includes("MediaInputCursor"))).toEqual([
      { requestType: "SetMediaInputCursor", requestData: { inputName: "Media Source", mediaCursor: 2500 } },
      {
        requestType: "OffsetMediaInputCursor",
        requestData: { inputUuid: "input-media-source", mediaCursorOffset: -3000 }
      }
    ])
  })

  it("validates media cursor shapes before sending OBS requests", async () => {
    const server = await FakeObsServer.start()
    servers.push(server)
    const client = await createObsClient({ ...configFor(server.url), enabledToolsets: ["inputs"] })
    clients.push(client)
    await expect(setMediaInputCursor(client, { inputName: "Media Source", mediaCursor: -1 }))
      .rejects.toThrow("Expected a non-negative number")
    await expect(offsetMediaInputCursor(client, { inputName: "Media Source", mediaCursorOffset: -1 }))
      .resolves.toEqual({ mediaCursorOffset: -1, acknowledged: true })
  })

  it("triggers media input actions over the OBS protocol", async () => {
    const server = await FakeObsServer.start({
      inputs: [{
        inputName: "Media Source",
        inputUuid: "input-media-source",
        inputKind: "ffmpeg_source",
        unversionedInputKind: "ffmpeg_source",
        mediaState: "OBS_MEDIA_STATE_PAUSED",
        mediaDuration: 10000,
        mediaCursor: 5000
      }]
    })
    servers.push(server)
    const client = await createObsClient({ ...configFor(server.url), enabledToolsets: ["inputs"] })
    clients.push(client)
    await expect(triggerMediaInputAction(client, {
      inputName: "Media Source",
      mediaAction: "OBS_WEBSOCKET_MEDIA_INPUT_ACTION_PLAY"
    })).resolves.toEqual({
      mediaAction: "OBS_WEBSOCKET_MEDIA_INPUT_ACTION_PLAY",
      acknowledged: true
    })
    await expect(getMediaInputStatus(client, { inputUuid: "input-media-source" })).resolves.toMatchObject({
      mediaState: "OBS_MEDIA_STATE_PLAYING"
    })
    await expect(triggerMediaInputAction(client, {
      inputUuid: "input-media-source",
      mediaAction: "OBS_WEBSOCKET_MEDIA_INPUT_ACTION_RESTART"
    })).resolves.toEqual({
      mediaAction: "OBS_WEBSOCKET_MEDIA_INPUT_ACTION_RESTART",
      acknowledged: true
    })
    await expect(getMediaInputStatus(client, { inputName: "Media Source" })).resolves.toMatchObject({
      mediaState: "OBS_MEDIA_STATE_PLAYING",
      mediaCursor: 0
    })
    expect(server.requests.filter((request) => request.requestType === "TriggerMediaInputAction")).toEqual([
      {
        requestType: "TriggerMediaInputAction",
        requestData: { inputName: "Media Source", mediaAction: "OBS_WEBSOCKET_MEDIA_INPUT_ACTION_PLAY" }
      },
      {
        requestType: "TriggerMediaInputAction",
        requestData: { inputUuid: "input-media-source", mediaAction: "OBS_WEBSOCKET_MEDIA_INPUT_ACTION_RESTART" }
      }
    ])
  })

  it("surfaces OBS failures for media input actions", async () => {
    const server = await FakeObsServer.start({
      failRequests: { TriggerMediaInputAction: { code: 605, comment: "Media action unavailable" } }
    })
    servers.push(server)
    const client = await createObsClient({ ...configFor(server.url), enabledToolsets: ["inputs"] })
    clients.push(client)
    await expect(triggerMediaInputAction(client, {
      inputName: "Media Source",
      mediaAction: "OBS_WEBSOCKET_MEDIA_INPUT_ACTION_STOP"
    })).rejects.toMatchObject(
      {
        requestType: "TriggerMediaInputAction",
        code: 605,
        comment: "Media action unavailable"
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

  it("controls the replay buffer over the OBS protocol", async () => {
    const server = await FakeObsServer.start()
    servers.push(server)
    const client = await createObsClient({ ...configFor(server.url), enabledToolsets: ["outputs"] })
    clients.push(client)
    await expect(getReplayBufferStatus(client)).resolves.toEqual({ outputActive: false })
    await expect(startReplayBuffer(client)).resolves.toEqual({ outputActive: true })
    await expect(getReplayBufferStatus(client)).resolves.toEqual({ outputActive: true })
    await expect(toggleReplayBuffer(client)).resolves.toEqual({ outputActive: false })
    await expect(stopReplayBuffer(client)).resolves.toEqual({ outputActive: false })
    await expect(saveReplayBuffer(client)).resolves.toEqual({
      requestType: "SaveReplayBuffer",
      acknowledged: true
    })
    await expect(getLastReplayBufferReplay(client)).resolves.toEqual({
      savedReplayPath: "/opaque/replay-buffer.mp4"
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

  it("uses deprecated current preview scene fields as fallbacks", async () => {
    await expect(getCurrentPreviewScene(fakeClient(async () => ({
      currentPreviewSceneName: "Fallback",
      currentPreviewSceneUuid: "fallback-uuid"
    })))).resolves.toEqual({ sceneName: "Fallback", sceneUuid: "fallback-uuid" })
  })

  it("rejects current preview scene responses without a scene name", async () => {
    await expect(getCurrentPreviewScene(fakeClient(async () => ({})))).rejects.toThrow("current preview scene name")
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

  it("starts, stops, and toggles record lifecycle through fake OBS", async () => {
    const server = await FakeObsServer.start()
    servers.push(server)
    const client = await createObsClient({ ...configFor(server.url), enabledToolsets: ["record"] })
    clients.push(client)
    await expect(startRecord(client)).resolves.toEqual({
      requestType: "StartRecord",
      acknowledged: true
    })
    await expect(getRecordStatus(client)).resolves.toMatchObject({ outputActive: true })
    await expect(toggleRecord(client)).resolves.toEqual({ outputActive: false })
    await expect(stopRecord(client)).resolves.toEqual({
      requestType: "StopRecord",
      acknowledged: true,
      outputPath: "/opaque/obs-recording.mkv"
    })
  })

  it("splits record files and creates record chapters through fake OBS", async () => {
    const server = await FakeObsServer.start()
    servers.push(server)
    const client = await createObsClient({ ...configFor(server.url), enabledToolsets: ["record"] })
    clients.push(client)
    await expect(splitRecordFile(client)).resolves.toEqual({
      requestType: "SplitRecordFile",
      acknowledged: true
    })
    await expect(createRecordChapter(client, {})).resolves.toEqual({
      requestType: "CreateRecordChapter",
      acknowledged: true
    })
    await expect(createRecordChapter(client, { chapterName: "Act 1" })).resolves.toEqual({
      requestType: "CreateRecordChapter",
      acknowledged: true
    })
    expect(server.requests.filter((request) => request.requestType === "CreateRecordChapter")).toEqual([
      { requestType: "CreateRecordChapter", requestData: {} },
      { requestType: "CreateRecordChapter", requestData: { chapterName: "Act 1" } }
    ])
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

  it("surfaces OBS failures for record lifecycle controls with metadata", async () => {
    const server = await FakeObsServer.start({
      failRequests: { StartRecord: { code: 207, comment: "Output already active" } }
    })
    servers.push(server)
    const client = await createObsClient({ ...configFor(server.url), enabledToolsets: ["record"] })
    clients.push(client)
    await expect(startRecord(client)).rejects.toMatchObject(
      {
        requestType: "StartRecord",
        code: 207,
        comment: "Output already active"
      } satisfies Partial<ObsRequestError>
    )
  })

  it("surfaces OBS failures for record file and chapter controls with metadata", async () => {
    const splitServer = await FakeObsServer.start({
      failRequests: { SplitRecordFile: { code: 703, comment: "Recording not active" } }
    })
    servers.push(splitServer)
    const splitClient = await createObsClient({ ...configFor(splitServer.url), enabledToolsets: ["record"] })
    clients.push(splitClient)
    await expect(splitRecordFile(splitClient)).rejects.toMatchObject(
      {
        requestType: "SplitRecordFile",
        code: 703,
        comment: "Recording not active"
      } satisfies Partial<ObsRequestError>
    )

    const chapterServer = await FakeObsServer.start({
      failRequests: { CreateRecordChapter: { code: 703, comment: "Chapter markers unavailable" } }
    })
    servers.push(chapterServer)
    const chapterClient = await createObsClient({ ...configFor(chapterServer.url), enabledToolsets: ["record"] })
    clients.push(chapterClient)
    await expect(createRecordChapter(chapterClient, { chapterName: "Act 1" })).rejects.toMatchObject(
      {
        requestType: "CreateRecordChapter",
        code: 703,
        comment: "Chapter markers unavailable"
      } satisfies Partial<ObsRequestError>
    )
  })

  it("filters record lifecycle tools when OBS does not advertise record capabilities", async () => {
    const server = await FakeObsServer.start({
      availableRequestsValue: ["GetVersion", "PauseRecord", "ResumeRecord", "ToggleRecordPause"]
    })
    servers.push(server)
    const client = await createObsClient({ ...configFor(server.url), enabledToolsets: ["record"] })
    clients.push(client)
    expect(getEnabledTools(["record"], client.availableRequests).map((tool) => tool.name)).toEqual([
      "pause_record",
      "resume_record",
      "toggle_record_pause"
    ])
  })

  it("filters record file and chapter tools when OBS does not advertise those capabilities", async () => {
    const server = await FakeObsServer.start({
      availableRequestsValue: ["GetVersion", "SplitRecordFile"]
    })
    servers.push(server)
    const client = await createObsClient({ ...configFor(server.url), enabledToolsets: ["record"] })
    clients.push(client)
    expect(getEnabledTools(["record"], client.availableRequests).map((tool) => tool.name)).toEqual([
      "split_record_file"
    ])
  })

  it("surfaces OBS replay buffer request failures", async () => {
    const lifecycleServer = await FakeObsServer.start({
      failRequests: { StartReplayBuffer: { code: 207, comment: "Output already active" } }
    })
    servers.push(lifecycleServer)
    const lifecycleClient = await createObsClient({ ...configFor(lifecycleServer.url), enabledToolsets: ["outputs"] })
    clients.push(lifecycleClient)
    await expect(startReplayBuffer(lifecycleClient)).rejects.toMatchObject(
      {
        requestType: "StartReplayBuffer",
        code: 207,
        comment: "Output already active"
      } satisfies Partial<ObsRequestError>
    )

    const saveServer = await FakeObsServer.start({
      failRequests: { SaveReplayBuffer: { code: 703, comment: "Replay buffer is not active" } }
    })
    servers.push(saveServer)
    const saveClient = await createObsClient({ ...configFor(saveServer.url), enabledToolsets: ["outputs"] })
    clients.push(saveClient)
    await expect(saveReplayBuffer(saveClient)).rejects.toMatchObject(
      {
        requestType: "SaveReplayBuffer",
        code: 703,
        comment: "Replay buffer is not active"
      } satisfies Partial<ObsRequestError>
    )

    const lastReplayServer = await FakeObsServer.start({
      failRequests: { GetLastReplayBufferReplay: { code: 703, comment: "No replay has been saved" } }
    })
    servers.push(lastReplayServer)
    const lastReplayClient = await createObsClient({
      ...configFor(lastReplayServer.url),
      enabledToolsets: ["outputs"]
    })
    clients.push(lastReplayClient)
    await expect(getLastReplayBufferReplay(lastReplayClient)).rejects.toMatchObject(
      {
        requestType: "GetLastReplayBufferReplay",
        code: 703,
        comment: "No replay has been saved"
      } satisfies Partial<ObsRequestError>
    )
  })

  it("filters replay buffer tools when OBS does not advertise replay buffer capabilities", async () => {
    const server = await FakeObsServer.start({
      availableRequestsValue: ["GetVersion", "GetReplayBufferStatus", "ToggleReplayBuffer", "SaveReplayBuffer"]
    })
    servers.push(server)
    const client = await createObsClient({ ...configFor(server.url), enabledToolsets: ["outputs"] })
    clients.push(client)
    expect(getEnabledTools(["outputs"], client.availableRequests).map((tool) => tool.name)).toEqual([
      "get_replay_buffer_status",
      "toggle_replay_buffer",
      "save_replay_buffer"
    ])
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

  it("sends stream captions through fake OBS", async () => {
    const server = await FakeObsServer.start()
    servers.push(server)
    const client = await createObsClient({ ...configFor(server.url), enabledToolsets: ["stream"] })
    clients.push(client)
    await expect(sendStreamCaption(client, { captionText: "Live caption" })).resolves.toEqual({
      requestType: "SendStreamCaption",
      acknowledged: true
    })
    expect(server.requests.filter((request) => request.requestType === "SendStreamCaption")).toEqual([
      { requestType: "SendStreamCaption", requestData: { captionText: "Live caption" } }
    ])
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

  it("surfaces OBS stream caption request failures", async () => {
    const server = await FakeObsServer.start({
      failRequests: { SendStreamCaption: { code: 703, comment: "Stream output is not active" } }
    })
    servers.push(server)
    const client = await createObsClient(configFor(server.url))
    clients.push(client)
    await expect(sendStreamCaption(client, { captionText: "Live caption" })).rejects.toMatchObject(
      {
        requestType: "SendStreamCaption",
        code: 703,
        comment: "Stream output is not active"
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

  it("filters stream caption tools when OBS does not advertise caption capability", async () => {
    const server = await FakeObsServer.start({
      availableRequestsValue: ["GetVersion", "SendStreamCaption"]
    })
    servers.push(server)
    const client = await createObsClient(configFor(server.url))
    clients.push(client)
    expect(getEnabledTools(["stream"], client.availableRequests).map((tool) => tool.name)).toEqual([
      "send_stream_caption"
    ])
  })
})
