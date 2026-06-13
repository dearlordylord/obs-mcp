import { JSONSchema, Schema } from "effect"

import type { ObsConfig } from "../../config/config.js"
import { getSanitizedObsContext } from "../../config/obs-runtime-context.js"
import {
  CurrentSceneOutput,
  GetSceneItemIdInput,
  GetSceneItemIdOutput,
  GetSceneItemSourceInput,
  GetSceneItemSourceOutput,
  ListGroupSceneItemsInput,
  ListGroupSceneItemsOutput,
  ListInputKindsInput,
  ListInputKindsOutput,
  ListInputsInput,
  ListInputsOutput,
  ListSceneItemsInput,
  ListSceneItemsOutput,
  ListScenesInput,
  ListScenesOutput,
  ObsContextOutput,
  ObsStatsOutput,
  RecordPauseControlOutput,
  RecordStatusOutput,
  SetCurrentSceneInput,
  SetCurrentSceneOutput,
  SpecialInputsOutput,
  StartStreamOutput,
  StopStreamOutput,
  StreamStatusOutput,
  ToggleStreamOutput,
  VersionOutput,
  VirtualCamStatusOutput,
  VirtualCamSwitchOutput
} from "../../domain/schemas/index.js"
import { EmptyInput } from "../../domain/schemas/shared.js"
import type { ObsClient } from "../../obs/client.js"
import { getObsStats, getRecordStatus, getVersion } from "../../obs/operations/general.js"
import { getSpecialInputs, listInputKinds, listInputs } from "../../obs/operations/inputs.js"
import { getVirtualCamStatus, startVirtualCam, stopVirtualCam, toggleVirtualCam } from "../../obs/operations/outputs.js"
import { pauseRecord, resumeRecord, toggleRecordPause } from "../../obs/operations/record.js"
import {
  getCurrentScene,
  getSceneItemId,
  getSceneItemSource,
  listGroupSceneItems,
  listSceneItems,
  listScenes,
  setCurrentScene
} from "../../obs/operations/scenes.js"
import { getStreamStatus, startStream, stopStream, toggleStream } from "../../obs/operations/stream.js"
import {
  GetCurrentProgramScene,
  GetGroupSceneItemList,
  GetInputKindList,
  GetInputList,
  GetRecordStatus,
  GetSceneItemId,
  GetSceneItemList,
  GetSceneItemSource,
  GetSceneList,
  GetSpecialInputs,
  GetStats,
  GetStreamStatus,
  GetVersion,
  GetVirtualCamStatus,
  PauseRecord,
  ResumeRecord,
  SetCurrentProgramScene,
  StartStream,
  StartVirtualCam,
  StopStream,
  StopVirtualCam,
  ToggleRecordPause,
  ToggleStream,
  ToggleVirtualCam
} from "../../obs/requests.js"
import { toMcpError } from "../error-mapping.js"

interface ToolContext {
  readonly config: ObsConfig
  readonly client: ObsClient
}

type RuntimeSchema = Schema.Schema.AnyNoContext
type ToolCategory = "general" | "inputs" | "outputs" | "record" | "scenes" | "stream"

export interface ToolDefinition {
  readonly name: string
  readonly title: string
  readonly description: string
  readonly category: ToolCategory
  readonly requiredObsRequests: ReadonlyArray<string>
  readonly inputSchema: RuntimeSchema
  readonly inputJsonSchema: unknown
  readonly outputSchema: RuntimeSchema
  readonly outputJsonSchema: unknown
  readonly handler: (input: unknown, context: ToolContext) => Promise<unknown>
}

const defineTool = (definition: {
  readonly name: string
  readonly title: string
  readonly description: string
  readonly category: ToolCategory
  readonly requiredObsRequests: ReadonlyArray<string>
  readonly inputSchema: RuntimeSchema
  readonly outputSchema: RuntimeSchema
  readonly handler: (input: unknown, context: ToolContext) => Promise<unknown>
}): ToolDefinition => ({
  ...definition,
  inputSchema: definition.inputSchema,
  inputJsonSchema: JSONSchema.make(definition.inputSchema),
  outputSchema: definition.outputSchema,
  outputJsonSchema: JSONSchema.make(definition.outputSchema)
})

