import { Schema } from "effect"

export type JsonSafeValue =
  | null
  | boolean
  | number
  | string
  | ReadonlyArray<JsonSafeValue>
  | { readonly [key: string]: JsonSafeValue }

const isPlainJsonObject = (value: unknown): value is { readonly [key: string]: unknown } =>
  typeof value === "object"
  && value !== null
  && !Array.isArray(value)
  && (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null)

const isJsonSafeValue = (value: unknown): value is JsonSafeValue => {
  if (value === null || typeof value === "string" || typeof value === "boolean") {
    return true
  }
  if (typeof value === "number") {
    return Number.isFinite(value)
  }
  if (Array.isArray(value)) {
    return value.every(isJsonSafeValue)
  }
  if (isPlainJsonObject(value)) {
    return Object.values(value).every(isJsonSafeValue)
  }
  return false
}

export const JsonSafeValue = Schema.declare(isJsonSafeValue).annotations({
  jsonSchema: {
    anyOf: [
      { type: "null" },
      { type: "boolean" },
      { type: "number" },
      { type: "string" },
      { type: "array", items: true },
      { type: "object", additionalProperties: true }
    ]
  }
})

export const PersistentDataRealm = Schema.Literal(
  "OBS_WEBSOCKET_DATA_REALM_GLOBAL",
  "OBS_WEBSOCKET_DATA_REALM_PROFILE"
)
export type PersistentDataRealm = typeof PersistentDataRealm.Type

export const PersistentDataSlotName = Schema.String.pipe(Schema.minLength(1))

export const PersistentDataLocatorInput = Schema.Struct({
  realm: PersistentDataRealm,
  slotName: PersistentDataSlotName
})
export type PersistentDataLocatorInput = typeof PersistentDataLocatorInput.Type

export const GetPersistentDataOutput = Schema.Struct({
  realm: PersistentDataRealm,
  slotName: PersistentDataSlotName,
  slotValue: JsonSafeValue
})
export type GetPersistentDataOutput = typeof GetPersistentDataOutput.Type

export const SetPersistentDataInput = Schema.Struct({
  realm: PersistentDataRealm,
  slotName: PersistentDataSlotName,
  slotValue: JsonSafeValue
})
export type SetPersistentDataInput = typeof SetPersistentDataInput.Type

export const SetPersistentDataOutput = Schema.Struct({
  realm: PersistentDataRealm,
  slotName: PersistentDataSlotName,
  updated: Schema.Literal(true)
})
export type SetPersistentDataOutput = typeof SetPersistentDataOutput.Type
