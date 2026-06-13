import {
  GetOutputStatusInput,
  GetOutputStatusOutput,
  LastReplayBufferReplayOutput,
  ListOutputsOutput,
  OutputLifecycleInput,
  OutputLifecycleOutput,
  ReplayBufferStatusOutput,
  ReplayBufferSwitchOutput,
  SaveReplayBufferOutput,
  VirtualCamStatusOutput,
  VirtualCamSwitchOutput
} from "../../domain/schemas/index.js"
import { EmptyInput } from "../../domain/schemas/shared.js"
import {
  getLastReplayBufferReplay,
  getOutputStatus,
  getReplayBufferStatus,
  getVirtualCamStatus,
  listOutputs,
  saveReplayBuffer,
  startOutput,
  startReplayBuffer,
  startVirtualCam,
  stopOutput,
  stopReplayBuffer,
  stopVirtualCam,
  toggleOutput,
  toggleReplayBuffer,
  toggleVirtualCam
} from "../../obs/operations/outputs.js"
import {
  GetLastReplayBufferReplay,
  GetOutputList,
  GetOutputStatus,
  GetReplayBufferStatus,
  GetVirtualCamStatus,
  SaveReplayBuffer,
  StartOutput,
  StartReplayBuffer,
  StartVirtualCam,
  StopOutput,
  StopReplayBuffer,
  StopVirtualCam,
  ToggleOutput,
  ToggleReplayBuffer,
  ToggleVirtualCam
} from "../../obs/requests.js"
import { defineTool, type ToolDefinition } from "./mechanics.js"

const CATEGORY = "outputs" as const

