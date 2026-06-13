import { JSONSchema } from "effect"

import { OutputActiveState, OutputActiveSwitchState } from "./shared.js"

export const VirtualCamStatusOutput = OutputActiveState
export type VirtualCamStatusOutput = typeof VirtualCamStatusOutput.Type
export const VirtualCamStatusOutputJsonSchema = JSONSchema.make(VirtualCamStatusOutput)

export const VirtualCamSwitchOutput = OutputActiveSwitchState
export type VirtualCamSwitchOutput = typeof VirtualCamSwitchOutput.Type
export const VirtualCamSwitchOutputJsonSchema = JSONSchema.make(VirtualCamSwitchOutput)
