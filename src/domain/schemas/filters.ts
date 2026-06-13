import { JSONSchema, Schema } from "effect"

import { SourceLocatorInput } from "./scenes.js"
import { UnknownRecord } from "./shared.js"

export const ListSourceFilterKindsOutput = Schema.Struct({
  sourceFilterKinds: Schema.Array(Schema.String)
})
export type ListSourceFilterKindsOutput = typeof ListSourceFilterKindsOutput.Type
export const ListSourceFilterKindsOutputJsonSchema = JSONSchema.make(ListSourceFilterKindsOutput)

export const SourceFilterKindInput = Schema.Struct({
  filterKind: Schema.NonEmptyString
})
export type SourceFilterKindInput = typeof SourceFilterKindInput.Type
export const SourceFilterKindInputJsonSchema = JSONSchema.make(SourceFilterKindInput)

export const SourceFilterLocatorInput = Schema.extend(
  SourceLocatorInput,
  Schema.Struct({
    filterName: Schema.NonEmptyString
  })
)
export type SourceFilterLocatorInput = typeof SourceFilterLocatorInput.Type
export const SourceFilterLocatorInputJsonSchema = JSONSchema.make(SourceFilterLocatorInput)

export const SanitizedFilterValueType = Schema.Literal(
  "string",
  "number",
  "boolean",
  "null",
  "array",
  "object",
  "unknown"
)
export type SanitizedFilterValueType = typeof SanitizedFilterValueType.Type

export const SanitizedFilterSetting = Schema.Struct({
  settingName: Schema.String,
  valueType: SanitizedFilterValueType
})
export type SanitizedFilterSetting = typeof SanitizedFilterSetting.Type

export const SourceFilterDefaultSettingsOutput = Schema.Struct({
  filterKind: Schema.String,
  defaultFilterSettings: Schema.Array(SanitizedFilterSetting),
  rawSettingsDeferred: Schema.Literal(true)
})
export type SourceFilterDefaultSettingsOutput = typeof SourceFilterDefaultSettingsOutput.Type
export const SourceFilterDefaultSettingsOutputJsonSchema = JSONSchema.make(SourceFilterDefaultSettingsOutput)

export const SourceFilterSummary = Schema.Struct({
  filterName: Schema.String,
  filterEnabled: Schema.Boolean,
  filterIndex: Schema.Number.pipe(Schema.int(), Schema.greaterThanOrEqualTo(0)),
  filterKind: Schema.String,
  filterSettings: Schema.Array(SanitizedFilterSetting),
  rawSettingsDeferred: Schema.Literal(true)
})
export type SourceFilterSummary = typeof SourceFilterSummary.Type

export const ListSourceFiltersOutput = Schema.Struct({
  filters: Schema.Array(SourceFilterSummary)
})
export type ListSourceFiltersOutput = typeof ListSourceFiltersOutput.Type
export const ListSourceFiltersOutputJsonSchema = JSONSchema.make(ListSourceFiltersOutput)

export const SourceFilterOutput = SourceFilterSummary
export type SourceFilterOutput = typeof SourceFilterOutput.Type
export const SourceFilterOutputJsonSchema = JSONSchema.make(SourceFilterOutput)

export const ObsSourceFilterDefaultSettingsOutput = Schema.Struct({
  defaultFilterSettings: UnknownRecord
})
export type ObsSourceFilterDefaultSettingsOutput = typeof ObsSourceFilterDefaultSettingsOutput.Type

export const ObsSourceFilterListOutput = Schema.Struct({
  filters: Schema.Array(UnknownRecord)
})
export type ObsSourceFilterListOutput = typeof ObsSourceFilterListOutput.Type

export const ObsSourceFilterOutput = Schema.Struct({
  filterEnabled: Schema.Boolean,
  filterIndex: Schema.Number.pipe(Schema.int(), Schema.greaterThanOrEqualTo(0)),
  filterKind: Schema.String,
  filterSettings: UnknownRecord
})
export type ObsSourceFilterOutput = typeof ObsSourceFilterOutput.Type
