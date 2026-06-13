import { Schema } from "effect"

import {
  ListInputKindsInput,
  ListInputKindsOutput,
  ListInputsInput,
  ListInputsOutput,
  SpecialInputsOutput
} from "../../domain/schemas/inputs.js"
import type { ObsClient } from "../client.js"
import { GetInputKindList, GetInputList, GetSpecialInputs } from "../requests.js"

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
