import { Schema } from "effect"

import {
  CreateProfileOutput,
  CreateSceneCollectionOutput,
  ProfileListOutput,
  ProfileNameInput,
  ProfileParameterInput,
  ProfileParameterOutput,
  RecordDirectoryOutput,
  RemoveProfileOutput,
  SceneCollectionListOutput,
  SceneCollectionNameInput,
  SetCurrentProfileOutput,
  SetCurrentSceneCollectionOutput,
  SetProfileParameterInput,
  SetProfileParameterOutput
} from "../../domain/schemas/config.js"
import type { ObsClient } from "../client.js"
import {
  CreateProfile,
  CreateSceneCollection,
  GetProfileList,
  GetProfileParameter,
  GetRecordDirectory,
  GetSceneCollectionList,
  RemoveProfile,
  SetCurrentProfile,
  SetCurrentSceneCollection,
  SetProfileParameter
} from "../requests.js"

export const listProfiles = async (client: ObsClient): Promise<ProfileListOutput> =>
  Schema.decodeUnknownSync(ProfileListOutput)(await client.request(GetProfileList))

export const listSceneCollections = async (client: ObsClient): Promise<SceneCollectionListOutput> =>
  Schema.decodeUnknownSync(SceneCollectionListOutput)(await client.request(GetSceneCollectionList))

export const getProfileParameter = async (
  client: ObsClient,
  input: ProfileParameterInput
): Promise<ProfileParameterOutput> => {
  const decodedInput = Schema.decodeUnknownSync(ProfileParameterInput)(input)
  return Schema.decodeUnknownSync(ProfileParameterOutput)(await client.request(GetProfileParameter, decodedInput))
}

export const getRecordDirectory = async (client: ObsClient): Promise<RecordDirectoryOutput> =>
  Schema.decodeUnknownSync(RecordDirectoryOutput)(await client.request(GetRecordDirectory))

export const setCurrentProfile = async (
  client: ObsClient,
  input: ProfileNameInput
): Promise<SetCurrentProfileOutput> => {
  const decodedInput = Schema.decodeUnknownSync(ProfileNameInput)(input)
  await client.request(SetCurrentProfile, decodedInput)
  return Schema.decodeUnknownSync(SetCurrentProfileOutput)({
    profileName: decodedInput.profileName,
    switched: true
  })
}

export const createProfile = async (
  client: ObsClient,
  input: ProfileNameInput
): Promise<CreateProfileOutput> => {
  const decodedInput = Schema.decodeUnknownSync(ProfileNameInput)(input)
  await client.request(CreateProfile, decodedInput)
  return Schema.decodeUnknownSync(CreateProfileOutput)({
    profileName: decodedInput.profileName,
    created: true,
    switched: true
  })
}

export const removeProfile = async (
  client: ObsClient,
  input: ProfileNameInput
): Promise<RemoveProfileOutput> => {
  const decodedInput = Schema.decodeUnknownSync(ProfileNameInput)(input)
  await client.request(RemoveProfile, decodedInput)
  return Schema.decodeUnknownSync(RemoveProfileOutput)({
    profileName: decodedInput.profileName,
    removed: true
  })
}

export const setCurrentSceneCollection = async (
  client: ObsClient,
  input: SceneCollectionNameInput
): Promise<SetCurrentSceneCollectionOutput> => {
  const decodedInput = Schema.decodeUnknownSync(SceneCollectionNameInput)(input)
  await client.request(SetCurrentSceneCollection, decodedInput)
  return Schema.decodeUnknownSync(SetCurrentSceneCollectionOutput)({
    sceneCollectionName: decodedInput.sceneCollectionName,
    switched: true
  })
}

export const createSceneCollection = async (
  client: ObsClient,
  input: SceneCollectionNameInput
): Promise<CreateSceneCollectionOutput> => {
  const decodedInput = Schema.decodeUnknownSync(SceneCollectionNameInput)(input)
  await client.request(CreateSceneCollection, decodedInput)
  return Schema.decodeUnknownSync(CreateSceneCollectionOutput)({
    sceneCollectionName: decodedInput.sceneCollectionName,
    created: true,
    switched: true
  })
}

export const setProfileParameter = async (
  client: ObsClient,
  input: SetProfileParameterInput
): Promise<SetProfileParameterOutput> => {
  const decodedInput = Schema.decodeUnknownSync(SetProfileParameterInput)(input)
  await client.request(SetProfileParameter, decodedInput)
  return Schema.decodeUnknownSync(SetProfileParameterOutput)({
    ...decodedInput,
    acknowledged: true
  })
}
