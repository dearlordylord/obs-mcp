import { JSONSchema, Schema } from "effect"

export const InputLocatorInput = Schema.Struct({
  inputName: Schema.optional(Schema.NonEmptyString),
  inputUuid: Schema.optional(Schema.NonEmptyString)
}).pipe(
  Schema.filter((input) => (input.inputName === undefined) !== (input.inputUuid === undefined), {
    message: () => "Exactly one of inputName or inputUuid is required"
  })
)
export type InputLocatorInput = typeof InputLocatorInput.Type
export const InputLocatorInputJsonSchema = JSONSchema.make(InputLocatorInput)

export const SetInputMuteInput = Schema.extend(
  InputLocatorInput,
  Schema.Struct({
    inputMuted: Schema.Boolean
  })
)
export type SetInputMuteInput = typeof SetInputMuteInput.Type
export const SetInputMuteInputJsonSchema = JSONSchema.make(SetInputMuteInput)

export const InputMuteOutput = Schema.Struct({
  inputMuted: Schema.Boolean
})
export type InputMuteOutput = typeof InputMuteOutput.Type
export const InputMuteOutputJsonSchema = JSONSchema.make(InputMuteOutput)

export const InputVolumeMul = Schema.Number.pipe(Schema.greaterThanOrEqualTo(0), Schema.lessThanOrEqualTo(20))
export const InputVolumeDb = Schema.Number.pipe(Schema.greaterThanOrEqualTo(-100), Schema.lessThanOrEqualTo(26))

export const SetInputVolumeInput = Schema.extend(
  InputLocatorInput,
  Schema.Struct({
    inputVolumeMul: Schema.optional(InputVolumeMul),
    inputVolumeDb: Schema.optional(InputVolumeDb)
  })
).pipe(
  Schema.filter((input) => (input.inputVolumeMul === undefined) !== (input.inputVolumeDb === undefined), {
    message: () => "Exactly one of inputVolumeMul or inputVolumeDb is required"
  })
)
export type SetInputVolumeInput = typeof SetInputVolumeInput.Type
export const SetInputVolumeInputJsonSchema = JSONSchema.make(SetInputVolumeInput)

export const InputVolumeOutput = Schema.Struct({
  inputVolumeMul: Schema.Number,
  inputVolumeDb: Schema.Number
})
export type InputVolumeOutput = typeof InputVolumeOutput.Type
export const InputVolumeOutputJsonSchema = JSONSchema.make(InputVolumeOutput)

export const SetInputVolumeOutput = Schema.Struct({
  inputVolumeMul: Schema.optional(InputVolumeMul),
  inputVolumeDb: Schema.optional(InputVolumeDb),
  acknowledged: Schema.Literal(true)
}).pipe(
  Schema.filter((output) => (output.inputVolumeMul === undefined) !== (output.inputVolumeDb === undefined), {
    message: () => "Exactly one of inputVolumeMul or inputVolumeDb is required"
  })
)
export type SetInputVolumeOutput = typeof SetInputVolumeOutput.Type
export const SetInputVolumeOutputJsonSchema = JSONSchema.make(SetInputVolumeOutput)

export const InputAudioBalance = Schema.Number.pipe(Schema.greaterThanOrEqualTo(0), Schema.lessThanOrEqualTo(1))

export const SetInputAudioBalanceInput = Schema.extend(
  InputLocatorInput,
  Schema.Struct({
    inputAudioBalance: InputAudioBalance
  })
)
export type SetInputAudioBalanceInput = typeof SetInputAudioBalanceInput.Type
export const SetInputAudioBalanceInputJsonSchema = JSONSchema.make(SetInputAudioBalanceInput)

export const InputAudioBalanceOutput = Schema.Struct({
  inputAudioBalance: InputAudioBalance
})
export type InputAudioBalanceOutput = typeof InputAudioBalanceOutput.Type
export const InputAudioBalanceOutputJsonSchema = JSONSchema.make(InputAudioBalanceOutput)

export const SetInputAudioBalanceOutput = Schema.Struct({
  inputAudioBalance: InputAudioBalance,
  acknowledged: Schema.Literal(true)
})
export type SetInputAudioBalanceOutput = typeof SetInputAudioBalanceOutput.Type
export const SetInputAudioBalanceOutputJsonSchema = JSONSchema.make(SetInputAudioBalanceOutput)

export const InputAudioMonitorType = Schema.Literal(
  "OBS_MONITORING_TYPE_NONE",
  "OBS_MONITORING_TYPE_MONITOR_ONLY",
  "OBS_MONITORING_TYPE_MONITOR_AND_OUTPUT"
)
export type InputAudioMonitorType = typeof InputAudioMonitorType.Type