export const allTools = [
  defineTool({
    name: "get_obs_context",
    title: "Get OBS MCP Context",
    description: "Return sanitized OBS MCP runtime context without secrets.",
    category: "general",
    requiredObsRequests: [],
    inputSchema: EmptyInput,
    outputSchema: ObsContextOutput,
    handler: async (_input, context) => getSanitizedObsContext(context.config)
  }),
  defineTool({
    name: "get_version",
    title: "Get OBS Version",
    description:
      "Return OBS Studio, obs-websocket, negotiated RPC, request, image, and platform capability information.",
    category: "general",
    requiredObsRequests: [GetVersion.requestType],
    inputSchema: EmptyInput,
    outputSchema: VersionOutput,
    handler: async (_input, context) => getVersion(context.client)
  }),
  defineTool({
    name: "get_obs_stats",
    title: "Get OBS Stats",
    description: "Return current OBS, obs-websocket, render, output, CPU, memory, and disk statistics.",
    category: "general",
    requiredObsRequests: [GetStats.requestType],
    inputSchema: EmptyInput,
    outputSchema: ObsStatsOutput,
    handler: async (_input, context) => getObsStats(context.client)
  }),
  defineTool({
    name: "list_scenes",
    title: "List OBS Scenes",
    description: "Return current program and preview scenes plus ordered scene summaries.",
    category: "scenes",
    requiredObsRequests: [GetSceneList.requestType],
    inputSchema: ListScenesInput,
    outputSchema: ListScenesOutput,
    handler: async (input, context) => listScenes(context.client, Schema.decodeUnknownSync(ListScenesInput)(input))
  }),
  defineTool({
    name: "get_current_scene",
    title: "Get Current OBS Scene",
    description: "Return the current OBS program scene name and UUID when OBS provides one.",
    category: "scenes",
    requiredObsRequests: [GetCurrentProgramScene.requestType],
    inputSchema: EmptyInput,
    outputSchema: CurrentSceneOutput,
    handler: async (_input, context) => getCurrentScene(context.client)
  }),
  defineTool({
    name: "set_current_scene",
    title: "Set Current OBS Scene",
    description: "Switch the current OBS program scene by scene name.",
    category: "scenes",
    requiredObsRequests: [SetCurrentProgramScene.requestType],
    inputSchema: SetCurrentSceneInput,
    outputSchema: SetCurrentSceneOutput,
    handler: async (input, context) =>
      setCurrentScene(context.client, Schema.decodeUnknownSync(SetCurrentSceneInput)(input))
  }),
  defineTool({
    name: "list_scene_items",
    title: "List OBS Scene Items",
    description: "Return ordered scene item summaries for a scene selected by name or UUID.",
    category: "scenes",
    requiredObsRequests: [GetSceneItemList.requestType],
    inputSchema: ListSceneItemsInput,
    outputSchema: ListSceneItemsOutput,
    handler: async (input, context) =>
      listSceneItems(context.client, Schema.decodeUnknownSync(ListSceneItemsInput)(input))
  }),
  defineTool({
    name: "list_group_scene_items",
    title: "List OBS Group Scene Items",
    description: "Return ordered scene item summaries for a group selected by name or UUID.",
    category: "scenes",
    requiredObsRequests: [GetGroupSceneItemList.requestType],
    inputSchema: ListGroupSceneItemsInput,
    outputSchema: ListGroupSceneItemsOutput,
    handler: async (input, context) =>
      listGroupSceneItems(context.client, Schema.decodeUnknownSync(ListGroupSceneItemsInput)(input))
  }),
  defineTool({
    name: "get_scene_item_id",
    title: "Get OBS Scene Item ID",
    description: "Find a source by name in a scene or group and return its numeric scene item ID.",
    category: "scenes",
    requiredObsRequests: [GetSceneItemId.requestType],
    inputSchema: GetSceneItemIdInput,
    outputSchema: GetSceneItemIdOutput,
    handler: async (input, context) =>
      getSceneItemId(context.client, Schema.decodeUnknownSync(GetSceneItemIdInput)(input))
  }),
  defineTool({
    name: "get_scene_item_source",
    title: "Get OBS Scene Item Source",
    description: "Return the source name and UUID associated with a scene item ID.",
    category: "scenes",
    requiredObsRequests: [GetSceneItemSource.requestType],
    inputSchema: GetSceneItemSourceInput,
    outputSchema: GetSceneItemSourceOutput,
    handler: async (input, context) =>
      getSceneItemSource(context.client, Schema.decodeUnknownSync(GetSceneItemSourceInput)(input))
  }),
  defineTool({
    name: "list_inputs",
    title: "List OBS Inputs",
    description: "Return OBS inputs, optionally restricted to one input kind.",
    category: "inputs",
    requiredObsRequests: [GetInputList.requestType],
    inputSchema: ListInputsInput,
    outputSchema: ListInputsOutput,
    handler: async (input, context) => listInputs(context.client, Schema.decodeUnknownSync(ListInputsInput)(input))
  }),
  defineTool({
    name: "list_input_kinds",
    title: "List OBS Input Kinds",
    description: "Return OBS input kinds, with optional unversioned kind names.",
    category: "inputs",
    requiredObsRequests: [GetInputKindList.requestType],
    inputSchema: ListInputKindsInput,
    outputSchema: ListInputKindsOutput,
    handler: async (input, context) =>
      listInputKinds(context.client, Schema.decodeUnknownSync(ListInputKindsInput)(input))
  }),
  defineTool({
    name: "get_special_inputs",
    title: "Get OBS Special Inputs",
    description: "Return OBS desktop and microphone special input names.",
    category: "inputs",
    requiredObsRequests: [GetSpecialInputs.requestType],
    inputSchema: EmptyInput,
    outputSchema: SpecialInputsOutput,
    handler: async (_input, context) => getSpecialInputs(context.client)
  }),
  defineTool({
    name: "get_virtual_cam_status",
    title: "Get OBS Virtual Camera Status",
    description: "Return whether OBS virtual camera output is active.",
    category: "outputs",
    requiredObsRequests: [GetVirtualCamStatus.requestType],
    inputSchema: EmptyInput,
    outputSchema: VirtualCamStatusOutput,
    handler: async (_input, context) => getVirtualCamStatus(context.client)
  }),
  defineTool({
    name: "start_virtual_cam",
    title: "Start OBS Virtual Camera",
    description: "Start the OBS virtual camera output.",
    category: "outputs",
    requiredObsRequests: [StartVirtualCam.requestType],
    inputSchema: EmptyInput,
    outputSchema: VirtualCamSwitchOutput,
    handler: async (_input, context) => startVirtualCam(context.client)
  }),
  defineTool({
    name: "stop_virtual_cam",
    title: "Stop OBS Virtual Camera",
    description: "Stop the OBS virtual camera output.",
    category: "outputs",
    requiredObsRequests: [StopVirtualCam.requestType],
    inputSchema: EmptyInput,
    outputSchema: VirtualCamSwitchOutput,
    handler: async (_input, context) => stopVirtualCam(context.client)
  }),
  defineTool({
    name: "toggle_virtual_cam",
    title: "Toggle OBS Virtual Camera",
    description: "Toggle the OBS virtual camera output and return the resulting activity state.",
    category: "outputs",
    requiredObsRequests: [ToggleVirtualCam.requestType],
    inputSchema: EmptyInput,
    outputSchema: VirtualCamSwitchOutput,
    handler: async (_input, context) => toggleVirtualCam(context.client)
  }),
  defineTool({
    name: "get_record_status",
    title: "Get OBS Record Status",
    description: "Return the active, paused, timecode, duration, and byte count status for the OBS record output.",
    category: "record",
    requiredObsRequests: [GetRecordStatus.requestType],
    inputSchema: EmptyInput,
    outputSchema: RecordStatusOutput,
    handler: async (_input, context) => getRecordStatus(context.client)
  }),
  defineTool({
    name: "pause_record",
    title: "Pause OBS Recording",
    description: "Pause the active OBS record output.",
    category: "record",
    requiredObsRequests: [PauseRecord.requestType],
    inputSchema: EmptyInput,
    outputSchema: RecordPauseControlOutput,
    handler: async (_input, context) => pauseRecord(context.client)
  }),
  defineTool({
    name: "resume_record",
    title: "Resume OBS Recording",
    description: "Resume a paused OBS record output.",
    category: "record",
    requiredObsRequests: [ResumeRecord.requestType],
    inputSchema: EmptyInput,
    outputSchema: RecordPauseControlOutput,
    handler: async (_input, context) => resumeRecord(context.client)
  }),
  defineTool({
    name: "toggle_record_pause",
    title: "Toggle OBS Recording Pause",
    description: "Toggle the pause state of the OBS record output.",
    category: "record",
    requiredObsRequests: [ToggleRecordPause.requestType],
    inputSchema: EmptyInput,
    outputSchema: RecordPauseControlOutput,
    handler: async (_input, context) => toggleRecordPause(context.client)
  }),
  defineTool({
    name: "get_stream_status",
    title: "Get OBS Stream Status",
    description: "Return OBS stream output activity, reconnecting state, timing, congestion, byte, and frame counts.",
    category: "stream",
    requiredObsRequests: [GetStreamStatus.requestType],
    inputSchema: EmptyInput,
    outputSchema: StreamStatusOutput,
    handler: async (_input, context) => getStreamStatus(context.client)
  }),
  defineTool({
    name: "start_stream",
    title: "Start OBS Stream",
    description: "Start the OBS stream output.",
    category: "stream",
    requiredObsRequests: [StartStream.requestType],
    inputSchema: EmptyInput,
    outputSchema: StartStreamOutput,
    handler: async (_input, context) => startStream(context.client)
  }),
  defineTool({
    name: "stop_stream",
    title: "Stop OBS Stream",
    description: "Stop the OBS stream output.",
    category: "stream",
    requiredObsRequests: [StopStream.requestType],
    inputSchema: EmptyInput,
    outputSchema: StopStreamOutput,
    handler: async (_input, context) => stopStream(context.client)
  }),
  defineTool({
    name: "toggle_stream",
    title: "Toggle OBS Stream",
    description: "Toggle the OBS stream output and return the resulting activity state.",
    category: "stream",
    requiredObsRequests: [ToggleStream.requestType],
    inputSchema: EmptyInput,
    outputSchema: ToggleStreamOutput,
    handler: async (_input, context) => toggleStream(context.client)
  })
] as const

export const getEnabledTools = (
  enabledToolsets: ReadonlyArray<string>,
  availableRequests?: ReadonlyArray<string>
): ReadonlyArray<ToolDefinition> => {
  const enabled = new Set(enabledToolsets)
  const available = availableRequests === undefined ? undefined : new Set(availableRequests)
  return allTools.filter((tool) =>
    enabled.has(tool.category)
    && (
      available === undefined
      || tool.requiredObsRequests.every((requestType) => available.has(requestType))
    )
  )
}

export const executeTool = async (
  tool: ToolDefinition,
  input: unknown,
  context: ToolContext
): Promise<unknown> => {
  try {
    const decodedInput = Schema.decodeUnknownSync(tool.inputSchema)(input ?? {})
    const result = await tool.handler(decodedInput, context)
    return Schema.decodeUnknownSync(tool.outputSchema)(result)
  } catch (error) {
    throw toMcpError(error)
  }
}
