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
  "GetInputList",
  "GetInputKindList",
  "GetSpecialInputs",
  "GetVirtualCamStatus",
  "StartVirtualCam",
  "StopVirtualCam",
  "ToggleVirtualCam",
  "GetReplayBufferStatus",
  "StartReplayBuffer",
  "StopReplayBuffer",
  "ToggleReplayBuffer",
  "SaveReplayBuffer",
  "GetLastReplayBufferReplay",
  "GetRecordStatus",
  "StartRecord",
  "StopRecord",
  "ToggleRecord",
  "SplitRecordFile",
  "CreateRecordChapter",
  "PauseRecord",
  "ResumeRecord",
  "ToggleRecordPause",
  "GetStreamStatus",
  "StartStream",
  "StopStream",
  "ToggleStream",
  "SendStreamCaption"
)
export type ObsRequestType = typeof ObsRequestType.Type

export * from "./requests/general.js"
export * from "./requests/inputs.js"
export * from "./requests/outputs.js"
export * from "./requests/record.js"
export * from "./requests/scenes.js"
export type { ObsRequestDescriptor } from "./requests/shared.js"
export * from "./requests/stream.js"
