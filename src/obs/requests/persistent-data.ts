import { Schema } from "effect"

import {
  JsonSafeValue,
  PersistentDataLocatorInput,
  PersistentDataRealm,
  PersistentDataSlotName,
  SetPersistentDataInput
} from "../../domain/schemas/persistent-data.js"
import { type ObsRequestDescriptor } from "./shared.js"

const GetPersistentDataResponse = Schema.Struct({
  slotValue: JsonSafeValue
})
type GetPersistentDataResponse = typeof GetPersistentDataResponse.Type

export const GetPersistentData = {
  requestType: "GetPersistentData",
  requestDataSchema: PersistentDataLocatorInput,
  responseSchema: GetPersistentDataResponse
} satisfies ObsRequestDescriptor<GetPersistentDataResponse>

const SetPersistentDataRequest = Schema.Struct({
  realm: PersistentDataRealm,
  slotName: PersistentDataSlotName,
  slotValue: SetPersistentDataInput.fields.slotValue
})

const SetPersistentDataResponse = Schema.Struct({})
type SetPersistentDataResponse = typeof SetPersistentDataResponse.Type

export const SetPersistentData = {
  requestType: "SetPersistentData",
  requestDataSchema: SetPersistentDataRequest,
  responseSchema: SetPersistentDataResponse
} satisfies ObsRequestDescriptor<SetPersistentDataResponse>
