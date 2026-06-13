import { Schema } from "effect"

import {
  CreateSceneItemInput,
  DuplicateSceneItemInput,
  RemoveSceneItemInput
} from "../../domain/schemas/scene-item-lifecycle.js"
import {
  GetSceneItemTransformInput,
  GetSceneItemTransformOutput,
  SetSceneItemTransformInput
} from "../../domain/schemas/scene-item-transforms.js"
import {
  CreateSceneInput,
  GetSceneItemBlendModeInput,
  GetSceneItemBlendModeOutput,
  GetSceneItemEnabledInput,
  GetSceneItemEnabledOutput,
  GetSceneItemIdInput,
  GetSceneItemIdOutput,
  GetSceneItemIndexInput,
  GetSceneItemIndexOutput,
  GetSceneItemLockedInput,
  GetSceneItemLockedOutput,
  GetSceneItemSourceInput,
  GetSceneItemSourceOutput,
  GetSceneTransitionOverrideInput,
  GetSourceActiveInput,
  GetSourceActiveOutput,
  ListGroupSceneItemsInput,
  ListGroupSceneItemsOutput,
  ListGroupsOutput,
  ListSceneItemsInput,
  ListSceneItemsOutput,
  ListScenesOutput,
  RemoveSceneInput,
  SceneTransitionOverrideOutput,
  SetSceneItemBlendModeInput,
  SetSceneItemEnabledInput,
  SetSceneItemIndexInput,
  SetSceneItemLockedInput,
  SetSceneNameInput,
  SetSceneTransitionOverrideInput
} from "../../domain/schemas/scenes.js"
import { UnknownRecord } from "../../domain/schemas/shared.js"
import { EmptyRequestData, type ObsRequestDescriptor } from "./shared.js"

export const GetSceneList = {
  requestType: "GetSceneList",
  requestDataSchema: EmptyRequestData,
  responseSchema: ListScenesOutput
} satisfies ObsRequestDescriptor<ListScenesOutput>

export const GetGroupList = {
  requestType: "GetGroupList",
  requestDataSchema: EmptyRequestData,
  responseSchema: ListGroupsOutput
} satisfies ObsRequestDescriptor<ListGroupsOutput>

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

const GetCurrentPreviewSceneResponse = Schema.Struct({
  sceneName: Schema.optional(Schema.String),
  sceneUuid: Schema.optional(Schema.String),
  currentPreviewSceneName: Schema.optional(Schema.String),
  currentPreviewSceneUuid: Schema.optional(Schema.String)
})
type GetCurrentPreviewSceneResponse = typeof GetCurrentPreviewSceneResponse.Type

export const GetCurrentPreviewScene = {
  requestType: "GetCurrentPreviewScene",
  requestDataSchema: EmptyRequestData,
  responseSchema: GetCurrentPreviewSceneResponse
} satisfies ObsRequestDescriptor<GetCurrentPreviewSceneResponse>

const SetCurrentProgramSceneRequest = Schema.Struct({
  sceneName: Schema.NonEmptyString
})

export const SetCurrentProgramScene = {
  requestType: "SetCurrentProgramScene",
  requestDataSchema: SetCurrentProgramSceneRequest,
  responseSchema: UnknownRecord
} satisfies ObsRequestDescriptor<Record<string, unknown>>

const SetCurrentPreviewSceneRequest = Schema.Union(
  Schema.Struct({
    sceneName: Schema.NonEmptyString,
    sceneUuid: Schema.optional(Schema.Never)
  }),
  Schema.Struct({
    sceneName: Schema.optional(Schema.Never),
    sceneUuid: Schema.NonEmptyString
  })
)

export const SetCurrentPreviewScene = {
  requestType: "SetCurrentPreviewScene",
  requestDataSchema: SetCurrentPreviewSceneRequest,
  responseSchema: UnknownRecord
} satisfies ObsRequestDescriptor<Record<string, unknown>>

const CreateSceneResponse = Schema.Struct({
  sceneUuid: Schema.optional(Schema.String)
})
type CreateSceneResponse = typeof CreateSceneResponse.Type

export const CreateScene = {
  requestType: "CreateScene",
  requestDataSchema: CreateSceneInput,
  responseSchema: CreateSceneResponse
} satisfies ObsRequestDescriptor<CreateSceneResponse>

export const RemoveScene = {
  requestType: "RemoveScene",
  requestDataSchema: RemoveSceneInput,
  responseSchema: UnknownRecord
} satisfies ObsRequestDescriptor<Record<string, unknown>>

