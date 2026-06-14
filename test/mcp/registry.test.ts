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
  GetSceneItemTransformOutput,
  SetSceneItemTransformInput
} from "../../src/domain/schemas/scene-item-transforms.js"
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
import { DEFAULT_AVAILABLE_REQUESTS } from "../obs/fake-obs-fixtures.js"
import { expectSchemaDecodeFailure } from "../support/effect-assertions.js"
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
const sceneCompositionRequestTools = [
  ["GetGroupList", "list_groups", "scenes"],
  ["GetCurrentPreviewScene", "get_current_preview_scene", "scenes"],
  ["SetCurrentPreviewScene", "set_current_preview_scene", "scenes"],
  ["CreateScene", "create_scene", "scenes"],
  ["RemoveScene", "remove_scene", "scenes"],
  ["SetSceneName", "set_scene_name", "scenes"],
  ["GetSceneSceneTransitionOverride", "get_scene_transition_override", "scenes"],
  ["SetSceneSceneTransitionOverride", "set_scene_transition_override", "scenes"],
  ["GetSceneItemTransform", "get_scene_item_transform", "scenes"],
  ["SetSceneItemTransform", "set_scene_item_transform", "scenes"],
  ["CreateSceneItem", "create_scene_item", "scenes"],
  ["RemoveSceneItem", "remove_scene_item", "scenes"],
  ["DuplicateSceneItem", "duplicate_scene_item", "scenes"],
  ["GetOutputList", "list_outputs", "outputs"],
  ["GetOutputStatus", "get_output_status", "outputs"],
  ["GetOutputSettings", "get_output_settings", "outputs"],
  ["SetOutputSettings", "set_output_settings", "outputs"],
  ["StartOutput", "start_output", "outputs"],
  ["StopOutput", "stop_output", "outputs"],
  ["ToggleOutput", "toggle_output", "outputs"]
] as const

const genericOutputToolNames = [
  "list_outputs",
  "get_output_status",
  "get_output_settings",
  "set_output_settings",
  "start_output",
  "stop_output",
  "toggle_output"
] as const

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
  "set_studio_mode_enabled",
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
  ["SetStudioModeEnabled", "set_studio_mode_enabled", "ui"],
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

const deferredLaneOwnedRequests: ReadonlyArray<{ readonly requestType: ObsRequestType; readonly reason: string }> = []

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

const eventToolNames = [
  "get_recent_obs_events",
  "confirm_obs_output_lifecycle",
  "confirm_obs_scene_graph_change",
  "confirm_obs_source_filter_change",
  "confirm_obs_media_input_workflow",
  "confirm_obs_transition_workflow",
  "confirm_obs_input_audio_change",
  "confirm_obs_input_identity_change",
  "confirm_obs_canvas_inventory_change",
  "confirm_obs_studio_mode_state_change",
  "confirm_obs_config_workflow"
] as const

const gatedToolsets = [
  { toolset: "events", tools: eventToolNames },
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
  "wait_for_obs_event",
  "subscribe_to_obs_event",
  "get_transition_events",
  "notifications_obs_event",
  "get_obs_event_resource",
  "call_raw_obs_request",
  "run_raw_obs_request_batch"
]

type EventClientSnapshot =
  & Omit<ReturnType<ObsClient["getBufferedEvents"]>, "oldestSequence" | "latestSequence" | "missedEvents">
  & Partial<Pick<ReturnType<ObsClient["getBufferedEvents"]>, "oldestSequence" | "latestSequence" | "missedEvents">>

const normalizeEventSnapshot = (
  snapshot: EventClientSnapshot,
  input: Parameters<ObsClient["getBufferedEvents"]>[0] = {}
): ReturnType<ObsClient["getBufferedEvents"]> => {
  const sinceSequence = input.sinceSequence
  const oldestSequence = snapshot.oldestSequence ?? snapshot.events[0]?.sequence ?? 0
  const latestSequence = snapshot.latestSequence ?? snapshot.events.at(-1)?.sequence ?? 0
  const missedEvents = snapshot.missedEvents ?? (
    sinceSequence !== undefined
    && oldestSequence > 0
    && sinceSequence < oldestSequence - 1
  )
  const events = sinceSequence === undefined
    ? snapshot.events
    : snapshot.events.filter((event) => event.sequence > sinceSequence)
  return { ...snapshot, oldestSequence, latestSequence, missedEvents, events }
}

const eventClient = (events: EventClientSnapshot): ObsClient => ({
  negotiatedRpcVersion: 1,
  availableRequests: allAvailableRequests,
  request: async (descriptor) => Schema.decodeUnknownSync(descriptor.responseSchema)({}),
  requestBatch: async () => [],
  getBufferedEvents: (input) => normalizeEventSnapshot(events, input),
  waitForBufferedEvent: async (match, options) => {
    const snapshot = normalizeEventSnapshot(events, { sinceSequence: options.afterSequence })
    const event = snapshot.events.find(match)
    return {
      timedOut: event === undefined,
      baselineSequence: options.afterSequence,
      snapshot,
      ...(event === undefined ? {} : { event })
    }
  },
  addEventListener: () => () => undefined,
  close: async () => undefined
})

