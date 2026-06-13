import { Schema } from "effect"

import {
  CurrentSceneOutput,
  GetSceneItemIdInput,
  GetSceneItemIdOutput,
  GetSceneItemSourceInput,
  GetSceneItemSourceOutput,
  ListGroupSceneItemsInput,
  ListGroupSceneItemsOutput,
  ListSceneItemsInput,
  ListSceneItemsOutput,
  ListScenesInput,
  ListScenesOutput,
  SetCurrentSceneInput,
  SetCurrentSceneOutput
} from "../../domain/schemas/scenes.js"
import type { ObsClient } from "../client.js"
import {
  GetCurrentProgramScene,
  GetGroupSceneItemList,
  GetSceneItemId,
  GetSceneItemList,
  GetSceneItemSource,
  GetSceneList,
  SetCurrentProgramScene
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
