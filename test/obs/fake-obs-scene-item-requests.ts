import { sceneItemsFor, sceneItemTransformFor } from "./fake-obs-fixtures.js"

type SendFakeObsResponse = (responseData?: Record<string, unknown>) => void
export type FakeObsSceneItemTransforms = Map<string, Record<string, unknown>>

const sceneItemTransformKey = (requestData: {
  readonly sceneItemId?: number
  readonly sceneName?: string
  readonly sceneUuid?: string
}): string => `${requestData.sceneUuid ?? requestData.sceneName ?? "scene"}:${requestData.sceneItemId ?? 0}`

export const handleFakeObsSceneItemReadRequest = (
  requestType: string,
  requestData: {
    readonly sceneItemId?: number
    readonly sceneName?: string
    readonly sceneUuid?: string
    readonly sourceName?: string
    readonly sceneItemTransform?: Record<string, unknown>
  },
  send: SendFakeObsResponse,
  transforms: FakeObsSceneItemTransforms = new Map()
): boolean => {
  if (requestType === "GetSceneItemId") {
    const sceneItem = sceneItemsFor(requestData, false)
      .find((item) => item.sourceName === requestData.sourceName)
    send({ sceneItemId: sceneItem?.sceneItemId ?? 0 })
    return true
  }
  if (requestType === "GetSceneItemSource") {
    const sceneItem = sceneItemsFor(requestData, false)
      .find((item) => item.sceneItemId === requestData.sceneItemId)
    send({ sourceName: sceneItem?.sourceName ?? "Camera", sourceUuid: sceneItem?.sourceUuid ?? "source-camera" })
    return true
  }
  if (requestType === "GetSceneItemTransform") {
    const key = sceneItemTransformKey(requestData)
    const transform = transforms.get(key) ?? sceneItemTransformFor(requestData)
    transforms.set(key, transform)
    send({ sceneItemTransform: transform })
    return true
  }
  if (requestType === "SetSceneItemTransform") {
    const key = sceneItemTransformKey(requestData)
    transforms.set(key, {
      ...(transforms.get(key) ?? sceneItemTransformFor(requestData)),
      ...(requestData.sceneItemTransform ?? {})
    })
    send()
    return true
  }
  return false
}
