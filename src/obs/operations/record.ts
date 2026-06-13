import { Schema } from "effect"

import { RecordPauseControlOutput } from "../../domain/schemas/record.js"
import type { ObsClient } from "../client.js"
import { PauseRecord, ResumeRecord, ToggleRecordPause } from "../requests.js"

export const pauseRecord = async (client: ObsClient): Promise<RecordPauseControlOutput> => {
  await client.request(PauseRecord)
  return Schema.decodeUnknownSync(RecordPauseControlOutput)({
    requestedAction: "pause",
    requestType: PauseRecord.requestType,
    acknowledged: true
  })
}

export const resumeRecord = async (client: ObsClient): Promise<RecordPauseControlOutput> => {
  await client.request(ResumeRecord)
  return Schema.decodeUnknownSync(RecordPauseControlOutput)({
    requestedAction: "resume",
    requestType: ResumeRecord.requestType,
    acknowledged: true
  })
}

export const toggleRecordPause = async (client: ObsClient): Promise<RecordPauseControlOutput> => {
  await client.request(ToggleRecordPause)
  return Schema.decodeUnknownSync(RecordPauseControlOutput)({
    requestedAction: "toggle_pause",
    requestType: ToggleRecordPause.requestType,
    acknowledged: true
  })
}
