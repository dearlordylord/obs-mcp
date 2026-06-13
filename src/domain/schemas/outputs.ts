import { JSONSchema, Schema } from "effect"

export const VirtualCamStatusOutput = Schema.Struct({
  outputActive: Schema.Boolean
})
export type VirtualCamStatusOutput = typeof VirtualCamStatusOutput.Type
export const VirtualCamStatusOutputJsonSchema = JSONSchema.make(VirtualCamStatusOutput)

export const VirtualCamSwitchOutput = Schema.Struct({
  outputActive: Schema.Boolean,
  switched: Schema.Literal(true)
})
export type VirtualCamSwitchOutput = typeof VirtualCamSwitchOutput.Type
export const VirtualCamSwitchOutputJsonSchema = JSONSchema.make(VirtualCamSwitchOutput)
