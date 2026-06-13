import { Schema } from "effect"

import {
  InputLocatorInput,
  InputMuteOutput,
  InputVolumeOutput,
  ListInputKindsInput,
  ListInputKindsOutput,
  ListInputsInput,
  ListInputsOutput,
  SetInputMuteInput,
  SetInputVolumeInput,
  SetInputVolumeOutput,
  SpecialInputsOutput
} from "../../domain/schemas/inputs.js"
import type { ObsClient } from "../client.js"
import {
  GetInputKindList,
  GetInputList,
  GetInputMute,
  GetInputVolume,
  GetSpecialInputs,
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
