import type {
  FakeObsInputAudioMonitorType,
  FakeObsInputAudioTracks,
  FakeObsInputDeinterlaceFieldOrder,
  FakeObsInputDeinterlaceMode,
  FakeObsMediaInputAction
} from "./fake-obs-fixtures.js"
import type { FakeObsInputState } from "./fake-obs-input-state.js"

type SendFakeObsResponse = (responseData?: Record<string, unknown>) => void

interface FakeObsInputRequestContext {
  readonly inputName?: string
  readonly inputUuid?: string
  readonly inputKind?: string
  readonly propertyName?: string
  readonly inputMuted?: boolean
  readonly inputVolumeMul?: number
  readonly inputVolumeDb?: number
  readonly inputAudioBalance?: number
  readonly monitorType?: FakeObsInputAudioMonitorType
  readonly inputAudioSyncOffset?: number
  readonly inputAudioTracks?: FakeObsInputAudioTracks
  readonly inputDeinterlaceMode?: FakeObsInputDeinterlaceMode
  readonly inputDeinterlaceFieldOrder?: FakeObsInputDeinterlaceFieldOrder
  readonly mediaCursor?: number
  readonly mediaCursorOffset?: number
  readonly mediaAction?: FakeObsMediaInputAction
}

const inputLocator = (requestData: FakeObsInputRequestContext): string =>
  requestData.inputName ?? requestData.inputUuid ?? ""

export const handleFakeObsInputRequest = (
  inputState: FakeObsInputState,
  requestType: string,
  requestData: FakeObsInputRequestContext,
  send: SendFakeObsResponse
): boolean => {
  if (requestType === "GetInputMute") {
    send({ inputMuted: inputState.getMute(inputLocator(requestData)) })
    return true
  }
  if (requestType === "SetInputMute") {
    inputState.setMute(inputLocator(requestData), requestData.inputMuted === true)
    send()
    return true
  }
  if (requestType === "ToggleInputMute") {
    send({ inputMuted: inputState.toggleMute(inputLocator(requestData)) })
    return true
  }
  if (requestType === "GetInputVolume") {
    send({ ...inputState.getVolume(inputLocator(requestData)) })
    return true
  }
  if (requestType === "SetInputVolume") {
    inputState.setVolume(inputLocator(requestData), requestData)
    send()
    return true
  }
  if (
    requestType === "GetInputAudioBalance"
    || requestType === "GetInputAudioMonitorType"
    || requestType === "GetInputAudioSyncOffset"
    || requestType === "GetInputAudioTracks"
  ) {
    send(inputState.audioResponseFor(requestType, inputLocator(requestData)))
    return true
  }
  if (
    requestType === "SetInputAudioBalance"
    || requestType === "SetInputAudioMonitorType"
    || requestType === "SetInputAudioSyncOffset"
    || requestType === "SetInputAudioTracks"
  ) {
    inputState.setAudioFromRequest(requestType, inputLocator(requestData), requestData)
    send()
    return true
  }
  if (requestType === "GetInputDeinterlaceMode" || requestType === "GetInputDeinterlaceFieldOrder") {
    send(inputState.deinterlaceResponseFor(requestType, inputLocator(requestData)))
    return true
  }
  if (requestType === "SetInputDeinterlaceMode" || requestType === "SetInputDeinterlaceFieldOrder") {
    inputState.setDeinterlaceFromRequest(requestType, inputLocator(requestData), requestData)
    send()
    return true
  }
  if (requestType === "GetInputDefaultSettings") {
    send({
      defaultInputSettings: {
        active: true,
        choices: ["primary", "secondary"],
        device_id: `${requestData.inputKind ?? "input"}-default-device`,
        empty_value: null,
        reconnect_delay_sec: 5,
        nested_policy: { omitted: true }
      }
    })
    return true
  }
  if (requestType === "GetInputSettings") {
    send({
      inputKind: "wasapi_input_capture",
      inputSettings: {
        device_id: "mic-aux-device",
        muted_by_default: false,
        reconnect_delay_sec: 10,
        nested_policy: { omitted: true }
      }
    })
    return true
  }
  if (requestType === "GetInputPropertiesListPropertyItems") {
    send({
      propertyItems: [
        { itemName: "Primary", itemValue: "primary-device", itemEnabled: true, metadata: { omitted: true } },
        { itemName: "Secondary", itemValue: 2, itemEnabled: false },
        { metadata: { omitted: true } }
      ]
    })
    return true
  }
  if (requestType === "GetMediaInputStatus") {
    send({ ...inputState.getMediaStatus(inputLocator(requestData)) })
    return true
  }
  if (requestType === "SetMediaInputCursor" || requestType === "OffsetMediaInputCursor") {
    inputState.applyMediaCursorRequest(requestType, inputLocator(requestData), requestData)
    send()
    return true
  }
  if (requestType === "TriggerMediaInputAction") {
    inputState.triggerMediaAction(
      inputLocator(requestData),
      requestData.mediaAction ?? "OBS_WEBSOCKET_MEDIA_INPUT_ACTION_NONE"
    )
    send()
    return true
  }
  return false
}
