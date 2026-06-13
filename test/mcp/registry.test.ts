import { ErrorCode, McpError } from "@modelcontextprotocol/sdk/types.js"
import { JSONSchema, Option, Schema } from "effect"
import { describe, expect, it } from "vitest"

import type { ObsConfig } from "../../src/config/config.js"
import {
  InputLocatorInput,
  ListInputKindsInput,
  MediaInputStatusOutput,
  OffsetMediaInputCursorInput,
  SetInputAudioBalanceInput,
  SetInputAudioMonitorTypeInput,
  SetInputAudioSyncOffsetInput,
  SetInputMuteInput,
  SetInputVolumeInput,
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
  "get_media_input_status",
  "set_media_input_cursor",
  "offset_media_input_cursor",
  "trigger_media_input_action"
]

const generalToolNames = [
  "get_obs_context",
  "get_version",
  "get_obs_stats",
  "list_hotkeys",
  "trigger_hotkey_by_name",
  "trigger_hotkey_by_key_sequence"
]

const deferredInputMediaToolNames = [
  "get_input_audio_tracks",
  "set_input_audio_tracks",
  "get_input_settings",
  "set_input_settings"
]

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
  "GetMediaInputStatus",
  "SetMediaInputCursor",
  "OffsetMediaInputCursor",
  "TriggerMediaInputAction"
] satisfies ReadonlyArray<ObsRequestType>

