import { JSONSchema, Schema } from "effect"

import { OutputActiveState, OutputActiveSwitchState } from "./shared.js"

export const VirtualCamStatusOutput = OutputActiveState
export type VirtualCamStatusOutput = typeof VirtualCamStatusOutput.Type
export const VirtualCamStatusOutputJsonSchema = JSONSchema.make(VirtualCamStatusOutput)

export const VirtualCamSwitchOutput = OutputActiveSwitchState
export type VirtualCamSwitchOutput = typeof VirtualCamSwitchOutput.Type
export const VirtualCamSwitchOutputJsonSchema = JSONSchema.make(VirtualCamSwitchOutput)

export const ReplayBufferStatusOutput = OutputActiveState
export type ReplayBufferStatusOutput = typeof ReplayBufferStatusOutput.Type
export const ReplayBufferStatusOutputJsonSchema = JSONSchema.make(ReplayBufferStatusOutput)

export const ReplayBufferSwitchOutput = OutputActiveState
export type ReplayBufferSwitchOutput = typeof ReplayBufferSwitchOutput.Type
export const ReplayBufferSwitchOutputJsonSchema = JSONSchema.make(ReplayBufferSwitchOutput)

export const SaveReplayBufferOutput = Schema.Struct({
  requestType: Schema.Literal("SaveReplayBuffer"),
  acknowledged: Schema.Literal(true)
})
export type SaveReplayBufferOutput = typeof SaveReplayBufferOutput.Type
export const SaveReplayBufferOutputJsonSchema = JSONSchema.make(SaveReplayBufferOutput)

export const LastReplayBufferReplayOutput = Schema.Struct({
  savedReplayPath: Schema.String
})
export type LastReplayBufferReplayOutput = typeof LastReplayBufferReplayOutput.Type
export const LastReplayBufferReplayOutputJsonSchema = JSONSchema.make(LastReplayBufferReplayOutput)
