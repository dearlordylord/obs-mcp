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

export const ProfileParameterOutput = Schema.Struct({
  parameterValue: Schema.NullOr(Schema.String),
  defaultParameterValue: Schema.NullOr(Schema.String)
})
export type ProfileParameterOutput = typeof ProfileParameterOutput.Type
export const ProfileParameterOutputJsonSchema = JSONSchema.make(ProfileParameterOutput)

export const RecordDirectoryOutput = Schema.Struct({
  recordDirectory: Schema.String
})
export type RecordDirectoryOutput = typeof RecordDirectoryOutput.Type
export const RecordDirectoryOutputJsonSchema = JSONSchema.make(RecordDirectoryOutput)
