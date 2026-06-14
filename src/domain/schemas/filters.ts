import { JSONSchema, Schema } from "effect"

import { SourceLocatorInput } from "./scenes.js"
import {
  ObsNonEmptyString,
  ObsNonNegativeInteger,
  ObsNumber,
  ObsString,
  ObsUnitInterval,
  UnknownRecord
} from "./shared.js"

export const ListSourceFilterKindsOutput = Schema.Struct({
  sourceFilterKinds: Schema.Array(ObsString)
})
export type ListSourceFilterKindsOutput = typeof ListSourceFilterKindsOutput.Type
export const ListSourceFilterKindsOutputJsonSchema = JSONSchema.make(ListSourceFilterKindsOutput)

export const SourceFilterKindInput = Schema.Struct({
  filterKind: ObsNonEmptyString
})
export type SourceFilterKindInput = typeof SourceFilterKindInput.Type
export const SourceFilterKindInputJsonSchema = JSONSchema.make(SourceFilterKindInput)

export const SourceFilterLocatorInput = Schema.extend(
  SourceLocatorInput,
  Schema.Struct({
    filterName: ObsNonEmptyString
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
  settingName: ObsString,
  valueType: SanitizedFilterValueType
})
export type SanitizedFilterSetting = typeof SanitizedFilterSetting.Type

export const SourceFilterDefaultSettingsOutput = Schema.Struct({
  filterKind: ObsString,
  defaultFilterSettings: Schema.Array(SanitizedFilterSetting),
  rawSettingsDeferred: Schema.Literal(true)
})
export type SourceFilterDefaultSettingsOutput = typeof SourceFilterDefaultSettingsOutput.Type
export const SourceFilterDefaultSettingsOutputJsonSchema = JSONSchema.make(SourceFilterDefaultSettingsOutput)

export const SourceFilterSummary = Schema.Struct({
  filterName: ObsString,
  filterEnabled: Schema.Boolean,
  filterIndex: ObsNonNegativeInteger,
  filterKind: ObsString,
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

// Filter signed unit values are bounded structural floats where negative, zero, and positive are meaningful.
const FilterSignedUnitMin = -1
const FilterSignedUnitMax = 1
const FilterSignedUnit = ObsNumber.pipe(
  Schema.greaterThanOrEqualTo(FilterSignedUnitMin),
  Schema.lessThanOrEqualTo(FilterSignedUnitMax)
)
// OBS color values are packed unsigned integers; the field name carries color semantics, not a brand.
const FilterColorIntegerMax = 4_294_967_295
const FilterColorInteger = ObsNumber.pipe(
  Schema.int(),
  Schema.greaterThanOrEqualTo(0),
  Schema.lessThanOrEqualTo(FilterColorIntegerMax)
)
// Gamma is a bounded OBS filter scalar; branding would not add meaning beyond the allowlisted field.
const FilterGammaMin = -3
const FilterGammaMax = 3
const FilterGamma = ObsNumber.pipe(
  Schema.greaterThanOrEqualTo(FilterGammaMin),
  Schema.lessThanOrEqualTo(FilterGammaMax)
)
// Hue shift is a bounded degree value whose unit is carried by the field name.
const FilterHueShiftMin = -180
const FilterHueShiftMax = 180
const FilterHueShift = ObsNumber.pipe(
  Schema.greaterThanOrEqualTo(FilterHueShiftMin),
  Schema.lessThanOrEqualTo(FilterHueShiftMax)
)
// Gain is a bounded dB value where negative, zero, and positive values are expected.
const FilterDbMin = -100
const FilterDbMax = 100
const FilterDb = ObsNumber.pipe(Schema.greaterThanOrEqualTo(FilterDbMin), Schema.lessThanOrEqualTo(FilterDbMax))

export const SourceFilterSettingsPatch = Schema.Struct({
  brightness: Schema.optional(FilterSignedUnit),
  contrast: Schema.optional(FilterSignedUnit),
  gamma: Schema.optional(FilterGamma),
  saturation: Schema.optional(FilterSignedUnit),
  hueShift: Schema.optional(FilterHueShift),
  opacity: Schema.optional(ObsUnitInterval),
  colorMultiply: Schema.optional(FilterColorInteger),
  colorAdd: Schema.optional(FilterColorInteger),
  db: Schema.optional(FilterDb)
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
    filterName: ObsNonEmptyString,
    filterKind: ObsNonEmptyString,
    filterSettings: Schema.optional(SourceFilterSettingsPatch)
  })
)
export type CreateSourceFilterInput = typeof CreateSourceFilterInput.Type
export const CreateSourceFilterInputJsonSchema = JSONSchema.make(CreateSourceFilterInput)

export const CreateSourceFilterOutput = Schema.Struct({
  filterName: ObsString,
  filterKind: ObsString,
  acknowledged: Schema.Literal(true)
})
export type CreateSourceFilterOutput = typeof CreateSourceFilterOutput.Type
export const CreateSourceFilterOutputJsonSchema = JSONSchema.make(CreateSourceFilterOutput)

export const ObsCreateSourceFilterInput = Schema.extend(
  SourceLocatorInput,
  Schema.Struct({
    filterName: ObsNonEmptyString,
    filterKind: ObsNonEmptyString,
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
  filterName: ObsString,
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
  filterName: ObsString,
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
  filterName: ObsString,
  filterEnabled: Schema.Boolean,
  acknowledged: Schema.Literal(true)
})
export type SetSourceFilterEnabledOutput = typeof SetSourceFilterEnabledOutput.Type
export const SetSourceFilterEnabledOutputJsonSchema = JSONSchema.make(SetSourceFilterEnabledOutput)

export const SetSourceFilterIndexInput = Schema.extend(
  SourceFilterLocatorInput,
  Schema.Struct({
    filterIndex: ObsNonNegativeInteger
  })
)
export type SetSourceFilterIndexInput = typeof SetSourceFilterIndexInput.Type
export const SetSourceFilterIndexInputJsonSchema = JSONSchema.make(SetSourceFilterIndexInput)

export const SetSourceFilterIndexOutput = Schema.Struct({
  filterName: ObsString,
  filterIndex: ObsNonNegativeInteger,
  acknowledged: Schema.Literal(true)
})
export type SetSourceFilterIndexOutput = typeof SetSourceFilterIndexOutput.Type
export const SetSourceFilterIndexOutputJsonSchema = JSONSchema.make(SetSourceFilterIndexOutput)

export const SetSourceFilterNameInput = Schema.extend(
  SourceFilterLocatorInput,
  Schema.Struct({
    newFilterName: ObsNonEmptyString
  })
)
export type SetSourceFilterNameInput = typeof SetSourceFilterNameInput.Type
export const SetSourceFilterNameInputJsonSchema = JSONSchema.make(SetSourceFilterNameInput)

export const SetSourceFilterNameOutput = Schema.Struct({
  filterName: ObsString,
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
  filterIndex: ObsNonNegativeInteger,
  filterKind: ObsString,
  filterSettings: UnknownRecord
})
export type ObsSourceFilterOutput = typeof ObsSourceFilterOutput.Type
