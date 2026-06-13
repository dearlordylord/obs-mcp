import { sceneItemsFor, sceneItemTransformFor } from "./fake-obs-fixtures.js"

type SendFakeObsResponse = (responseData?: Record<string, unknown>) => void

export const handleFakeObsSceneItemReadRequest = (
  requestType: string,
  requestData: {
    readonly sceneItemId?: number
    readonly sceneName?: string
    readonly sceneUuid?: string
    readonly sourceName?: string
  },
  send: SendFakeObsResponse
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
    send({ sceneItemTransform: sceneItemTransformFor(requestData) })
    return true
  }
  return false
}
