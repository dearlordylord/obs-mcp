import { JSONSchema, Schema } from "effect"

import { SceneItemLocatorInput } from "./scenes.js"

export const SceneItemTransform = Schema.Struct({
  alignment: Schema.optional(Schema.Number.pipe(Schema.int())),
  boundsAlignment: Schema.optional(Schema.Number.pipe(Schema.int())),
  boundsHeight: Schema.optional(Schema.Number),
  boundsType: Schema.optional(Schema.String),
  boundsWidth: Schema.optional(Schema.Number),
  cropBottom: Schema.optional(Schema.Number.pipe(Schema.int())),
  cropLeft: Schema.optional(Schema.Number.pipe(Schema.int())),
  cropRight: Schema.optional(Schema.Number.pipe(Schema.int())),
  cropTop: Schema.optional(Schema.Number.pipe(Schema.int())),
  cropToBounds: Schema.optional(Schema.Boolean),
  height: Schema.optional(Schema.Number),
  positionX: Schema.optional(Schema.Number),
  positionY: Schema.optional(Schema.Number),
  rotation: Schema.optional(Schema.Number),
  scaleX: Schema.optional(Schema.Number),
  scaleY: Schema.optional(Schema.Number),
  sourceHeight: Schema.optional(Schema.Number),
  sourceWidth: Schema.optional(Schema.Number),
  width: Schema.optional(Schema.Number)
})
export type SceneItemTransform = typeof SceneItemTransform.Type

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
    sceneItemTransform: SceneItemTransform
  })
)
export type SetSceneItemTransformInput = typeof SetSceneItemTransformInput.Type
export const SetSceneItemTransformInputJsonSchema = JSONSchema.make(SetSceneItemTransformInput)

export const SetSceneItemTransformOutput = Schema.Struct({
  sceneItemTransform: SceneItemTransform,
  updated: Schema.Literal(true)
})
export type SetSceneItemTransformOutput = typeof SetSceneItemTransformOutput.Type
export const SetSceneItemTransformOutputJsonSchema = JSONSchema.make(SetSceneItemTransformOutput)
