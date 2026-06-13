import { JSONSchema, Schema } from "effect"

import { OutputActiveState } from "./shared.js"

export const RecordAcknowledgementRequestType = Schema.Literal(
  "StartRecord",
  "SplitRecordFile",
  "CreateRecordChapter"
)
export type RecordAcknowledgementRequestType = typeof RecordAcknowledgementRequestType.Type

export const RecordAcknowledgementOutput = Schema.Struct({
  requestType: RecordAcknowledgementRequestType,
  acknowledged: Schema.Literal(true)
})
export type RecordAcknowledgementOutput = typeof RecordAcknowledgementOutput.Type
export const RecordAcknowledgementOutputJsonSchema = JSONSchema.make(RecordAcknowledgementOutput)

export const StartRecordOutput = RecordAcknowledgementOutput
export type StartRecordOutput = typeof StartRecordOutput.Type
export const StartRecordOutputJsonSchema = JSONSchema.make(StartRecordOutput)

export const SplitRecordFileOutput = RecordAcknowledgementOutput
export type SplitRecordFileOutput = typeof SplitRecordFileOutput.Type
export const SplitRecordFileOutputJsonSchema = JSONSchema.make(SplitRecordFileOutput)

export const CreateRecordChapterInput = Schema.Struct({
  chapterName: Schema.optional(Schema.NonEmptyString)
})
export type CreateRecordChapterInput = typeof CreateRecordChapterInput.Type
export const CreateRecordChapterInputJsonSchema = JSONSchema.make(CreateRecordChapterInput)

export const CreateRecordChapterOutput = RecordAcknowledgementOutput
export type CreateRecordChapterOutput = typeof CreateRecordChapterOutput.Type
export const CreateRecordChapterOutputJsonSchema = JSONSchema.make(CreateRecordChapterOutput)

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
