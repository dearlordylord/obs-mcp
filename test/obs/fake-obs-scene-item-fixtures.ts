export interface FakeObsSceneItem {
  readonly sceneItemId: number
  readonly sceneItemIndex: number
  readonly sourceName: string
  readonly sourceUuid: string
  readonly sourceType?: string
  readonly inputKind?: string | null
  readonly isGroup?: boolean | null
  readonly sceneItemEnabled?: boolean
  readonly sceneItemLocked?: boolean
  readonly sceneItemBlendMode?: string
}

export const sceneItemsFor = (
  requestData: { readonly sceneName?: string; readonly sceneUuid?: string },
  group: boolean
): ReadonlyArray<FakeObsSceneItem> => {
  if (group || requestData.sceneName === "Group" || requestData.sceneUuid === "scene-group") {
    return [{
      sceneItemId: 3,
      sceneItemIndex: 0,
      sourceName: "Nested",
      sourceUuid: "source-nested",
      sceneItemBlendMode: "OBS_BLEND_NORMAL"
    }]
  }
  return [
    {
      sceneItemId: 7,
      sceneItemIndex: 0,
      sourceName: "Camera",
      sourceUuid: "source-camera",
      sourceType: "OBS_SOURCE_TYPE_INPUT",
      inputKind: "dshow_input",
      isGroup: null,
      sceneItemEnabled: true,
      sceneItemLocked: false,
      sceneItemBlendMode: "OBS_BLEND_NORMAL"
    },
    {
      sceneItemId: 9,
      sceneItemIndex: 1,
      sourceName: "Lower Third",
      sourceUuid: "source-lower-third",
      sourceType: "OBS_SOURCE_TYPE_SCENE",
      inputKind: null,
      isGroup: true,
      sceneItemEnabled: false,
      sceneItemLocked: true,
      sceneItemBlendMode: "OBS_BLEND_MULTIPLY"
    }
  ]
}

/* eslint-disable no-magic-numbers */
export const sceneItemTransformFor = (
  requestData: { readonly sceneItemId?: number }
): Record<string, unknown> => ({
  alignment: 5,
  boundsAlignment: 5,
  boundsHeight: requestData.sceneItemId === 9 ? 120 : 0,
  boundsType: requestData.sceneItemId === 9 ? "OBS_BOUNDS_SCALE_INNER" : "OBS_BOUNDS_NONE",
  boundsWidth: requestData.sceneItemId === 9 ? 640 : 0,
  cropBottom: requestData.sceneItemId === 9 ? 4 : 0,
  cropLeft: requestData.sceneItemId === 9 ? 8 : 0,
  cropRight: 0,
  cropTop: 0,
  cropToBounds: requestData.sceneItemId === 9,
  height: requestData.sceneItemId === 9 ? 120 : 720,
  positionX: requestData.sceneItemId === 9 ? 64.5 : 0,
  positionY: requestData.sceneItemId === 9 ? 512.25 : 0,
  rotation: requestData.sceneItemId === 9 ? 0.5 : 0,
  scaleX: requestData.sceneItemId === 9 ? 0.5 : 1,
  scaleY: requestData.sceneItemId === 9 ? 0.5 : 1,
  sourceHeight: requestData.sceneItemId === 9 ? 240 : 720,
  sourceWidth: requestData.sceneItemId === 9 ? 1280 : 1280,
  width: requestData.sceneItemId === 9 ? 640 : 1280
})
/* eslint-enable no-magic-numbers */
