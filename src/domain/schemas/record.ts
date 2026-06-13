import { JSONSchema, Schema } from "effect"

import { OutputActiveState } from "./shared.js"

const recordAcknowledgementOutput = <RequestType extends string>(requestType: RequestType) =>
  Schema.Struct({
    requestType: Schema.Literal(requestType),
    acknowledged: Schema.Literal(true)
  })

export const StartRecordOutput = recordAcknowledgementOutput("StartRecord")
export type StartRecordOutput = typeof StartRecordOutput.Type
export const StartRecordOutputJsonSchema = JSONSchema.make(StartRecordOutput)

export const SplitRecordFileOutput = recordAcknowledgementOutput("SplitRecordFile")
export type SplitRecordFileOutput = typeof SplitRecordFileOutput.Type
export const SplitRecordFileOutputJsonSchema = JSONSchema.make(SplitRecordFileOutput)

export const CreateRecordChapterInput = Schema.Struct({
  chapterName: Schema.optional(Schema.NonEmptyString)
})
export type CreateRecordChapterInput = typeof CreateRecordChapterInput.Type
export const CreateRecordChapterInputJsonSchema = JSONSchema.make(CreateRecordChapterInput)

export const CreateRecordChapterOutput = recordAcknowledgementOutput("CreateRecordChapter")
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
