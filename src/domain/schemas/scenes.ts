import { JSONSchema, Schema } from "effect"

export const ListScenesInput = Schema.Struct({
  includeGroups: Schema.optionalWith(Schema.Boolean, { default: () => true })
})
export type ListScenesInput = typeof ListScenesInput.Type
export const ListScenesInputJsonSchema = JSONSchema.make(ListScenesInput)

export const SceneSummary = Schema.Struct({
  sceneName: Schema.String,
  sceneUuid: Schema.optional(Schema.String),
  sceneIndex: Schema.Number,
  isGroup: Schema.optional(Schema.Boolean)
})
export type SceneSummary = typeof SceneSummary.Type

export const ListScenesOutput = Schema.Struct({
  currentProgramSceneName: Schema.NullOr(Schema.String),
  currentProgramSceneUuid: Schema.NullOr(Schema.String),
  currentPreviewSceneName: Schema.optional(Schema.NullOr(Schema.String)),
  currentPreviewSceneUuid: Schema.optional(Schema.NullOr(Schema.String)),
  scenes: Schema.Array(SceneSummary)
})
export type ListScenesOutput = typeof ListScenesOutput.Type
export const ListScenesOutputJsonSchema = JSONSchema.make(ListScenesOutput)

export const CurrentSceneOutput = Schema.Struct({
  sceneName: Schema.String,
  sceneUuid: Schema.optional(Schema.String)
})
export type CurrentSceneOutput = typeof CurrentSceneOutput.Type
export const CurrentSceneOutputJsonSchema = JSONSchema.make(CurrentSceneOutput)

export const SetCurrentSceneInput = Schema.Struct({
  sceneName: Schema.NonEmptyString
})
export type SetCurrentSceneInput = typeof SetCurrentSceneInput.Type
export const SetCurrentSceneInputJsonSchema = JSONSchema.make(SetCurrentSceneInput)

export const SetCurrentSceneOutput = Schema.Struct({
  sceneName: Schema.String,
  switched: Schema.Literal(true)
})
export type SetCurrentSceneOutput = typeof SetCurrentSceneOutput.Type
export const SetCurrentSceneOutputJsonSchema = JSONSchema.make(SetCurrentSceneOutput)
