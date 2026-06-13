import { JSONSchema, Schema } from "effect"

import { ObsNonEmptyString, ObsNumber, ObsPositiveInteger, ObsString } from "./shared.js"

export const ProfileName = ObsNonEmptyString
export type ProfileName = typeof ProfileName.Type

export const SceneCollectionName = ObsNonEmptyString
export type SceneCollectionName = typeof SceneCollectionName.Type

export const ProfileListOutput = Schema.Struct({
  currentProfileName: ProfileName,
  profiles: Schema.Array(ProfileName)
})
export type ProfileListOutput = typeof ProfileListOutput.Type
export const ProfileListOutputJsonSchema = JSONSchema.make(ProfileListOutput)

export const SceneCollectionListOutput = Schema.Struct({
  currentSceneCollectionName: SceneCollectionName,
  sceneCollections: Schema.Array(SceneCollectionName)
})
export type SceneCollectionListOutput = typeof SceneCollectionListOutput.Type
export const SceneCollectionListOutputJsonSchema = JSONSchema.make(SceneCollectionListOutput)

export const ProfileParameterInput = Schema.Struct({
  parameterCategory: ObsNonEmptyString,
  parameterName: ObsNonEmptyString
})
export type ProfileParameterInput = typeof ProfileParameterInput.Type
export const ProfileParameterInputJsonSchema = JSONSchema.make(ProfileParameterInput)

export const SetProfileParameterInput = Schema.Struct({
  parameterCategory: ObsNonEmptyString,
  parameterName: ObsNonEmptyString,
  parameterValue: Schema.NullOr(ObsString)
})
export type SetProfileParameterInput = typeof SetProfileParameterInput.Type
export const SetProfileParameterInputJsonSchema = JSONSchema.make(SetProfileParameterInput)

export const ProfileParameterOutput = Schema.Struct({
  parameterValue: Schema.NullOr(ObsString),
  defaultParameterValue: Schema.NullOr(ObsString)
})
export type ProfileParameterOutput = typeof ProfileParameterOutput.Type
export const ProfileParameterOutputJsonSchema = JSONSchema.make(ProfileParameterOutput)

export const SetProfileParameterOutput = Schema.Struct({
  parameterCategory: ObsString,
  parameterName: ObsString,
  parameterValue: Schema.NullOr(ObsString),
  acknowledged: Schema.Literal(true)
})
export type SetProfileParameterOutput = typeof SetProfileParameterOutput.Type
export const SetProfileParameterOutputJsonSchema = JSONSchema.make(SetProfileParameterOutput)

export const RecordDirectoryOutput = Schema.Struct({
  recordDirectory: ObsString
})
export type RecordDirectoryOutput = typeof RecordDirectoryOutput.Type
export const RecordDirectoryOutputJsonSchema = JSONSchema.make(RecordDirectoryOutput)

export const SetRecordDirectoryInput = Schema.Struct({
  recordDirectory: ObsString
})
export type SetRecordDirectoryInput = typeof SetRecordDirectoryInput.Type
export const SetRecordDirectoryInputJsonSchema = JSONSchema.make(SetRecordDirectoryInput)

export const SetRecordDirectoryOutput = Schema.Struct({
  recordDirectory: ObsString,
  acknowledged: Schema.Literal(true)
})
export type SetRecordDirectoryOutput = typeof SetRecordDirectoryOutput.Type
export const SetRecordDirectoryOutputJsonSchema = JSONSchema.make(SetRecordDirectoryOutput)

const MaxVideoDimension = 4096
// OBS video dimensions are bounded structural pixel counts, not branded canvas identities.
const VideoDimension = ObsNumber.pipe(Schema.int(), Schema.positive(), Schema.lessThanOrEqualTo(MaxVideoDimension))
const VideoFpsInteger = ObsPositiveInteger

export const VideoSettingsOutput = Schema.Struct({
  baseWidth: VideoDimension,
  baseHeight: VideoDimension,
  outputWidth: VideoDimension,
  outputHeight: VideoDimension,
  fpsNumerator: VideoFpsInteger,
  fpsDenominator: VideoFpsInteger
})
export type VideoSettingsOutput = typeof VideoSettingsOutput.Type
export const VideoSettingsOutputJsonSchema = JSONSchema.make(VideoSettingsOutput)

