import { Schema } from "effect"

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
} from "../../domain/schemas/outputs.js"
import type { ObsClient } from "../client.js"
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
} from "../requests.js"
import { acknowledged, outputActive, outputActiveSwitch, requestAndDecode, requestAndReturn } from "./shared.js"

export const listOutputs = async (client: ObsClient): Promise<ListOutputsOutput> => {
  return requestAndDecode(client, GetOutputList, ListOutputsOutput)
}

export const getOutputStatus = async (
  client: ObsClient,
  input: GetOutputStatusInput
): Promise<GetOutputStatusOutput> => {
  const decodedInput = Schema.decodeUnknownSync(GetOutputStatusInput)(input)
  const response = await client.request(GetOutputStatus, decodedInput)
  return Schema.decodeUnknownSync(GetOutputStatusOutput)({ ...response, outputName: decodedInput.outputName })
}

export const startOutput = async (
  client: ObsClient,
  input: OutputLifecycleInput
): Promise<OutputLifecycleOutput> => {
  const decodedInput = Schema.decodeUnknownSync(OutputLifecycleInput)(input)
  await client.request(StartOutput, decodedInput)
  return Schema.decodeUnknownSync(OutputLifecycleOutput)({
    outputName: decodedInput.outputName,
    outputActive: true,
    updated: true
  })
}

export const stopOutput = async (
  client: ObsClient,
  input: OutputLifecycleInput
): Promise<OutputLifecycleOutput> => {
  const decodedInput = Schema.decodeUnknownSync(OutputLifecycleInput)(input)
  await client.request(StopOutput, decodedInput)
  return Schema.decodeUnknownSync(OutputLifecycleOutput)({
    outputName: decodedInput.outputName,
    outputActive: false,
    updated: true
  })
}

export const toggleOutput = async (
  client: ObsClient,
  input: OutputLifecycleInput
): Promise<OutputLifecycleOutput> => {
  const decodedInput = Schema.decodeUnknownSync(OutputLifecycleInput)(input)
  const response = await client.request(ToggleOutput, decodedInput)
  return Schema.decodeUnknownSync(OutputLifecycleOutput)({
    outputName: decodedInput.outputName,
    outputActive: response.outputActive,
    updated: true
  })
}

export const getVirtualCamStatus = async (client: ObsClient): Promise<VirtualCamStatusOutput> => {
  return requestAndDecode(client, GetVirtualCamStatus, VirtualCamStatusOutput)
}

export const startVirtualCam = async (client: ObsClient): Promise<VirtualCamSwitchOutput> => {
  return requestAndReturn(client, StartVirtualCam, outputActiveSwitch(true), VirtualCamSwitchOutput)
}

export const stopVirtualCam = async (client: ObsClient): Promise<VirtualCamSwitchOutput> => {
  return requestAndReturn(client, StopVirtualCam, outputActiveSwitch(false), VirtualCamSwitchOutput)
}

export const toggleVirtualCam = async (client: ObsClient): Promise<VirtualCamSwitchOutput> => {
  const response = await client.request(ToggleVirtualCam)
  return Schema.decodeUnknownSync(VirtualCamSwitchOutput)({ ...response, switched: true })
}

export const getReplayBufferStatus = async (client: ObsClient): Promise<ReplayBufferStatusOutput> => {
  return requestAndDecode(client, GetReplayBufferStatus, ReplayBufferStatusOutput)
}

export const startReplayBuffer = async (client: ObsClient): Promise<ReplayBufferSwitchOutput> => {
  return requestAndReturn(client, StartReplayBuffer, outputActive(true), ReplayBufferSwitchOutput)
}

export const stopReplayBuffer = async (client: ObsClient): Promise<ReplayBufferSwitchOutput> => {
  return requestAndReturn(client, StopReplayBuffer, outputActive(false), ReplayBufferSwitchOutput)
}

export const toggleReplayBuffer = async (client: ObsClient): Promise<ReplayBufferSwitchOutput> => {
  return requestAndDecode(client, ToggleReplayBuffer, ReplayBufferSwitchOutput)
}

export const saveReplayBuffer = async (client: ObsClient): Promise<SaveReplayBufferOutput> => {
  return requestAndReturn(client, SaveReplayBuffer, acknowledged(SaveReplayBuffer.requestType), SaveReplayBufferOutput)
}

export const getLastReplayBufferReplay = async (client: ObsClient): Promise<LastReplayBufferReplayOutput> => {
  return requestAndDecode(client, GetLastReplayBufferReplay, LastReplayBufferReplayOutput)
}
