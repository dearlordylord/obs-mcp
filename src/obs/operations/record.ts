import { Schema } from "effect"

import {
  CreateRecordChapterInput,
  CreateRecordChapterOutput,
  RecordPauseControlOutput,
  SplitRecordFileOutput,
  StartRecordOutput,
  StopRecordOutput,
  ToggleRecordOutput
} from "../../domain/schemas/record.js"
import type { ObsClient } from "../client.js"
import {
  CreateRecordChapter,
  PauseRecord,
  ResumeRecord,
  SplitRecordFile,
  StartRecord,
  StopRecord,
  ToggleRecord,
  ToggleRecordPause
} from "../requests.js"
import { requestAndDecode, requestAndReturn } from "./shared.js"

export const startRecord = async (client: ObsClient): Promise<StartRecordOutput> => {
  return requestAndReturn(client, StartRecord, {
    requestType: StartRecord.requestType,
    acknowledged: true
  }, StartRecordOutput)
}

export const stopRecord = async (client: ObsClient): Promise<StopRecordOutput> => {
  const response = await requestAndDecode(client, StopRecord, StopRecord.responseSchema)
  return StopRecordOutput.make({
    requestType: StopRecord.requestType,
    acknowledged: true,
    outputPath: response.outputPath
  })
}

export const toggleRecord = async (client: ObsClient): Promise<ToggleRecordOutput> => {
  return requestAndDecode(client, ToggleRecord, ToggleRecordOutput)
}

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