const hasMatchingOptionalPair = <A>(
  input: A,
  firstField: keyof A,
  secondField: keyof A
): boolean => (input[firstField] === undefined) === (input[secondField] === undefined)

const SetVideoSettingsFields = Schema.Struct({
  baseWidth: Schema.optional(VideoDimension),
  baseHeight: Schema.optional(VideoDimension),
  outputWidth: Schema.optional(VideoDimension),
  outputHeight: Schema.optional(VideoDimension),
  fpsNumerator: Schema.optional(VideoFpsInteger),
  fpsDenominator: Schema.optional(VideoFpsInteger)
})

type PairedVideoSettings = {
  readonly baseWidth?: number | undefined
  readonly baseHeight?: number | undefined
  readonly outputWidth?: number | undefined
  readonly outputHeight?: number | undefined
  readonly fpsNumerator?: number | undefined
  readonly fpsDenominator?: number | undefined
}

const pairedVideoSettingFilters = <A extends PairedVideoSettings, I, R>(
  schema: Schema.Schema<A, I, R>
): Schema.Schema<A, I, R> =>
  schema.pipe(
    Schema.filter((input) => hasMatchingOptionalPair(input, "baseWidth", "baseHeight"), {
      message: () => "baseWidth and baseHeight must be provided together"
    }),
    Schema.filter((input) => hasMatchingOptionalPair(input, "outputWidth", "outputHeight"), {
      message: () => "outputWidth and outputHeight must be provided together"
    }),
    Schema.filter((input) => hasMatchingOptionalPair(input, "fpsNumerator", "fpsDenominator"), {
      message: () => "fpsNumerator and fpsDenominator must be provided together"
    })
  )

export const SetVideoSettingsInput = pairedVideoSettingFilters(SetVideoSettingsFields)
export type SetVideoSettingsInput = typeof SetVideoSettingsInput.Type
export const SetVideoSettingsInputJsonSchema = JSONSchema.make(SetVideoSettingsInput)

export const SetVideoSettingsOutput = pairedVideoSettingFilters(Schema.extend(
  SetVideoSettingsFields,
  Schema.Struct({
    acknowledged: Schema.Literal(true)
  })
))
export type SetVideoSettingsOutput = typeof SetVideoSettingsOutput.Type
export const SetVideoSettingsOutputJsonSchema = JSONSchema.make(SetVideoSettingsOutput)

export const StreamServiceSettingValue = Schema.Union(ObsString, ObsNumber, Schema.Boolean, Schema.Null)
export type StreamServiceSettingValue = typeof StreamServiceSettingValue.Type

export const StreamServiceSettingsRecord = Schema.Record({
  key: ObsString,
  value: StreamServiceSettingValue
})
export type StreamServiceSettingsRecord = typeof StreamServiceSettingsRecord.Type

export const ObsStreamServiceSettingsResponse = Schema.Struct({
  streamServiceType: ObsNonEmptyString,
  streamServiceSettings: StreamServiceSettingsRecord
})
export type ObsStreamServiceSettingsResponse = typeof ObsStreamServiceSettingsResponse.Type

export const ObsSetStreamServiceSettingsInput = ObsStreamServiceSettingsResponse
export type ObsSetStreamServiceSettingsInput = typeof ObsSetStreamServiceSettingsInput.Type

export const RtmpCustomStreamServiceSettingsInput = Schema.Struct({
  server: ObsNonEmptyString,
  key: ObsNonEmptyString
})
export type RtmpCustomStreamServiceSettingsInput = typeof RtmpCustomStreamServiceSettingsInput.Type

export const GenericStreamServiceSettingsInput = Schema.Struct({
  fields: StreamServiceSettingsRecord
})
export type GenericStreamServiceSettingsInput = typeof GenericStreamServiceSettingsInput.Type

