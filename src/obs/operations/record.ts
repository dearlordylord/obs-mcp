import { RecordPauseControlOutput } from "../../domain/schemas/record.js"
import type { ObsClient } from "../client.js"
import { PauseRecord, ResumeRecord, ToggleRecordPause } from "../requests.js"
import { requestAndReturn } from "./shared.js"

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
