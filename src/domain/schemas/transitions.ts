import { JSONSchema, Schema } from "effect"

import { UnknownRecord } from "./shared.js"

export const TransitionKindListOutput = Schema.Struct({
  transitionKinds: Schema.Array(Schema.String)
})
export type TransitionKindListOutput = typeof TransitionKindListOutput.Type
export const TransitionKindListOutputJsonSchema = JSONSchema.make(TransitionKindListOutput)

export const TransitionSummary = Schema.Struct({
  transitionName: Schema.optional(Schema.String),
  transitionUuid: Schema.optional(Schema.String),
  transitionKind: Schema.optional(Schema.String),
  transitionFixed: Schema.optional(Schema.Boolean),
  transitionDuration: Schema.optional(Schema.NullOr(Schema.Number))
})
export type TransitionSummary = typeof TransitionSummary.Type

export const RawSceneTransitionListOutput = Schema.Struct({
  currentSceneTransitionName: Schema.NullOr(Schema.String),
  currentSceneTransitionUuid: Schema.NullOr(Schema.String),
  currentSceneTransitionKind: Schema.NullOr(Schema.String),
  transitions: Schema.Array(UnknownRecord)
})
export type RawSceneTransitionListOutput = typeof RawSceneTransitionListOutput.Type

export const SceneTransitionListOutput = Schema.Struct({
  currentSceneTransitionName: Schema.NullOr(Schema.String),
  currentSceneTransitionUuid: Schema.NullOr(Schema.String),
  currentSceneTransitionKind: Schema.NullOr(Schema.String),
  transitions: Schema.Array(TransitionSummary)
})
export type SceneTransitionListOutput = typeof SceneTransitionListOutput.Type
export const SceneTransitionListOutputJsonSchema = JSONSchema.make(SceneTransitionListOutput)

export const RawCurrentSceneTransitionOutput = Schema.Struct({
  transitionName: Schema.String,
  transitionUuid: Schema.String,
  transitionKind: Schema.String,
  transitionFixed: Schema.Boolean,
  transitionDuration: Schema.NullOr(Schema.Number),
  transitionConfigurable: Schema.Boolean,
  transitionSettings: Schema.NullOr(UnknownRecord)
})
export type RawCurrentSceneTransitionOutput = typeof RawCurrentSceneTransitionOutput.Type

export const CurrentSceneTransitionOutput = Schema.Struct({
  transitionName: Schema.String,
  transitionUuid: Schema.String,
  transitionKind: Schema.String,
  transitionFixed: Schema.Boolean,
  transitionDuration: Schema.NullOr(Schema.Number),
  transitionConfigurable: Schema.Boolean
})
export type CurrentSceneTransitionOutput = typeof CurrentSceneTransitionOutput.Type
export const CurrentSceneTransitionOutputJsonSchema = JSONSchema.make(CurrentSceneTransitionOutput)

export const SceneTransitionCursorOutput = Schema.Struct({
  transitionCursor: Schema.Number.pipe(Schema.greaterThanOrEqualTo(0), Schema.lessThanOrEqualTo(1))
})
export type SceneTransitionCursorOutput = typeof SceneTransitionCursorOutput.Type
export const SceneTransitionCursorOutputJsonSchema = JSONSchema.make(SceneTransitionCursorOutput)

export const SetCurrentSceneTransitionInput = Schema.Struct({
  transitionName: Schema.NonEmptyString
})
export type SetCurrentSceneTransitionInput = typeof SetCurrentSceneTransitionInput.Type
export const SetCurrentSceneTransitionInputJsonSchema = JSONSchema.make(SetCurrentSceneTransitionInput)

export const SetCurrentSceneTransitionOutput = Schema.Struct({
  transitionName: Schema.String,
  switched: Schema.Literal(true)
})
export type SetCurrentSceneTransitionOutput = typeof SetCurrentSceneTransitionOutput.Type
export const SetCurrentSceneTransitionOutputJsonSchema = JSONSchema.make(SetCurrentSceneTransitionOutput)

export const TransitionDuration = Schema.Number.pipe(
  Schema.int(),
  Schema.greaterThanOrEqualTo(50),
  Schema.lessThanOrEqualTo(20000)
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

export const TransitionSettingValue = Schema.Union(Schema.String, Schema.Number, Schema.Boolean, Schema.Null)
export type TransitionSettingValue = typeof TransitionSettingValue.Type

export const TransitionSettings = Schema.Record({ key: Schema.String, value: TransitionSettingValue })
export type TransitionSettings = typeof TransitionSettings.Type

export const SetCurrentSceneTransitionSettingsInput = Schema.Struct({
  transitionSettings: TransitionSettings,
  overlay: Schema.optionalWith(Schema.Boolean, { default: () => true })
})
export type SetCurrentSceneTransitionSettingsInput = typeof SetCurrentSceneTransitionSettingsInput.Type
export const SetCurrentSceneTransitionSettingsInputJsonSchema = JSONSchema.make(SetCurrentSceneTransitionSettingsInput)

export const SetCurrentSceneTransitionSettingsOutput = Schema.Struct({
  overlay: Schema.Boolean,
  settingsFieldCount: Schema.Number.pipe(Schema.int(), Schema.greaterThanOrEqualTo(0)),
  acknowledged: Schema.Literal(true)
})
export type SetCurrentSceneTransitionSettingsOutput = typeof SetCurrentSceneTransitionSettingsOutput.Type
export const SetCurrentSceneTransitionSettingsOutputJsonSchema = JSONSchema.make(
  SetCurrentSceneTransitionSettingsOutput
)

export const TriggerStudioModeTransitionOutput = Schema.Struct({
  requestType: Schema.Literal("TriggerStudioModeTransition"),
  acknowledged: Schema.Literal(true)
})
export type TriggerStudioModeTransitionOutput = typeof TriggerStudioModeTransitionOutput.Type
export const TriggerStudioModeTransitionOutputJsonSchema = JSONSchema.make(TriggerStudioModeTransitionOutput)

export const SetTBarPositionInput = Schema.Struct({
  position: Schema.Number.pipe(Schema.greaterThanOrEqualTo(0), Schema.lessThanOrEqualTo(1)),
  release: Schema.optionalWith(Schema.Boolean, { default: () => true })
})
export type SetTBarPositionInput = typeof SetTBarPositionInput.Type
export const SetTBarPositionInputJsonSchema = JSONSchema.make(SetTBarPositionInput)

export const SetTBarPositionOutput = Schema.Struct({
  position: Schema.Number.pipe(Schema.greaterThanOrEqualTo(0), Schema.lessThanOrEqualTo(1)),
  release: Schema.Boolean,
  acknowledged: Schema.Literal(true)
})
export type SetTBarPositionOutput = typeof SetTBarPositionOutput.Type
export const SetTBarPositionOutputJsonSchema = JSONSchema.make(SetTBarPositionOutput)
