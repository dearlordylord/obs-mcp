import { ErrorCode, McpError } from "@modelcontextprotocol/sdk/types.js"
import { JSONSchema, Option, Schema } from "effect"
import { mkdtemp, rm } from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import { describe, expect, it } from "vitest"

import type { ObsConfig } from "../../src/config/config.js"
import {
  CreateSourceFilterInput,
  CreateSourceFilterOutput,
  ListSourceFilterKindsOutput,
  ListSourceFiltersOutput,
  ObsSetSourceFilterSettingsInput,
  SetSourceFilterEnabledInput,
  SetSourceFilterEnabledOutput,
  SetSourceFilterIndexInput,
  SetSourceFilterIndexOutput,
  SetSourceFilterNameInput,
  SetSourceFilterNameOutput,
  SetSourceFilterSettingsInput,
  SetSourceFilterSettingsOutput,
  SourceFilterAcknowledgedOutput,
  SourceFilterDefaultSettingsOutput,
  SourceFilterKindInput,
  SourceFilterLocatorInput,
  SourceFilterOutput
} from "../../src/domain/schemas/filters.js"
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
import {
  GetSourceScreenshotInput,
  GetSourceScreenshotOutput,
  SaveSourceScreenshotInput,
  SaveSourceScreenshotOutput
} from "../../src/domain/schemas/screenshots.js"
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

const filterToolNames = [
  "list_source_filter_kinds",
  "list_source_filters",
  "get_source_filter_default_settings",
  "get_source_filter",
  "create_source_filter",
  "remove_source_filter",
  "set_source_filter_settings",
  "set_source_filter_enabled",
  "set_source_filter_index",
  "set_source_filter_name"
]

const filterAvailableRequests = [
  "GetSourceFilterKindList",
  "GetSourceFilterList",
  "GetSourceFilterDefaultSettings",
  "GetSourceFilter",
  "CreateSourceFilter",
  "RemoveSourceFilter",
  "SetSourceFilterSettings",
  "SetSourceFilterEnabled",
  "SetSourceFilterIndex",
  "SetSourceFilterName"
] satisfies ReadonlyArray<ObsRequestType>

const screenshotToolNames = [
  "get_source_screenshot",
  "save_source_screenshot"
]

const screenshotAvailableRequests = [
  "GetSourceScreenshot",
  "SaveSourceScreenshot"
] satisfies ReadonlyArray<ObsRequestType>

const laneOwnedRequestPolicies = [
  { requestType: "GetInputAudioTracks", toolNames: ["get_input_audio_tracks"], policy: "implemented" },
  { requestType: "SetInputAudioTracks", toolNames: ["set_input_audio_tracks"], policy: "implemented" },
  { requestType: "GetInputDeinterlaceMode", toolNames: ["get_input_deinterlace_mode"], policy: "implemented" },
  { requestType: "SetInputDeinterlaceMode", toolNames: ["set_input_deinterlace_mode"], policy: "implemented" },
  {
    requestType: "GetInputDeinterlaceFieldOrder",
    toolNames: ["get_input_deinterlace_field_order"],
    policy: "implemented"
  },
  {
    requestType: "SetInputDeinterlaceFieldOrder",
    toolNames: ["set_input_deinterlace_field_order"],
    policy: "implemented"
  },
  { requestType: "GetInputDefaultSettings", toolNames: ["get_input_default_settings"], policy: "implemented" },
  { requestType: "GetInputSettings", toolNames: ["get_input_settings"], policy: "implemented" },
  {
    requestType: "GetInputPropertiesListPropertyItems",
    toolNames: ["get_input_properties_list_property_items"],
    policy: "implemented"
  },
  { requestType: "SetInputSettings", toolNames: ["set_input_settings"], policy: "implemented" },
  {
    requestType: "PressInputPropertiesButton",
    toolNames: ["press_input_properties_button"],
    policy: "implemented"
  },
  { requestType: "CreateInput", toolNames: ["create_input"], policy: "implemented" },
  { requestType: "RemoveInput", toolNames: ["remove_input"], policy: "implemented" },
  { requestType: "SetInputName", toolNames: ["set_input_name"], policy: "implemented" },
  { requestType: "GetSourceFilterKindList", toolNames: ["list_source_filter_kinds"], policy: "implemented" },
  { requestType: "GetSourceFilterList", toolNames: ["list_source_filters"], policy: "implemented" },
  {
    requestType: "GetSourceFilterDefaultSettings",
    toolNames: ["get_source_filter_default_settings"],
    policy: "implemented"
  },
  { requestType: "GetSourceFilter", toolNames: ["get_source_filter"], policy: "implemented" },
  { requestType: "CreateSourceFilter", toolNames: ["create_source_filter"], policy: "implemented" },
  { requestType: "RemoveSourceFilter", toolNames: ["remove_source_filter"], policy: "implemented" },
  { requestType: "SetSourceFilterSettings", toolNames: ["set_source_filter_settings"], policy: "implemented" },
  { requestType: "SetSourceFilterEnabled", toolNames: ["set_source_filter_enabled"], policy: "implemented" },
  { requestType: "SetSourceFilterIndex", toolNames: ["set_source_filter_index"], policy: "implemented" },
  { requestType: "SetSourceFilterName", toolNames: ["set_source_filter_name"], policy: "implemented" },
  { requestType: "GetSourceScreenshot", toolNames: ["get_source_screenshot"], policy: "implemented" },
  { requestType: "SaveSourceScreenshot", toolNames: ["save_source_screenshot"], policy: "implemented" }
] satisfies ReadonlyArray<{
  readonly requestType: ObsRequestType
  readonly toolNames: ReadonlyArray<string>
  readonly policy: "implemented" | "deferred"
}>

const laneOwnedToolNames = Array.from(
  new Set(laneOwnedRequestPolicies.flatMap((entry) => entry.toolNames))
)

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

