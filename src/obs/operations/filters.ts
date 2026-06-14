import { Schema } from "effect"

import type {
  CreateSourceFilterOutput,
  ListSourceFilterKindsOutput,
  ListSourceFiltersOutput,
  SanitizedFilterSetting,
  SanitizedFilterValueType,
  SetSourceFilterEnabledOutput,
  SetSourceFilterIndexOutput,
  SetSourceFilterNameOutput,
  SetSourceFilterSettingsOutput,
  SourceFilterAcknowledgedOutput,
  SourceFilterDefaultSettingsOutput,
  SourceFilterKindInput,
  SourceFilterLocatorInput,
  SourceFilterOutput,
  SourceFilterSummary
} from "../../domain/schemas/filters.js"
import {
  CreateSourceFilterInput,
  ListSourceFilterKindsOutput as ListSourceFilterKindsOutputSchema,
  ListSourceFiltersOutput as ListSourceFiltersOutputSchema,
  SetSourceFilterEnabledInput,
  SetSourceFilterIndexInput,
  SetSourceFilterNameInput,
  SetSourceFilterSettingsInput,
  SourceFilterDefaultSettingsOutput as SourceFilterDefaultSettingsOutputSchema,
  SourceFilterKindInput as SourceFilterKindInputSchema,
  SourceFilterLocatorInput as SourceFilterLocatorInputSchema,
  SourceFilterOutput as SourceFilterOutputSchema
} from "../../domain/schemas/filters.js"
import { SourceLocatorInput } from "../../domain/schemas/scenes.js"
import { JsonRecordKey } from "../../domain/schemas/shared.js"
import type { ObsClient } from "../client.js"
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
} from "../requests.js"
import { withDefinedFields } from "./shared.js"

const filterValueType = (value: unknown): SanitizedFilterValueType => {
  if (value === null) {
    return "null"
  }
  if (Array.isArray(value)) {
    return "array"
  }
  if (typeof value === "string") {
    return "string"
  }
  if (typeof value === "number") {
    return "number"
  }
  if (typeof value === "boolean") {
    return "boolean"
  }
  if (typeof value === "object") {
    return "object"
  }
  return "unknown"
}

const sanitizeSettingsRecord = (settings: Readonly<Record<string, unknown>>): ReadonlyArray<SanitizedFilterSetting> =>
  Object.entries(settings)
    .map(([settingName, value]) => ({ settingName, valueType: filterValueType(value) }))
    .sort((left, right) => left.settingName.localeCompare(right.settingName))

const stringField = (record: Readonly<Record<string, unknown>>, key: string, fallback: string): string =>
  typeof record[key] === "string" ? record[key] : fallback

const booleanField = (record: Readonly<Record<string, unknown>>, key: string, fallback: boolean): boolean =>
  typeof record[key] === "boolean" ? record[key] : fallback

const indexField = (record: Readonly<Record<string, unknown>>, key: string, fallback: number): number =>
  typeof record[key] === "number" && Number.isInteger(record[key]) && record[key] >= 0 ? record[key] : fallback

const settingsField = (record: Readonly<Record<string, unknown>>, key: string): Readonly<Record<string, unknown>> =>
  typeof record[key] === "object" && record[key] !== null && !Array.isArray(record[key])
    ? Schema.decodeUnknownSync(Schema.Record({ key: JsonRecordKey, value: Schema.Unknown }))(record[key])
    : {}

const sanitizeFilterSummary = (
  filter: Readonly<Record<string, unknown>>,
  indexFallback: number,
  nameFallback: string
): SourceFilterSummary => ({
  filterName: stringField(filter, "filterName", nameFallback),
  filterEnabled: booleanField(filter, "filterEnabled", false),
  filterIndex: indexField(filter, "filterIndex", indexFallback),
  filterKind: stringField(filter, "filterKind", "unknown_filter"),
  filterSettings: sanitizeSettingsRecord(settingsField(filter, "filterSettings")),
  rawSettingsDeferred: true
})

const filterSettingsPatchToObsSettings = (
  settings: SetSourceFilterSettingsInput["filterSettings"]
): Readonly<Record<string, unknown>> =>
  Object.fromEntries(
    [
      ["brightness", settings.brightness],
      ["contrast", settings.contrast],
      ["gamma", settings.gamma],
      ["saturation", settings.saturation],
      ["hue_shift", settings.hueShift],
      ["opacity", settings.opacity],
      ["color_multiply", settings.colorMultiply],
      ["color_add", settings.colorAdd],
      ["db", settings.db]
    ].filter(([, value]) => value !== undefined)
  )

const sourceLocatorRequestData = (
  input: Readonly<{
    canvasUuid?: string | undefined
    sourceName?: string | undefined
    sourceUuid?: string | undefined
  }>
) =>
  withDefinedFields({
    sourceName: input.sourceName,
    sourceUuid: input.sourceUuid,
    canvasUuid: input.canvasUuid
  })

