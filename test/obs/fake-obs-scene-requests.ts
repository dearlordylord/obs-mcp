import type { FakeObsScene } from "./fake-obs-fixtures.js"

interface FakeObsSceneLifecycleResult {
  readonly handled: boolean
  readonly responseData?: Record<string, unknown>
  readonly error?: {
    readonly code: number
    readonly comment: string
  }
  readonly currentSceneName?: string
  readonly currentPreviewSceneName?: string
}

interface FakeObsSceneLifecycleRequestData {
  readonly sceneName?: string
  readonly sceneUuid?: string
  readonly newSceneName?: string
}

const SceneNotFoundError = { code: 601, comment: "Scene not found" } as const
const SceneAlreadyExistsError = { code: 601, comment: "Scene already exists" } as const

const reindexScenes = (scenes: Array<FakeObsScene>): void => {
  scenes.splice(0, scenes.length, ...scenes.map((scene, sceneIndex) => ({ ...scene, sceneIndex })))
}

const findSceneIndex = (
  scenes: ReadonlyArray<FakeObsScene>,
  requestData: FakeObsSceneLifecycleRequestData
): number =>
  scenes.findIndex((scene) => scene.sceneName === requestData.sceneName || scene.sceneUuid === requestData.sceneUuid)

export const handleFakeObsSceneLifecycleRequest = (
  requestType: string,
  requestData: FakeObsSceneLifecycleRequestData,
  scenes: Array<FakeObsScene>,
  currentSceneName: string,
  currentPreviewSceneName: string
): FakeObsSceneLifecycleResult => {
  if (requestType === "CreateScene") {
    if (scenes.some((scene) => scene.sceneName === requestData.sceneName)) {
      return { handled: true, error: SceneAlreadyExistsError }
    }
    const sceneName = requestData.sceneName ?? "Scene"
    const sceneUuid = `scene-${sceneName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`
    scenes.push({ sceneName, sceneUuid, sceneIndex: scenes.length })
    return { handled: true, responseData: { sceneUuid } }
  }

  if (requestType === "RemoveScene") {
    const sceneIndex = findSceneIndex(scenes, requestData)
    if (sceneIndex < 0) return { handled: true, error: SceneNotFoundError }
    const [removedScene] = scenes.splice(sceneIndex, 1)
    reindexScenes(scenes)
    return {
      handled: true,
      currentSceneName: removedScene?.sceneName === currentSceneName
        ? scenes[0]?.sceneName ?? "Intro"
        : currentSceneName,
      currentPreviewSceneName: removedScene?.sceneName === currentPreviewSceneName
        ? scenes[0]?.sceneName ?? "Intro"
        : currentPreviewSceneName
    }
  }

  if (requestType === "SetSceneName") {
    const sceneIndex = findSceneIndex(scenes, requestData)
    if (sceneIndex < 0) return { handled: true, error: SceneNotFoundError }
    if (scenes.some((scene, index) => index !== sceneIndex && scene.sceneName === requestData.newSceneName)) {
      return { handled: true, error: SceneAlreadyExistsError }
    }
    const scene = scenes[sceneIndex]
    if (scene === undefined) return { handled: true, error: SceneNotFoundError }
    const previousName = scene.sceneName
    const newSceneName = requestData.newSceneName ?? previousName
    scenes[sceneIndex] = { ...scene, sceneName: newSceneName }
    return {
      handled: true,
      currentSceneName: currentSceneName === previousName ? newSceneName : currentSceneName,
      currentPreviewSceneName: currentPreviewSceneName === previousName ? newSceneName : currentPreviewSceneName
    }
  }

  return { handled: false }
}
