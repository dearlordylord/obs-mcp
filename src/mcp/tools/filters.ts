import * as FilterSchemas from "../../domain/schemas/index.js"
import { EmptyInput } from "../../domain/schemas/shared.js"
import {
  createSourceFilter,
  getSourceFilter,
  getSourceFilterDefaultSettings,
  listSourceFilterKinds,
  listSourceFilters,
  removeSourceFilter,
  setSourceFilterEnabled,
  setSourceFilterIndex,
  setSourceFilterName,
  setSourceFilterSettings
} from "../../obs/operations/filters.js"
import {
  CreateSourceFilter,
  GetSourceFilter,
  GetSourceFilterDefaultSettings,
  GetSourceFilterKindList,
  GetSourceFilterList,
  RemoveSourceFilter,
  SetSourceFilterEnabled,
  SetSourceFilterIndex,
  SetSourceFilterName,
  SetSourceFilterSettings
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
  }),
  defineTool({
    name: "create_source_filter",
    title: "Create OBS Source Filter",
    description: "Create an OBS source filter. Optional filterSettings uses the narrow allowlisted settings patch.",
    category: CATEGORY,
    requiredObsRequests: [CreateSourceFilter.requestType],
    inputSchema: FilterSchemas.CreateSourceFilterInput,
    outputSchema: FilterSchemas.CreateSourceFilterOutput,
    handler: async (input, context) => createSourceFilter(context.client, input)
  }),
  defineTool({
    name: "remove_source_filter",
    title: "Remove OBS Source Filter",
    description: "Remove an OBS source filter by non-empty filter name.",
    category: CATEGORY,
    requiredObsRequests: [RemoveSourceFilter.requestType],
    inputSchema: FilterSchemas.SourceFilterLocatorInput,
    outputSchema: FilterSchemas.SourceFilterAcknowledgedOutput,
    handler: async (input, context) => removeSourceFilter(context.client, input)
  }),
  defineTool({
    name: "set_source_filter_settings",
    title: "Set OBS Source Filter Settings",
    description:
      "Apply a narrow allowlisted OBS source filter settings patch. Arbitrary raw settings are not accepted.",
    category: CATEGORY,
    requiredObsRequests: [SetSourceFilterSettings.requestType],
    inputSchema: FilterSchemas.SetSourceFilterSettingsInput,
    outputSchema: FilterSchemas.SetSourceFilterSettingsOutput,
    handler: async (input, context) => setSourceFilterSettings(context.client, input)
  }),
  defineTool({
    name: "set_source_filter_enabled",
    title: "Set OBS Source Filter Enabled",
    description: "Set whether an OBS source filter is enabled.",
    category: CATEGORY,
    requiredObsRequests: [SetSourceFilterEnabled.requestType],
    inputSchema: FilterSchemas.SetSourceFilterEnabledInput,
    outputSchema: FilterSchemas.SetSourceFilterEnabledOutput,
    handler: async (input, context) => setSourceFilterEnabled(context.client, input)
  }),
  defineTool({
    name: "set_source_filter_index",
    title: "Set OBS Source Filter Index",
    description: "Set a source filter's non-negative index position.",
    category: CATEGORY,
    requiredObsRequests: [SetSourceFilterIndex.requestType],
    inputSchema: FilterSchemas.SetSourceFilterIndexInput,
    outputSchema: FilterSchemas.SetSourceFilterIndexOutput,
    handler: async (input, context) => setSourceFilterIndex(context.client, input)
  }),
  defineTool({
    name: "set_source_filter_name",
    title: "Rename OBS Source Filter",
    description: "Rename an OBS source filter.",
    category: CATEGORY,
    requiredObsRequests: [SetSourceFilterName.requestType],
    inputSchema: FilterSchemas.SetSourceFilterNameInput,
    outputSchema: FilterSchemas.SetSourceFilterNameOutput,
    handler: async (input, context) => setSourceFilterName(context.client, input)
  })
]
