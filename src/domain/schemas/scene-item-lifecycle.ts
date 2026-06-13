import { JSONSchema, Schema } from "effect"

import { ObsNonEmptyString, ObsNonNegativeInteger, ObsString } from "./shared.js"

import { SceneItemLocatorInput } from "./scenes.js"

const ForbiddenLocatorField = Schema.optional(Schema.Never)
const SceneItemId = ObsNonNegativeInteger

const CreateSceneItemFields = {
  sceneItemEnabled: Schema.optional(Schema.Boolean)
} as const

export const CreateSceneItemInput = Schema.Union(
  Schema.Struct({
    sceneName: ObsNonEmptyString,
    sceneUuid: ForbiddenLocatorField,
    canvasUuid: Schema.optional(ObsNonEmptyString),
    sourceName: ObsNonEmptyString,
    sourceUuid: ForbiddenLocatorField,
    ...CreateSceneItemFields
  }),
  Schema.Struct({
    sceneName: ObsNonEmptyString,
    sceneUuid: ForbiddenLocatorField,
    canvasUuid: Schema.optional(ObsNonEmptyString),
    sourceName: ForbiddenLocatorField,
    sourceUuid: ObsNonEmptyString,
    ...CreateSceneItemFields
  }),
  Schema.Struct({
    sceneName: ForbiddenLocatorField,
    sceneUuid: ObsNonEmptyString,
    canvasUuid: ForbiddenLocatorField,
    sourceName: ObsNonEmptyString,
    sourceUuid: ForbiddenLocatorField,
    ...CreateSceneItemFields
  }),
  Schema.Struct({
    sceneName: ForbiddenLocatorField,
    sceneUuid: ObsNonEmptyString,
    canvasUuid: ForbiddenLocatorField,
    sourceName: ForbiddenLocatorField,
    sourceUuid: ObsNonEmptyString,
    ...CreateSceneItemFields
  })
)
export type CreateSceneItemInput = typeof CreateSceneItemInput.Type
export const CreateSceneItemInputJsonSchema = JSONSchema.make(CreateSceneItemInput)

export const CreateSceneItemOutput = Schema.Struct({
  sceneName: Schema.optional(ObsString),
  sceneUuid: Schema.optional(ObsString),
  canvasUuid: Schema.optional(ObsString),
  sourceName: Schema.optional(ObsString),
  sourceUuid: Schema.optional(ObsString),
  sceneItemId: SceneItemId,
  created: Schema.Literal(true)
})
export type CreateSceneItemOutput = typeof CreateSceneItemOutput.Type
export const CreateSceneItemOutputJsonSchema = JSONSchema.make(CreateSceneItemOutput)

export const RemoveSceneItemInput = SceneItemLocatorInput
export type RemoveSceneItemInput = typeof RemoveSceneItemInput.Type
export const RemoveSceneItemInputJsonSchema = JSONSchema.make(RemoveSceneItemInput)

export const RemoveSceneItemOutput = Schema.Struct({
  sceneName: Schema.optional(ObsString),
  sceneUuid: Schema.optional(ObsString),
  canvasUuid: Schema.optional(ObsString),
  sceneItemId: SceneItemId,
  removed: Schema.Literal(true)
})
export type RemoveSceneItemOutput = typeof RemoveSceneItemOutput.Type
export const RemoveSceneItemOutputJsonSchema = JSONSchema.make(RemoveSceneItemOutput)

const DuplicateSceneItemDestinationFields = {
  destinationSceneName: Schema.optional(ObsNonEmptyString),
  destinationSceneUuid: Schema.optional(ObsNonEmptyString)
} as const

export const DuplicateSceneItemInput = Schema.Union(
  Schema.Struct({
    sceneName: ObsNonEmptyString,
    sceneUuid: ForbiddenLocatorField,
    canvasUuid: Schema.optional(ObsNonEmptyString),
    sceneItemId: SceneItemId,
    ...DuplicateSceneItemDestinationFields
  }),
  Schema.Struct({
    sceneName: ForbiddenLocatorField,
    sceneUuid: ObsNonEmptyString,
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
  sceneName: Schema.optional(ObsString),
  sceneUuid: Schema.optional(ObsString),
  canvasUuid: Schema.optional(ObsString),
  destinationSceneName: Schema.optional(ObsString),
  destinationSceneUuid: Schema.optional(ObsString),
  sceneItemId: SceneItemId,
  duplicated: Schema.Literal(true)
})
export type DuplicateSceneItemOutput = typeof DuplicateSceneItemOutput.Type
export const DuplicateSceneItemOutputJsonSchema = JSONSchema.make(DuplicateSceneItemOutput)
