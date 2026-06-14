import { Schema } from "effect"

import { isPlainJsonObject, ObsNonEmptyString } from "./shared.js"

import { isJsonSafeValue, type JsonSafeValue as JsonSafeValueType } from "./persistent-data.js"

export type JsonSafeObject = Readonly<Record<string, JsonSafeValueType>>
export const JsonSafeObject = Schema.declare((value: unknown): value is JsonSafeObject =>
  isPlainJsonObject(value) && Object.values(value).every(isJsonSafeValue)
).annotations({
  jsonSchema: { type: "object", additionalProperties: true }
})

export const CallVendorRequestInput = Schema.Struct({
  vendorName: ObsNonEmptyString,
  requestType: ObsNonEmptyString,
  requestData: Schema.optionalWith(JsonSafeObject, { default: () => ({}) })
})
export type CallVendorRequestInput = typeof CallVendorRequestInput.Type

export const CallVendorRequestOutput = Schema.Struct({
  vendorName: ObsNonEmptyString,
  requestType: ObsNonEmptyString,
  provenance: Schema.Literal("vendor_plugin"),
  responseData: JsonSafeObject
})
export type CallVendorRequestOutput = typeof CallVendorRequestOutput.Type

export const BroadcastCustomEventInput = Schema.Struct({
  eventData: JsonSafeObject
})
export type BroadcastCustomEventInput = typeof BroadcastCustomEventInput.Type

export const BroadcastCustomEventOutput = Schema.Struct({
  provenance: Schema.Literal("custom_event"),
  broadcasted: Schema.Literal(true)
})
export type BroadcastCustomEventOutput = typeof BroadcastCustomEventOutput.Type
