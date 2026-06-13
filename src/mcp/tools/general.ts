import { getSanitizedObsContext } from "../../config/obs-runtime-context.js"
import { ObsContextOutput, ObsStatsOutput, VersionOutput } from "../../domain/schemas/index.js"
import { EmptyInput } from "../../domain/schemas/shared.js"
import { getObsStats, getVersion } from "../../obs/operations/general.js"
import { GetStats, GetVersion } from "../../obs/requests.js"
import { defineTool, type ToolDefinition } from "./mechanics.js"

const CATEGORY = "general" as const

export const generalTools: ReadonlyArray<ToolDefinition> = [
  defineTool({
    name: "get_obs_context",
    title: "Get OBS MCP Context",
    description: "Return sanitized OBS MCP runtime context without secrets.",
    category: CATEGORY,
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
    category: CATEGORY,
    requiredObsRequests: [GetVersion.requestType],
    inputSchema: EmptyInput,
    outputSchema: VersionOutput,
    handler: async (_input, context) => getVersion(context.client)
  }),
  defineTool({
    name: "get_obs_stats",
    title: "Get OBS Stats",
    description: "Return current OBS, obs-websocket, render, output, CPU, memory, and disk statistics.",
    category: CATEGORY,
    requiredObsRequests: [GetStats.requestType],
    inputSchema: EmptyInput,
    outputSchema: ObsStatsOutput,
    handler: async (_input, context) => getObsStats(context.client)
  })
]
