export interface FakeObsScene {
  readonly sceneName: string
  readonly sceneUuid?: string
  readonly sceneIndex: number
  readonly isGroup?: boolean
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
  readonly inputAudioSyncOffset?: number
  readonly inputAudioTracks?: FakeObsInputAudioTracks
  readonly inputDeinterlaceMode?: FakeObsInputDeinterlaceMode
  readonly inputDeinterlaceFieldOrder?: FakeObsInputDeinterlaceFieldOrder
  readonly mediaState?: FakeObsMediaState
  readonly mediaDuration?: number | null
  readonly mediaCursor?: number | null
}

export interface FakeObsCanvas {
  readonly canvasName?: string
  readonly canvasUuid?: string
  readonly canvasIndex?: number
  readonly width?: number
  readonly height?: number
}

export interface FakeObsTransition {
  readonly transitionName: string
  readonly transitionUuid?: string
  readonly transitionKind: string
  readonly transitionFixed?: boolean
  readonly transitionDuration?: number | null
  readonly transitionConfigurable?: boolean
  readonly transitionSettings?: Readonly<Record<string, unknown>> | null
}

export interface FakeObsProfileParameter {
  readonly parameterCategory: string
  readonly parameterName: string
  readonly parameterValue: string | null
  readonly defaultParameterValue: string | null
}

export interface FakeObsInputVolume {
  readonly inputVolumeMul: number
  readonly inputVolumeDb: number
}

export const DEFAULT_INPUT_VOLUME: FakeObsInputVolume = { inputVolumeMul: 1, inputVolumeDb: 0 }
const DecibelAmplitudeBase = 10
const DecibelsPerAmplitudeLogUnit = 20
const SilentInputVolumeDb = -100

export const fakeInputVolumeFromRequest = (
  requestData: { readonly inputVolumeMul?: number; readonly inputVolumeDb?: number }
): FakeObsInputVolume =>
  requestData.inputVolumeMul === undefined
    ? {
      inputVolumeMul: DecibelAmplitudeBase ** (
        (requestData.inputVolumeDb ?? 0) / DecibelsPerAmplitudeLogUnit
      ),
      inputVolumeDb: requestData.inputVolumeDb ?? 0
    }
    : {
      inputVolumeMul: requestData.inputVolumeMul,
      inputVolumeDb: requestData.inputVolumeMul === 0
        ? SilentInputVolumeDb
        : DecibelsPerAmplitudeLogUnit * Math.log10(requestData.inputVolumeMul)
    }

export type FakeObsInputAudioMonitorType =
  | "OBS_MONITORING_TYPE_NONE"
  | "OBS_MONITORING_TYPE_MONITOR_ONLY"
  | "OBS_MONITORING_TYPE_MONITOR_AND_OUTPUT"

export interface FakeObsInputAudioState {
  readonly inputAudioBalance: number
  readonly monitorType: FakeObsInputAudioMonitorType
  readonly inputAudioSyncOffset: number
  readonly inputAudioTracks: FakeObsInputAudioTracks
}

export interface FakeObsInputAudioTracks {
  readonly "1": boolean
  readonly "2": boolean
  readonly "3": boolean
  readonly "4": boolean
  readonly "5": boolean
  readonly "6": boolean
}

export const DEFAULT_INPUT_AUDIO_TRACKS: FakeObsInputAudioTracks = {
  "1": true,
  "2": true,
  "3": true,
  "4": true,
  "5": true,
  "6": true
}

export const DEFAULT_INPUT_AUDIO_STATE: FakeObsInputAudioState = {
  inputAudioBalance: 0.5,
  monitorType: "OBS_MONITORING_TYPE_NONE",
  inputAudioSyncOffset: 0,
  inputAudioTracks: DEFAULT_INPUT_AUDIO_TRACKS
}

export type FakeObsInputDeinterlaceMode =
  | "OBS_DEINTERLACE_MODE_DISABLE"
  | "OBS_DEINTERLACE_MODE_DISCARD"
  | "OBS_DEINTERLACE_MODE_RETRO"
  | "OBS_DEINTERLACE_MODE_BLEND"
  | "OBS_DEINTERLACE_MODE_BLEND_2X"
  | "OBS_DEINTERLACE_MODE_LINEAR"
  | "OBS_DEINTERLACE_MODE_LINEAR_2X"
  | "OBS_DEINTERLACE_MODE_YADIF"
  | "OBS_DEINTERLACE_MODE_YADIF_2X"

