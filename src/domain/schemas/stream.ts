import { JSONSchema, Schema } from "effect"

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

export const StartStreamOutput = Schema.Struct({
  outputActive: Schema.Boolean
})
export type StartStreamOutput = typeof StartStreamOutput.Type
export const StartStreamOutputJsonSchema = JSONSchema.make(StartStreamOutput)

export const StopStreamOutput = Schema.Struct({
  outputActive: Schema.Boolean
})
export type StopStreamOutput = typeof StopStreamOutput.Type
export const StopStreamOutputJsonSchema = JSONSchema.make(StopStreamOutput)

export const ToggleStreamOutput = Schema.Struct({
  outputActive: Schema.Boolean
})
export type ToggleStreamOutput = typeof ToggleStreamOutput.Type
export const ToggleStreamOutputJsonSchema = JSONSchema.make(ToggleStreamOutput)
