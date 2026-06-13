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

export const SetSourceFilterEnabledInput = Schema.extend(
  SourceFilterLocatorInput,
  Schema.Struct({
    filterEnabled: Schema.Boolean
  })
)
export type SetSourceFilterEnabledInput = typeof SetSourceFilterEnabledInput.Type
export const SetSourceFilterEnabledInputJsonSchema = JSONSchema.make(SetSourceFilterEnabledInput)

export const SetSourceFilterEnabledOutput = Schema.Struct({
  filterName: Schema.String,
  filterEnabled: Schema.Boolean,
  acknowledged: Schema.Literal(true)
})
export type SetSourceFilterEnabledOutput = typeof SetSourceFilterEnabledOutput.Type
export const SetSourceFilterEnabledOutputJsonSchema = JSONSchema.make(SetSourceFilterEnabledOutput)

export const SetSourceFilterIndexInput = Schema.extend(
  SourceFilterLocatorInput,
  Schema.Struct({
    filterIndex: Schema.Number.pipe(Schema.int(), Schema.greaterThanOrEqualTo(0))
  })
)
export type SetSourceFilterIndexInput = typeof SetSourceFilterIndexInput.Type
export const SetSourceFilterIndexInputJsonSchema = JSONSchema.make(SetSourceFilterIndexInput)

export const SetSourceFilterIndexOutput = Schema.Struct({
  filterName: Schema.String,
  filterIndex: Schema.Number.pipe(Schema.int(), Schema.greaterThanOrEqualTo(0)),
  acknowledged: Schema.Literal(true)
})
export type SetSourceFilterIndexOutput = typeof SetSourceFilterIndexOutput.Type
export const SetSourceFilterIndexOutputJsonSchema = JSONSchema.make(SetSourceFilterIndexOutput)

export const SetSourceFilterNameInput = Schema.extend(
  SourceFilterLocatorInput,
  Schema.Struct({
    newFilterName: Schema.NonEmptyString
  })
)
export type SetSourceFilterNameInput = typeof SetSourceFilterNameInput.Type
export const SetSourceFilterNameInputJsonSchema = JSONSchema.make(SetSourceFilterNameInput)

export const SetSourceFilterNameOutput = Schema.Struct({
  filterName: Schema.String,
  acknowledged: Schema.Literal(true)
})
export type SetSourceFilterNameOutput = typeof SetSourceFilterNameOutput.Type
export const SetSourceFilterNameOutputJsonSchema = JSONSchema.make(SetSourceFilterNameOutput)

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