const laneOwnedRequestTools = [
  ["GetCanvasList", "list_canvases", "canvases"],
  ["GetStudioModeEnabled", "get_studio_mode_enabled", "ui"],
  ["GetTransitionKindList", "list_transition_kinds", "transitions"],
  ["GetSceneTransitionList", "list_scene_transitions", "transitions"],
  ["GetCurrentSceneTransition", "get_current_scene_transition", "transitions"],
  ["GetCurrentSceneTransitionCursor", "get_current_scene_transition_cursor", "transitions"],
  ["SetCurrentSceneTransition", "set_current_scene_transition", "transitions"],
  ["SetCurrentSceneTransitionDuration", "set_current_scene_transition_duration", "transitions"],
  ["SetCurrentSceneTransitionSettings", "set_current_scene_transition_settings", "transitions"],
  ["TriggerStudioModeTransition", "trigger_studio_mode_transition", "transitions"],
  ["SetTBarPosition", "set_tbar_position", "transitions"],
  ["GetHotkeyList", "list_hotkeys", "general"],
  ["TriggerHotkeyByName", "trigger_hotkey_by_name", "general"],
  ["TriggerHotkeyByKeySequence", "trigger_hotkey_by_key_sequence", "general"],
  ["GetProfileList", "list_profiles", "config"],
  ["GetSceneCollectionList", "list_scene_collections", "config"],
  ["GetProfileParameter", "get_profile_parameter", "config"],
  ["GetRecordDirectory", "get_record_directory", "config"],
  ["SetRecordDirectory", "set_record_directory", "config"],
  ["GetVideoSettings", "get_video_settings", "config"],
  ["SetVideoSettings", "set_video_settings", "config"],
  ["GetStreamServiceSettings", "get_stream_service_settings", "config"],
  ["SetStreamServiceSettings", "set_stream_service_settings", "config"],
  ["SetCurrentProfile", "set_current_profile", "config"],
  ["CreateProfile", "create_profile", "config"],
  ["RemoveProfile", "remove_profile", "config"],
  ["SetCurrentSceneCollection", "set_current_scene_collection", "config"],
  ["CreateSceneCollection", "create_scene_collection", "config"],
  ["SetProfileParameter", "set_profile_parameter", "config"],
  ["OpenInputPropertiesDialog", "open_input_properties_dialog", "ui"],
  ["OpenInputFiltersDialog", "open_input_filters_dialog", "ui"],
  ["OpenInputInteractDialog", "open_input_interact_dialog", "ui"],
  ["GetMonitorList", "list_monitors", "ui"],
  ["OpenVideoMixProjector", "open_video_mix_projector", "ui"],
  ["OpenSourceProjector", "open_source_projector", "ui"]
] satisfies ReadonlyArray<readonly [ObsRequestType, string, string]>

const deferredLaneOwnedRequests = [{
  requestType: "SetStudioModeEnabled",
  reason:
    "Deferred intentionally: studio mode writes are not exposed as a public tool in this lane; transition triggering remains in the transitions toolset."
}] as const

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

const gatedToolsets = [
  { toolset: "events", tools: ["get_recent_obs_events"] },
  { toolset: "admin_raw", tools: ["get_persistent_data", "set_persistent_data"] },
  { toolset: "vendor", tools: ["call_vendor_request", "broadcast_custom_event"] },
  { toolset: "batch", tools: ["run_obs_request_batch"] }
] as const

const gatedToolNames = gatedToolsets.flatMap(({ tools }) => tools)
const neverPublicToolNames = [
  "sleep",
  "get_input_volume_meters",
  "get_high_volume_obs_events",
  "stream_obs_events",
  "call_raw_obs_request",
  "run_raw_obs_request_batch"
]

