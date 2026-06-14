import { Schema } from "effect"

import type { ObsClient } from "../client.js"
import {
  CreateScene as CreateSceneRequest,
  CreateSceneItem,
  DuplicateSceneItem,
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
  RemoveSceneItem,
  SetCurrentPreviewScene as SetCurrentPreviewSceneRequest,
  SetCurrentProgramScene as SetCurrentProgramSceneRequest,
  SetSceneItemBlendMode,
  SetSceneItemEnabled,
  SetSceneItemIndex,
  SetSceneItemLocked,
  SetSceneItemTransform,
  SetSceneName as SetSceneNameRequest,
  SetSceneSceneTransitionOverride as SetSceneTransitionOverrideRequest
} from "../requests.js"
import * as SceneSchemas from "../scenes-imports.js"

export const listScenes = async (
  client: ObsClient,
  input: SceneSchemas.ListScenesInput
): Promise<SceneSchemas.ListScenesOutput> => {
  const decodedInput = Schema.decodeUnknownSync(SceneSchemas.ListScenesInput)(input)
  const response = await client.request(GetSceneListRequest)
  const scenes = decodedInput.includeGroups
    ? response.scenes
    : response.scenes.filter((scene) => scene.isGroup !== true)
  return Schema.decodeUnknownSync(SceneSchemas.ListScenesOutput)({ ...response, scenes })
}

export const listGroups = async (client: ObsClient): Promise<SceneSchemas.ListGroupsOutput> =>
  Schema.decodeUnknownSync(SceneSchemas.ListGroupsOutput)(await client.request(GetGroupListRequest))

export const getCurrentScene = async (client: ObsClient): Promise<SceneSchemas.CurrentSceneOutput> => {
  const response = await client.request(GetCurrentProgramSceneRequest)
  const sceneName = response.sceneName ?? response.currentProgramSceneName
  if (sceneName === undefined) {
    throw new Error("OBS did not return a current program scene name")
  }
  return Schema.decodeUnknownSync(SceneSchemas.CurrentSceneOutput)({
    sceneName,
    sceneUuid: response.sceneUuid ?? response.currentProgramSceneUuid
  })
}

export const getCurrentPreviewScene = async (client: ObsClient): Promise<SceneSchemas.CurrentSceneOutput> => {
  const response = await client.request(GetCurrentPreviewSceneRequest)
  const sceneName = response.sceneName ?? response.currentPreviewSceneName
  if (sceneName === undefined) {
    throw new Error("OBS did not return a current preview scene name")
  }
  return Schema.decodeUnknownSync(SceneSchemas.CurrentSceneOutput)({
    sceneName,
    sceneUuid: response.sceneUuid ?? response.currentPreviewSceneUuid
  })
}

export const setCurrentScene = async (
  client: ObsClient,
  input: SceneSchemas.SetCurrentSceneInput
): Promise<SceneSchemas.SetCurrentSceneOutput> => {
  const decodedInput = Schema.decodeUnknownSync(SceneSchemas.SetCurrentSceneInput)(input)
  await client.request(SetCurrentProgramSceneRequest, { sceneName: decodedInput.sceneName })
  return Schema.decodeUnknownSync(SceneSchemas.SetCurrentSceneOutput)({
    sceneName: decodedInput.sceneName,
    switched: true
  })
}

export const setCurrentPreviewScene = async (
  client: ObsClient,
  input: SceneSchemas.SetCurrentPreviewSceneInput
): Promise<SceneSchemas.SetCurrentPreviewSceneOutput> => {
  const decodedInput = Schema.decodeUnknownSync(SceneSchemas.SetCurrentPreviewSceneInput)(input)
  const requestData = "sceneUuid" in decodedInput
    ? { sceneUuid: decodedInput.sceneUuid }
    : { sceneName: decodedInput.sceneName }
  await client.request(SetCurrentPreviewSceneRequest, requestData)
  return Schema.decodeUnknownSync(SceneSchemas.SetCurrentPreviewSceneOutput)({ ...requestData, updated: true })
}

const sceneLocatorRequestData = (input: SceneSchemas.RemoveSceneInput): Record<string, string> =>
  input.sceneUuid !== undefined
    ? { sceneUuid: input.sceneUuid }
    : input.canvasUuid === undefined
    ? { sceneName: input.sceneName }
    : { sceneName: input.sceneName, canvasUuid: input.canvasUuid }

