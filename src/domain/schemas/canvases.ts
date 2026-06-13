import { JSONSchema, Schema } from "effect"

import { UnknownRecord } from "./shared.js"

export const RawCanvasListOutput = Schema.Struct({
  canvases: Schema.Array(UnknownRecord)
})
export type RawCanvasListOutput = typeof RawCanvasListOutput.Type

export const CanvasSummary = Schema.Struct({
  canvasIndex: Schema.Number.pipe(Schema.int(), Schema.greaterThanOrEqualTo(0)),
  canvasName: Schema.optional(Schema.String),
  canvasUuid: Schema.optional(Schema.String)
})
export type CanvasSummary = typeof CanvasSummary.Type

export const ListCanvasesOutput = Schema.Struct({
  canvases: Schema.Array(CanvasSummary)
})
export type ListCanvasesOutput = typeof ListCanvasesOutput.Type
export const ListCanvasesOutputJsonSchema = JSONSchema.make(ListCanvasesOutput)