const eventClient = (events: ReturnType<ObsClient["getBufferedEvents"]>): ObsClient => ({
  negotiatedRpcVersion: 1,
  availableRequests: allAvailableRequests,
  request: async (descriptor) => Schema.decodeUnknownSync(descriptor.responseSchema)({}),
  requestBatch: async () => [],
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

  it("represents every studio-admin lane request with exactly one public tool or deferred note", () => {
    for (const [requestType, toolName] of laneOwnedRequestTools) {
      expect(allTools.filter((tool) => tool.requiredObsRequests.includes(requestType)).map((tool) => tool.name))
        .toEqual([toolName])
    }
    for (const { reason, requestType } of deferredLaneOwnedRequests) {
      expect(reason.length).toBeGreaterThan(0)
      expect(allTools.filter((tool) => tool.requiredObsRequests.includes(requestType)).map((tool) => tool.name))
        .toEqual([])
    }
    const laneRequestNames = [
      ...laneOwnedRequestTools.map(([requestType]) => requestType),
      ...deferredLaneOwnedRequests.map(({ requestType }) => requestType)
    ]
    expect(new Set(laneRequestNames).size).toBe(laneRequestNames.length)
    expect(new Set(laneOwnedRequestTools.map(([, toolName]) => toolName)).size).toBe(laneOwnedRequestTools.length)
    expect(allTools.map((tool) => tool.name)).not.toContain("send_raw_obs_request")
    expect(allTools.map((tool) => tool.name)).not.toContain("set_studio_mode_enabled")
  })

  it("capability-gates every studio-admin lane tool by its represented OBS request", () => {
    for (const [requestType, toolName, category] of laneOwnedRequestTools) {
      expect(getEnabledTools([category], [requestType]).map((tool) => tool.name)).toContain(toolName)
      expect(getEnabledTools([category], []).map((tool) => tool.name)).not.toContain(toolName)
    }
  })

  it("keeps opt-in studio-admin categories hidden from the default toolsets", () => {
    const defaultToolNames = getEnabledTools(config.enabledToolsets, allAvailableRequests).map((tool) => tool.name)
    for (const [, toolName, category] of laneOwnedRequestTools) {
      if (category !== "general") {
        expect(defaultToolNames).not.toContain(toolName)
      }
    }
  })

  it("exposes input discovery tools when the input toolset is enabled", () => {
    expect(getEnabledTools(["inputs"]).map((tool) => tool.name)).toEqual(inputToolNames)
  })

  it("exposes source filter read tools when the filter toolset is enabled", () => {
    expect(getEnabledTools(["filters"]).map((tool) => tool.name)).toEqual(filterToolNames)
  })

  it("exposes source screenshot tools when the screenshots toolset is enabled", () => {
    expect(getEnabledTools(["screenshots"]).map((tool) => tool.name)).toEqual(screenshotToolNames)
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

  it("keeps raw, vendor, custom, high-volume, and batch tools out of default toolsets", () => {
    const defaultToolNames = getEnabledTools(config.enabledToolsets, allAvailableRequests).map((tool) => tool.name)
    for (const toolName of gatedToolNames) {
      expect(defaultToolNames).not.toContain(toolName)
    }
    for (const toolName of neverPublicToolNames) {
      expect(allTools.map((tool) => tool.name)).not.toContain(toolName)
    }
  })

  it.each(gatedToolsets)("exposes $toolset tools only through explicit TOOLSETS opt-in", ({ tools, toolset }) => {
    expect(getEnabledTools([toolset], allAvailableRequests).map((tool) => tool.name)).toEqual([...tools])
    expect(getEnabledTools(["general"], allAvailableRequests).map((tool) => tool.name))
      .not.toEqual(expect.arrayContaining([...tools]))
  })

  it("exposes persistent data tools only when the admin_raw toolset and OBS capabilities are enabled", () => {
    expect(getEnabledTools(["admin_raw"], allAvailableRequests).map((tool) => tool.name)).toEqual([
      "get_persistent_data",
      "set_persistent_data"
    ])
    expect(getEnabledTools(config.enabledToolsets, allAvailableRequests).map((tool) => tool.name))
      .not.toContain("get_persistent_data")
    expect(
      getEnabledTools(["admin_raw"], allAvailableRequests.filter((request) => request !== "SetPersistentData"))
        .map((tool) => tool.name)
    )
      .toEqual(["get_persistent_data"])
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
    expect(getEnabledTools(["filters"], allAvailableRequests).map((tool) => tool.name)).toEqual(filterToolNames)
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
    expect(getEnabledTools(["filters"], allAvailableRequests).map((tool) => tool.name)).toEqual(filterToolNames)
    expect(getEnabledTools(["screenshots"], allAvailableRequests).map((tool) => tool.name))
      .toEqual(screenshotToolNames)
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
    for (const name of filterToolNames) {
      expect(sceneToolNames).not.toContain(name)
    }
    for (const name of screenshotToolNames) {
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
    expect(getEnabledTools(["filters"], filterAvailableRequests).map((tool) => tool.name)).toEqual(filterToolNames)
    expect(getEnabledTools(["filters"], ["GetSourceFilterList", "GetSourceFilter"]).map((tool) => tool.name)).toEqual([
      "list_source_filters",
      "get_source_filter"
    ])
    expect(getEnabledTools(["screenshots"], screenshotAvailableRequests).map((tool) => tool.name))
      .toEqual(screenshotToolNames)
    expect(getEnabledTools(["screenshots"], ["GetSourceScreenshot"]).map((tool) => tool.name))
      .toEqual(["get_source_screenshot"])
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

  it("keeps every lane-owned OBS request implemented or explicitly deferred by policy", () => {
    expect(laneOwnedRequestPolicies).not.toContainEqual(expect.objectContaining({ policy: "deferred" }))
    for (const entry of laneOwnedRequestPolicies) {
      for (const toolName of entry.toolNames) {
        const tool = toolByName(toolName)
        expect(tool.requiredObsRequests).toContain(entry.requestType)
      }
    }
  })

  it.each(laneOwnedToolNames)("capability-gates lane-owned tool %s", (toolName) => {
    const tool = toolByName(toolName)
    expect(tool.requiredObsRequests.length).toBeGreaterThan(0)
    expect(getEnabledTools([tool.category], []).map((entry) => entry.name)).not.toContain(toolName)
    expect(getEnabledTools([tool.category], tool.requiredObsRequests).map((entry) => entry.name))
      .toContain(toolName)
  })

  it.each([
    {
      toolName: "set_input_settings",
      input: { inputName: "Camera", inputSettings: { privatePath: "/tmp/secret" } }
    },
    {
      toolName: "create_input",
      input: {
        sceneName: "Scene",
        inputName: "Camera",
        inputKind: "ffmpeg_source",
        inputSettings: { privatePath: "/tmp/secret" }
      }
    },
    {
      toolName: "set_source_filter_settings",
      input: { sourceName: "Camera", filterName: "Color Correction", filterSettings: { privatePath: "/tmp/secret" } }
    },
    {
      toolName: "create_source_filter",
      input: {
        sourceName: "Camera",
        filterName: "Color Correction",
        filterKind: "color_filter_v2",
        filterSettings: { privatePath: "/tmp/secret" }
      }
    },
    {
      toolName: "get_source_screenshot",
      input: { sourceName: "Camera", imageFormat: "gif" }
    },
    {
      toolName: "save_source_screenshot",
      input: { sourceName: "Camera", imageFormat: "png", fileName: "../camera.png" }
    }
  ])("rejects broad raw passthrough for $toolName", ({ input, toolName }) => {
    expect(() => Schema.decodeUnknownSync(toolByName(toolName).inputSchema, { onExcessProperty: "error" })(input))
      .toThrow()
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

  it("executes source filter read handlers with sanitized structured output", async () => {
    const filterConfig: ObsConfig = { ...config, enabledToolsets: ["filters"] }
    const responses: Partial<Record<ObsRequestType, unknown>> = {
      GetSourceFilterKindList: { sourceFilterKinds: ["color_filter_v2", "gain_filter"] },
      GetSourceFilterList: {
        filters: [{
          filterName: "Color Correction",
          filterEnabled: true,
          filterIndex: 0,
          filterKind: "color_filter_v2",
          filterSettings: {
            brightness: 0.1,
            empty_value: null,
            nested_policy: { omitted: true },
            secret_path: "/tmp/private",
            unknown_value: undefined
          }
        }, {
          filterName: 10,
          filterEnabled: "yes",
          filterIndex: -1,
          filterKind: null,
          filterSettings: []
        }]
      },
      GetSourceFilterDefaultSettings: {
        defaultFilterSettings: {
          brightness: 0,
          enabled_by_default: true,
          nested_policy: { omitted: true }
        }
      },
      GetSourceFilter: {
        filterEnabled: true,
        filterIndex: 0,
        filterKind: "color_filter_v2",
        filterSettings: {
          brightness: 0.1,
          empty_value: null,
          nested_policy: { omitted: true },
          secret_path: "/tmp/private",
          unknown_value: undefined
        }
      }
    }
    const fakeClient = fakeObsClient(async (requestType) => responses[requestType] ?? {})
    const settings = [
      { settingName: "brightness", valueType: "number" },
      { settingName: "empty_value", valueType: "null" },
      { settingName: "nested_policy", valueType: "object" },
      { settingName: "secret_path", valueType: "string" },
      { settingName: "unknown_value", valueType: "unknown" }
    ]
    await expect(executeTool(toolByName("list_source_filter_kinds"), {}, {
      config: filterConfig,
      client: fakeClient
    })).resolves.toEqual({ sourceFilterKinds: ["color_filter_v2", "gain_filter"] })
    await expect(executeTool(toolByName("list_source_filters"), { sourceName: "Camera", canvasUuid: "canvas-main" }, {
      config: filterConfig,
      client: fakeClient
    })).resolves.toEqual({
      filters: [{
        filterName: "Color Correction",
        filterEnabled: true,
        filterIndex: 0,
        filterKind: "color_filter_v2",
        filterSettings: settings,
        rawSettingsDeferred: true
      }, {
        filterName: "filter-1",
        filterEnabled: false,
        filterIndex: 1,
        filterKind: "unknown_filter",
        filterSettings: [],
        rawSettingsDeferred: true
      }]
    })
    await expect(executeTool(toolByName("get_source_filter_default_settings"), {
      filterKind: "color_filter_v2"
    }, {
      config: filterConfig,
      client: fakeClient
    })).resolves.toEqual({
      filterKind: "color_filter_v2",
      defaultFilterSettings: [
        { settingName: "brightness", valueType: "number" },
        { settingName: "enabled_by_default", valueType: "boolean" },
        { settingName: "nested_policy", valueType: "object" }
      ],
      rawSettingsDeferred: true
    })
    await expect(executeTool(toolByName("get_source_filter"), {
      sourceUuid: "source-camera",
      filterName: "Color Correction"
    }, {
      config: filterConfig,
      client: fakeClient
    })).resolves.toEqual({
      filterName: "Color Correction",
      filterEnabled: true,
      filterIndex: 0,
      filterKind: "color_filter_v2",
      filterSettings: settings,
      rawSettingsDeferred: true
    })
    await expect(executeTool(toolByName("create_source_filter"), {
      sourceName: "Camera",
      filterName: "Boost",
      filterKind: "gain_filter",
      filterSettings: { db: 6 }
    }, {
      config: filterConfig,
      client: fakeClient
    })).resolves.toEqual({ filterName: "Boost", filterKind: "gain_filter", acknowledged: true })
    await expect(executeTool(toolByName("remove_source_filter"), {
      sourceName: "Camera",
      filterName: "Boost"
    }, {
      config: filterConfig,
      client: fakeClient
    })).resolves.toEqual({ filterName: "Boost", acknowledged: true })
    await expect(executeTool(toolByName("set_source_filter_settings"), {
      sourceName: "Camera",
      filterName: "Color Correction",
      filterSettings: { brightness: 0.2, colorMultiply: 4_294_967_295 },
      overlay: false
    }, {
      config: filterConfig,
      client: fakeClient
    })).resolves.toEqual({
      filterName: "Color Correction",
      filterSettings: { brightness: 0.2, colorMultiply: 4_294_967_295 },
      overlay: false,
      acknowledged: true
    })
    await expect(executeTool(toolByName("set_source_filter_enabled"), {
      sourceName: "Camera",
      filterName: "Color Correction",
      filterEnabled: false
    }, {
      config: filterConfig,
      client: fakeClient
    })).resolves.toEqual({ filterName: "Color Correction", filterEnabled: false, acknowledged: true })
    await expect(executeTool(toolByName("set_source_filter_index"), {
      sourceName: "Camera",
      filterName: "Color Correction",
      filterIndex: 1
    }, {
      config: filterConfig,
      client: fakeClient
    })).resolves.toEqual({ filterName: "Color Correction", filterIndex: 1, acknowledged: true })
    await expect(executeTool(toolByName("set_source_filter_name"), {
      sourceUuid: "source-camera",
      filterName: "Color Correction",
      newFilterName: "Primary Color"
    }, {
      config: filterConfig,
      client: fakeClient
    })).resolves.toEqual({ filterName: "Primary Color", acknowledged: true })
  })

  it("executes source screenshot handlers with bounded payload and save policy", async () => {
    const outputDirectory = await mkdtemp(path.join(os.tmpdir(), "obs-mcp-registry-screenshots-"))
    const screenshotConfig: ObsConfig = {
      ...config,
      enabledToolsets: ["screenshots"],
      screenshotOutputDirectory: outputDirectory
    }
    const requests: Array<{ requestType: ObsRequestType; requestData: unknown }> = []
    const fakeClient = fakeObsClient(async (requestType, requestData) => {
      requests.push({ requestType, requestData })
      if (requestType === "GetSourceScreenshot") {
        return { imageData: "data:image/png;base64,aW1hZ2U=" }
      }
      return {}
    })

    try {
      await expect(executeTool(toolByName("get_source_screenshot"), {
        sourceName: "Camera",
        imageFormat: "png",
        imageWidth: 320,
        imageHeight: 180,
        imageCompressionQuality: 80
      }, {
        config: screenshotConfig,
        client: fakeClient
      })).resolves.toEqual({
        imageFormat: "png",
        mimeType: "image/png",
        imageBytes: 5,
        maxImageBytes: 1_500_000,
        base64Data: "aW1hZ2U="
      })
      await expect(executeTool(toolByName("save_source_screenshot"), {
        sourceUuid: "source-camera",
        imageFormat: "png",
        fileName: "camera.png"
      }, {
        config: screenshotConfig,
        client: fakeClient
      })).resolves.toEqual({
        imageFilePath: path.join(outputDirectory, "camera.png"),
        imageFormat: "png",
        saved: true
      })
      await expect(executeTool(toolByName("save_source_screenshot"), {
        sourceName: "Camera",
        imageFormat: "png",
        fileName: "../camera.png"
      }, {
        config: screenshotConfig,
        client: fakeClient
      })).rejects.toThrow()
    } finally {
      await rm(outputDirectory, { force: true, recursive: true })
    }

    expect(requests).toEqual([{
      requestType: "GetSourceScreenshot",
      requestData: {
        sourceName: "Camera",
        imageFormat: "png",
        imageWidth: 320,
        imageHeight: 180,
        imageCompressionQuality: 80
      }
    }, {
      requestType: "SaveSourceScreenshot",
      requestData: {
        sourceUuid: "source-camera",
        imageFormat: "png",
        imageFilePath: path.join(outputDirectory, "camera.png")
      }
    }])
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
    await expect(executeTool(toolByName("open_source_projector"), {
      sourceUuid: "source-camera",
      canvasUuid: "canvas-program"
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

  it("enforces source filter schemas and locator boundaries", () => {
    expect(Schema.decodeUnknownSync(SourceFilterKindInput)({ filterKind: "color_filter_v2" }))
      .toEqual({ filterKind: "color_filter_v2" })
    expect(
      Schema.decodeUnknownSync(SourceFilterLocatorInput)({
        sourceName: "Camera",
        canvasUuid: "canvas-main",
        filterName: "Color Correction"
      })
    ).toEqual({
      sourceName: "Camera",
      canvasUuid: "canvas-main",
      filterName: "Color Correction"
    })
    expect(
      Schema.decodeUnknownSync(SourceFilterLocatorInput)({
        sourceUuid: "source-camera",
        filterName: "Color Correction"
      })
    ).toEqual({
      sourceUuid: "source-camera",
      filterName: "Color Correction"
    })
    expect(
      Schema.decodeUnknownSync(ListSourceFilterKindsOutput)({
        sourceFilterKinds: ["color_filter_v2"]
      })
    ).toEqual({ sourceFilterKinds: ["color_filter_v2"] })
    const filterOutput = {
      filterName: "Color Correction",
      filterEnabled: true,
      filterIndex: 0,
      filterKind: "color_filter_v2",
      filterSettings: [{ settingName: "brightness", valueType: "number" }],
      rawSettingsDeferred: true
    }
    expect(Schema.decodeUnknownSync(ListSourceFiltersOutput)({ filters: [filterOutput] }))
      .toEqual({ filters: [filterOutput] })
    expect(
      Schema.decodeUnknownSync(SourceFilterDefaultSettingsOutput)({
        filterKind: "color_filter_v2",
        defaultFilterSettings: [{ settingName: "brightness", valueType: "number" }],
        rawSettingsDeferred: true
      })
    ).toEqual({
      filterKind: "color_filter_v2",
      defaultFilterSettings: [{ settingName: "brightness", valueType: "number" }],
      rawSettingsDeferred: true
    })
    expect(Schema.decodeUnknownSync(SourceFilterOutput)(filterOutput)).toEqual(filterOutput)
    expect(
      Schema.decodeUnknownSync(CreateSourceFilterInput)({
        sourceName: "Camera",
        filterName: "Boost",
        filterKind: "gain_filter",
        filterSettings: { db: 6 }
      })
    ).toEqual({ sourceName: "Camera", filterName: "Boost", filterKind: "gain_filter", filterSettings: { db: 6 } })
    expect(
      Schema.decodeUnknownSync(CreateSourceFilterOutput)({
        filterName: "Boost",
        filterKind: "gain_filter",
        acknowledged: true
      })
    ).toEqual({ filterName: "Boost", filterKind: "gain_filter", acknowledged: true })
    expect(
      Schema.decodeUnknownSync(SourceFilterAcknowledgedOutput)({
        filterName: "Boost",
        acknowledged: true
      })
    ).toEqual({ filterName: "Boost", acknowledged: true })
    expect(
      Schema.decodeUnknownSync(SetSourceFilterSettingsInput)({
        sourceName: "Camera",
        filterName: "Color Correction",
        filterSettings: { brightness: 0.2, hueShift: 45 },
        overlay: false
      })
    ).toEqual({
      sourceName: "Camera",
      filterName: "Color Correction",
      filterSettings: { brightness: 0.2, hueShift: 45 },
      overlay: false
    })
    expect(
      Schema.decodeUnknownSync(SetSourceFilterSettingsOutput)({
        filterName: "Color Correction",
        filterSettings: { brightness: 0.2, hueShift: 45 },
        overlay: false,
        acknowledged: true
      })
    ).toEqual({
      filterName: "Color Correction",
      filterSettings: { brightness: 0.2, hueShift: 45 },
      overlay: false,
      acknowledged: true
    })
    expect(
      Schema.decodeUnknownSync(ObsSetSourceFilterSettingsInput)({
        sourceName: "Camera",
        filterName: "Color Correction",
        filterSettings: { brightness: 0.2 }
      })
    ).toEqual({
      sourceName: "Camera",
      filterName: "Color Correction",
      filterSettings: { brightness: 0.2 },
      overlay: true
    })
    expect(
      Schema.decodeUnknownSync(SetSourceFilterEnabledInput)({
        sourceName: "Camera",
        filterName: "Color Correction",
        filterEnabled: false
      })
    ).toEqual({ sourceName: "Camera", filterName: "Color Correction", filterEnabled: false })
    expect(
      Schema.decodeUnknownSync(SetSourceFilterEnabledOutput)({
        filterName: "Color Correction",
        filterEnabled: false,
        acknowledged: true
      })
    ).toEqual({ filterName: "Color Correction", filterEnabled: false, acknowledged: true })
    expect(
      Schema.decodeUnknownSync(SetSourceFilterIndexInput)({
        sourceUuid: "source-camera",
        filterName: "Color Correction",
        filterIndex: 1
      })
    ).toEqual({ sourceUuid: "source-camera", filterName: "Color Correction", filterIndex: 1 })
    expect(
      Schema.decodeUnknownSync(SetSourceFilterIndexOutput)({
        filterName: "Color Correction",
        filterIndex: 1,
        acknowledged: true
      })
    ).toEqual({ filterName: "Color Correction", filterIndex: 1, acknowledged: true })
    expect(
      Schema.decodeUnknownSync(SetSourceFilterNameInput)({
        sourceName: "Camera",
        filterName: "Color Correction",
        newFilterName: "Primary Color"
      })
    ).toEqual({ sourceName: "Camera", filterName: "Color Correction", newFilterName: "Primary Color" })
    expect(
      Schema.decodeUnknownSync(SetSourceFilterNameOutput)({
        filterName: "Primary Color",
        acknowledged: true
      })
    ).toEqual({ filterName: "Primary Color", acknowledged: true })
    expect(() => Schema.decodeUnknownSync(SourceFilterKindInput)({ filterKind: "" })).toThrow(
      "Expected a non empty string"
    )
    expect(() =>
      Schema.decodeUnknownSync(SourceFilterLocatorInput)({
        sourceName: "Camera",
        sourceUuid: "source-camera",
        filterName: "Color Correction"
      })
    ).toThrow("sourceName")
    expect(() =>
      Schema.decodeUnknownSync(SourceFilterLocatorInput)({
        sourceName: "Camera",
        filterName: ""
      })
    ).toThrow("Expected a non empty string")
    expect(() =>
      Schema.decodeUnknownSync(SetSourceFilterIndexInput)({
        sourceName: "Camera",
        filterName: "Color Correction",
        filterIndex: -1
      })
    ).toThrow("Expected a non-negative number")
    expect(() =>
      Schema.decodeUnknownSync(SetSourceFilterNameInput)({
        sourceName: "Camera",
        filterName: "Color Correction",
        newFilterName: ""
      })
    ).toThrow("Expected a non empty string")
    expect(() =>
      Schema.decodeUnknownSync(SetSourceFilterSettingsInput)({
        sourceName: "Camera",
        filterName: "Color Correction",
        filterSettings: { path: "/tmp/private" }
      })
    ).toThrow("At least one allowlisted filter setting is required")
    expect(() =>
      Schema.decodeUnknownSync(SetSourceFilterSettingsInput)({
        sourceName: "Camera",
        filterName: "Color Correction",
        filterSettings: { opacity: 2 }
      })
    ).toThrow("Expected a number less than or equal to 1")
  })

  it("enforces source screenshot schemas and bounded file policy", () => {
    const getInput = {
      sourceName: "Camera",
      imageFormat: "png",
      imageWidth: 320,
      imageHeight: 180,
      imageCompressionQuality: 80
    }
    expect(Schema.decodeUnknownSync(GetSourceScreenshotInput)(getInput)).toEqual(getInput)
    expect(
      Schema.decodeUnknownSync(GetSourceScreenshotOutput)({
        imageFormat: "png",
        mimeType: "image/png",
        imageBytes: 5,
        maxImageBytes: 1_500_000,
        base64Data: "aW1hZ2U="
      })
    ).toEqual({
      imageFormat: "png",
      mimeType: "image/png",
      imageBytes: 5,
      maxImageBytes: 1_500_000,
      base64Data: "aW1hZ2U="
    })
    expect(
      Schema.decodeUnknownSync(SaveSourceScreenshotInput)({
        sourceUuid: "source-camera",
        imageFormat: "jpg",
        fileName: "camera.jpg"
      })
    ).toEqual({
      sourceUuid: "source-camera",
      imageFormat: "jpg",
      fileName: "camera.jpg"
    })
    expect(
      Schema.decodeUnknownSync(SaveSourceScreenshotOutput)({
        imageFilePath: "/tmp/obs-mcp-screenshots/camera.jpg",
        imageFormat: "jpg",
        saved: true
      })
    ).toEqual({
      imageFilePath: "/tmp/obs-mcp-screenshots/camera.jpg",
      imageFormat: "jpg",
      saved: true
    })
    expect(() =>
      Schema.decodeUnknownSync(GetSourceScreenshotInput)({
        sourceName: "Camera",
        imageFormat: "gif"
      })
    ).toThrow()
    expect(() =>
      Schema.decodeUnknownSync(GetSourceScreenshotInput)({
        sourceName: "Camera",
        imageFormat: "png",
        imageWidth: 7
      })
    ).toThrow("Expected a number greater than or equal to 8")
    expect(() =>
      Schema.decodeUnknownSync(GetSourceScreenshotInput)({
        sourceName: "Camera",
        imageFormat: "png",
        imageCompressionQuality: 101
      })
    ).toThrow("Expected a number less than or equal to 100")
    expect(() =>
      Schema.decodeUnknownSync(SaveSourceScreenshotInput)({
        sourceName: "Camera",
        imageFormat: "png",
        fileName: "../camera.png"
      })
    ).toThrow()
    expect(() =>
      Schema.decodeUnknownSync(SaveSourceScreenshotInput)({
        sourceName: "Camera",
        imageFormat: "png",
        fileName: "."
      })
    ).toThrow()
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

  it("returns typed config and general OBS event summaries", async () => {
    await expect(executeTool(toolByName("get_recent_obs_events"), {
      order: "oldest_first",
      categories: ["config", "general"]
    }, {
      config: { ...config, enabledToolsets: ["events"] },
      client: eventClient({
        capacity: 3,
        droppedEvents: 0,
        events: [
          {
            sequence: 1,
            eventType: "CurrentSceneCollectionChanged",
            eventIntent: EventSubscription.Config,
            eventData: { sceneCollectionName: "Collection B" }
          },
          {
            sequence: 2,
            eventType: "ProfileListChanged",
            eventIntent: EventSubscription.Config,
            eventData: { profiles: ["Profile A", "Profile B"] }
          },
          {
            sequence: 3,
            eventType: "ExitStarted",
            eventIntent: EventSubscription.General,
            eventData: {}
          }
        ]
      })
    })).resolves.toEqual({
      capacity: 3,
      droppedEvents: 0,
      returnedEvents: 3,
      order: "oldest_first",
      events: [
        {
          sequence: 1,
          eventType: "CurrentSceneCollectionChanged",
          eventIntent: EventSubscription.Config,
          category: "config",
          eventData: { sceneCollectionName: "Collection B" }
        },
        {
          sequence: 2,
          eventType: "ProfileListChanged",
          eventIntent: EventSubscription.Config,
          category: "config",
          eventData: { profiles: ["Profile A", "Profile B"] }
        },
        {
          sequence: 3,
          eventType: "ExitStarted",
          eventIntent: EventSubscription.General,
          category: "general",
          eventData: {}
        }
      ]
    })
  })

  it("returns typed scene and scene-item OBS event summaries", async () => {
    await expect(executeTool(toolByName("get_recent_obs_events"), {
      order: "oldest_first",
      categories: ["scenes", "scene_items"]
    }, {
      config: { ...config, enabledToolsets: ["events"] },
      client: eventClient({
        capacity: 4,
        droppedEvents: 0,
        events: [
          {
            sequence: 1,
            eventType: "SceneCreated",
            eventIntent: EventSubscription.Scenes,
            eventData: { sceneName: "Program", sceneUuid: "scene-program", isGroup: false }
          },
          {
            sequence: 2,
            eventType: "CurrentPreviewSceneChanged",
            eventIntent: EventSubscription.Scenes,
            eventData: { sceneName: "Preview", sceneUuid: "scene-preview" }
          },
          {
            sequence: 3,
            eventType: "SceneItemCreated",
            eventIntent: EventSubscription.SceneItems,
            eventData: {
              sceneName: "Program",
              sceneUuid: "scene-program",
              sourceName: "Camera",
              sourceUuid: "source-camera",
              sceneItemId: 12,
              sceneItemIndex: 1
            }
          },
          {
            sequence: 4,
            eventType: "SceneItemListReindexed",
            eventIntent: EventSubscription.SceneItems,
            eventData: {
              sceneName: "Program",
              sceneUuid: "scene-program",
              sceneItems: [
                { sceneItemId: 12, sceneItemIndex: 0 },
                { sceneItemId: 13, sceneItemIndex: 1 }
              ]
            }
          }
        ]
      })
    })).resolves.toEqual({
      capacity: 4,
      droppedEvents: 0,
      returnedEvents: 4,
      order: "oldest_first",
      events: [
        {
          sequence: 1,
          eventType: "SceneCreated",
          eventIntent: EventSubscription.Scenes,
          category: "scenes",
          eventData: { sceneName: "Program", sceneUuid: "scene-program", isGroup: false }
        },
        {
          sequence: 2,
          eventType: "CurrentPreviewSceneChanged",
          eventIntent: EventSubscription.Scenes,
          category: "scenes",
          eventData: { sceneName: "Preview", sceneUuid: "scene-preview" }
        },
        {
          sequence: 3,
          eventType: "SceneItemCreated",
          eventIntent: EventSubscription.SceneItems,
          category: "scene_items",
          eventData: {
            sceneName: "Program",
            sceneUuid: "scene-program",
            sourceName: "Camera",
            sourceUuid: "source-camera",
            sceneItemId: 12,
            sceneItemIndex: 1
          }
        },
        {
          sequence: 4,
          eventType: "SceneItemListReindexed",
          eventIntent: EventSubscription.SceneItems,
          category: "scene_items",
          eventData: {
            sceneName: "Program",
            sceneUuid: "scene-program",
            sceneItems: [
              { sceneItemId: 12, sceneItemIndex: 0 },
              { sceneItemId: 13, sceneItemIndex: 1 }
            ]
          }
        }
      ]
    })
  })

  it("returns typed input and media-input OBS event summaries", async () => {
    await expect(executeTool(toolByName("get_recent_obs_events"), {
      order: "oldest_first",
      categories: ["inputs", "media_inputs"]
    }, {
      config: { ...config, enabledToolsets: ["events"] },
      client: eventClient({
        capacity: 5,
        droppedEvents: 0,
        events: [
          {
            sequence: 1,
            eventType: "InputNameChanged",
            eventIntent: EventSubscription.Inputs,
            eventData: { inputUuid: "input-camera", oldInputName: "Old Camera", inputName: "Camera" }
          },
          {
            sequence: 2,
            eventType: "InputAudioSyncOffsetChanged",
            eventIntent: EventSubscription.Inputs,
            eventData: { inputName: "Mic/Aux", inputUuid: "input-mic", inputAudioSyncOffset: 120 }
          },
          {
            sequence: 3,
            eventType: "InputAudioMonitorTypeChanged",
            eventIntent: EventSubscription.Inputs,
            eventData: {
              inputName: "Mic/Aux",
              inputUuid: "input-mic",
              monitorType: "OBS_MONITORING_TYPE_MONITOR_ONLY"
            }
          },
          {
            sequence: 4,
            eventType: "MediaInputPlaybackStarted",
            eventIntent: EventSubscription.MediaInputs,
            eventData: { inputName: "Media", inputUuid: "input-media" }
          },
          {
            sequence: 5,
            eventType: "MediaInputActionTriggered",
            eventIntent: EventSubscription.MediaInputs,
            eventData: {
              inputName: "Media",
              inputUuid: "input-media",
              mediaAction: "OBS_WEBSOCKET_MEDIA_INPUT_ACTION_STOP"
            }
          }
        ]
      })
    })).resolves.toEqual({
      capacity: 5,
      droppedEvents: 0,
      returnedEvents: 5,
      order: "oldest_first",
      events: [
        {
          sequence: 1,
          eventType: "InputNameChanged",
          eventIntent: EventSubscription.Inputs,
          category: "inputs",
          eventData: { inputUuid: "input-camera", oldInputName: "Old Camera", inputName: "Camera" }
        },
        {
          sequence: 2,
          eventType: "InputAudioSyncOffsetChanged",
          eventIntent: EventSubscription.Inputs,
          category: "inputs",
          eventData: { inputName: "Mic/Aux", inputUuid: "input-mic", inputAudioSyncOffset: 120 }
        },
        {
          sequence: 3,
          eventType: "InputAudioMonitorTypeChanged",
          eventIntent: EventSubscription.Inputs,
          category: "inputs",
          eventData: {
            inputName: "Mic/Aux",
            inputUuid: "input-mic",
            monitorType: "OBS_MONITORING_TYPE_MONITOR_ONLY"
          }
        },
        {
          sequence: 4,
          eventType: "MediaInputPlaybackStarted",
          eventIntent: EventSubscription.MediaInputs,
          category: "media_inputs",
          eventData: { inputName: "Media", inputUuid: "input-media" }
        },
        {
          sequence: 5,
          eventType: "MediaInputActionTriggered",
          eventIntent: EventSubscription.MediaInputs,
          category: "media_inputs",
          eventData: {
            inputName: "Media",
            inputUuid: "input-media",
            mediaAction: "OBS_WEBSOCKET_MEDIA_INPUT_ACTION_STOP"
          }
        }
      ]
    })
  })

  it("does not return input or media events with mismatched event intents", async () => {
    await expect(executeTool(toolByName("get_recent_obs_events"), { order: "oldest_first" }, {
      config: { ...config, enabledToolsets: ["events"] },
      client: eventClient({
        capacity: 3,
        droppedEvents: 0,
        events: [
          {
            sequence: 1,
            eventType: "InputNameChanged",
            eventIntent: EventSubscription.General,
            eventData: { inputUuid: "input-camera", oldInputName: "Old Camera", inputName: "Camera" }
          },
          {
            sequence: 2,
            eventType: "MediaInputPlaybackStarted",
            eventIntent: EventSubscription.Inputs,
            eventData: { inputName: "Media", inputUuid: "input-media" }
          },
          {
            sequence: 3,
            eventType: "InputNameChanged",
            eventIntent: EventSubscription.Inputs,
            eventData: { inputUuid: "input-camera", oldInputName: "Old Camera", inputName: "Camera" }
          }
        ]
      })
    })).resolves.toEqual({
      capacity: 3,
      droppedEvents: 0,
      returnedEvents: 1,
      order: "oldest_first",
      events: [{
        sequence: 3,
        eventType: "InputNameChanged",
        eventIntent: EventSubscription.Inputs,
        category: "inputs",
        eventData: { inputUuid: "input-camera", oldInputName: "Old Camera", inputName: "Camera" }
      }]
    })
  })

  it("returns typed output, transition, ui, canvas, and filter OBS event summaries", async () => {
    await expect(executeTool(toolByName("get_recent_obs_events"), {
      order: "oldest_first",
      categories: ["outputs", "transitions", "ui", "canvases", "filters"]
    }, {
      config: { ...config, enabledToolsets: ["events"] },
      client: eventClient({
        capacity: 5,
        droppedEvents: 0,
        events: [
          {
            sequence: 1,
            eventType: "RecordFileChanged",
            eventIntent: EventSubscription.Outputs,
            eventData: { newOutputPath: "/tmp/recording-2.mkv" }
          },
          {
            sequence: 2,
            eventType: "SceneTransitionVideoEnded",
            eventIntent: EventSubscription.Transitions,
            eventData: { transitionName: "Fade", transitionUuid: "transition-fade" }
          },
          {
            sequence: 3,
            eventType: "StudioModeStateChanged",
            eventIntent: EventSubscription.Ui,
            eventData: { studioModeEnabled: true }
          },
          {
            sequence: 4,
            eventType: "CanvasCreated",
            eventIntent: EventSubscription.Canvases,
            eventData: { canvasName: "Canvas A", canvasUuid: "canvas-a" }
          },
          {
            sequence: 5,
            eventType: "SourceFilterSettingsChanged",
            eventIntent: EventSubscription.Filters,
            eventData: { sourceName: "Camera", filterName: "Color" }
          }
        ]
      })
    })).resolves.toEqual({
      capacity: 5,
      droppedEvents: 0,
      returnedEvents: 5,
      order: "oldest_first",
      events: [
        {
          sequence: 1,
          eventType: "RecordFileChanged",
          eventIntent: EventSubscription.Outputs,
          category: "outputs",
          eventData: { newOutputPath: "/tmp/recording-2.mkv" }
        },
        {
          sequence: 2,
          eventType: "SceneTransitionVideoEnded",
          eventIntent: EventSubscription.Transitions,
          category: "transitions",
          eventData: { transitionName: "Fade", transitionUuid: "transition-fade" }
        },
        {
          sequence: 3,
          eventType: "StudioModeStateChanged",
          eventIntent: EventSubscription.Ui,
          category: "ui",
          eventData: { studioModeEnabled: true }
        },
        {
          sequence: 4,
          eventType: "CanvasCreated",
          eventIntent: EventSubscription.Canvases,
          category: "canvases",
          eventData: { canvasName: "Canvas A", canvasUuid: "canvas-a" }
        },
        {
          sequence: 5,
          eventType: "SourceFilterSettingsChanged",
          eventIntent: EventSubscription.Filters,
          category: "filters",
          eventData: { sourceName: "Camera", filterName: "Color" }
        }
      ]
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
      })
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

  it("executes persistent data handlers without echoing set slot values", async () => {
    const seenRequests: Array<{ readonly requestType: ObsRequestType; readonly requestData: unknown }> = []
    const client = fakeObsClient(async (requestType, requestData) => {
      seenRequests.push({ requestType, requestData })
      return requestType === "GetPersistentData"
        ? { slotValue: { token: "visible-on-read", flags: [true, null] } }
        : {}
    })
    const adminConfig: ObsConfig = { ...config, enabledToolsets: ["admin_raw"] }
    const locator = { realm: "OBS_WEBSOCKET_DATA_REALM_GLOBAL", slotName: "ralph.secret" }

    await expect(executeTool(toolByName("get_persistent_data"), locator, {
      config: adminConfig,
      client
    })).resolves.toEqual({
      ...locator,
      slotValue: { token: "visible-on-read", flags: [true, null] }
    })

    const setOutput = await executeTool(toolByName("set_persistent_data"), {
      ...locator,
      slotValue: { token: "s3cr3t", nested: ["ok"] }
    }, {
      config: adminConfig,
      client
    })

    expect(setOutput).toEqual({ ...locator, updated: true })
    expect(JSON.stringify(setOutput)).not.toContain("s3cr3t")
    expect(seenRequests).toContainEqual({
      requestType: "SetPersistentData",
      requestData: { ...locator, slotValue: { token: "s3cr3t", nested: ["ok"] } }
    })
  })

  it("rejects non JSON-safe persistent data values and invalid realms", async () => {
    await expect(executeTool(toolByName("set_persistent_data"), {
      realm: "OBS_WEBSOCKET_DATA_REALM_PROFILE",
      slotName: "bad",
      slotValue: { missing: undefined }
    }, {
      config: { ...config, enabledToolsets: ["admin_raw"] },
      client: fakeObsClient(async () => ({}))
    })).rejects.toMatchObject({ code: ErrorCode.InvalidParams })

    await expect(executeTool(toolByName("get_persistent_data"), {
      realm: "OBS_WEBSOCKET_DATA_REALM_VENDOR",
      slotName: "bad"
    }, {
      config: { ...config, enabledToolsets: ["admin_raw"] },
      client: fakeObsClient(async () => ({}))
    })).rejects.toMatchObject({ code: ErrorCode.InvalidParams })
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
