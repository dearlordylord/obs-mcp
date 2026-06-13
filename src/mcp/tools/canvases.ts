import { ListCanvasesOutput } from "../../domain/schemas/index.js"
import { EmptyInput } from "../../domain/schemas/shared.js"
import { listCanvases } from "../../obs/operations/canvases.js"
import { GetCanvasList } from "../../obs/requests.js"
import { defineTool, type ToolDefinition } from "./mechanics.js"

const CATEGORY = "canvases" as const

export const canvasTools: ReadonlyArray<ToolDefinition> = [
  defineTool({
    name: "list_canvases",
    title: "List OBS Canvases",
    description: "Return stable OBS canvas summaries without exposing raw canvas objects.",
    category: CATEGORY,
    requiredObsRequests: [GetCanvasList.requestType],
    inputSchema: EmptyInput,
    outputSchema: ListCanvasesOutput,
    handler: async (_input, context) => listCanvases(context.client)
  })
]