export const listSourceFilterKinds = async (client: ObsClient): Promise<ListSourceFilterKindsOutput> =>
  Schema.decodeUnknownSync(ListSourceFilterKindsOutputSchema)(await client.request(GetSourceFilterKindList))

export const listSourceFilters = async (
  client: ObsClient,
  input: SourceLocatorInput
): Promise<ListSourceFiltersOutput> => {
  const decodedInput = Schema.decodeUnknownSync(SourceLocatorInput)(input)
  const response = await client.request(GetSourceFilterList, decodedInput)
  return Schema.decodeUnknownSync(ListSourceFiltersOutputSchema)({
    filters: response.filters.map((filter, index) => sanitizeFilterSummary(filter, index, `filter-${index}`))
  })
}

export const getSourceFilterDefaultSettings = async (
  client: ObsClient,
  input: SourceFilterKindInput
): Promise<SourceFilterDefaultSettingsOutput> => {
  const decodedInput = Schema.decodeUnknownSync(SourceFilterKindInputSchema)(input)
  const response = await client.request(GetSourceFilterDefaultSettings, decodedInput)
  return Schema.decodeUnknownSync(SourceFilterDefaultSettingsOutputSchema)({
    filterKind: decodedInput.filterKind,
    defaultFilterSettings: sanitizeSettingsRecord(response.defaultFilterSettings),
    rawSettingsDeferred: true
  })
}

export const getSourceFilter = async (
  client: ObsClient,
  input: SourceFilterLocatorInput
): Promise<SourceFilterOutput> => {
  const decodedInput = Schema.decodeUnknownSync(SourceFilterLocatorInputSchema)(input)
  const response = await client.request(GetSourceFilter, decodedInput)
  return Schema.decodeUnknownSync(SourceFilterOutputSchema)(
    sanitizeFilterSummary(
      { filterName: decodedInput.filterName, ...response },
      response.filterIndex,
      decodedInput.filterName
    )
  )
}

export const createSourceFilter = async (
  client: ObsClient,
  input: CreateSourceFilterInput
): Promise<CreateSourceFilterOutput> => {
  const decodedInput = Schema.decodeUnknownSync(CreateSourceFilterInput)(input)
  await client.request(CreateSourceFilter, {
    ...sourceLocatorRequestData(decodedInput),
    filterName: decodedInput.filterName,
    filterKind: decodedInput.filterKind,
    ...(decodedInput.filterSettings === undefined
      ? {}
      : { filterSettings: filterSettingsPatchToObsSettings(decodedInput.filterSettings) })
  })
  return {
    filterName: decodedInput.filterName,
    filterKind: decodedInput.filterKind,
    acknowledged: true
  }
}

export const removeSourceFilter = async (
  client: ObsClient,
  input: SourceFilterLocatorInput
): Promise<SourceFilterAcknowledgedOutput> => {
  const decodedInput = Schema.decodeUnknownSync(SourceFilterLocatorInputSchema)(input)
  await client.request(RemoveSourceFilter, decodedInput)
  return { filterName: decodedInput.filterName, acknowledged: true }
}

export const setSourceFilterSettings = async (
  client: ObsClient,
  input: SetSourceFilterSettingsInput
): Promise<SetSourceFilterSettingsOutput> => {
  const decodedInput = Schema.decodeUnknownSync(SetSourceFilterSettingsInput)(input)
  const overlay = decodedInput.overlay ?? true
  await client.request(SetSourceFilterSettings, {
    ...sourceLocatorRequestData(decodedInput),
    filterName: decodedInput.filterName,
    filterSettings: filterSettingsPatchToObsSettings(decodedInput.filterSettings),
    overlay
  })
  return {
    filterName: decodedInput.filterName,
    filterSettings: decodedInput.filterSettings,
    overlay,
    acknowledged: true
  }
}

export const setSourceFilterEnabled = async (
  client: ObsClient,
  input: SetSourceFilterEnabledInput
): Promise<SetSourceFilterEnabledOutput> => {
  const decodedInput = Schema.decodeUnknownSync(SetSourceFilterEnabledInput)(input)
  await client.request(SetSourceFilterEnabled, decodedInput)
  return {
    filterName: decodedInput.filterName,
    filterEnabled: decodedInput.filterEnabled,
    acknowledged: true
  }
}

export const setSourceFilterIndex = async (
  client: ObsClient,
  input: SetSourceFilterIndexInput
): Promise<SetSourceFilterIndexOutput> => {
  const decodedInput = Schema.decodeUnknownSync(SetSourceFilterIndexInput)(input)
  await client.request(SetSourceFilterIndex, decodedInput)
  return {
    filterName: decodedInput.filterName,
    filterIndex: decodedInput.filterIndex,
    acknowledged: true
  }
}

export const setSourceFilterName = async (
  client: ObsClient,
  input: SetSourceFilterNameInput
): Promise<SetSourceFilterNameOutput> => {
  const decodedInput = Schema.decodeUnknownSync(SetSourceFilterNameInput)(input)
  await client.request(SetSourceFilterName, decodedInput)
  return {
    filterName: decodedInput.newFilterName,
    acknowledged: true
  }
}