export const createScene = async (
  client: ObsClient,
  input: SceneSchemas.CreateSceneInput
): Promise<SceneSchemas.CreateSceneOutput> => {
  const decodedInput = Schema.decodeUnknownSync(SceneSchemas.CreateSceneInput)(input)
  const response = await client.request(CreateSceneRequest, decodedInput)
  return Schema.decodeUnknownSync(SceneSchemas.CreateSceneOutput)({
    sceneName: decodedInput.sceneName,
    sceneUuid: response.sceneUuid,
    created: true
  })
}

export const removeScene = async (
  client: ObsClient,
  input: SceneSchemas.RemoveSceneInput
): Promise<SceneSchemas.RemoveSceneOutput> => {
  const decodedInput = Schema.decodeUnknownSync(SceneSchemas.RemoveSceneInput)(input)
  const requestData = sceneLocatorRequestData(decodedInput)
  await client.request(RemoveSceneRequest, requestData)
  return Schema.decodeUnknownSync(SceneSchemas.RemoveSceneOutput)({ ...requestData, removed: true })
}

export const setSceneName = async (
  client: ObsClient,
  input: SceneSchemas.SetSceneNameInput
): Promise<SceneSchemas.SetSceneNameOutput> => {
  const decodedInput = Schema.decodeUnknownSync(SceneSchemas.SetSceneNameInput)(input)
  const locator = sceneLocatorRequestData(decodedInput)
  await client.request(SetSceneNameRequest, { ...locator, newSceneName: decodedInput.newSceneName })
  return Schema.decodeUnknownSync(SceneSchemas.SetSceneNameOutput)({
    ...locator,
    newSceneName: decodedInput.newSceneName,
    renamed: true
  })
}

export const getSceneTransitionOverride = async (
  client: ObsClient,
  input: SceneSchemas.GetSceneTransitionOverrideInput
): Promise<SceneSchemas.SceneTransitionOverrideOutput> => {
  const decodedInput = Schema.decodeUnknownSync(SceneSchemas.GetSceneTransitionOverrideInput)(input)
  return Schema.decodeUnknownSync(SceneSchemas.SceneTransitionOverrideOutput)(
    await client.request(GetSceneTransitionOverrideRequest, sceneLocatorRequestData(decodedInput))
  )
}

export const setSceneTransitionOverride = async (
  client: ObsClient,
  input: SceneSchemas.SetSceneTransitionOverrideInput
): Promise<SceneSchemas.SetSceneTransitionOverrideOutput> => {
  const decodedInput = Schema.decodeUnknownSync(SceneSchemas.SetSceneTransitionOverrideInput)(input)
  const requestData = {
    ...sceneLocatorRequestData(decodedInput),
    ...("transitionName" in decodedInput ? { transitionName: decodedInput.transitionName } : {}),
    ...("transitionDuration" in decodedInput ? { transitionDuration: decodedInput.transitionDuration } : {})
  }
  await client.request(SetSceneTransitionOverrideRequest, requestData)
  return Schema.decodeUnknownSync(SceneSchemas.SetSceneTransitionOverrideOutput)({ ...requestData, updated: true })
}

export const listSceneItems = async (
  client: ObsClient,
  input: SceneSchemas.ListSceneItemsInput
): Promise<SceneSchemas.ListSceneItemsOutput> => {
  const decodedInput = Schema.decodeUnknownSync(SceneSchemas.ListSceneItemsInput)(input)
  return Schema.decodeUnknownSync(SceneSchemas.ListSceneItemsOutput)(
    await client.request(GetSceneItemList, decodedInput)
  )
}

export const listGroupSceneItems = async (
  client: ObsClient,
  input: SceneSchemas.ListGroupSceneItemsInput
): Promise<SceneSchemas.ListGroupSceneItemsOutput> => {
  const decodedInput = Schema.decodeUnknownSync(SceneSchemas.ListGroupSceneItemsInput)(input)
  return Schema.decodeUnknownSync(SceneSchemas.ListGroupSceneItemsOutput)(
    await client.request(GetGroupSceneItemList, decodedInput)
  )
}

