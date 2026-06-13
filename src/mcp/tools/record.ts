import {
  CreateRecordChapterInput,
  CreateRecordChapterOutput,
  RecordPauseControlOutput,
  RecordStatusOutput,
  SplitRecordFileOutput
} from "../../domain/schemas/index.js"
import { EmptyInput } from "../../domain/schemas/shared.js"
import { getRecordStatus } from "../../obs/operations/general.js"
import {
  createRecordChapter,
  pauseRecord,
  resumeRecord,
  splitRecordFile,
  toggleRecordPause
} from "../../obs/operations/record.js"
import {
  CreateRecordChapter,
  GetRecordStatus,
  PauseRecord,
  ResumeRecord,
  SplitRecordFile,
  ToggleRecordPause
} from "../../obs/requests.js"
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
    name: "split_record_file",
    title: "Split OBS Recording File",
    description: "Split the current OBS recording into a new file.",
    category: CATEGORY,
    requiredObsRequests: [SplitRecordFile.requestType],
    inputSchema: EmptyInput,
    outputSchema: SplitRecordFileOutput,
    handler: async (_input, context) => splitRecordFile(context.client)
  }),
  defineTool({
    name: "create_record_chapter",
    title: "Create OBS Recording Chapter",
    description:
      "Add a chapter marker to the current OBS recording. Chapter marker support depends on the recording format; as of OBS 30.2.0, Hybrid MP4 is the supported format.",
    category: CATEGORY,
    requiredObsRequests: [CreateRecordChapter.requestType],
    inputSchema: CreateRecordChapterInput,
    outputSchema: CreateRecordChapterOutput,
    handler: async (input, context) => createRecordChapter(context.client, input)
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