export const outputTools: ReadonlyArray<ToolDefinition> = [
  defineTool({
    name: "list_outputs",
    title: "List OBS Outputs",
    description: "Return OBS output names, kinds, and activity state.",
    category: CATEGORY,
    requiredObsRequests: [GetOutputList.requestType],
    inputSchema: EmptyInput,
    outputSchema: ListOutputsOutput,
    handler: async (_input, context) => listOutputs(context.client)
  }),
  defineTool({
    name: "get_output_status",
    title: "Get OBS Output Status",
    description: "Return generic OBS status fields for an output by name.",
    category: CATEGORY,
    requiredObsRequests: [GetOutputStatus.requestType],
    inputSchema: GetOutputStatusInput,
    outputSchema: GetOutputStatusOutput,
    handler: async (input, context) => getOutputStatus(context.client, input)
  }),
  defineTool({
    name: "start_output",
    title: "Start OBS Output",
    description:
      "Start a generic OBS output by name. Prefer specialized record, stream, virtual camera, or replay tools when applicable.",
    category: CATEGORY,
    requiredObsRequests: [StartOutput.requestType],
    inputSchema: OutputLifecycleInput,
    outputSchema: OutputLifecycleOutput,
    handler: async (input, context) => startOutput(context.client, input)
  }),
  defineTool({
    name: "stop_output",
    title: "Stop OBS Output",
    description:
      "Stop a generic OBS output by name. Prefer specialized record, stream, virtual camera, or replay tools when applicable.",
    category: CATEGORY,
    requiredObsRequests: [StopOutput.requestType],
    inputSchema: OutputLifecycleInput,
    outputSchema: OutputLifecycleOutput,
    handler: async (input, context) => stopOutput(context.client, input)
  }),
  defineTool({
    name: "toggle_output",
    title: "Toggle OBS Output",
    description:
      "Toggle a generic OBS output by name. Prefer specialized record, stream, virtual camera, or replay tools when applicable.",
    category: CATEGORY,
    requiredObsRequests: [ToggleOutput.requestType],
    inputSchema: OutputLifecycleInput,
    outputSchema: OutputLifecycleOutput,
    handler: async (input, context) => toggleOutput(context.client, input)
  }),
  defineTool({
    name: "get_virtual_cam_status",
    title: "Get OBS Virtual Camera Status",
    description: "Return whether OBS virtual camera output is active.",
    category: CATEGORY,
    requiredObsRequests: [GetVirtualCamStatus.requestType],
    inputSchema: EmptyInput,
    outputSchema: VirtualCamStatusOutput,
    handler: async (_input, context) => getVirtualCamStatus(context.client)
  }),
  defineTool({
    name: "start_virtual_cam",
    title: "Start OBS Virtual Camera",
    description: "Start the OBS virtual camera output.",
    category: CATEGORY,
    requiredObsRequests: [StartVirtualCam.requestType],
    inputSchema: EmptyInput,
    outputSchema: VirtualCamSwitchOutput,
    handler: async (_input, context) => startVirtualCam(context.client)
  }),
  defineTool({
    name: "stop_virtual_cam",
    title: "Stop OBS Virtual Camera",
    description: "Stop the OBS virtual camera output.",
    category: CATEGORY,
    requiredObsRequests: [StopVirtualCam.requestType],
    inputSchema: EmptyInput,
    outputSchema: VirtualCamSwitchOutput,
    handler: async (_input, context) => stopVirtualCam(context.client)
  }),
  defineTool({
    name: "toggle_virtual_cam",
    title: "Toggle OBS Virtual Camera",
    description: "Toggle the OBS virtual camera output and return the resulting activity state.",
    category: CATEGORY,
    requiredObsRequests: [ToggleVirtualCam.requestType],
    inputSchema: EmptyInput,
    outputSchema: VirtualCamSwitchOutput,
    handler: async (_input, context) => toggleVirtualCam(context.client)
  }),
  defineTool({
    name: "get_replay_buffer_status",
    title: "Get OBS Replay Buffer Status",
    description: "Return whether the OBS replay buffer output is active.",
    category: CATEGORY,
    requiredObsRequests: [GetReplayBufferStatus.requestType],
    inputSchema: EmptyInput,
    outputSchema: ReplayBufferStatusOutput,
    handler: async (_input, context) => getReplayBufferStatus(context.client)
  }),
  defineTool({
    name: "start_replay_buffer",
    title: "Start OBS Replay Buffer",
    description: "Start the OBS replay buffer output.",
    category: CATEGORY,
    requiredObsRequests: [StartReplayBuffer.requestType],
    inputSchema: EmptyInput,
    outputSchema: ReplayBufferSwitchOutput,
    handler: async (_input, context) => startReplayBuffer(context.client)
  }),
  defineTool({
    name: "stop_replay_buffer",
    title: "Stop OBS Replay Buffer",
    description: "Stop the OBS replay buffer output.",
    category: CATEGORY,
    requiredObsRequests: [StopReplayBuffer.requestType],
    inputSchema: EmptyInput,
    outputSchema: ReplayBufferSwitchOutput,
    handler: async (_input, context) => stopReplayBuffer(context.client)
  }),
  defineTool({
    name: "toggle_replay_buffer",
    title: "Toggle OBS Replay Buffer",
    description: "Toggle the OBS replay buffer output and return the resulting activity state.",
    category: CATEGORY,
    requiredObsRequests: [ToggleReplayBuffer.requestType],
    inputSchema: EmptyInput,
    outputSchema: ReplayBufferSwitchOutput,
    handler: async (_input, context) => toggleReplayBuffer(context.client)
  }),
  defineTool({
    name: "save_replay_buffer",
    title: "Save OBS Replay Buffer",
    description: "Save the current OBS replay buffer contents.",
    category: CATEGORY,
    requiredObsRequests: [SaveReplayBuffer.requestType],
    inputSchema: EmptyInput,
    outputSchema: SaveReplayBufferOutput,
    handler: async (_input, context) => saveReplayBuffer(context.client)
  }),
  defineTool({
    name: "get_last_replay_buffer_replay",
    title: "Get Last OBS Replay Buffer Replay",
    description: "Return the OBS-provided saved replay path for the last replay buffer save.",
    category: CATEGORY,
    requiredObsRequests: [GetLastReplayBufferReplay.requestType],
    inputSchema: EmptyInput,
    outputSchema: LastReplayBufferReplayOutput,
    handler: async (_input, context) => getLastReplayBufferReplay(context.client)
  })
]