describe("MCP tool registry", () => {
  it("exposes exactly the enabled tools by default", () => {
    expect(getEnabledTools(config.enabledToolsets).map((tool) => tool.name)).toEqual([
      ...generalToolNames,
      "list_scenes",
      "list_groups",
      "get_current_scene",
      "get_current_preview_scene",
      "set_current_scene",
      "set_current_preview_scene",
      "create_scene",
      "remove_scene",
      "set_scene_name",
      "get_scene_transition_override",
      "set_scene_transition_override",
      "list_scene_items",
      "list_group_scene_items",
      "create_scene_item",
      "remove_scene_item",
      "duplicate_scene_item",
      "get_scene_item_id",
      "get_scene_item_source",
      "get_scene_item_transform",
      "set_scene_item_transform",
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

  it("represents every scene composition/output lane-owned OBS request", () => {
    for (const [requestType, toolName] of sceneCompositionRequestTools) {
      expect(DEFAULT_AVAILABLE_REQUESTS).toContain(requestType)
      expect(allAvailableRequests).toContain(requestType)
      const tool = allTools.find((candidate) => candidate.name === toolName)
      expect(tool?.requiredObsRequests).toContain(requestType)
    }
  })

  it("keeps generic output tools separate from specialized output controls", () => {
    const genericRequests = new Set(
      genericOutputToolNames.flatMap((toolName) =>
        allTools.find((tool) => tool.name === toolName)?.requiredObsRequests ?? []
      )
    )
    const specializedToolNames = [
      "get_virtual_cam_status",
      "start_virtual_cam",
      "stop_virtual_cam",
      "toggle_virtual_cam",
      "get_replay_buffer_status",
      "start_replay_buffer",
      "stop_replay_buffer",
      "toggle_replay_buffer",
      "get_record_status",
      "start_record",
      "stop_record",
      "toggle_record",
      "get_stream_status",
      "start_stream",
      "stop_stream",
      "toggle_stream"
    ]
    for (const toolName of specializedToolNames) {
      const tool = allTools.find((candidate) => candidate.name === toolName)
      expect(tool?.requiredObsRequests.some((requestType) => genericRequests.has(requestType))).toBe(false)
    }
  })

  it("does not expose generic output tools outside the outputs toolset", () => {
    const defaultToolNames = getEnabledTools(config.enabledToolsets, allAvailableRequests).map((tool) => tool.name)
    const sceneToolNames = getEnabledTools(["scenes"], allAvailableRequests).map((tool) => tool.name)
    for (const toolName of genericOutputToolNames) {
      expect(defaultToolNames).not.toContain(toolName)
      expect(sceneToolNames).not.toContain(toolName)
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
      "list_outputs",
      "get_output_status",
      "get_output_settings",
      "set_output_settings",
      "start_output",
      "stop_output",
      "toggle_output",
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

  it("lists outputs and gets generic output status", async () => {
    await expect(executeTool(toolByName("list_outputs"), {}, {
      config,
      client: fakeObsClient(async (requestType, requestData) => {
        expect(requestType).toBe("GetOutputList")
        expect(requestData).toBeUndefined()
        return {
          outputs: [{ outputName: "adv_stream", outputKind: "rtmp_output", outputActive: true }]
        }
      })
    })).resolves.toEqual({
      outputs: [{ outputName: "adv_stream", outputKind: "rtmp_output", outputActive: true }]
    })
    await expect(executeTool(toolByName("get_output_status"), { outputName: "adv_stream" }, {
      config,
      client: fakeObsClient(async (requestType, requestData) => {
        expect(requestType).toBe("GetOutputStatus")
        expect(requestData).toEqual({ outputName: "adv_stream" })
        return {
          outputActive: true,
          outputReconnecting: false,
          outputTimecode: "00:00:12.345",
          outputDuration: 12345,
          outputCongestion: 0,
          outputBytes: 4096,
          outputSkippedFrames: 1,
          outputTotalFrames: 740
        }
      })
    })).resolves.toEqual({
      outputName: "adv_stream",
      outputActive: true,
      outputReconnecting: false,
      outputTimecode: "00:00:12.345",
      outputDuration: 12345,
      outputCongestion: 0,
      outputBytes: 4096,
      outputSkippedFrames: 1,
      outputTotalFrames: 740
    })
    await expect(executeTool(toolByName("get_output_status"), { outputName: "adv_stream" }, {
      config,
      client: fakeObsClient(async () => ({ outputActive: true }))
    })).rejects.toBeInstanceOf(McpError)
  })

  it("gets and sets sanitized generic output settings", async () => {
    const requests: Array<unknown> = []
    await expect(executeTool(toolByName("get_output_settings"), { outputName: "adv_file_output" }, {
      config,
      client: fakeObsClient(async (requestType, requestData) => {
        expect(requestType).toBe("GetOutputSettings")
        requests.push(requestData)
        return {
          outputSettings: {
            path: "/opaque/recordings",
            format_name: "mkv",
            stream_key: "<redacted>"
          }
        }
      })
    })).resolves.toEqual({
      outputName: "adv_file_output",
      outputSettings: {
        path: "/opaque/recordings",
        format_name: "mkv"
      }
    })
    await expect(executeTool(toolByName("set_output_settings"), {
      outputName: "adv_file_output",
      outputSettings: { max_time_sec: 60, replay_buffer: false }
    }, {
      config,
      client: fakeObsClient(async (requestType, requestData) => {
        expect(requestType).toBe("SetOutputSettings")
        requests.push(requestData)
        return {}
      })
    })).resolves.toEqual({
      outputName: "adv_file_output",
      outputSettings: { max_time_sec: 60, replay_buffer: false },
      updated: true
    })
    expect(requests).toEqual([
      { outputName: "adv_file_output" },
      { outputName: "adv_file_output", outputSettings: { max_time_sec: 60, replay_buffer: false } }
    ])
  })

  it("rejects unsupported generic output settings fields", async () => {
    await expect(executeTool(toolByName("set_output_settings"), {
      outputName: "adv_stream",
      outputSettings: { key: "<redacted>" }
    }, {
      config,
      client: fakeObsClient(async () => ({}))
    })).rejects.toBeInstanceOf(McpError)
    await expect(executeTool(toolByName("set_output_settings"), {
      outputName: "adv_stream",
      outputSettings: {}
    }, {
      config,
      client: fakeObsClient(async () => ({}))
    })).rejects.toBeInstanceOf(McpError)
  })

  it("maps generic output settings OBS errors with metadata", async () => {
    await expect(executeTool(toolByName("get_output_settings"), { outputName: "missing_output" }, {
      config,
      client: fakeObsClient(async () => {
        throw new ObsRequestError("GetOutputSettings", 600, "Output not found")
      })
    })).rejects.toMatchObject({
      code: ErrorCode.InvalidParams,
      data: {
        requestType: "GetOutputSettings",
        obsStatusCode: 600,
        comment: "Output not found"
      }
    })
  })

  it("starts, stops, and toggles generic outputs", async () => {
    const requests: Array<unknown> = []
    await expect(executeTool(toolByName("start_output"), { outputName: "adv_stream" }, {
      config,
      client: fakeObsClient(async (requestType, requestData) => {
        expect(requestType).toBe("StartOutput")
        requests.push(requestData)
        return {}
      })
    })).resolves.toEqual({ outputName: "adv_stream", outputActive: true, updated: true })
    await expect(executeTool(toolByName("stop_output"), { outputName: "adv_stream" }, {
      config,
      client: fakeObsClient(async (requestType, requestData) => {
        expect(requestType).toBe("StopOutput")
        requests.push(requestData)
        return {}
      })
    })).resolves.toEqual({ outputName: "adv_stream", outputActive: false, updated: true })
    await expect(executeTool(toolByName("toggle_output"), { outputName: "adv_stream" }, {
      config,
      client: fakeObsClient(async (requestType, requestData) => {
        expect(requestType).toBe("ToggleOutput")
        requests.push(requestData)
        return { outputActive: true }
      })
    })).resolves.toEqual({ outputName: "adv_stream", outputActive: true, updated: true })
    expect(requests).toEqual([
      { outputName: "adv_stream" },
      { outputName: "adv_stream" },
      { outputName: "adv_stream" }
    ])
  })

  it("maps generic output lifecycle OBS errors with metadata", async () => {
    await expect(executeTool(toolByName("start_output"), { outputName: "missing_output" }, {
      config,
      client: fakeObsClient(async () => {
        throw new ObsRequestError("StartOutput", 600, "Output not found")
      })
    })).rejects.toMatchObject({
      code: ErrorCode.InvalidParams,
      data: {
        requestType: "StartOutput",
        obsStatusCode: 600,
        comment: "Output not found"
      }
    })
    await expect(executeTool(toolByName("stop_output"), { outputName: "adv_stream" }, {
      config,
      client: fakeObsClient(async () => {
        throw new ObsRequestError("StopOutput", 500, "Output not active")
      })
    })).rejects.toMatchObject({
      code: ErrorCode.InvalidParams,
      data: {
        requestType: "StopOutput",
        obsStatusCode: 500,
        comment: "Output not active"
      }
    })
  })

  it("exposes recent safe OBS events only when the events toolset is enabled", () => {
    expect(getEnabledTools(["events"], allAvailableRequests).map((tool) => tool.name)).toEqual([...eventToolNames])
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
    expect(getEnabledTools(["record"], allAvailableRequests).map((tool) => tool.name)).not.toContain("create_scene")
  })

  it("filters tools by toolset category", () => {
    expect(getEnabledTools(["general"], allAvailableRequests).map((tool) => tool.name)).toEqual(generalToolNames)
    expect(getEnabledTools(["events"], allAvailableRequests).map((tool) => tool.name)).toEqual([...eventToolNames])
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
      "list_groups",
      "get_current_scene",
      "get_current_preview_scene",
      "set_current_scene",
      "set_current_preview_scene",
      "create_scene",
      "remove_scene",
      "set_scene_name",
      "get_scene_transition_override",
      "set_scene_transition_override",
      "list_scene_items",
      "list_group_scene_items",
      "create_scene_item",
      "remove_scene_item",
      "duplicate_scene_item",
      "get_scene_item_id",
      "get_scene_item_source",
      "get_scene_item_transform",
      "set_scene_item_transform",
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
      "list_outputs",
      "get_output_status",
      "get_output_settings",
      "set_output_settings",
      "start_output",
      "stop_output",
      "toggle_output",
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
    expectSchemaDecodeFailure(
      toolByName(toolName).inputSchema,
      input,
      /raw|privatePath|imageFormat|fileName/,
      { onExcessProperty: "error" }
    )
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
    expectSchemaDecodeFailure(
      SplitRecordFileOutput,
      { requestType: "CreateRecordChapter", acknowledged: true },
      /SplitRecordFile/
    )
    expect(
      Schema.decodeUnknownSync(CreateRecordChapterOutput)({
        requestType: "CreateRecordChapter",
        acknowledged: true
      })
    ).toEqual({ requestType: "CreateRecordChapter", acknowledged: true })
    expectSchemaDecodeFailure(
      StopRecordOutput,
      {
        requestType: "StopRecord",
        acknowledged: true
      },
      /outputPath/
    )
  })

  it("validates record chapter input schemas", () => {
    expect(Schema.decodeUnknownSync(CreateRecordChapterInput)({})).toEqual({})
    expect(Schema.decodeUnknownSync(CreateRecordChapterInput)({ chapterName: "Act 1" }))
      .toEqual({ chapterName: "Act 1" })
    expectSchemaDecodeFailure(CreateRecordChapterInput, { chapterName: "" }, /chapterName/)
  })

  it("validates stream caption input schemas", () => {
    expect(Schema.decodeUnknownSync(SendStreamCaptionInput)({ captionText: "Live caption" }))
      .toEqual({ captionText: "Live caption" })
    expectSchemaDecodeFailure(SendStreamCaptionInput, { captionText: "" }, /captionText/)
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

  it("executes group and studio mode preview scene handlers", async () => {
    await expect(executeTool(toolByName("list_groups"), {}, {
      config,
      client: fakeObsClient(async () => ({ groups: ["Group"] }))
    })).resolves.toEqual({ groups: ["Group"] })
    await expect(executeTool(toolByName("get_current_preview_scene"), {}, {
      config,
      client: fakeObsClient(async () => ({ sceneName: "Preview", sceneUuid: "scene-preview" }))
    })).resolves.toEqual({ sceneName: "Preview", sceneUuid: "scene-preview" })
    await expect(executeTool(toolByName("set_current_preview_scene"), { sceneUuid: "scene-preview" }, {
      config,
      client: fakeObsClient(async (_requestType, requestData) => {
        expect(requestData).toEqual({ sceneUuid: "scene-preview" })
        return {}
      })
    })).resolves.toEqual({ sceneUuid: "scene-preview", updated: true })
  })

  it("executes scene lifecycle handlers with structured request payloads", async () => {
    await expect(executeTool(toolByName("create_scene"), { sceneName: "Break" }, {
      config,
      client: fakeObsClient(async (requestType, requestData) => {
        expect(requestType).toBe("CreateScene")
        expect(requestData).toEqual({ sceneName: "Break" })
        return { sceneUuid: "scene-break" }
      })
    })).resolves.toEqual({ sceneName: "Break", sceneUuid: "scene-break", created: true })
    await expect(executeTool(toolByName("remove_scene"), { sceneName: "Break", canvasUuid: "canvas-main" }, {
      config,
      client: fakeObsClient(async (requestType, requestData) => {
        expect(requestType).toBe("RemoveScene")
        expect(requestData).toEqual({ sceneName: "Break", canvasUuid: "canvas-main" })
        return {}
      })
    })).resolves.toEqual({ sceneName: "Break", canvasUuid: "canvas-main", removed: true })
    await expect(executeTool(toolByName("set_scene_name"), {
      sceneName: "Break",
      canvasUuid: "canvas-main",
      newSceneName: "Intermission"
    }, {
      config,
      client: fakeObsClient(async (requestType, requestData) => {
        expect(requestType).toBe("SetSceneName")
        expect(requestData).toEqual({ sceneName: "Break", canvasUuid: "canvas-main", newSceneName: "Intermission" })
        return {}
      })
    })).resolves.toEqual({
      sceneName: "Break",
      canvasUuid: "canvas-main",
      newSceneName: "Intermission",
      renamed: true
    })
  })

  it("executes scene transition override handlers with structured request payloads", async () => {
    await expect(executeTool(toolByName("get_scene_transition_override"), {
      sceneName: "Intro",
      canvasUuid: "canvas-main"
    }, {
      config,
      client: fakeObsClient(async (requestType, requestData) => {
        expect(requestType).toBe("GetSceneSceneTransitionOverride")
        expect(requestData).toEqual({ sceneName: "Intro", canvasUuid: "canvas-main" })
        return { transitionName: null, transitionDuration: null }
      })
    })).resolves.toEqual({ transitionName: null, transitionDuration: null })
    await expect(executeTool(toolByName("set_scene_transition_override"), {
      sceneUuid: "scene-intro",
      transitionName: "Fade",
      transitionDuration: 300
    }, {
      config,
      client: fakeObsClient(async (requestType, requestData) => {
        expect(requestType).toBe("SetSceneSceneTransitionOverride")
        expect(requestData).toEqual({ sceneUuid: "scene-intro", transitionName: "Fade", transitionDuration: 300 })
        return {}
      })
    })).resolves.toEqual({
      sceneUuid: "scene-intro",
      transitionName: "Fade",
      transitionDuration: 300,
      updated: true
    })
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
      })).rejects.toThrow(/fileName/)
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
    await expect(executeTool(toolByName("set_studio_mode_enabled"), { studioModeEnabled: false }, {
      config: { ...config, enabledToolsets: ["ui"] },
      client: clientWithData(async (requestType, requestData) => {
        expect(requestType).toBe("SetStudioModeEnabled")
        expect(requestData).toEqual({ studioModeEnabled: false })
        return {}
      })
    })).resolves.toEqual({ requestType: "SetStudioModeEnabled", acknowledged: true })
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
    expectSchemaDecodeFailure(
      GetSourceScreenshotInput,
      {
        sourceName: "Camera",
        imageFormat: "gif"
      },
      /imageFormat/
    )
    expectSchemaDecodeFailure(
      GetSourceScreenshotInput,
      {
        sourceName: "Camera",
        imageFormat: "png",
        imageWidth: 7
      },
      /greater than or equal to 8/
    )
    expectSchemaDecodeFailure(
      GetSourceScreenshotInput,
      {
        sourceName: "Camera",
        imageFormat: "png",
        imageCompressionQuality: 101
      },
      /less than or equal to 100/
    )
    expectSchemaDecodeFailure(
      SaveSourceScreenshotInput,
      {
        sourceName: "Camera",
        imageFormat: "png",
        fileName: "../camera.png"
      },
      /fileName/
    )
    expectSchemaDecodeFailure(
      SaveSourceScreenshotInput,
      {
        sourceName: "Camera",
        imageFormat: "png",
        fileName: "."
      },
      /fileName/
    )
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
    await expect(
      executeTool(toolByName("create_scene"), { sceneName: "" }, {
        config,
        client: fakeObsClient(async () => ({}))
      })
    )
      .rejects.toBeInstanceOf(McpError)
    await expect(
      executeTool(toolByName("set_scene_name"), { sceneName: "Intro", newSceneName: "" }, {
        config,
        client: fakeObsClient(async () => ({}))
      })
    )
      .rejects.toBeInstanceOf(McpError)
    await expect(
      executeTool(toolByName("set_scene_transition_override"), {
        sceneName: "Intro",
        transitionName: ""
      }, {
        config,
        client: fakeObsClient(async () => ({}))
      })
    )
      .rejects.toBeInstanceOf(McpError)
    await expect(
      executeTool(toolByName("set_scene_transition_override"), {
        sceneName: "Intro",
        transitionDuration: 49
      }, {
        config,
        client: fakeObsClient(async () => ({}))
      })
    )
      .rejects.toBeInstanceOf(McpError)
    expect(() =>
      Schema.decodeUnknownSync(GetSceneItemTransformOutput)({
        sceneItemTransform: { positionX: "0", scaleX: 1, cropLeft: 0, cropToBounds: true }
      })
    ).toThrow("positionX")
    expect(() =>
      Schema.decodeUnknownSync(GetSceneItemTransformOutput)({
        sceneItemTransform: { positionX: 0, scaleX: 1, cropLeft: 0, cropToBounds: "true" }
      })
    ).toThrow("cropToBounds")
    expect(() =>
      Schema.decodeUnknownSync(SetSceneItemTransformInput)({
        sceneName: "Scene",
        sceneItemId: 42,
        sceneItemTransform: { positionX: 0, scaleX: "1", cropLeft: 0 }
      })
    ).toThrow("scaleX")
    expect(() =>
      Schema.decodeUnknownSync(SetSceneItemTransformInput)({
        sceneName: "Scene",
        sceneItemId: 42,
        sceneItemTransform: {}
      })
    ).toThrow("At least one settable scene item transform field is required")
    expect(() =>
      Schema.decodeUnknownSync(SetSceneItemTransformInput)({
        sceneName: "Scene",
        sceneItemId: 42,
        sceneItemTransform: { width: 1280 }
      })
    ).toThrow("At least one settable scene item transform field is required")
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

  it("returns recent event cursor metadata and filters by sinceSequence before ordering", async () => {
    await expect(executeTool(toolByName("get_recent_obs_events"), {
      order: "oldest_first",
      sinceSequence: 3
    }, {
      config: { ...config, enabledToolsets: ["events"] },
      client: eventClient({
        capacity: 3,
        droppedEvents: 2,
        events: [
          {
            sequence: 3,
            eventType: "CurrentProgramSceneChanged",
            eventIntent: EventSubscription.Scenes,
            eventData: { sceneName: "Scene 3", sceneUuid: "scene-3" }
          },
          {
            sequence: 4,
            eventType: "InputMuteStateChanged",
            eventIntent: EventSubscription.Inputs,
            eventData: { inputName: "Mic/Aux", inputUuid: "input-mic", inputMuted: true }
          },
          {
            sequence: 5,
            eventType: "RecordFileChanged",
            eventIntent: EventSubscription.Outputs,
            eventData: { newOutputPath: "/tmp/recording-5.mkv" }
          }
        ]
      })
    })).resolves.toEqual({
      capacity: 3,
      droppedEvents: 2,
      oldestSequence: 3,
      latestSequence: 5,
      missedEvents: false,
      returnedEvents: 2,
      order: "oldest_first",
      events: [
        {
          sequence: 4,
          eventType: "InputMuteStateChanged",
          eventIntent: EventSubscription.Inputs,
          category: "inputs",
          eventData: { inputName: "Mic/Aux", inputUuid: "input-mic", inputMuted: true }
        },
        {
          sequence: 5,
          eventType: "RecordFileChanged",
          eventIntent: EventSubscription.Outputs,
          category: "outputs",
          eventData: { newOutputPath: "/tmp/recording-5.mkv" }
        }
      ]
    })
  })

  it("reports missed events when sinceSequence is older than the retained event window", async () => {
    await expect(executeTool(toolByName("get_recent_obs_events"), { sinceSequence: 1 }, {
      config: { ...config, enabledToolsets: ["events"] },
      client: eventClient({
        capacity: 2,
        droppedEvents: 3,
        events: [
          {
            sequence: 3,
            eventType: "CurrentProgramSceneChanged",
            eventIntent: EventSubscription.Scenes,
            eventData: { sceneName: "Scene 3", sceneUuid: "scene-3" }
          },
          {
            sequence: 4,
            eventType: "CurrentPreviewSceneChanged",
            eventIntent: EventSubscription.Scenes,
            eventData: { sceneName: "Scene 4", sceneUuid: "scene-4" }
          }
        ]
      })
    })).resolves.toMatchObject({
      capacity: 2,
      droppedEvents: 3,
      oldestSequence: 3,
      latestSequence: 4,
      missedEvents: true,
      returnedEvents: 2
    })
  })

  it("accepts zero as a recent event cursor", async () => {
    await expect(executeTool(toolByName("get_recent_obs_events"), { sinceSequence: 0 }, {
      config: { ...config, enabledToolsets: ["events"] },
      client: eventClient({
        capacity: 1,
        droppedEvents: 0,
        events: [{
          sequence: 1,
          eventType: "CurrentProgramSceneChanged",
          eventIntent: EventSubscription.Scenes,
          eventData: { sceneName: "Scene 1", sceneUuid: "scene-1" }
        }]
      })
    })).resolves.toMatchObject({
      oldestSequence: 1,
      latestSequence: 1,
      missedEvents: false,
      returnedEvents: 1
    })
  })

  it("confirms typed output lifecycle outcomes after the requested sequence", async () => {
    await expect(executeTool(toolByName("confirm_obs_output_lifecycle"), {
      target: "record",
      outcome: "file_changed",
      afterSequence: 1,
      timeoutMs: 10
    }, {
      config: { ...config, enabledToolsets: ["events"] },
      client: eventClient({
        capacity: 2,
        droppedEvents: 0,
        events: [
          {
            sequence: 1,
            eventType: "RecordFileChanged",
            eventIntent: EventSubscription.Outputs,
            eventData: { newOutputPath: "/tmp/stale.mkv" }
          },
          {
            sequence: 2,
            eventType: "RecordFileChanged",
            eventIntent: EventSubscription.Outputs,
            eventData: { newOutputPath: "/tmp/current.mkv" }
          }
        ]
      })
    })).resolves.toEqual({
      confirmed: true,
      timedOut: false,
      baselineSequence: 1,
      latestSequence: 2,
      missedEvents: false,
      event: {
        sequence: 2,
        eventType: "RecordFileChanged",
        eventIntent: EventSubscription.Outputs,
        category: "outputs",
        target: "record",
        outcome: "file_changed",
        newOutputPath: "/tmp/current.mkv"
      }
    })
  })

  it("confirms each first-slice output lifecycle event type", async () => {
    const client = eventClient({
      capacity: 6,
      droppedEvents: 0,
      events: [
        {
          sequence: 1,
          eventType: "StreamStateChanged",
          eventIntent: EventSubscription.Outputs,
          eventData: { outputActive: true, outputState: "OBS_WEBSOCKET_OUTPUT_STARTED" }
        },
        {
          sequence: 2,
          eventType: "RecordStateChanged",
          eventIntent: EventSubscription.Outputs,
          eventData: {
            outputActive: false,
            outputState: "OBS_WEBSOCKET_OUTPUT_STOPPED",
            outputPath: null
          }
        },
        {
          sequence: 3,
          eventType: "RecordFileChanged",
          eventIntent: EventSubscription.Outputs,
          eventData: { newOutputPath: "/tmp/recording-3.mkv" }
        },
        {
          sequence: 4,
          eventType: "ReplayBufferStateChanged",
          eventIntent: EventSubscription.Outputs,
          eventData: { outputActive: true, outputState: "OBS_WEBSOCKET_OUTPUT_STARTED" }
        },
        {
          sequence: 5,
          eventType: "ReplayBufferSaved",
          eventIntent: EventSubscription.Outputs,
          eventData: { savedReplayPath: "/tmp/replay.mkv" }
        },
        {
          sequence: 6,
          eventType: "VirtualcamStateChanged",
          eventIntent: EventSubscription.Outputs,
          eventData: { outputActive: false, outputState: "OBS_WEBSOCKET_OUTPUT_STOPPED" }
        }
      ]
    })

    const cases = [
      { target: "stream", outcome: "started", afterSequence: 0, eventType: "StreamStateChanged" },
      { target: "record", outcome: "stopped", afterSequence: 1, eventType: "RecordStateChanged" },
      { target: "record", outcome: "file_changed", afterSequence: 2, eventType: "RecordFileChanged" },
      { target: "replay_buffer", outcome: "started", afterSequence: 3, eventType: "ReplayBufferStateChanged" },
      { target: "replay_buffer", outcome: "replay_saved", afterSequence: 4, eventType: "ReplayBufferSaved" },
      { target: "virtualcam", outcome: "stopped", afterSequence: 5, eventType: "VirtualcamStateChanged" }
    ] as const

    for (const entry of cases) {
      await expect(executeTool(toolByName("confirm_obs_output_lifecycle"), {
        target: entry.target,
        outcome: entry.outcome,
        afterSequence: entry.afterSequence,
        timeoutMs: 10
      }, {
        config: { ...config, enabledToolsets: ["events"] },
        client
      })).resolves.toMatchObject({
        confirmed: true,
        timedOut: false,
        latestSequence: 6,
        missedEvents: false,
        event: {
          eventType: entry.eventType,
          target: entry.target,
          outcome: entry.outcome
        }
      })
    }
  })

  it("preserves missed-event metadata during output lifecycle confirmation", async () => {
    await expect(executeTool(toolByName("confirm_obs_output_lifecycle"), {
      target: "record",
      outcome: "file_changed",
      afterSequence: 1,
      timeoutMs: 10
    }, {
      config: { ...config, enabledToolsets: ["events"] },
      client: eventClient({
        capacity: 2,
        droppedEvents: 3,
        events: [
          {
            sequence: 3,
            eventType: "StreamStateChanged",
            eventIntent: EventSubscription.Outputs,
            eventData: { outputActive: true, outputState: "OBS_WEBSOCKET_OUTPUT_STARTED" }
          },
          {
            sequence: 4,
            eventType: "RecordFileChanged",
            eventIntent: EventSubscription.Outputs,
            eventData: { newOutputPath: "/tmp/current.mkv" }
          }
        ]
      })
    })).resolves.toMatchObject({
      confirmed: true,
      timedOut: false,
      baselineSequence: 1,
      latestSequence: 4,
      missedEvents: true,
      event: {
        sequence: 4,
        eventType: "RecordFileChanged",
        outcome: "file_changed"
      }
    })
  })

  it("returns a bounded timeout result when no output lifecycle event matches", async () => {
    await expect(executeTool(toolByName("confirm_obs_output_lifecycle"), {
      target: "stream",
      outcome: "stopped",
      afterSequence: 1,
      timeoutMs: 1
    }, {
      config: { ...config, enabledToolsets: ["events"], connectionTimeoutMs: 5 },
      client: eventClient({
        capacity: 1,
        droppedEvents: 0,
        events: [{
          sequence: 1,
          eventType: "StreamStateChanged",
          eventIntent: EventSubscription.Outputs,
          eventData: { outputActive: true, outputState: "OBS_WEBSOCKET_OUTPUT_STARTED" }
        }]
      })
    })).resolves.toEqual({
      confirmed: false,
      timedOut: true,
      baselineSequence: 1,
      latestSequence: 1,
      missedEvents: false
    })
  })

  it("rejects raw event workflow inputs for output lifecycle confirmation", async () => {
    await expect(executeTool(toolByName("confirm_obs_output_lifecycle"), {
      target: "record",
      outcome: "stopped",
      afterSequence: 0,
      eventType: "RecordStateChanged"
    }, {
      config: { ...config, enabledToolsets: ["events"] },
      client: eventClient({ capacity: 1, droppedEvents: 0, events: [] })
    })).rejects.toBeInstanceOf(McpError)

    await expect(executeTool(toolByName("confirm_obs_output_lifecycle"), {
      target: "record",
      outcome: "OBS_WEBSOCKET_OUTPUT_STOPPED",
      afterSequence: 0
    }, {
      config: { ...config, enabledToolsets: ["events"] },
      client: eventClient({ capacity: 1, droppedEvents: 0, events: [] })
    })).rejects.toBeInstanceOf(McpError)

    await expect(executeTool(toolByName("confirm_obs_output_lifecycle"), {
      target: "stream",
      outcome: "replay_saved",
      afterSequence: 0
    }, {
      config: { ...config, enabledToolsets: ["events"] },
      client: eventClient({ capacity: 1, droppedEvents: 0, events: [] })
    })).rejects.toBeInstanceOf(McpError)
  })

  it("confirms each scene graph workflow event type", async () => {
    const client = eventClient({
      capacity: 10,
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
          eventType: "SceneRemoved",
          eventIntent: EventSubscription.Scenes,
          eventData: { sceneName: "Old Scene", sceneUuid: "scene-old", isGroup: false }
        },
        {
          sequence: 3,
          eventType: "SceneNameChanged",
          eventIntent: EventSubscription.Scenes,
          eventData: { oldSceneName: "Old Program", sceneName: "Program", sceneUuid: "scene-program" }
        },
        {
          sequence: 4,
          eventType: "CurrentProgramSceneChanged",
          eventIntent: EventSubscription.Scenes,
          eventData: { sceneName: "Program", sceneUuid: "scene-program" }
        },
        {
          sequence: 5,
          eventType: "CurrentPreviewSceneChanged",
          eventIntent: EventSubscription.Scenes,
          eventData: { sceneName: "Preview", sceneUuid: "scene-preview" }
        },
        {
          sequence: 6,
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
          sequence: 7,
          eventType: "SceneItemRemoved",
          eventIntent: EventSubscription.SceneItems,
          eventData: {
            sceneName: "Program",
            sceneUuid: "scene-program",
            sourceName: "Camera",
            sourceUuid: "source-camera",
            sceneItemId: 12
          }
        },
        {
          sequence: 8,
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
        },
        {
          sequence: 9,
          eventType: "SceneItemEnableStateChanged",
          eventIntent: EventSubscription.SceneItems,
          eventData: {
            sceneName: "Program",
            sceneUuid: "scene-program",
            sceneItemId: 12,
            sceneItemEnabled: true
          }
        },
        {
          sequence: 10,
          eventType: "SceneItemLockStateChanged",
          eventIntent: EventSubscription.SceneItems,
          eventData: {
            sceneName: "Program",
            sceneUuid: "scene-program",
            sceneItemId: 12,
            sceneItemLocked: true
          }
        }
      ]
    })
    const cases = [
      { target: "scene", outcome: "created", afterSequence: 0, eventType: "SceneCreated" },
      { target: "scene", outcome: "removed", afterSequence: 1, eventType: "SceneRemoved" },
      { target: "scene", outcome: "renamed", afterSequence: 2, eventType: "SceneNameChanged" },
      {
        target: "current_program_scene",
        outcome: "changed",
        afterSequence: 3,
        eventType: "CurrentProgramSceneChanged"
      },
      {
        target: "current_preview_scene",
        outcome: "changed",
        afterSequence: 4,
        eventType: "CurrentPreviewSceneChanged"
      },
      { target: "scene_item", outcome: "created", afterSequence: 5, eventType: "SceneItemCreated" },
      { target: "scene_item", outcome: "removed", afterSequence: 6, eventType: "SceneItemRemoved" },
      { target: "scene_item", outcome: "reordered", afterSequence: 7, eventType: "SceneItemListReindexed" },
      { target: "scene_item", outcome: "enabled", afterSequence: 8, eventType: "SceneItemEnableStateChanged" },
      { target: "scene_item", outcome: "locked", afterSequence: 9, eventType: "SceneItemLockStateChanged" }
    ] as const

    for (const entry of cases) {
      await expect(executeTool(toolByName("confirm_obs_scene_graph_change"), {
        target: entry.target,
        outcome: entry.outcome,
        afterSequence: entry.afterSequence,
        timeoutMs: 10
      }, {
        config: { ...config, enabledToolsets: ["events"] },
        client
      })).resolves.toMatchObject({
        confirmed: true,
        timedOut: false,
        latestSequence: 10,
        missedEvents: false,
        event: {
          eventType: entry.eventType,
          target: entry.target,
          outcome: entry.outcome
        }
      })
    }
  })

  it("narrows scene graph confirmations by identity filters and typed reindex contents", async () => {
    const client = eventClient({
      capacity: 4,
      droppedEvents: 0,
      events: [
        {
          sequence: 1,
          eventType: "SceneItemCreated",
          eventIntent: EventSubscription.SceneItems,
          eventData: {
            sceneName: "Program",
            sceneUuid: "scene-program",
            sourceName: "Camera A",
            sourceUuid: "source-a",
            sceneItemId: 12,
            sceneItemIndex: 0
          }
        },
        {
          sequence: 2,
          eventType: "SceneItemCreated",
          eventIntent: EventSubscription.SceneItems,
          eventData: {
            sceneName: "Program",
            sceneUuid: "scene-program",
            sourceName: "Camera B",
            sourceUuid: "source-b",
            sceneItemId: 13,
            sceneItemIndex: 1
          }
        },
        {
          sequence: 3,
          eventType: "SceneItemListReindexed",
          eventIntent: EventSubscription.SceneItems,
          eventData: {
            sceneName: "Program",
            sceneUuid: "scene-program",
            sceneItems: [{ sceneItemId: 12, sceneItemIndex: 0 }]
          }
        },
        {
          sequence: 4,
          eventType: "SceneItemListReindexed",
          eventIntent: EventSubscription.SceneItems,
          eventData: {
            sceneName: "Program",
            sceneUuid: "scene-program",
            sceneItems: [{ sceneItemId: 13, sceneItemIndex: 0 }]
          }
        }
      ]
    })

    await expect(executeTool(toolByName("confirm_obs_scene_graph_change"), {
      target: "scene_item",
      outcome: "created",
      afterSequence: 0,
      timeoutMs: 10,
      sceneName: "Program",
      sourceUuid: "source-b",
      sceneItemId: 13
    }, {
      config: { ...config, enabledToolsets: ["events"] },
      client
    })).resolves.toMatchObject({
      confirmed: true,
      event: { sequence: 2, sourceName: "Camera B", sceneItemId: 13 }
    })

    await expect(executeTool(toolByName("confirm_obs_scene_graph_change"), {
      target: "scene_item",
      outcome: "reordered",
      afterSequence: 0,
      timeoutMs: 10,
      sceneItemId: 13
    }, {
      config: { ...config, enabledToolsets: ["events"] },
      client
    })).resolves.toMatchObject({
      confirmed: true,
      event: {
        sequence: 4,
        sceneItems: [{ sceneItemId: 13, sceneItemIndex: 0 }]
      }
    })
  })

  it("maps scene item enable and lock booleans to workflow outcomes", async () => {
    const client = eventClient({
      capacity: 2,
      droppedEvents: 0,
      events: [
        {
          sequence: 1,
          eventType: "SceneItemEnableStateChanged",
          eventIntent: EventSubscription.SceneItems,
          eventData: {
            sceneName: "Program",
            sceneUuid: "scene-program",
            sceneItemId: 12,
            sceneItemEnabled: false
          }
        },
        {
          sequence: 2,
          eventType: "SceneItemLockStateChanged",
          eventIntent: EventSubscription.SceneItems,
          eventData: {
            sceneName: "Program",
            sceneUuid: "scene-program",
            sceneItemId: 12,
            sceneItemLocked: false
          }
        }
      ]
    })

    await expect(executeTool(toolByName("confirm_obs_scene_graph_change"), {
      target: "scene_item",
      outcome: "disabled",
      afterSequence: 0,
      timeoutMs: 10,
      sceneItemId: 12
    }, {
      config: { ...config, enabledToolsets: ["events"] },
      client
    })).resolves.toMatchObject({
      confirmed: true,
      event: { eventType: "SceneItemEnableStateChanged", outcome: "disabled", sceneItemEnabled: false }
    })

    await expect(executeTool(toolByName("confirm_obs_scene_graph_change"), {
      target: "scene_item",
      outcome: "unlocked",
      afterSequence: 1,
      timeoutMs: 10,
      sceneItemId: 12
    }, {
      config: { ...config, enabledToolsets: ["events"] },
      client
    })).resolves.toMatchObject({
      confirmed: true,
      event: { eventType: "SceneItemLockStateChanged", outcome: "unlocked", sceneItemLocked: false }
    })
  })

  it("preserves missed-event metadata during scene graph confirmation", async () => {
    await expect(executeTool(toolByName("confirm_obs_scene_graph_change"), {
      target: "scene",
      outcome: "created",
      afterSequence: 1,
      timeoutMs: 10,
      sceneName: "Program"
    }, {
      config: { ...config, enabledToolsets: ["events"] },
      client: eventClient({
        capacity: 2,
        droppedEvents: 3,
        events: [
          {
            sequence: 3,
            eventType: "CurrentProgramSceneChanged",
            eventIntent: EventSubscription.Scenes,
            eventData: { sceneName: "Program", sceneUuid: "scene-program" }
          },
          {
            sequence: 4,
            eventType: "SceneCreated",
            eventIntent: EventSubscription.Scenes,
            eventData: { sceneName: "Program", sceneUuid: "scene-program", isGroup: false }
          }
        ]
      })
    })).resolves.toMatchObject({
      confirmed: true,
      timedOut: false,
      baselineSequence: 1,
      latestSequence: 4,
      missedEvents: true,
      event: { sequence: 4, eventType: "SceneCreated" }
    })
  })

  it("times out scene graph confirmation when no included event matches", async () => {
    await expect(executeTool(toolByName("confirm_obs_scene_graph_change"), {
      target: "scene",
      outcome: "created",
      afterSequence: 0,
      timeoutMs: 1
    }, {
      config: { ...config, enabledToolsets: ["events"], connectionTimeoutMs: 5 },
      client: eventClient({
        capacity: 1,
        droppedEvents: 0,
        events: [{
          sequence: 1,
          eventType: "CurrentProgramSceneChanged",
          eventIntent: EventSubscription.Scenes,
          eventData: { sceneName: "Program", sceneUuid: "scene-program" }
        }]
      })
    })).resolves.toEqual({
      confirmed: false,
      timedOut: true,
      baselineSequence: 0,
      latestSequence: 1,
      missedEvents: false
    })
  })

  it("does not let excluded or raw events satisfy scene graph confirmation", async () => {
    await expect(executeTool(toolByName("confirm_obs_scene_graph_change"), {
      target: "scene",
      outcome: "created",
      afterSequence: 0,
      timeoutMs: 1
    }, {
      config: { ...config, enabledToolsets: ["events"], connectionTimeoutMs: 5 },
      client: eventClient({
        capacity: 5,
        droppedEvents: 0,
        events: [
          {
            sequence: 1,
            eventType: "SceneListChanged",
            eventIntent: EventSubscription.Scenes,
            eventData: { scenes: [{ sceneName: "Program", sceneUuid: "scene-program", sceneIndex: 0 }] }
          },
          {
            sequence: 2,
            eventType: "SceneItemSelected",
            eventIntent: EventSubscription.SceneItems,
            eventData: { sceneName: "Program", sceneUuid: "scene-program", sceneItemId: 12 }
          },
          {
            sequence: 3,
            eventType: "SceneItemTransformChanged",
            eventIntent: EventSubscription.SceneItems,
            eventData: { sceneName: "Program", sceneUuid: "scene-program", sceneItemId: 12 }
          },
          {
            sequence: 4,
            eventType: "VendorEvent",
            eventIntent: EventSubscription.Vendors,
            eventData: { vendorName: "plugin", payload: { raw: true } }
          },
          {
            sequence: 5,
            eventType: "CustomEvent",
            eventIntent: EventSubscription.General,
            eventData: { raw: true }
          }
        ]
      })
    })).resolves.toMatchObject({
      confirmed: false,
      timedOut: true,
      latestSequence: 5
    })
  })

  it("rejects invalid scene graph confirmation input through schema validation", async () => {
    await expect(executeTool(toolByName("confirm_obs_scene_graph_change"), {
      target: "scene_item",
      outcome: "enabled",
      afterSequence: 0,
      sourceName: "Camera"
    }, {
      config: { ...config, enabledToolsets: ["events"] },
      client: eventClient({ capacity: 1, droppedEvents: 0, events: [] })
    })).rejects.toBeInstanceOf(McpError)

    await expect(executeTool(toolByName("confirm_obs_scene_graph_change"), {
      target: "scene",
      outcome: "created",
      afterSequence: 0,
      eventType: "SceneCreated"
    }, {
      config: { ...config, enabledToolsets: ["events"] },
      client: eventClient({ capacity: 1, droppedEvents: 0, events: [] })
    })).rejects.toBeInstanceOf(McpError)
  })

  it("confirms each source filter workflow event type", async () => {
    const client = eventClient({
      capacity: 7,
      droppedEvents: 0,
      events: [
        {
          sequence: 1,
          eventType: "SourceFilterCreated",
          eventIntent: EventSubscription.Filters,
          eventData: { sourceName: "Camera", filterName: "Color", filterKind: "color_filter", filterIndex: 0 }
        },
        {
          sequence: 2,
          eventType: "SourceFilterRemoved",
          eventIntent: EventSubscription.Filters,
          eventData: { sourceName: "Camera", filterName: "Old Color" }
        },
        {
          sequence: 3,
          eventType: "SourceFilterNameChanged",
          eventIntent: EventSubscription.Filters,
          eventData: { sourceName: "Camera", oldFilterName: "Blur Old", filterName: "Blur" }
        },
        {
          sequence: 4,
          eventType: "SourceFilterListReindexed",
          eventIntent: EventSubscription.Filters,
          eventData: {
            sourceName: "Camera",
            filters: [
              { filterName: "Blur", filterIndex: 0 },
              { filterName: "Color", filterIndex: 1 }
            ]
          }
        },
        {
          sequence: 5,
          eventType: "SourceFilterEnableStateChanged",
          eventIntent: EventSubscription.Filters,
          eventData: { sourceName: "Camera", filterName: "Color", filterEnabled: true }
        },
        {
          sequence: 6,
          eventType: "SourceFilterEnableStateChanged",
          eventIntent: EventSubscription.Filters,
          eventData: { sourceName: "Camera", filterName: "Color", filterEnabled: false }
        },
        {
          sequence: 7,
          eventType: "SourceFilterSettingsChanged",
          eventIntent: EventSubscription.Filters,
          eventData: { sourceName: "Camera", filterName: "Color" }
        }
      ]
    })
    const cases = [
      { outcome: "created", afterSequence: 0, eventType: "SourceFilterCreated" },
      { outcome: "removed", afterSequence: 1, eventType: "SourceFilterRemoved" },
      { outcome: "renamed", afterSequence: 2, eventType: "SourceFilterNameChanged" },
      { outcome: "reordered", afterSequence: 3, eventType: "SourceFilterListReindexed" },
      { outcome: "enabled", afterSequence: 4, eventType: "SourceFilterEnableStateChanged" },
      { outcome: "disabled", afterSequence: 5, eventType: "SourceFilterEnableStateChanged" },
      { outcome: "settings_changed", afterSequence: 6, eventType: "SourceFilterSettingsChanged" }
    ] as const

    for (const entry of cases) {
      await expect(executeTool(toolByName("confirm_obs_source_filter_change"), {
        target: "source_filter",
        outcome: entry.outcome,
        afterSequence: entry.afterSequence,
        timeoutMs: 10
      }, {
        config: { ...config, enabledToolsets: ["events"] },
        client
      })).resolves.toMatchObject({
        confirmed: true,
        timedOut: false,
        latestSequence: 7,
        missedEvents: false,
        event: {
          eventType: entry.eventType,
          target: "source_filter",
          outcome: entry.outcome,
          category: "filters"
        }
      })
    }
  })

  it("narrows source filter confirmations by identity filters and reindexed same-item matching", async () => {
    const client = eventClient({
      capacity: 4,
      droppedEvents: 0,
      events: [
        {
          sequence: 1,
          eventType: "SourceFilterCreated",
          eventIntent: EventSubscription.Filters,
          eventData: { sourceName: "Camera A", filterName: "Color", filterKind: "color_filter", filterIndex: 0 }
        },
        {
          sequence: 2,
          eventType: "SourceFilterCreated",
          eventIntent: EventSubscription.Filters,
          eventData: { sourceName: "Camera B", filterName: "Gain", filterKind: "gain_filter", filterIndex: 1 }
        },
        {
          sequence: 3,
          eventType: "SourceFilterListReindexed",
          eventIntent: EventSubscription.Filters,
          eventData: {
            sourceName: "Camera A",
            filters: [
              { filterName: "Color", filterIndex: 0 },
              { filterName: "Gain", filterIndex: 1 }
            ]
          }
        },
        {
          sequence: 4,
          eventType: "SourceFilterListReindexed",
          eventIntent: EventSubscription.Filters,
          eventData: {
            sourceName: "Camera A",
            filters: [
              { filterName: "Gain", filterIndex: 0 },
              { filterName: "Color", filterIndex: 1 }
            ]
          }
        }
      ]
    })

    await expect(executeTool(toolByName("confirm_obs_source_filter_change"), {
      target: "source_filter",
      outcome: "created",
      afterSequence: 0,
      timeoutMs: 10,
      sourceName: "Camera B",
      filterName: "Gain",
      filterKind: "gain_filter",
      filterIndex: 1
    }, {
      config: { ...config, enabledToolsets: ["events"] },
      client
    })).resolves.toMatchObject({
      confirmed: true,
      event: { sequence: 2, sourceName: "Camera B", filterName: "Gain", filterKind: "gain_filter", filterIndex: 1 }
    })

    await expect(executeTool(toolByName("confirm_obs_source_filter_change"), {
      target: "source_filter",
      outcome: "reordered",
      afterSequence: 0,
      timeoutMs: 10,
      sourceName: "Camera A",
      filterName: "Color",
      filterIndex: 1
    }, {
      config: { ...config, enabledToolsets: ["events"] },
      client
    })).resolves.toMatchObject({
      confirmed: true,
      event: {
        sequence: 4,
        filters: [
          { filterName: "Gain", filterIndex: 0 },
          { filterName: "Color", filterIndex: 1 }
        ]
      }
    })
  })

  it("omits raw source filter settings from workflow confirmations and reports omission markers", async () => {
    const client = eventClient({
      capacity: 2,
      droppedEvents: 0,
      events: [
        {
          sequence: 1,
          eventType: "SourceFilterCreated",
          eventIntent: EventSubscription.Filters,
          eventData: { sourceName: "Camera", filterName: "Color", filterKind: "color_filter", filterIndex: 0 }
        },
        {
          sequence: 2,
          eventType: "SourceFilterSettingsChanged",
          eventIntent: EventSubscription.Filters,
          eventData: { sourceName: "Camera", filterName: "Color" }
        }
      ]
    })

    await expect(executeTool(toolByName("confirm_obs_source_filter_change"), {
      target: "source_filter",
      outcome: "created",
      afterSequence: 0,
      timeoutMs: 10
    }, {
      config: { ...config, enabledToolsets: ["events"] },
      client
    })).resolves.toMatchObject({
      confirmed: true,
      event: {
        rawSettingsOmitted: true,
        defaultSettingsOmitted: true
      }
    })

    await expect(executeTool(toolByName("confirm_obs_source_filter_change"), {
      target: "source_filter",
      outcome: "settings_changed",
      afterSequence: 1,
      timeoutMs: 10
    }, {
      config: { ...config, enabledToolsets: ["events"] },
      client
    })).resolves.toMatchObject({
      confirmed: true,
      event: {
        rawSettingsOmitted: true
      }
    })
  })

  it("preserves missed-event metadata during source filter confirmation", async () => {
    await expect(executeTool(toolByName("confirm_obs_source_filter_change"), {
      target: "source_filter",
      outcome: "created",
      afterSequence: 1,
      timeoutMs: 10,
      sourceName: "Camera"
    }, {
      config: { ...config, enabledToolsets: ["events"] },
      client: eventClient({
        capacity: 2,
        droppedEvents: 3,
        events: [
          {
            sequence: 3,
            eventType: "SourceFilterRemoved",
            eventIntent: EventSubscription.Filters,
            eventData: { sourceName: "Camera", filterName: "Old Color" }
          },
          {
            sequence: 4,
            eventType: "SourceFilterCreated",
            eventIntent: EventSubscription.Filters,
            eventData: { sourceName: "Camera", filterName: "Color", filterKind: "color_filter", filterIndex: 0 }
          }
        ]
      })
    })).resolves.toMatchObject({
      confirmed: true,
      timedOut: false,
      baselineSequence: 1,
      latestSequence: 4,
      missedEvents: true,
      event: { sequence: 4, eventType: "SourceFilterCreated" }
    })
  })

  it("times out source filter confirmation when no included event matches", async () => {
    await expect(executeTool(toolByName("confirm_obs_source_filter_change"), {
      target: "source_filter",
      outcome: "created",
      afterSequence: 0,
      timeoutMs: 1
    }, {
      config: { ...config, enabledToolsets: ["events"], connectionTimeoutMs: 5 },
      client: eventClient({
        capacity: 1,
        droppedEvents: 0,
        events: [{
          sequence: 1,
          eventType: "SourceFilterRemoved",
          eventIntent: EventSubscription.Filters,
          eventData: { sourceName: "Camera", filterName: "Color" }
        }]
      })
    })).resolves.toEqual({
      confirmed: false,
      timedOut: true,
      baselineSequence: 0,
      latestSequence: 1,
      missedEvents: false
    })
  })

  it("does not let unrelated events satisfy source filter confirmation", async () => {
    await expect(executeTool(toolByName("confirm_obs_source_filter_change"), {
      target: "source_filter",
      outcome: "created",
      afterSequence: 0,
      timeoutMs: 1
    }, {
      config: { ...config, enabledToolsets: ["events"], connectionTimeoutMs: 5 },
      client: eventClient({
        capacity: 3,
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
            eventType: "SourceFilterCreated",
            eventIntent: EventSubscription.Scenes,
            eventData: { sourceName: "Camera", filterName: "Color", filterKind: "color_filter", filterIndex: 0 }
          },
          {
            sequence: 3,
            eventType: "VendorEvent",
            eventIntent: EventSubscription.Vendors,
            eventData: { vendorName: "plugin", payload: { raw: true } }
          }
        ]
      })
    })).resolves.toMatchObject({
      confirmed: false,
      timedOut: true,
      latestSequence: 3
    })
  })

  it("rejects invalid source filter confirmation input through schema validation", async () => {
    for (
      const input of [
        {
          target: "source_filter",
          outcome: "created",
          afterSequence: 0,
          filterSettings: { secret: true }
        },
        {
          target: "source_filter",
          outcome: "enabled",
          afterSequence: 0,
          filterEnabled: true
        },
        {
          target: "source_filter",
          outcome: "reordered",
          afterSequence: 0,
          filterIndex: Number.MAX_SAFE_INTEGER + 1
        }
      ] as const
    ) {
      await expect(executeTool(toolByName("confirm_obs_source_filter_change"), input, {
        config: { ...config, enabledToolsets: ["events"] },
        client: eventClient({ capacity: 1, droppedEvents: 0, events: [] })
      })).rejects.toBeInstanceOf(McpError)
    }
  })

  it("confirms media input workflow events with identity and action filters", async () => {
    const client = eventClient({
      capacity: 4,
      droppedEvents: 0,
      events: [
        {
          sequence: 1,
          eventType: "MediaInputPlaybackStarted",
          eventIntent: EventSubscription.MediaInputs,
          eventData: { inputName: "Media A", inputUuid: "input-media-a" }
        },
        {
          sequence: 2,
          eventType: "MediaInputPlaybackEnded",
          eventIntent: EventSubscription.MediaInputs,
          eventData: { inputName: "Media B", inputUuid: "input-media-b" }
        },
        {
          sequence: 3,
          eventType: "MediaInputActionTriggered",
          eventIntent: EventSubscription.MediaInputs,
          eventData: {
            inputName: "Media A",
            inputUuid: "input-media-a",
            mediaAction: "OBS_WEBSOCKET_MEDIA_INPUT_ACTION_PLAY"
          }
        },
        {
          sequence: 4,
          eventType: "MediaInputActionTriggered",
          eventIntent: EventSubscription.MediaInputs,
          eventData: {
            inputName: "Media A",
            inputUuid: "input-media-a",
            mediaAction: "OBS_WEBSOCKET_MEDIA_INPUT_ACTION_STOP"
          }
        }
      ]
    })

    await expect(executeTool(toolByName("confirm_obs_media_input_workflow"), {
      target: "media_input",
      outcome: "playback_started",
      afterSequence: 0,
      timeoutMs: 10,
      inputName: "Media A"
    }, {
      config: { ...config, enabledToolsets: ["events"] },
      client
    })).resolves.toMatchObject({
      confirmed: true,
      timedOut: false,
      latestSequence: 4,
      event: {
        sequence: 1,
        eventType: "MediaInputPlaybackStarted",
        target: "media_input",
        outcome: "playback_started",
        category: "media_inputs",
        inputName: "Media A",
        inputUuid: "input-media-a"
      }
    })

    await expect(executeTool(toolByName("confirm_obs_media_input_workflow"), {
      target: "media_input",
      outcome: "playback_ended",
      afterSequence: 0,
      timeoutMs: 10,
      inputUuid: "input-media-b"
    }, {
      config: { ...config, enabledToolsets: ["events"] },
      client
    })).resolves.toMatchObject({
      confirmed: true,
      event: { sequence: 2, eventType: "MediaInputPlaybackEnded", outcome: "playback_ended" }
    })

    await expect(executeTool(toolByName("confirm_obs_media_input_workflow"), {
      target: "media_input",
      outcome: "action_triggered",
      afterSequence: 0,
      timeoutMs: 10,
      inputName: "Media A",
      inputUuid: "input-media-a",
      mediaAction: "OBS_WEBSOCKET_MEDIA_INPUT_ACTION_STOP"
    }, {
      config: { ...config, enabledToolsets: ["events"] },
      client
    })).resolves.toMatchObject({
      confirmed: true,
      event: {
        sequence: 4,
        eventType: "MediaInputActionTriggered",
        outcome: "action_triggered",
        mediaAction: "OBS_WEBSOCKET_MEDIA_INPUT_ACTION_STOP"
      }
    })
  })

  it("does not let unrelated events satisfy media input workflow confirmation", async () => {
    await expect(executeTool(toolByName("confirm_obs_media_input_workflow"), {
      target: "media_input",
      outcome: "action_triggered",
      afterSequence: 0,
      timeoutMs: 1,
      mediaAction: "OBS_WEBSOCKET_MEDIA_INPUT_ACTION_PLAY"
    }, {
      config: { ...config, enabledToolsets: ["events"], connectionTimeoutMs: 5 },
      client: eventClient({
        capacity: 5,
        droppedEvents: 0,
        events: [
          {
            sequence: 1,
            eventType: "MediaInputPlaybackStarted",
            eventIntent: EventSubscription.MediaInputs,
            eventData: { inputName: "Media", inputUuid: "input-media" }
          },
          {
            sequence: 2,
            eventType: "MediaInputActionTriggered",
            eventIntent: EventSubscription.MediaInputs,
            eventData: {
              inputName: "Media",
              inputUuid: "input-media",
              mediaAction: "OBS_WEBSOCKET_MEDIA_INPUT_ACTION_STOP"
            }
          },
          {
            sequence: 3,
            eventType: "MediaInputActionTriggered",
            eventIntent: EventSubscription.Inputs,
            eventData: {
              inputName: "Media",
              inputUuid: "input-media",
              mediaAction: "OBS_WEBSOCKET_MEDIA_INPUT_ACTION_PLAY"
            }
          },
          {
            sequence: 4,
            eventType: "InputVolumeMeters",
            eventIntent: EventSubscription.InputVolumeMeters,
            eventData: { inputs: [] }
          },
          {
            sequence: 5,
            eventType: "CustomEvent",
            eventIntent: EventSubscription.General,
            eventData: { raw: true }
          }
        ]
      })
    })).resolves.toEqual({
      confirmed: false,
      timedOut: true,
      baselineSequence: 0,
      latestSequence: 5,
      missedEvents: false
    })
  })

  it("preserves missed-event metadata during media input workflow confirmation", async () => {
    await expect(executeTool(toolByName("confirm_obs_media_input_workflow"), {
      target: "media_input",
      outcome: "playback_started",
      afterSequence: 0,
      timeoutMs: 10,
      inputName: "Media"
    }, {
      config: { ...config, enabledToolsets: ["events"] },
      client: eventClient({
        capacity: 1,
        droppedEvents: 3,
        events: [{
          sequence: 3,
          eventType: "MediaInputPlaybackStarted",
          eventIntent: EventSubscription.MediaInputs,
          eventData: { inputName: "Media", inputUuid: "input-media" }
        }]
      })
    })).resolves.toMatchObject({
      confirmed: true,
      baselineSequence: 0,
      latestSequence: 3,
      missedEvents: true,
      event: { sequence: 3 }
    })
  })

  it("rejects invalid media input workflow input through schema validation", async () => {
    for (
      const input of [
        {
          target: "media_input",
          outcome: "playback_started",
          afterSequence: 0,
          mediaAction: "OBS_WEBSOCKET_MEDIA_INPUT_ACTION_PLAY"
        },
        {
          target: "media_input",
          outcome: "action_triggered",
          afterSequence: 0
        },
        {
          target: "media_input",
          outcome: "action_triggered",
          afterSequence: 0,
          mediaAction: "OBS_WEBSOCKET_MEDIA_INPUT_ACTION_NONE"
        },
        {
          target: "media_input",
          outcome: "playback_started",
          afterSequence: 0,
          payload: { raw: true }
        }
      ] as const
    ) {
      await expect(executeTool(toolByName("confirm_obs_media_input_workflow"), input, {
        config: { ...config, enabledToolsets: ["events"] },
        client: eventClient({ capacity: 1, droppedEvents: 0, events: [] })
      })).rejects.toBeInstanceOf(McpError)
    }
  })

  it("confirms transition workflow events with public summaries", async () => {
    const client = eventClient({
      capacity: 5,
      droppedEvents: 0,
      events: [
        {
          sequence: 1,
          eventType: "CurrentSceneTransitionChanged",
          eventIntent: EventSubscription.Transitions,
          eventData: { transitionName: "Fade", transitionUuid: "transition-fade" }
        },
        {
          sequence: 2,
          eventType: "CurrentSceneTransitionDurationChanged",
          eventIntent: EventSubscription.Transitions,
          eventData: { transitionDuration: 300 }
        },
        {
          sequence: 3,
          eventType: "SceneTransitionStarted",
          eventIntent: EventSubscription.Transitions,
          eventData: { transitionName: "Cut", transitionUuid: "transition-cut" }
        },
        {
          sequence: 4,
          eventType: "SceneTransitionEnded",
          eventIntent: EventSubscription.Transitions,
          eventData: { transitionName: "Fade", transitionUuid: "transition-fade" }
        },
        {
          sequence: 5,
          eventType: "SceneTransitionVideoEnded",
          eventIntent: EventSubscription.Transitions,
          eventData: { transitionName: "Fade", transitionUuid: "transition-fade" }
        }
      ]
    })
    const cases = [
      {
        input: {
          target: "current_scene_transition",
          outcome: "changed",
          afterSequence: 0,
          transitionName: "Fade",
          transitionUuid: "transition-fade"
        },
        event: { sequence: 1, eventType: "CurrentSceneTransitionChanged", outcome: "changed" }
      },
      {
        input: {
          target: "current_scene_transition",
          outcome: "duration_changed",
          afterSequence: 0,
          transitionDuration: 300
        },
        event: { sequence: 2, eventType: "CurrentSceneTransitionDurationChanged", outcome: "duration_changed" }
      },
      {
        input: { target: "scene_transition", outcome: "started", afterSequence: 0, transitionUuid: "transition-cut" },
        event: { sequence: 3, eventType: "SceneTransitionStarted", outcome: "started" }
      },
      {
        input: { target: "scene_transition", outcome: "ended", afterSequence: 0, transitionName: "Fade" },
        event: { sequence: 4, eventType: "SceneTransitionEnded", outcome: "ended" }
      },
      {
        input: {
          target: "scene_transition",
          outcome: "video_ended",
          afterSequence: 0,
          transitionName: "Fade",
          transitionUuid: "transition-fade"
        },
        event: { sequence: 5, eventType: "SceneTransitionVideoEnded", outcome: "video_ended" }
      }
    ] as const

    for (const entry of cases) {
      await expect(executeTool(toolByName("confirm_obs_transition_workflow"), {
        ...entry.input,
        timeoutMs: 10
      }, {
        config: { ...config, enabledToolsets: ["events"] },
        client
      })).resolves.toMatchObject({
        confirmed: true,
        timedOut: false,
        latestSequence: 5,
        event: {
          category: "transitions",
          ...entry.event
        }
      })
    }
  })

  it("rejects invalid transition workflow input through schema validation", async () => {
    for (
      const input of [
        { target: "scene_transition", outcome: "started", afterSequence: 0, transitionDuration: 300 },
        { target: "current_scene_transition", outcome: "duration_changed", afterSequence: 0, transitionName: "Fade" },
        { target: "current_scene_transition", outcome: "duration_changed", afterSequence: 0, transitionDuration: 49 },
        { target: "scene_transition", outcome: "started", afterSequence: 0, transitionSettings: { secret: true } },
        { target: "scene_transition", outcome: "started", afterSequence: 0, payload: { raw: true } }
      ] as const
    ) {
      await expect(executeTool(toolByName("confirm_obs_transition_workflow"), input, {
        config: { ...config, enabledToolsets: ["events"] },
        client: eventClient({ capacity: 1, droppedEvents: 0, events: [] })
      })).rejects.toBeInstanceOf(McpError)
    }
  })

  it("confirms input audio changes with public workflow summaries", async () => {
    const client = eventClient({
      capacity: 7,
      droppedEvents: 0,
      events: [
        {
          sequence: 1,
          eventType: "InputMuteStateChanged",
          eventIntent: EventSubscription.Inputs,
          eventData: { inputName: "Mic A", inputUuid: "input-mic-a", inputMuted: true }
        },
        {
          sequence: 2,
          eventType: "InputMuteStateChanged",
          eventIntent: EventSubscription.Inputs,
          eventData: { inputName: "Mic B", inputUuid: "input-mic-b", inputMuted: false }
        },
        {
          sequence: 3,
          eventType: "InputVolumeChanged",
          eventIntent: EventSubscription.Inputs,
          eventData: { inputName: "Mic A", inputUuid: "input-mic-a", inputVolumeMul: 0.5, inputVolumeDb: -6 }
        },
        {
          sequence: 4,
          eventType: "InputAudioBalanceChanged",
          eventIntent: EventSubscription.Inputs,
          eventData: { inputName: "Mic A", inputUuid: "input-mic-a", inputAudioBalance: 0.25 }
        },
        {
          sequence: 5,
          eventType: "InputAudioSyncOffsetChanged",
          eventIntent: EventSubscription.Inputs,
          eventData: { inputName: "Mic A", inputUuid: "input-mic-a", inputAudioSyncOffset: 125 }
        },
        {
          sequence: 6,
          eventType: "InputAudioTracksChanged",
          eventIntent: EventSubscription.Inputs,
          eventData: {
            inputName: "Mic A",
            inputUuid: "input-mic-a",
            inputAudioTracks: { "1": true, "2": false, "3": true, "4": false, "5": false, "6": true }
          }
        },
        {
          sequence: 7,
          eventType: "InputAudioMonitorTypeChanged",
          eventIntent: EventSubscription.Inputs,
          eventData: {
            inputName: "Mic A",
            inputUuid: "input-mic-a",
            monitorType: "OBS_MONITORING_TYPE_MONITOR_ONLY"
          }
        }
      ]
    })
    const cases = [
      {
        input: { target: "input_audio", outcome: "muted", afterSequence: 0, inputName: "Mic A" },
        event: { sequence: 1, eventType: "InputMuteStateChanged", outcome: "muted", inputMuted: true }
      },
      {
        input: { target: "input_audio", outcome: "unmuted", afterSequence: 0, inputUuid: "input-mic-b" },
        event: { sequence: 2, eventType: "InputMuteStateChanged", outcome: "unmuted", inputMuted: false }
      },
      {
        input: { target: "input_audio", outcome: "volume_changed", afterSequence: 0, inputVolumeDb: -6 },
        event: { sequence: 3, eventType: "InputVolumeChanged", outcome: "volume_changed" }
      },
      {
        input: { target: "input_audio", outcome: "balance_changed", afterSequence: 0, inputAudioBalance: 0.25 },
        event: { sequence: 4, eventType: "InputAudioBalanceChanged", outcome: "balance_changed" }
      },
      {
        input: { target: "input_audio", outcome: "sync_offset_changed", afterSequence: 0, inputAudioSyncOffset: 125 },
        event: { sequence: 5, eventType: "InputAudioSyncOffsetChanged", outcome: "sync_offset_changed" }
      },
      {
        input: {
          target: "input_audio",
          outcome: "tracks_changed",
          afterSequence: 0,
          inputAudioTracks: {
            track1: true,
            track2: false,
            track3: true,
            track4: false,
            track5: false,
            track6: true
          }
        },
        event: {
          sequence: 6,
          eventType: "InputAudioTracksChanged",
          outcome: "tracks_changed",
          inputAudioTracks: {
            track1: true,
            track2: false,
            track3: true,
            track4: false,
            track5: false,
            track6: true
          }
        }
      },
      {
        input: {
          target: "input_audio",
          outcome: "monitor_type_changed",
          afterSequence: 0,
          monitorType: "OBS_MONITORING_TYPE_MONITOR_ONLY"
        },
        event: {
          sequence: 7,
          eventType: "InputAudioMonitorTypeChanged",
          outcome: "monitor_type_changed",
          monitorType: "OBS_MONITORING_TYPE_MONITOR_ONLY"
        }
      }
    ] as const

    for (const entry of cases) {
      const result = await executeTool(toolByName("confirm_obs_input_audio_change"), {
        ...entry.input,
        timeoutMs: 10
      }, {
        config: { ...config, enabledToolsets: ["events"] },
        client
      })
      expect(result).toMatchObject({
        confirmed: true,
        timedOut: false,
        latestSequence: 7,
        missedEvents: false,
        event: {
          category: "inputs",
          target: "input_audio",
          ...entry.event
        }
      })
      expect(JSON.stringify(result)).not.toContain("\"1\"")
    }
  })

  it("does not let unrelated or malformed input audio events satisfy confirmation", async () => {
    await expect(executeTool(toolByName("confirm_obs_input_audio_change"), {
      target: "input_audio",
      outcome: "volume_changed",
      afterSequence: 0,
      timeoutMs: 1
    }, {
      config: { ...config, enabledToolsets: ["events"], connectionTimeoutMs: 5 },
      client: eventClient({
        capacity: 5,
        droppedEvents: 0,
        events: [
          {
            sequence: 1,
            eventType: "InputVolumeChanged",
            eventIntent: EventSubscription.Inputs,
            eventData: { inputName: "Mic", inputUuid: "input-mic", inputVolumeMul: 21, inputVolumeDb: -6 }
          },
          {
            sequence: 2,
            eventType: "InputMuteStateChanged",
            eventIntent: EventSubscription.General,
            eventData: { inputName: "Mic", inputUuid: "input-mic", inputMuted: true }
          },
          {
            sequence: 3,
            eventType: "InputVolumeMeters",
            eventIntent: EventSubscription.InputVolumeMeters,
            eventData: { inputs: [] }
          },
          {
            sequence: 4,
            eventType: "InputSettingsChanged",
            eventIntent: EventSubscription.Inputs,
            eventData: { inputName: "Mic", inputUuid: "input-mic", inputSettings: { secret: true } }
          },
          {
            sequence: 5,
            eventType: "CustomEvent",
            eventIntent: EventSubscription.General,
            eventData: { raw: true }
          }
        ]
      })
    })).resolves.toEqual({
      confirmed: false,
      timedOut: true,
      baselineSequence: 0,
      latestSequence: 5,
      missedEvents: false
    })
  })

  it("rejects invalid input audio confirmation input through schema validation", async () => {
    for (
      const input of [
        { target: "input_audio", outcome: "muted", afterSequence: 0, inputMuted: true },
        { target: "input_audio", outcome: "volume_changed", afterSequence: 0, inputVolumeMul: 21 },
        { target: "input_audio", outcome: "tracks_changed", afterSequence: 0, inputAudioTracks: { track1: true } },
        { target: "input_audio", outcome: "monitor_type_changed", afterSequence: 0, monitorType: "UNKNOWN" },
        { target: "input_audio", outcome: "muted", afterSequence: 0, payload: { raw: true } }
      ] as const
    ) {
      await expect(executeTool(toolByName("confirm_obs_input_audio_change"), input, {
        config: { ...config, enabledToolsets: ["events"] },
        client: eventClient({ capacity: 1, droppedEvents: 0, events: [] })
      })).rejects.toBeInstanceOf(McpError)
    }
  })

  it("confirms input identity changes with public workflow summaries", async () => {
    const client = eventClient({
      capacity: 4,
      droppedEvents: 0,
      events: [
        {
          sequence: 1,
          eventType: "InputCreated",
          eventIntent: EventSubscription.Inputs,
          eventData: undefined
        },
        {
          sequence: 2,
          eventType: "InputRemoved",
          eventIntent: EventSubscription.Inputs,
          eventData: { inputName: "Camera A", inputUuid: "input-camera-a" }
        },
        {
          sequence: 3,
          eventType: "InputNameChanged",
          eventIntent: EventSubscription.Inputs,
          eventData: { inputUuid: "input-camera-b", oldInputName: "Old Camera", inputName: "Camera B" }
        },
        {
          sequence: 4,
          eventType: "InputSettingsChanged",
          eventIntent: EventSubscription.Inputs,
          eventData: undefined
        }
      ]
    })

    await expect(executeTool(toolByName("confirm_obs_input_identity_change"), {
      target: "input",
      outcome: "removed",
      afterSequence: 0,
      timeoutMs: 10,
      inputName: "Camera A",
      inputUuid: "input-camera-a"
    }, {
      config: { ...config, enabledToolsets: ["events"] },
      client
    })).resolves.toEqual({
      confirmed: true,
      timedOut: false,
      baselineSequence: 0,
      latestSequence: 4,
      missedEvents: false,
      event: {
        sequence: 2,
        eventType: "InputRemoved",
        eventIntent: EventSubscription.Inputs,
        category: "inputs",
        target: "input",
        outcome: "removed",
        inputName: "Camera A",
        inputUuid: "input-camera-a"
      }
    })

    const result = await executeTool(toolByName("confirm_obs_input_identity_change"), {
      target: "input",
      outcome: "renamed",
      afterSequence: 0,
      timeoutMs: 10,
      oldInputName: "Old Camera",
      inputName: "Camera B",
      inputUuid: "input-camera-b"
    }, {
      config: { ...config, enabledToolsets: ["events"] },
      client
    })
    expect(result).toEqual({
      confirmed: true,
      timedOut: false,
      baselineSequence: 0,
      latestSequence: 4,
      missedEvents: false,
      event: {
        sequence: 3,
        eventType: "InputNameChanged",
        eventIntent: EventSubscription.Inputs,
        category: "inputs",
        target: "input",
        outcome: "renamed",
        oldInputName: "Old Camera",
        inputName: "Camera B",
        inputUuid: "input-camera-b"
      }
    })
    expect(JSON.stringify(result)).not.toContain("eventData")
    expect(JSON.stringify(result)).not.toContain("inputSettings")
    expect(JSON.stringify(result)).not.toContain("inputKind")
  })

  it("does not let unrelated or malformed input identity events satisfy confirmation", async () => {
    await expect(executeTool(toolByName("confirm_obs_input_identity_change"), {
      target: "input",
      outcome: "renamed",
      afterSequence: 0,
      oldInputName: "Other Camera",
      timeoutMs: 1
    }, {
      config: { ...config, enabledToolsets: ["events"], connectionTimeoutMs: 5 },
      client: eventClient({
        capacity: 6,
        droppedEvents: 0,
        events: [
          {
            sequence: 1,
            eventType: "InputRemoved",
            eventIntent: EventSubscription.Inputs,
            eventData: { inputName: "Camera", inputUuid: "input-camera" }
          },
          {
            sequence: 2,
            eventType: "InputNameChanged",
            eventIntent: EventSubscription.Inputs,
            eventData: { inputUuid: "input-camera", oldInputName: "", inputName: "Camera" }
          },
          {
            sequence: 3,
            eventType: "InputNameChanged",
            eventIntent: EventSubscription.General,
            eventData: { inputUuid: "input-camera", oldInputName: "Old Camera", inputName: "Camera" }
          },
          {
            sequence: 4,
            eventType: "InputCreated",
            eventIntent: EventSubscription.Inputs,
            eventData: undefined
          },
          {
            sequence: 5,
            eventType: "InputSettingsChanged",
            eventIntent: EventSubscription.Inputs,
            eventData: undefined
          },
          {
            sequence: 6,
            eventType: "CustomEvent",
            eventIntent: EventSubscription.General,
            eventData: { raw: true }
          }
        ]
      })
    })).resolves.toEqual({
      confirmed: false,
      timedOut: true,
      baselineSequence: 0,
      latestSequence: 6,
      missedEvents: false
    })
  })

  it("rejects invalid input identity confirmation input through schema validation", async () => {
    for (
      const input of [
        { target: "input", outcome: "created", afterSequence: 0 },
        { target: "input", outcome: "settings_changed", afterSequence: 0 },
        { target: "input", outcome: "removed", afterSequence: 0, oldInputName: "Old Camera" },
        { target: "input", outcome: "renamed", afterSequence: 0, oldInputName: "" },
        { target: "input", outcome: "removed", afterSequence: 0, inputName: "" },
        { target: "input", outcome: "removed", afterSequence: 0, inputUuid: "" },
        { target: "input", outcome: "removed", afterSequence: 0, eventType: "InputRemoved" },
        { target: "input", outcome: "removed", afterSequence: 0, eventData: {} },
        { target: "input", outcome: "removed", afterSequence: 0, settings: { secret: true } },
        { target: "input", outcome: "removed", afterSequence: 0, inputSettings: { secret: true } },
        { target: "input", outcome: "removed", afterSequence: 0, defaultInputSettings: { secret: false } },
        { target: "input", outcome: "removed", afterSequence: 0, inputKind: "dshow_input" },
        { target: "input", outcome: "removed", afterSequence: 0, unversionedInputKind: "dshow_input" },
        { target: "input", outcome: "removed", afterSequence: 0, inputKindCaps: 1 },
        { target: "input", outcome: "removed", afterSequence: 0, sceneItemId: 1 },
        { target: "input", outcome: "removed", afterSequence: 0, unexpected: true }
      ] as const
    ) {
      await expect(executeTool(toolByName("confirm_obs_input_identity_change"), input, {
        config: { ...config, enabledToolsets: ["events"] },
        client: eventClient({ capacity: 1, droppedEvents: 0, events: [] })
      })).rejects.toBeInstanceOf(McpError)
    }
  })

  it("confirms canvas inventory-change events through MCP tool execution", async () => {
    const client = eventClient({
      capacity: 3,
      droppedEvents: 0,
      events: [
        {
          sequence: 1,
          eventType: "CanvasCreated",
          eventIntent: EventSubscription.Canvases,
          eventData: { canvasName: "Canvas A", canvasUuid: "canvas-a" }
        },
        {
          sequence: 2,
          eventType: "CanvasRemoved",
          eventIntent: EventSubscription.Canvases,
          eventData: { canvasName: "Canvas B", canvasUuid: "canvas-b" }
        },
        {
          sequence: 3,
          eventType: "CanvasNameChanged",
          eventIntent: EventSubscription.Canvases,
          eventData: { oldCanvasName: "Canvas C", canvasName: "Canvas D", canvasUuid: "canvas-d" }
        }
      ]
    })

    await expect(executeTool(toolByName("confirm_obs_canvas_inventory_change"), {
      target: "canvas",
      outcome: "renamed",
      afterSequence: 0,
      timeoutMs: 10,
      oldCanvasName: "Canvas C",
      canvasName: "Canvas D",
      canvasUuid: "canvas-d"
    }, {
      config: { ...config, enabledToolsets: ["events"] },
      client
    })).resolves.toMatchObject({
      confirmed: true,
      timedOut: false,
      latestSequence: 3,
      event: {
        sequence: 3,
        eventType: "CanvasNameChanged",
        eventIntent: EventSubscription.Canvases,
        category: "canvases",
        target: "canvas",
        outcome: "renamed",
        oldCanvasName: "Canvas C",
        canvasName: "Canvas D",
        canvasUuid: "canvas-d"
      }
    })

    await expect(executeTool(toolByName("confirm_obs_canvas_inventory_change"), {
      target: "canvas",
      outcome: "created",
      afterSequence: 0,
      timeoutMs: 1,
      canvasUuid: "canvas-d"
    }, {
      config: { ...config, enabledToolsets: ["events"], connectionTimeoutMs: 5 },
      client
    })).resolves.toEqual({
      confirmed: false,
      timedOut: true,
      baselineSequence: 0,
      latestSequence: 3,
      missedEvents: false
    })
  })

  it("rejects invalid canvas inventory-change input through schema validation", async () => {
    for (
      const input of [
        { target: "canvas", outcome: "created", afterSequence: 0, oldCanvasName: "Old Canvas" },
        { target: "canvas", outcome: "renamed", afterSequence: 0, oldCanvasName: "" },
        { target: "canvas", outcome: "created", afterSequence: 0, canvasUuid: "" },
        { target: "canvas", outcome: "created", afterSequence: 0, eventType: "CanvasCreated" }
      ] as const
    ) {
      await expect(executeTool(toolByName("confirm_obs_canvas_inventory_change"), input, {
        config: { ...config, enabledToolsets: ["events"] },
        client: eventClient({ capacity: 1, droppedEvents: 0, events: [] })
      })).rejects.toBeInstanceOf(McpError)
    }
  })

  it("confirms studio-mode state changes through MCP tool execution", async () => {
    const client = eventClient({
      capacity: 3,
      droppedEvents: 0,
      events: [
        {
          sequence: 1,
          eventType: "ScreenshotSaved",
          eventIntent: EventSubscription.Ui,
          eventData: { savedScreenshotPath: "/tmp/screenshot.png" }
        },
        {
          sequence: 2,
          eventType: "StudioModeStateChanged",
          eventIntent: EventSubscription.Ui,
          eventData: { studioModeEnabled: true }
        },
        {
          sequence: 3,
          eventType: "StudioModeStateChanged",
          eventIntent: EventSubscription.Ui,
          eventData: { studioModeEnabled: false }
        }
      ]
    })

    await expect(executeTool(toolByName("confirm_obs_studio_mode_state_change"), {
      target: "studio_mode",
      outcome: "disabled",
      afterSequence: 2,
      timeoutMs: 10
    }, {
      config: { ...config, enabledToolsets: ["events"] },
      client
    })).resolves.toMatchObject({
      confirmed: true,
      timedOut: false,
      latestSequence: 3,
      event: {
        sequence: 3,
        eventType: "StudioModeStateChanged",
        eventIntent: EventSubscription.Ui,
        category: "ui",
        target: "studio_mode",
        outcome: "disabled",
        studioModeEnabled: false
      }
    })

    await expect(executeTool(toolByName("confirm_obs_studio_mode_state_change"), {
      target: "studio_mode",
      outcome: "enabled",
      afterSequence: 2,
      timeoutMs: 1
    }, {
      config: { ...config, enabledToolsets: ["events"], connectionTimeoutMs: 5 },
      client
    })).resolves.toEqual({
      confirmed: false,
      timedOut: true,
      baselineSequence: 2,
      latestSequence: 3,
      missedEvents: false
    })
  })

  it("rejects invalid studio-mode state confirmation input through schema validation", async () => {
    for (
      const input of [
        { target: "studio_mode", outcome: "enabled", afterSequence: 0, studioModeEnabled: true },
        { target: "studio_mode", outcome: "enabled", afterSequence: 0, savedScreenshotPath: "/tmp/shot.png" },
        { target: "studio_mode", outcome: "enabled", afterSequence: 0, eventType: "StudioModeStateChanged" },
        { target: "studio_mode", outcome: "enabled", afterSequence: 0, unexpected: true }
      ] as const
    ) {
      await expect(executeTool(toolByName("confirm_obs_studio_mode_state_change"), input, {
        config: { ...config, enabledToolsets: ["events"] },
        client: eventClient({ capacity: 1, droppedEvents: 0, events: [] })
      })).rejects.toBeInstanceOf(McpError)
    }
  })

  it("confirms config workflow events with public summaries", async () => {
    const client = eventClient({
      capacity: 6,
      droppedEvents: 0,
      events: [
        {
          sequence: 1,
          eventType: "CurrentProfileChanging",
          eventIntent: EventSubscription.Config,
          eventData: { profileName: "Profile A" }
        },
        {
          sequence: 2,
          eventType: "CurrentProfileChanged",
          eventIntent: EventSubscription.Config,
          eventData: { profileName: "Profile B" }
        },
        {
          sequence: 3,
          eventType: "ProfileListChanged",
          eventIntent: EventSubscription.Config,
          eventData: { profiles: ["Profile A", "Profile B"] }
        },
        {
          sequence: 4,
          eventType: "CurrentSceneCollectionChanging",
          eventIntent: EventSubscription.Config,
          eventData: { sceneCollectionName: "Collection A" }
        },
        {
          sequence: 5,
          eventType: "CurrentSceneCollectionChanged",
          eventIntent: EventSubscription.Config,
          eventData: { sceneCollectionName: "Collection B" }
        },
        {
          sequence: 6,
          eventType: "SceneCollectionListChanged",
          eventIntent: EventSubscription.Config,
          eventData: { sceneCollections: ["Collection A", "Collection B"] }
        }
      ]
    })
    const cases = [
      {
        input: { target: "profile", outcome: "changing", afterSequence: 0, profileName: "Profile A" },
        event: { sequence: 1, eventType: "CurrentProfileChanging", outcome: "changing" }
      },
      {
        input: { target: "profile", outcome: "changed", afterSequence: 0, profileName: "Profile B" },
        event: { sequence: 2, eventType: "CurrentProfileChanged", outcome: "changed" }
      },
      {
        input: { target: "profile", outcome: "list_changed", afterSequence: 0, profiles: ["Profile A", "Profile B"] },
        event: { sequence: 3, eventType: "ProfileListChanged", outcome: "list_changed" }
      },
      {
        input: {
          target: "scene_collection",
          outcome: "changing",
          afterSequence: 0,
          sceneCollectionName: "Collection A"
        },
        event: { sequence: 4, eventType: "CurrentSceneCollectionChanging", outcome: "changing" }
      },
      {
        input: {
          target: "scene_collection",
          outcome: "changed",
          afterSequence: 0,
          sceneCollectionName: "Collection B"
        },
        event: { sequence: 5, eventType: "CurrentSceneCollectionChanged", outcome: "changed" }
      },
      {
        input: {
          target: "scene_collection",
          outcome: "list_changed",
          afterSequence: 0,
          sceneCollections: ["Collection A", "Collection B"]
        },
        event: { sequence: 6, eventType: "SceneCollectionListChanged", outcome: "list_changed" }
      }
    ] as const

    for (const entry of cases) {
      await expect(executeTool(toolByName("confirm_obs_config_workflow"), {
        ...entry.input,
        timeoutMs: 10
      }, {
        config: { ...config, enabledToolsets: ["events"] },
        client
      })).resolves.toMatchObject({
        confirmed: true,
        timedOut: false,
        latestSequence: 6,
        event: {
          category: "config",
          target: entry.input.target,
          ...entry.event
        }
      })
    }
  })

  it("does not let excluded config-adjacent events satisfy config workflow confirmation", async () => {
    await expect(executeTool(toolByName("confirm_obs_config_workflow"), {
      target: "profile",
      outcome: "changed",
      afterSequence: 0,
      timeoutMs: 1
    }, {
      config: { ...config, enabledToolsets: ["events"], connectionTimeoutMs: 5 },
      client: eventClient({
        capacity: 4,
        droppedEvents: 0,
        events: [
          { sequence: 1, eventType: "ExitStarted", eventIntent: EventSubscription.General, eventData: {} },
          {
            sequence: 2,
            eventType: "CurrentProfileChanged",
            eventIntent: EventSubscription.General,
            eventData: { profileName: "Profile B" }
          },
          {
            sequence: 3,
            eventType: "ProfileListChanged",
            eventIntent: EventSubscription.Config,
            eventData: { profiles: ["Profile B"] }
          },
          {
            sequence: 4,
            eventType: "SceneCollectionListChanged",
            eventIntent: EventSubscription.Config,
            eventData: { sceneCollections: ["Collection B"] }
          }
        ]
      })
    })).resolves.toEqual({
      confirmed: false,
      timedOut: true,
      baselineSequence: 0,
      latestSequence: 4,
      missedEvents: false
    })
  })

  it("rejects invalid config workflow input through schema validation", async () => {
    for (
      const input of [
        { target: "profile", outcome: "list_changed", afterSequence: 0, profileName: "Profile A" },
        { target: "profile", outcome: "changed", afterSequence: 0, profiles: ["Profile A"] },
        { target: "scene_collection", outcome: "changed", afterSequence: 0, sceneCollections: ["Collection A"] },
        { target: "profile", outcome: "changed", afterSequence: 0, profileName: "" },
        { target: "profile", outcome: "changed", afterSequence: 0, eventType: "CurrentProfileChanged" },
        { target: "profile", outcome: "changed", afterSequence: 0, parameterName: "Mode" }
      ] as const
    ) {
      await expect(executeTool(toolByName("confirm_obs_config_workflow"), input, {
        config: { ...config, enabledToolsets: ["events"] },
        client: eventClient({ capacity: 1, droppedEvents: 0, events: [] })
      })).rejects.toBeInstanceOf(McpError)
    }
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
      oldestSequence: 1,
      latestSequence: 4,
      missedEvents: false,
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
      oldestSequence: 1,
      latestSequence: 4,
      missedEvents: false,
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
      oldestSequence: 1,
      latestSequence: 3,
      missedEvents: false,
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
      oldestSequence: 1,
      latestSequence: 4,
      missedEvents: false,
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
      oldestSequence: 1,
      latestSequence: 5,
      missedEvents: false,
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
      oldestSequence: 1,
      latestSequence: 3,
      missedEvents: false,
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
      oldestSequence: 1,
      latestSequence: 5,
      missedEvents: false,
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
      oldestSequence: 1,
      latestSequence: 7,
      missedEvents: false,
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
      oldestSequence: 1,
      latestSequence: 1,
      missedEvents: false,
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

  it("creates, removes, and duplicates scene items", async () => {
    const requests: Array<unknown> = []
    await expect(executeTool(toolByName("create_scene_item"), {
      sceneName: "Scene",
      sourceName: "Camera",
      sceneItemEnabled: false
    }, {
      config,
      client: fakeObsClient(async (requestType, requestData) => {
        expect(requestType).toBe("CreateSceneItem")
        requests.push(requestData)
        return { sceneItemId: 12 }
      })
    })).resolves.toEqual({
      sceneName: "Scene",
      sourceName: "Camera",
      sceneItemId: 12,
      created: true
    })
    await expect(executeTool(toolByName("remove_scene_item"), {
      sceneUuid: "scene-uuid",
      sceneItemId: 12
    }, {
      config,
      client: fakeObsClient(async (requestType, requestData) => {
        expect(requestType).toBe("RemoveSceneItem")
        requests.push(requestData)
        return {}
      })
    })).resolves.toEqual({ sceneUuid: "scene-uuid", sceneItemId: 12, removed: true })
    await expect(executeTool(toolByName("duplicate_scene_item"), {
      sceneName: "Scene",
      sceneItemId: 7,
      destinationSceneName: "Program"
    }, {
      config,
      client: fakeObsClient(async (requestType, requestData) => {
        expect(requestType).toBe("DuplicateSceneItem")
        requests.push(requestData)
        return { sceneItemId: 13 }
      })
    })).resolves.toEqual({
      sceneName: "Scene",
      destinationSceneName: "Program",
      sceneItemId: 13,
      duplicated: true
    })
    expect(requests).toEqual([
      { sceneName: "Scene", sourceName: "Camera", sceneItemEnabled: false },
      { sceneUuid: "scene-uuid", sceneItemId: 12 },
      { sceneName: "Scene", sceneItemId: 7, destinationSceneName: "Program" }
    ])
  })

  it("rejects scene item lifecycle responses missing scene item IDs", async () => {
    await expect(executeTool(toolByName("create_scene_item"), {
      sceneName: "Scene",
      sourceName: "Camera"
    }, {
      config,
      client: fakeObsClient(async () => ({}))
    })).rejects.toBeInstanceOf(McpError)
    await expect(executeTool(toolByName("duplicate_scene_item"), {
      sceneName: "Scene",
      sceneItemId: 7
    }, {
      config,
      client: fakeObsClient(async () => ({}))
    })).rejects.toBeInstanceOf(McpError)
  })

  it("gets a scene item's transform", async () => {
    await expect(executeTool(toolByName("get_scene_item_transform"), {
      sceneName: "Scene",
      sceneItemId: 42
    }, {
      config,
      client: fakeObsClient(async (requestType, requestData) => {
        expect(requestType).toBe("GetSceneItemTransform")
        expect(requestData).toEqual({ sceneName: "Scene", sceneItemId: 42 })
        return {
          sceneItemTransform: {
            alignment: 5,
            boundsAlignment: 5,
            boundsHeight: 720,
            boundsType: "OBS_BOUNDS_NONE",
            boundsWidth: 1280,
            cropBottom: 0,
            cropLeft: 0,
            cropRight: 0,
            cropTop: 0,
            cropToBounds: false,
            height: 720,
            positionX: 0,
            positionY: 0,
            rotation: 0,
            scaleX: 1,
            scaleY: 1,
            sourceHeight: 720,
            sourceWidth: 1280,
            width: 1280
          }
        }
      })
    })).resolves.toMatchObject({
      sceneItemTransform: {
        positionX: 0,
        scaleX: 1,
        cropToBounds: false,
        width: 1280
      }
    })
  })

  it("sets a scene item's transform", async () => {
    await expect(executeTool(toolByName("set_scene_item_transform"), {
      sceneUuid: "scene-uuid",
      sceneItemId: 42,
      sceneItemTransform: {
        cropToBounds: true,
        positionX: 10.5,
        scaleX: 0.75
      }
    }, {
      config,
      client: fakeObsClient(async (requestType, requestData) => {
        expect(requestType).toBe("SetSceneItemTransform")
        expect(requestData).toEqual({
          sceneUuid: "scene-uuid",
          sceneItemId: 42,
          sceneItemTransform: {
            cropToBounds: true,
            positionX: 10.5,
            scaleX: 0.75
          }
        })
        return {}
      })
    })).resolves.toEqual({
      sceneItemTransform: {
        cropToBounds: true,
        positionX: 10.5,
        scaleX: 0.75
      },
      updated: true
    })
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
    await expect(executeTool(toolByName("get_scene_item_transform"), { sceneName: "Scene", sceneItemId: 404 }, {
      config,
      client: fakeObsClient(async () => {
        throw new ObsRequestError("GetSceneItemTransform", 601, "Scene item not found")
      })
    })).rejects.toMatchObject({
      code: ErrorCode.InvalidParams,
      data: {
        requestType: "GetSceneItemTransform",
        obsStatusCode: 601,
        comment: "Scene item not found"
      }
    })
    await expect(executeTool(toolByName("set_scene_item_transform"), {
      sceneName: "Scene",
      sceneItemId: 404,
      sceneItemTransform: { positionX: 1 }
    }, {
      config,
      client: fakeObsClient(async () => {
        throw new ObsRequestError("SetSceneItemTransform", 601, "Scene item not found")
      })
    })).rejects.toMatchObject({
      code: ErrorCode.InvalidParams,
      data: {
        requestType: "SetSceneItemTransform",
        obsStatusCode: 601,
        comment: "Scene item not found"
      }
    })
    await expect(executeTool(toolByName("remove_scene_item"), { sceneName: "Scene", sceneItemId: 404 }, {
      config,
      client: fakeObsClient(async () => {
        throw new ObsRequestError("RemoveSceneItem", 601, "Scene item not found")
      })
    })).rejects.toMatchObject({
      code: ErrorCode.InvalidParams,
      data: {
        requestType: "RemoveSceneItem",
        obsStatusCode: 601,
        comment: "Scene item not found"
      }
    })
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
        "GetGroupList",
        "GetCurrentProgramScene",
        "GetCurrentPreviewScene",
        "SetCurrentProgramScene",
        "SetCurrentPreviewScene",
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
      "list_groups",
      "get_current_scene",
      "get_current_preview_scene",
      "set_current_scene",
      "set_current_preview_scene",
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

  it("filters scene lifecycle tools by partial OBS capabilities", () => {
    expect(getEnabledTools(["scenes"], ["CreateScene", "RemoveScene"]).map((tool) => tool.name)).toEqual([
      "create_scene",
      "remove_scene"
    ])
    expect(getEnabledTools(["scenes"], ["SetSceneName"]).map((tool) => tool.name)).toEqual(["set_scene_name"])
  })

  it("filters scene transition override tools by partial OBS capabilities", () => {
    expect(
      getEnabledTools(["scenes"], ["GetSceneSceneTransitionOverride"]).map((tool) => tool.name)
    ).toEqual(["get_scene_transition_override"])
    expect(
      getEnabledTools(["scenes"], ["SetSceneSceneTransitionOverride"]).map((tool) => tool.name)
    ).toEqual(["set_scene_transition_override"])
  })

  it("filters generic output tools by partial OBS capabilities", () => {
    expect(getEnabledTools(["outputs"], ["GetOutputList"]).map((tool) => tool.name))
      .toEqual(["list_outputs"])
    expect(getEnabledTools(["outputs"], ["GetOutputStatus"]).map((tool) => tool.name))
      .toEqual(["get_output_status"])
    expect(getEnabledTools(["outputs"], ["GetOutputSettings"]).map((tool) => tool.name))
      .toEqual(["get_output_settings"])
    expect(getEnabledTools(["outputs"], ["SetOutputSettings"]).map((tool) => tool.name))
      .toEqual(["set_output_settings"])
    expect(getEnabledTools(["outputs"], ["StartOutput"]).map((tool) => tool.name))
      .toEqual(["start_output"])
    expect(getEnabledTools(["outputs"], ["StopOutput"]).map((tool) => tool.name))
      .toEqual(["stop_output"])
    expect(getEnabledTools(["outputs"], ["ToggleOutput"]).map((tool) => tool.name))
      .toEqual(["toggle_output"])
  })

  it("filters scene item transform by partial OBS capabilities", () => {
    expect(getEnabledTools(["scenes"], ["GetSceneItemTransform"]).map((tool) => tool.name))
      .toEqual(["get_scene_item_transform"])
    expect(getEnabledTools(["scenes"], ["SetSceneItemTransform"]).map((tool) => tool.name))
      .toEqual(["set_scene_item_transform"])
  })

  it("filters scene item lifecycle tools by partial OBS capabilities", () => {
    expect(getEnabledTools(["scenes"], ["CreateSceneItem"]).map((tool) => tool.name))
      .toEqual(["create_scene_item"])
    expect(getEnabledTools(["scenes"], ["RemoveSceneItem"]).map((tool) => tool.name))
      .toEqual(["remove_scene_item"])
    expect(getEnabledTools(["scenes"], ["DuplicateSceneItem"]).map((tool) => tool.name))
      .toEqual(["duplicate_scene_item"])
  })

  it("maps scene operation errors to MCP errors with OBS status metadata", async () => {
    await expect(executeTool(toolByName("set_current_scene"), { sceneName: "Missing" }, {
      config,
      client: fakeObsClient(async () => {
        throw new ObsRequestError("SetCurrentProgramScene", 608, "Parameter: sceneName")
      })
    })).rejects.toMatchObject({ code: ErrorCode.InvalidParams })
  })

  it("preserves OBS preview unavailable errors from studio mode preview operations", async () => {
    await expect(executeTool(toolByName("set_current_preview_scene"), { sceneName: "Preview" }, {
      config,
      client: fakeObsClient(async () => {
        throw new ObsRequestError("SetCurrentPreviewScene", 207, "Studio mode is not enabled")
      })
    })).rejects.toMatchObject({
      code: ErrorCode.InternalError,
      data: {
        comment: "Studio mode is not enabled",
        obsStatusCode: 207,
        requestType: "SetCurrentPreviewScene"
      }
    })
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
