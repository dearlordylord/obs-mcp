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

const FilterSignedUnit = Schema.Number.pipe(Schema.greaterThanOrEqualTo(-1), Schema.lessThanOrEqualTo(1))
const FilterColorInteger = Schema.Number.pipe(
  Schema.int(),
  Schema.greaterThanOrEqualTo(0),
  Schema.lessThanOrEqualTo(4_294_967_295)
)

export const SourceFilterSettingsPatch = Schema.Struct({
  brightness: Schema.optional(FilterSignedUnit),
  contrast: Schema.optional(FilterSignedUnit),
  gamma: Schema.optional(Schema.Number.pipe(Schema.greaterThanOrEqualTo(-3), Schema.lessThanOrEqualTo(3))),
  saturation: Schema.optional(FilterSignedUnit),
  hueShift: Schema.optional(Schema.Number.pipe(Schema.greaterThanOrEqualTo(-180), Schema.lessThanOrEqualTo(180))),
  opacity: Schema.optional(Schema.Number.pipe(Schema.greaterThanOrEqualTo(0), Schema.lessThanOrEqualTo(1))),
  colorMultiply: Schema.optional(FilterColorInteger),
  colorAdd: Schema.optional(FilterColorInteger),
  db: Schema.optional(Schema.Number.pipe(Schema.greaterThanOrEqualTo(-100), Schema.lessThanOrEqualTo(100)))
}).pipe(
  Schema.filter((settings) => Object.values(settings).some((value) => value !== undefined), {
    message: () => "At least one allowlisted filter setting is required"
  })
)
export type SourceFilterSettingsPatch = typeof SourceFilterSettingsPatch.Type
export const SourceFilterSettingsPatchJsonSchema = JSONSchema.make(SourceFilterSettingsPatch)

export const CreateSourceFilterInput = Schema.extend(
  SourceLocatorInput,
  Schema.Struct({
    filterName: Schema.NonEmptyString,
    filterKind: Schema.NonEmptyString,
    filterSettings: Schema.optional(SourceFilterSettingsPatch)
  })
)
export type CreateSourceFilterInput = typeof CreateSourceFilterInput.Type
export const CreateSourceFilterInputJsonSchema = JSONSchema.make(CreateSourceFilterInput)

export const CreateSourceFilterOutput = Schema.Struct({
  filterName: Schema.String,
  filterKind: Schema.String,
  acknowledged: Schema.Literal(true)
})
export type CreateSourceFilterOutput = typeof CreateSourceFilterOutput.Type
export const CreateSourceFilterOutputJsonSchema = JSONSchema.make(CreateSourceFilterOutput)

export const ObsCreateSourceFilterInput = Schema.extend(
  SourceLocatorInput,
  Schema.Struct({
    filterName: Schema.NonEmptyString,
    filterKind: Schema.NonEmptyString,
    filterSettings: Schema.optional(UnknownRecord)
  })
)
export type ObsCreateSourceFilterInput = typeof ObsCreateSourceFilterInput.Type

export const SetSourceFilterSettingsInput = Schema.extend(
  SourceFilterLocatorInput,
  Schema.Struct({
    filterSettings: SourceFilterSettingsPatch,
    overlay: Schema.optional(Schema.Boolean)
  })
)
export type SetSourceFilterSettingsInput = typeof SetSourceFilterSettingsInput.Type
export const SetSourceFilterSettingsInputJsonSchema = JSONSchema.make(SetSourceFilterSettingsInput)

export const SetSourceFilterSettingsOutput = Schema.Struct({
  filterName: Schema.String,
  filterSettings: SourceFilterSettingsPatch,
  overlay: Schema.Boolean,
  acknowledged: Schema.Literal(true)
})
export type SetSourceFilterSettingsOutput = typeof SetSourceFilterSettingsOutput.Type
export const SetSourceFilterSettingsOutputJsonSchema = JSONSchema.make(SetSourceFilterSettingsOutput)

export const ObsSetSourceFilterSettingsInput = Schema.extend(
  SourceFilterLocatorInput,
  Schema.Struct({
    filterSettings: UnknownRecord,
    overlay: Schema.optionalWith(Schema.Boolean, { default: () => true })
  })
)
export type ObsSetSourceFilterSettingsInput = typeof ObsSetSourceFilterSettingsInput.Type

export const SourceFilterAcknowledgedOutput = Schema.Struct({
  filterName: Schema.String,
  acknowledged: Schema.Literal(true)
})
export type SourceFilterAcknowledgedOutput = typeof SourceFilterAcknowledgedOutput.Type
export const SourceFilterAcknowledgedOutputJsonSchema = JSONSchema.make(SourceFilterAcknowledgedOutput)

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
