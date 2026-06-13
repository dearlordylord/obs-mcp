import { JSONSchema, Schema } from "effect"

import type { ObsConfig } from "../../config/config.js"
import { getSanitizedObsContext } from "../../config/obs-runtime-context.js"
import {
  CurrentSceneOutput,
  EmptyInput,
  ListInputKindsInput,
  ListInputKindsOutput,
  ListInputsInput,
  ListInputsOutput,
  ListScenesInput,
  ListScenesOutput,
  ObsContextOutput,
  SetCurrentSceneInput,
  SetCurrentSceneOutput,
  SpecialInputsOutput,
  VersionOutput
} from "../../domain/schemas/index.js"
import type { ObsClient } from "../../obs/client.js"
import { getVersion } from "../../obs/operations/general.js"
import { getSpecialInputs, listInputKinds, listInputs } from "../../obs/operations/inputs.js"
import { getCurrentScene, listScenes, setCurrentScene } from "../../obs/operations/scenes.js"
import {
  GetCurrentProgramScene,
  GetInputKindList,
  GetInputList,
  GetSceneList,
  GetSpecialInputs,
  GetVersion,
  SetCurrentProgramScene
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
  readonly category: "scenes" | "inputs"
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
  readonly category: "scenes" | "inputs"
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
