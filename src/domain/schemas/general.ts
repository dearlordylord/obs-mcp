import { JSONSchema, Schema } from "effect"

import { StringArray } from "./shared.js"

export const VersionOutput = Schema.Struct({
  obsVersion: Schema.String,
  obsWebSocketVersion: Schema.String,
  rpcVersion: Schema.Number,
  negotiatedRpcVersion: Schema.Number,
  availableRequests: StringArray,
  supportedImageFormats: StringArray,
  platform: Schema.optional(Schema.String),
  platformDescription: Schema.optional(Schema.String)
})

export type VersionOutput = typeof VersionOutput.Type
export const VersionOutputJsonSchema = JSONSchema.make(VersionOutput)
