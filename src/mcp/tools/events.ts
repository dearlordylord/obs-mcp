import { GetRecentObsEventsInput, GetRecentObsEventsOutput } from "../../domain/schemas/index.js"
import { getRecentObsEvents } from "../../obs/operations/events.js"
import { defineTool, type ToolDefinition } from "./mechanics.js"

const CATEGORY = "events" as const

export const eventTools: ReadonlyArray<ToolDefinition> = [
  defineTool({
    name: "get_recent_obs_events",
    title: "Get Recent Safe OBS Events",
    description: "Return recent buffered safe OBS events with optional category filters and explicit ordering.",
    category: CATEGORY,
    requiredObsRequests: [],
    inputSchema: GetRecentObsEventsInput,
    outputSchema: GetRecentObsEventsOutput,
    handler: async (input, context) => getRecentObsEvents(context.client, input)
  })
]
