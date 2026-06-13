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