export const SetSceneName = {
  requestType: "SetSceneName",
  requestDataSchema: SetSceneNameInput,
  responseSchema: UnknownRecord
} satisfies ObsRequestDescriptor<Record<string, unknown>>

export const GetSceneSceneTransitionOverride = {
  requestType: "GetSceneSceneTransitionOverride",
  requestDataSchema: GetSceneTransitionOverrideInput,
  responseSchema: SceneTransitionOverrideOutput
} satisfies ObsRequestDescriptor<SceneTransitionOverrideOutput>

export const SetSceneSceneTransitionOverride = {
  requestType: "SetSceneSceneTransitionOverride",
  requestDataSchema: SetSceneTransitionOverrideInput,
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

const SceneItemIdResponse = Schema.Struct({
  sceneItemId: Schema.optional(Schema.Number.pipe(Schema.int(), Schema.greaterThanOrEqualTo(0)))
})
type SceneItemIdResponse = typeof SceneItemIdResponse.Type

export const CreateSceneItem = {
  requestType: "CreateSceneItem",
  requestDataSchema: CreateSceneItemInput,
  responseSchema: SceneItemIdResponse
} satisfies ObsRequestDescriptor<SceneItemIdResponse>

export const RemoveSceneItem = {
  requestType: "RemoveSceneItem",
  requestDataSchema: RemoveSceneItemInput,
  responseSchema: UnknownRecord
} satisfies ObsRequestDescriptor<Record<string, unknown>>

export const DuplicateSceneItem = {
  requestType: "DuplicateSceneItem",
  requestDataSchema: DuplicateSceneItemInput,
  responseSchema: SceneItemIdResponse
} satisfies ObsRequestDescriptor<SceneItemIdResponse>

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

export const GetSceneItemTransform = {
  requestType: "GetSceneItemTransform",
  requestDataSchema: GetSceneItemTransformInput,
  responseSchema: GetSceneItemTransformOutput
} satisfies ObsRequestDescriptor<GetSceneItemTransformOutput>

export const SetSceneItemTransform = {
  requestType: "SetSceneItemTransform",
  requestDataSchema: SetSceneItemTransformInput,
  responseSchema: UnknownRecord
} satisfies ObsRequestDescriptor<Record<string, unknown>>

export const GetSceneItemEnabled = {
  requestType: "GetSceneItemEnabled",
  requestDataSchema: GetSceneItemEnabledInput,
  responseSchema: GetSceneItemEnabledOutput
} satisfies ObsRequestDescriptor<GetSceneItemEnabledOutput>

export const SetSceneItemEnabled = {
  requestType: "SetSceneItemEnabled",
  requestDataSchema: SetSceneItemEnabledInput,
  responseSchema: UnknownRecord
} satisfies ObsRequestDescriptor<Record<string, unknown>>

export const GetSceneItemLocked = {
  requestType: "GetSceneItemLocked",
  requestDataSchema: GetSceneItemLockedInput,
  responseSchema: GetSceneItemLockedOutput
} satisfies ObsRequestDescriptor<GetSceneItemLockedOutput>

export const SetSceneItemLocked = {
  requestType: "SetSceneItemLocked",
  requestDataSchema: SetSceneItemLockedInput,
  responseSchema: UnknownRecord
} satisfies ObsRequestDescriptor<Record<string, unknown>>

export const GetSceneItemIndex = {
  requestType: "GetSceneItemIndex",
  requestDataSchema: GetSceneItemIndexInput,
  responseSchema: GetSceneItemIndexOutput
} satisfies ObsRequestDescriptor<GetSceneItemIndexOutput>

export const GetSceneItemBlendMode = {
  requestType: "GetSceneItemBlendMode",
  requestDataSchema: GetSceneItemBlendModeInput,
  responseSchema: GetSceneItemBlendModeOutput
} satisfies ObsRequestDescriptor<GetSceneItemBlendModeOutput>

export const SetSceneItemIndex = {
  requestType: "SetSceneItemIndex",
  requestDataSchema: SetSceneItemIndexInput,
  responseSchema: UnknownRecord
} satisfies ObsRequestDescriptor<Record<string, unknown>>

export const SetSceneItemBlendMode = {
  requestType: "SetSceneItemBlendMode",
  requestDataSchema: SetSceneItemBlendModeInput,
  responseSchema: UnknownRecord
} satisfies ObsRequestDescriptor<Record<string, unknown>>

export const GetSourceActive = {
  requestType: "GetSourceActive",
  requestDataSchema: GetSourceActiveInput,
  responseSchema: GetSourceActiveOutput
} satisfies ObsRequestDescriptor<GetSourceActiveOutput>
