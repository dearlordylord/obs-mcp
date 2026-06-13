import {
  RecordPauseControlOutput,
  StartRecordOutput,
  StopRecordOutput,
  ToggleRecordOutput
} from "../../domain/schemas/record.js"
import type { ObsClient } from "../client.js"
import { PauseRecord, ResumeRecord, StartRecord, StopRecord, ToggleRecord, ToggleRecordPause } from "../requests.js"
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
