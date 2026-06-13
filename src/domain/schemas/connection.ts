import { JSONSchema, Schema } from "effect"

import { ObsNumber, ObsString, StringArray } from "./shared.js"

export const ObsContextOutput = Schema.Struct({
  packageVersion: ObsString,
  transport: Schema.Literal("stdio"),
  obs: Schema.Struct({
    url: Schema.Struct({
      origin: ObsString,
      host: ObsString,
      protocol: Schema.Literal("ws:", "wss:")
    }),
    connectionTimeoutMs: ObsNumber,
    authMode: Schema.Literal("password", "none")
  }),
  enabledToolsets: StringArray,
  protocolReferencePath: ObsString
})

export type ObsContextOutput = typeof ObsContextOutput.Type
export const ObsContextOutputJsonSchema = JSONSchema.make(ObsContextOutput)