export const createSceneItem = async (
  client: ObsClient,
  input: SceneSchemas.CreateSceneItemInput
): Promise<SceneSchemas.CreateSceneItemOutput> => {
  const decodedInput = Schema.decodeUnknownSync(SceneSchemas.CreateSceneItemInput)(input)
  const response = await client.request(CreateSceneItem, decodedInput)
  return Schema.decodeUnknownSync(SceneSchemas.CreateSceneItemOutput)({
    ...decodedInput,
    sceneItemId: response.sceneItemId,
    created: true
  })
}

export const removeSceneItem = async (
  client: ObsClient,
  input: SceneSchemas.RemoveSceneItemInput
): Promise<SceneSchemas.RemoveSceneItemOutput> => {
  const decodedInput = Schema.decodeUnknownSync(SceneSchemas.RemoveSceneItemInput)(input)
  await client.request(RemoveSceneItem, decodedInput)
  return Schema.decodeUnknownSync(SceneSchemas.RemoveSceneItemOutput)({ ...decodedInput, removed: true })
}

export const duplicateSceneItem = async (
  client: ObsClient,
  input: SceneSchemas.DuplicateSceneItemInput
): Promise<SceneSchemas.DuplicateSceneItemOutput> => {
  const decodedInput = Schema.decodeUnknownSync(SceneSchemas.DuplicateSceneItemInput)(input)
  const response = await client.request(DuplicateSceneItem, decodedInput)
  return Schema.decodeUnknownSync(SceneSchemas.DuplicateSceneItemOutput)({
    ...decodedInput,
    sceneItemId: response.sceneItemId,
    duplicated: true
  })
}

export const getSceneItemId = async (
  client: ObsClient,
  input: SceneSchemas.GetSceneItemIdInput
): Promise<SceneSchemas.GetSceneItemIdOutput> => {
  const decodedInput = Schema.decodeUnknownSync(SceneSchemas.GetSceneItemIdInput)(input)
  return Schema.decodeUnknownSync(SceneSchemas.GetSceneItemIdOutput)(await client.request(GetSceneItemId, decodedInput))
}

export const getSceneItemSource = async (
  client: ObsClient,
  input: SceneSchemas.GetSceneItemSourceInput
): Promise<SceneSchemas.GetSceneItemSourceOutput> => {
  const decodedInput = Schema.decodeUnknownSync(SceneSchemas.GetSceneItemSourceInput)(input)
  return Schema.decodeUnknownSync(SceneSchemas.GetSceneItemSourceOutput)(
    await client.request(GetSceneItemSource, decodedInput)
  )
}

export const getSceneItemTransform = async (
  client: ObsClient,
  input: SceneSchemas.GetSceneItemTransformInput
): Promise<SceneSchemas.GetSceneItemTransformOutput> => {
  const decodedInput = Schema.decodeUnknownSync(SceneSchemas.GetSceneItemTransformInput)(input)
  return Schema.decodeUnknownSync(SceneSchemas.GetSceneItemTransformOutput)(
    await client.request(GetSceneItemTransform, decodedInput)
  )
}

export const setSceneItemTransform = async (
  client: ObsClient,
  input: SceneSchemas.SetSceneItemTransformInput
): Promise<SceneSchemas.SetSceneItemTransformOutput> => {
  const decodedInput = Schema.decodeUnknownSync(SceneSchemas.SetSceneItemTransformInput)(input)
  await client.request(SetSceneItemTransform, decodedInput)
  return Schema.decodeUnknownSync(SceneSchemas.SetSceneItemTransformOutput)({
    sceneItemTransform: decodedInput.sceneItemTransform,
    updated: true
  })
}

export const getSceneItemEnabled = async (
  client: ObsClient,
  input: SceneSchemas.GetSceneItemEnabledInput
): Promise<SceneSchemas.GetSceneItemEnabledOutput> => {
  const decodedInput = Schema.decodeUnknownSync(SceneSchemas.GetSceneItemEnabledInput)(input)
  return Schema.decodeUnknownSync(SceneSchemas.GetSceneItemEnabledOutput)(
    await client.request(GetSceneItemEnabled, decodedInput)
  )
}

