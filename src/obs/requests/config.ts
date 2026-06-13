import { Schema } from "effect"

import {
  ProfileListOutput,
  ProfileNameInput,
  ProfileParameterInput,
  ProfileParameterOutput,
  RecordDirectoryOutput,
  SceneCollectionListOutput,
  SceneCollectionNameInput,
  SetProfileParameterInput
} from "../../domain/schemas/config.js"
import { EmptyRequestData, type ObsRequestDescriptor } from "./shared.js"

const EmptyResponseData = Schema.Struct({})

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

export const SetCurrentProfile = {
  requestType: "SetCurrentProfile",
  requestDataSchema: ProfileNameInput,
  responseSchema: EmptyResponseData
} satisfies ObsRequestDescriptor<typeof EmptyResponseData.Type>

export const CreateProfile = {
  requestType: "CreateProfile",
  requestDataSchema: ProfileNameInput,
  responseSchema: EmptyResponseData
} satisfies ObsRequestDescriptor<typeof EmptyResponseData.Type>

export const RemoveProfile = {
  requestType: "RemoveProfile",
  requestDataSchema: ProfileNameInput,
  responseSchema: EmptyResponseData
} satisfies ObsRequestDescriptor<typeof EmptyResponseData.Type>

export const SetCurrentSceneCollection = {
  requestType: "SetCurrentSceneCollection",
  requestDataSchema: SceneCollectionNameInput,
  responseSchema: EmptyResponseData
} satisfies ObsRequestDescriptor<typeof EmptyResponseData.Type>

export const CreateSceneCollection = {
  requestType: "CreateSceneCollection",
  requestDataSchema: SceneCollectionNameInput,
  responseSchema: EmptyResponseData
} satisfies ObsRequestDescriptor<typeof EmptyResponseData.Type>

export const SetProfileParameter = {
  requestType: "SetProfileParameter",
  requestDataSchema: SetProfileParameterInput,
  responseSchema: EmptyResponseData
} satisfies ObsRequestDescriptor<typeof EmptyResponseData.Type>
