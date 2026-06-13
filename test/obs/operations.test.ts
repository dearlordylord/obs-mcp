import { Option, Schema } from "effect"
import { afterEach, describe, expect, it } from "vitest"

import type { ObsConfig } from "../../src/config/config.js"
import {
  ProfileNameInput,
  ProfileParameterInput,
  SetProfileParameterInput,
  SetStreamServiceSettingsInput,
  SetVideoSettingsInput
} from "../../src/domain/schemas/config.js"
import { getEnabledTools } from "../../src/mcp/tools/registry.js"
import { createObsClient, type ObsClient } from "../../src/obs/client.js"
import { type ObsRequestError, ObsTimeoutError } from "../../src/obs/errors.js"
import { runObsRequestBatch } from "../../src/obs/operations/batch.js"
import { listCanvases } from "../../src/obs/operations/canvases.js"
import {
  createProfile,
  createSceneCollection,
  getProfileParameter,
  getRecordDirectory,
  getStreamServiceSettings,
  getVideoSettings,
  listProfiles,
  listSceneCollections,
  removeProfile,
  setCurrentProfile,
  setCurrentSceneCollection,
  setProfileParameter,
  setRecordDirectory,
  setStreamServiceSettings,
  setVideoSettings
} from "../../src/obs/operations/config.js"
import {
  getObsStats,
  getRecordStatus,
  getVersion,
  listHotkeys,
  triggerHotkeyByKeySequence,
  triggerHotkeyByName
} from "../../src/obs/operations/general.js"
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
import { getPersistentData, setPersistentData } from "../../src/obs/operations/persistent-data.js"
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
import { getCurrentScene, listScenes, setCurrentScene } from "../../src/obs/operations/scenes.js"
import {
  getStreamStatus,
  sendStreamCaption,
  startStream,
  stopStream,
  toggleStream
} from "../../src/obs/operations/stream.js"
import {
  getCurrentSceneTransition,
  getCurrentSceneTransitionCursor,
  listSceneTransitions,
  listTransitionKinds,
  setCurrentSceneTransition,
  setCurrentSceneTransitionDuration,
  setCurrentSceneTransitionSettings,
  setTBarPosition,
  triggerStudioModeTransition
} from "../../src/obs/operations/transitions.js"
import {
  getStudioModeEnabled,
  listMonitors,
  openInputFiltersDialog,
  openInputInteractDialog,
  openInputPropertiesDialog,
  openSourceProjector,
  openVideoMixProjector
} from "../../src/obs/operations/ui.js"
import { broadcastCustomEvent, callVendorRequest } from "../../src/obs/operations/vendor.js"
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
  requestBatch: async () => [],
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

  it("lists and triggers hotkeys through the fake OBS protocol", async () => {
    const server = await FakeObsServer.start({
      hotkeys: ["OBSBasic.StartStreaming", "OBSBasic.StopStreaming"]
    })
    servers.push(server)
    const client = await createObsClient(configFor(server.url))
    clients.push(client)
    await expect(listHotkeys(client)).resolves.toEqual({
      hotkeys: ["OBSBasic.StartStreaming", "OBSBasic.StopStreaming"]
    })
    await expect(triggerHotkeyByName(client, {
      hotkeyName: "OBSBasic.StartStreaming",
      contextName: "OBSBasic"
    })).resolves.toEqual({
      hotkeyName: "OBSBasic.StartStreaming",
      contextName: "OBSBasic",
      triggered: true
    })
    await expect(triggerHotkeyByKeySequence(client, {
      keyId: "OBS_KEY_F9",
      keyModifiers: { control: true, shift: true }
    })).resolves.toEqual({
      keyId: "OBS_KEY_F9",
      keyModifiers: { control: true, shift: true },
      triggered: true
    })
    await expect(triggerHotkeyByKeySequence(client, { keyId: "OBS_KEY_F10" })).resolves.toEqual({
      keyId: "OBS_KEY_F10",
      triggered: true
    })
    await expect(triggerHotkeyByKeySequence(client, { keyModifiers: { alt: true } })).resolves.toEqual({
      keyModifiers: { alt: true },
      triggered: true
    })
    expect(server.requests.filter((request) => request.requestType.startsWith("TriggerHotkey"))).toEqual([
      {
        requestType: "TriggerHotkeyByName",
        requestData: { hotkeyName: "OBSBasic.StartStreaming", contextName: "OBSBasic" }
      },
      {
        requestType: "TriggerHotkeyByKeySequence",
        requestData: { keyId: "OBS_KEY_F9", keyModifiers: { control: true, shift: true } }
      },
      {
        requestType: "TriggerHotkeyByKeySequence",
        requestData: { keyId: "OBS_KEY_F10" }
      },
      {
        requestType: "TriggerHotkeyByKeySequence",
        requestData: { keyModifiers: { alt: true } }
      }
    ])
  })

  it("reads config inventory through the fake OBS protocol", async () => {
    const server = await FakeObsServer.start({
      profiles: ["Untitled", "Production"],
      currentProfileName: "Production",
      sceneCollections: ["Main Scenes", "Backup Scenes"],
      currentSceneCollectionName: "Main Scenes",
      profileParameters: [{
        parameterCategory: "Output",
        parameterName: "Mode",
        parameterValue: "Advanced",
        defaultParameterValue: "Simple"
      }],
      recordDirectory: "/opaque/obs-recordings"
    })
    servers.push(server)
    const client = await createObsClient(configFor(server.url))
    clients.push(client)
    await expect(listProfiles(client)).resolves.toEqual({
      currentProfileName: "Production",
      profiles: ["Untitled", "Production"]
    })
    await expect(listSceneCollections(client)).resolves.toEqual({
      currentSceneCollectionName: "Main Scenes",
      sceneCollections: ["Main Scenes", "Backup Scenes"]
    })
    await expect(getProfileParameter(client, {
      parameterCategory: "Output",
      parameterName: "Mode"
    })).resolves.toEqual({
      parameterValue: "Advanced",
      defaultParameterValue: "Simple"
    })
    await expect(getProfileParameter(client, {
      parameterCategory: "Missing",
      parameterName: "Unset"
    })).resolves.toEqual({
      parameterValue: null,
      defaultParameterValue: null
    })
    await expect(getRecordDirectory(client)).resolves.toEqual({ recordDirectory: "/opaque/obs-recordings" })
    await expect(getVideoSettings(client)).resolves.toEqual({
      baseWidth: 1920,
      baseHeight: 1080,
      outputWidth: 1280,
      outputHeight: 720,
      fpsNumerator: 30000,
      fpsDenominator: 1001
    })
    await expect(getStreamServiceSettings(client)).resolves.toEqual({
      streamServiceType: "rtmp_custom",
      streamServiceSettings: {
        server: "rtmp://example.invalid/live",
        keyConfigured: true
      }
    })
  })

  it("mutates config state through the fake OBS protocol", async () => {
    const server = await FakeObsServer.start({
      profiles: ["Untitled", "Production"],
      currentProfileName: "Untitled",
      sceneCollections: ["Main Scenes"],
      currentSceneCollectionName: "Main Scenes",
      profileParameters: [{
        parameterCategory: "SimpleOutput",
        parameterName: "VBitrate",
        parameterValue: "2500",
        defaultParameterValue: "2500"
      }]
    })
    servers.push(server)
    const client = await createObsClient(configFor(server.url))
    clients.push(client)

    await expect(createProfile(client, { profileName: "Show" })).resolves.toEqual({
      profileName: "Show",
      created: true,
      switched: true
    })
    await expect(listProfiles(client)).resolves.toEqual({
      currentProfileName: "Show",
      profiles: ["Untitled", "Production", "Show"]
    })
    await expect(setCurrentProfile(client, { profileName: "Production" })).resolves.toEqual({
      profileName: "Production",
      switched: true
    })
    await expect(removeProfile(client, { profileName: "Production" })).resolves.toEqual({
      profileName: "Production",
      removed: true
    })
    await expect(listProfiles(client)).resolves.toEqual({
      currentProfileName: "Untitled",
      profiles: ["Untitled", "Show"]
    })

    await expect(createSceneCollection(client, { sceneCollectionName: "Event Scenes" })).resolves.toEqual({
      sceneCollectionName: "Event Scenes",
      created: true,
      switched: true
    })
    await expect(setCurrentSceneCollection(client, { sceneCollectionName: "Main Scenes" })).resolves.toEqual({
      sceneCollectionName: "Main Scenes",
      switched: true
    })
    await expect(listSceneCollections(client)).resolves.toEqual({
      currentSceneCollectionName: "Main Scenes",
      sceneCollections: ["Main Scenes", "Event Scenes"]
    })

    await expect(setProfileParameter(client, {
      parameterCategory: "SimpleOutput",
      parameterName: "VBitrate",
      parameterValue: "6000"
    })).resolves.toEqual({
      parameterCategory: "SimpleOutput",
      parameterName: "VBitrate",
      parameterValue: "6000",
      acknowledged: true
    })
    await expect(getProfileParameter(client, {
      parameterCategory: "SimpleOutput",
      parameterName: "VBitrate"
    })).resolves.toEqual({ parameterValue: "6000", defaultParameterValue: "2500" })
    await expect(setProfileParameter(client, {
      parameterCategory: "SimpleOutput",
      parameterName: "VBitrate",
      parameterValue: null
    })).resolves.toMatchObject({ parameterValue: null })
    await expect(getProfileParameter(client, {
      parameterCategory: "SimpleOutput",
      parameterName: "VBitrate"
    })).resolves.toEqual({ parameterValue: null, defaultParameterValue: "2500" })

    await expect(setRecordDirectory(client, { recordDirectory: "opaque://recordings/show" })).resolves.toEqual({
      recordDirectory: "opaque://recordings/show",
      acknowledged: true
    })
    await expect(getRecordDirectory(client)).resolves.toEqual({ recordDirectory: "opaque://recordings/show" })
    await expect(setVideoSettings(client, {
      baseWidth: 2560,
      baseHeight: 1440,
      fpsNumerator: 60,
      fpsDenominator: 1
    })).resolves.toEqual({
      baseWidth: 2560,
      baseHeight: 1440,
      fpsNumerator: 60,
      fpsDenominator: 1,
      acknowledged: true
    })
    await expect(getVideoSettings(client)).resolves.toEqual({
      baseWidth: 2560,
      baseHeight: 1440,
      outputWidth: 1280,
      outputHeight: 720,
      fpsNumerator: 60,
      fpsDenominator: 1
    })

    await expect(setStreamServiceSettings(client, {
      streamServiceType: "rtmp_custom",
      streamServiceSettings: {
        server: "rtmp://example.invalid/show",
        key: "redacted-test-key"
      }
    })).resolves.toEqual({
      streamServiceType: "rtmp_custom",
      streamServiceSettings: {
        server: "rtmp://example.invalid/show",
        keyConfigured: true
      },
      acknowledged: true
    })
    await expect(getStreamServiceSettings(client)).resolves.toEqual({
      streamServiceType: "rtmp_custom",
      streamServiceSettings: {
        server: "rtmp://example.invalid/show",
        keyConfigured: true
      }
    })
    await expect(setStreamServiceSettings(client, {
      streamServiceType: "rtmp_common",
      streamServiceSettings: {
        fields: {
          service: "Example",
          bwtest: true,
          key: "redacted-generic-key"
        }
      }
    })).resolves.toEqual({
      streamServiceType: "rtmp_common",
      streamServiceSettings: {
        fields: {
          service: "Example",
          bwtest: true
        }
      },
      acknowledged: true
    })
    await expect(getStreamServiceSettings(client)).resolves.toEqual({
      streamServiceType: "rtmp_common",
      streamServiceSettings: {
        fields: {
          service: "Example",
          bwtest: true
        }
      }
    })
  })

  it("validates config read and mutation schemas", () => {
    expect(() => Schema.decodeUnknownSync(ProfileParameterInput)({ parameterCategory: "", parameterName: "Mode" }))
      .toThrow()
    expect(() => Schema.decodeUnknownSync(ProfileParameterInput)({ parameterCategory: "Output", parameterName: "" }))
      .toThrow()
    expect(() => Schema.decodeUnknownSync(ProfileNameInput)({ profileName: "" })).toThrow()
    expect(() =>
      Schema.decodeUnknownSync(SetProfileParameterInput)({
        parameterCategory: "Output",
        parameterName: "Mode"
      })
    ).toThrow()
    expect(() => Schema.decodeUnknownSync(SetVideoSettingsInput)({ baseWidth: 1920 })).toThrow()
    expect(() => Schema.decodeUnknownSync(SetVideoSettingsInput)({ outputHeight: 720 })).toThrow()
    expect(() => Schema.decodeUnknownSync(SetVideoSettingsInput)({ fpsNumerator: 60 })).toThrow()
    expect(() => Schema.decodeUnknownSync(SetVideoSettingsInput)({ baseWidth: 4097, baseHeight: 1080 }))
      .toThrow()
    expect(() => Schema.decodeUnknownSync(SetVideoSettingsInput)({ outputWidth: 1920, outputHeight: 4097 }))
      .toThrow()
    expect(() =>
      Schema.decodeUnknownSync(SetStreamServiceSettingsInput)({
        streamServiceType: "rtmp_custom",
        streamServiceSettings: { fields: { server: "rtmp://example.invalid/live" } }
      })
    ).toThrow()
    expect(() =>
      Schema.decodeUnknownSync(SetStreamServiceSettingsInput)({
        streamServiceType: "rtmp_custom",
        streamServiceSettings: { server: "rtmp://example.invalid/live", key: "" }
      })
    ).toThrow()
  })

  it("surfaces OBS config read and mutation request failures", async () => {
    const server = await FakeObsServer.start({
      failRequests: {
        GetProfileParameter: { code: 601, comment: "Parameter category not found" },
        SetCurrentProfile: { code: 601, comment: "Profile not found" },
        SetVideoSettings: { code: 500, comment: "Video output is active" },
        SetStreamServiceSettings: { code: 500, comment: "Stream output is active" }
      }
    })
    servers.push(server)
    const client = await createObsClient({ ...configFor(server.url), enabledToolsets: ["config"] })
    clients.push(client)
    await expect(getProfileParameter(client, {
      parameterCategory: "Missing",
      parameterName: "Value"
    })).rejects.toMatchObject(
      {
        requestType: "GetProfileParameter",
        code: 601,
        comment: "Parameter category not found"
      } satisfies Partial<ObsRequestError>
    )
    await expect(setCurrentProfile(client, { profileName: "Missing" })).rejects.toMatchObject(
      {
        requestType: "SetCurrentProfile",
        code: 601,
        comment: "Profile not found"
      } satisfies Partial<ObsRequestError>
    )
    await expect(setVideoSettings(client, {
      baseWidth: 1920,
      baseHeight: 1080
    })).rejects.toMatchObject(
      {
        requestType: "SetVideoSettings",
        code: 500,
        comment: "Video output is active"
      } satisfies Partial<ObsRequestError>
    )
    await expect(setStreamServiceSettings(client, {
      streamServiceType: "rtmp_custom",
      streamServiceSettings: {
        server: "rtmp://example.invalid/live",
        key: "redacted-failure-key"
      }
    })).rejects.toMatchObject(
      {
        requestType: "SetStreamServiceSettings",
        code: 500,
        comment: "Stream output is active"
      } satisfies Partial<ObsRequestError>
    )
  })

  it("surfaces OBS hotkey trigger request failures", async () => {
    const server = await FakeObsServer.start({
      failRequests: { TriggerHotkeyByName: { code: 404, comment: "Hotkey not found" } }
    })
    servers.push(server)
    const client = await createObsClient({ ...configFor(server.url), enabledToolsets: ["general"] })
    clients.push(client)
    await expect(triggerHotkeyByName(client, { hotkeyName: "Missing" })).rejects.toMatchObject(
      {
        requestType: "TriggerHotkeyByName",
        code: 404,
        comment: "Hotkey not found"
      } satisfies Partial<ObsRequestError>
    )
  })

  it("lists canvases with stable summaries and reads studio mode state", async () => {
    const server = await FakeObsServer.start({
      canvases: [
        {
          canvasName: "Program",
          canvasUuid: "canvas-program",
          canvasIndex: 2,
          width: 1920,
          height: 1080
        },
        {
          width: 1080,
          height: 1920
        }
      ],
      studioModeEnabled: true
    })
    servers.push(server)
    const client = await createObsClient(configFor(server.url))
    clients.push(client)
    await expect(listCanvases(client)).resolves.toEqual({
      canvases: [
        { canvasIndex: 2, canvasName: "Program", canvasUuid: "canvas-program" },
        { canvasIndex: 1 }
      ]
    })
    await expect(getStudioModeEnabled(client)).resolves.toEqual({ studioModeEnabled: true })
    await expect(openInputPropertiesDialog(client, { inputName: "Camera" })).resolves.toEqual({
      requestType: "OpenInputPropertiesDialog",
      acknowledged: true
    })
    await expect(openInputFiltersDialog(client, { inputUuid: "input-camera" })).resolves.toEqual({
      requestType: "OpenInputFiltersDialog",
      acknowledged: true
    })
    await expect(openInputInteractDialog(client, { inputName: "Browser" })).resolves.toEqual({
      requestType: "OpenInputInteractDialog",
      acknowledged: true
    })
    await expect(listMonitors(client)).resolves.toEqual({
      monitors: [{
        monitorIndex: 0,
        monitorName: "Primary",
        monitorWidth: 1920,
        monitorHeight: 1080,
        monitorPositionX: 0,
        monitorPositionY: 0
      }]
    })
    await expect(openVideoMixProjector(client, {
      videoMixType: "OBS_WEBSOCKET_VIDEO_MIX_TYPE_PROGRAM",
      monitorIndex: 0
    })).resolves.toEqual({ requestType: "OpenVideoMixProjector", acknowledged: true })
    await expect(openSourceProjector(client, {
      sourceName: "Camera",
      monitorIndex: -1
    })).resolves.toEqual({ requestType: "OpenSourceProjector", acknowledged: true })
    await expect(openSourceProjector(client, {
      sourceUuid: "source-camera",
      projectorGeometry: "AdnQyw=="
    })).resolves.toEqual({ requestType: "OpenSourceProjector", acknowledged: true })
    expect(server.requests.filter((request) => request.requestType.startsWith("Open"))).toEqual([
      { requestType: "OpenInputPropertiesDialog", requestData: { inputName: "Camera" } },
      { requestType: "OpenInputFiltersDialog", requestData: { inputUuid: "input-camera" } },
      { requestType: "OpenInputInteractDialog", requestData: { inputName: "Browser" } },
      {
        requestType: "OpenVideoMixProjector",
        requestData: { videoMixType: "OBS_WEBSOCKET_VIDEO_MIX_TYPE_PROGRAM", monitorIndex: 0 }
      },
      { requestType: "OpenSourceProjector", requestData: { sourceName: "Camera", monitorIndex: -1 } },
      {
        requestType: "OpenSourceProjector",
        requestData: { sourceUuid: "source-camera", projectorGeometry: "AdnQyw==" }
      }
    ])
  })

  it("reads transition inventory without exposing settings objects", async () => {
    const server = await FakeObsServer.start({
      transitions: [
        {
          transitionName: "Fade",
          transitionUuid: "transition-fade",
          transitionKind: "fade_transition",
          transitionFixed: false,
          transitionDuration: 350,
          transitionConfigurable: true,
          transitionSettings: { color: "black" }
        },
        {
          transitionName: "Cut",
          transitionUuid: "transition-cut",
          transitionKind: "cut_transition",
          transitionFixed: true,
          transitionDuration: null,
          transitionConfigurable: false,
          transitionSettings: null
        }
      ],
      transitionCursor: 0.5
    })
    servers.push(server)
    const client = await createObsClient(configFor(server.url))
    clients.push(client)
    await expect(listTransitionKinds(client)).resolves.toEqual({
      transitionKinds: ["fade_transition", "cut_transition"]
    })
    await expect(listSceneTransitions(client)).resolves.toEqual({
      currentSceneTransitionName: "Fade",
      currentSceneTransitionUuid: "transition-fade",
      currentSceneTransitionKind: "fade_transition",
      transitions: [
        {
          transitionName: "Fade",
          transitionUuid: "transition-fade",
          transitionKind: "fade_transition",
          transitionFixed: false,
          transitionDuration: 350
        },
        {
          transitionName: "Cut",
          transitionUuid: "transition-cut",
          transitionKind: "cut_transition",
          transitionFixed: true,
          transitionDuration: null
        }
      ]
    })
    await expect(getCurrentSceneTransition(client)).resolves.toEqual({
      transitionName: "Fade",
      transitionUuid: "transition-fade",
      transitionKind: "fade_transition",
      transitionFixed: false,
      transitionDuration: 350,
      transitionConfigurable: true
    })
    await expect(getCurrentSceneTransitionCursor(client)).resolves.toEqual({ transitionCursor: 0.5 })
  })

  it("sanitizes malformed scene transition rows into stable summaries", async () => {
    const client = fakeClient(async (requestType) => {
      expect(requestType).toBe("GetSceneTransitionList")
      return {
        currentSceneTransitionName: null,
        currentSceneTransitionUuid: null,
        currentSceneTransitionKind: null,
        transitions: [
          {
            transitionName: 42,
            transitionUuid: "transition-partial",
            transitionKind: false,
            transitionFixed: "nope",
            transitionDuration: "300",
            transitionSettings: { color: "black" }
          },
          {
            transitionName: "Stinger",
            transitionKind: "stinger_transition"
          },
          {
            transitionName: "Cut",
            transitionDuration: null
          }
        ]
      }
    })
    await expect(listSceneTransitions(client)).resolves.toEqual({
      currentSceneTransitionName: null,
      currentSceneTransitionUuid: null,
      currentSceneTransitionKind: null,
      transitions: [
        { transitionUuid: "transition-partial" },
        { transitionName: "Stinger", transitionKind: "stinger_transition" },
        { transitionName: "Cut", transitionDuration: null }
      ]
    })
  })

  it("mutates transition state through the fake OBS protocol", async () => {
    const server = await FakeObsServer.start({
      transitions: [
        {
          transitionName: "Cut",
          transitionUuid: "transition-cut",
          transitionKind: "cut_transition",
          transitionFixed: true,
          transitionDuration: null,
          transitionConfigurable: false,
          transitionSettings: null
        },
        {
          transitionName: "Fade",
          transitionUuid: "transition-fade",
          transitionKind: "fade_transition",
          transitionFixed: false,
          transitionDuration: 300,
          transitionConfigurable: true,
          transitionSettings: { color: "black" }
        }
      ]
    })
    servers.push(server)
    const client = await createObsClient(configFor(server.url))
    clients.push(client)
    await expect(setCurrentSceneTransition(client, { transitionName: "Fade" })).resolves.toEqual({
      transitionName: "Fade",
      switched: true
    })
    await expect(setCurrentSceneTransitionDuration(client, { transitionDuration: 750 })).resolves.toEqual({
      transitionDuration: 750,
      acknowledged: true
    })
    await expect(setCurrentSceneTransitionSettings(client, {
      transitionSettings: { path: "left", speed: 0.5, invert: false, label: null },
      overlay: false
    })).resolves.toEqual({ overlay: false, settingsFieldCount: 4, acknowledged: true })
    await expect(triggerStudioModeTransition(client)).resolves.toEqual({
      requestType: "TriggerStudioModeTransition",
      acknowledged: true
    })
    await expect(setTBarPosition(client, { position: 0.25, release: false })).resolves.toEqual({
      position: 0.25,
      release: false,
      acknowledged: true
    })
    await expect(getCurrentSceneTransition(client)).resolves.toMatchObject({
      transitionName: "Fade",
      transitionDuration: 750
    })
    await expect(getCurrentSceneTransitionCursor(client)).resolves.toEqual({ transitionCursor: 0.25 })
    expect(
      server.requests.filter((request) =>
        request.requestType.startsWith("Set") || request.requestType.startsWith("Trigger")
      )
    )
      .toEqual([
        { requestType: "SetCurrentSceneTransition", requestData: { transitionName: "Fade" } },
        { requestType: "SetCurrentSceneTransitionDuration", requestData: { transitionDuration: 750 } },
        {
          requestType: "SetCurrentSceneTransitionSettings",
          requestData: {
            transitionSettings: { path: "left", speed: 0.5, invert: false, label: null },
            overlay: false
          }
        },
        { requestType: "TriggerStudioModeTransition" },
        { requestType: "SetTBarPosition", requestData: { position: 0.25, release: false } }
      ])
  })

  it("surfaces OBS transition mutation request failures", async () => {
    const server = await FakeObsServer.start({
      failRequests: { SetCurrentSceneTransition: { code: 404, comment: "Transition not found" } }
    })
    servers.push(server)
    const client = await createObsClient({ ...configFor(server.url), enabledToolsets: ["transitions"] })
    clients.push(client)
    await expect(setCurrentSceneTransition(client, { transitionName: "Missing" })).rejects.toMatchObject(
      {
        requestType: "SetCurrentSceneTransition",
        code: 404,
        comment: "Transition not found"
      } satisfies Partial<ObsRequestError>
    )
  })

  it("gets and sets JSON-safe OBS persistent data through fake OBS", async () => {
    const server = await FakeObsServer.start()
    servers.push(server)
    const client = await createObsClient({ ...configFor(server.url), enabledToolsets: ["admin_raw"] })
    clients.push(client)
    const locator = { realm: "OBS_WEBSOCKET_DATA_REALM_PROFILE" as const, slotName: "ralph.task8" }
    const slotValue = { count: 2, nested: [true, null, "ok"] }

    await expect(setPersistentData(client, { ...locator, slotValue })).resolves.toEqual({
      ...locator,
      updated: true
    })
    await expect(getPersistentData(client, locator)).resolves.toEqual({ ...locator, slotValue })
    expect(server.requests.filter((request) => request.requestType.includes("PersistentData"))).toEqual([
      { requestType: "SetPersistentData", requestData: { ...locator, slotValue } },
      { requestType: "GetPersistentData", requestData: locator }
    ])
  })

  it("calls vendor requests and broadcasts custom events through fake OBS", async () => {
    const server = await FakeObsServer.start()
    servers.push(server)
    const client = await createObsClient({ ...configFor(server.url), enabledToolsets: ["vendor"] })
    clients.push(client)
    const requestData = { enabled: true, count: 2, nested: { label: "ok" } }

    await expect(callVendorRequest(client, {
      vendorName: "example.vendor",
      requestType: "DoThing",
      requestData
    })).resolves.toEqual({
      vendorName: "example.vendor",
      requestType: "DoThing",
      provenance: "vendor_plugin",
      responseData: {
        accepted: true,
        echo: requestData
      }
    })
    await expect(broadcastCustomEvent(client, { eventData: { eventName: "ralph.task9", requestData } }))
      .resolves.toEqual({ provenance: "custom_event", broadcasted: true })
    expect(
      server.requests.filter((request) =>
        request.requestType === "CallVendorRequest" || request.requestType === "BroadcastCustomEvent"
      )
    ).toEqual([
      {
        requestType: "CallVendorRequest",
        requestData: { vendorName: "example.vendor", requestType: "DoThing", requestData }
      },
      { requestType: "BroadcastCustomEvent", requestData: { eventData: { eventName: "ralph.task9", requestData } } }
    ])
  })

  it("runs schema-limited OBS request batches with batch-only Sleep through fake OBS", async () => {
    const server = await FakeObsServer.start()
    servers.push(server)
    const client = await createObsClient({ ...configFor(server.url), enabledToolsets: ["batch"] })
    clients.push(client)

    await expect(runObsRequestBatch(client, {
      executionType: "serial_realtime",
      haltOnFailure: false,
      requests: [
        { kind: "set_current_scene", sceneName: "Main" },
        { kind: "sleep", sleepMillis: 5 },
        { kind: "get_current_scene" }
      ]
    })).resolves.toMatchObject({
      executionType: "serial_realtime",
      haltOnFailure: false,
      requestedRequests: 3,
      returnedResults: 3,
      results: [
        {
          index: 0,
          kind: "set_current_scene",
          requestType: "SetCurrentProgramScene",
          requestStatus: { result: true, code: 100 },
          responseData: { sceneName: "Main", switched: true }
        },
        { index: 1, kind: "sleep", requestType: "Sleep", requestStatus: { result: true, code: 100 } },
        {
          index: 2,
          kind: "get_current_scene",
          requestType: "GetCurrentProgramScene",
          requestStatus: { result: true, code: 100 },
          responseData: { sceneName: "Main", sceneUuid: "scene-main" }
        }
      ]
    })
    expect(server.requests.filter((request) =>
      request.requestType === "SetCurrentProgramScene"
      || request.requestType === "Sleep"
      || request.requestType === "GetCurrentProgramScene"
    )).toEqual([
      { requestType: "SetCurrentProgramScene", requestData: { sceneName: "Main" } },
      { requestType: "Sleep", requestData: { sleepMillis: 5 } },
      { requestType: "GetCurrentProgramScene" }
    ])
  })

  it("times out waiting for OBS request batch responses", async () => {
    const server = await FakeObsServer.start({ skipResponsesFor: ["RequestBatch"] })
    servers.push(server)
    const client = await createObsClient({
      ...configFor(server.url),
      connectionTimeoutMs: 25,
      enabledToolsets: ["batch"]
    })
    clients.push(client)

    await expect(runObsRequestBatch(client, {
      executionType: "serial_realtime",
      haltOnFailure: false,
      requests: [{ kind: "get_current_scene" }]
    })).rejects.toBeInstanceOf(ObsTimeoutError)
  })

  it("preserves OBS request batch error metadata and halt-on-failure results", async () => {
    const server = await FakeObsServer.start({
      failRequests: { SetCurrentProgramScene: { code: 600, comment: "Scene not found" } }
    })
    servers.push(server)
    const client = await createObsClient({ ...configFor(server.url), enabledToolsets: ["batch"] })
    clients.push(client)

    await expect(runObsRequestBatch(client, {
      executionType: "serial_realtime",
      haltOnFailure: true,
      requests: [
        { kind: "set_current_scene", sceneName: "Missing" },
        { kind: "get_current_scene" }
      ]
    })).resolves.toMatchObject({
      requestedRequests: 2,
      returnedResults: 1,
      results: [{
        index: 0,
        kind: "set_current_scene",
        requestType: "SetCurrentProgramScene",
        requestStatus: { result: false, code: 600, comment: "Scene not found" }
      }]
    })
  })

  it("correlates reordered OBS request batch results by request id", async () => {
    const server = await FakeObsServer.start({ reverseBatchResults: true })
    servers.push(server)
    const client = await createObsClient({ ...configFor(server.url), enabledToolsets: ["batch"] })
    clients.push(client)

    await expect(runObsRequestBatch(client, {
      executionType: "serial_realtime",
      haltOnFailure: false,
      requests: [
        { kind: "set_current_scene", sceneName: "Main" },
        { kind: "get_current_scene" }
      ]
    })).resolves.toMatchObject({
      results: [
        { index: 0, kind: "set_current_scene", requestType: "SetCurrentProgramScene" },
        { index: 1, kind: "get_current_scene", requestType: "GetCurrentProgramScene" }
      ]
    })
  })

  it("rejects OBS request batch results with mismatched request types", async () => {
    const server = await FakeObsServer.start({ mismatchFirstBatchResultType: true })
    servers.push(server)
    const client = await createObsClient({ ...configFor(server.url), enabledToolsets: ["batch"] })
    clients.push(client)

    await expect(runObsRequestBatch(client, {
      executionType: "serial_realtime",
      haltOnFailure: false,
      requests: [{ kind: "get_current_scene" }]
    })).rejects.toThrow("expected GetCurrentProgramScene")
  })

  it("ignores unrelated OBS request batch responses before the correlated response", async () => {
    const server = await FakeObsServer.start({ sendUnrelatedBatchResponseBeforeReal: true })
    servers.push(server)
    const client = await createObsClient({ ...configFor(server.url), enabledToolsets: ["batch"] })
    clients.push(client)

    await expect(runObsRequestBatch(client, {
      executionType: "serial_realtime",
      haltOnFailure: false,
      requests: [{ kind: "get_current_scene" }]
    })).resolves.toMatchObject({
      returnedResults: 1,
      results: [{ requestId: "batch-0", requestType: "GetCurrentProgramScene" }]
    })
  })

  it("runs serial-frame Sleep batches with frame counts", async () => {
    const requestedBatches: Array<Parameters<ObsClient["requestBatch"]>[0]> = []
    const client: ObsClient = {
      ...fakeClient(async () => ({})),
      requestBatch: async (batch) => {
        requestedBatches.push(batch)
        return [{
          requestType: "Sleep",
          requestId: "batch-0",
          requestStatus: { result: true, code: 100 },
          responseData: {}
        }]
      }
    }

    await expect(runObsRequestBatch(client, {
      executionType: "serial_frame",
      haltOnFailure: false,
      requests: [{ kind: "sleep", sleepFrames: 2 }]
    })).resolves.toMatchObject({
      results: [{ kind: "sleep", requestType: "Sleep", requestStatus: { result: true, code: 100 } }]
    })
    expect(requestedBatches).toEqual([{
      executionType: 1,
      haltOnFailure: false,
      requests: [{ requestType: "Sleep", requestId: "batch-0", requestData: { sleepFrames: 2 } }]
    }])
  })

  it("rejects missing, unexpected, and post-halt OBS request batch results", async () => {
    const baseClient = fakeClient(async () => ({}))
    const batchInput = {
      executionType: "serial_realtime" as const,
      haltOnFailure: false,
      requests: [{ kind: "get_current_scene" as const }]
    }
    await expect(runObsRequestBatch({
      ...baseClient,
      requestBatch: async () => [{
        requestType: "GetCurrentProgramScene",
        requestStatus: { result: true, code: 100 },
        responseData: { sceneName: "Intro", sceneUuid: "scene-intro" }
      }]
    }, batchInput)).rejects.toThrow("did not include requestId")
    await expect(runObsRequestBatch({
      ...baseClient,
      requestBatch: async () => [{
        requestType: "GetCurrentProgramScene",
        requestId: "unexpected",
        requestStatus: { result: true, code: 100 },
        responseData: { sceneName: "Intro", sceneUuid: "scene-intro" }
      }]
    }, batchInput)).rejects.toThrow("unexpected batch result")
    await expect(runObsRequestBatch({
      ...baseClient,
      requestBatch: async () => [
        {
          requestType: "GetCurrentProgramScene",
          requestId: "batch-1",
          requestStatus: { result: true, code: 100 },
          responseData: { sceneName: "Intro", sceneUuid: "scene-intro" }
        },
        {
          requestType: "SetCurrentProgramScene",
          requestId: "batch-0",
          requestStatus: { result: false, code: 600, comment: "Scene not found" },
          responseData: {}
        }
      ]
    }, {
      executionType: "serial_realtime",
      haltOnFailure: true,
      requests: [
        { kind: "set_current_scene", sceneName: "Missing" },
        { kind: "get_current_scene" }
      ]
    })).rejects.toThrow("after halt-on-failure")
    await expect(runObsRequestBatch({
      ...baseClient,
      requestBatch: async () => [
        {
          requestType: "SetCurrentProgramScene",
          requestId: "batch-0",
          requestStatus: { result: false, code: 600, comment: "Scene not found" },
          responseData: {}
        },
        {
          requestType: "GetCurrentProgramScene",
          requestId: "batch-1",
          requestStatus: { result: true, code: 100 },
          responseData: { sceneName: "Intro", sceneUuid: "scene-intro" }
        }
      ]
    }, {
      executionType: "serial_realtime",
      haltOnFailure: true,
      requests: [
        { kind: "set_current_scene", sceneName: "Missing" },
        { kind: "get_current_scene" }
      ]
    })).rejects.toThrow("after halt-on-failure")
    await expect(runObsRequestBatch({
      ...baseClient,
      requestBatch: async () => []
    }, batchInput)).rejects.toThrow("did not return batch result")
    await expect(runObsRequestBatch({
      ...baseClient,
      requestBatch: async () => [{
        requestType: "GetCurrentProgramScene",
        requestId: "batch-0",
        requestStatus: { result: true, code: 100 }
      }]
    }, batchInput)).rejects.toThrow("did not include responseData")
  })

  it("rejects duplicate explicit and generated OBS request batch ids before sending", async () => {
    let batchRequests = 0
    const client: ObsClient = {
      ...fakeClient(async () => ({})),
      requestBatch: async () => {
        batchRequests += 1
        return []
      }
    }

    await expect(runObsRequestBatch(client, {
      executionType: "serial_realtime",
      haltOnFailure: false,
      requests: [
        { kind: "get_current_scene", id: "same" },
        { kind: "sleep", id: "same", sleepMillis: 1 }
      ]
    })).rejects.toThrow("Duplicate OBS batch request id same")
    await expect(runObsRequestBatch(client, {
      executionType: "serial_realtime",
      haltOnFailure: false,
      requests: [
        { kind: "get_current_scene", id: "batch-1" },
        { kind: "sleep", sleepMillis: 1 }
      ]
    })).rejects.toThrow("Duplicate OBS batch request id batch-1")
    expect(batchRequests).toBe(0)
  })

  it("rejects request batches after the OBS client is closed", async () => {
    const server = await FakeObsServer.start()
    const client = await createObsClient({ ...configFor(server.url), enabledToolsets: ["batch"] })
    await client.close()
    await server.stop()

    await expect(runObsRequestBatch(client, {
      executionType: "serial_realtime",
      haltOnFailure: false,
      requests: [{ kind: "get_current_scene" }]
    })).rejects.toThrow("OBS websocket is closed")
  })

  it("rejects pending request batches when OBS closes the websocket", async () => {
    const server = await FakeObsServer.start({ skipResponsesFor: ["RequestBatch"] })
    const client = await createObsClient({
      ...configFor(server.url),
      connectionTimeoutMs: 300,
      enabledToolsets: ["batch"]
    })
    const pending = runObsRequestBatch(client, {
      executionType: "serial_realtime",
      haltOnFailure: false,
      requests: [{ kind: "get_current_scene" }]
    })
    await server.stop()

    await expect(pending).rejects.toThrow("OBS websocket closed")
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
