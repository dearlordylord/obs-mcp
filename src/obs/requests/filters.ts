import { Schema } from "effect"
import {
  ListSourceFilterKindsOutput,
  ObsSourceFilterDefaultSettingsOutput,
  ObsSourceFilterListOutput,
  ObsSourceFilterOutput,
  SetSourceFilterEnabledInput,
  SetSourceFilterIndexInput,
  SetSourceFilterNameInput,
  SourceFilterKindInput,
  SourceFilterLocatorInput
} from "../../domain/schemas/filters.js"
import { SourceLocatorInput } from "../../domain/schemas/scenes.js"
import { EmptyRequestData, type ObsRequestDescriptor } from "./shared.js"

const EmptyResponseData = Schema.Struct({})

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

export const SetSourceFilterEnabled = {
  requestType: "SetSourceFilterEnabled",
  requestDataSchema: SetSourceFilterEnabledInput,
  responseSchema: EmptyResponseData
} satisfies ObsRequestDescriptor<typeof EmptyResponseData.Type>

export const SetSourceFilterIndex = {
  requestType: "SetSourceFilterIndex",
  requestDataSchema: SetSourceFilterIndexInput,
  responseSchema: EmptyResponseData
} satisfies ObsRequestDescriptor<typeof EmptyResponseData.Type>

export const SetSourceFilterName = {
  requestType: "SetSourceFilterName",
  requestDataSchema: SetSourceFilterNameInput,
  responseSchema: EmptyResponseData
} satisfies ObsRequestDescriptor<typeof EmptyResponseData.Type>
