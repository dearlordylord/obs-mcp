import { Schema } from "effect"

import { ObsStatsOutput, RecordStatusOutput } from "../domain/schemas/general.js"
import {
  ListInputKindsInput,
  ListInputKindsOutput,
  ListInputsInput,
  ListInputsOutput,
  SpecialInputsOutput
} from "../domain/schemas/inputs.js"
import { ListScenesOutput } from "../domain/schemas/scenes.js"
import { StringArray, UnknownRecord } from "../domain/schemas/shared.js"
import { StreamStatusOutput, ToggleStreamOutput } from "../domain/schemas/stream.js"

export const ObsRequestType = Schema.Literal(
  "GetVersion",
  "GetStats",
  "GetSceneList",
  "GetCurrentProgramScene",
  "SetCurrentProgramScene",
  "GetInputList",
  "GetInputKindList",
  "GetSpecialInputs",
  "GetRecordStatus",
  "PauseRecord",
  "ResumeRecord",
  "ToggleRecordPause",
  "GetStreamStatus",
  "StartStream",
  "StopStream",
  "ToggleStream"
)
export type ObsRequestType = typeof ObsRequestType.Type

export interface ObsRequestDescriptor<Output extends Record<string, unknown>> {
  readonly requestType: ObsRequestType
  readonly requestDataSchema: Schema.Schema.AnyNoContext
  readonly responseSchema: Schema.Schema<Output>
}

const EmptyRequestData = Schema.Struct({})

const GetVersionResponse = Schema.Struct({
  obsVersion: Schema.String,
  obsWebSocketVersion: Schema.String,
  rpcVersion: Schema.Number,
  availableRequests: StringArray,
  supportedImageFormats: StringArray,
  platform: Schema.optional(Schema.String),
  platformDescription: Schema.optional(Schema.String)
})
type GetVersionResponse = typeof GetVersionResponse.Type

export const GetVersion = {
  requestType: "GetVersion",
  requestDataSchema: EmptyRequestData,
  responseSchema: GetVersionResponse
} satisfies ObsRequestDescriptor<GetVersionResponse>

export const GetStats = {
  requestType: "GetStats",
  requestDataSchema: EmptyRequestData,
  responseSchema: ObsStatsOutput
} satisfies ObsRequestDescriptor<ObsStatsOutput>

export const GetSceneList = {
  requestType: "GetSceneList",
  requestDataSchema: EmptyRequestData,
  responseSchema: ListScenesOutput
} satisfies ObsRequestDescriptor<ListScenesOutput>

const GetCurrentProgramSceneResponse = Schema.Struct({
  sceneName: Schema.optional(Schema.String),
  sceneUuid: Schema.optional(Schema.String),
  currentProgramSceneName: Schema.optional(Schema.String),
  currentProgramSceneUuid: Schema.optional(Schema.String)
})
type GetCurrentProgramSceneResponse = typeof GetCurrentProgramSceneResponse.Type

export const GetCurrentProgramScene = {
  requestType: "GetCurrentProgramScene",
  requestDataSchema: EmptyRequestData,
  responseSchema: GetCurrentProgramSceneResponse
} satisfies ObsRequestDescriptor<GetCurrentProgramSceneResponse>

const SetCurrentProgramSceneRequest = Schema.Struct({
  sceneName: Schema.NonEmptyString
})

export const SetCurrentProgramScene = {
  requestType: "SetCurrentProgramScene",
  requestDataSchema: SetCurrentProgramSceneRequest,
  responseSchema: UnknownRecord
} satisfies ObsRequestDescriptor<Record<string, unknown>>

export const GetInputList = {
  requestType: "GetInputList",
  requestDataSchema: ListInputsInput,
  responseSchema: ListInputsOutput
} satisfies ObsRequestDescriptor<ListInputsOutput>

export const GetInputKindList = {
  requestType: "GetInputKindList",
  requestDataSchema: ListInputKindsInput,
  responseSchema: ListInputKindsOutput
} satisfies ObsRequestDescriptor<ListInputKindsOutput>

export const GetSpecialInputs = {
  requestType: "GetSpecialInputs",
  requestDataSchema: EmptyRequestData,
  responseSchema: SpecialInputsOutput
} satisfies ObsRequestDescriptor<SpecialInputsOutput>

export const GetRecordStatus = {
  requestType: "GetRecordStatus",
  requestDataSchema: EmptyRequestData,
  responseSchema: RecordStatusOutput
} satisfies ObsRequestDescriptor<RecordStatusOutput>

export const PauseRecord = {
  requestType: "PauseRecord",
  requestDataSchema: EmptyRequestData,
  responseSchema: UnknownRecord
} satisfies ObsRequestDescriptor<Record<string, unknown>>

export const ResumeRecord = {
  requestType: "ResumeRecord",
  requestDataSchema: EmptyRequestData,
  responseSchema: UnknownRecord
} satisfies ObsRequestDescriptor<Record<string, unknown>>

export const ToggleRecordPause = {
  requestType: "ToggleRecordPause",
  requestDataSchema: EmptyRequestData,
  responseSchema: UnknownRecord
} satisfies ObsRequestDescriptor<Record<string, unknown>>

export const GetStreamStatus = {
  requestType: "GetStreamStatus",
  requestDataSchema: EmptyRequestData,
  responseSchema: StreamStatusOutput
} satisfies ObsRequestDescriptor<StreamStatusOutput>

export const StartStream = {
  requestType: "StartStream",
  requestDataSchema: EmptyRequestData,
  responseSchema: UnknownRecord
} satisfies ObsRequestDescriptor<Record<string, unknown>>

export const StopStream = {
  requestType: "StopStream",
  requestDataSchema: EmptyRequestData,
  responseSchema: UnknownRecord
} satisfies ObsRequestDescriptor<Record<string, unknown>>

export const ToggleStream = {
  requestType: "ToggleStream",
  requestDataSchema: EmptyRequestData,
  responseSchema: ToggleStreamOutput
} satisfies ObsRequestDescriptor<ToggleStreamOutput>
