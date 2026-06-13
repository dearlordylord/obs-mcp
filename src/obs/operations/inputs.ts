import { Schema } from "effect"

import {
  InputLocatorInput,
  InputMuteOutput,
  ListInputKindsInput,
  ListInputKindsOutput,
  ListInputsInput,
  ListInputsOutput,
  SetInputMuteInput,
  SpecialInputsOutput
} from "../../domain/schemas/inputs.js"
import type { ObsClient } from "../client.js"
import {
  GetInputKindList,
  GetInputList,
  GetInputMute,
  GetSpecialInputs,
  SetInputMute,
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
