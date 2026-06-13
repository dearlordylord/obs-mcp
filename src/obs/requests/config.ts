import { Schema } from "effect"

import {
  ObsSetStreamServiceSettingsInput,
  ObsStreamServiceSettingsResponse,
  ProfileListOutput,
  ProfileNameInput,
  ProfileParameterInput,
  ProfileParameterOutput,
  RecordDirectoryOutput,
  SceneCollectionListOutput,
  SceneCollectionNameInput,
  SetProfileParameterInput,
  SetRecordDirectoryInput,
  SetVideoSettingsInput,
  VideoSettingsOutput
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

export const SetRecordDirectory = {
  requestType: "SetRecordDirectory",
  requestDataSchema: SetRecordDirectoryInput,
  responseSchema: EmptyResponseData
} satisfies ObsRequestDescriptor<typeof EmptyResponseData.Type>

export const GetVideoSettings = {
  requestType: "GetVideoSettings",
  requestDataSchema: EmptyRequestData,
  responseSchema: VideoSettingsOutput
} satisfies ObsRequestDescriptor<VideoSettingsOutput>

export const SetVideoSettings = {
  requestType: "SetVideoSettings",
  requestDataSchema: SetVideoSettingsInput,
  responseSchema: EmptyResponseData
} satisfies ObsRequestDescriptor<typeof EmptyResponseData.Type>

export const GetStreamServiceSettings = {
  requestType: "GetStreamServiceSettings",
  requestDataSchema: EmptyRequestData,
  responseSchema: ObsStreamServiceSettingsResponse
} satisfies ObsRequestDescriptor<ObsStreamServiceSettingsResponse>

export const SetStreamServiceSettings = {
  requestType: "SetStreamServiceSettings",
  requestDataSchema: ObsSetStreamServiceSettingsInput,
  responseSchema: EmptyResponseData
} satisfies ObsRequestDescriptor<typeof EmptyResponseData.Type>

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
