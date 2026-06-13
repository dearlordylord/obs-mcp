import { mkdtemp, rm } from "node:fs/promises"
import os from "node:os"
import path from "node:path"

import { Option, Schema } from "effect"
import { afterEach, describe, expect, it } from "vitest"

import type { ObsConfig } from "../../src/config/config.js"
import { getEnabledTools } from "../../src/mcp/tools/registry.js"
import { createObsClient, type ObsClient } from "../../src/obs/client.js"
import type { ObsRequestError } from "../../src/obs/errors.js"
import {
  createSourceFilter,
  getSourceFilter,
  getSourceFilterDefaultSettings,
  listSourceFilterKinds,
  listSourceFilters,
  removeSourceFilter,
  setSourceFilterEnabled,
  setSourceFilterIndex,
  setSourceFilterName,
  setSourceFilterSettings
} from "../../src/obs/operations/filters.js"
import { getObsStats, getRecordStatus, getVersion } from "../../src/obs/operations/general.js"
import {
  createInput,
  getInputAudioBalance,
  getInputAudioMonitorType,
  getInputAudioSyncOffset,
  getInputAudioTracks,
  getInputDefaultSettings,
  getInputDeinterlaceFieldOrder,
  getInputDeinterlaceMode,
  getInputMute,
  getInputPropertiesListPropertyItems,
  getInputSettings,
  getInputVolume,
  getMediaInputStatus,
  getSpecialInputs,
  listInputKinds,
  listInputs,
  offsetMediaInputCursor,
  pressInputPropertiesButton,
  removeInput,
  setInputAudioBalance,
  setInputAudioMonitorType,
  setInputAudioSyncOffset,
  setInputAudioTracks,
  setInputDeinterlaceFieldOrder,
  setInputDeinterlaceMode,
  setInputMute,
  setInputName,
  setInputSettings,
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
import { getCurrentScene, listScenes, setCurrentScene } from "../../src/obs/operations/scenes.js"
import { getSourceScreenshot, saveSourceScreenshot } from "../../src/obs/operations/screenshots.js"
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

  it("controls input audio tracks over the OBS protocol", async () => {
    const server = await FakeObsServer.start()
    servers.push(server)
    const client = await createObsClient({ ...configFor(server.url), enabledToolsets: ["inputs"] })
    clients.push(client)
    const inputAudioTracks = {
      track1: true,
      track2: false,
      track3: true,
      track4: false,
      track5: true,
      track6: false
    }
    const obsInputAudioTracks = {
      "1": true,
      "2": false,
      "3": true,
      "4": false,
      "5": true,
      "6": false
    }
    await expect(getInputAudioTracks(client, { inputName: "Mic/Aux" })).resolves.toEqual({
      inputAudioTracks: {
        track1: true,
        track2: true,
        track3: true,
        track4: true,
        track5: true,
        track6: true
      }
    })
    await expect(setInputAudioTracks(client, { inputName: "Mic/Aux", inputAudioTracks })).resolves.toEqual({
      inputAudioTracks,
      acknowledged: true
    })
    await expect(getInputAudioTracks(client, { inputUuid: "input-mic-aux" })).resolves.toEqual({
      inputAudioTracks
    })
    expect(server.requests.filter((request) => request.requestType.includes("InputAudioTracks"))).toEqual([
      { requestType: "GetInputAudioTracks", requestData: { inputName: "Mic/Aux" } },
      {
        requestType: "SetInputAudioTracks",
        requestData: { inputName: "Mic/Aux", inputAudioTracks: obsInputAudioTracks }
      },
      { requestType: "GetInputAudioTracks", requestData: { inputUuid: "input-mic-aux" } }
    ])
  })

  it("surfaces OBS failures for input audio track controls", async () => {
    const server = await FakeObsServer.start({
      failRequests: { SetInputAudioTracks: { code: 604, comment: "Audio tracks rejected" } }
    })
    servers.push(server)
    const client = await createObsClient({ ...configFor(server.url), enabledToolsets: ["inputs"] })
    clients.push(client)
    const invalidInputAudioTracksInput = {
      inputName: "Mic/Aux",
      inputAudioTracks: {
        track1: true,
        track2: true,
        track3: true,
        track4: true,
        track5: true,
        track6: "yes"
      }
    }
    const setInputAudioTracksUnchecked = setInputAudioTracks as (
      client: ObsClient,
      input: unknown
    ) => ReturnType<typeof setInputAudioTracks>
    await expect(setInputAudioTracksUnchecked(
      client,
      invalidInputAudioTracksInput
    )).rejects.toThrow("Expected boolean")
    await expect(setInputAudioTracks(client, {
      inputName: "Mic/Aux",
      inputAudioTracks: {
        track1: true,
        track2: false,
        track3: true,
        track4: false,
        track5: true,
        track6: false
      }
    })).rejects.toMatchObject(
      {
        requestType: "SetInputAudioTracks",
        code: 604,
        comment: "Audio tracks rejected"
      } satisfies Partial<ObsRequestError>
    )
  })

  it("controls input deinterlace mode and field order over the OBS protocol", async () => {
    const server = await FakeObsServer.start()
    servers.push(server)
    const client = await createObsClient({ ...configFor(server.url), enabledToolsets: ["inputs"] })
    clients.push(client)
    await expect(getInputDeinterlaceMode(client, { inputName: "Mic/Aux" })).resolves.toEqual({
      inputDeinterlaceMode: "OBS_DEINTERLACE_MODE_DISABLE"
    })
    await expect(setInputDeinterlaceMode(client, {
      inputName: "Mic/Aux",
      inputDeinterlaceMode: "OBS_DEINTERLACE_MODE_YADIF_2X"
    })).resolves.toEqual({
      inputDeinterlaceMode: "OBS_DEINTERLACE_MODE_YADIF_2X",
      acknowledged: true
    })
    await expect(getInputDeinterlaceMode(client, { inputUuid: "input-mic-aux" })).resolves.toEqual({
      inputDeinterlaceMode: "OBS_DEINTERLACE_MODE_YADIF_2X"
    })
    await expect(getInputDeinterlaceFieldOrder(client, { inputName: "Mic/Aux" })).resolves.toEqual({
      inputDeinterlaceFieldOrder: "OBS_DEINTERLACE_FIELD_ORDER_TOP"
    })
    await expect(setInputDeinterlaceFieldOrder(client, {
      inputUuid: "input-mic-aux",
      inputDeinterlaceFieldOrder: "OBS_DEINTERLACE_FIELD_ORDER_BOTTOM"
    })).resolves.toEqual({
      inputDeinterlaceFieldOrder: "OBS_DEINTERLACE_FIELD_ORDER_BOTTOM",
      acknowledged: true
    })
    await expect(getInputDeinterlaceFieldOrder(client, { inputName: "Mic/Aux" })).resolves.toEqual({
      inputDeinterlaceFieldOrder: "OBS_DEINTERLACE_FIELD_ORDER_BOTTOM"
    })
    expect(server.requests.filter((request) => request.requestType.includes("InputDeinterlace"))).toEqual([
      { requestType: "GetInputDeinterlaceMode", requestData: { inputName: "Mic/Aux" } },
      {
        requestType: "SetInputDeinterlaceMode",
        requestData: { inputName: "Mic/Aux", inputDeinterlaceMode: "OBS_DEINTERLACE_MODE_YADIF_2X" }
      },
      { requestType: "GetInputDeinterlaceMode", requestData: { inputUuid: "input-mic-aux" } },
      { requestType: "GetInputDeinterlaceFieldOrder", requestData: { inputName: "Mic/Aux" } },
      {
        requestType: "SetInputDeinterlaceFieldOrder",
        requestData: {
          inputUuid: "input-mic-aux",
          inputDeinterlaceFieldOrder: "OBS_DEINTERLACE_FIELD_ORDER_BOTTOM"
        }
      },
      { requestType: "GetInputDeinterlaceFieldOrder", requestData: { inputName: "Mic/Aux" } }
    ])
  })

  it("surfaces OBS failures for input deinterlace controls", async () => {
    const server = await FakeObsServer.start({
      failRequests: {
        SetInputDeinterlaceMode: { code: 605, comment: "Deinterlace mode unavailable for input" },
        SetInputDeinterlaceFieldOrder: { code: 606, comment: "Deinterlace field order unavailable for input" }
      }
    })
    servers.push(server)
    const client = await createObsClient({ ...configFor(server.url), enabledToolsets: ["inputs"] })
    clients.push(client)
    const setInputDeinterlaceModeUnchecked = setInputDeinterlaceMode as (
      client: ObsClient,
      input: unknown
    ) => ReturnType<typeof setInputDeinterlaceMode>
    const setInputDeinterlaceFieldOrderUnchecked = setInputDeinterlaceFieldOrder as (
      client: ObsClient,
      input: unknown
    ) => ReturnType<typeof setInputDeinterlaceFieldOrder>
    await expect(setInputDeinterlaceModeUnchecked(client, {
      inputName: "Mic/Aux",
      inputDeinterlaceMode: "OBS_DEINTERLACE_MODE_UNKNOWN"
    })).rejects.toThrow("Expected")
    await expect(setInputDeinterlaceFieldOrderUnchecked(client, {
      inputName: "Mic/Aux",
      inputDeinterlaceFieldOrder: "OBS_DEINTERLACE_FIELD_ORDER_UNKNOWN"
    })).rejects.toThrow("Expected")
    await expect(setInputDeinterlaceMode(client, {
      inputName: "Mic/Aux",
      inputDeinterlaceMode: "OBS_DEINTERLACE_MODE_LINEAR"
    })).rejects.toMatchObject(
      {
        requestType: "SetInputDeinterlaceMode",
        code: 605,
        comment: "Deinterlace mode unavailable for input"
      } satisfies Partial<ObsRequestError>
    )
    await expect(setInputDeinterlaceFieldOrder(client, {
      inputName: "Mic/Aux",
      inputDeinterlaceFieldOrder: "OBS_DEINTERLACE_FIELD_ORDER_TOP"
    })).rejects.toMatchObject(
      {
        requestType: "SetInputDeinterlaceFieldOrder",
        code: 606,
        comment: "Deinterlace field order unavailable for input"
      } satisfies Partial<ObsRequestError>
    )
  })

  it("reads sanitized input settings summaries over the OBS protocol", async () => {
    const server = await FakeObsServer.start()
    servers.push(server)
    const client = await createObsClient({ ...configFor(server.url), enabledToolsets: ["inputs"] })
    clients.push(client)
    await expect(getInputDefaultSettings(client, { inputKind: "wasapi_input_capture" })).resolves.toEqual({
      inputKind: "wasapi_input_capture",
      defaultInputSettings: [
        { settingName: "active", valueType: "boolean" },
        { settingName: "choices", valueType: "array" },
        { settingName: "device_id", valueType: "string" },
        { settingName: "empty_value", valueType: "null" },
        { settingName: "nested_policy", valueType: "object" },
        { settingName: "reconnect_delay_sec", valueType: "number" }
      ],
      rawSettingsDeferred: true
    })
    await expect(getInputSettings(client, { inputName: "Mic/Aux" })).resolves.toEqual({
      inputKind: "wasapi_input_capture",
      inputSettings: [
        { settingName: "device_id", valueType: "string" },
        { settingName: "muted_by_default", valueType: "boolean" },
        { settingName: "nested_policy", valueType: "object" },
        { settingName: "reconnect_delay_sec", valueType: "number" }
      ],
      rawSettingsDeferred: true
    })
    await expect(getInputPropertiesListPropertyItems(client, {
      inputUuid: "input-mic-aux",
      propertyName: "device_id"
    })).resolves.toEqual({
      propertyName: "device_id",
      propertyItems: [
        {
          itemIndex: 0,
          itemName: "Primary",
          itemValueType: "string",
          itemValuePreview: "primary-device",
          itemEnabled: true,
          fields: [
            { settingName: "itemEnabled", valueType: "boolean" },
            { settingName: "itemName", valueType: "string" },
            { settingName: "itemValue", valueType: "string" },
            { settingName: "metadata", valueType: "object" }
          ]
        },
        {
          itemIndex: 1,
          itemName: "Secondary",
          itemValueType: "number",
          itemValuePreview: "2",
          itemEnabled: false,
          fields: [
            { settingName: "itemEnabled", valueType: "boolean" },
            { settingName: "itemName", valueType: "string" },
            { settingName: "itemValue", valueType: "number" }
          ]
        },
        {
          itemIndex: 2,
          fields: [
            { settingName: "metadata", valueType: "object" }
          ]
        }
      ],
      rawPropertyItemsDeferred: true
    })
    expect(server.requests.filter((request) =>
      request.requestType === "GetInputDefaultSettings"
      || request.requestType === "GetInputSettings"
      || request.requestType === "GetInputPropertiesListPropertyItems"
    )).toEqual([
      { requestType: "GetInputDefaultSettings", requestData: { inputKind: "wasapi_input_capture" } },
      { requestType: "GetInputSettings", requestData: { inputName: "Mic/Aux" } },
      {
        requestType: "GetInputPropertiesListPropertyItems",
        requestData: { inputUuid: "input-mic-aux", propertyName: "device_id" }
      }
    ])
  })

  it("surfaces OBS failures for input settings reads", async () => {
    const server = await FakeObsServer.start({
      failRequests: { GetInputSettings: { code: 607, comment: "Input settings unavailable" } }
    })
    servers.push(server)
    const client = await createObsClient({ ...configFor(server.url), enabledToolsets: ["inputs"] })
    clients.push(client)
    await expect(getInputDefaultSettings(client, { inputKind: "" })).rejects.toThrow("Expected a non empty string")
    await expect(getInputPropertiesListPropertyItems(client, {
      inputName: "Mic/Aux",
      propertyName: ""
    })).rejects.toThrow("Expected a non empty string")
    await expect(getInputSettings(client, { inputName: "Mic/Aux" })).rejects.toMatchObject(
      {
        requestType: "GetInputSettings",
        code: 607,
        comment: "Input settings unavailable"
      } satisfies Partial<ObsRequestError>
    )
  })

  it("applies guarded input settings and presses property buttons over the OBS protocol", async () => {
    const server = await FakeObsServer.start()
    servers.push(server)
    const client = await createObsClient({ ...configFor(server.url), enabledToolsets: ["inputs"] })
    clients.push(client)
    await expect(setInputSettings(client, {
      inputName: "Media Source",
      inputSettings: {
        looping: true,
        restartOnActivate: false,
        speedPercent: 125,
        reconnectDelaySec: 10
      },
      overlay: false
    })).resolves.toEqual({
      inputSettings: {
        looping: true,
        restartOnActivate: false,
        speedPercent: 125,
        reconnectDelaySec: 10
      },
      overlay: false,
      acknowledged: true
    })
    await expect(pressInputPropertiesButton(client, {
      inputUuid: "input-mic-aux",
      propertyName: "refreshnocache"
    })).resolves.toEqual({
      propertyName: "refreshnocache",
      acknowledged: true
    })
    await expect(setInputSettings(client, {
      inputUuid: "input-mic-aux",
      inputSettings: { looping: false }
    })).resolves.toEqual({
      inputSettings: { looping: false },
      overlay: true,
      acknowledged: true
    })
    expect(server.requests.filter((request) =>
      request.requestType === "SetInputSettings"
      || request.requestType === "PressInputPropertiesButton"
    )).toEqual([
      {
        requestType: "SetInputSettings",
        requestData: {
          inputName: "Media Source",
          inputSettings: {
            looping: true,
            reconnect_delay_sec: 10,
            restart_on_activate: false,
            speed_percent: 125
          },
          overlay: false
        }
      },
      {
        requestType: "PressInputPropertiesButton",
        requestData: { inputUuid: "input-mic-aux", propertyName: "refreshnocache" }
      },
      {
        requestType: "SetInputSettings",
        requestData: {
          inputUuid: "input-mic-aux",
          inputSettings: { looping: false },
          overlay: true
        }
      }
    ])
  })

  it("surfaces OBS failures for guarded input settings mutations", async () => {
    const server = await FakeObsServer.start({
      failRequests: {
        SetInputSettings: { code: 608, comment: "Settings rejected" },
        PressInputPropertiesButton: { code: 609, comment: "Button unavailable" }
      }
    })
    servers.push(server)
    const client = await createObsClient({ ...configFor(server.url), enabledToolsets: ["inputs"] })
    clients.push(client)
    const setInputSettingsUnchecked = setInputSettings as (
      client: ObsClient,
      input: unknown
    ) => ReturnType<typeof setInputSettings>
    await expect(setInputSettingsUnchecked(client, {
      inputName: "Media Source",
      inputSettings: {}
    })).rejects.toThrow("At least one allowlisted input setting is required")
    await expect(setInputSettingsUnchecked(client, {
      inputName: "Media Source",
      inputSettings: { url: "https://example.invalid" }
    })).rejects.toThrow("At least one allowlisted input setting is required")
    await expect(pressInputPropertiesButton(client, {
      inputName: "Browser",
      propertyName: ""
    })).rejects.toThrow("Expected a non empty string")
    await expect(setInputSettings(client, {
      inputName: "Media Source",
      inputSettings: { looping: true }
    })).rejects.toMatchObject(
      {
        requestType: "SetInputSettings",
        code: 608,
        comment: "Settings rejected"
      } satisfies Partial<ObsRequestError>
    )
    await expect(pressInputPropertiesButton(client, {
      inputName: "Browser",
      propertyName: "refreshnocache"
    })).rejects.toMatchObject(
      {
        requestType: "PressInputPropertiesButton",
        code: 609,
        comment: "Button unavailable"
      } satisfies Partial<ObsRequestError>
    )
  })

  it("creates, renames, and removes inputs through the fake OBS protocol", async () => {
    const server = await FakeObsServer.start()
    servers.push(server)
    const client = await createObsClient(configFor(server.url))
    clients.push(client)
    await expect(createInput(client, {
      sceneName: "Main",
      canvasUuid: "canvas-main",
      inputName: "Media Source",
      inputKind: "ffmpeg_source",
      inputSettings: { looping: true, reconnectDelaySec: 10 },
      sceneItemEnabled: false
    })).resolves.toEqual({ inputUuid: "input-media-source", sceneItemId: 1002 })
    await expect(listInputs(client, { inputKind: "ffmpeg_source" })).resolves.toEqual({
      inputs: [{
        inputName: "Media Source",
        inputUuid: "input-media-source",
        inputKind: "ffmpeg_source",
        unversionedInputKind: "ffmpeg_source"
      }]
    })
    await expect(setInputName(client, {
      inputUuid: "input-media-source",
      newInputName: "Renamed Media"
    })).resolves.toEqual({ inputName: "Renamed Media", acknowledged: true })
    await expect(listInputs(client, { inputKind: "ffmpeg_source" })).resolves.toEqual({
      inputs: [{
        inputName: "Renamed Media",
        inputUuid: "input-media-source",
        inputKind: "ffmpeg_source",
        unversionedInputKind: "ffmpeg_source"
      }]
    })
    await expect(removeInput(client, { inputName: "Renamed Media" })).resolves.toEqual({ acknowledged: true })
    await expect(listInputs(client, { inputKind: "ffmpeg_source" })).resolves.toEqual({ inputs: [] })
    expect(server.requests.filter((request) =>
      request.requestType === "CreateInput"
      || request.requestType === "SetInputName"
      || request.requestType === "RemoveInput"
    )).toEqual([
      {
        requestType: "CreateInput",
        requestData: {
          sceneName: "Main",
          canvasUuid: "canvas-main",
          inputName: "Media Source",
          inputKind: "ffmpeg_source",
          inputSettings: { looping: true, reconnect_delay_sec: 10 },
          sceneItemEnabled: false
        }
      },
      {
        requestType: "SetInputName",
        requestData: { inputUuid: "input-media-source", newInputName: "Renamed Media" }
      },
      {
        requestType: "RemoveInput",
        requestData: { inputName: "Renamed Media" }
      }
    ])
  })

  it("surfaces OBS failures for input lifecycle controls", async () => {
    const server = await FakeObsServer.start({
      failRequests: {
        CreateInput: { code: 610, comment: "Input create rejected" },
        RemoveInput: { code: 611, comment: "Input remove rejected" },
        SetInputName: { code: 612, comment: "Input rename rejected" }
      }
    })
    servers.push(server)
    const client = await createObsClient({ ...configFor(server.url), enabledToolsets: ["inputs"] })
    clients.push(client)
    const createInputUnchecked = createInput as (client: ObsClient, input: unknown) => ReturnType<typeof createInput>
    const setInputNameUnchecked = setInputName as (client: ObsClient, input: unknown) => ReturnType<typeof setInputName>
    await expect(createInputUnchecked(client, {
      sceneName: "Main",
      inputName: "Media Source",
      inputKind: "ffmpeg_source",
      inputSettings: {}
    })).rejects.toThrow("At least one allowlisted input setting is required")
    await expect(setInputNameUnchecked(client, {
      inputName: "Media Source",
      newInputName: ""
    })).rejects.toThrow("Expected a non empty string")
    await expect(createInput(client, {
      sceneUuid: "scene-main",
      inputName: "Media Source",
      inputKind: "ffmpeg_source"
    })).rejects.toMatchObject(
      {
        requestType: "CreateInput",
        code: 610,
        comment: "Input create rejected"
      } satisfies Partial<ObsRequestError>
    )
    await expect(removeInput(client, { inputName: "Media Source" })).rejects.toMatchObject(
      {
        requestType: "RemoveInput",
        code: 611,
        comment: "Input remove rejected"
      } satisfies Partial<ObsRequestError>
    )
    await expect(setInputName(client, {
      inputName: "Media Source",
      newInputName: "Renamed Media"
    })).rejects.toMatchObject(
      {
        requestType: "SetInputName",
        code: 612,
        comment: "Input rename rejected"
      } satisfies Partial<ObsRequestError>
    )
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

  it("reads source filter discovery and settings through the fake OBS protocol", async () => {
    const server = await FakeObsServer.start()
    servers.push(server)
    const client = await createObsClient({ ...configFor(server.url), enabledToolsets: ["filters"] })
    clients.push(client)
    await expect(listSourceFilterKinds(client)).resolves.toEqual({
      sourceFilterKinds: ["color_filter_v2", "gain_filter", "mask_filter_v2"]
    })
    await expect(listSourceFilters(client, { sourceName: "Camera", canvasUuid: "canvas-main" })).resolves.toEqual({
      filters: [
        {
          filterName: "Color Correction",
          filterEnabled: true,
          filterIndex: 0,
          filterKind: "color_filter_v2",
          filterSettings: [
            { settingName: "brightness", valueType: "number" },
            { settingName: "color_multiply", valueType: "number" },
            { settingName: "nested_policy", valueType: "object" },
            { settingName: "secret_path", valueType: "string" }
          ],
          rawSettingsDeferred: true
        },
        {
          filterName: "Gain",
          filterEnabled: false,
          filterIndex: 1,
          filterKind: "gain_filter",
          filterSettings: [
            { settingName: "db", valueType: "number" },
            { settingName: "enabled_by_default", valueType: "boolean" },
            { settingName: "labels", valueType: "array" }
          ],
          rawSettingsDeferred: true
        }
      ]
    })
    await expect(getSourceFilterDefaultSettings(client, { filterKind: "color_filter_v2" })).resolves.toEqual({
      filterKind: "color_filter_v2",
      defaultFilterSettings: [
        { settingName: "brightness", valueType: "number" },
        { settingName: "color_multiply", valueType: "number" },
        { settingName: "nested_policy", valueType: "object" }
      ],
      rawSettingsDeferred: true
    })
    await expect(getSourceFilter(client, {
      sourceUuid: "source-camera",
      filterName: "Color Correction"
    })).resolves.toEqual({
      filterName: "Color Correction",
      filterEnabled: true,
      filterIndex: 0,
      filterKind: "color_filter_v2",
      filterSettings: [
        { settingName: "brightness", valueType: "number" },
        { settingName: "color_multiply", valueType: "number" },
        { settingName: "nested_policy", valueType: "object" },
        { settingName: "secret_path", valueType: "string" }
      ],
      rawSettingsDeferred: true
    })
    expect(server.requests.filter((request) => request.requestType.includes("SourceFilter"))).toEqual([
      { requestType: "GetSourceFilterKindList" },
      { requestType: "GetSourceFilterList", requestData: { sourceName: "Camera", canvasUuid: "canvas-main" } },
      { requestType: "GetSourceFilterDefaultSettings", requestData: { filterKind: "color_filter_v2" } },
      {
        requestType: "GetSourceFilter",
        requestData: { sourceUuid: "source-camera", filterName: "Color Correction" }
      }
    ])
  })

  it("mutates source filter enabled state, index, and name through fake OBS state", async () => {
    const server = await FakeObsServer.start()
    servers.push(server)
    const client = await createObsClient({ ...configFor(server.url), enabledToolsets: ["filters"] })
    clients.push(client)
    await expect(setSourceFilterEnabled(client, {
      sourceName: "Camera",
      canvasUuid: "canvas-main",
      filterName: "Color Correction",
      filterEnabled: false
    })).resolves.toEqual({ filterName: "Color Correction", filterEnabled: false, acknowledged: true })
    await expect(setSourceFilterIndex(client, {
      sourceName: "Camera",
      filterName: "Color Correction",
      filterIndex: 1
    })).resolves.toEqual({ filterName: "Color Correction", filterIndex: 1, acknowledged: true })
    await expect(setSourceFilterName(client, {
      sourceUuid: "source-camera",
      filterName: "Color Correction",
      newFilterName: "Primary Color"
    })).resolves.toEqual({ filterName: "Primary Color", acknowledged: true })
    await expect(listSourceFilters(client, { sourceUuid: "source-camera" })).resolves.toMatchObject({
      filters: [
        { filterName: "Gain", filterIndex: 0 },
        { filterName: "Primary Color", filterEnabled: false, filterIndex: 1 }
      ]
    })
    await expect(getSourceFilter(client, {
      sourceName: "Camera",
      filterName: "Primary Color"
    })).resolves.toMatchObject({
      filterName: "Primary Color",
      filterEnabled: false,
      filterIndex: 1,
      filterKind: "color_filter_v2"
    })
    expect(server.requests.filter((request) =>
      request.requestType === "SetSourceFilterEnabled"
      || request.requestType === "SetSourceFilterIndex"
      || request.requestType === "SetSourceFilterName"
    )).toEqual([
      {
        requestType: "SetSourceFilterEnabled",
        requestData: {
          sourceName: "Camera",
          canvasUuid: "canvas-main",
          filterName: "Color Correction",
          filterEnabled: false
        }
      },
      {
        requestType: "SetSourceFilterIndex",
        requestData: { sourceName: "Camera", filterName: "Color Correction", filterIndex: 1 }
      },
      {
        requestType: "SetSourceFilterName",
        requestData: { sourceUuid: "source-camera", filterName: "Color Correction", newFilterName: "Primary Color" }
      }
    ])
  })

  it("creates, updates settings, and removes source filters through fake OBS state", async () => {
    const server = await FakeObsServer.start()
    servers.push(server)
    const client = await createObsClient({ ...configFor(server.url), enabledToolsets: ["filters"] })
    clients.push(client)
    await expect(createSourceFilter(client, {
      sourceName: "Camera",
      canvasUuid: "canvas-main",
      filterName: "Boost",
      filterKind: "gain_filter",
      filterSettings: { db: 6 }
    })).resolves.toEqual({ filterName: "Boost", filterKind: "gain_filter", acknowledged: true })
    await expect(createSourceFilter(client, {
      sourceUuid: "source-camera",
      filterName: "Limiter",
      filterKind: "gain_filter"
    })).resolves.toEqual({ filterName: "Limiter", filterKind: "gain_filter", acknowledged: true })
    await expect(listSourceFilters(client, { sourceName: "Camera" })).resolves.toMatchObject({
      filters: [
        { filterName: "Color Correction", filterIndex: 0 },
        { filterName: "Gain", filterIndex: 1 },
        {
          filterName: "Boost",
          filterIndex: 2,
          filterKind: "gain_filter",
          filterSettings: [{ settingName: "db", valueType: "number" }]
        },
        {
          filterName: "Limiter",
          filterIndex: 3,
          filterKind: "gain_filter",
          filterSettings: []
        }
      ]
    })
    await expect(setSourceFilterSettings(client, {
      sourceName: "Camera",
      filterName: "Boost",
      filterSettings: { db: 3 },
      overlay: true
    })).resolves.toEqual({
      filterName: "Boost",
      filterSettings: { db: 3 },
      overlay: true,
      acknowledged: true
    })
    await expect(setSourceFilterSettings(client, {
      sourceUuid: "source-camera",
      filterName: "Limiter",
      filterSettings: { db: 2 }
    })).resolves.toEqual({
      filterName: "Limiter",
      filterSettings: { db: 2 },
      overlay: true,
      acknowledged: true
    })
    await expect(setSourceFilterSettings(client, {
      sourceName: "Camera",
      filterName: "Boost",
      filterSettings: { brightness: 0.2, hueShift: 45 },
      overlay: false
    })).resolves.toEqual({
      filterName: "Boost",
      filterSettings: { brightness: 0.2, hueShift: 45 },
      overlay: false,
      acknowledged: true
    })
    await expect(getSourceFilter(client, {
      sourceName: "Camera",
      filterName: "Boost"
    })).resolves.toMatchObject({
      filterName: "Boost",
      filterSettings: [
        { settingName: "brightness", valueType: "number" },
        { settingName: "hue_shift", valueType: "number" }
      ]
    })
    await expect(getSourceFilter(client, {
      sourceUuid: "source-camera",
      filterName: "Limiter"
    })).resolves.toMatchObject({
      filterName: "Limiter",
      filterSettings: [{ settingName: "db", valueType: "number" }]
    })
    await expect(removeSourceFilter(client, {
      sourceName: "Camera",
      filterName: "Boost"
    })).resolves.toEqual({ filterName: "Boost", acknowledged: true })
    await expect(removeSourceFilter(client, {
      sourceUuid: "source-camera",
      filterName: "Limiter"
    })).resolves.toEqual({ filterName: "Limiter", acknowledged: true })
    await expect(listSourceFilters(client, { sourceName: "Camera" })).resolves.toMatchObject({
      filters: [
        { filterName: "Color Correction", filterIndex: 0 },
        { filterName: "Gain", filterIndex: 1 }
      ]
    })
    expect(server.requests.filter((request) =>
      request.requestType === "CreateSourceFilter"
      || request.requestType === "SetSourceFilterSettings"
      || request.requestType === "RemoveSourceFilter"
    )).toEqual([
      {
        requestType: "CreateSourceFilter",
        requestData: {
          sourceName: "Camera",
          canvasUuid: "canvas-main",
          filterName: "Boost",
          filterKind: "gain_filter",
          filterSettings: { db: 6 }
        }
      },
      {
        requestType: "CreateSourceFilter",
        requestData: {
          sourceUuid: "source-camera",
          filterName: "Limiter",
          filterKind: "gain_filter"
        }
      },
      {
        requestType: "SetSourceFilterSettings",
        requestData: { sourceName: "Camera", filterName: "Boost", filterSettings: { db: 3 }, overlay: true }
      },
      {
        requestType: "SetSourceFilterSettings",
        requestData: { sourceUuid: "source-camera", filterName: "Limiter", filterSettings: { db: 2 }, overlay: true }
      },
      {
        requestType: "SetSourceFilterSettings",
        requestData: {
          sourceName: "Camera",
          filterName: "Boost",
          filterSettings: { brightness: 0.2, hue_shift: 45 },
          overlay: false
        }
      },
      {
        requestType: "RemoveSourceFilter",
        requestData: { sourceName: "Camera", filterName: "Boost" }
      },
      {
        requestType: "RemoveSourceFilter",
        requestData: { sourceUuid: "source-camera", filterName: "Limiter" }
      }
    ])
  })

  it("surfaces OBS failures for source filter reads", async () => {
    const server = await FakeObsServer.start({
      failRequests: { GetSourceFilter: { code: 602, comment: "Filter not found" } }
    })
    servers.push(server)
    const client = await createObsClient({ ...configFor(server.url), enabledToolsets: ["filters"] })
    clients.push(client)
    const getSourceFilterUnchecked = getSourceFilter as (
      client: ObsClient,
      input: unknown
    ) => ReturnType<typeof getSourceFilter>
    await expect(getSourceFilterUnchecked(client, {
      sourceName: "Camera",
      filterName: ""
    })).rejects.toThrow("Expected a non empty string")
    await expect(getSourceFilter(client, {
      sourceName: "Camera",
      filterName: "Missing"
    })).rejects.toMatchObject(
      {
        requestType: "GetSourceFilter",
        code: 602,
        comment: "Filter not found"
      } satisfies Partial<ObsRequestError>
    )
  })

  it("surfaces validation and OBS failures for source filter mutations", async () => {
    const server = await FakeObsServer.start({
      failRequests: {
        CreateSourceFilter: { code: 603, comment: "Filter create rejected" },
        RemoveSourceFilter: { code: 604, comment: "Filter remove rejected" },
        SetSourceFilterSettings: { code: 605, comment: "Filter settings rejected" },
        SetSourceFilterEnabled: { code: 606, comment: "Filter enable rejected" },
        SetSourceFilterIndex: { code: 607, comment: "Filter index rejected" },
        SetSourceFilterName: { code: 608, comment: "Filter rename rejected" }
      }
    })
    servers.push(server)
    const client = await createObsClient({ ...configFor(server.url), enabledToolsets: ["filters"] })
    clients.push(client)
    const setSourceFilterIndexUnchecked = setSourceFilterIndex as (
      client: ObsClient,
      input: unknown
    ) => ReturnType<typeof setSourceFilterIndex>
    const setSourceFilterSettingsUnchecked = setSourceFilterSettings as (
      client: ObsClient,
      input: unknown
    ) => ReturnType<typeof setSourceFilterSettings>
    const setSourceFilterNameUnchecked = setSourceFilterName as (
      client: ObsClient,
      input: unknown
    ) => ReturnType<typeof setSourceFilterName>
    await expect(setSourceFilterIndexUnchecked(client, {
      sourceName: "Camera",
      filterName: "Color Correction",
      filterIndex: -1
    })).rejects.toThrow("Expected a non-negative number")
    await expect(setSourceFilterNameUnchecked(client, {
      sourceName: "Camera",
      filterName: "",
      newFilterName: "Primary Color"
    })).rejects.toThrow("Expected a non empty string")
    await expect(setSourceFilterSettingsUnchecked(client, {
      sourceName: "Camera",
      filterName: "Color Correction",
      filterSettings: {}
    })).rejects.toThrow("At least one allowlisted filter setting is required")
    await expect(setSourceFilterSettingsUnchecked(client, {
      sourceName: "Camera",
      filterName: "Color Correction",
      filterSettings: { path: "/tmp/private" }
    })).rejects.toThrow("At least one allowlisted filter setting is required")
    await expect(createSourceFilter(client, {
      sourceName: "Camera",
      filterName: "Boost",
      filterKind: "gain_filter",
      filterSettings: { db: 3 }
    })).rejects.toMatchObject(
      {
        requestType: "CreateSourceFilter",
        code: 603,
        comment: "Filter create rejected"
      } satisfies Partial<ObsRequestError>
    )
    await expect(removeSourceFilter(client, {
      sourceName: "Camera",
      filterName: "Boost"
    })).rejects.toMatchObject(
      {
        requestType: "RemoveSourceFilter",
        code: 604,
        comment: "Filter remove rejected"
      } satisfies Partial<ObsRequestError>
    )
    await expect(setSourceFilterSettings(client, {
      sourceName: "Camera",
      filterName: "Color Correction",
      filterSettings: { db: 3 }
    })).rejects.toMatchObject(
      {
        requestType: "SetSourceFilterSettings",
        code: 605,
        comment: "Filter settings rejected"
      } satisfies Partial<ObsRequestError>
    )
    await expect(setSourceFilterEnabled(client, {
      sourceName: "Camera",
      filterName: "Color Correction",
      filterEnabled: false
    })).rejects.toMatchObject(
      {
        requestType: "SetSourceFilterEnabled",
        code: 606,
        comment: "Filter enable rejected"
      } satisfies Partial<ObsRequestError>
    )
    await expect(setSourceFilterIndex(client, {
      sourceName: "Camera",
      filterName: "Color Correction",
      filterIndex: 1
    })).rejects.toMatchObject(
      {
        requestType: "SetSourceFilterIndex",
        code: 607,
        comment: "Filter index rejected"
      } satisfies Partial<ObsRequestError>
    )
    await expect(setSourceFilterName(client, {
      sourceName: "Camera",
      filterName: "Color Correction",
      newFilterName: "Primary Color"
    })).rejects.toMatchObject(
      {
        requestType: "SetSourceFilterName",
        code: 608,
        comment: "Filter rename rejected"
      } satisfies Partial<ObsRequestError>
    )
  })

  it("gets and saves source screenshots with bounded payload and path policy", async () => {
    const server = await FakeObsServer.start()
    servers.push(server)
    const client = await createObsClient({ ...configFor(server.url), enabledToolsets: ["screenshots"] })
    clients.push(client)
    const outputDirectory = await mkdtemp(path.join(os.tmpdir(), "obs-mcp-screenshots-"))
    try {
      await expect(getSourceScreenshot(client, {
        sourceName: "Camera",
        canvasUuid: "canvas-main",
        imageFormat: "png",
        imageWidth: 320,
        imageHeight: 180,
        imageCompressionQuality: 80
      })).resolves.toEqual({
        imageFormat: "png",
        mimeType: "image/png",
        imageBytes: 5,
        maxImageBytes: 1_500_000,
        base64Data: "aW1hZ2U="
      })
      await expect(saveSourceScreenshot(client, {
        sourceUuid: "source-camera",
        imageFormat: "png",
        fileName: "camera.png",
        imageWidth: 320,
        imageHeight: 180
      }, outputDirectory)).resolves.toEqual({
        imageFilePath: path.join(outputDirectory, "camera.png"),
        imageFormat: "png",
        saved: true
      })
      await expect(saveSourceScreenshot(client, {
        sourceUuid: "source-camera",
        imageFormat: "png",
        fileName: "camera.png"
      }, undefined)).rejects.toThrow("OBS_MCP_SCREENSHOT_OUTPUT_DIR")
      await expect(saveSourceScreenshot(client, {
        sourceUuid: "source-camera",
        imageFormat: "png",
        fileName: "../camera.png"
      }, outputDirectory)).rejects.toThrow()
    } finally {
      await rm(outputDirectory, { recursive: true, force: true })
    }
    expect(server.requests.filter((request) =>
      request.requestType === "GetSourceScreenshot"
      || request.requestType === "SaveSourceScreenshot"
    )).toEqual([
      {
        requestType: "GetSourceScreenshot",
        requestData: {
          sourceName: "Camera",
          canvasUuid: "canvas-main",
          imageFormat: "png",
          imageWidth: 320,
          imageHeight: 180,
          imageCompressionQuality: 80
        }
      },
      {
        requestType: "SaveSourceScreenshot",
        requestData: {
          sourceUuid: "source-camera",
          imageFormat: "png",
          imageWidth: 320,
          imageHeight: 180,
          imageFilePath: path.join(outputDirectory, "camera.png")
        }
      }
    ])
  })

  it("validates screenshot image options and OBS screenshot MIME metadata", async () => {
    const server = await FakeObsServer.start({
      failRequests: { GetSourceScreenshot: { code: 613, comment: "Screenshot rejected" } }
    })
    servers.push(server)
    const client = await createObsClient({ ...configFor(server.url), enabledToolsets: ["screenshots"] })
    clients.push(client)
    const getSourceScreenshotUnchecked = getSourceScreenshot as (
      client: ObsClient,
      input: unknown
    ) => ReturnType<typeof getSourceScreenshot>
    await expect(getSourceScreenshotUnchecked(client, {
      sourceName: "Camera",
      imageFormat: "gif"
    })).rejects.toThrow()
    await expect(getSourceScreenshotUnchecked(client, {
      sourceName: "Camera",
      imageFormat: "png",
      imageWidth: 7
    })).rejects.toThrow()
    await expect(getSourceScreenshot(client, {
      sourceName: "Camera",
      imageFormat: "png"
    })).rejects.toMatchObject(
      {
        requestType: "GetSourceScreenshot",
        code: 613,
        comment: "Screenshot rejected"
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
