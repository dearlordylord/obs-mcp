import * as FilterSchemas from "../../domain/schemas/index.js"
import { EmptyInput } from "../../domain/schemas/shared.js"
import {
  getSourceFilter,
  getSourceFilterDefaultSettings,
  listSourceFilterKinds,
  listSourceFilters
} from "../../obs/operations/filters.js"
import {
  GetSourceFilter,
  GetSourceFilterDefaultSettings,
  GetSourceFilterKindList,
  GetSourceFilterList
} from "../../obs/requests.js"
import { defineTool, type ToolDefinition } from "./mechanics.js"

const CATEGORY = "filters" as const

export const filterTools: ReadonlyArray<ToolDefinition> = [
  defineTool({
    name: "list_source_filter_kinds",
    title: "List OBS Source Filter Kinds",
    description: "Return OBS source filter kinds available for creation in OBS.",
    category: CATEGORY,
    requiredObsRequests: [GetSourceFilterKindList.requestType],
    inputSchema: EmptyInput,
    outputSchema: FilterSchemas.ListSourceFilterKindsOutput,
    handler: async (_input, context) => listSourceFilterKinds(context.client)
  }),
  defineTool({
    name: "list_source_filters",
    title: "List OBS Source Filters",
    description: "Return sanitized filter summaries for a source selected by name or UUID.",
    category: CATEGORY,
    requiredObsRequests: [GetSourceFilterList.requestType],
    inputSchema: FilterSchemas.SourceLocatorInput,
    outputSchema: FilterSchemas.ListSourceFiltersOutput,
    handler: async (input, context) => listSourceFilters(context.client, input)
  }),
  defineTool({
    name: "get_source_filter_default_settings",
    title: "Get OBS Source Filter Default Settings",
    description: "Return key/type summaries for default settings of an OBS source filter kind.",
    category: CATEGORY,
    requiredObsRequests: [GetSourceFilterDefaultSettings.requestType],
    inputSchema: FilterSchemas.SourceFilterKindInput,
    outputSchema: FilterSchemas.SourceFilterDefaultSettingsOutput,
    handler: async (input, context) => getSourceFilterDefaultSettings(context.client, input)
  }),
  defineTool({
    name: "get_source_filter",
    title: "Get OBS Source Filter",
    description: "Return sanitized metadata and setting summaries for one OBS source filter.",
    category: CATEGORY,
    requiredObsRequests: [GetSourceFilter.requestType],
    inputSchema: FilterSchemas.SourceFilterLocatorInput,
    outputSchema: FilterSchemas.SourceFilterOutput,
    handler: async (input, context) => getSourceFilter(context.client, input)
  })
]
