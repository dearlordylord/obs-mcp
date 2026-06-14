import { JSONSchema, Schema } from "effect"

import {
  ObsInteger,
  ObsNonEmptyString,
  ObsNonNegativeInteger,
  ObsString,
  OutputActiveState,
  OutputActiveSwitchState,
  outputStatusFields,
  RequestAcknowledgedOutput,
  requireAtLeastOneField
} from "./shared.js"

export const OutputSummary = Schema.Struct({
  outputName: ObsString,
  outputKind: ObsString,
  outputActive: Schema.Boolean
})
export type OutputSummary = typeof OutputSummary.Type

export const ListOutputsOutput = Schema.Struct({
  outputs: Schema.Array(OutputSummary)
})
export type ListOutputsOutput = typeof ListOutputsOutput.Type
export const ListOutputsOutputJsonSchema = JSONSchema.make(ListOutputsOutput)

export const GetOutputStatusInput = Schema.Struct({
  outputName: ObsNonEmptyString
})
export type GetOutputStatusInput = typeof GetOutputStatusInput.Type
export const GetOutputStatusInputJsonSchema = JSONSchema.make(GetOutputStatusInput)

export const OutputStatusResponse = Schema.Struct(outputStatusFields(ObsInteger))
export type OutputStatusResponse = typeof OutputStatusResponse.Type

export const GetOutputStatusOutput = Schema.extend(
  GetOutputStatusInput,
  OutputStatusResponse
)
export type GetOutputStatusOutput = typeof GetOutputStatusOutput.Type
export const GetOutputStatusOutputJsonSchema = JSONSchema.make(GetOutputStatusOutput)

export const OutputLifecycleInput = GetOutputStatusInput
export type OutputLifecycleInput = typeof OutputLifecycleInput.Type
export const OutputLifecycleInputJsonSchema = JSONSchema.make(OutputLifecycleInput)

export const OutputLifecycleOutput = Schema.Struct({
  outputName: ObsString,
  outputActive: Schema.Boolean,
  updated: Schema.Literal(true)
})
export type OutputLifecycleOutput = typeof OutputLifecycleOutput.Type
export const OutputLifecycleOutputJsonSchema = JSONSchema.make(OutputLifecycleOutput)

export const OutputSettings = Schema.Struct({
  path: Schema.optional(ObsNonEmptyString),
  format_name: Schema.optional(ObsNonEmptyString),
  muxer_settings: Schema.optional(ObsString),
  video_encoder: Schema.optional(ObsNonEmptyString),
  audio_encoder: Schema.optional(ObsNonEmptyString),
  replay_buffer: Schema.optional(Schema.Boolean),
  max_time_sec: Schema.optional(ObsNonNegativeInteger),
  max_size_mb: Schema.optional(ObsNonNegativeInteger),
  max_shutdown_time_sec: Schema.optional(ObsNonNegativeInteger)
})
export type OutputSettings = typeof OutputSettings.Type

export const GetOutputSettingsInput = GetOutputStatusInput
export type GetOutputSettingsInput = typeof GetOutputSettingsInput.Type
export const GetOutputSettingsInputJsonSchema = JSONSchema.make(GetOutputSettingsInput)

export const GetOutputSettingsResponse = Schema.Struct({
  outputSettings: OutputSettings
})
export type GetOutputSettingsResponse = typeof GetOutputSettingsResponse.Type

export const GetOutputSettingsOutput = Schema.extend(
  GetOutputSettingsInput,
  GetOutputSettingsResponse
)
export type GetOutputSettingsOutput = typeof GetOutputSettingsOutput.Type
export const GetOutputSettingsOutputJsonSchema = JSONSchema.make(GetOutputSettingsOutput)

const SetOutputSettingsPayload = requireAtLeastOneField(
  OutputSettings,
  "At least one output setting is required"
)

export const SetOutputSettingsInput = Schema.extend(
  GetOutputSettingsInput,
  Schema.Struct({
    outputSettings: SetOutputSettingsPayload
  })
)
export type SetOutputSettingsInput = typeof SetOutputSettingsInput.Type
export const SetOutputSettingsInputJsonSchema = JSONSchema.make(SetOutputSettingsInput)

export const SetOutputSettingsOutput = Schema.Struct({
  outputName: ObsString,
  outputSettings: OutputSettings,
  updated: Schema.Literal(true)
})
export type SetOutputSettingsOutput = typeof SetOutputSettingsOutput.Type
export const SetOutputSettingsOutputJsonSchema = JSONSchema.make(SetOutputSettingsOutput)

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

export const SaveReplayBufferOutput = RequestAcknowledgedOutput("SaveReplayBuffer")
export type SaveReplayBufferOutput = typeof SaveReplayBufferOutput.Type
export const SaveReplayBufferOutputJsonSchema = JSONSchema.make(SaveReplayBufferOutput)

export const LastReplayBufferReplayOutput = Schema.Struct({
  savedReplayPath: ObsString
})
export type LastReplayBufferReplayOutput = typeof LastReplayBufferReplayOutput.Type
export const LastReplayBufferReplayOutputJsonSchema = JSONSchema.make(LastReplayBufferReplayOutput)
