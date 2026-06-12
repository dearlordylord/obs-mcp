import { JSONSchema, Schema } from "effect"

import { StringArray } from "./shared.js"

export const ObsContextOutput = Schema.Struct({
  packageVersion: Schema.String,
  transport: Schema.Literal("stdio"),
  obs: Schema.Struct({
    url: Schema.Struct({
      origin: Schema.String,
      host: Schema.String,
      protocol: Schema.Literal("ws:", "wss:")
    }),
    connectionTimeoutMs: Schema.Number,
    authMode: Schema.Literal("password", "none")
  }),
  enabledToolsets: StringArray,
  protocolReferencePath: Schema.String
})

export type ObsContextOutput = typeof ObsContextOutput.Type
export const ObsContextOutputJsonSchema = JSONSchema.make(ObsContextOutput)
