import { Schema } from "effect"

import {
  InputAudioBalanceOutput,
  InputAudioMonitorTypeOutput,
  InputAudioSyncOffsetOutput,
  InputDeinterlaceFieldOrderOutput,
  InputDeinterlaceModeOutput,
  InputKindInput,
  InputLocatorInput,
  InputMuteOutput,
  InputPropertiesListPropertyItemsInput,
  InputVolumeOutput,
  ListInputKindsInput,
  ListInputKindsOutput,
  ListInputsInput,
  ListInputsOutput,
  MediaInputStatusOutput,
  ObsInputAudioTracksOutput,
  ObsInputDefaultSettingsOutput,
  ObsInputPropertiesListPropertyItemsOutput,
  ObsInputSettingsOutput,
  ObsSetInputSettingsInput,
  OffsetMediaInputCursorInput,
  PressInputPropertiesButtonInput,
  SetInputAudioBalanceInput,
  SetInputAudioMonitorTypeInput,
  SetInputAudioSyncOffsetInput,
  SetInputDeinterlaceFieldOrderInput,
  SetInputDeinterlaceModeInput,
  SetInputMuteInput,
  SetInputVolumeInput,
  SetMediaInputCursorInput,
  SetObsInputAudioTracksInput,
  SpecialInputsOutput,
  TriggerMediaInputActionInput
} from "../../domain/schemas/inputs.js"
import { EmptyRequestData, type ObsRequestDescriptor } from "./shared.js"

const EmptyResponseData = Schema.Struct({})

export const GetInputList = {
  requestType: "GetInputList",
  requestDataSchema: ListInputsInput,
  responseSchema: ListInputsOutput
} satisfies ObsRequestDescriptor<ListInputsOutput>

export const GetInputKindList = {
  requestType: "GetInputKindList",
  requestDataSchema: ListInputKindsInput,
  responseSchema: ListInputKindsOutput
} satisfies ObsRequestDescriptor<ListInputKindsOutput>

export const GetSpecialInputs = {
  requestType: "GetSpecialInputs",
  requestDataSchema: EmptyRequestData,
  responseSchema: SpecialInputsOutput
} satisfies ObsRequestDescriptor<SpecialInputsOutput>

export const GetInputMute = {
  requestType: "GetInputMute",
  requestDataSchema: InputLocatorInput,
  responseSchema: InputMuteOutput
} satisfies ObsRequestDescriptor<InputMuteOutput>

export const SetInputMute = {
  requestType: "SetInputMute",
  requestDataSchema: SetInputMuteInput,
  responseSchema: EmptyResponseData
} satisfies ObsRequestDescriptor<typeof EmptyResponseData.Type>

export const ToggleInputMute = {
  requestType: "ToggleInputMute",
  requestDataSchema: InputLocatorInput,
  responseSchema: InputMuteOutput
} satisfies ObsRequestDescriptor<InputMuteOutput>

export const GetInputVolume = {
  requestType: "GetInputVolume",
  requestDataSchema: InputLocatorInput,
  responseSchema: InputVolumeOutput
} satisfies ObsRequestDescriptor<InputVolumeOutput>

export const SetInputVolume = {
  requestType: "SetInputVolume",
  requestDataSchema: SetInputVolumeInput,
  responseSchema: EmptyResponseData
} satisfies ObsRequestDescriptor<typeof EmptyResponseData.Type>

export const GetInputAudioBalance = {
  requestType: "GetInputAudioBalance",
  requestDataSchema: InputLocatorInput,
  responseSchema: InputAudioBalanceOutput
} satisfies ObsRequestDescriptor<InputAudioBalanceOutput>

export const SetInputAudioBalance = {
  requestType: "SetInputAudioBalance",
  requestDataSchema: SetInputAudioBalanceInput,
  responseSchema: EmptyResponseData
} satisfies ObsRequestDescriptor<typeof EmptyResponseData.Type>

export const GetInputAudioMonitorType = {
  requestType: "GetInputAudioMonitorType",
  requestDataSchema: InputLocatorInput,
  responseSchema: InputAudioMonitorTypeOutput
} satisfies ObsRequestDescriptor<InputAudioMonitorTypeOutput>

export const SetInputAudioMonitorType = {
  requestType: "SetInputAudioMonitorType",
  requestDataSchema: SetInputAudioMonitorTypeInput,
  responseSchema: EmptyResponseData
} satisfies ObsRequestDescriptor<typeof EmptyResponseData.Type>

export const GetInputAudioSyncOffset = {
  requestType: "GetInputAudioSyncOffset",
  requestDataSchema: InputLocatorInput,
  responseSchema: InputAudioSyncOffsetOutput
} satisfies ObsRequestDescriptor<InputAudioSyncOffsetOutput>

