import { JSONSchema, Schema } from "effect"

import { ObsNonEmptyString, ObsNumber, ObsString, requireAtLeastOneField, StringArray } from "./shared.js"

export const VersionOutput = Schema.Struct({
  obsVersion: ObsString,
  obsWebSocketVersion: ObsString,
  rpcVersion: ObsNumber,
  negotiatedRpcVersion: ObsNumber,
  availableRequests: StringArray,
  supportedImageFormats: StringArray,
  platform: Schema.optional(ObsString),
  platformDescription: Schema.optional(ObsString)
})

export type VersionOutput = typeof VersionOutput.Type
export const VersionOutputJsonSchema = JSONSchema.make(VersionOutput)
export const VersionResponse = VersionOutput.omit("negotiatedRpcVersion")
export type VersionResponse = typeof VersionResponse.Type

export const ObsStatsOutput = Schema.Struct({
  cpuUsage: ObsNumber,
  memoryUsage: ObsNumber,
  availableDiskSpace: ObsNumber,
  activeFps: ObsNumber,
  averageFrameRenderTime: ObsNumber,
  renderSkippedFrames: ObsNumber,
  renderTotalFrames: ObsNumber,
  outputSkippedFrames: ObsNumber,
  outputTotalFrames: ObsNumber,
  webSocketSessionIncomingMessages: ObsNumber,
  webSocketSessionOutgoingMessages: ObsNumber
})

export type ObsStatsOutput = typeof ObsStatsOutput.Type
export const ObsStatsOutputJsonSchema = JSONSchema.make(ObsStatsOutput)

export const RecordStatusOutput = Schema.Struct({
  outputActive: Schema.Boolean,
  outputPaused: Schema.Boolean,
  outputTimecode: ObsString,
  outputDuration: ObsNumber,
  outputBytes: ObsNumber
})

export type RecordStatusOutput = typeof RecordStatusOutput.Type
export const RecordStatusOutputJsonSchema = JSONSchema.make(RecordStatusOutput)

export const HotkeyListOutput = Schema.Struct({
  hotkeys: Schema.Array(ObsString)
})
export type HotkeyListOutput = typeof HotkeyListOutput.Type
export const HotkeyListOutputJsonSchema = JSONSchema.make(HotkeyListOutput)

export const TriggerHotkeyByNameInput = Schema.Struct({
  hotkeyName: ObsNonEmptyString,
  contextName: Schema.optional(ObsNonEmptyString)
})
export type TriggerHotkeyByNameInput = typeof TriggerHotkeyByNameInput.Type
export const TriggerHotkeyByNameInputJsonSchema = JSONSchema.make(TriggerHotkeyByNameInput)

export const TriggerHotkeyByNameOutput = Schema.Struct({
  hotkeyName: ObsString,
  contextName: Schema.optional(ObsString),
  triggered: Schema.Literal(true)
})
export type TriggerHotkeyByNameOutput = typeof TriggerHotkeyByNameOutput.Type
export const TriggerHotkeyByNameOutputJsonSchema = JSONSchema.make(TriggerHotkeyByNameOutput)

export const HotkeyModifiers = requireAtLeastOneField(
  Schema.Struct({
    shift: Schema.optional(Schema.Boolean),
    control: Schema.optional(Schema.Boolean),
    alt: Schema.optional(Schema.Boolean),
    command: Schema.optional(Schema.Boolean)
  }),
  "At least one key modifier field is required when keyModifiers is provided"
)
export type HotkeyModifiers = typeof HotkeyModifiers.Type
export const HotkeyModifiersJsonSchema = JSONSchema.make(HotkeyModifiers)

export const TriggerHotkeyByKeySequenceInput = Schema.Struct({
  keyId: Schema.optional(ObsNonEmptyString),
  keyModifiers: Schema.optional(HotkeyModifiers)
}).pipe(
  Schema.filter((input) => input.keyId !== undefined || input.keyModifiers !== undefined, {
    message: () => "At least one of keyId or keyModifiers is required"
  })
)
export type TriggerHotkeyByKeySequenceInput = typeof TriggerHotkeyByKeySequenceInput.Type
export const TriggerHotkeyByKeySequenceInputJsonSchema = JSONSchema.make(TriggerHotkeyByKeySequenceInput)

export const TriggerHotkeyByKeySequenceOutput = Schema.Struct({
  keyId: Schema.optional(ObsString),
  keyModifiers: Schema.optional(HotkeyModifiers),
  triggered: Schema.Literal(true)
})
export type TriggerHotkeyByKeySequenceOutput = typeof TriggerHotkeyByKeySequenceOutput.Type
export const TriggerHotkeyByKeySequenceOutputJsonSchema = JSONSchema.make(TriggerHotkeyByKeySequenceOutput)
