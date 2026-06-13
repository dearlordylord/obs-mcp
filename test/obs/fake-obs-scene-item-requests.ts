import { type FakeObsSceneItem, sceneItemsFor, sceneItemTransformFor } from "./fake-obs-fixtures.js"

type SendFakeObsResponse = (responseData?: Record<string, unknown>) => void
type SendFakeObsError = (code: number, comment: string) => void
export type FakeObsSceneItemTransforms = Map<string, Record<string, unknown>>
export type FakeObsSceneItems = Map<string, ReadonlyArray<FakeObsSceneItem>>
const INVALID_REQUEST_STATUS_CODE = 402
const RESOURCE_NOT_FOUND_STATUS_CODE = 600

const SettableSceneItemTransformFields = new Set([
  "alignment",
  "boundsAlignment",
  "boundsHeight",
  "boundsType",
  "boundsWidth",
  "cropBottom",
  "cropLeft",
  "cropRight",
  "cropTop",
  "cropToBounds",
  "positionX",
  "positionY",
  "rotation",
  "scaleX",
  "scaleY"
])

const sceneItemTransformKey = (requestData: {
  readonly sceneItemId?: number
  readonly sceneName?: string
  readonly sceneUuid?: string
}): string => `${requestData.sceneUuid ?? requestData.sceneName ?? "scene"}:${requestData.sceneItemId ?? 0}`

const sceneItemListKey = (requestData: {
  readonly sceneName?: string
  readonly sceneUuid?: string
}): string => requestData.sceneUuid ?? requestData.sceneName ?? "scene"

const sceneItemsForState = (
  requestData: { readonly sceneName?: string; readonly sceneUuid?: string },
  group: boolean,
  sceneItems: FakeObsSceneItems
): ReadonlyArray<FakeObsSceneItem> => {
  if (group || requestData.sceneName === "Group" || requestData.sceneUuid === "scene-group") {
    return sceneItemsFor(requestData, true)
  }
  const key = sceneItemListKey(requestData)
  const items = sceneItems.get(key) ?? sceneItemsFor(requestData, false)
  sceneItems.set(key, items)
  return items
}

const reindexSceneItems = (items: ReadonlyArray<FakeObsSceneItem>): ReadonlyArray<FakeObsSceneItem> =>
  items.map((item, sceneItemIndex) => ({ ...item, sceneItemIndex }))

export const handleFakeObsSceneItemReadRequest = (
  requestType: string,
  requestData: {
    readonly sceneItemId?: number
    readonly sceneName?: string
    readonly sceneUuid?: string
    readonly sourceName?: string
    readonly sourceUuid?: string
    readonly destinationSceneName?: string
    readonly destinationSceneUuid?: string
    readonly sceneItemEnabled?: boolean
    readonly sceneItemTransform?: Record<string, unknown>
  },
  send: SendFakeObsResponse,
  transforms: FakeObsSceneItemTransforms = new Map(),
  sendError: SendFakeObsError = () => undefined,
  sceneItems: FakeObsSceneItems = new Map()
): boolean => {
  if (requestType === "GetSceneItemList" || requestType === "GetGroupSceneItemList") {
    send({ sceneItems: sceneItemsForState(requestData, requestType === "GetGroupSceneItemList", sceneItems) })
    return true
  }
  if (requestType === "CreateSceneItem") {
    const key = sceneItemListKey(requestData)
    const items = sceneItemsForState(requestData, false, sceneItems)
    const sceneItemId = Math.max(0, ...items.map((item) => item.sceneItemId)) + 1
    sceneItems.set(
      key,
      reindexSceneItems([...items, {
        sceneItemId,
        sceneItemIndex: items.length,
        sourceName: requestData.sourceName ?? requestData.sourceUuid ?? "Source",
        sourceUuid: requestData.sourceUuid ?? `source-${sceneItemId}`,
        sceneItemEnabled: requestData.sceneItemEnabled ?? true,
        sceneItemLocked: false,
        sceneItemBlendMode: "OBS_BLEND_NORMAL"
      }])
    )
    send({ sceneItemId })
    return true
  }
  if (requestType === "RemoveSceneItem") {
    const key = sceneItemListKey(requestData)
    const items = sceneItemsForState(requestData, false, sceneItems)
    sceneItems.set(key, reindexSceneItems(items.filter((item) => item.sceneItemId !== requestData.sceneItemId)))
    send()
    return true
  }
  if (requestType === "DuplicateSceneItem") {
    const sourceItems = sceneItemsForState(requestData, false, sceneItems)
    const sourceItem = sourceItems.find((item) => item.sceneItemId === requestData.sceneItemId) ?? sourceItems[0]
    if (sourceItem === undefined) {
      sendError(RESOURCE_NOT_FOUND_STATUS_CODE, "Scene item not found")
      return true
    }
    const destinationData = requestData.destinationSceneUuid !== undefined
      ? { sceneUuid: requestData.destinationSceneUuid }
      : { sceneName: requestData.destinationSceneName ?? requestData.sceneName ?? "Intro" }
    const key = sceneItemListKey(destinationData)
    const destinationItems = sceneItemsForState(destinationData, false, sceneItems)
    const sceneItemId = Math.max(0, ...destinationItems.map((item) => item.sceneItemId)) + 1
    sceneItems.set(key, reindexSceneItems([...destinationItems, { ...sourceItem, sceneItemId }]))
    send({ sceneItemId })
    return true
  }
  if (requestType === "GetSceneItemId") {
    const sceneItem = sceneItemsForState(requestData, false, sceneItems)
      .find((item) => item.sourceName === requestData.sourceName)
    send({ sceneItemId: sceneItem?.sceneItemId ?? 0 })
    return true
  }
  if (requestType === "GetSceneItemSource") {
    const sceneItem = sceneItemsForState(requestData, false, sceneItems)
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
    const requestedTransform = requestData.sceneItemTransform ?? {}
    const nextTransform = Object.fromEntries(
      Object.entries(requestedTransform).filter(([field]) => SettableSceneItemTransformFields.has(field))
    )
    if (Object.keys(nextTransform).length === 0) {
      sendError(INVALID_REQUEST_STATUS_CODE, "No valid scene item transform fields")
      return true
    }
    const key = sceneItemTransformKey(requestData)
    transforms.set(key, {
      ...(transforms.get(key) ?? sceneItemTransformFor(requestData)),
      ...nextTransform
    })
    send()
    return true
  }
  return false
}
