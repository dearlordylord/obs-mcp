import { JSONSchema, Schema } from "effect"

import { OutputActiveState, OutputActiveSwitchState } from "./shared.js"

export const OutputSummary = Schema.Struct({
  outputName: Schema.String,
  outputKind: Schema.String,
  outputActive: Schema.Boolean
})
export type OutputSummary = typeof OutputSummary.Type

export const ListOutputsOutput = Schema.Struct({
  outputs: Schema.Array(OutputSummary)
})
export type ListOutputsOutput = typeof ListOutputsOutput.Type
export const ListOutputsOutputJsonSchema = JSONSchema.make(ListOutputsOutput)

export const GetOutputStatusInput = Schema.Struct({
  outputName: Schema.NonEmptyString
})
export type GetOutputStatusInput = typeof GetOutputStatusInput.Type
export const GetOutputStatusInputJsonSchema = JSONSchema.make(GetOutputStatusInput)

export const OutputStatusResponse = Schema.Struct({
  outputActive: Schema.Boolean,
  outputReconnecting: Schema.Boolean,
  outputTimecode: Schema.String,
  outputDuration: Schema.Number,
  outputCongestion: Schema.Number,
  outputBytes: Schema.Number,
  outputSkippedFrames: Schema.Number.pipe(Schema.int()),
  outputTotalFrames: Schema.Number.pipe(Schema.int())
})
export type OutputStatusResponse = typeof OutputStatusResponse.Type

export const GetOutputStatusOutput = Schema.extend(
  GetOutputStatusInput,
  OutputStatusResponse
)
export type GetOutputStatusOutput = typeof GetOutputStatusOutput.Type
export const GetOutputStatusOutputJsonSchema = JSONSchema.make(GetOutputStatusOutput)

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
