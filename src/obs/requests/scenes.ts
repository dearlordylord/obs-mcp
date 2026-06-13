import { Schema } from "effect"

import {
  GetSceneItemIdInput,
  GetSceneItemIdOutput,
  GetSceneItemSourceInput,
  GetSceneItemSourceOutput,
  ListGroupSceneItemsInput,
  ListGroupSceneItemsOutput,
  ListSceneItemsInput,
  ListSceneItemsOutput,
  ListScenesOutput
} from "../../domain/schemas/scenes.js"
import { UnknownRecord } from "../../domain/schemas/shared.js"
import { EmptyRequestData, type ObsRequestDescriptor } from "./shared.js"

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

export const GetSceneItemList = {
  requestType: "GetSceneItemList",
  requestDataSchema: ListSceneItemsInput,
  responseSchema: ListSceneItemsOutput
} satisfies ObsRequestDescriptor<ListSceneItemsOutput>

export const GetGroupSceneItemList = {
  requestType: "GetGroupSceneItemList",
  requestDataSchema: ListGroupSceneItemsInput,
  responseSchema: ListGroupSceneItemsOutput
} satisfies ObsRequestDescriptor<ListGroupSceneItemsOutput>

export const GetSceneItemId = {
  requestType: "GetSceneItemId",
  requestDataSchema: GetSceneItemIdInput,
  responseSchema: GetSceneItemIdOutput
} satisfies ObsRequestDescriptor<GetSceneItemIdOutput>

export const GetSceneItemSource = {
  requestType: "GetSceneItemSource",
  requestDataSchema: GetSceneItemSourceInput,
  responseSchema: GetSceneItemSourceOutput
} satisfies ObsRequestDescriptor<GetSceneItemSourceOutput>
