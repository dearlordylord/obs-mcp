import { Schema } from "effect"

import {
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
  ListGroupSceneItemsInput,
  ListGroupSceneItemsOutput,
  ListSceneItemsInput,
  ListSceneItemsOutput,
  ListScenesInput,
  ListScenesOutput,
  SetCurrentSceneInput,
  SetCurrentSceneOutput,
  SetSceneItemEnabledInput,
  SetSceneItemEnabledOutput,
  SetSceneItemLockedInput,
  SetSceneItemLockedOutput
} from "../../domain/schemas/scenes.js"
import type { ObsClient } from "../client.js"
import {
  GetCurrentProgramScene,
  GetGroupSceneItemList,
  GetSceneItemBlendMode,
  GetSceneItemEnabled,
  GetSceneItemId,
  GetSceneItemIndex,
  GetSceneItemList,
  GetSceneItemLocked,
  GetSceneItemSource,
  GetSceneList,
  SetCurrentProgramScene,
  SetSceneItemEnabled,
  SetSceneItemLocked
} from "../requests.js"

export const listScenes = async (client: ObsClient, input: ListScenesInput): Promise<ListScenesOutput> => {
  const decodedInput = Schema.decodeUnknownSync(ListScenesInput)(input)
  const response = await client.request(GetSceneList)
  const scenes = decodedInput.includeGroups
    ? response.scenes
    : response.scenes.filter((scene) => scene.isGroup !== true)
  return Schema.decodeUnknownSync(ListScenesOutput)({ ...response, scenes })
}

export const getCurrentScene = async (client: ObsClient): Promise<CurrentSceneOutput> => {
  const response = await client.request(GetCurrentProgramScene)
  const sceneName = response.sceneName ?? response.currentProgramSceneName
  if (sceneName === undefined) {
    throw new Error("OBS did not return a current program scene name")
  }
  return Schema.decodeUnknownSync(CurrentSceneOutput)({
    sceneName,
    sceneUuid: response.sceneUuid ?? response.currentProgramSceneUuid
  })
}

export const setCurrentScene = async (
  client: ObsClient,
  input: SetCurrentSceneInput
): Promise<SetCurrentSceneOutput> => {
  const decodedInput = Schema.decodeUnknownSync(SetCurrentSceneInput)(input)
  await client.request(SetCurrentProgramScene, { sceneName: decodedInput.sceneName })
  return Schema.decodeUnknownSync(SetCurrentSceneOutput)({ sceneName: decodedInput.sceneName, switched: true })
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
