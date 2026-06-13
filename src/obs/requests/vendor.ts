import { Schema } from "effect"

import { ObsString } from "../../domain/schemas/shared.js"
import { BroadcastCustomEventInput, CallVendorRequestInput, JsonSafeObject } from "../../domain/schemas/vendor.js"
import { type ObsRequestDescriptor } from "./shared.js"

const CallVendorRequestResponse = Schema.Struct({
  vendorName: ObsString,
  requestType: ObsString,
  responseData: JsonSafeObject
})
type CallVendorRequestResponse = typeof CallVendorRequestResponse.Type

export const CallVendorRequest = {
  requestType: "CallVendorRequest",
  requestDataSchema: CallVendorRequestInput,
  responseSchema: CallVendorRequestResponse
} satisfies ObsRequestDescriptor<CallVendorRequestResponse>

const BroadcastCustomEventResponse = Schema.Struct({})
type BroadcastCustomEventResponse = typeof BroadcastCustomEventResponse.Type

export const BroadcastCustomEvent = {
  requestType: "BroadcastCustomEvent",
  requestDataSchema: BroadcastCustomEventInput,
  responseSchema: BroadcastCustomEventResponse
} satisfies ObsRequestDescriptor<BroadcastCustomEventResponse>
