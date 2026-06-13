import { JSONSchema, Schema } from "effect"

export const StudioModeEnabledOutput = Schema.Struct({
  studioModeEnabled: Schema.Boolean
})
export type StudioModeEnabledOutput = typeof StudioModeEnabledOutput.Type
export const StudioModeEnabledOutputJsonSchema = JSONSchema.make(StudioModeEnabledOutput)
