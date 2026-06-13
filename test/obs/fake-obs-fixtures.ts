export interface FakeObsScene {
  readonly sceneName: string
  readonly sceneUuid?: string
  readonly sceneIndex: number
  readonly isGroup?: boolean
}

export interface FakeObsSceneItem {
  readonly sceneItemId: number
  readonly sceneItemIndex: number
  readonly sourceName: string
  readonly sourceUuid: string
  readonly sourceType?: string
  readonly inputKind?: string | null
  readonly isGroup?: boolean | null
}

export interface FakeObsInput {
  readonly inputName: string
  readonly inputUuid?: string
  readonly inputKind: string
  readonly unversionedInputKind: string
}

export interface FakeObsReceivedRequest {
  readonly requestType: string
  readonly requestData?: unknown
}

export const DEFAULT_SCENES: ReadonlyArray<FakeObsScene> = [
  { sceneName: "Intro", sceneUuid: "scene-intro", sceneIndex: 0 },
  { sceneName: "Main", sceneUuid: "scene-main", sceneIndex: 1 },
  { sceneName: "Group", sceneUuid: "scene-group", sceneIndex: 2, isGroup: true }
]

export const DEFAULT_INPUTS: ReadonlyArray<FakeObsInput> = [
  {
    inputName: "Desktop Audio",
    inputUuid: "input-desktop-audio",
    inputKind: "wasapi_output_capture",
    unversionedInputKind: "wasapi_output_capture"
  },
  {
    inputName: "Mic/Aux",
    inputUuid: "input-mic-aux",
    inputKind: "wasapi_input_capture",
    unversionedInputKind: "wasapi_input_capture"
  }
]

export const DEFAULT_AVAILABLE_REQUESTS = [
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
  "ToggleStream"
]

export const sceneItemsFor = (
  requestData: { readonly sceneName?: string; readonly sceneUuid?: string },
  group: boolean
): ReadonlyArray<FakeObsSceneItem> => {
  if (group || requestData.sceneName === "Group" || requestData.sceneUuid === "scene-group") {
    return [{ sceneItemId: 3, sceneItemIndex: 0, sourceName: "Nested", sourceUuid: "source-nested" }]
  }
  return [
    {
      sceneItemId: 7,
      sceneItemIndex: 0,
      sourceName: "Camera",
      sourceUuid: "source-camera",
      sourceType: "OBS_SOURCE_TYPE_INPUT",
      inputKind: "dshow_input",
      isGroup: null
    },
    {
      sceneItemId: 9,
      sceneItemIndex: 1,
      sourceName: "Lower Third",
      sourceUuid: "source-lower-third",
      sourceType: "OBS_SOURCE_TYPE_SCENE",
      inputKind: null,
      isGroup: true
    }
  ]
}
