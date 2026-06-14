import { JSONSchema, Schema } from "effect"

import {
  ObsNonEmptyString,
  ObsNonNegativeInteger,
  ObsNumber,
  ObsString,
  ObsUnitInterval,
  RequestAcknowledgedOutput,
  UnknownRecord
} from "./shared.js"

export const TransitionKindListOutput = Schema.Struct({
  transitionKinds: Schema.Array(ObsString)
})
export type TransitionKindListOutput = typeof TransitionKindListOutput.Type
export const TransitionKindListOutputJsonSchema = JSONSchema.make(TransitionKindListOutput)

export const TransitionSummary = Schema.Struct({
  transitionName: Schema.optional(ObsString),
  transitionUuid: Schema.optional(ObsString),
  transitionKind: Schema.optional(ObsString),
  transitionFixed: Schema.optional(Schema.Boolean),
  transitionDuration: Schema.optional(Schema.NullOr(ObsNumber))
})
export type TransitionSummary = typeof TransitionSummary.Type

const CurrentSceneTransitionListFields = {
  currentSceneTransitionName: Schema.NullOr(ObsString),
  currentSceneTransitionUuid: Schema.NullOr(ObsString),
  currentSceneTransitionKind: Schema.NullOr(ObsString)
} as const

export const RawSceneTransitionListOutput = Schema.Struct({
  ...CurrentSceneTransitionListFields,
  transitions: Schema.Array(UnknownRecord)
})
export type RawSceneTransitionListOutput = typeof RawSceneTransitionListOutput.Type

export const SceneTransitionListOutput = Schema.Struct({
  ...CurrentSceneTransitionListFields,
  transitions: Schema.Array(TransitionSummary)
})
export type SceneTransitionListOutput = typeof SceneTransitionListOutput.Type
export const SceneTransitionListOutputJsonSchema = JSONSchema.make(SceneTransitionListOutput)

const CurrentSceneTransitionFields = {
  transitionName: ObsString,
  transitionUuid: ObsString,
  transitionKind: ObsString,
  transitionFixed: Schema.Boolean,
  transitionDuration: Schema.NullOr(ObsNumber),
  transitionConfigurable: Schema.Boolean
} as const

export const RawCurrentSceneTransitionOutput = Schema.Struct({
  ...CurrentSceneTransitionFields,
  transitionSettings: Schema.NullOr(UnknownRecord)
})
export type RawCurrentSceneTransitionOutput = typeof RawCurrentSceneTransitionOutput.Type

export const CurrentSceneTransitionOutput = Schema.Struct(CurrentSceneTransitionFields)
export type CurrentSceneTransitionOutput = typeof CurrentSceneTransitionOutput.Type
export const CurrentSceneTransitionOutputJsonSchema = JSONSchema.make(CurrentSceneTransitionOutput)

export const SceneTransitionCursorOutput = Schema.Struct({
  transitionCursor: ObsUnitInterval
})
export type SceneTransitionCursorOutput = typeof SceneTransitionCursorOutput.Type
export const SceneTransitionCursorOutputJsonSchema = JSONSchema.make(SceneTransitionCursorOutput)

export const SetCurrentSceneTransitionInput = Schema.Struct({
  transitionName: ObsNonEmptyString
})
export type SetCurrentSceneTransitionInput = typeof SetCurrentSceneTransitionInput.Type
export const SetCurrentSceneTransitionInputJsonSchema = JSONSchema.make(SetCurrentSceneTransitionInput)

export const SetCurrentSceneTransitionOutput = Schema.Struct({
  transitionName: ObsString,
  switched: Schema.Literal(true)
})
export type SetCurrentSceneTransitionOutput = typeof SetCurrentSceneTransitionOutput.Type
export const SetCurrentSceneTransitionOutputJsonSchema = JSONSchema.make(SetCurrentSceneTransitionOutput)

const MinTransitionDuration = 50
const MaxTransitionDuration = 20000
// Transition duration is a bounded millisecond setting; branding would not add validation beyond the field name.
export const TransitionDuration = ObsNumber.pipe(
  Schema.int(),
  Schema.greaterThanOrEqualTo(MinTransitionDuration),
  Schema.lessThanOrEqualTo(MaxTransitionDuration)
)

export const SetCurrentSceneTransitionDurationInput = Schema.Struct({
  transitionDuration: TransitionDuration
})
export type SetCurrentSceneTransitionDurationInput = typeof SetCurrentSceneTransitionDurationInput.Type
export const SetCurrentSceneTransitionDurationInputJsonSchema = JSONSchema.make(SetCurrentSceneTransitionDurationInput)

export const SetCurrentSceneTransitionDurationOutput = Schema.Struct({
  transitionDuration: TransitionDuration,
  acknowledged: Schema.Literal(true)
})
export type SetCurrentSceneTransitionDurationOutput = typeof SetCurrentSceneTransitionDurationOutput.Type
export const SetCurrentSceneTransitionDurationOutputJsonSchema = JSONSchema.make(
  SetCurrentSceneTransitionDurationOutput
)

export const TransitionSettingValue = Schema.Union(ObsString, ObsNumber, Schema.Boolean, Schema.Null)
export type TransitionSettingValue = typeof TransitionSettingValue.Type

export const TransitionSettings = Schema.Record({ key: ObsString, value: TransitionSettingValue })
export type TransitionSettings = typeof TransitionSettings.Type

export const SetCurrentSceneTransitionSettingsInput = Schema.Struct({
  transitionSettings: TransitionSettings,
  overlay: Schema.optionalWith(Schema.Boolean, { default: () => true })
})
export type SetCurrentSceneTransitionSettingsInput = typeof SetCurrentSceneTransitionSettingsInput.Type
export const SetCurrentSceneTransitionSettingsInputJsonSchema = JSONSchema.make(SetCurrentSceneTransitionSettingsInput)

export const SetCurrentSceneTransitionSettingsOutput = Schema.Struct({
  overlay: Schema.Boolean,
  settingsFieldCount: ObsNonNegativeInteger,
  acknowledged: Schema.Literal(true)
})
export type SetCurrentSceneTransitionSettingsOutput = typeof SetCurrentSceneTransitionSettingsOutput.Type
export const SetCurrentSceneTransitionSettingsOutputJsonSchema = JSONSchema.make(
  SetCurrentSceneTransitionSettingsOutput
)

export const TriggerStudioModeTransitionOutput = RequestAcknowledgedOutput("TriggerStudioModeTransition")
export type TriggerStudioModeTransitionOutput = typeof TriggerStudioModeTransitionOutput.Type
export const TriggerStudioModeTransitionOutputJsonSchema = JSONSchema.make(TriggerStudioModeTransitionOutput)

export const SetTBarPositionInput = Schema.Struct({
  position: ObsUnitInterval,
  release: Schema.optionalWith(Schema.Boolean, { default: () => true })
})
export type SetTBarPositionInput = typeof SetTBarPositionInput.Type
export const SetTBarPositionInputJsonSchema = JSONSchema.make(SetTBarPositionInput)

export const SetTBarPositionOutput = Schema.Struct({
  position: ObsUnitInterval,
  release: Schema.Boolean,
  acknowledged: Schema.Literal(true)
})
export type SetTBarPositionOutput = typeof SetTBarPositionOutput.Type
export const SetTBarPositionOutputJsonSchema = JSONSchema.make(SetTBarPositionOutput)
