import {
  ReplayBufferStatusOutput,
  ReplayBufferSwitchOutput,
  VirtualCamStatusOutput,
  VirtualCamSwitchOutput
} from "../../domain/schemas/index.js"
import { EmptyInput } from "../../domain/schemas/shared.js"
import {
  getReplayBufferStatus,
  getVirtualCamStatus,
  startReplayBuffer,
  startVirtualCam,
  stopReplayBuffer,
  stopVirtualCam,
  toggleReplayBuffer,
  toggleVirtualCam
} from "../../obs/operations/outputs.js"
import {
  GetReplayBufferStatus,
  GetVirtualCamStatus,
  StartReplayBuffer,
  StartVirtualCam,
  StopReplayBuffer,
  StopVirtualCam,
  ToggleReplayBuffer,
  ToggleVirtualCam
} from "../../obs/requests.js"
import { defineTool, type ToolDefinition } from "./mechanics.js"

const CATEGORY = "outputs" as const

export const outputTools: ReadonlyArray<ToolDefinition> = [
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
  })
]
