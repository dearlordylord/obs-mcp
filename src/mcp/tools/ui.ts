import { StudioModeEnabledOutput } from "../../domain/schemas/index.js"
import { EmptyInput } from "../../domain/schemas/shared.js"
import { getStudioModeEnabled } from "../../obs/operations/ui.js"
import { GetStudioModeEnabled } from "../../obs/requests.js"
import { defineTool, type ToolDefinition } from "./mechanics.js"

const CATEGORY = "ui" as const

export const uiTools: ReadonlyArray<ToolDefinition> = [
  defineTool({
    name: "get_studio_mode_enabled",
    title: "Get OBS Studio Mode",
    description: "Return whether OBS studio mode is enabled.",
    category: CATEGORY,
    requiredObsRequests: [GetStudioModeEnabled.requestType],
    inputSchema: EmptyInput,
    outputSchema: StudioModeEnabledOutput,
    handler: async (_input, context) => getStudioModeEnabled(context.client)
  })
]
