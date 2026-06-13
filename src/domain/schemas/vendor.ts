import { Schema } from "effect"

import { isJsonSafeValue, type JsonSafeValue as JsonSafeValueType } from "./persistent-data.js"

export type JsonSafeObject = Readonly<Record<string, JsonSafeValueType>>
const isPlainJsonObject = (value: unknown): value is Readonly<Record<string, unknown>> =>
  typeof value === "object"
  && value !== null
  && !Array.isArray(value)
  && (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null)

export const JsonSafeObject = Schema.declare((value: unknown): value is JsonSafeObject =>
  isPlainJsonObject(value) && Object.values(value).every(isJsonSafeValue)
).annotations({
  jsonSchema: { type: "object", additionalProperties: true }
})

const NonEmptyString = Schema.String.pipe(Schema.minLength(1))

export const CallVendorRequestInput = Schema.Struct({
  vendorName: NonEmptyString,
  requestType: NonEmptyString,
  requestData: Schema.optionalWith(JsonSafeObject, { default: () => ({}) })
})
export type CallVendorRequestInput = typeof CallVendorRequestInput.Type

export const CallVendorRequestOutput = Schema.Struct({
  vendorName: NonEmptyString,
  requestType: NonEmptyString,
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
