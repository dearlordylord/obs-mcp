import { JSONSchema, Schema } from "effect"

import { ObsNonEmptyString, ObsString, OutputActiveState, RequestAcknowledgedOutput } from "./shared.js"

export const StartRecordOutput = RequestAcknowledgedOutput("StartRecord")
export type StartRecordOutput = typeof StartRecordOutput.Type
export const StartRecordOutputJsonSchema = JSONSchema.make(StartRecordOutput)

export const SplitRecordFileOutput = RequestAcknowledgedOutput("SplitRecordFile")
export type SplitRecordFileOutput = typeof SplitRecordFileOutput.Type
export const SplitRecordFileOutputJsonSchema = JSONSchema.make(SplitRecordFileOutput)

export const CreateRecordChapterInput = Schema.Struct({
  chapterName: Schema.optional(ObsNonEmptyString)
})
export type CreateRecordChapterInput = typeof CreateRecordChapterInput.Type
export const CreateRecordChapterInputJsonSchema = JSONSchema.make(CreateRecordChapterInput)

export const CreateRecordChapterOutput = RequestAcknowledgedOutput("CreateRecordChapter")
export type CreateRecordChapterOutput = typeof CreateRecordChapterOutput.Type
export const CreateRecordChapterOutputJsonSchema = JSONSchema.make(CreateRecordChapterOutput)

export const StopRecordOutput = Schema.Struct({
  requestType: Schema.Literal("StopRecord"),
  acknowledged: Schema.Literal(true),
  outputPath: ObsString
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