const canvasToolNames = ["list_canvases"]
const configToolNames = [
  "list_profiles",
  "list_scene_collections",
  "get_profile_parameter",
  "get_record_directory",
  "set_record_directory",
  "get_video_settings",
  "set_video_settings",
  "get_stream_service_settings",
  "set_stream_service_settings",
  "set_current_profile",
  "create_profile",
  "remove_profile",
  "set_current_scene_collection",
  "create_scene_collection",
  "set_profile_parameter"
]
const uiToolNames = [
  "get_studio_mode_enabled",
  "open_input_properties_dialog",
  "open_input_filters_dialog",
  "open_input_interact_dialog",
  "list_monitors",
  "open_video_mix_projector",
  "open_source_projector"
]
const transitionToolNames = [
  "list_transition_kinds",
  "list_scene_transitions",
  "get_current_scene_transition",
  "get_current_scene_transition_cursor",
  "set_current_scene_transition",
  "set_current_scene_transition_duration",
  "set_current_scene_transition_settings",
  "trigger_studio_mode_transition",
  "set_tbar_position"
]

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
      ...generalToolNames,
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

  it("exposes canvas and studio-mode read tools only for their toolsets", () => {
    expect(getEnabledTools(["canvases"], allAvailableRequests).map((tool) => tool.name)).toEqual(canvasToolNames)
    expect(getEnabledTools(["ui"], allAvailableRequests).map((tool) => tool.name)).toEqual(uiToolNames)
    expect(getEnabledTools(["general"], allAvailableRequests).map((tool) => tool.name))
      .toEqual(expect.not.arrayContaining([...canvasToolNames, ...uiToolNames]))
  })

  it("exposes transition inventory tools only for the transitions toolset", () => {
    expect(getEnabledTools(["transitions"], allAvailableRequests).map((tool) => tool.name)).toEqual(
      transitionToolNames
    )
    expect(getEnabledTools(["general"], allAvailableRequests).map((tool) => tool.name))
      .toEqual(expect.not.arrayContaining(transitionToolNames))
  })

  it("exposes config inventory tools only for the config toolset", () => {
    expect(getEnabledTools(["config"], allAvailableRequests).map((tool) => tool.name)).toEqual(configToolNames)
    expect(getEnabledTools(["general"], allAvailableRequests).map((tool) => tool.name))
      .toEqual(expect.not.arrayContaining(configToolNames))
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
    expect(getEnabledTools(["general"], allAvailableRequests).map((tool) => tool.name)).toEqual(generalToolNames)
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
      getEnabledTools(["general"], [
        "GetHotkeyList",
        "TriggerHotkeyByName",
        "TriggerHotkeyByKeySequence"
      ]).map((tool) => tool.name)
    ).toEqual(["get_obs_context", "list_hotkeys", "trigger_hotkey_by_name", "trigger_hotkey_by_key_sequence"])
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

  it("filters canvas and UI tools by negotiated OBS capabilities", () => {
    expect(getEnabledTools(["canvases"], ["GetCanvasList"]).map((tool) => tool.name)).toEqual(canvasToolNames)
    expect(getEnabledTools(["canvases"], []).map((tool) => tool.name)).toEqual([])
    expect(
      getEnabledTools(["ui"], [
        "GetStudioModeEnabled",
        "OpenInputPropertiesDialog",
        "GetMonitorList",
        "OpenSourceProjector"
      ]).map((tool) => tool.name)
    ).toEqual([
      "get_studio_mode_enabled",
      "open_input_properties_dialog",
      "list_monitors",
      "open_source_projector"
    ])
    expect(getEnabledTools(["ui"], []).map((tool) => tool.name)).toEqual([])
  })

  it("filters transition inventory tools by negotiated OBS capabilities", () => {
    expect(
      getEnabledTools(["transitions"], [
        "GetTransitionKindList",
        "GetCurrentSceneTransition",
        "SetCurrentSceneTransitionDuration",
        "TriggerStudioModeTransition"
      ]).map((tool) => tool.name)
    ).toEqual([
      "list_transition_kinds",
      "get_current_scene_transition",
      "set_current_scene_transition_duration",
      "trigger_studio_mode_transition"
    ])
    expect(getEnabledTools(["transitions"], []).map((tool) => tool.name)).toEqual([])
  })

  it("filters config inventory tools by negotiated OBS capabilities", () => {
    expect(
      getEnabledTools(["config"], [
        "GetProfileList",
        "GetProfileParameter",
        "SetRecordDirectory",
        "GetVideoSettings",
        "SetVideoSettings",
        "GetStreamServiceSettings",
        "SetStreamServiceSettings",
        "SetCurrentProfile",
        "CreateProfile",
        "RemoveProfile",
        "SetCurrentSceneCollection",
        "CreateSceneCollection",
        "SetProfileParameter"
      ]).map((tool) => tool.name)
    ).toEqual([
      "list_profiles",
      "get_profile_parameter",
      "set_record_directory",
      "get_video_settings",
      "set_video_settings",
      "get_stream_service_settings",
      "set_stream_service_settings",
      "set_current_profile",
      "create_profile",
      "remove_profile",
      "set_current_scene_collection",
      "create_scene_collection",
      "set_profile_parameter"
    ])
    expect(getEnabledTools(["config"], []).map((tool) => tool.name)).toEqual([])
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

  it("executes hotkey handlers with structured output and validates bounded key sequences", async () => {
    const seenRequests: Array<readonly [string, unknown]> = []
    const fakeClient = clientWithData(async (requestType, requestData) => {
      seenRequests.push([requestType, requestData])
      return requestType === "GetHotkeyList"
        ? { hotkeys: ["OBSBasic.StartRecording"] }
        : {}
    })
    await expect(executeTool(toolByName("list_hotkeys"), {}, {
      config: { ...config, enabledToolsets: ["general"] },
      client: fakeClient
    })).resolves.toEqual({ hotkeys: ["OBSBasic.StartRecording"] })
    await expect(executeTool(toolByName("trigger_hotkey_by_name"), {
      hotkeyName: "OBSBasic.StartRecording"
    }, {
      config: { ...config, enabledToolsets: ["general"] },
      client: fakeClient
    })).resolves.toEqual({ hotkeyName: "OBSBasic.StartRecording", triggered: true })
    await expect(executeTool(toolByName("trigger_hotkey_by_key_sequence"), {
      keyId: "OBS_KEY_F10",
      keyModifiers: { alt: true, command: false }
    }, {
      config: { ...config, enabledToolsets: ["general"] },
      client: fakeClient
    })).resolves.toEqual({
      keyId: "OBS_KEY_F10",
      keyModifiers: { alt: true, command: false },
      triggered: true
    })
    await expect(executeTool(toolByName("trigger_hotkey_by_key_sequence"), {}, {
      config: { ...config, enabledToolsets: ["general"] },
      client: fakeClient
    })).rejects.toMatchObject({ code: ErrorCode.InvalidParams })
    expect(seenRequests).toEqual([
      ["GetHotkeyList", undefined],
      ["TriggerHotkeyByName", { hotkeyName: "OBSBasic.StartRecording" }],
      ["TriggerHotkeyByKeySequence", { keyId: "OBS_KEY_F10", keyModifiers: { alt: true, command: false } }]
    ])
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

  it("executes canvas and studio-mode read handlers with structured output", async () => {
    await expect(executeTool(toolByName("list_canvases"), {}, {
      config: { ...config, enabledToolsets: ["canvases"] },
      client: clientWithData(async (requestType) => {
        expect(requestType).toBe("GetCanvasList")
        return {
          canvases: [{
            canvasName: "Program",
            canvasUuid: "canvas-program",
            canvasIndex: 0,
            width: 1920
          }]
        }
      })
    })).resolves.toEqual({
      canvases: [{ canvasIndex: 0, canvasName: "Program", canvasUuid: "canvas-program" }]
    })

    await expect(executeTool(toolByName("get_studio_mode_enabled"), {}, {
      config: { ...config, enabledToolsets: ["ui"] },
      client: clientWithData(async (requestType) => {
        expect(requestType).toBe("GetStudioModeEnabled")
        return { studioModeEnabled: true }
      })
    })).resolves.toEqual({ studioModeEnabled: true })
    await expect(executeTool(toolByName("list_monitors"), {}, {
      config: { ...config, enabledToolsets: ["ui"] },
      client: clientWithData(async (requestType) => {
        expect(requestType).toBe("GetMonitorList")
        return {
          monitors: [{
            monitorIndex: 0,
            monitorName: "Primary",
            monitorWidth: 1920,
            monitorHeight: 1080,
            ignoredOpaqueField: { nested: true }
          }, {
            monitorIndex: 1
          }, {
            monitorName: "Malformed"
          }]
        }
      })
    })).resolves.toEqual({
      monitors: [
        { monitorIndex: 0, monitorName: "Primary", monitorWidth: 1920, monitorHeight: 1080 },
        { monitorIndex: 1 }
      ]
    })
    await expect(executeTool(toolByName("open_input_properties_dialog"), { inputName: "Camera" }, {
      config: { ...config, enabledToolsets: ["ui"] },
      client: clientWithData(async (requestType, requestData) => {
        expect(requestType).toBe("OpenInputPropertiesDialog")
        expect(requestData).toEqual({ inputName: "Camera" })
        return {}
      })
    })).resolves.toEqual({ requestType: "OpenInputPropertiesDialog", acknowledged: true })
    await expect(executeTool(toolByName("open_input_filters_dialog"), { inputUuid: "input-camera" }, {
      config: { ...config, enabledToolsets: ["ui"] },
      client: clientWithData(async (requestType, requestData) => {
        expect(requestType).toBe("OpenInputFiltersDialog")
        expect(requestData).toEqual({ inputUuid: "input-camera" })
        return {}
      })
    })).resolves.toEqual({ requestType: "OpenInputFiltersDialog", acknowledged: true })
    await expect(executeTool(toolByName("open_input_interact_dialog"), { inputName: "Browser" }, {
      config: { ...config, enabledToolsets: ["ui"] },
      client: clientWithData(async (requestType, requestData) => {
        expect(requestType).toBe("OpenInputInteractDialog")
        expect(requestData).toEqual({ inputName: "Browser" })
        return {}
      })
    })).resolves.toEqual({ requestType: "OpenInputInteractDialog", acknowledged: true })
    await expect(executeTool(toolByName("open_video_mix_projector"), {
      videoMixType: "OBS_WEBSOCKET_VIDEO_MIX_TYPE_MULTIVIEW",
      monitorIndex: -1
    }, {
      config: { ...config, enabledToolsets: ["ui"] },
      client: clientWithData(async (requestType, requestData) => {
        expect(requestType).toBe("OpenVideoMixProjector")
        expect(requestData).toEqual({
          videoMixType: "OBS_WEBSOCKET_VIDEO_MIX_TYPE_MULTIVIEW",
          monitorIndex: -1
        })
        return {}
      })
    })).resolves.toEqual({ requestType: "OpenVideoMixProjector", acknowledged: true })
    await expect(executeTool(toolByName("open_source_projector"), {
      sourceUuid: "source-camera",
      projectorGeometry: "AdnQyw=="
    }, {
      config: { ...config, enabledToolsets: ["ui"] },
      client: clientWithData(async (requestType, requestData) => {
        expect(requestType).toBe("OpenSourceProjector")
        expect(requestData).toEqual({ sourceUuid: "source-camera", projectorGeometry: "AdnQyw==" })
        return {}
      })
    })).resolves.toEqual({ requestType: "OpenSourceProjector", acknowledged: true })
    await expect(executeTool(toolByName("open_source_projector"), {
      sourceName: "Camera",
      sourceUuid: "source-camera"
    }, {
      config: { ...config, enabledToolsets: ["ui"] },
      client: clientWithData(async () => ({}))
    })).rejects.toMatchObject({ code: ErrorCode.InvalidParams })
    await expect(executeTool(toolByName("open_video_mix_projector"), {
      videoMixType: "OBS_WEBSOCKET_VIDEO_MIX_TYPE_PROGRAM",
      monitorIndex: 0,
      projectorGeometry: "AdnQyw=="
    }, {
      config: { ...config, enabledToolsets: ["ui"] },
      client: clientWithData(async () => ({}))
    })).rejects.toMatchObject({ code: ErrorCode.InvalidParams })
  })

  it("executes config inventory and mutation handlers with structured output", async () => {
    const seenRequests: Array<readonly [ObsRequestType, unknown]> = []
    const fakeClient = clientWithData(async (requestType, requestData) => {
      seenRequests.push([requestType, requestData])
      if (requestType === "GetProfileList") {
        return { currentProfileName: "Production", profiles: ["Untitled", "Production"] }
      }
      if (requestType === "GetSceneCollectionList") {
        return { currentSceneCollectionName: "Main Scenes", sceneCollections: ["Main Scenes"] }
      }
      if (requestType === "GetProfileParameter") {
        return { parameterValue: null, defaultParameterValue: "2500" }
      }
      if (requestType === "GetRecordDirectory") {
        return { recordDirectory: "/opaque/obs-recordings" }
      }
      if (requestType === "GetVideoSettings") {
        return {
          baseWidth: 1920,
          baseHeight: 1080,
          outputWidth: 1280,
          outputHeight: 720,
          fpsNumerator: 30000,
          fpsDenominator: 1001
        }
      }
      if (requestType === "GetStreamServiceSettings") {
        return {
          streamServiceType: "rtmp_custom",
          streamServiceSettings: {
            server: "rtmp://example.invalid/live",
            key: "redacted-registry-key"
          }
        }
      }
      return { recordDirectory: "/opaque/obs-recordings" }
    })

    await expect(executeTool(toolByName("list_profiles"), {}, {
      config: { ...config, enabledToolsets: ["config"] },
      client: fakeClient
    })).resolves.toEqual({ currentProfileName: "Production", profiles: ["Untitled", "Production"] })
    await expect(executeTool(toolByName("list_scene_collections"), {}, {
      config: { ...config, enabledToolsets: ["config"] },
      client: fakeClient
    })).resolves.toEqual({ currentSceneCollectionName: "Main Scenes", sceneCollections: ["Main Scenes"] })
    await expect(executeTool(toolByName("get_profile_parameter"), {
      parameterCategory: "SimpleOutput",
      parameterName: "VBitrate"
    }, {
      config: { ...config, enabledToolsets: ["config"] },
      client: fakeClient
    })).resolves.toEqual({ parameterValue: null, defaultParameterValue: "2500" })
    await expect(executeTool(toolByName("get_record_directory"), {}, {
      config: { ...config, enabledToolsets: ["config"] },
      client: fakeClient
    })).resolves.toEqual({ recordDirectory: "/opaque/obs-recordings" })
    await expect(executeTool(toolByName("set_record_directory"), {
      recordDirectory: "opaque://recordings/show"
    }, {
      config: { ...config, enabledToolsets: ["config"] },
      client: fakeClient
    })).resolves.toEqual({ recordDirectory: "opaque://recordings/show", acknowledged: true })
    await expect(executeTool(toolByName("get_video_settings"), {}, {
      config: { ...config, enabledToolsets: ["config"] },
      client: fakeClient
    })).resolves.toEqual({
      baseWidth: 1920,
      baseHeight: 1080,
      outputWidth: 1280,
      outputHeight: 720,
      fpsNumerator: 30000,
      fpsDenominator: 1001
    })
    await expect(executeTool(toolByName("set_video_settings"), {
      baseWidth: 1920,
      baseHeight: 1080,
      fpsNumerator: 60,
      fpsDenominator: 1
    }, {
      config: { ...config, enabledToolsets: ["config"] },
      client: fakeClient
    })).resolves.toEqual({
      baseWidth: 1920,
      baseHeight: 1080,
      fpsNumerator: 60,
      fpsDenominator: 1,
      acknowledged: true
    })
    await expect(executeTool(toolByName("get_stream_service_settings"), {}, {
      config: { ...config, enabledToolsets: ["config"] },
      client: fakeClient
    })).resolves.toEqual({
      streamServiceType: "rtmp_custom",
      streamServiceSettings: {
        server: "rtmp://example.invalid/live",
        keyConfigured: true
      }
    })
    await expect(executeTool(toolByName("set_stream_service_settings"), {
      streamServiceType: "rtmp_custom",
      streamServiceSettings: {
        server: "rtmp://example.invalid/show",
        key: "redacted-registry-set-key"
      }
    }, {
      config: { ...config, enabledToolsets: ["config"] },
      client: fakeClient
    })).resolves.toEqual({
      streamServiceType: "rtmp_custom",
      streamServiceSettings: {
        server: "rtmp://example.invalid/show",
        keyConfigured: true
      },
      acknowledged: true
    })
    await expect(executeTool(toolByName("set_current_profile"), { profileName: "Production" }, {
      config: { ...config, enabledToolsets: ["config"] },
      client: fakeClient
    })).resolves.toEqual({ profileName: "Production", switched: true })
    await expect(executeTool(toolByName("create_profile"), { profileName: "Show" }, {
      config: { ...config, enabledToolsets: ["config"] },
      client: fakeClient
    })).resolves.toEqual({ profileName: "Show", created: true, switched: true })
    await expect(executeTool(toolByName("remove_profile"), { profileName: "Show" }, {
      config: { ...config, enabledToolsets: ["config"] },
      client: fakeClient
    })).resolves.toEqual({ profileName: "Show", removed: true })
    await expect(executeTool(toolByName("set_current_scene_collection"), {
      sceneCollectionName: "Main Scenes"
    }, {
      config: { ...config, enabledToolsets: ["config"] },
      client: fakeClient
    })).resolves.toEqual({ sceneCollectionName: "Main Scenes", switched: true })
    await expect(executeTool(toolByName("create_scene_collection"), {
      sceneCollectionName: "Event Scenes"
    }, {
      config: { ...config, enabledToolsets: ["config"] },
      client: fakeClient
    })).resolves.toEqual({ sceneCollectionName: "Event Scenes", created: true, switched: true })
    await expect(executeTool(toolByName("set_profile_parameter"), {
      parameterCategory: "SimpleOutput",
      parameterName: "VBitrate",
      parameterValue: null
    }, {
      config: { ...config, enabledToolsets: ["config"] },
      client: fakeClient
    })).resolves.toEqual({
      parameterCategory: "SimpleOutput",
      parameterName: "VBitrate",
      parameterValue: null,
      acknowledged: true
    })
    expect(seenRequests).toEqual(expect.arrayContaining([
      ["SetCurrentProfile", { profileName: "Production" }],
      ["CreateProfile", { profileName: "Show" }],
      ["RemoveProfile", { profileName: "Show" }],
      ["SetCurrentSceneCollection", { sceneCollectionName: "Main Scenes" }],
      ["CreateSceneCollection", { sceneCollectionName: "Event Scenes" }],
      ["SetProfileParameter", {
        parameterCategory: "SimpleOutput",
        parameterName: "VBitrate",
        parameterValue: null
      }],
      ["SetRecordDirectory", { recordDirectory: "opaque://recordings/show" }],
      ["SetVideoSettings", {
        baseWidth: 1920,
        baseHeight: 1080,
        fpsNumerator: 60,
        fpsDenominator: 1
      }],
      ["SetStreamServiceSettings", {
        streamServiceType: "rtmp_custom",
        streamServiceSettings: {
          server: "rtmp://example.invalid/show",
          key: "redacted-registry-set-key"
        }
      }]
    ]))
    await expect(executeTool(toolByName("get_profile_parameter"), {
      parameterCategory: "",
      parameterName: "VBitrate"
    }, {
      config: { ...config, enabledToolsets: ["config"] },
      client: fakeClient
    })).rejects.toMatchObject({ code: ErrorCode.InvalidParams })
    await expect(executeTool(toolByName("set_current_profile"), { profileName: "" }, {
      config: { ...config, enabledToolsets: ["config"] },
      client: fakeClient
    })).rejects.toMatchObject({ code: ErrorCode.InvalidParams })
    await expect(executeTool(toolByName("set_video_settings"), { baseWidth: 1920 }, {
      config: { ...config, enabledToolsets: ["config"] },
      client: fakeClient
    })).rejects.toMatchObject({ code: ErrorCode.InvalidParams })
    await expect(executeTool(toolByName("set_video_settings"), {
      baseWidth: 4097,
      baseHeight: 1080
    }, {
      config: { ...config, enabledToolsets: ["config"] },
      client: fakeClient
    })).rejects.toMatchObject({ code: ErrorCode.InvalidParams })
    await expect(executeTool(toolByName("set_stream_service_settings"), {
      streamServiceType: "rtmp_custom",
      streamServiceSettings: { fields: { server: "rtmp://example.invalid/live" } }
    }, {
      config: { ...config, enabledToolsets: ["config"] },
      client: fakeClient
    })).rejects.toMatchObject({ code: ErrorCode.InvalidParams })
  })

  it("maps UI side-effect OBS errors to MCP errors with OBS status metadata", async () => {
    await expect(executeTool(toolByName("open_input_properties_dialog"), {
      inputName: "Missing Camera"
    }, {
      config: { ...config, enabledToolsets: ["ui"] },
      client: client(async () => {
        throw new ObsRequestError("OpenInputPropertiesDialog", 600, "Input not found")
      })
    })).rejects.toMatchObject({
      code: ErrorCode.InvalidParams,
      data: {
        requestType: "OpenInputPropertiesDialog",
        obsStatusCode: 600,
        comment: "Input not found"
      }
    })
  })

  it("executes transition inventory handlers with structured output", async () => {
    const fakeClient = clientWithData(async (requestType) => {
      if (requestType === "GetTransitionKindList") {
        return { transitionKinds: ["fade_transition"] }
      }
      if (requestType === "GetSceneTransitionList") {
        return {
          currentSceneTransitionName: "Fade",
          currentSceneTransitionUuid: "transition-fade",
          currentSceneTransitionKind: "fade_transition",
          transitions: [{
            transitionName: "Fade",
            transitionUuid: "transition-fade",
            transitionKind: "fade_transition",
            transitionFixed: false,
            transitionDuration: 300,
            transitionSettings: { color: "black" }
          }]
        }
      }
      if (requestType === "GetCurrentSceneTransition") {
        return {
          transitionName: "Fade",
          transitionUuid: "transition-fade",
          transitionKind: "fade_transition",
          transitionFixed: false,
          transitionDuration: 300,
          transitionConfigurable: true,
          transitionSettings: { color: "black" }
        }
      }
      return { transitionCursor: 1 }
    })

    await expect(executeTool(toolByName("list_transition_kinds"), {}, {
      config: { ...config, enabledToolsets: ["transitions"] },
      client: fakeClient
    })).resolves.toEqual({ transitionKinds: ["fade_transition"] })
    await expect(executeTool(toolByName("list_scene_transitions"), {}, {
      config: { ...config, enabledToolsets: ["transitions"] },
      client: fakeClient
    })).resolves.toEqual({
      currentSceneTransitionName: "Fade",
      currentSceneTransitionUuid: "transition-fade",
      currentSceneTransitionKind: "fade_transition",
      transitions: [{
        transitionName: "Fade",
        transitionUuid: "transition-fade",
        transitionKind: "fade_transition",
        transitionFixed: false,
        transitionDuration: 300
      }]
    })
    await expect(executeTool(toolByName("get_current_scene_transition"), {}, {
      config: { ...config, enabledToolsets: ["transitions"] },
      client: fakeClient
    })).resolves.toEqual({
      transitionName: "Fade",
      transitionUuid: "transition-fade",
      transitionKind: "fade_transition",
      transitionFixed: false,
      transitionDuration: 300,
      transitionConfigurable: true
    })
    await expect(executeTool(toolByName("get_current_scene_transition_cursor"), {}, {
      config: { ...config, enabledToolsets: ["transitions"] },
      client: fakeClient
    })).resolves.toEqual({ transitionCursor: 1 })
  })

  it("executes transition mutation handlers with structured output", async () => {
    const seenRequests: Array<readonly [string, unknown]> = []
    const fakeClient = clientWithData(async (requestType, requestData) => {
      seenRequests.push([requestType, requestData])
      return {}
    })

    await expect(executeTool(toolByName("set_current_scene_transition"), { transitionName: "Fade" }, {
      config: { ...config, enabledToolsets: ["transitions"] },
      client: fakeClient
    })).resolves.toEqual({ transitionName: "Fade", switched: true })
    await expect(executeTool(toolByName("set_current_scene_transition_duration"), { transitionDuration: 500 }, {
      config: { ...config, enabledToolsets: ["transitions"] },
      client: fakeClient
    })).resolves.toEqual({ transitionDuration: 500, acknowledged: true })
    await expect(executeTool(toolByName("set_current_scene_transition_settings"), {
      transitionSettings: { path: "left", speed: 0.5 },
      overlay: false
    }, {
      config: { ...config, enabledToolsets: ["transitions"] },
      client: fakeClient
    })).resolves.toEqual({ overlay: false, settingsFieldCount: 2, acknowledged: true })
    await expect(executeTool(toolByName("trigger_studio_mode_transition"), {}, {
      config: { ...config, enabledToolsets: ["transitions"] },
      client: fakeClient
    })).resolves.toEqual({ requestType: "TriggerStudioModeTransition", acknowledged: true })
    await expect(executeTool(toolByName("set_tbar_position"), { position: 0.75 }, {
      config: { ...config, enabledToolsets: ["transitions"] },
      client: fakeClient
    })).resolves.toEqual({ position: 0.75, release: true, acknowledged: true })
    expect(seenRequests).toEqual([
      ["SetCurrentSceneTransition", { transitionName: "Fade" }],
      ["SetCurrentSceneTransitionDuration", { transitionDuration: 500 }],
      ["SetCurrentSceneTransitionSettings", { transitionSettings: { path: "left", speed: 0.5 }, overlay: false }],
      ["TriggerStudioModeTransition", undefined],
      ["SetTBarPosition", { position: 0.75, release: true }]
    ])
  })

  it("maps transition mutation OBS errors to MCP errors with OBS status metadata", async () => {
    await expect(executeTool(toolByName("set_current_scene_transition"), {
      transitionName: "Missing"
    }, {
      config: { ...config, enabledToolsets: ["transitions"] },
      client: client(async () => {
        throw new ObsRequestError("SetCurrentSceneTransition", 404, "Transition not found")
      })
    })).rejects.toMatchObject({
      code: ErrorCode.InvalidParams,
      data: {
        requestType: "SetCurrentSceneTransition",
        obsStatusCode: 404,
        comment: "Transition not found"
      }
    })
  })

  it("maps config read and mutation OBS errors to MCP errors with OBS status metadata", async () => {
    await expect(executeTool(toolByName("get_profile_parameter"), {
      parameterCategory: "Missing",
      parameterName: "Value"
    }, {
      config: { ...config, enabledToolsets: ["config"] },
      client: client(async () => {
        throw new ObsRequestError("GetProfileParameter", 601, "Parameter category not found")
      })
    })).rejects.toMatchObject({
      code: ErrorCode.InvalidParams,
      data: {
        requestType: "GetProfileParameter",
        obsStatusCode: 601,
        comment: "Parameter category not found"
      }
    })
    await expect(executeTool(toolByName("set_current_profile"), {
      profileName: "Missing"
    }, {
      config: { ...config, enabledToolsets: ["config"] },
      client: client(async () => {
        throw new ObsRequestError("SetCurrentProfile", 601, "Profile not found")
      })
    })).rejects.toMatchObject({
      code: ErrorCode.InvalidParams,
      data: {
        requestType: "SetCurrentProfile",
        obsStatusCode: 601,
        comment: "Profile not found"
      }
    })
    await expect(executeTool(toolByName("set_video_settings"), {
      baseWidth: 1920,
      baseHeight: 1080
    }, {
      config: { ...config, enabledToolsets: ["config"] },
      client: client(async () => {
        throw new ObsRequestError("SetVideoSettings", 500, "Video output is active")
      })
    })).rejects.toMatchObject({
      code: ErrorCode.InvalidParams,
      data: {
        requestType: "SetVideoSettings",
        obsStatusCode: 500,
        comment: "Video output is active"
      }
    })
    await expect(executeTool(toolByName("set_stream_service_settings"), {
      streamServiceType: "rtmp_custom",
      streamServiceSettings: {
        server: "rtmp://example.invalid/live",
        key: "redacted-error-key"
      }
    }, {
      config: { ...config, enabledToolsets: ["config"] },
      client: client(async () => {
        throw new ObsRequestError("SetStreamServiceSettings", 500, "Stream output is active")
      })
    })).rejects.toMatchObject({
      code: ErrorCode.InvalidParams,
      data: {
        requestType: "SetStreamServiceSettings",
        obsStatusCode: 500,
        comment: "Stream output is active"
      }
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
