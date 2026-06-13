import { ErrorCode, McpError } from "@modelcontextprotocol/sdk/types.js"
import { JSONSchema, Option, Schema } from "effect"
import { describe, expect, it } from "vitest"

import type { ObsConfig } from "../../src/config/config.js"
import {
  CreateInputInput,
  CreateInputOutput,
  InputAudioTracksOutput,
  InputDefaultSettingsOutput,
  InputDeinterlaceFieldOrderOutput,
  InputDeinterlaceModeOutput,
  InputKindInput,
  InputLocatorInput,
  InputMutationAcknowledgedOutput,
  InputPropertiesListPropertyItemsInput,
  InputPropertiesListPropertyItemsOutput,
  InputSettingsOutput,
  ListInputKindsInput,
  MediaInputStatusOutput,
  ObsCreateInputInput,
  ObsSetInputSettingsInput,
  OffsetMediaInputCursorInput,
  PressInputPropertiesButtonInput,
  SetInputAudioBalanceInput,
  SetInputAudioMonitorTypeInput,
  SetInputAudioSyncOffsetInput,
  SetInputAudioTracksInput,
  SetInputDeinterlaceFieldOrderInput,
  SetInputDeinterlaceModeInput,
  SetInputMuteInput,
  SetInputNameInput,
  SetInputNameOutput,
  SetInputSettingsInput,
  SetInputVolumeInput,
  SetInputVolumeOutput,
  SetMediaInputCursorInput,
  TriggerMediaInputActionInput
} from "../../src/domain/schemas/inputs.js"
import {
  CreateRecordChapterInput,
  CreateRecordChapterOutput,
  SplitRecordFileOutput,
  StartRecordOutput,
  StopRecordOutput,
  ToggleRecordOutput
} from "../../src/domain/schemas/record.js"
import { SendStreamCaptionInput } from "../../src/domain/schemas/stream.js"
import { toMcpError } from "../../src/mcp/error-mapping.js"
import { allTools, executeTool, getEnabledTools } from "../../src/mcp/tools/registry.js"
import type { ToolDefinition } from "../../src/mcp/tools/registry.js"
import type { ObsClient } from "../../src/obs/client.js"
import { ObsProtocolError, ObsRequestError, ObsTimeoutError } from "../../src/obs/errors.js"
import { EventSubscription } from "../../src/obs/protocol.js"
import type { ObsRequestType } from "../../src/obs/requests.js"
import { allAvailableRequests, fakeObsClient } from "./fake-obs-client.js"

const config: ObsConfig = {
  url: "ws://localhost:4455/",
  password: Option.none(),
  connectionTimeoutMs: 300,
  enabledToolsets: ["general", "record", "scenes", "inputs"]
}

const inputToolNames = [
  "list_inputs",
  "list_input_kinds",
  "get_special_inputs",
  "get_input_mute",
  "set_input_mute",
  "toggle_input_mute",
  "get_input_volume",
  "set_input_volume",
  "get_input_audio_balance",
  "set_input_audio_balance",
  "get_input_audio_monitor_type",
  "set_input_audio_monitor_type",
  "get_input_audio_sync_offset",
  "set_input_audio_sync_offset",
  "get_input_audio_tracks",
  "set_input_audio_tracks",
  "get_input_deinterlace_mode",
  "set_input_deinterlace_mode",
  "get_input_deinterlace_field_order",
  "set_input_deinterlace_field_order",
  "get_input_default_settings",
  "get_input_settings",
  "get_input_properties_list_property_items",
  "set_input_settings",
  "press_input_properties_button",
  "create_input",
  "remove_input",
  "set_input_name",
  "get_media_input_status",
  "set_media_input_cursor",
  "offset_media_input_cursor",
  "trigger_media_input_action"
]

const deferredInputMediaToolNames: ReadonlyArray<string> = []

const inputAvailableRequests = [
  "GetInputList",
  "GetInputKindList",
  "GetSpecialInputs",
  "GetInputMute",
  "SetInputMute",
  "ToggleInputMute",
  "GetInputVolume",
  "SetInputVolume",
  "GetInputAudioBalance",
  "SetInputAudioBalance",
  "GetInputAudioMonitorType",
  "SetInputAudioMonitorType",
  "GetInputAudioSyncOffset",
  "SetInputAudioSyncOffset",
  "GetInputAudioTracks",
  "SetInputAudioTracks",
  "GetInputDeinterlaceMode",
  "SetInputDeinterlaceMode",
  "GetInputDeinterlaceFieldOrder",
  "SetInputDeinterlaceFieldOrder",
  "GetInputDefaultSettings",
  "GetInputSettings",
  "GetInputPropertiesListPropertyItems",
  "SetInputSettings",
  "PressInputPropertiesButton",
  "CreateInput",
  "RemoveInput",
  "SetInputName",
  "GetMediaInputStatus",
  "SetMediaInputCursor",
  "OffsetMediaInputCursor",
  "TriggerMediaInputAction"
] satisfies ReadonlyArray<ObsRequestType>

const client = (handler: (requestType: ObsRequestType, requestData: unknown) => Promise<unknown>): ObsClient =>
  fakeObsClient(handler, allAvailableRequests)

const clientWithData = (handler: (requestType: ObsRequestType, requestData: unknown) => Promise<unknown>): ObsClient =>
  fakeObsClient(handler, allAvailableRequests)

const toolByName = (name: string): ToolDefinition => {
  const tool = allTools.find((entry) => entry.name === name)
  if (tool === undefined) {
    throw new Error(`Expected tool to be registered: ${name}`)
  }
  return tool
}

const lifecycleToolGroups = [
  {
    name: "record",
    toolset: "record",
    disabledToolset: "stream",
    tools: [
      ["GetRecordStatus", "get_record_status"],
      ["StartRecord", "start_record"],
      ["StopRecord", "stop_record"],
      ["ToggleRecord", "toggle_record"],
      ["SplitRecordFile", "split_record_file"],
      ["CreateRecordChapter", "create_record_chapter"],
      ["PauseRecord", "pause_record"],
      ["ResumeRecord", "resume_record"],
      ["ToggleRecordPause", "toggle_record_pause"]
    ]
  },
  {
    name: "stream",
    toolset: "stream",
    disabledToolset: "record",
    tools: [
      ["GetStreamStatus", "get_stream_status"],
      ["StartStream", "start_stream"],
      ["StopStream", "stop_stream"],
      ["ToggleStream", "toggle_stream"],
      ["SendStreamCaption", "send_stream_caption"]
    ]
  },
  {
    name: "virtual camera",
    toolset: "outputs",
    disabledToolset: "stream",
    tools: [
      ["GetVirtualCamStatus", "get_virtual_cam_status"],
      ["StartVirtualCam", "start_virtual_cam"],
      ["StopVirtualCam", "stop_virtual_cam"],
      ["ToggleVirtualCam", "toggle_virtual_cam"]
    ]
  },
  {
    name: "replay buffer",
    toolset: "outputs",
    disabledToolset: "stream",
    tools: [
      ["GetReplayBufferStatus", "get_replay_buffer_status"],
      ["StartReplayBuffer", "start_replay_buffer"],
      ["StopReplayBuffer", "stop_replay_buffer"],
      ["ToggleReplayBuffer", "toggle_replay_buffer"],
      ["SaveReplayBuffer", "save_replay_buffer"],
      ["GetLastReplayBufferReplay", "get_last_replay_buffer_replay"]
    ]
  }
] as const

const lifecycleToolNames = (tools: ReadonlyArray<readonly [string, string]>): Array<string> =>
  tools.map(([, toolName]) => toolName)

const lifecycleRequestNames = (tools: ReadonlyArray<readonly [string, string]>): Array<string> =>
  tools.map(([requestName]) => requestName)

const eventClient = (events: ReturnType<ObsClient["getBufferedEvents"]>): ObsClient => ({
  negotiatedRpcVersion: 1,
  availableRequests: allAvailableRequests,
  request: async (descriptor) => Schema.decodeUnknownSync(descriptor.responseSchema)({}),
  getBufferedEvents: () => events,
  close: async () => undefined
})

