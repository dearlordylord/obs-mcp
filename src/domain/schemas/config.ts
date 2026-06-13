import { JSONSchema, Schema } from "effect"

export const ProfileName = Schema.NonEmptyString
export type ProfileName = typeof ProfileName.Type

export const SceneCollectionName = Schema.NonEmptyString
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
  parameterCategory: Schema.NonEmptyString,
  parameterName: Schema.NonEmptyString
})
export type ProfileParameterInput = typeof ProfileParameterInput.Type
export const ProfileParameterInputJsonSchema = JSONSchema.make(ProfileParameterInput)

export const SetProfileParameterInput = Schema.Struct({
  parameterCategory: Schema.NonEmptyString,
  parameterName: Schema.NonEmptyString,
  parameterValue: Schema.NullOr(Schema.String)
})
export type SetProfileParameterInput = typeof SetProfileParameterInput.Type
export const SetProfileParameterInputJsonSchema = JSONSchema.make(SetProfileParameterInput)

export const ProfileParameterOutput = Schema.Struct({
  parameterValue: Schema.NullOr(Schema.String),
  defaultParameterValue: Schema.NullOr(Schema.String)
})
export type ProfileParameterOutput = typeof ProfileParameterOutput.Type
export const ProfileParameterOutputJsonSchema = JSONSchema.make(ProfileParameterOutput)

export const SetProfileParameterOutput = Schema.Struct({
  parameterCategory: Schema.String,
  parameterName: Schema.String,
  parameterValue: Schema.NullOr(Schema.String),
  acknowledged: Schema.Literal(true)
})
export type SetProfileParameterOutput = typeof SetProfileParameterOutput.Type
export const SetProfileParameterOutputJsonSchema = JSONSchema.make(SetProfileParameterOutput)

export const RecordDirectoryOutput = Schema.Struct({
  recordDirectory: Schema.String
})
export type RecordDirectoryOutput = typeof RecordDirectoryOutput.Type
export const RecordDirectoryOutputJsonSchema = JSONSchema.make(RecordDirectoryOutput)

export const SetRecordDirectoryInput = Schema.Struct({
  recordDirectory: Schema.String
})
export type SetRecordDirectoryInput = typeof SetRecordDirectoryInput.Type
export const SetRecordDirectoryInputJsonSchema = JSONSchema.make(SetRecordDirectoryInput)

export const SetRecordDirectoryOutput = Schema.Struct({
  recordDirectory: Schema.String,
  acknowledged: Schema.Literal(true)
})
export type SetRecordDirectoryOutput = typeof SetRecordDirectoryOutput.Type
export const SetRecordDirectoryOutputJsonSchema = JSONSchema.make(SetRecordDirectoryOutput)

const VideoSettingInteger = Schema.Number.pipe(Schema.int(), Schema.positive())

export const VideoSettingsOutput = Schema.Struct({
  baseWidth: VideoSettingInteger,
  baseHeight: VideoSettingInteger,
  outputWidth: VideoSettingInteger,
  outputHeight: VideoSettingInteger,
  fpsNumerator: VideoSettingInteger,
  fpsDenominator: VideoSettingInteger
})
export type VideoSettingsOutput = typeof VideoSettingsOutput.Type
export const VideoSettingsOutputJsonSchema = JSONSchema.make(VideoSettingsOutput)

const hasMatchingOptionalPair = <A>(
  input: A,
  firstField: keyof A,
  secondField: keyof A
): boolean => (input[firstField] === undefined) === (input[secondField] === undefined)

const SetVideoSettingsFields = Schema.Struct({
  baseWidth: Schema.optional(VideoSettingInteger),
  baseHeight: Schema.optional(VideoSettingInteger),
  outputWidth: Schema.optional(VideoSettingInteger),
  outputHeight: Schema.optional(VideoSettingInteger),
  fpsNumerator: Schema.optional(VideoSettingInteger),
  fpsDenominator: Schema.optional(VideoSettingInteger)
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

export const ProfileNameInput = Schema.Struct({
  profileName: ProfileName
})
export type ProfileNameInput = typeof ProfileNameInput.Type
export const ProfileNameInputJsonSchema = JSONSchema.make(ProfileNameInput)

export const SetCurrentProfileOutput = Schema.Struct({
  profileName: Schema.String,
  switched: Schema.Literal(true)
})
export type SetCurrentProfileOutput = typeof SetCurrentProfileOutput.Type
export const SetCurrentProfileOutputJsonSchema = JSONSchema.make(SetCurrentProfileOutput)

export const CreateProfileOutput = Schema.Struct({
  profileName: Schema.String,
  created: Schema.Literal(true),
  switched: Schema.Literal(true)
})
export type CreateProfileOutput = typeof CreateProfileOutput.Type
export const CreateProfileOutputJsonSchema = JSONSchema.make(CreateProfileOutput)

export const RemoveProfileOutput = Schema.Struct({
  profileName: Schema.String,
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
  sceneCollectionName: Schema.String,
  switched: Schema.Literal(true)
})
export type SetCurrentSceneCollectionOutput = typeof SetCurrentSceneCollectionOutput.Type
export const SetCurrentSceneCollectionOutputJsonSchema = JSONSchema.make(SetCurrentSceneCollectionOutput)

export const CreateSceneCollectionOutput = Schema.Struct({
  sceneCollectionName: Schema.String,
  created: Schema.Literal(true),
  switched: Schema.Literal(true)
})
export type CreateSceneCollectionOutput = typeof CreateSceneCollectionOutput.Type
export const CreateSceneCollectionOutputJsonSchema = JSONSchema.make(CreateSceneCollectionOutput)