export type FakeObsInputDeinterlaceFieldOrder =
  | "OBS_DEINTERLACE_FIELD_ORDER_TOP"
  | "OBS_DEINTERLACE_FIELD_ORDER_BOTTOM"

export interface FakeObsInputDeinterlaceState {
  readonly inputDeinterlaceMode: FakeObsInputDeinterlaceMode
  readonly inputDeinterlaceFieldOrder: FakeObsInputDeinterlaceFieldOrder
}

export const DEFAULT_INPUT_DEINTERLACE_STATE: FakeObsInputDeinterlaceState = {
  inputDeinterlaceMode: "OBS_DEINTERLACE_MODE_DISABLE",
  inputDeinterlaceFieldOrder: "OBS_DEINTERLACE_FIELD_ORDER_TOP"
}

export type FakeObsMediaState =
  | "OBS_MEDIA_STATE_NONE"
  | "OBS_MEDIA_STATE_PLAYING"
  | "OBS_MEDIA_STATE_OPENING"
  | "OBS_MEDIA_STATE_BUFFERING"
  | "OBS_MEDIA_STATE_PAUSED"
  | "OBS_MEDIA_STATE_STOPPED"
  | "OBS_MEDIA_STATE_ENDED"
  | "OBS_MEDIA_STATE_ERROR"

export interface FakeObsMediaInputStatus {
  readonly mediaState: FakeObsMediaState
  readonly mediaDuration: number | null
  readonly mediaCursor: number | null
}

export type FakeObsMediaInputAction =
  | "OBS_WEBSOCKET_MEDIA_INPUT_ACTION_NONE"
  | "OBS_WEBSOCKET_MEDIA_INPUT_ACTION_PLAY"
  | "OBS_WEBSOCKET_MEDIA_INPUT_ACTION_PAUSE"
  | "OBS_WEBSOCKET_MEDIA_INPUT_ACTION_STOP"
  | "OBS_WEBSOCKET_MEDIA_INPUT_ACTION_RESTART"
  | "OBS_WEBSOCKET_MEDIA_INPUT_ACTION_NEXT"
  | "OBS_WEBSOCKET_MEDIA_INPUT_ACTION_PREVIOUS"

