import { Schema } from "effect"

import {
  ReplayBufferStatusOutput,
  ReplayBufferSwitchOutput,
  VirtualCamStatusOutput,
  VirtualCamSwitchOutput
} from "../../domain/schemas/outputs.js"
import type { ObsClient } from "../client.js"
import {
  GetReplayBufferStatus,
  GetVirtualCamStatus,
  StartReplayBuffer,
  StartVirtualCam,
  StopReplayBuffer,
  StopVirtualCam,
  ToggleReplayBuffer,
  ToggleVirtualCam
} from "../requests.js"
import { requestAndDecode, requestAndReturn } from "./shared.js"

export const getVirtualCamStatus = async (client: ObsClient): Promise<VirtualCamStatusOutput> => {
  return requestAndDecode(client, GetVirtualCamStatus, VirtualCamStatusOutput)
}

export const startVirtualCam = async (client: ObsClient): Promise<VirtualCamSwitchOutput> => {
  return requestAndReturn(client, StartVirtualCam, { outputActive: true, switched: true }, VirtualCamSwitchOutput)
}

export const stopVirtualCam = async (client: ObsClient): Promise<VirtualCamSwitchOutput> => {
  return requestAndReturn(client, StopVirtualCam, { outputActive: false, switched: true }, VirtualCamSwitchOutput)
}

export const toggleVirtualCam = async (client: ObsClient): Promise<VirtualCamSwitchOutput> => {
  const response = await client.request(ToggleVirtualCam)
  return Schema.decodeUnknownSync(VirtualCamSwitchOutput)({ ...response, switched: true })
}

export const getReplayBufferStatus = async (client: ObsClient): Promise<ReplayBufferStatusOutput> => {
  return requestAndDecode(client, GetReplayBufferStatus, ReplayBufferStatusOutput)
}

export const startReplayBuffer = async (client: ObsClient): Promise<ReplayBufferSwitchOutput> => {
  return requestAndReturn(client, StartReplayBuffer, { outputActive: true }, ReplayBufferSwitchOutput)
}

export const stopReplayBuffer = async (client: ObsClient): Promise<ReplayBufferSwitchOutput> => {
  return requestAndReturn(client, StopReplayBuffer, { outputActive: false }, ReplayBufferSwitchOutput)
}

export const toggleReplayBuffer = async (client: ObsClient): Promise<ReplayBufferSwitchOutput> => {
  return requestAndDecode(client, ToggleReplayBuffer, ReplayBufferSwitchOutput)
}