export const setSceneItemEnabled = async (
  client: ObsClient,
  input: SceneSchemas.SetSceneItemEnabledInput
): Promise<SceneSchemas.SetSceneItemEnabledOutput> => {
  const decodedInput = Schema.decodeUnknownSync(SceneSchemas.SetSceneItemEnabledInput)(input)
  await client.request(SetSceneItemEnabled, decodedInput)
  return Schema.decodeUnknownSync(SceneSchemas.SetSceneItemEnabledOutput)({
    sceneItemEnabled: decodedInput.sceneItemEnabled,
    updated: true
  })
}

export const getSceneItemLocked = async (
  client: ObsClient,
  input: SceneSchemas.GetSceneItemLockedInput
): Promise<SceneSchemas.GetSceneItemLockedOutput> => {
  const decodedInput = Schema.decodeUnknownSync(SceneSchemas.GetSceneItemLockedInput)(input)
  return Schema.decodeUnknownSync(SceneSchemas.GetSceneItemLockedOutput)(
    await client.request(GetSceneItemLocked, decodedInput)
  )
}

export const setSceneItemLocked = async (
  client: ObsClient,
  input: SceneSchemas.SetSceneItemLockedInput
): Promise<SceneSchemas.SetSceneItemLockedOutput> => {
  const decodedInput = Schema.decodeUnknownSync(SceneSchemas.SetSceneItemLockedInput)(input)
  await client.request(SetSceneItemLocked, decodedInput)
  return Schema.decodeUnknownSync(SceneSchemas.SetSceneItemLockedOutput)({
    sceneItemLocked: decodedInput.sceneItemLocked,
    updated: true
  })
}

export const getSceneItemIndex = async (
  client: ObsClient,
  input: SceneSchemas.GetSceneItemIndexInput
): Promise<SceneSchemas.GetSceneItemIndexOutput> => {
  const decodedInput = Schema.decodeUnknownSync(SceneSchemas.GetSceneItemIndexInput)(input)
  return Schema.decodeUnknownSync(SceneSchemas.GetSceneItemIndexOutput)(
    await client.request(GetSceneItemIndex, decodedInput)
  )
}

export const getSceneItemBlendMode = async (
  client: ObsClient,
  input: SceneSchemas.GetSceneItemBlendModeInput
): Promise<SceneSchemas.GetSceneItemBlendModeOutput> => {
  const decodedInput = Schema.decodeUnknownSync(SceneSchemas.GetSceneItemBlendModeInput)(input)
  return Schema.decodeUnknownSync(SceneSchemas.GetSceneItemBlendModeOutput)(
    await client.request(GetSceneItemBlendMode, decodedInput)
  )
}

export const setSceneItemIndex = async (
  client: ObsClient,
  input: SceneSchemas.SetSceneItemIndexInput
): Promise<SceneSchemas.SetSceneItemIndexOutput> => {
  const decodedInput = Schema.decodeUnknownSync(SceneSchemas.SetSceneItemIndexInput)(input)
  await client.request(SetSceneItemIndex, decodedInput)
  return Schema.decodeUnknownSync(SceneSchemas.SetSceneItemIndexOutput)({
    sceneItemIndex: decodedInput.sceneItemIndex,
    updated: true
  })
}

export const setSceneItemBlendMode = async (
  client: ObsClient,
  input: SceneSchemas.SetSceneItemBlendModeInput
): Promise<SceneSchemas.SetSceneItemBlendModeOutput> => {
  const decodedInput = Schema.decodeUnknownSync(SceneSchemas.SetSceneItemBlendModeInput)(input)
  await client.request(SetSceneItemBlendMode, decodedInput)
  return Schema.decodeUnknownSync(SceneSchemas.SetSceneItemBlendModeOutput)({
    sceneItemBlendMode: decodedInput.sceneItemBlendMode,
    updated: true
  })
}

export const getSourceActive = async (
  client: ObsClient,
  input: SceneSchemas.GetSourceActiveInput
): Promise<SceneSchemas.GetSourceActiveOutput> => {
  const decodedInput = Schema.decodeUnknownSync(SceneSchemas.GetSourceActiveInput)(input)
  const response = await client.request(GetSourceActiveRequest, decodedInput)
  return Schema.decodeUnknownSync(SceneSchemas.GetSourceActiveOutput)({
    ...response,
    sourceName: response.sourceName ?? decodedInput.sourceName,
    sourceUuid: response.sourceUuid ?? decodedInput.sourceUuid
  })
}
