import { Schema } from "effect"

import {
  GetOutputSettingsInput,
  GetOutputSettingsOutput,
  GetOutputStatusInput,
  GetOutputStatusOutput,
  LastReplayBufferReplayOutput,
  ListOutputsOutput,
  OutputLifecycleInput,
  OutputLifecycleOutput,
  ReplayBufferStatusOutput,
  ReplayBufferSwitchOutput,
  SaveReplayBufferOutput,
  SetOutputSettingsInput,
  SetOutputSettingsOutput,
  VirtualCamStatusOutput,
  VirtualCamSwitchOutput
} from "../../domain/schemas/outputs.js"
import type { ObsClient } from "../client.js"
import type { ObsRequestDescriptor } from "../requests.js"
import {
  GetLastReplayBufferReplay,
  GetOutputList,
  GetOutputSettings,
  GetOutputStatus,
  GetReplayBufferStatus,
  GetVirtualCamStatus,
  SaveReplayBuffer,
  SetOutputSettings,
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

const decodeOutputLifecycleOutput = (
  outputName: string,
  outputActive: boolean
): OutputLifecycleOutput =>
  Schema.decodeUnknownSync(OutputLifecycleOutput)({
    outputName,
    outputActive,
    updated: true
  })

const setOutputActive = async (
  client: ObsClient,
  descriptor: ObsRequestDescriptor<Record<string, unknown>>,
  input: OutputLifecycleInput,
  active: boolean
): Promise<OutputLifecycleOutput> => {
  const decodedInput = Schema.decodeUnknownSync(OutputLifecycleInput)(input)
  await client.request(descriptor, decodedInput)
  return decodeOutputLifecycleOutput(decodedInput.outputName, active)
}

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

export const getOutputSettings = async (
  client: ObsClient,
  input: GetOutputSettingsInput
): Promise<GetOutputSettingsOutput> => {
  const decodedInput = Schema.decodeUnknownSync(GetOutputSettingsInput)(input)
  const response = await client.request(GetOutputSettings, decodedInput)
  return Schema.decodeUnknownSync(GetOutputSettingsOutput)({ ...response, outputName: decodedInput.outputName })
}

export const setOutputSettings = async (
  client: ObsClient,
  input: SetOutputSettingsInput
): Promise<SetOutputSettingsOutput> => {
  const decodedInput = Schema.decodeUnknownSync(SetOutputSettingsInput)(input)
  await client.request(SetOutputSettings, decodedInput)
  return Schema.decodeUnknownSync(SetOutputSettingsOutput)({
    outputName: decodedInput.outputName,
    outputSettings: decodedInput.outputSettings,
    updated: true
  })
}

export const startOutput = async (
  client: ObsClient,
  input: OutputLifecycleInput
): Promise<OutputLifecycleOutput> => setOutputActive(client, StartOutput, input, true)

export const stopOutput = async (
  client: ObsClient,
  input: OutputLifecycleInput
): Promise<OutputLifecycleOutput> => setOutputActive(client, StopOutput, input, false)

export const toggleOutput = async (
  client: ObsClient,
  input: OutputLifecycleInput
): Promise<OutputLifecycleOutput> => {
  const decodedInput = Schema.decodeUnknownSync(OutputLifecycleInput)(input)
  const response = await client.request(ToggleOutput, decodedInput)
  return decodeOutputLifecycleOutput(decodedInput.outputName, response.outputActive)
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
