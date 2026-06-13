import { Schema } from "effect"

import {
  CreateRecordChapterInput,
  CreateRecordChapterOutput,
  RecordPauseControlOutput,
  SplitRecordFileOutput
} from "../../domain/schemas/record.js"
import type { ObsClient } from "../client.js"
import { CreateRecordChapter, PauseRecord, ResumeRecord, SplitRecordFile, ToggleRecordPause } from "../requests.js"
import { requestAndReturn } from "./shared.js"

export const splitRecordFile = async (client: ObsClient): Promise<SplitRecordFileOutput> => {
  return requestAndReturn(client, SplitRecordFile, {
    requestType: SplitRecordFile.requestType,
    acknowledged: true
  }, SplitRecordFileOutput)
}

export const createRecordChapter = async (
  client: ObsClient,
  input: CreateRecordChapterInput
): Promise<CreateRecordChapterOutput> => {
  const decodedInput = Schema.decodeUnknownSync(CreateRecordChapterInput, { onExcessProperty: "error" })(input)
  await client.request(CreateRecordChapter, decodedInput)
  return CreateRecordChapterOutput.make({
    requestType: CreateRecordChapter.requestType,
    acknowledged: true
  })
}

export const pauseRecord = async (client: ObsClient): Promise<RecordPauseControlOutput> => {
  return requestAndReturn(client, PauseRecord, {
    requestedAction: "pause",
    requestType: PauseRecord.requestType,
    acknowledged: true
  }, RecordPauseControlOutput)
}

export const resumeRecord = async (client: ObsClient): Promise<RecordPauseControlOutput> => {
  return requestAndReturn(client, ResumeRecord, {
    requestedAction: "resume",
    requestType: ResumeRecord.requestType,
    acknowledged: true
  }, RecordPauseControlOutput)
}

export const toggleRecordPause = async (client: ObsClient): Promise<RecordPauseControlOutput> => {
  return requestAndReturn(client, ToggleRecordPause, {
    requestedAction: "toggle_pause",
    requestType: ToggleRecordPause.requestType,
    acknowledged: true
  }, RecordPauseControlOutput)
}