export const SetStreamServiceSettingsInput = Schema.Struct({
  streamServiceType: ObsNonEmptyString,
  streamServiceSettings: Schema.Union(RtmpCustomStreamServiceSettingsInput, GenericStreamServiceSettingsInput)
}).pipe(
  Schema.filter((input) =>
    input.streamServiceType === "rtmp_custom"
      ? "server" in input.streamServiceSettings
      : "fields" in input.streamServiceSettings, {
    message: () => "rtmp_custom requires server/key settings; other stream services require typed fields"
  })
)
export type SetStreamServiceSettingsInput = typeof SetStreamServiceSettingsInput.Type
export const SetStreamServiceSettingsInputJsonSchema = JSONSchema.make(SetStreamServiceSettingsInput)

export const RtmpCustomStreamServiceSettingsOutput = Schema.Struct({
  server: Schema.optional(ObsString),
  keyConfigured: Schema.Boolean
})
export type RtmpCustomStreamServiceSettingsOutput = typeof RtmpCustomStreamServiceSettingsOutput.Type

export const GenericStreamServiceSettingsOutput = Schema.Struct({
  fields: StreamServiceSettingsRecord
})
export type GenericStreamServiceSettingsOutput = typeof GenericStreamServiceSettingsOutput.Type

export const StreamServiceSettingsOutput = Schema.Struct({
  streamServiceType: ObsNonEmptyString,
  streamServiceSettings: Schema.Union(RtmpCustomStreamServiceSettingsOutput, GenericStreamServiceSettingsOutput)
})
export type StreamServiceSettingsOutput = typeof StreamServiceSettingsOutput.Type
export const StreamServiceSettingsOutputJsonSchema = JSONSchema.make(StreamServiceSettingsOutput)

export const SetStreamServiceSettingsOutput = Schema.extend(
  StreamServiceSettingsOutput,
  Schema.Struct({
    acknowledged: Schema.Literal(true)
  })
)
export type SetStreamServiceSettingsOutput = typeof SetStreamServiceSettingsOutput.Type
export const SetStreamServiceSettingsOutputJsonSchema = JSONSchema.make(SetStreamServiceSettingsOutput)

export const ProfileNameInput = Schema.Struct({
  profileName: ProfileName
})
export type ProfileNameInput = typeof ProfileNameInput.Type
export const ProfileNameInputJsonSchema = JSONSchema.make(ProfileNameInput)

export const SetCurrentProfileOutput = Schema.Struct({
  profileName: ObsString,
  switched: Schema.Literal(true)
})
export type SetCurrentProfileOutput = typeof SetCurrentProfileOutput.Type
export const SetCurrentProfileOutputJsonSchema = JSONSchema.make(SetCurrentProfileOutput)

export const CreateProfileOutput = Schema.Struct({
  profileName: ObsString,
  created: Schema.Literal(true),
  switched: Schema.Literal(true)
})
export type CreateProfileOutput = typeof CreateProfileOutput.Type
export const CreateProfileOutputJsonSchema = JSONSchema.make(CreateProfileOutput)

export const RemoveProfileOutput = Schema.Struct({
  profileName: ObsString,
  removed: Schema.Literal(true)
})
export type RemoveProfileOutput = typeof RemoveProfileOutput.Type
export const RemoveProfileOutputJsonSchema = JSONSchema.make(RemoveProfileOutput)

export const SceneCollectionNameInput = Schema.Struct({
  sceneCollectionName: SceneCollectionName
})
export type SceneCollectionNameInput = typeof SceneCollectionNameInput.Type
export const SceneCollectionNameInputJsonSchema = JSONSchema.make(SceneCollectionNameInput)

export const SetCurrentSceneCollectionOutput = Schema.Struct({
  sceneCollectionName: ObsString,
  switched: Schema.Literal(true)
})
export type SetCurrentSceneCollectionOutput = typeof SetCurrentSceneCollectionOutput.Type
export const SetCurrentSceneCollectionOutputJsonSchema = JSONSchema.make(SetCurrentSceneCollectionOutput)

export const CreateSceneCollectionOutput = Schema.Struct({
  sceneCollectionName: ObsString,
  created: Schema.Literal(true),
  switched: Schema.Literal(true)
})
export type CreateSceneCollectionOutput = typeof CreateSceneCollectionOutput.Type
export const CreateSceneCollectionOutputJsonSchema = JSONSchema.make(CreateSceneCollectionOutput)
