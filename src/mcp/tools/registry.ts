import { JSONSchema, Schema } from "effect"

import type { ObsConfig } from "../../config/config.js"
import { getSanitizedObsContext } from "../../config/obs-runtime-context.js"
import {
  CurrentSceneOutput,
  ListScenesInput,
  ListScenesOutput,
  ObsContextOutput,
  SetCurrentSceneInput,
  SetCurrentSceneOutput,
  StartStreamOutput,
  StopStreamOutput,
  StreamStatusOutput,
  ToggleStreamOutput,
  VersionOutput
} from "../../domain/schemas/index.js"
import { EmptyInput } from "../../domain/schemas/shared.js"
import type { ObsClient } from "../../obs/client.js"
import { getVersion } from "../../obs/operations/general.js"
import { getCurrentScene, listScenes, setCurrentScene } from "../../obs/operations/scenes.js"
import { getStreamStatus, startStream, stopStream, toggleStream } from "../../obs/operations/stream.js"
import {
  GetCurrentProgramScene,
  GetSceneList,
  GetStreamStatus,
  GetVersion,
  SetCurrentProgramScene,
  StartStream,
  StopStream,
  ToggleStream
} from "../../obs/requests.js"
import { toMcpError } from "../error-mapping.js"

interface ToolContext {
  readonly config: ObsConfig
  readonly client: ObsClient
}

type RuntimeSchema = Schema.Schema.AnyNoContext

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

type ToolCategory = "scenes" | "stream"

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
    category: "scenes",
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
    category: "scenes",
    requiredObsRequests: [GetVersion.requestType],
    inputSchema: EmptyInput,
    outputSchema: VersionOutput,
    handler: async (_input, context) => getVersion(context.client)
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
