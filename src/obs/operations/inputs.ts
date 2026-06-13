import { Schema } from "effect"

import type {
  SetInputAudioBalanceOutput,
  SetInputAudioMonitorTypeOutput,
  SetInputAudioSyncOffsetOutput
} from "../../domain/schemas/inputs.js"
import {
  InputAudioBalanceOutput,
  InputAudioMonitorTypeOutput,
  InputAudioSyncOffsetOutput,
  InputLocatorInput,
  InputMuteOutput,
  InputVolumeOutput,
  ListInputKindsInput,
  ListInputKindsOutput,
  ListInputsInput,
  ListInputsOutput,
  SetInputAudioBalanceInput,
  SetInputAudioMonitorTypeInput,
  SetInputAudioSyncOffsetInput,
  SetInputMuteInput,
  SetInputVolumeInput,
  SetInputVolumeOutput,
  SpecialInputsOutput
} from "../../domain/schemas/inputs.js"
import type { ObsClient } from "../client.js"
import {
  GetInputAudioBalance,
  GetInputAudioMonitorType,
  GetInputAudioSyncOffset,
  GetInputKindList,
  GetInputList,
  GetInputMute,
  GetInputVolume,
  GetSpecialInputs,
  SetInputAudioBalance,
  SetInputAudioMonitorType,
  SetInputAudioSyncOffset,
  SetInputMute,
  SetInputVolume,
  ToggleInputMute
} from "../requests.js"

export const listInputs = async (client: ObsClient, input: ListInputsInput): Promise<ListInputsOutput> => {
  const decodedInput = Schema.decodeUnknownSync(ListInputsInput)(input)
  const response = await client.request(GetInputList, decodedInput)
  return Schema.decodeUnknownSync(ListInputsOutput)(response)
}

export const listInputKinds = async (
  client: ObsClient,
  input: ListInputKindsInput
): Promise<ListInputKindsOutput> => {
  const decodedInput = Schema.decodeUnknownSync(ListInputKindsInput)(input)
  const response = await client.request(GetInputKindList, decodedInput)
  return Schema.decodeUnknownSync(ListInputKindsOutput)(response)
}

export const getSpecialInputs = async (client: ObsClient): Promise<SpecialInputsOutput> => {
  const response = await client.request(GetSpecialInputs)
  return Schema.decodeUnknownSync(SpecialInputsOutput)(response)
}

export const getInputMute = async (client: ObsClient, input: InputLocatorInput): Promise<InputMuteOutput> => {
  const decodedInput = Schema.decodeUnknownSync(InputLocatorInput)(input)
  const response = await client.request(GetInputMute, decodedInput)
  return Schema.decodeUnknownSync(InputMuteOutput)(response)
}

export const setInputMute = async (client: ObsClient, input: SetInputMuteInput): Promise<InputMuteOutput> => {
  const decodedInput = Schema.decodeUnknownSync(SetInputMuteInput)(input)
  await client.request(SetInputMute, decodedInput)
  return { inputMuted: decodedInput.inputMuted }
}

export const toggleInputMute = async (client: ObsClient, input: InputLocatorInput): Promise<InputMuteOutput> => {
  const decodedInput = Schema.decodeUnknownSync(InputLocatorInput)(input)
  const response = await client.request(ToggleInputMute, decodedInput)
  return Schema.decodeUnknownSync(InputMuteOutput)(response)
}

export const getInputVolume = async (client: ObsClient, input: InputLocatorInput): Promise<InputVolumeOutput> => {
  const decodedInput = Schema.decodeUnknownSync(InputLocatorInput)(input)
  const response = await client.request(GetInputVolume, decodedInput)
  return Schema.decodeUnknownSync(InputVolumeOutput)(response)
}

export const setInputVolume = async (
  client: ObsClient,
  input: SetInputVolumeInput
): Promise<SetInputVolumeOutput> => {
  const decodedInput = Schema.decodeUnknownSync(SetInputVolumeInput)(input)
  await client.request(SetInputVolume, decodedInput)
  return Schema.decodeUnknownSync(SetInputVolumeOutput)({
    ...(decodedInput.inputVolumeMul === undefined ? {} : { inputVolumeMul: decodedInput.inputVolumeMul }),
    ...(decodedInput.inputVolumeDb === undefined ? {} : { inputVolumeDb: decodedInput.inputVolumeDb }),
    acknowledged: true
  })
}

export const getInputAudioBalance = async (
  client: ObsClient,
  input: InputLocatorInput
): Promise<InputAudioBalanceOutput> => {
  const decodedInput = Schema.decodeUnknownSync(InputLocatorInput)(input)
  const response = await client.request(GetInputAudioBalance, decodedInput)
  return Schema.decodeUnknownSync(InputAudioBalanceOutput)(response)
}

export const setInputAudioBalance = async (
  client: ObsClient,
  input: SetInputAudioBalanceInput
): Promise<SetInputAudioBalanceOutput> => {
  const decodedInput = Schema.decodeUnknownSync(SetInputAudioBalanceInput)(input)
  await client.request(SetInputAudioBalance, decodedInput)
  return { inputAudioBalance: decodedInput.inputAudioBalance, acknowledged: true }
}

export const getInputAudioMonitorType = async (
  client: ObsClient,
  input: InputLocatorInput
): Promise<InputAudioMonitorTypeOutput> => {
  const decodedInput = Schema.decodeUnknownSync(InputLocatorInput)(input)
  const response = await client.request(GetInputAudioMonitorType, decodedInput)
  return Schema.decodeUnknownSync(InputAudioMonitorTypeOutput)(response)
}

export const setInputAudioMonitorType = async (
  client: ObsClient,
  input: SetInputAudioMonitorTypeInput
): Promise<SetInputAudioMonitorTypeOutput> => {
  const decodedInput = Schema.decodeUnknownSync(SetInputAudioMonitorTypeInput)(input)
  await client.request(SetInputAudioMonitorType, decodedInput)
  return { monitorType: decodedInput.monitorType, acknowledged: true }
}

export const getInputAudioSyncOffset = async (
  client: ObsClient,
  input: InputLocatorInput
): Promise<InputAudioSyncOffsetOutput> => {
  const decodedInput = Schema.decodeUnknownSync(InputLocatorInput)(input)
  const response = await client.request(GetInputAudioSyncOffset, decodedInput)
  return Schema.decodeUnknownSync(InputAudioSyncOffsetOutput)(response)
}

export const setInputAudioSyncOffset = async (
  client: ObsClient,
  input: SetInputAudioSyncOffsetInput
): Promise<SetInputAudioSyncOffsetOutput> => {
  const decodedInput = Schema.decodeUnknownSync(SetInputAudioSyncOffsetInput)(input)
  await client.request(SetInputAudioSyncOffset, decodedInput)
  return { inputAudioSyncOffset: decodedInput.inputAudioSyncOffset, acknowledged: true }
}
