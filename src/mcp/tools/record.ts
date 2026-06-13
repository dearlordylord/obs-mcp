import { RecordPauseControlOutput, RecordStatusOutput } from "../../domain/schemas/index.js"
import { EmptyInput } from "../../domain/schemas/shared.js"
import { getRecordStatus } from "../../obs/operations/general.js"
import { pauseRecord, resumeRecord, toggleRecordPause } from "../../obs/operations/record.js"
import { GetRecordStatus, PauseRecord, ResumeRecord, ToggleRecordPause } from "../../obs/requests.js"
import { defineTool, type ToolDefinition } from "./mechanics.js"

const CATEGORY = "record" as const

export const recordTools: ReadonlyArray<ToolDefinition> = [
  defineTool({
    name: "get_record_status",
    title: "Get OBS Record Status",
    description: "Return the active, paused, timecode, duration, and byte count status for the OBS record output.",
    category: CATEGORY,
    requiredObsRequests: [GetRecordStatus.requestType],
    inputSchema: EmptyInput,
    outputSchema: RecordStatusOutput,
    handler: async (_input, context) => getRecordStatus(context.client)
  }),
  defineTool({
    name: "pause_record",
    title: "Pause OBS Recording",
    description: "Pause the active OBS record output.",
    category: CATEGORY,
    requiredObsRequests: [PauseRecord.requestType],
    inputSchema: EmptyInput,
    outputSchema: RecordPauseControlOutput,
    handler: async (_input, context) => pauseRecord(context.client)
  }),
  defineTool({
    name: "resume_record",
    title: "Resume OBS Recording",
    description: "Resume a paused OBS record output.",
    category: CATEGORY,
    requiredObsRequests: [ResumeRecord.requestType],
    inputSchema: EmptyInput,
    outputSchema: RecordPauseControlOutput,
    handler: async (_input, context) => resumeRecord(context.client)
  }),
  defineTool({
    name: "toggle_record_pause",
    title: "Toggle OBS Recording Pause",
    description: "Toggle the pause state of the OBS record output.",
    category: CATEGORY,
    requiredObsRequests: [ToggleRecordPause.requestType],
    inputSchema: EmptyInput,
    outputSchema: RecordPauseControlOutput,
    handler: async (_input, context) => toggleRecordPause(context.client)
  })
]
