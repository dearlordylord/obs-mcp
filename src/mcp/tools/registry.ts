import { JSONSchema, Schema } from "effect"

import type { ObsConfig } from "../../config/config.js"
import { getSanitizedObsContext } from "../../config/obs-runtime-context.js"
import {
  CurrentSceneOutput,
  EmptyInput,
  ListScenesInput,
  ListScenesOutput,
  ObsContextOutput,
  SetCurrentSceneInput,
  SetCurrentSceneOutput,
  VersionOutput,
  VirtualCamStatusOutput,
  VirtualCamSwitchOutput
} from "../../domain/schemas/index.js"
import type { ObsClient } from "../../obs/client.js"
import { getVersion } from "../../obs/operations/general.js"
import { getVirtualCamStatus, startVirtualCam, stopVirtualCam, toggleVirtualCam } from "../../obs/operations/outputs.js"
import { getCurrentScene, listScenes, setCurrentScene } from "../../obs/operations/scenes.js"
import {
  GetCurrentProgramScene,
  GetSceneList,
  GetVersion,
  GetVirtualCamStatus,
  SetCurrentProgramScene,
  StartVirtualCam,
  StopVirtualCam,
  ToggleVirtualCam
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
  readonly category: "scenes" | "outputs"
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
  readonly category: "scenes" | "outputs"
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
    name: "get_virtual_cam_status",
    title: "Get OBS Virtual Camera Status",
    description: "Return whether the OBS virtual camera output is active.",
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
    description: "Toggle the OBS virtual camera output and return the resulting active state.",
    category: "outputs",
    requiredObsRequests: [ToggleVirtualCam.requestType],
    inputSchema: EmptyInput,
    outputSchema: VirtualCamSwitchOutput,
    handler: async (_input, context) => toggleVirtualCam(context.client)
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
