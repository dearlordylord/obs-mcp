import { JSONSchema, Schema } from "effect"

import { ObsNonEmptyString, ObsNonNegativeInteger, ObsString, UnknownRecord } from "./shared.js"

export const RawCanvasListOutput = Schema.Struct({
  canvases: Schema.Array(UnknownRecord)
})
export type RawCanvasListOutput = typeof RawCanvasListOutput.Type

export const CanvasName = ObsNonEmptyString
export type CanvasName = typeof CanvasName.Type

export const CanvasUuid = ObsNonEmptyString
export type CanvasUuid = typeof CanvasUuid.Type

export const CanvasSummary = Schema.Struct({
  canvasIndex: ObsNonNegativeInteger,
  canvasName: Schema.optional(ObsString),
  canvasUuid: Schema.optional(ObsString)
})
export type CanvasSummary = typeof CanvasSummary.Type

export const ListCanvasesOutput = Schema.Struct({
  canvases: Schema.Array(CanvasSummary)
})
export type ListCanvasesOutput = typeof ListCanvasesOutput.Type
export const ListCanvasesOutputJsonSchema = JSONSchema.make(ListCanvasesOutput)
