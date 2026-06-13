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

export const HotkeyListOutput = Schema.Struct({
  hotkeys: Schema.Array(Schema.String)
})
export type HotkeyListOutput = typeof HotkeyListOutput.Type
export const HotkeyListOutputJsonSchema = JSONSchema.make(HotkeyListOutput)

export const TriggerHotkeyByNameInput = Schema.Struct({
  hotkeyName: Schema.NonEmptyString,
  contextName: Schema.optional(Schema.NonEmptyString)
})
export type TriggerHotkeyByNameInput = typeof TriggerHotkeyByNameInput.Type
export const TriggerHotkeyByNameInputJsonSchema = JSONSchema.make(TriggerHotkeyByNameInput)

export const TriggerHotkeyByNameOutput = Schema.Struct({
  hotkeyName: Schema.String,
  contextName: Schema.optional(Schema.String),
  triggered: Schema.Literal(true)
})
export type TriggerHotkeyByNameOutput = typeof TriggerHotkeyByNameOutput.Type
export const TriggerHotkeyByNameOutputJsonSchema = JSONSchema.make(TriggerHotkeyByNameOutput)

export const HotkeyModifiers = Schema.Struct({
  shift: Schema.optional(Schema.Boolean),
  control: Schema.optional(Schema.Boolean),
  alt: Schema.optional(Schema.Boolean),
  command: Schema.optional(Schema.Boolean)
}).pipe(
  Schema.filter((modifiers) => Object.keys(modifiers).length > 0, {
    message: () => "At least one key modifier field is required when keyModifiers is provided"
  })
)
export type HotkeyModifiers = typeof HotkeyModifiers.Type
export const HotkeyModifiersJsonSchema = JSONSchema.make(HotkeyModifiers)

export const TriggerHotkeyByKeySequenceInput = Schema.Struct({
  keyId: Schema.optional(Schema.NonEmptyString),
  keyModifiers: Schema.optional(HotkeyModifiers)
}).pipe(
  Schema.filter((input) => input.keyId !== undefined || input.keyModifiers !== undefined, {
    message: () => "At least one of keyId or keyModifiers is required"
  })
)
export type TriggerHotkeyByKeySequenceInput = typeof TriggerHotkeyByKeySequenceInput.Type
export const TriggerHotkeyByKeySequenceInputJsonSchema = JSONSchema.make(TriggerHotkeyByKeySequenceInput)

export const TriggerHotkeyByKeySequenceOutput = Schema.Struct({
  keyId: Schema.optional(Schema.String),
  keyModifiers: Schema.optional(HotkeyModifiers),
  triggered: Schema.Literal(true)
})
export type TriggerHotkeyByKeySequenceOutput = typeof TriggerHotkeyByKeySequenceOutput.Type
export const TriggerHotkeyByKeySequenceOutputJsonSchema = JSONSchema.make(TriggerHotkeyByKeySequenceOutput)
