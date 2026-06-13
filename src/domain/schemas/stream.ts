import { JSONSchema, Schema } from "effect"

import { OutputActiveState } from "./shared.js"

export const StreamStatusOutput = Schema.Struct({
  outputActive: Schema.Boolean,
  outputReconnecting: Schema.Boolean,
  outputTimecode: Schema.String,
  outputDuration: Schema.Number,
  outputCongestion: Schema.Number,
  outputBytes: Schema.Number,
  outputSkippedFrames: Schema.Number,
  outputTotalFrames: Schema.Number
})
export type StreamStatusOutput = typeof StreamStatusOutput.Type
export const StreamStatusOutputJsonSchema = JSONSchema.make(StreamStatusOutput)

export const StartStreamOutput = OutputActiveState
export type StartStreamOutput = typeof StartStreamOutput.Type
export const StartStreamOutputJsonSchema = JSONSchema.make(StartStreamOutput)

export const StopStreamOutput = OutputActiveState
export type StopStreamOutput = typeof StopStreamOutput.Type
export const StopStreamOutputJsonSchema = JSONSchema.make(StopStreamOutput)

export const ToggleStreamOutput = OutputActiveState
export type ToggleStreamOutput = typeof ToggleStreamOutput.Type
export const ToggleStreamOutputJsonSchema = JSONSchema.make(ToggleStreamOutput)
