import {
  ProfileListOutput,
  ProfileParameterInput,
  ProfileParameterOutput,
  RecordDirectoryOutput,
  SceneCollectionListOutput
} from "../../domain/schemas/config.js"
import { EmptyRequestData, type ObsRequestDescriptor } from "./shared.js"

export const GetProfileList = {
  requestType: "GetProfileList",
  requestDataSchema: EmptyRequestData,
  responseSchema: ProfileListOutput
} satisfies ObsRequestDescriptor<ProfileListOutput>

export const GetSceneCollectionList = {
  requestType: "GetSceneCollectionList",
  requestDataSchema: EmptyRequestData,
  responseSchema: SceneCollectionListOutput
} satisfies ObsRequestDescriptor<SceneCollectionListOutput>

export const GetProfileParameter = {
  requestType: "GetProfileParameter",
  requestDataSchema: ProfileParameterInput,
  responseSchema: ProfileParameterOutput
} satisfies ObsRequestDescriptor<ProfileParameterOutput>

export const GetRecordDirectory = {
  requestType: "GetRecordDirectory",
  requestDataSchema: EmptyRequestData,
  responseSchema: RecordDirectoryOutput
} satisfies ObsRequestDescriptor<RecordDirectoryOutput>
