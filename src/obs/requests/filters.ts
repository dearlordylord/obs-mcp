import {
  ListSourceFilterKindsOutput,
  ObsSourceFilterDefaultSettingsOutput,
  ObsSourceFilterListOutput,
  ObsSourceFilterOutput,
  SourceFilterKindInput,
  SourceFilterLocatorInput
} from "../../domain/schemas/filters.js"
import { SourceLocatorInput } from "../../domain/schemas/scenes.js"
import { EmptyRequestData, type ObsRequestDescriptor } from "./shared.js"

export const GetSourceFilterKindList = {
  requestType: "GetSourceFilterKindList",
  requestDataSchema: EmptyRequestData,
  responseSchema: ListSourceFilterKindsOutput
} satisfies ObsRequestDescriptor<ListSourceFilterKindsOutput>

export const GetSourceFilterList = {
  requestType: "GetSourceFilterList",
  requestDataSchema: SourceLocatorInput,
  responseSchema: ObsSourceFilterListOutput
} satisfies ObsRequestDescriptor<ObsSourceFilterListOutput>

export const GetSourceFilterDefaultSettings = {
  requestType: "GetSourceFilterDefaultSettings",
  requestDataSchema: SourceFilterKindInput,
  responseSchema: ObsSourceFilterDefaultSettingsOutput
} satisfies ObsRequestDescriptor<ObsSourceFilterDefaultSettingsOutput>

export const GetSourceFilter = {
  requestType: "GetSourceFilter",
  requestDataSchema: SourceFilterLocatorInput,
  responseSchema: ObsSourceFilterOutput
} satisfies ObsRequestDescriptor<ObsSourceFilterOutput>