export const DEFAULT_MEDIA_INPUT_STATUS: FakeObsMediaInputStatus = {
  mediaState: "OBS_MEDIA_STATE_STOPPED",
  mediaDuration: null,
  mediaCursor: null
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

export const DEFAULT_CANVASES: ReadonlyArray<FakeObsCanvas> = [
  {
    canvasName: "Main Canvas",
    canvasUuid: "canvas-main",
    canvasIndex: 0,
    width: 1920,
    height: 1080
  },
  {
    canvasName: "Vertical Canvas",
    canvasUuid: "canvas-vertical",
    canvasIndex: 1,
    width: 1080,
    height: 1920
  }
]

export const DEFAULT_TRANSITIONS: ReadonlyArray<FakeObsTransition> = [
  {
    transitionName: "Cut",
    transitionUuid: "transition-cut",
    transitionKind: "cut_transition",
    transitionFixed: true,
    transitionDuration: null,
    transitionConfigurable: false,
    transitionSettings: null
  },
  {
    transitionName: "Fade",
    transitionUuid: "transition-fade",
    transitionKind: "fade_transition",
    transitionFixed: false,
    transitionDuration: 300,
    transitionConfigurable: true,
    transitionSettings: { color: "black" }
  }
]

export const DEFAULT_HOTKEYS: ReadonlyArray<string> = [
  "OBSBasic.StartRecording",
  "OBSBasic.StopRecording",
  "OBSBasic.Transition"
]

export const DEFAULT_PROFILES: ReadonlyArray<string> = ["Untitled", "Production"]
export const DEFAULT_SCENE_COLLECTIONS: ReadonlyArray<string> = ["Main Scenes", "Backup Scenes"]
export const DEFAULT_PROFILE_PARAMETERS: ReadonlyArray<FakeObsProfileParameter> = [
  {
    parameterCategory: "Output",
    parameterName: "Mode",
    parameterValue: "Advanced",
    defaultParameterValue: "Simple"
  },
  {
    parameterCategory: "SimpleOutput",
    parameterName: "VBitrate",
    parameterValue: null,
    defaultParameterValue: "2500"
  }
]
export const DEFAULT_RECORD_DIRECTORY = "/opaque/obs-recordings"

export const DEFAULT_AVAILABLE_REQUESTS = [
  "GetVersion",
  "GetStats",
  "GetHotkeyList",
  "TriggerHotkeyByName",
  "TriggerHotkeyByKeySequence",
  "GetProfileList",
  "GetSceneCollectionList",
  "GetProfileParameter",
  "GetRecordDirectory",
  "SetRecordDirectory",
  "GetVideoSettings",
  "SetVideoSettings",
  "GetStreamServiceSettings",
  "SetStreamServiceSettings",
  "SetCurrentProfile",
  "CreateProfile",
  "RemoveProfile",
  "SetCurrentSceneCollection",
  "CreateSceneCollection",
  "SetProfileParameter",
  "GetCanvasList",
  "GetTransitionKindList",
  "GetSceneTransitionList",
  "GetCurrentSceneTransition",
  "GetCurrentSceneTransitionCursor",
  "SetCurrentSceneTransition",
  "SetCurrentSceneTransitionDuration",
  "SetCurrentSceneTransitionSettings",
  "TriggerStudioModeTransition",
  "SetTBarPosition",
  "GetSceneList",
  "GetGroupList",
  "GetCurrentProgramScene",
  "GetCurrentPreviewScene",
  "SetCurrentProgramScene",
  "SetCurrentPreviewScene",
  "CreateScene",
  "RemoveScene",
  "SetSceneName",
  "GetSceneSceneTransitionOverride",
  "SetSceneSceneTransitionOverride",
  "GetSceneItemList",
  "GetGroupSceneItemList",
  "CreateSceneItem",
  "RemoveSceneItem",
  "DuplicateSceneItem",
  "GetSceneItemId",
  "GetSceneItemSource",
  "GetSceneItemTransform",
  "SetSceneItemTransform",
  "GetSceneItemEnabled",
  "SetSceneItemEnabled",
  "GetSceneItemLocked",
  "SetSceneItemLocked",
  "GetSceneItemIndex",
  "GetSceneItemBlendMode",
  "SetSceneItemIndex",
  "SetSceneItemBlendMode",
  "GetSourceActive",
  "GetSourceScreenshot",
  "SaveSourceScreenshot",
  "GetSourceFilterKindList",
  "GetSourceFilterList",
  "GetSourceFilterDefaultSettings",
  "GetSourceFilter",
  "CreateSourceFilter",
  "RemoveSourceFilter",
  "SetSourceFilterSettings",
  "SetSourceFilterEnabled",
  "SetSourceFilterIndex",
  "SetSourceFilterName",
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
  "GetInputAudioSyncOffset",
  "SetInputAudioSyncOffset",
  "GetInputAudioTracks",
  "SetInputAudioTracks",
  "GetInputDeinterlaceMode",
  "SetInputDeinterlaceMode",
  "GetInputDeinterlaceFieldOrder",
  "SetInputDeinterlaceFieldOrder",
  "GetInputDefaultSettings",
  "GetInputSettings",
  "GetInputPropertiesListPropertyItems",
  "SetInputSettings",
  "PressInputPropertiesButton",
  "CreateInput",
  "RemoveInput",
  "SetInputName",
  "GetMediaInputStatus",
  "SetMediaInputCursor",
  "OffsetMediaInputCursor",
  "TriggerMediaInputAction",
  "GetVirtualCamStatus",
  "GetOutputList",
  "GetOutputStatus",
  "GetOutputSettings",
  "SetOutputSettings",
  "StartOutput",
  "StopOutput",
  "ToggleOutput",
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
  "SendStreamCaption",
  "GetStudioModeEnabled",
  "SetStudioModeEnabled",
  "OpenInputPropertiesDialog",
  "OpenInputFiltersDialog",
  "OpenInputInteractDialog",
  "GetMonitorList",
  "OpenVideoMixProjector",
  "OpenSourceProjector",
  "GetPersistentData",
  "SetPersistentData",
  "CallVendorRequest",
  "BroadcastCustomEvent",
  "Sleep"
]
