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
  readonly inputMuted?: boolean
  readonly inputVolumeMul?: number
  readonly inputVolumeDb?: number
  readonly inputAudioBalance?: number
  readonly monitorType?: FakeObsInputAudioMonitorType
}

export interface FakeObsInputVolume {
  readonly inputVolumeMul: number
  readonly inputVolumeDb: number
}

export const DEFAULT_INPUT_VOLUME: FakeObsInputVolume = { inputVolumeMul: 1, inputVolumeDb: 0 }

export const fakeInputVolumeFromRequest = (
  requestData: { readonly inputVolumeMul?: number; readonly inputVolumeDb?: number }
): FakeObsInputVolume =>
  requestData.inputVolumeMul === undefined
    ? { inputVolumeMul: 10 ** ((requestData.inputVolumeDb ?? 0) / 20), inputVolumeDb: requestData.inputVolumeDb ?? 0 }
    : {
      inputVolumeMul: requestData.inputVolumeMul,
      inputVolumeDb: requestData.inputVolumeMul === 0 ? -100 : 20 * Math.log10(requestData.inputVolumeMul)
    }

export type FakeObsInputAudioMonitorType =
  | "OBS_MONITORING_TYPE_NONE"
  | "OBS_MONITORING_TYPE_MONITOR_ONLY"
  | "OBS_MONITORING_TYPE_MONITOR_AND_OUTPUT"

export interface FakeObsInputAudioState {
  readonly inputAudioBalance: number
  readonly monitorType: FakeObsInputAudioMonitorType
}

export const DEFAULT_INPUT_AUDIO_STATE: FakeObsInputAudioState = {
  inputAudioBalance: 0.5,
  monitorType: "OBS_MONITORING_TYPE_NONE"
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
  "GetInputMute",
  "SetInputMute",
  "ToggleInputMute",
  "GetInputVolume",
  "SetInputVolume",
  "GetInputAudioBalance",
  "SetInputAudioBalance",
  "GetInputAudioMonitorType",
  "SetInputAudioMonitorType",
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