export const SetInputAudioSyncOffset = {
  requestType: "SetInputAudioSyncOffset",
  requestDataSchema: SetInputAudioSyncOffsetInput,
  responseSchema: EmptyResponseData
} satisfies ObsRequestDescriptor<typeof EmptyResponseData.Type>

export const GetInputAudioTracks = {
  requestType: "GetInputAudioTracks",
  requestDataSchema: InputLocatorInput,
  responseSchema: ObsInputAudioTracksOutput
} satisfies ObsRequestDescriptor<ObsInputAudioTracksOutput>

export const SetInputAudioTracks = {
  requestType: "SetInputAudioTracks",
  requestDataSchema: SetObsInputAudioTracksInput,
  responseSchema: EmptyResponseData
} satisfies ObsRequestDescriptor<typeof EmptyResponseData.Type>

export const GetInputDeinterlaceMode = {
  requestType: "GetInputDeinterlaceMode",
  requestDataSchema: InputLocatorInput,
  responseSchema: InputDeinterlaceModeOutput
} satisfies ObsRequestDescriptor<InputDeinterlaceModeOutput>

export const SetInputDeinterlaceMode = {
  requestType: "SetInputDeinterlaceMode",
  requestDataSchema: SetInputDeinterlaceModeInput,
  responseSchema: EmptyResponseData
} satisfies ObsRequestDescriptor<typeof EmptyResponseData.Type>

export const GetInputDeinterlaceFieldOrder = {
  requestType: "GetInputDeinterlaceFieldOrder",
  requestDataSchema: InputLocatorInput,
  responseSchema: InputDeinterlaceFieldOrderOutput
} satisfies ObsRequestDescriptor<InputDeinterlaceFieldOrderOutput>

export const SetInputDeinterlaceFieldOrder = {
  requestType: "SetInputDeinterlaceFieldOrder",
  requestDataSchema: SetInputDeinterlaceFieldOrderInput,
  responseSchema: EmptyResponseData
} satisfies ObsRequestDescriptor<typeof EmptyResponseData.Type>

export const GetInputDefaultSettings = {
  requestType: "GetInputDefaultSettings",
  requestDataSchema: InputKindInput,
  responseSchema: ObsInputDefaultSettingsOutput
} satisfies ObsRequestDescriptor<ObsInputDefaultSettingsOutput>

export const GetInputSettings = {
  requestType: "GetInputSettings",
  requestDataSchema: InputLocatorInput,
  responseSchema: ObsInputSettingsOutput
} satisfies ObsRequestDescriptor<ObsInputSettingsOutput>

export const GetInputPropertiesListPropertyItems = {
  requestType: "GetInputPropertiesListPropertyItems",
  requestDataSchema: InputPropertiesListPropertyItemsInput,
  responseSchema: ObsInputPropertiesListPropertyItemsOutput
} satisfies ObsRequestDescriptor<ObsInputPropertiesListPropertyItemsOutput>

export const SetInputSettings = {
  requestType: "SetInputSettings",
  requestDataSchema: ObsSetInputSettingsInput,
  responseSchema: EmptyResponseData
} satisfies ObsRequestDescriptor<typeof EmptyResponseData.Type>

export const PressInputPropertiesButton = {
  requestType: "PressInputPropertiesButton",
  requestDataSchema: PressInputPropertiesButtonInput,
  responseSchema: EmptyResponseData
} satisfies ObsRequestDescriptor<typeof EmptyResponseData.Type>

export const GetMediaInputStatus = {
  requestType: "GetMediaInputStatus",
  requestDataSchema: InputLocatorInput,
  responseSchema: MediaInputStatusOutput
} satisfies ObsRequestDescriptor<MediaInputStatusOutput>

export const SetMediaInputCursor = {
  requestType: "SetMediaInputCursor",
  requestDataSchema: SetMediaInputCursorInput,
  responseSchema: EmptyResponseData
} satisfies ObsRequestDescriptor<typeof EmptyResponseData.Type>

export const OffsetMediaInputCursor = {
  requestType: "OffsetMediaInputCursor",
  requestDataSchema: OffsetMediaInputCursorInput,
  responseSchema: EmptyResponseData
} satisfies ObsRequestDescriptor<typeof EmptyResponseData.Type>

export const TriggerMediaInputAction = {
  requestType: "TriggerMediaInputAction",
  requestDataSchema: TriggerMediaInputActionInput,
  responseSchema: EmptyResponseData
} satisfies ObsRequestDescriptor<typeof EmptyResponseData.Type>
