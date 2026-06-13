import { Schema } from "effect"

import {
  BroadcastCustomEventInput,
  BroadcastCustomEventOutput,
  CallVendorRequestInput,
  CallVendorRequestOutput
} from "../../domain/schemas/vendor.js"
import type { ObsClient } from "../client.js"
import { BroadcastCustomEvent, CallVendorRequest } from "../requests.js"

export const callVendorRequest = async (
  client: ObsClient,
  input: CallVendorRequestInput
): Promise<CallVendorRequestOutput> => {
  const decodedInput = Schema.decodeUnknownSync(CallVendorRequestInput)(input)
  const response = await client.request(CallVendorRequest, decodedInput)
  return Schema.decodeUnknownSync(CallVendorRequestOutput)({
    vendorName: response.vendorName,
    requestType: response.requestType,
    provenance: "vendor_plugin",
    responseData: response.responseData
  })
}

export const broadcastCustomEvent = async (
  client: ObsClient,
  input: BroadcastCustomEventInput
): Promise<BroadcastCustomEventOutput> => {
  const decodedInput = Schema.decodeUnknownSync(BroadcastCustomEventInput)(input)
  await client.request(BroadcastCustomEvent, decodedInput)
  return Schema.decodeUnknownSync(BroadcastCustomEventOutput)({
    provenance: "custom_event",
    broadcasted: true
  })
}
