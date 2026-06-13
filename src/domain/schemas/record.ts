import { JSONSchema, Schema } from "effect"

import { OutputActiveState } from "./shared.js"

export const StartRecordOutput = Schema.Struct({
  requestType: Schema.Literal("StartRecord"),
  acknowledged: Schema.Literal(true)
})
export type StartRecordOutput = typeof StartRecordOutput.Type
export const StartRecordOutputJsonSchema = JSONSchema.make(StartRecordOutput)

export const StopRecordOutput = Schema.Struct({
  requestType: Schema.Literal("StopRecord"),
  acknowledged: Schema.Literal(true),
  outputPath: Schema.String
})
export type StopRecordOutput = typeof StopRecordOutput.Type
export const StopRecordOutputJsonSchema = JSONSchema.make(StopRecordOutput)

export const ToggleRecordOutput = OutputActiveState
export type ToggleRecordOutput = typeof ToggleRecordOutput.Type
export const ToggleRecordOutputJsonSchema = JSONSchema.make(ToggleRecordOutput)

export const RecordPauseAction = Schema.Literal("pause", "resume", "toggle_pause")
export type RecordPauseAction = typeof RecordPauseAction.Type

export const RecordPauseControlOutput = Schema.Struct({
  requestedAction: RecordPauseAction,
  requestType: Schema.Literal("PauseRecord", "ResumeRecord", "ToggleRecordPause"),
  acknowledged: Schema.Literal(true)
})
export type RecordPauseControlOutput = typeof RecordPauseControlOutput.Type
export const RecordPauseControlOutputJsonSchema = JSONSchema.make(RecordPauseControlOutput)