describe("MCP tool registry", () => {
  it("exposes exactly the enabled tools by default", () => {
    expect(getEnabledTools(config.enabledToolsets).map((tool) => tool.name)).toEqual([
      "get_obs_context",
      "get_version",
      "get_obs_stats",
      "list_scenes",
      "get_current_scene",
      "set_current_scene",
      "list_scene_items",
      "list_group_scene_items",
      "get_scene_item_id",
      "get_scene_item_source",
      "get_scene_item_enabled",
      "set_scene_item_enabled",
      "get_scene_item_locked",
      "set_scene_item_locked",
      "get_scene_item_index",
      "get_scene_item_blend_mode",
      "set_scene_item_index",
      "set_scene_item_blend_mode",
      "get_source_active",
      ...inputToolNames,
      "get_record_status",
      "start_record",
      "stop_record",
      "toggle_record",
      "split_record_file",
      "create_record_chapter",
      "pause_record",
      "resume_record",
      "toggle_record_pause"
    ])
  })

  it("exposes input discovery tools when the input toolset is enabled", () => {
    expect(getEnabledTools(["inputs"]).map((tool) => tool.name)).toEqual(inputToolNames)
  })

  it("exposes output tools when the outputs toolset is enabled", () => {
    expect(getEnabledTools(["outputs"]).map((tool) => tool.name)).toEqual([
      "get_virtual_cam_status",
      "start_virtual_cam",
      "stop_virtual_cam",
      "toggle_virtual_cam",
      "get_replay_buffer_status",
      "start_replay_buffer",
      "stop_replay_buffer",
      "toggle_replay_buffer",
      "save_replay_buffer",
      "get_last_replay_buffer_replay"
    ])
  })

  it("exposes recent safe OBS events only when the events toolset is enabled", () => {
    expect(getEnabledTools(["events"], allAvailableRequests).map((tool) => tool.name)).toEqual([
      "get_recent_obs_events"
    ])
    expect(getEnabledTools(["scenes"], allAvailableRequests).map((tool) => tool.name))
      .not.toContain("get_recent_obs_events")
  })

  it("filters disabled categories", () => {
    expect(getEnabledTools([])).toEqual([])
    expect(getEnabledTools(["scenes"], allAvailableRequests).map((tool) => tool.name)).not.toContain(
      "get_stream_status"
    )
  })

  it("filters tools by toolset category", () => {
    expect(getEnabledTools(["general"], allAvailableRequests).map((tool) => tool.name)).toEqual([
      "get_obs_context",
      "get_version",
      "get_obs_stats"
    ])
    expect(getEnabledTools(["events"], allAvailableRequests).map((tool) => tool.name)).toEqual([
      "get_recent_obs_events"
    ])
    expect(getEnabledTools(["record"], allAvailableRequests).map((tool) => tool.name)).toEqual([
      "get_record_status",
      "start_record",
      "stop_record",
      "toggle_record",
      "split_record_file",
      "create_record_chapter",
      "pause_record",
      "resume_record",
      "toggle_record_pause"
    ])
    expect(getEnabledTools(["scenes"], allAvailableRequests).map((tool) => tool.name)).toEqual([
      "list_scenes",
      "get_current_scene",
      "set_current_scene",
      "list_scene_items",
      "list_group_scene_items",
      "get_scene_item_id",
      "get_scene_item_source",
      "get_scene_item_enabled",
      "set_scene_item_enabled",
      "get_scene_item_locked",
      "set_scene_item_locked",
      "get_scene_item_index",
      "get_scene_item_blend_mode",
      "set_scene_item_index",
      "set_scene_item_blend_mode",
      "get_source_active"
    ])
    expect(getEnabledTools(["inputs"], allAvailableRequests).map((tool) => tool.name)).toEqual(inputToolNames)
    expect(getEnabledTools(["outputs"], allAvailableRequests).map((tool) => tool.name)).toEqual([
      "get_virtual_cam_status",
      "start_virtual_cam",
      "stop_virtual_cam",
      "toggle_virtual_cam",
      "get_replay_buffer_status",
      "start_replay_buffer",
      "stop_replay_buffer",
      "toggle_replay_buffer",
      "save_replay_buffer",
      "get_last_replay_buffer_replay"
    ])
    expect(getEnabledTools(["scenes"]).map((tool) => tool.name)).not.toContain("pause_record")
    const sceneToolNames = getEnabledTools(["scenes"]).map((tool) => tool.name)
    for (const name of inputToolNames) {
      expect(sceneToolNames).not.toContain(name)
    }
    for (const name of deferredInputMediaToolNames) {
      expect(allTools.map((tool) => tool.name)).not.toContain(name)
    }
  })

  it("filters tools by negotiated OBS capabilities", () => {
    expect(getEnabledTools(["general"], ["GetVersion"]).map((tool) => tool.name)).toEqual([
      "get_obs_context",
      "get_version"
    ])
    expect(getEnabledTools(["general", "record"], ["GetStats"]).map((tool) => tool.name)).toEqual([
      "get_obs_context",
      "get_obs_stats"
    ])
    expect(
      getEnabledTools(["record"], [
        "StartRecord",
        "StopRecord",
        "ToggleRecord",
        "SplitRecordFile",
        "CreateRecordChapter",
        "PauseRecord",
        "ResumeRecord"
      ])
        .map((tool) => tool.name)
    ).toEqual([
      "start_record",
      "stop_record",
      "toggle_record",
      "split_record_file",
      "create_record_chapter",
      "pause_record",
      "resume_record"
    ])
    expect(
      getEnabledTools(["stream"], ["GetStreamStatus", "StartStream", "StopStream", "SendStreamCaption"])
        .map((tool) => tool.name)
    ).toEqual(["get_stream_status", "start_stream", "stop_stream", "send_stream_caption"])
    expect(getEnabledTools(["outputs"], ["GetVirtualCamStatus", "ToggleVirtualCam"]).map((tool) => tool.name))
      .toEqual(["get_virtual_cam_status", "toggle_virtual_cam"])
    expect(getEnabledTools(["outputs"], ["GetReplayBufferStatus", "StopReplayBuffer"]).map((tool) => tool.name))
      .toEqual(["get_replay_buffer_status", "stop_replay_buffer"])
    expect(getEnabledTools(["outputs"], ["SaveReplayBuffer", "GetLastReplayBufferReplay"]).map((tool) => tool.name))
      .toEqual(["save_replay_buffer", "get_last_replay_buffer_replay"])
  })

  it("filters unavailable input requests by negotiated OBS capabilities", () => {
    const cases = [
      {
        availableRequests: ["GetInputList"],
        expectedTools: ["list_inputs"]
      },
      {
        availableRequests: ["GetInputList", "GetInputKindList", "GetSpecialInputs", "GetInputMute"],
        expectedTools: ["list_inputs", "list_input_kinds", "get_special_inputs", "get_input_mute"]
      },
      {
        availableRequests: [
          "GetInputList",
          "GetInputKindList",
          "GetSpecialInputs",
          "GetInputMute",
          "SetInputMute",
          "ToggleInputMute",
          "GetInputVolume",
          "GetInputAudioBalance",
          "GetInputAudioSyncOffset",
          "GetInputAudioTracks",
          "GetInputDeinterlaceMode",
          "GetInputDeinterlaceFieldOrder",
          "GetInputDefaultSettings",
          "GetInputSettings",
          "GetInputPropertiesListPropertyItems",
          "SetInputSettings",
          "PressInputPropertiesButton",
          "CreateInput",
          "RemoveInput",
          "SetInputName",
          "GetMediaInputStatus",
          "SetMediaInputCursor",
          "TriggerMediaInputAction"
        ],
        expectedTools: [
          "list_inputs",
          "list_input_kinds",
          "get_special_inputs",
          "get_input_mute",
          "set_input_mute",
          "toggle_input_mute",
          "get_input_volume",
          "get_input_audio_balance",
          "get_input_audio_sync_offset",
          "get_input_audio_tracks",
          "get_input_deinterlace_mode",
          "get_input_deinterlace_field_order",
          "get_input_default_settings",
          "get_input_settings",
          "get_input_properties_list_property_items",
          "set_input_settings",
          "press_input_properties_button",
          "create_input",
          "remove_input",
          "set_input_name",
          "get_media_input_status",
          "set_media_input_cursor",
          "trigger_media_input_action"
        ]
      },
      {
        availableRequests: inputAvailableRequests,
        expectedTools: inputToolNames
      }
    ]

    for (const { availableRequests, expectedTools } of cases) {
      expect(getEnabledTools(["inputs"], availableRequests).map((tool) => tool.name)).toEqual(expectedTools)
    }
  })

  describe("lifecycle tool filtering", () => {
    it.each(lifecycleToolGroups)("filters $name tools by toolset category", ({ disabledToolset, tools, toolset }) => {
      const expectedToolNames = lifecycleToolNames(tools)
      expect(getEnabledTools([toolset], allAvailableRequests).map((tool) => tool.name))
        .toEqual(expect.arrayContaining(expectedToolNames))
      expect(getEnabledTools([disabledToolset], allAvailableRequests).map((tool) => tool.name))
        .toEqual(expect.not.arrayContaining(expectedToolNames))
    })

    it.each(lifecycleToolGroups)("filters $name tools by partial OBS capabilities", ({ tools, toolset }) => {
      const partialTools = tools.filter((_, index) => index % 2 === 0)
      expect(getEnabledTools([toolset], lifecycleRequestNames(partialTools)).map((tool) => tool.name))
        .toEqual(lifecycleToolNames(partialTools))
      expect(getEnabledTools([toolset], []).map((tool) => tool.name)).toEqual([])
    })

    it.each(lifecycleToolGroups)("maps every $name tool to its required OBS request", ({ tools, toolset }) => {
      for (const [requestName, toolName] of tools) {
        expect(getEnabledTools([toolset], [requestName]).map((tool) => tool.name)).toEqual([toolName])
      }
    })
  })

  it("keeps protocol schemas owned by each registered tool definition", () => {
    for (const tool of allTools) {
      expect(tool.inputJsonSchema).toEqual(JSONSchema.make(tool.inputSchema))
      expect(tool.outputJsonSchema).toEqual(JSONSchema.make(tool.outputSchema))
    }
  })

  it("decodes record lifecycle output schemas", () => {
    expect(Schema.decodeUnknownSync(StartRecordOutput)({ requestType: "StartRecord", acknowledged: true }))
      .toEqual({ requestType: "StartRecord", acknowledged: true })
    expect(
      Schema.decodeUnknownSync(StopRecordOutput)({
        requestType: "StopRecord",
        acknowledged: true,
        outputPath: "/opaque/obs-recording.mkv"
      })
    ).toEqual({
      requestType: "StopRecord",
      acknowledged: true,
      outputPath: "/opaque/obs-recording.mkv"
    })
    expect(Schema.decodeUnknownSync(ToggleRecordOutput)({ outputActive: true })).toEqual({ outputActive: true })
    expect(Schema.decodeUnknownSync(SplitRecordFileOutput)({ requestType: "SplitRecordFile", acknowledged: true }))
      .toEqual({ requestType: "SplitRecordFile", acknowledged: true })
    expect(() =>
      Schema.decodeUnknownSync(SplitRecordFileOutput)({ requestType: "CreateRecordChapter", acknowledged: true })
    ).toThrow()
    expect(
      Schema.decodeUnknownSync(CreateRecordChapterOutput)({
        requestType: "CreateRecordChapter",
        acknowledged: true
      })
    ).toEqual({ requestType: "CreateRecordChapter", acknowledged: true })
    expect(() =>
      Schema.decodeUnknownSync(StopRecordOutput)({
        requestType: "StopRecord",
        acknowledged: true
      })
    ).toThrow()
  })

  it("validates record chapter input schemas", () => {
    expect(Schema.decodeUnknownSync(CreateRecordChapterInput)({})).toEqual({})
    expect(Schema.decodeUnknownSync(CreateRecordChapterInput)({ chapterName: "Act 1" }))
      .toEqual({ chapterName: "Act 1" })
    expect(() => Schema.decodeUnknownSync(CreateRecordChapterInput)({ chapterName: "" })).toThrow()
  })

  it("validates stream caption input schemas", () => {
    expect(Schema.decodeUnknownSync(SendStreamCaptionInput)({ captionText: "Live caption" }))
      .toEqual({ captionText: "Live caption" })
    expect(() => Schema.decodeUnknownSync(SendStreamCaptionInput)({ captionText: "" })).toThrow()
  })

  it("accepts no-arg tools with empty or missing args", async () => {
    const output = await executeTool(toolByName("get_obs_context"), undefined, {
      config,
      client: fakeObsClient(async () => ({}))
    })
    expect(output).toMatchObject({ transport: "stdio" })
  })

  it("uses default list_scenes args", async () => {
    const output = await executeTool(toolByName("list_scenes"), {}, {
      config,
      client: fakeObsClient(async () => ({
        currentProgramSceneName: "Intro",
        currentProgramSceneUuid: "scene-intro",
        currentPreviewSceneName: null,
        currentPreviewSceneUuid: null,
        scenes: [{ sceneName: "Intro", sceneUuid: "scene-intro", sceneIndex: 0, isGroup: true }]
      }))
    })
    expect(output).toMatchObject({ scenes: [{ sceneName: "Intro" }] })
  })

  it("executes get_version, get_obs_stats, get_current_scene, and get_record_status handlers", async () => {
    const versionTool = toolByName("get_version")
    const statsTool = toolByName("get_obs_stats")
    const currentTool = toolByName("get_current_scene")
    const recordTool = toolByName("get_record_status")
    const fakeClient = fakeObsClient(async (requestType) => {
      if (requestType === "GetVersion") {
        return {
          obsVersion: "31.0.0",
          obsWebSocketVersion: "5.6.0",
          rpcVersion: 1,
          availableRequests: [],
          supportedImageFormats: []
        }
      }
      if (requestType === "GetStats") {
        return {
          cpuUsage: 4,
          memoryUsage: 256,
          availableDiskSpace: 4096,
          activeFps: 30,
          averageFrameRenderTime: 2,
          renderSkippedFrames: 1,
          renderTotalFrames: 100,
          outputSkippedFrames: 2,
          outputTotalFrames: 90,
          webSocketSessionIncomingMessages: 3,
          webSocketSessionOutgoingMessages: 4
        }
      }
      if (requestType === "GetRecordStatus") {
        return {
          outputActive: false,
          outputPaused: false,
          outputTimecode: "00:00:00.000",
          outputDuration: 0,
          outputBytes: 0
        }
      }
      return { sceneName: "Intro", sceneUuid: "scene-intro" }
    })
    await expect(executeTool(versionTool, {}, { config, client: fakeClient }))
      .resolves.toMatchObject({ negotiatedRpcVersion: 1 })
    await expect(executeTool(statsTool, {}, { config, client: fakeClient }))
      .resolves.toMatchObject({ activeFps: 30, outputTotalFrames: 90 })
    await expect(executeTool(currentTool, {}, { config, client: fakeClient }))
      .resolves.toEqual({ sceneName: "Intro", sceneUuid: "scene-intro" })
    await expect(executeTool(recordTool, {}, { config, client: fakeClient }))
      .resolves.toEqual({
        outputActive: false,
        outputPaused: false,
        outputTimecode: "00:00:00.000",
        outputDuration: 0,
        outputBytes: 0
      })
  })

  it("executes input discovery handlers with structured output", async () => {
    const output = await executeTool(toolByName("list_inputs"), { inputKind: "wasapi_input_capture" }, {
      config: { ...config, enabledToolsets: ["inputs"] },
      client: {
        ...fakeObsClient(async () => ({ inputs: [] })),
        request: async (descriptor, requestData) => {
          expect(descriptor.requestType).toBe("GetInputList")
          expect(requestData).toEqual({ inputKind: "wasapi_input_capture" })
          return Schema.decodeUnknownSync(descriptor.responseSchema)({
            inputs: [{
              inputName: "Mic/Aux",
              inputUuid: "input-mic-aux",
              inputKind: "wasapi_input_capture",
              unversionedInputKind: "wasapi_input_capture"
            }]
          })
        }
      }
    })
    expect(output).toEqual({
      inputs: [{
        inputName: "Mic/Aux",
        inputUuid: "input-mic-aux",
        inputKind: "wasapi_input_capture",
        unversionedInputKind: "wasapi_input_capture"
      }]
    })
  })

  it("passes optional unversioned input-kind behavior through to OBS", async () => {
    const output = await executeTool(toolByName("list_input_kinds"), { unversioned: true }, {
      config: { ...config, enabledToolsets: ["inputs"] },
      client: {
        ...fakeObsClient(async () => ({ inputKinds: ["wasapi_input_capture"] })),
        request: async (descriptor, requestData) => {
          expect(descriptor.requestType).toBe("GetInputKindList")
          expect(requestData).toEqual({ unversioned: true })
          return Schema.decodeUnknownSync(descriptor.responseSchema)({ inputKinds: ["wasapi_input_capture"] })
        }
      }
    })
    expect(output).toEqual({ inputKinds: ["wasapi_input_capture"] })
  })

  it("enforces input locator exactly-one boundary and input-kind defaults", () => {
    const validCases = [
      { decode: Schema.decodeUnknownSync(InputLocatorInput), input: { inputName: "Mic/Aux" } },
      { decode: Schema.decodeUnknownSync(InputLocatorInput), input: { inputUuid: "input-mic-aux" } },
      {
        decode: Schema.decodeUnknownSync(SetInputMuteInput),
        input: { inputUuid: "input-mic-aux", inputMuted: true }
      },
      {
        decode: Schema.decodeUnknownSync(SetInputVolumeInput),
        input: { inputName: "Mic/Aux", inputVolumeMul: 0 }
      },
      {
        decode: Schema.decodeUnknownSync(SetInputVolumeInput),
        input: { inputUuid: "input-mic-aux", inputVolumeDb: -100 }
      },
      {
        decode: Schema.decodeUnknownSync(SetInputAudioBalanceInput),
        input: { inputName: "Mic/Aux", inputAudioBalance: 1 }
      },
      {
        decode: Schema.decodeUnknownSync(SetInputAudioMonitorTypeInput),
        input: { inputUuid: "input-mic-aux", monitorType: "OBS_MONITORING_TYPE_MONITOR_ONLY" }
      },
      {
        decode: Schema.decodeUnknownSync(SetInputAudioSyncOffsetInput),
        input: { inputName: "Mic/Aux", inputAudioSyncOffset: -950 }
      },
      {
        decode: Schema.decodeUnknownSync(SetInputAudioSyncOffsetInput),
        input: { inputName: "Mic/Aux", inputAudioSyncOffset: 0 }
      },
      {
        decode: Schema.decodeUnknownSync(SetInputAudioSyncOffsetInput),
        input: { inputUuid: "input-mic-aux", inputAudioSyncOffset: 20000 }
      },
      {
        decode: Schema.decodeUnknownSync(InputAudioTracksOutput),
        input: {
          inputAudioTracks: {
            track1: true,
            track2: false,
            track3: true,
            track4: false,
            track5: true,
            track6: false
          }
        }
      },
      {
        decode: Schema.decodeUnknownSync(SetInputAudioTracksInput),
        input: {
          inputName: "Mic/Aux",
          inputAudioTracks: {
            track1: true,
            track2: false,
            track3: true,
            track4: false,
            track5: true,
            track6: false
          }
        }
      },
      {
        decode: Schema.decodeUnknownSync(InputDeinterlaceModeOutput),
        input: { inputDeinterlaceMode: "OBS_DEINTERLACE_MODE_YADIF_2X" }
      },
      {
        decode: Schema.decodeUnknownSync(SetInputDeinterlaceModeInput),
        input: { inputName: "Mic/Aux", inputDeinterlaceMode: "OBS_DEINTERLACE_MODE_BLEND" }
      },
      {
        decode: Schema.decodeUnknownSync(InputDeinterlaceFieldOrderOutput),
        input: { inputDeinterlaceFieldOrder: "OBS_DEINTERLACE_FIELD_ORDER_BOTTOM" }
      },
      {
        decode: Schema.decodeUnknownSync(SetInputDeinterlaceFieldOrderInput),
        input: { inputUuid: "input-mic-aux", inputDeinterlaceFieldOrder: "OBS_DEINTERLACE_FIELD_ORDER_TOP" }
      },
      {
        decode: Schema.decodeUnknownSync(InputKindInput),
        input: { inputKind: "wasapi_input_capture" }
      },
      {
        decode: Schema.decodeUnknownSync(InputDefaultSettingsOutput),
        input: {
          inputKind: "wasapi_input_capture",
          defaultInputSettings: [
            { settingName: "device_id", valueType: "string", valuePreview: "mic" },
            { settingName: "nested_policy", valueType: "object" }
          ],
          rawSettingsDeferred: true
        }
      },
      {
        decode: Schema.decodeUnknownSync(InputSettingsOutput),
        input: {
          inputKind: "wasapi_input_capture",
          inputSettings: [{ settingName: "active", valueType: "boolean", valuePreview: "true" }],
          rawSettingsDeferred: true
        }
      },
      {
        decode: Schema.decodeUnknownSync(InputPropertiesListPropertyItemsInput),
        input: { inputName: "Mic/Aux", propertyName: "device_id" }
      },
      {
        decode: Schema.decodeUnknownSync(InputPropertiesListPropertyItemsOutput),
        input: {
          propertyName: "device_id",
          propertyItems: [{
            itemIndex: 0,
            itemName: "Primary",
            itemValueType: "string",
            itemValuePreview: "primary-device",
            itemEnabled: true,
            fields: [{ settingName: "itemValue", valueType: "string", valuePreview: "primary-device" }]
          }],
          rawPropertyItemsDeferred: true
        }
      },
      {
        decode: Schema.decodeUnknownSync(SetInputSettingsInput),
        input: {
          inputName: "Media Source",
          inputSettings: {
            isLocalFile: true,
            looping: false,
            restartOnActivate: true,
            closeWhenInactive: false,
            clearOnMediaEnd: true,
            hwDecode: false,
            speedPercent: 100,
            reconnectDelaySec: 5
          }
        }
      },
      {
        decode: Schema.decodeUnknownSync(PressInputPropertiesButtonInput),
        input: { inputUuid: "input-browser", propertyName: "refreshnocache" }
      },
      {
        decode: Schema.decodeUnknownSync(CreateInputInput),
        input: {
          sceneName: "Main",
          inputName: "Media Source",
          inputKind: "ffmpeg_source",
          inputSettings: { looping: true }
        }
      },
      {
        decode: Schema.decodeUnknownSync(CreateInputOutput),
        input: { inputUuid: "input-media-source", sceneItemId: 3 }
      },
      {
        decode: Schema.decodeUnknownSync(InputMutationAcknowledgedOutput),
        input: { acknowledged: true }
      },
      {
        decode: Schema.decodeUnknownSync(SetInputNameInput),
        input: { inputUuid: "input-media-source", newInputName: "Renamed Media" }
      },
      {
        decode: Schema.decodeUnknownSync(SetInputNameOutput),
        input: { inputName: "Renamed Media", acknowledged: true }
      },
      {
        decode: Schema.decodeUnknownSync(MediaInputStatusOutput),
        input: { mediaState: "OBS_MEDIA_STATE_STOPPED", mediaDuration: null, mediaCursor: null }
      },
      {
        decode: Schema.decodeUnknownSync(MediaInputStatusOutput),
        input: { mediaState: "OBS_MEDIA_STATE_PLAYING", mediaDuration: 120000, mediaCursor: 4500 }
      },
      {
        decode: Schema.decodeUnknownSync(SetMediaInputCursorInput),
        input: { inputName: "Media Source", mediaCursor: 0 }
      },
      {
        decode: Schema.decodeUnknownSync(OffsetMediaInputCursorInput),
        input: { inputUuid: "input-media-source", mediaCursorOffset: -500 }
      },
      {
        decode: Schema.decodeUnknownSync(TriggerMediaInputActionInput),
        input: { inputName: "Media Source", mediaAction: "OBS_WEBSOCKET_MEDIA_INPUT_ACTION_PLAY" }
      }
    ]

    for (const { decode, input } of validCases) {
      expect(decode(input)).toEqual(input)
    }
    expect(
      Schema.decodeUnknownSync(ObsSetInputSettingsInput)({
        inputName: "Media Source",
        inputSettings: { looping: true }
      })
    ).toEqual({
      inputName: "Media Source",
      inputSettings: { looping: true },
      overlay: true
    })
    expect(
      Schema.decodeUnknownSync(ObsCreateInputInput)({
        sceneName: "Main",
        inputName: "Media Source",
        inputKind: "ffmpeg_source",
        inputSettings: { looping: true }
      })
    ).toEqual({
      sceneName: "Main",
      inputName: "Media Source",
      inputKind: "ffmpeg_source",
      inputSettings: { looping: true },
      sceneItemEnabled: true
    })
    expect(Schema.decodeUnknownSync(ListInputKindsInput)({})).toEqual({ unversioned: false })
    const duplicateLocator = { inputName: "Mic/Aux", inputUuid: "input-mic-aux" }
    const locatorCases = [
      { decode: Schema.decodeUnknownSync(InputLocatorInput), extra: {} },
      { decode: Schema.decodeUnknownSync(SetInputMuteInput), extra: { inputMuted: false } },
      { decode: Schema.decodeUnknownSync(SetInputVolumeInput), extra: { inputVolumeMul: 1 } },
      { decode: Schema.decodeUnknownSync(SetInputAudioBalanceInput), extra: { inputAudioBalance: 0.5 } },
      {
        decode: Schema.decodeUnknownSync(SetInputAudioMonitorTypeInput),
        extra: { monitorType: "OBS_MONITORING_TYPE_NONE" }
      },
      { decode: Schema.decodeUnknownSync(SetInputAudioSyncOffsetInput), extra: { inputAudioSyncOffset: 0 } },
      {
        decode: Schema.decodeUnknownSync(SetInputAudioTracksInput),
        extra: {
          inputAudioTracks: {
            track1: true,
            track2: false,
            track3: true,
            track4: false,
            track5: true,
            track6: false
          }
        }
      },
      {
        decode: Schema.decodeUnknownSync(SetInputDeinterlaceModeInput),
        extra: { inputDeinterlaceMode: "OBS_DEINTERLACE_MODE_DISABLE" }
      },
      {
        decode: Schema.decodeUnknownSync(SetInputDeinterlaceFieldOrderInput),
        extra: { inputDeinterlaceFieldOrder: "OBS_DEINTERLACE_FIELD_ORDER_TOP" }
      },
      { decode: Schema.decodeUnknownSync(InputPropertiesListPropertyItemsInput), extra: { propertyName: "device_id" } },
      { decode: Schema.decodeUnknownSync(SetInputSettingsInput), extra: { inputSettings: { looping: true } } },
      { decode: Schema.decodeUnknownSync(PressInputPropertiesButtonInput), extra: { propertyName: "refreshnocache" } },
      { decode: Schema.decodeUnknownSync(SetInputNameInput), extra: { newInputName: "Renamed Media" } },
      { decode: Schema.decodeUnknownSync(SetMediaInputCursorInput), extra: { mediaCursor: 1 } },
      { decode: Schema.decodeUnknownSync(OffsetMediaInputCursorInput), extra: { mediaCursorOffset: 1 } },
      {
        decode: Schema.decodeUnknownSync(TriggerMediaInputActionInput),
        extra: { mediaAction: "OBS_WEBSOCKET_MEDIA_INPUT_ACTION_PLAY" }
      }
    ]

    for (const { decode, extra } of locatorCases) {
      expect(() => decode(extra)).toThrow("Exactly one")
      expect(() => decode({ ...duplicateLocator, ...extra })).toThrow("Exactly one")
    }

    const invalidCases = [
      {
        decode: Schema.decodeUnknownSync(SetInputVolumeInput),
        input: { inputName: "Mic/Aux" },
        message: "Exactly one"
      },
      {
        decode: Schema.decodeUnknownSync(SetInputVolumeInput),
        input: { inputName: "Mic/Aux", inputVolumeMul: 1, inputVolumeDb: 0 },
        message: "Exactly one"
      },
      {
        decode: Schema.decodeUnknownSync(SetInputVolumeInput),
        input: { inputName: "Mic/Aux", inputVolumeMul: 21 },
        message: "Expected a number less than or equal to 20"
      },
      {
        decode: Schema.decodeUnknownSync(SetInputVolumeInput),
        input: { inputName: "Mic/Aux", inputVolumeDb: -101 },
        message: "Expected a number greater than or equal to -100"
      },
      {
        decode: Schema.decodeUnknownSync(SetInputAudioBalanceInput),
        input: { inputName: "Mic/Aux", inputAudioBalance: -0.1 },
        message: "Expected a non-negative number"
      },
      {
        decode: Schema.decodeUnknownSync(SetInputAudioBalanceInput),
        input: { inputName: "Mic/Aux", inputAudioBalance: 1.1 },
        message: "Expected a number less than or equal to 1"
      },
      {
        decode: Schema.decodeUnknownSync(SetInputAudioSyncOffsetInput),
        input: { inputName: "Mic/Aux", inputAudioSyncOffset: 1.5 },
        message: "Expected an integer"
      },
      {
        decode: Schema.decodeUnknownSync(SetInputAudioTracksInput),
        input: {
          inputName: "Mic/Aux",
          inputAudioTracks: {
            track1: true,
            track2: false,
            track3: true,
            track4: false,
            track5: true
          }
        },
        message: "is missing"
      },
      {
        decode: Schema.decodeUnknownSync(SetInputAudioTracksInput),
        input: {
          inputName: "Mic/Aux",
          inputAudioTracks: {
            track1: true,
            track2: false,
            track3: true,
            track4: false,
            track5: true,
            track6: 1
          }
        },
        message: "Expected boolean"
      },
      {
        decode: Schema.decodeUnknownSync(SetInputDeinterlaceModeInput),
        input: { inputName: "Mic/Aux", inputDeinterlaceMode: "OBS_DEINTERLACE_MODE_UNKNOWN" },
        message: "Expected"
      },
      {
        decode: Schema.decodeUnknownSync(SetInputDeinterlaceFieldOrderInput),
        input: { inputName: "Mic/Aux", inputDeinterlaceFieldOrder: "OBS_DEINTERLACE_FIELD_ORDER_UNKNOWN" },
        message: "Expected"
      },
      {
        decode: Schema.decodeUnknownSync(InputKindInput),
        input: { inputKind: "" },
        message: "Expected a non empty string"
      },
      {
        decode: Schema.decodeUnknownSync(InputPropertiesListPropertyItemsInput),
        input: { inputName: "Mic/Aux", propertyName: "" },
        message: "Expected a non empty string"
      },
      {
        decode: Schema.decodeUnknownSync(InputDefaultSettingsOutput),
        input: {
          inputKind: "wasapi_input_capture",
          defaultInputSettings: [{ settingName: "device_id", valueType: "raw", valuePreview: "mic" }],
          rawSettingsDeferred: true
        },
        message: "Expected"
      },
      {
        decode: Schema.decodeUnknownSync(SetInputSettingsInput),
        input: { inputName: "Media Source", inputSettings: {} },
        message: "At least one allowlisted input setting is required"
      },
      {
        decode: Schema.decodeUnknownSync(SetInputSettingsInput),
        input: { inputName: "Media Source", inputSettings: { speedPercent: 0 } },
        message: "Expected a number greater than or equal to 1"
      },
      {
        decode: Schema.decodeUnknownSync(SetInputSettingsInput),
        input: { inputName: "Media Source", inputSettings: { reconnectDelaySec: 301 } },
        message: "Expected a number less than or equal to 300"
      },
      {
        decode: Schema.decodeUnknownSync(PressInputPropertiesButtonInput),
        input: { inputName: "Browser", propertyName: "" },
        message: "Expected a non empty string"
      },
      {
        decode: Schema.decodeUnknownSync(SetInputVolumeOutput),
        input: { inputVolumeMul: 1, inputVolumeDb: 0, acknowledged: true },
        message: "Exactly one of inputVolumeMul or inputVolumeDb is required"
      },
      {
        decode: Schema.decodeUnknownSync(CreateInputInput),
        input: { sceneName: "Main", inputName: "", inputKind: "ffmpeg_source" },
        message: "Expected a non empty string"
      },
      {
        decode: Schema.decodeUnknownSync(CreateInputInput),
        input: { sceneName: "Main", inputName: "Media Source", inputKind: "ffmpeg_source", inputSettings: {} },
        message: "At least one allowlisted input setting is required"
      },
      {
        decode: Schema.decodeUnknownSync(SetInputNameInput),
        input: { inputName: "Media Source", newInputName: "" },
        message: "Expected a non empty string"
      },
      {
        decode: Schema.decodeUnknownSync(SetMediaInputCursorInput),
        input: { inputName: "Media Source", mediaCursor: -1 },
        message: "Expected a non-negative number"
      }
    ]

    for (const { decode, input, message } of invalidCases) {
      expect(() => decode(input)).toThrow(message)
    }
  })

  it("executes get_special_inputs handler", async () => {
    const output = await executeTool(toolByName("get_special_inputs"), {}, {
      config: { ...config, enabledToolsets: ["inputs"] },
      client: fakeObsClient(async () => ({
        desktop1: "Desktop Audio",
        desktop2: null,
        mic1: "Mic/Aux",
        mic2: null,
        mic3: null,
        mic4: null
      }))
    })
    expect(output).toMatchObject({ desktop1: "Desktop Audio", mic1: "Mic/Aux" })
  })

  it("executes input and media control handlers with structured output", async () => {
    const inputConfig: ObsConfig = { ...config, enabledToolsets: ["inputs"] }
    const responses: Partial<Record<ObsRequestType, unknown>> = {
      GetInputMute: { inputMuted: false },
      ToggleInputMute: { inputMuted: true },
      GetInputVolume: { inputVolumeMul: 1, inputVolumeDb: 0 },
      GetInputAudioBalance: { inputAudioBalance: 0.5 },
      GetInputAudioMonitorType: { monitorType: "OBS_MONITORING_TYPE_NONE" },
      GetInputAudioSyncOffset: { inputAudioSyncOffset: 0 },
      GetInputAudioTracks: {
        inputAudioTracks: {
          "1": true,
          "2": false,
          "3": true,
          "4": false,
          "5": true,
          "6": false
        }
      },
      GetInputDeinterlaceMode: { inputDeinterlaceMode: "OBS_DEINTERLACE_MODE_DISABLE" },
      GetInputDeinterlaceFieldOrder: { inputDeinterlaceFieldOrder: "OBS_DEINTERLACE_FIELD_ORDER_TOP" },
      GetInputDefaultSettings: {
        defaultInputSettings: {
          active: true,
          device_id: "default-device",
          nested_policy: { omitted: true }
        }
      },
      GetInputSettings: {
        inputKind: "wasapi_input_capture",
        inputSettings: {
          device_id: "mic-device",
          nested_policy: { omitted: true },
          unsupported: undefined
        }
      },
      GetInputPropertiesListPropertyItems: {
        propertyItems: [
          { itemName: "Primary", itemValue: "primary-device", itemEnabled: true, metadata: { omitted: true } }
        ]
      },
      CreateInput: { inputUuid: "input-media-source", sceneItemId: 3 },
      GetMediaInputStatus: { mediaState: "OBS_MEDIA_STATE_PLAYING", mediaDuration: 120000, mediaCursor: 4500 }
    }
    const fakeClient = fakeObsClient(async (requestType) => responses[requestType] ?? {})
    const cases = [
      {
        toolName: "get_input_mute",
        input: { inputName: "Mic/Aux" },
        expected: { inputMuted: false }
      },
      {
        toolName: "set_input_mute",
        input: { inputName: "Mic/Aux", inputMuted: true },
        expected: { inputMuted: true }
      },
      {
        toolName: "toggle_input_mute",
        input: { inputName: "Mic/Aux" },
        expected: { inputMuted: true }
      },
      {
        toolName: "get_input_volume",
        input: { inputName: "Mic/Aux" },
        expected: { inputVolumeMul: 1, inputVolumeDb: 0 }
      },
      {
        toolName: "set_input_volume",
        input: { inputName: "Mic/Aux", inputVolumeMul: 0.5 },
        expected: { inputVolumeMul: 0.5, acknowledged: true }
      },
      {
        toolName: "get_input_audio_balance",
        input: { inputName: "Mic/Aux" },
        expected: { inputAudioBalance: 0.5 }
      },
      {
        toolName: "set_input_audio_balance",
        input: { inputName: "Mic/Aux", inputAudioBalance: 0.75 },
        expected: { inputAudioBalance: 0.75, acknowledged: true }
      },
      {
        toolName: "get_input_audio_monitor_type",
        input: { inputName: "Mic/Aux" },
        expected: { monitorType: "OBS_MONITORING_TYPE_NONE" }
      },
      {
        toolName: "set_input_audio_monitor_type",
        input: { inputName: "Mic/Aux", monitorType: "OBS_MONITORING_TYPE_MONITOR_ONLY" },
        expected: { monitorType: "OBS_MONITORING_TYPE_MONITOR_ONLY", acknowledged: true }
      },
      {
        toolName: "get_input_audio_sync_offset",
        input: { inputName: "Mic/Aux" },
        expected: { inputAudioSyncOffset: 0 }
      },
      {
        toolName: "set_input_audio_sync_offset",
        input: { inputName: "Mic/Aux", inputAudioSyncOffset: -250 },
        expected: { inputAudioSyncOffset: -250, acknowledged: true }
      },
      {
        toolName: "get_input_audio_tracks",
        input: { inputName: "Mic/Aux" },
        expected: {
          inputAudioTracks: {
            track1: true,
            track2: false,
            track3: true,
            track4: false,
            track5: true,
            track6: false
          }
        }
      },
      {
        toolName: "set_input_audio_tracks",
        input: {
          inputName: "Mic/Aux",
          inputAudioTracks: {
            track1: true,
            track2: false,
            track3: true,
            track4: false,
            track5: true,
            track6: false
          }
        },
        expected: {
          inputAudioTracks: {
            track1: true,
            track2: false,
            track3: true,
            track4: false,
            track5: true,
            track6: false
          },
          acknowledged: true
        }
      },
      {
        toolName: "get_input_deinterlace_mode",
        input: { inputName: "Mic/Aux" },
        expected: { inputDeinterlaceMode: "OBS_DEINTERLACE_MODE_DISABLE" }
      },
      {
        toolName: "set_input_deinterlace_mode",
        input: { inputName: "Mic/Aux", inputDeinterlaceMode: "OBS_DEINTERLACE_MODE_LINEAR_2X" },
        expected: { inputDeinterlaceMode: "OBS_DEINTERLACE_MODE_LINEAR_2X", acknowledged: true }
      },
      {
        toolName: "get_input_deinterlace_field_order",
        input: { inputName: "Mic/Aux" },
        expected: { inputDeinterlaceFieldOrder: "OBS_DEINTERLACE_FIELD_ORDER_TOP" }
      },
      {
        toolName: "set_input_deinterlace_field_order",
        input: { inputName: "Mic/Aux", inputDeinterlaceFieldOrder: "OBS_DEINTERLACE_FIELD_ORDER_BOTTOM" },
        expected: { inputDeinterlaceFieldOrder: "OBS_DEINTERLACE_FIELD_ORDER_BOTTOM", acknowledged: true }
      },
      {
        toolName: "get_input_default_settings",
        input: { inputKind: "wasapi_input_capture" },
        expected: {
          inputKind: "wasapi_input_capture",
          defaultInputSettings: [
            { settingName: "active", valueType: "boolean" },
            { settingName: "device_id", valueType: "string" },
            { settingName: "nested_policy", valueType: "object" }
          ],
          rawSettingsDeferred: true
        }
      },
      {
        toolName: "get_input_settings",
        input: { inputName: "Mic/Aux" },
        expected: {
          inputKind: "wasapi_input_capture",
          inputSettings: [
            { settingName: "device_id", valueType: "string" },
            { settingName: "nested_policy", valueType: "object" },
            { settingName: "unsupported", valueType: "unknown" }
          ],
          rawSettingsDeferred: true
        }
      },
      {
        toolName: "get_input_properties_list_property_items",
        input: { inputName: "Mic/Aux", propertyName: "device_id" },
        expected: {
          propertyName: "device_id",
          propertyItems: [{
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
          }],
          rawPropertyItemsDeferred: true
        }
      },
      {
        toolName: "set_input_settings",
        input: {
          inputName: "Media Source",
          inputSettings: {
            looping: true,
            restartOnActivate: false,
            speedPercent: 125
          },
          overlay: false
        },
        expected: {
          inputSettings: {
            looping: true,
            restartOnActivate: false,
            speedPercent: 125
          },
          overlay: false,
          acknowledged: true
        }
      },
      {
        toolName: "press_input_properties_button",
        input: { inputName: "Browser", propertyName: "refreshnocache" },
        expected: { propertyName: "refreshnocache", acknowledged: true }
      },
      {
        toolName: "create_input",
        input: {
          sceneName: "Main",
          inputName: "Media Source",
          inputKind: "ffmpeg_source",
          inputSettings: { looping: true }
        },
        expected: { inputUuid: "input-media-source", sceneItemId: 3 }
      },
      {
        toolName: "remove_input",
        input: { inputUuid: "input-media-source" },
        expected: { acknowledged: true }
      },
      {
        toolName: "set_input_name",
        input: { inputUuid: "input-media-source", newInputName: "Renamed Media" },
        expected: { inputName: "Renamed Media", acknowledged: true }
      },
      {
        toolName: "get_media_input_status",
        input: { inputName: "Media Source" },
        expected: { mediaState: "OBS_MEDIA_STATE_PLAYING", mediaDuration: 120000, mediaCursor: 4500 }
      },
      {
        toolName: "set_media_input_cursor",
        input: { inputName: "Media Source", mediaCursor: 2500 },
        expected: { mediaCursor: 2500, acknowledged: true }
      },
      {
        toolName: "offset_media_input_cursor",
        input: { inputName: "Media Source", mediaCursorOffset: -500 },
        expected: { mediaCursorOffset: -500, acknowledged: true }
      },
      {
        toolName: "trigger_media_input_action",
        input: { inputName: "Media Source", mediaAction: "OBS_WEBSOCKET_MEDIA_INPUT_ACTION_PLAY" },
        expected: { mediaAction: "OBS_WEBSOCKET_MEDIA_INPUT_ACTION_PLAY", acknowledged: true }
      }
    ]

    for (const { expected, input, toolName } of cases) {
      await expect(executeTool(toolByName(toolName), input, { config: inputConfig, client: fakeClient }))
        .resolves.toEqual(expected)
    }
  })

  it("executes record pause handlers with structured action outputs", async () => {
    const fakeClient = fakeObsClient(async () => ({}))
    await expect(executeTool(toolByName("pause_record"), {}, { config, client: fakeClient }))
      .resolves.toEqual({ requestedAction: "pause", requestType: "PauseRecord", acknowledged: true })
    await expect(executeTool(toolByName("resume_record"), {}, { config, client: fakeClient }))
      .resolves.toEqual({ requestedAction: "resume", requestType: "ResumeRecord", acknowledged: true })
    await expect(executeTool(toolByName("toggle_record_pause"), {}, { config, client: fakeClient }))
      .resolves.toEqual({ requestedAction: "toggle_pause", requestType: "ToggleRecordPause", acknowledged: true })
  })

  it("executes record lifecycle handlers with structured outputs", async () => {
    const fakeClient = fakeObsClient(async (requestType) => {
      if (requestType === "StopRecord") {
        return { outputPath: "/opaque/obs-recording.mkv" }
      }
      if (requestType === "ToggleRecord") {
        return { outputActive: true }
      }
      return {}
    })
    await expect(executeTool(toolByName("start_record"), {}, { config, client: fakeClient }))
      .resolves.toEqual({ requestType: "StartRecord", acknowledged: true })
    await expect(executeTool(toolByName("stop_record"), {}, { config, client: fakeClient }))
      .resolves.toEqual({
        requestType: "StopRecord",
        acknowledged: true,
        outputPath: "/opaque/obs-recording.mkv"
      })
    await expect(executeTool(toolByName("toggle_record"), {}, { config, client: fakeClient }))
      .resolves.toEqual({ outputActive: true })
  })

  it("executes record file and chapter handlers with structured outputs", async () => {
    const requests: Array<{ readonly requestType: ObsRequestType; readonly requestData: unknown }> = []
    const fakeClient = fakeObsClient(async (requestType, requestData) => {
      requests.push({ requestType, requestData })
      return {}
    })
    await expect(executeTool(toolByName("split_record_file"), {}, { config, client: fakeClient }))
      .resolves.toEqual({ requestType: "SplitRecordFile", acknowledged: true })
    await expect(
      executeTool(toolByName("create_record_chapter"), { chapterName: "Act 1" }, { config, client: fakeClient })
    ).resolves.toEqual({ requestType: "CreateRecordChapter", acknowledged: true })
    expect(requests).toEqual([
      { requestType: "SplitRecordFile", requestData: undefined },
      { requestType: "CreateRecordChapter", requestData: { chapterName: "Act 1" } }
    ])
  })

  it("executes stream status and lifecycle handlers", async () => {
    const streamConfig: ObsConfig = { ...config, enabledToolsets: ["stream"] }
    const fakeClient = fakeObsClient(async (requestType) => {
      if (requestType === "GetStreamStatus") {
        return {
          outputActive: false,
          outputReconnecting: false,
          outputTimecode: "00:00:00.000",
          outputDuration: 0,
          outputCongestion: 0,
          outputBytes: 0,
          outputSkippedFrames: 0,
          outputTotalFrames: 0
        }
      }
      if (requestType === "ToggleStream") {
        return { outputActive: true }
      }
      return {}
    })
    await expect(executeTool(toolByName("get_stream_status"), {}, { config: streamConfig, client: fakeClient }))
      .resolves.toMatchObject({ outputActive: false, outputTotalFrames: 0 })
    await expect(executeTool(toolByName("start_stream"), {}, { config: streamConfig, client: fakeClient }))
      .resolves.toEqual({ outputActive: true })
    await expect(executeTool(toolByName("stop_stream"), {}, { config: streamConfig, client: fakeClient }))
      .resolves.toEqual({ outputActive: false })
    await expect(executeTool(toolByName("toggle_stream"), {}, { config: streamConfig, client: fakeClient }))
      .resolves.toEqual({ outputActive: true })
    await expect(
      executeTool(toolByName("send_stream_caption"), { captionText: "Live caption" }, {
        config: streamConfig,
        client: fakeClient
      })
    ).resolves.toEqual({ requestType: "SendStreamCaption", acknowledged: true })
  })

  it("executes virtual camera handlers", async () => {
    const seen: Array<ObsRequestType> = []
    const fakeClient = fakeObsClient(async (requestType) => {
      seen.push(requestType)
      if (requestType === "GetVirtualCamStatus") {
        return { outputActive: false }
      }
      if (requestType === "ToggleVirtualCam") {
        return { outputActive: true }
      }
      return {}
    })
    await expect(executeTool(toolByName("get_virtual_cam_status"), {}, { config, client: fakeClient }))
      .resolves.toEqual({ outputActive: false })
    await expect(executeTool(toolByName("start_virtual_cam"), {}, { config, client: fakeClient }))
      .resolves.toEqual({ outputActive: true, switched: true })
    await expect(executeTool(toolByName("stop_virtual_cam"), {}, { config, client: fakeClient }))
      .resolves.toEqual({ outputActive: false, switched: true })
    await expect(executeTool(toolByName("toggle_virtual_cam"), {}, { config, client: fakeClient }))
      .resolves.toEqual({ outputActive: true, switched: true })
    expect(seen).toEqual(["GetVirtualCamStatus", "StartVirtualCam", "StopVirtualCam", "ToggleVirtualCam"])
  })

  it("executes replay buffer lifecycle handlers", async () => {
    const seen: Array<ObsRequestType> = []
    const fakeClient = fakeObsClient(async (requestType) => {
      seen.push(requestType)
      if (requestType === "GetReplayBufferStatus") {
        return { outputActive: false }
      }
      if (requestType === "ToggleReplayBuffer") {
        return { outputActive: true }
      }
      if (requestType === "GetLastReplayBufferReplay") {
        return { savedReplayPath: "/opaque/replay-buffer.mp4" }
      }
      return {}
    })
    await expect(executeTool(toolByName("get_replay_buffer_status"), {}, { config, client: fakeClient }))
      .resolves.toEqual({ outputActive: false })
    await expect(executeTool(toolByName("start_replay_buffer"), {}, { config, client: fakeClient }))
      .resolves.toEqual({ outputActive: true })
    await expect(executeTool(toolByName("stop_replay_buffer"), {}, { config, client: fakeClient }))
      .resolves.toEqual({ outputActive: false })
    await expect(executeTool(toolByName("toggle_replay_buffer"), {}, { config, client: fakeClient }))
      .resolves.toEqual({ outputActive: true })
    await expect(executeTool(toolByName("save_replay_buffer"), {}, { config, client: fakeClient }))
      .resolves.toEqual({ requestType: "SaveReplayBuffer", acknowledged: true })
    await expect(executeTool(toolByName("get_last_replay_buffer_replay"), {}, { config, client: fakeClient }))
      .resolves.toEqual({ savedReplayPath: "/opaque/replay-buffer.mp4" })
    expect(seen).toEqual([
      "GetReplayBufferStatus",
      "StartReplayBuffer",
      "StopReplayBuffer",
      "ToggleReplayBuffer",
      "SaveReplayBuffer",
      "GetLastReplayBufferReplay"
    ])
  })

  it("rejects invalid scene params through schema validation", async () => {
    await expect(
      executeTool(toolByName("set_current_scene"), { sceneName: "" }, {
        config,
        client: fakeObsClient(async () => ({}))
      })
    )
      .rejects.toBeInstanceOf(McpError)
  })

  it("rejects invalid recent event limits through schema validation", async () => {
    await expect(executeTool(toolByName("get_recent_obs_events"), { limit: 0 }, {
      config: { ...config, enabledToolsets: ["events"] },
      client: eventClient({ capacity: 10, droppedEvents: 0, events: [] })
    })).rejects.toBeInstanceOf(McpError)

    await expect(executeTool(toolByName("get_recent_obs_events"), { limit: 101 }, {
      config: { ...config, enabledToolsets: ["events"] },
      client: eventClient({ capacity: 10, droppedEvents: 0, events: [] })
    })).rejects.toBeInstanceOf(McpError)
  })

  it("returns recent safe OBS event summaries with ordering and category filters", async () => {
    const obsEvents = eventClient({
      capacity: 6,
      droppedEvents: 1,
      events: [
        {
          sequence: 1,
          eventType: "CurrentProgramSceneChanged",
          eventIntent: EventSubscription.Scenes,
          eventData: { sceneName: "Intro", sceneUuid: "scene-intro" }
        },
        {
          sequence: 2,
          eventType: "InputMuteStateChanged",
          eventIntent: EventSubscription.Inputs,
          eventData: { inputName: "Mic/Aux", inputUuid: "input-mic", inputMuted: true }
        },
        {
          sequence: 3,
          eventType: "RecordStateChanged",
          eventIntent: EventSubscription.Outputs,
          eventData: {
            outputActive: false,
            outputState: "OBS_WEBSOCKET_OUTPUT_STOPPED",
            outputPath: "/tmp/recording.mkv"
          }
        },
        {
          sequence: 4,
          eventType: "MediaInputActionTriggered",
          eventIntent: EventSubscription.MediaInputs,
          eventData: {
            inputName: "Media",
            inputUuid: "input-media",
            mediaAction: "OBS_WEBSOCKET_MEDIA_INPUT_ACTION_PAUSE"
          }
        }
      ]
    })

    await expect(executeTool(toolByName("get_recent_obs_events"), { limit: 3 }, {
      config: { ...config, enabledToolsets: ["events"] },
      client: obsEvents
    })).resolves.toEqual({
      capacity: 6,
      droppedEvents: 1,
      returnedEvents: 3,
      order: "newest_first",
      events: [
        {
          sequence: 4,
          eventType: "MediaInputActionTriggered",
          eventIntent: EventSubscription.MediaInputs,
          category: "media_inputs",
          eventData: {
            inputName: "Media",
            inputUuid: "input-media",
            mediaAction: "OBS_WEBSOCKET_MEDIA_INPUT_ACTION_PAUSE"
          }
        },
        {
          sequence: 3,
          eventType: "RecordStateChanged",
          eventIntent: EventSubscription.Outputs,
          category: "outputs",
          eventData: {
            outputActive: false,
            outputState: "OBS_WEBSOCKET_OUTPUT_STOPPED",
            outputPath: "/tmp/recording.mkv"
          }
        },
        {
          sequence: 2,
          eventType: "InputMuteStateChanged",
          eventIntent: EventSubscription.Inputs,
          category: "inputs",
          eventData: { inputName: "Mic/Aux", inputUuid: "input-mic", inputMuted: true }
        }
      ]
    })

    await expect(executeTool(toolByName("get_recent_obs_events"), {
      order: "oldest_first",
      categories: ["scenes"]
    }, {
      config: { ...config, enabledToolsets: ["events"] },
      client: obsEvents
    })).resolves.toEqual({
      capacity: 6,
      droppedEvents: 1,
      returnedEvents: 1,
      order: "oldest_first",
      events: [{
        sequence: 1,
        eventType: "CurrentProgramSceneChanged",
        eventIntent: EventSubscription.Scenes,
        category: "scenes",
        eventData: { sceneName: "Intro", sceneUuid: "scene-intro" }
      }]
    })
  })

  it("does not return vendor, custom, or high-volume events from the public events tool", async () => {
    await expect(executeTool(toolByName("get_recent_obs_events"), { order: "oldest_first" }, {
      config: { ...config, enabledToolsets: ["events"] },
      client: eventClient({
        capacity: 7,
        droppedEvents: 0,
        events: [
          {
            sequence: 1,
            eventType: "CurrentProgramSceneChanged",
            eventIntent: EventSubscription.Scenes,
            eventData: { sceneName: "Intro", sceneUuid: "scene-intro" }
          },
          {
            sequence: 2,
            eventType: "VendorEvent",
            eventIntent: EventSubscription.Vendors,
            eventData: { vendorName: "plugin", payload: { secret: true } }
          },
          {
            sequence: 3,
            eventType: "CustomEvent",
            eventIntent: EventSubscription.General,
            eventData: { arbitrary: true }
          },
          {
            sequence: 4,
            eventType: "InputVolumeMeters",
            eventIntent: EventSubscription.InputVolumeMeters,
            eventData: { inputs: [] }
          },
          {
            sequence: 5,
            eventType: "InputActiveStateChanged",
            eventIntent: EventSubscription.Inputs,
            eventData: { inputName: "Camera", videoActive: true }
          },
          {
            sequence: 6,
            eventType: "InputShowStateChanged",
            eventIntent: EventSubscription.Inputs,
            eventData: { inputName: "Camera", videoShowing: true }
          },
          {
            sequence: 7,
            eventType: "SceneItemTransformChanged",
            eventIntent: EventSubscription.SceneItems,
            eventData: { sceneName: "Scene", sceneItemId: 1 }
          }
        ]
      } as ReturnType<ObsClient["getBufferedEvents"]>)
    })).resolves.toEqual({
      capacity: 7,
      droppedEvents: 0,
      returnedEvents: 1,
      order: "oldest_first",
      events: [{
        sequence: 1,
        eventType: "CurrentProgramSceneChanged",
        eventIntent: EventSubscription.Scenes,
        category: "scenes",
        eventData: { sceneName: "Intro", sceneUuid: "scene-intro" }
      }]
    })
  })

  it("summarizes buffered events with unknown categories", async () => {
    await expect(executeTool(toolByName("get_recent_obs_events"), { categories: ["unknown"] }, {
      config: { ...config, enabledToolsets: ["events"] },
      client: eventClient({
        capacity: 1,
        droppedEvents: 0,
        events: [{
          sequence: 1,
          eventType: "MysteryEvent",
          eventIntent: EventSubscription.None,
          eventData: undefined
        }]
      })
    })).resolves.toEqual({
      capacity: 1,
      droppedEvents: 0,
      returnedEvents: 1,
      order: "newest_first",
      events: [{
        sequence: 1,
        eventType: "MysteryEvent",
        eventIntent: EventSubscription.None,
        category: "unknown"
      }]
    })
  })

  it("rejects invalid scene-item locator params through schema validation", async () => {
    await expect(
      executeTool(toolByName("list_scene_items"), { sceneName: "Scene", sceneUuid: "scene-uuid" }, {
        config,
        client: fakeObsClient(async () => ({}))
      })
    ).rejects.toBeInstanceOf(McpError)

    await expect(
      executeTool(toolByName("list_scene_items"), { sceneUuid: "scene-uuid", canvasUuid: "canvas-uuid" }, {
        config,
        client: fakeObsClient(async () => ({}))
      })
    ).rejects.toBeInstanceOf(McpError)

    await expect(
      executeTool(toolByName("get_scene_item_id"), { sceneName: "Scene", sourceName: "Camera", searchOffset: -2 }, {
        config,
        client: fakeObsClient(async () => ({}))
      })
    ).rejects.toBeInstanceOf(McpError)

    await expect(
      executeTool(toolByName("get_scene_item_enabled"), { sceneName: "Scene", sceneItemId: -1 }, {
        config,
        client: client(async () => ({}))
      })
    ).rejects.toBeInstanceOf(McpError)

    await expect(
      executeTool(toolByName("set_scene_item_locked"), {
        sceneUuid: "scene-uuid",
        canvasUuid: "canvas-uuid",
        sceneItemId: 1,
        sceneItemLocked: true
      }, {
        config,
        client: client(async () => ({}))
      })
    ).rejects.toBeInstanceOf(McpError)

    await expect(
      executeTool(toolByName("set_scene_item_index"), {
        sceneName: "Scene",
        sceneItemId: 1,
        sceneItemIndex: -1
      }, {
        config,
        client: client(async () => ({}))
      })
    ).rejects.toBeInstanceOf(McpError)

    await expect(
      executeTool(toolByName("set_scene_item_blend_mode"), {
        sceneName: "Scene",
        sceneItemId: 1,
        sceneItemBlendMode: "invalid"
      }, {
        config,
        client: client(async () => ({}))
      })
    ).rejects.toBeInstanceOf(McpError)

    await expect(
      executeTool(toolByName("get_source_active"), { sourceName: "Camera", sourceUuid: "source-camera" }, {
        config,
        client: client(async () => ({}))
      })
    ).rejects.toBeInstanceOf(McpError)

    await expect(
      executeTool(toolByName("get_source_active"), { sourceUuid: "source-camera", canvasUuid: "canvas-main" }, {
        config,
        client: client(async () => ({}))
      })
    ).rejects.toBeInstanceOf(McpError)
  })

  it("lists scene items by scene name and preserves ordered item identity", async () => {
    const requests: Array<unknown> = []
    const output = await executeTool(toolByName("list_scene_items"), {
      sceneName: "Scene",
      canvasUuid: "canvas-uuid"
    }, {
      config,
      client: fakeObsClient(async (_requestType, requestData) => {
        requests.push(requestData)
        return {
          sceneItems: [
            {
              sceneItemId: 7,
              sceneItemIndex: 0,
              sourceName: "Camera",
              sourceUuid: "source-camera",
              sourceType: "OBS_SOURCE_TYPE_INPUT",
              inputKind: "dshow_input",
              isGroup: false
            },
            {
              sceneItemId: 9,
              sceneItemIndex: 1,
              sourceName: "Lower Third",
              sourceUuid: "source-lower-third",
              sourceType: "OBS_SOURCE_TYPE_SCENE"
            }
          ]
        }
      })
    })

    expect(requests).toEqual([{ sceneName: "Scene", canvasUuid: "canvas-uuid" }])
    expect(output).toEqual({
      sceneItems: [
        {
          sceneItemId: 7,
          sceneItemIndex: 0,
          sourceName: "Camera",
          sourceUuid: "source-camera",
          sourceType: "OBS_SOURCE_TYPE_INPUT",
          inputKind: "dshow_input",
          isGroup: false
        },
        {
          sceneItemId: 9,
          sceneItemIndex: 1,
          sourceName: "Lower Third",
          sourceUuid: "source-lower-third",
          sourceType: "OBS_SOURCE_TYPE_SCENE"
        }
      ]
    })
  })

  it("lists scene items by scene UUID where OBS supports it", async () => {
    const requests: Array<unknown> = []
    await expect(executeTool(toolByName("list_scene_items"), { sceneUuid: "scene-uuid" }, {
      config,
      client: fakeObsClient(async (_requestType, requestData) => {
        requests.push(requestData)
        return { sceneItems: [] }
      })
    })).resolves.toEqual({ sceneItems: [] })
    expect(requests).toEqual([{ sceneUuid: "scene-uuid" }])
  })

  it("lists group scene items", async () => {
    const requests: Array<unknown> = []
    await expect(executeTool(toolByName("list_group_scene_items"), { sceneName: "Group" }, {
      config,
      client: fakeObsClient(async (requestType, requestData) => {
        requests.push({ requestType, requestData })
        return {
          sceneItems: [{ sceneItemId: 3, sceneItemIndex: 0, sourceName: "Nested", sourceUuid: "source-nested" }]
        }
      })
    })).resolves.toEqual({
      sceneItems: [{ sceneItemId: 3, sceneItemIndex: 0, sourceName: "Nested", sourceUuid: "source-nested" }]
    })
    expect(requests).toEqual([{ requestType: "GetGroupSceneItemList", requestData: { sceneName: "Group" } }])
  })

  it("looks up scene item IDs by source name", async () => {
    const requests: Array<unknown> = []
    await expect(executeTool(toolByName("get_scene_item_id"), {
      sceneName: "Scene",
      sourceName: "Camera",
      searchOffset: -1
    }, {
      config,
      client: fakeObsClient(async (_requestType, requestData) => {
        requests.push(requestData)
        return { sceneItemId: 42 }
      })
    })).resolves.toEqual({ sceneItemId: 42 })
    expect(requests).toEqual([{ sceneName: "Scene", sourceName: "Camera", searchOffset: -1 }])
  })

  it("gets a scene item's source", async () => {
    await expect(executeTool(toolByName("get_scene_item_source"), {
      sceneUuid: "scene-uuid",
      sceneItemId: 42
    }, {
      config,
      client: fakeObsClient(async (_requestType, requestData) => {
        expect(requestData).toEqual({ sceneUuid: "scene-uuid", sceneItemId: 42 })
        return { sourceName: "Camera", sourceUuid: "source-camera" }
      })
    })).resolves.toEqual({ sourceName: "Camera", sourceUuid: "source-camera" })
  })

  it("gets and sets scene item enabled and locked state", async () => {
    const requests: Array<unknown> = []
    await expect(executeTool(toolByName("get_scene_item_enabled"), {
      sceneName: "Scene",
      sceneItemId: 42
    }, {
      config,
      client: clientWithData(async (_requestType, requestData) => {
        requests.push(requestData)
        return { sceneItemEnabled: false }
      })
    })).resolves.toEqual({ sceneItemEnabled: false })

    await expect(executeTool(toolByName("set_scene_item_enabled"), {
      sceneName: "Scene",
      sceneItemId: 42,
      sceneItemEnabled: true
    }, {
      config,
      client: clientWithData(async (_requestType, requestData) => {
        requests.push(requestData)
        return {}
      })
    })).resolves.toEqual({ sceneItemEnabled: true, updated: true })

    await expect(executeTool(toolByName("get_scene_item_locked"), {
      sceneUuid: "scene-uuid",
      sceneItemId: 42
    }, {
      config,
      client: clientWithData(async (_requestType, requestData) => {
        requests.push(requestData)
        return { sceneItemLocked: true }
      })
    })).resolves.toEqual({ sceneItemLocked: true })

    await expect(executeTool(toolByName("set_scene_item_locked"), {
      sceneUuid: "scene-uuid",
      sceneItemId: 42,
      sceneItemLocked: false
    }, {
      config,
      client: clientWithData(async (_requestType, requestData) => {
        requests.push(requestData)
        return {}
      })
    })).resolves.toEqual({ sceneItemLocked: false, updated: true })

    expect(requests).toEqual([
      { sceneName: "Scene", sceneItemId: 42 },
      { sceneName: "Scene", sceneItemId: 42, sceneItemEnabled: true },
      { sceneUuid: "scene-uuid", sceneItemId: 42 },
      { sceneUuid: "scene-uuid", sceneItemId: 42, sceneItemLocked: false }
    ])
  })

  it("gets scene item index and blend mode", async () => {
    const requests: Array<unknown> = []
    await expect(executeTool(toolByName("get_scene_item_index"), {
      sceneName: "Scene",
      sceneItemId: 42
    }, {
      config,
      client: clientWithData(async (_requestType, requestData) => {
        requests.push(requestData)
        return { sceneItemIndex: 2 }
      })
    })).resolves.toEqual({ sceneItemIndex: 2 })

    await expect(executeTool(toolByName("get_scene_item_blend_mode"), {
      sceneUuid: "scene-uuid",
      sceneItemId: 42
    }, {
      config,
      client: clientWithData(async (_requestType, requestData) => {
        requests.push(requestData)
        return { sceneItemBlendMode: "OBS_BLEND_SCREEN" }
      })
    })).resolves.toEqual({ sceneItemBlendMode: "OBS_BLEND_SCREEN" })

    expect(requests).toEqual([
      { sceneName: "Scene", sceneItemId: 42 },
      { sceneUuid: "scene-uuid", sceneItemId: 42 }
    ])
  })

  it("sets scene item index and blend mode", async () => {
    const requests: Array<unknown> = []
    await expect(executeTool(toolByName("set_scene_item_index"), {
      sceneName: "Scene",
      sceneItemId: 42,
      sceneItemIndex: 3
    }, {
      config,
      client: clientWithData(async (_requestType, requestData) => {
        requests.push(requestData)
        return {}
      })
    })).resolves.toEqual({ sceneItemIndex: 3, updated: true })

    await expect(executeTool(toolByName("set_scene_item_blend_mode"), {
      sceneUuid: "scene-uuid",
      sceneItemId: 42,
      sceneItemBlendMode: "OBS_BLEND_DARKEN"
    }, {
      config,
      client: clientWithData(async (_requestType, requestData) => {
        requests.push(requestData)
        return {}
      })
    })).resolves.toEqual({ sceneItemBlendMode: "OBS_BLEND_DARKEN", updated: true })

    expect(requests).toEqual([
      { sceneName: "Scene", sceneItemId: 42, sceneItemIndex: 3 },
      { sceneUuid: "scene-uuid", sceneItemId: 42, sceneItemBlendMode: "OBS_BLEND_DARKEN" }
    ])
  })

  it("gets source active state and echoes supplied source identity", async () => {
    const requests: Array<unknown> = []
    await expect(executeTool(toolByName("get_source_active"), {
      sourceName: "Camera",
      canvasUuid: "canvas-main"
    }, {
      config,
      client: clientWithData(async (_requestType, requestData) => {
        requests.push(requestData)
        return { videoActive: true, videoShowing: true }
      })
    })).resolves.toEqual({
      sourceName: "Camera",
      videoActive: true,
      videoShowing: true
    })

    await expect(executeTool(toolByName("get_source_active"), {
      sourceUuid: "source-camera"
    }, {
      config,
      client: clientWithData(async (_requestType, requestData) => {
        requests.push(requestData)
        return { sourceName: "Camera", videoActive: false, videoShowing: true }
      })
    })).resolves.toEqual({
      sourceName: "Camera",
      sourceUuid: "source-camera",
      videoActive: false,
      videoShowing: true
    })

    expect(requests).toEqual([
      { sourceName: "Camera", canvasUuid: "canvas-main" },
      { sourceUuid: "source-camera" }
    ])
  })

  it("maps OBS missing scene item errors to MCP errors", async () => {
    await expect(executeTool(toolByName("get_scene_item_id"), { sceneName: "Scene", sourceName: "Missing" }, {
      config,
      client: fakeObsClient(async () => {
        throw new ObsRequestError("GetSceneItemId", 601, "Source not found")
      })
    })).rejects.toMatchObject({ code: ErrorCode.InvalidParams })
  })

  it("maps scene item state OBS errors to MCP errors with OBS status metadata", async () => {
    await expect(executeTool(toolByName("set_scene_item_enabled"), {
      sceneName: "Scene",
      sceneItemId: 404,
      sceneItemEnabled: true
    }, {
      config,
      client: client(async () => {
        throw new ObsRequestError("SetSceneItemEnabled", 601, "Scene item not found")
      })
    })).rejects.toMatchObject({
      code: ErrorCode.InvalidParams,
      data: {
        obsStatusCode: 601,
        comment: "Scene item not found"
      }
    })
  })

  it("maps scene item index OBS errors to MCP errors with OBS status metadata", async () => {
    await expect(executeTool(toolByName("get_scene_item_index"), {
      sceneName: "Scene",
      sceneItemId: 404
    }, {
      config,
      client: client(async () => {
        throw new ObsRequestError("GetSceneItemIndex", 601, "Scene item not found")
      })
    })).rejects.toMatchObject({
      code: ErrorCode.InvalidParams,
      data: {
        requestType: "GetSceneItemIndex",
        obsStatusCode: 601,
        comment: "Scene item not found"
      }
    })
  })

  it("maps scene item mutation OBS errors to MCP errors with OBS status metadata", async () => {
    await expect(executeTool(toolByName("set_scene_item_index"), {
      sceneName: "Scene",
      sceneItemId: 42,
      sceneItemIndex: 99
    }, {
      config,
      client: client(async () => {
        throw new ObsRequestError("SetSceneItemIndex", 601, "Index out of range")
      })
    })).rejects.toMatchObject({
      code: ErrorCode.InvalidParams,
      data: {
        requestType: "SetSceneItemIndex",
        obsStatusCode: 601,
        comment: "Index out of range"
      }
    })

    await expect(executeTool(toolByName("set_scene_item_blend_mode"), {
      sceneName: "Scene",
      sceneItemId: 42,
      sceneItemBlendMode: "OBS_BLEND_LIGHTEN"
    }, {
      config,
      client: client(async () => {
        throw new ObsRequestError("SetSceneItemBlendMode", 402, "Invalid blend mode")
      })
    })).rejects.toMatchObject({
      code: ErrorCode.InvalidParams,
      data: {
        requestType: "SetSceneItemBlendMode",
        obsStatusCode: 402,
        comment: "Invalid blend mode"
      }
    })
  })

  it("maps source active OBS errors to MCP errors with OBS status metadata", async () => {
    await expect(executeTool(toolByName("get_source_active"), {
      sourceName: "Missing"
    }, {
      config,
      client: client(async () => {
        throw new ObsRequestError("GetSourceActive", 601, "Source not found")
      })
    })).rejects.toMatchObject({
      code: ErrorCode.InvalidParams,
      data: {
        requestType: "GetSourceActive",
        obsStatusCode: 601,
        comment: "Source not found"
      }
    })
  })

  it("filters unavailable scene-item requests by negotiated OBS capabilities", () => {
    expect(
      getEnabledTools(["scenes"], [
        "GetVersion",
        "GetSceneList",
        "GetCurrentProgramScene",
        "SetCurrentProgramScene",
        "GetSceneItemEnabled",
        "SetSceneItemEnabled",
        "GetSceneItemLocked",
        "SetSceneItemLocked",
        "GetSceneItemIndex",
        "GetSceneItemBlendMode",
        "SetSceneItemIndex",
        "SetSceneItemBlendMode",
        "GetSourceActive"
      ]).map((tool) => tool.name)
    ).toEqual([
      "list_scenes",
      "get_current_scene",
      "set_current_scene",
      "get_scene_item_enabled",
      "set_scene_item_enabled",
      "get_scene_item_locked",
      "set_scene_item_locked",
      "get_scene_item_index",
      "get_scene_item_blend_mode",
      "set_scene_item_index",
      "set_scene_item_blend_mode",
      "get_source_active"
    ])
  })

  it("maps scene operation errors to MCP errors with OBS status metadata", async () => {
    await expect(executeTool(toolByName("set_current_scene"), { sceneName: "Missing" }, {
      config,
      client: fakeObsClient(async () => {
        throw new ObsRequestError("SetCurrentProgramScene", 608, "Parameter: sceneName")
      })
    })).rejects.toMatchObject({ code: ErrorCode.InvalidParams })
  })

  it("maps stream operation errors to MCP errors with OBS status metadata", async () => {
    await expect(executeTool(toolByName("start_stream"), {}, {
      config: { ...config, enabledToolsets: ["stream"] },
      client: fakeObsClient(async () => {
        throw new ObsRequestError("StartStream", 207, "Output already active")
      })
    })).rejects.toMatchObject({
      code: ErrorCode.InternalError,
      data: { requestType: "StartStream", obsStatusCode: 207 }
    })
  })

  it("maps virtual camera operation errors to MCP errors with OBS status metadata", async () => {
    await expect(executeTool(toolByName("start_virtual_cam"), {}, {
      config: { ...config, enabledToolsets: ["outputs"] },
      client: fakeObsClient(async () => {
        throw new ObsRequestError("StartVirtualCam", 500, "virtual camera unavailable")
      })
    })).rejects.toMatchObject({
      code: ErrorCode.InvalidParams,
      data: {
        requestType: "StartVirtualCam",
        obsStatusCode: 500,
        comment: "virtual camera unavailable"
      }
    })
  })

  it("maps generic, protocol, timeout, and existing MCP errors", () => {
    const existing = new McpError(ErrorCode.InvalidParams, "existing")
    expect(toMcpError(existing)).toBe(existing)
    expect(toMcpError(new ObsTimeoutError("slow"))).toMatchObject({ code: ErrorCode.InternalError })
    expect(toMcpError(new ObsProtocolError("bad"))).toMatchObject({ code: ErrorCode.InternalError })
    expect(toMcpError(new Error("generic"))).toMatchObject({ code: ErrorCode.InternalError })
    expect(toMcpError("string error")).toMatchObject({ code: ErrorCode.InternalError })
    expect(toMcpError(new ObsRequestError("GetVersion", 207, "OBS is busy"))).toMatchObject({
      code: ErrorCode.InternalError,
      data: { retryable: true }
    })
    expect(new ObsRequestError("GetVersion", 500, undefined).toUserMessage()).not.toContain("OBS said")
  })

  it("maps OBS status code families to MCP error classes", () => {
    const invalidParamStatuses = [203, 204, 206, 300, 400, 500, 600, 608, 703]
    for (const status of invalidParamStatuses) {
      expect(toMcpError(new ObsRequestError("SetCurrentProgramScene", status, "bad request"))).toMatchObject({
        code: ErrorCode.InvalidParams,
        data: { obsStatusCode: status, retryable: false }
      })
    }

    const internalStatuses = [205, 207, 700, 702, 999]
    for (const status of internalStatuses) {
      expect(toMcpError(new ObsRequestError("GetVersion", status, "OBS failed"))).toMatchObject({
        code: ErrorCode.InternalError,
        data: { obsStatusCode: status }
      })
    }
  })
})
