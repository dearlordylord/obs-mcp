import { Schema } from "effect"

export const ObsRequestType = Schema.Literal(
  "GetVersion",
  "GetStats",
  "GetSceneList",
  "GetCurrentProgramScene",
  "SetCurrentProgramScene",
  "GetSceneItemList",
  "GetGroupSceneItemList",
  "GetSceneItemId",
  "GetSceneItemSource",
  "GetSceneItemEnabled",
  "SetSceneItemEnabled",
  "GetSceneItemLocked",
  "SetSceneItemLocked",
  "GetSceneItemIndex",
  "GetSceneItemBlendMode",
  "SetSceneItemIndex",
  "SetSceneItemBlendMode",
  "GetSourceActive",
  "GetInputList",
  "GetInputKindList",
  "GetSpecialInputs",
  "GetVirtualCamStatus",
  "StartVirtualCam",
  "StopVirtualCam",
  "ToggleVirtualCam",
  "GetRecordStatus",
  "PauseRecord",
  "ResumeRecord",
  "ToggleRecordPause",
  "GetStreamStatus",
  "StartStream",
  "StopStream",
  "ToggleStream"
)
export type ObsRequestType = typeof ObsRequestType.Type

export * from "./requests/general.js"
export * from "./requests/inputs.js"
export * from "./requests/outputs.js"
export * from "./requests/record.js"
export * from "./requests/scenes.js"
export type { ObsRequestDescriptor } from "./requests/shared.js"
export * from "./requests/stream.js"