export const SetInputAudioMonitorTypeInput = Schema.extend(
  InputLocatorInput,
  Schema.Struct({
    monitorType: InputAudioMonitorType
  })
)
export type SetInputAudioMonitorTypeInput = typeof SetInputAudioMonitorTypeInput.Type
export const SetInputAudioMonitorTypeInputJsonSchema = JSONSchema.make(SetInputAudioMonitorTypeInput)

export const InputAudioMonitorTypeOutput = Schema.Struct({
  monitorType: InputAudioMonitorType
})
export type InputAudioMonitorTypeOutput = typeof InputAudioMonitorTypeOutput.Type
export const InputAudioMonitorTypeOutputJsonSchema = JSONSchema.make(InputAudioMonitorTypeOutput)

export const SetInputAudioMonitorTypeOutput = Schema.Struct({
  monitorType: InputAudioMonitorType,
  acknowledged: Schema.Literal(true)
})
export type SetInputAudioMonitorTypeOutput = typeof SetInputAudioMonitorTypeOutput.Type
export const SetInputAudioMonitorTypeOutputJsonSchema = JSONSchema.make(SetInputAudioMonitorTypeOutput)

export const InputAudioSyncOffset = Schema.Number.pipe(
  Schema.int(),
  Schema.greaterThanOrEqualTo(-950),
  Schema.lessThanOrEqualTo(20000)
)

export const SetInputAudioSyncOffsetInput = Schema.extend(
  InputLocatorInput,
  Schema.Struct({
    inputAudioSyncOffset: InputAudioSyncOffset
  })
)
export type SetInputAudioSyncOffsetInput = typeof SetInputAudioSyncOffsetInput.Type
export const SetInputAudioSyncOffsetInputJsonSchema = JSONSchema.make(SetInputAudioSyncOffsetInput)

export const InputAudioSyncOffsetOutput = Schema.Struct({
  inputAudioSyncOffset: InputAudioSyncOffset
})
export type InputAudioSyncOffsetOutput = typeof InputAudioSyncOffsetOutput.Type
export const InputAudioSyncOffsetOutputJsonSchema = JSONSchema.make(InputAudioSyncOffsetOutput)

export const SetInputAudioSyncOffsetOutput = Schema.Struct({
  inputAudioSyncOffset: InputAudioSyncOffset,
  acknowledged: Schema.Literal(true)
})
export type SetInputAudioSyncOffsetOutput = typeof SetInputAudioSyncOffsetOutput.Type
export const SetInputAudioSyncOffsetOutputJsonSchema = JSONSchema.make(SetInputAudioSyncOffsetOutput)

export const ListInputsInput = Schema.Struct({
  inputKind: Schema.optional(Schema.NonEmptyString)
})
export type ListInputsInput = typeof ListInputsInput.Type
export const ListInputsInputJsonSchema = JSONSchema.make(ListInputsInput)

export const InputSummary = Schema.Struct({
  inputName: Schema.String,
  inputUuid: Schema.optional(Schema.String),
  inputKind: Schema.String,
  unversionedInputKind: Schema.String
})
export type InputSummary = typeof InputSummary.Type

export const ListInputsOutput = Schema.Struct({
  inputs: Schema.Array(InputSummary)
})
export type ListInputsOutput = typeof ListInputsOutput.Type
export const ListInputsOutputJsonSchema = JSONSchema.make(ListInputsOutput)

export const ListInputKindsInput = Schema.Struct({
  unversioned: Schema.optionalWith(Schema.Boolean, { default: () => false })
})
export type ListInputKindsInput = typeof ListInputKindsInput.Type
export const ListInputKindsInputJsonSchema = JSONSchema.make(ListInputKindsInput)

export const ListInputKindsOutput = Schema.Struct({
  inputKinds: Schema.Array(Schema.String)
})
export type ListInputKindsOutput = typeof ListInputKindsOutput.Type
export const ListInputKindsOutputJsonSchema = JSONSchema.make(ListInputKindsOutput)

export const SpecialInputsOutput = Schema.Struct({
  desktop1: Schema.NullOr(Schema.String),
  desktop2: Schema.NullOr(Schema.String),
  mic1: Schema.NullOr(Schema.String),
  mic2: Schema.NullOr(Schema.String),
  mic3: Schema.NullOr(Schema.String),
  mic4: Schema.NullOr(Schema.String)
})
export type SpecialInputsOutput = typeof SpecialInputsOutput.Type
export const SpecialInputsOutputJsonSchema = JSONSchema.make(SpecialInputsOutput)
