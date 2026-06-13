import { JSONSchema, Schema } from "effect"

const recordAcknowledgementOutput = <RequestType extends string>(requestType: RequestType) =>
  Schema.Struct({
    requestType: Schema.Literal(requestType),
    acknowledged: Schema.Literal(true)
  })

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

export const RecordPauseAction = Schema.Literal("pause", "resume", "toggle_pause")
export type RecordPauseAction = typeof RecordPauseAction.Type

export const RecordPauseControlOutput = Schema.Struct({
  requestedAction: RecordPauseAction,
  requestType: Schema.Literal("PauseRecord", "ResumeRecord", "ToggleRecordPause"),
  acknowledged: Schema.Literal(true)
})
export type RecordPauseControlOutput = typeof RecordPauseControlOutput.Type
export const RecordPauseControlOutputJsonSchema = JSONSchema.make(RecordPauseControlOutput)
