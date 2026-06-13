import { Schema } from "effect"

import { ListScenesOutput } from "../domain/schemas/scenes.js"
import { StringArray, UnknownRecord } from "../domain/schemas/shared.js"
import { StreamStatusOutput, ToggleStreamOutput } from "../domain/schemas/stream.js"

export const ObsRequestType = Schema.Literal(
  "GetVersion",
  "GetSceneList",
  "GetCurrentProgramScene",
  "SetCurrentProgramScene",
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
