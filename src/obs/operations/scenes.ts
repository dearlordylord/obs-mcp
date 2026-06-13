import { Schema } from "effect"

import { GetSceneItemTransformInput, GetSceneItemTransformOutput } from "../../domain/schemas/scene-item-transforms.js"
import {
  CreateSceneInput,
  CreateSceneOutput,
  CurrentSceneOutput,
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
  ListScenesInput,
  ListScenesOutput,
  RemoveSceneInput,
  RemoveSceneOutput,
  SceneTransitionOverrideOutput,
  SetCurrentPreviewSceneInput,
  SetCurrentPreviewSceneOutput,
  SetCurrentSceneInput,
  SetCurrentSceneOutput,
  SetSceneItemBlendModeInput,
  SetSceneItemBlendModeOutput,
  SetSceneItemEnabledInput,
  SetSceneItemEnabledOutput,
  SetSceneItemIndexInput,
  SetSceneItemIndexOutput,
  SetSceneItemLockedInput,
  SetSceneItemLockedOutput,
  SetSceneNameInput,
  SetSceneNameOutput,
  SetSceneTransitionOverrideInput,
  SetSceneTransitionOverrideOutput
} from "../../domain/schemas/scenes.js"
import type { ObsClient } from "../client.js"
import {
  CreateScene as CreateSceneRequest,
  GetCurrentPreviewScene as GetCurrentPreviewSceneRequest,
  GetCurrentProgramScene as GetCurrentProgramSceneRequest,
  GetGroupList as GetGroupListRequest,
  GetGroupSceneItemList,
  GetSceneItemBlendMode,
  GetSceneItemEnabled,
  GetSceneItemId,
  GetSceneItemIndex,
  GetSceneItemList,
  GetSceneItemLocked,
  GetSceneItemSource,
  GetSceneItemTransform,
  GetSceneList as GetSceneListRequest,
  GetSceneSceneTransitionOverride as GetSceneTransitionOverrideRequest,
  GetSourceActive as GetSourceActiveRequest,
  RemoveScene as RemoveSceneRequest,
  SetCurrentPreviewScene as SetCurrentPreviewSceneRequest,
  SetCurrentProgramScene as SetCurrentProgramSceneRequest,
  SetSceneItemBlendMode,
  SetSceneItemEnabled,
  SetSceneItemIndex,
  SetSceneItemLocked,
  SetSceneName as SetSceneNameRequest,
  SetSceneSceneTransitionOverride as SetSceneTransitionOverrideRequest
} from "../requests.js"

export const listScenes = async (client: ObsClient, input: ListScenesInput): Promise<ListScenesOutput> => {
  const decodedInput = Schema.decodeUnknownSync(ListScenesInput)(input)
  const response = await client.request(GetSceneListRequest)
  const scenes = decodedInput.includeGroups
    ? response.scenes
    : response.scenes.filter((scene) => scene.isGroup !== true)
  return Schema.decodeUnknownSync(ListScenesOutput)({ ...response, scenes })
}

export const listGroups = async (client: ObsClient): Promise<ListGroupsOutput> =>
  Schema.decodeUnknownSync(ListGroupsOutput)(await client.request(GetGroupListRequest))

export const getCurrentScene = async (client: ObsClient): Promise<CurrentSceneOutput> => {
  const response = await client.request(GetCurrentProgramSceneRequest)
  const sceneName = response.sceneName ?? response.currentProgramSceneName
  if (sceneName === undefined) {
    throw new Error("OBS did not return a current program scene name")
  }
  return Schema.decodeUnknownSync(CurrentSceneOutput)({
    sceneName,
    sceneUuid: response.sceneUuid ?? response.currentProgramSceneUuid
  })
}

export const getCurrentPreviewScene = async (client: ObsClient): Promise<CurrentSceneOutput> => {
  const response = await client.request(GetCurrentPreviewSceneRequest)
  const sceneName = response.sceneName ?? response.currentPreviewSceneName
  if (sceneName === undefined) {
    throw new Error("OBS did not return a current preview scene name")
  }
  return Schema.decodeUnknownSync(CurrentSceneOutput)({
    sceneName,
    sceneUuid: response.sceneUuid ?? response.currentPreviewSceneUuid
  })
}

export const setCurrentScene = async (
  client: ObsClient,
  input: SetCurrentSceneInput
): Promise<SetCurrentSceneOutput> => {
  const decodedInput = Schema.decodeUnknownSync(SetCurrentSceneInput)(input)
  await client.request(SetCurrentProgramSceneRequest, { sceneName: decodedInput.sceneName })
  return Schema.decodeUnknownSync(SetCurrentSceneOutput)({ sceneName: decodedInput.sceneName, switched: true })
}

