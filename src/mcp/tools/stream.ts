import {
  StartStreamOutput,
  StopStreamOutput,
  StreamStatusOutput,
  ToggleStreamOutput
} from "../../domain/schemas/index.js"
import { EmptyInput } from "../../domain/schemas/shared.js"
import { getStreamStatus, startStream, stopStream, toggleStream } from "../../obs/operations/stream.js"
import { GetStreamStatus, StartStream, StopStream, ToggleStream } from "../../obs/requests.js"
import { defineTool, type ToolDefinition } from "./mechanics.js"

const CATEGORY = "stream" as const

export const streamTools: ReadonlyArray<ToolDefinition> = [
  defineTool({
    name: "get_stream_status",
    title: "Get OBS Stream Status",
    description: "Return OBS stream output activity, reconnecting state, timing, congestion, byte, and frame counts.",
    category: CATEGORY,
    requiredObsRequests: [GetStreamStatus.requestType],
    inputSchema: EmptyInput,
    outputSchema: StreamStatusOutput,
    handler: async (_input, context) => getStreamStatus(context.client)
  }),
  defineTool({
    name: "start_stream",
    title: "Start OBS Stream",
    description: "Start the OBS stream output.",
    category: CATEGORY,
    requiredObsRequests: [StartStream.requestType],
    inputSchema: EmptyInput,
    outputSchema: StartStreamOutput,
    handler: async (_input, context) => startStream(context.client)
  }),
  defineTool({
    name: "stop_stream",
    title: "Stop OBS Stream",
    description: "Stop the OBS stream output.",
    category: CATEGORY,
    requiredObsRequests: [StopStream.requestType],
    inputSchema: EmptyInput,
    outputSchema: StopStreamOutput,
    handler: async (_input, context) => stopStream(context.client)
  }),
  defineTool({
    name: "toggle_stream",
    title: "Toggle OBS Stream",
    description: "Toggle the OBS stream output and return the resulting activity state.",
    category: CATEGORY,
    requiredObsRequests: [ToggleStream.requestType],
    inputSchema: EmptyInput,
    outputSchema: ToggleStreamOutput,
    handler: async (_input, context) => toggleStream(context.client)
  })
]
