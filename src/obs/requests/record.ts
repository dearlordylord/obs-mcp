import { RecordStatusOutput } from "../../domain/schemas/general.js"
import { CreateRecordChapterInput } from "../../domain/schemas/record.js"
import { UnknownRecord } from "../../domain/schemas/shared.js"
import { EmptyRequestData, type ObsRequestDescriptor } from "./shared.js"

export const GetRecordStatus = {
  requestType: "GetRecordStatus",
  requestDataSchema: EmptyRequestData,
  responseSchema: RecordStatusOutput
} satisfies ObsRequestDescriptor<RecordStatusOutput>

export const SplitRecordFile = {
  requestType: "SplitRecordFile",
  requestDataSchema: EmptyRequestData,
  responseSchema: UnknownRecord
} satisfies ObsRequestDescriptor<Record<string, unknown>>

export const CreateRecordChapter = {
  requestType: "CreateRecordChapter",
  requestDataSchema: CreateRecordChapterInput,
  responseSchema: UnknownRecord
} satisfies ObsRequestDescriptor<Record<string, unknown>>

export const PauseRecord = {
  requestType: "PauseRecord",
  requestDataSchema: EmptyRequestData,
  responseSchema: UnknownRecord
} satisfies ObsRequestDescriptor<Record<string, unknown>>

export const ResumeRecord = {
  requestType: "ResumeRecord",
  requestDataSchema: EmptyRequestData,
  responseSchema: UnknownRecord
} satisfies ObsRequestDescriptor<Record<string, unknown>>

export const ToggleRecordPause = {
  requestType: "ToggleRecordPause",
  requestDataSchema: EmptyRequestData,
  responseSchema: UnknownRecord
} satisfies ObsRequestDescriptor<Record<string, unknown>>
