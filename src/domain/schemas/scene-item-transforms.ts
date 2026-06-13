import { JSONSchema, Schema } from "effect"

import { ObsInteger, ObsNumber, ObsString } from "./shared.js"

import { SceneItemLocatorInput } from "./scenes.js"

export const SceneItemTransform = Schema.Struct({
  alignment: Schema.optional(ObsInteger),
  boundsAlignment: Schema.optional(ObsInteger),
  boundsHeight: Schema.optional(ObsNumber),
  boundsType: Schema.optional(ObsString),
  boundsWidth: Schema.optional(ObsNumber),
  cropBottom: Schema.optional(ObsInteger),
  cropLeft: Schema.optional(ObsInteger),
  cropRight: Schema.optional(ObsInteger),
  cropTop: Schema.optional(ObsInteger),
  cropToBounds: Schema.optional(Schema.Boolean),
  height: Schema.optional(ObsNumber),
  positionX: Schema.optional(ObsNumber),
  positionY: Schema.optional(ObsNumber),
  rotation: Schema.optional(ObsNumber),
  scaleX: Schema.optional(ObsNumber),
  scaleY: Schema.optional(ObsNumber),
  sourceHeight: Schema.optional(ObsNumber),
  sourceWidth: Schema.optional(ObsNumber),
  width: Schema.optional(ObsNumber)
})
export type SceneItemTransform = typeof SceneItemTransform.Type

export const SettableSceneItemTransform = Schema.Struct({
  alignment: Schema.optional(ObsInteger),
  boundsAlignment: Schema.optional(ObsInteger),
  boundsHeight: Schema.optional(ObsNumber),
  boundsType: Schema.optional(ObsString),
  boundsWidth: Schema.optional(ObsNumber),
  cropBottom: Schema.optional(ObsInteger),
  cropLeft: Schema.optional(ObsInteger),
  cropRight: Schema.optional(ObsInteger),
  cropTop: Schema.optional(ObsInteger),
  cropToBounds: Schema.optional(Schema.Boolean),
  positionX: Schema.optional(ObsNumber),
  positionY: Schema.optional(ObsNumber),
  rotation: Schema.optional(ObsNumber),
  scaleX: Schema.optional(ObsNumber),
  scaleY: Schema.optional(ObsNumber)
}).pipe(
  Schema.filter((transform) => Object.keys(transform).length > 0, {
    message: () => "At least one settable scene item transform field is required"
  })
)
export type SettableSceneItemTransform = typeof SettableSceneItemTransform.Type

export const GetSceneItemTransformInput = SceneItemLocatorInput
export type GetSceneItemTransformInput = typeof GetSceneItemTransformInput.Type
export const GetSceneItemTransformInputJsonSchema = JSONSchema.make(GetSceneItemTransformInput)

export const GetSceneItemTransformOutput = Schema.Struct({
  sceneItemTransform: SceneItemTransform
})
export type GetSceneItemTransformOutput = typeof GetSceneItemTransformOutput.Type
export const GetSceneItemTransformOutputJsonSchema = JSONSchema.make(GetSceneItemTransformOutput)

export const SetSceneItemTransformInput = Schema.extend(
  SceneItemLocatorInput,
  Schema.Struct({
    sceneItemTransform: SettableSceneItemTransform
  })
)
export type SetSceneItemTransformInput = typeof SetSceneItemTransformInput.Type
export const SetSceneItemTransformInputJsonSchema = JSONSchema.make(SetSceneItemTransformInput)

export const SetSceneItemTransformOutput = Schema.Struct({
  sceneItemTransform: SettableSceneItemTransform,
  updated: Schema.Literal(true)
})
export type SetSceneItemTransformOutput = typeof SetSceneItemTransformOutput.Type
export const SetSceneItemTransformOutputJsonSchema = JSONSchema.make(SetSceneItemTransformOutput)