export const setCurrentPreviewScene = async (
  client: ObsClient,
  input: SetCurrentPreviewSceneInput
): Promise<SetCurrentPreviewSceneOutput> => {
  const decodedInput = Schema.decodeUnknownSync(SetCurrentPreviewSceneInput)(input)
  const requestData = "sceneUuid" in decodedInput
    ? { sceneUuid: decodedInput.sceneUuid }
    : { sceneName: decodedInput.sceneName }
  await client.request(SetCurrentPreviewSceneRequest, requestData)
  return Schema.decodeUnknownSync(SetCurrentPreviewSceneOutput)({ ...requestData, updated: true })
}

const sceneLocatorRequestData = (input: RemoveSceneInput): Record<string, string> =>
  input.sceneUuid !== undefined
    ? { sceneUuid: input.sceneUuid }
    : input.canvasUuid === undefined
    ? { sceneName: input.sceneName }
    : { sceneName: input.sceneName, canvasUuid: input.canvasUuid }

export const createScene = async (
  client: ObsClient,
  input: CreateSceneInput
): Promise<CreateSceneOutput> => {
  const decodedInput = Schema.decodeUnknownSync(CreateSceneInput)(input)
  const response = await client.request(CreateSceneRequest, decodedInput)
  return Schema.decodeUnknownSync(CreateSceneOutput)({
    sceneName: decodedInput.sceneName,
    sceneUuid: response.sceneUuid,
    created: true
  })
}

export const removeScene = async (
  client: ObsClient,
  input: RemoveSceneInput
): Promise<RemoveSceneOutput> => {
  const decodedInput = Schema.decodeUnknownSync(RemoveSceneInput)(input)
  const requestData = sceneLocatorRequestData(decodedInput)
  await client.request(RemoveSceneRequest, requestData)
  return Schema.decodeUnknownSync(RemoveSceneOutput)({ ...requestData, removed: true })
}

export const setSceneName = async (
  client: ObsClient,
  input: SetSceneNameInput
): Promise<SetSceneNameOutput> => {
  const decodedInput = Schema.decodeUnknownSync(SetSceneNameInput)(input)
  const locator = sceneLocatorRequestData(decodedInput)
  await client.request(SetSceneNameRequest, { ...locator, newSceneName: decodedInput.newSceneName })
  return Schema.decodeUnknownSync(SetSceneNameOutput)({
    ...locator,
    newSceneName: decodedInput.newSceneName,
    renamed: true
  })
}

export const getSceneTransitionOverride = async (
  client: ObsClient,
  input: GetSceneTransitionOverrideInput
): Promise<SceneTransitionOverrideOutput> => {
  const decodedInput = Schema.decodeUnknownSync(GetSceneTransitionOverrideInput)(input)
  return Schema.decodeUnknownSync(SceneTransitionOverrideOutput)(
    await client.request(GetSceneTransitionOverrideRequest, sceneLocatorRequestData(decodedInput))
  )
}

export const setSceneTransitionOverride = async (
  client: ObsClient,
  input: SetSceneTransitionOverrideInput
): Promise<SetSceneTransitionOverrideOutput> => {
  const decodedInput = Schema.decodeUnknownSync(SetSceneTransitionOverrideInput)(input)
  const requestData = {
    ...sceneLocatorRequestData(decodedInput),
    ...("transitionName" in decodedInput ? { transitionName: decodedInput.transitionName } : {}),
    ...("transitionDuration" in decodedInput ? { transitionDuration: decodedInput.transitionDuration } : {})
  }
  await client.request(SetSceneTransitionOverrideRequest, requestData)
  return Schema.decodeUnknownSync(SetSceneTransitionOverrideOutput)({ ...requestData, updated: true })
}

export const listSceneItems = async (
  client: ObsClient,
  input: ListSceneItemsInput
): Promise<ListSceneItemsOutput> => {
  const decodedInput = Schema.decodeUnknownSync(ListSceneItemsInput)(input)
  return Schema.decodeUnknownSync(ListSceneItemsOutput)(await client.request(GetSceneItemList, decodedInput))
}

export const listGroupSceneItems = async (
  client: ObsClient,
  input: ListGroupSceneItemsInput
): Promise<ListGroupSceneItemsOutput> => {
  const decodedInput = Schema.decodeUnknownSync(ListGroupSceneItemsInput)(input)
  return Schema.decodeUnknownSync(ListGroupSceneItemsOutput)(await client.request(GetGroupSceneItemList, decodedInput))
}

export const getSceneItemId = async (
  client: ObsClient,
  input: GetSceneItemIdInput
): Promise<GetSceneItemIdOutput> => {
  const decodedInput = Schema.decodeUnknownSync(GetSceneItemIdInput)(input)
  return Schema.decodeUnknownSync(GetSceneItemIdOutput)(await client.request(GetSceneItemId, decodedInput))
}

