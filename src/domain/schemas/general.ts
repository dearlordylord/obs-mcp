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

export const ObsStatsOutput = Schema.Struct({
  cpuUsage: Schema.Number,
  memoryUsage: Schema.Number,
  availableDiskSpace: Schema.Number,
  activeFps: Schema.Number,
  averageFrameRenderTime: Schema.Number,
  renderSkippedFrames: Schema.Number,
  renderTotalFrames: Schema.Number,
  outputSkippedFrames: Schema.Number,
  outputTotalFrames: Schema.Number,
  webSocketSessionIncomingMessages: Schema.Number,
  webSocketSessionOutgoingMessages: Schema.Number
})

export type ObsStatsOutput = typeof ObsStatsOutput.Type
export const ObsStatsOutputJsonSchema = JSONSchema.make(ObsStatsOutput)

export const RecordStatusOutput = Schema.Struct({
  outputActive: Schema.Boolean,
  outputPaused: Schema.Boolean,
  outputTimecode: Schema.String,
  outputDuration: Schema.Number,
  outputBytes: Schema.Number
})

export type RecordStatusOutput = typeof RecordStatusOutput.Type
export const RecordStatusOutputJsonSchema = JSONSchema.make(RecordStatusOutput)
