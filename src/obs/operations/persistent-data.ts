import { Schema } from "effect"

import {
  GetPersistentDataOutput,
  PersistentDataLocatorInput,
  SetPersistentDataInput,
  SetPersistentDataOutput
} from "../../domain/schemas/persistent-data.js"
import type { ObsClient } from "../client.js"
import { GetPersistentData, SetPersistentData } from "../requests.js"

export const getPersistentData = async (
  client: ObsClient,
  input: PersistentDataLocatorInput
): Promise<GetPersistentDataOutput> => {
  const decodedInput = Schema.decodeUnknownSync(PersistentDataLocatorInput)(input)
  const response = await client.request(GetPersistentData, decodedInput)
  return Schema.decodeUnknownSync(GetPersistentDataOutput)({
    ...decodedInput,
    slotValue: response.slotValue
  })
}

export const setPersistentData = async (
  client: ObsClient,
  input: SetPersistentDataInput
): Promise<SetPersistentDataOutput> => {
  const decodedInput = Schema.decodeUnknownSync(SetPersistentDataInput)(input)
  await client.request(SetPersistentData, decodedInput)
  return Schema.decodeUnknownSync(SetPersistentDataOutput)({
    realm: decodedInput.realm,
    slotName: decodedInput.slotName,
    updated: true
  })
}