export const getSceneItemSource = async (
  client: ObsClient,
  input: GetSceneItemSourceInput
): Promise<GetSceneItemSourceOutput> => {
  const decodedInput = Schema.decodeUnknownSync(GetSceneItemSourceInput)(input)
  return Schema.decodeUnknownSync(GetSceneItemSourceOutput)(await client.request(GetSceneItemSource, decodedInput))
}

export const getSceneItemTransform = async (
  client: ObsClient,
  input: GetSceneItemTransformInput
): Promise<GetSceneItemTransformOutput> => {
  const decodedInput = Schema.decodeUnknownSync(GetSceneItemTransformInput)(input)
  return Schema.decodeUnknownSync(GetSceneItemTransformOutput)(
    await client.request(GetSceneItemTransform, decodedInput)
  )
}

export const getSceneItemEnabled = async (
  client: ObsClient,
  input: GetSceneItemEnabledInput
): Promise<GetSceneItemEnabledOutput> => {
  const decodedInput = Schema.decodeUnknownSync(GetSceneItemEnabledInput)(input)
  return Schema.decodeUnknownSync(GetSceneItemEnabledOutput)(await client.request(GetSceneItemEnabled, decodedInput))
}

export const setSceneItemEnabled = async (
  client: ObsClient,
  input: SetSceneItemEnabledInput
): Promise<SetSceneItemEnabledOutput> => {
  const decodedInput = Schema.decodeUnknownSync(SetSceneItemEnabledInput)(input)
  await client.request(SetSceneItemEnabled, decodedInput)
  return Schema.decodeUnknownSync(SetSceneItemEnabledOutput)({
    sceneItemEnabled: decodedInput.sceneItemEnabled,
    updated: true
  })
}

export const getSceneItemLocked = async (
  client: ObsClient,
  input: GetSceneItemLockedInput
): Promise<GetSceneItemLockedOutput> => {
  const decodedInput = Schema.decodeUnknownSync(GetSceneItemLockedInput)(input)
  return Schema.decodeUnknownSync(GetSceneItemLockedOutput)(await client.request(GetSceneItemLocked, decodedInput))
}

export const setSceneItemLocked = async (
  client: ObsClient,
  input: SetSceneItemLockedInput
): Promise<SetSceneItemLockedOutput> => {
  const decodedInput = Schema.decodeUnknownSync(SetSceneItemLockedInput)(input)
  await client.request(SetSceneItemLocked, decodedInput)
  return Schema.decodeUnknownSync(SetSceneItemLockedOutput)({
    sceneItemLocked: decodedInput.sceneItemLocked,
    updated: true
  })
}

export const getSceneItemIndex = async (
  client: ObsClient,
  input: GetSceneItemIndexInput
): Promise<GetSceneItemIndexOutput> => {
  const decodedInput = Schema.decodeUnknownSync(GetSceneItemIndexInput)(input)
  return Schema.decodeUnknownSync(GetSceneItemIndexOutput)(await client.request(GetSceneItemIndex, decodedInput))
}

export const getSceneItemBlendMode = async (
  client: ObsClient,
  input: GetSceneItemBlendModeInput
): Promise<GetSceneItemBlendModeOutput> => {
  const decodedInput = Schema.decodeUnknownSync(GetSceneItemBlendModeInput)(input)
  return Schema.decodeUnknownSync(GetSceneItemBlendModeOutput)(
    await client.request(GetSceneItemBlendMode, decodedInput)
  )
}

export const setSceneItemIndex = async (
  client: ObsClient,
  input: SetSceneItemIndexInput
): Promise<SetSceneItemIndexOutput> => {
  const decodedInput = Schema.decodeUnknownSync(SetSceneItemIndexInput)(input)
  await client.request(SetSceneItemIndex, decodedInput)
  return Schema.decodeUnknownSync(SetSceneItemIndexOutput)({
    sceneItemIndex: decodedInput.sceneItemIndex,
    updated: true
  })
}

export const setSceneItemBlendMode = async (
  client: ObsClient,
  input: SetSceneItemBlendModeInput
): Promise<SetSceneItemBlendModeOutput> => {
  const decodedInput = Schema.decodeUnknownSync(SetSceneItemBlendModeInput)(input)
  await client.request(SetSceneItemBlendMode, decodedInput)
  return Schema.decodeUnknownSync(SetSceneItemBlendModeOutput)({
    sceneItemBlendMode: decodedInput.sceneItemBlendMode,
    updated: true
  })
}

export const getSourceActive = async (
  client: ObsClient,
  input: GetSourceActiveInput
): Promise<GetSourceActiveOutput> => {
  const decodedInput = Schema.decodeUnknownSync(GetSourceActiveInput)(input)
  const response = await client.request(GetSourceActiveRequest, decodedInput)
  return Schema.decodeUnknownSync(GetSourceActiveOutput)({
    ...response,
    sourceName: response.sourceName ?? decodedInput.sourceName,
    sourceUuid: response.sourceUuid ?? decodedInput.sourceUuid
  })
}
