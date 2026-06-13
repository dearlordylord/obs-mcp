import { JSONSchema, Schema } from "effect"

import { SceneItemLocatorInput } from "./scenes.js"

const ForbiddenLocatorField = Schema.optional(Schema.Never)
const SceneItemId = Schema.Number.pipe(Schema.int(), Schema.greaterThanOrEqualTo(0))

const CreateSceneItemFields = {
  sceneItemEnabled: Schema.optional(Schema.Boolean)
} as const

export const CreateSceneItemInput = Schema.Union(
  Schema.Struct({
    sceneName: Schema.NonEmptyString,
    sceneUuid: ForbiddenLocatorField,
    canvasUuid: Schema.optional(Schema.NonEmptyString),
    sourceName: Schema.NonEmptyString,
    sourceUuid: ForbiddenLocatorField,
    ...CreateSceneItemFields
  }),
  Schema.Struct({
    sceneName: Schema.NonEmptyString,
    sceneUuid: ForbiddenLocatorField,
    canvasUuid: Schema.optional(Schema.NonEmptyString),
    sourceName: ForbiddenLocatorField,
    sourceUuid: Schema.NonEmptyString,
    ...CreateSceneItemFields
  }),
  Schema.Struct({
    sceneName: ForbiddenLocatorField,
    sceneUuid: Schema.NonEmptyString,
    canvasUuid: ForbiddenLocatorField,
    sourceName: Schema.NonEmptyString,
    sourceUuid: ForbiddenLocatorField,
    ...CreateSceneItemFields
  }),
  Schema.Struct({
    sceneName: ForbiddenLocatorField,
    sceneUuid: Schema.NonEmptyString,
    canvasUuid: ForbiddenLocatorField,
    sourceName: ForbiddenLocatorField,
    sourceUuid: Schema.NonEmptyString,
    ...CreateSceneItemFields
  })
)
export type CreateSceneItemInput = typeof CreateSceneItemInput.Type
export const CreateSceneItemInputJsonSchema = JSONSchema.make(CreateSceneItemInput)

export const CreateSceneItemOutput = Schema.Struct({
  sceneName: Schema.optional(Schema.String),
  sceneUuid: Schema.optional(Schema.String),
  canvasUuid: Schema.optional(Schema.String),
  sourceName: Schema.optional(Schema.String),
  sourceUuid: Schema.optional(Schema.String),
  sceneItemId: Schema.optional(SceneItemId),
  created: Schema.Literal(true)
})
export type CreateSceneItemOutput = typeof CreateSceneItemOutput.Type
export const CreateSceneItemOutputJsonSchema = JSONSchema.make(CreateSceneItemOutput)

export const RemoveSceneItemInput = SceneItemLocatorInput
export type RemoveSceneItemInput = typeof RemoveSceneItemInput.Type
export const RemoveSceneItemInputJsonSchema = JSONSchema.make(RemoveSceneItemInput)

export const RemoveSceneItemOutput = Schema.Struct({
  sceneName: Schema.optional(Schema.String),
  sceneUuid: Schema.optional(Schema.String),
  canvasUuid: Schema.optional(Schema.String),
  sceneItemId: SceneItemId,
  removed: Schema.Literal(true)
})
export type RemoveSceneItemOutput = typeof RemoveSceneItemOutput.Type
export const RemoveSceneItemOutputJsonSchema = JSONSchema.make(RemoveSceneItemOutput)

const DuplicateSceneItemDestinationFields = {
  destinationSceneName: Schema.optional(Schema.NonEmptyString),
  destinationSceneUuid: Schema.optional(Schema.NonEmptyString)
} as const

export const DuplicateSceneItemInput = Schema.Union(
  Schema.Struct({
    sceneName: Schema.NonEmptyString,
    sceneUuid: ForbiddenLocatorField,
    canvasUuid: Schema.optional(Schema.NonEmptyString),
    sceneItemId: SceneItemId,
    ...DuplicateSceneItemDestinationFields
  }),
  Schema.Struct({
    sceneName: ForbiddenLocatorField,
    sceneUuid: Schema.NonEmptyString,
    canvasUuid: ForbiddenLocatorField,
    sceneItemId: SceneItemId,
    ...DuplicateSceneItemDestinationFields
  })
).pipe(
  Schema.filter((input) => input.destinationSceneName === undefined || input.destinationSceneUuid === undefined, {
    message: () => "At most one duplicate destination scene locator is allowed"
  })
)
export type DuplicateSceneItemInput = typeof DuplicateSceneItemInput.Type
export const DuplicateSceneItemInputJsonSchema = JSONSchema.make(DuplicateSceneItemInput)

export const DuplicateSceneItemOutput = Schema.Struct({
  sceneName: Schema.optional(Schema.String),
  sceneUuid: Schema.optional(Schema.String),
  canvasUuid: Schema.optional(Schema.String),
  destinationSceneName: Schema.optional(Schema.String),
  destinationSceneUuid: Schema.optional(Schema.String),
  sceneItemId: Schema.optional(SceneItemId),
  duplicated: Schema.Literal(true)
})
export type DuplicateSceneItemOutput = typeof DuplicateSceneItemOutput.Type
export const DuplicateSceneItemOutputJsonSchema = JSONSchema.make(DuplicateSceneItemOutput)
