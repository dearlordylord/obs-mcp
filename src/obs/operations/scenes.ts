import { Schema } from "effect"

import {
  CurrentSceneOutput,
  ListScenesInput,
  ListScenesOutput,
  SetCurrentSceneInput,
  SetCurrentSceneOutput
} from "../../domain/schemas/scenes.js"
import type { ObsClient } from "../client.js"
import { GetCurrentProgramScene, GetSceneList, SetCurrentProgramScene } from "../requests.js"

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
