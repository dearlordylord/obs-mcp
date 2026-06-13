import { Schema } from "effect"

import {
  ProfileListOutput,
  ProfileParameterInput,
  ProfileParameterOutput,
  RecordDirectoryOutput,
  SceneCollectionListOutput
} from "../../domain/schemas/config.js"
import type { ObsClient } from "../client.js"
import { GetProfileList, GetProfileParameter, GetRecordDirectory, GetSceneCollectionList } from "../requests.js"

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
