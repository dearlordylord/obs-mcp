import { Schema } from "effect"

import type {
  ObsInputAudioTracks,
  OffsetMediaInputCursorOutput,
  SetInputAudioBalanceOutput,
  SetInputAudioMonitorTypeOutput,
  SetInputAudioSyncOffsetOutput,
  SetInputAudioTracksOutput,
  SetInputDeinterlaceFieldOrderOutput,
  SetInputDeinterlaceModeOutput,
  SetMediaInputCursorOutput,
  TriggerMediaInputActionOutput
} from "../../domain/schemas/inputs.js"
import {
  InputAudioBalanceOutput,
  InputAudioMonitorTypeOutput,
  InputAudioSyncOffsetOutput,
  InputAudioTracksOutput,
  InputDeinterlaceFieldOrderOutput,
  InputDeinterlaceModeOutput,
  InputLocatorInput,
  InputMuteOutput,
  InputVolumeOutput,
  ListInputKindsInput,
  ListInputKindsOutput,
  ListInputsInput,
  ListInputsOutput,
  MediaInputStatusOutput,
  OffsetMediaInputCursorInput,
  SetInputAudioBalanceInput,
  SetInputAudioMonitorTypeInput,
  SetInputAudioSyncOffsetInput,
  SetInputAudioTracksInput,
  SetInputDeinterlaceFieldOrderInput,
  SetInputDeinterlaceModeInput,
  SetInputMuteInput,
  SetInputVolumeInput,
  SetInputVolumeOutput,
  SetMediaInputCursorInput,
  SpecialInputsOutput,
  TriggerMediaInputActionInput
} from "../../domain/schemas/inputs.js"
import type { ObsClient } from "../client.js"
import {
  GetInputAudioBalance,
  GetInputAudioMonitorType,
  GetInputAudioSyncOffset,
  GetInputAudioTracks,
  GetInputDeinterlaceFieldOrder,
  GetInputDeinterlaceMode,
  GetInputKindList,
  GetInputList,
  GetInputMute,
  GetInputVolume,
  GetMediaInputStatus,
  GetSpecialInputs,
  OffsetMediaInputCursor,
  SetInputAudioBalance,
  SetInputAudioMonitorType,
  SetInputAudioSyncOffset,
  SetInputAudioTracks,
  SetInputDeinterlaceFieldOrder,
  SetInputDeinterlaceMode,
  SetInputMute,
  SetInputVolume,
  SetMediaInputCursor,
  ToggleInputMute,
  TriggerMediaInputAction
} from "../requests.js"

export const listInputs = async (client: ObsClient, input: ListInputsInput): Promise<ListInputsOutput> => {
  const decodedInput = Schema.decodeUnknownSync(ListInputsInput)(input)
  const response = await client.request(GetInputList, decodedInput)
  return Schema.decodeUnknownSync(ListInputsOutput)(response)
}

export const listInputKinds = async (
  client: ObsClient,
  input: ListInputKindsInput
): Promise<ListInputKindsOutput> => {
  const decodedInput = Schema.decodeUnknownSync(ListInputKindsInput)(input)
  const response = await client.request(GetInputKindList, decodedInput)
  return Schema.decodeUnknownSync(ListInputKindsOutput)(response)
}

export const getSpecialInputs = async (client: ObsClient): Promise<SpecialInputsOutput> => {
  const response = await client.request(GetSpecialInputs)
  return Schema.decodeUnknownSync(SpecialInputsOutput)(response)
}

export const getInputMute = async (client: ObsClient, input: InputLocatorInput): Promise<InputMuteOutput> => {
  const decodedInput = Schema.decodeUnknownSync(InputLocatorInput)(input)
  const response = await client.request(GetInputMute, decodedInput)
  return Schema.decodeUnknownSync(InputMuteOutput)(response)
}

export const setInputMute = async (client: ObsClient, input: SetInputMuteInput): Promise<InputMuteOutput> => {
  const decodedInput = Schema.decodeUnknownSync(SetInputMuteInput)(input)
  await client.request(SetInputMute, decodedInput)
  return { inputMuted: decodedInput.inputMuted }
}

export const toggleInputMute = async (client: ObsClient, input: InputLocatorInput): Promise<InputMuteOutput> => {
  const decodedInput = Schema.decodeUnknownSync(InputLocatorInput)(input)
  const response = await client.request(ToggleInputMute, decodedInput)
  return Schema.decodeUnknownSync(InputMuteOutput)(response)
}

export const getInputVolume = async (client: ObsClient, input: InputLocatorInput): Promise<InputVolumeOutput> => {
  const decodedInput = Schema.decodeUnknownSync(InputLocatorInput)(input)
  const response = await client.request(GetInputVolume, decodedInput)
  return Schema.decodeUnknownSync(InputVolumeOutput)(response)
}

export const setInputVolume = async (
  client: ObsClient,
  input: SetInputVolumeInput
): Promise<SetInputVolumeOutput> => {
  const decodedInput = Schema.decodeUnknownSync(SetInputVolumeInput)(input)
  await client.request(SetInputVolume, decodedInput)
  return Schema.decodeUnknownSync(SetInputVolumeOutput)({
    ...(decodedInput.inputVolumeMul === undefined ? {} : { inputVolumeMul: decodedInput.inputVolumeMul }),
    ...(decodedInput.inputVolumeDb === undefined ? {} : { inputVolumeDb: decodedInput.inputVolumeDb }),
    acknowledged: true
  })
}

export const getInputAudioBalance = async (
  client: ObsClient,
  input: InputLocatorInput
): Promise<InputAudioBalanceOutput> => {
  const decodedInput = Schema.decodeUnknownSync(InputLocatorInput)(input)
  const response = await client.request(GetInputAudioBalance, decodedInput)
  return Schema.decodeUnknownSync(InputAudioBalanceOutput)(response)
}

export const setInputAudioBalance = async (
  client: ObsClient,
  input: SetInputAudioBalanceInput
): Promise<SetInputAudioBalanceOutput> => {
  const decodedInput = Schema.decodeUnknownSync(SetInputAudioBalanceInput)(input)
  await client.request(SetInputAudioBalance, decodedInput)
  return { inputAudioBalance: decodedInput.inputAudioBalance, acknowledged: true }
}

export const getInputAudioMonitorType = async (
  client: ObsClient,
  input: InputLocatorInput
): Promise<InputAudioMonitorTypeOutput> => {
  const decodedInput = Schema.decodeUnknownSync(InputLocatorInput)(input)
  const response = await client.request(GetInputAudioMonitorType, decodedInput)
  return Schema.decodeUnknownSync(InputAudioMonitorTypeOutput)(response)
}

export const setInputAudioMonitorType = async (
  client: ObsClient,
  input: SetInputAudioMonitorTypeInput
): Promise<SetInputAudioMonitorTypeOutput> => {
  const decodedInput = Schema.decodeUnknownSync(SetInputAudioMonitorTypeInput)(input)
  await client.request(SetInputAudioMonitorType, decodedInput)
  return { monitorType: decodedInput.monitorType, acknowledged: true }
}

export const getInputAudioSyncOffset = async (
  client: ObsClient,
  input: InputLocatorInput
): Promise<InputAudioSyncOffsetOutput> => {
  const decodedInput = Schema.decodeUnknownSync(InputLocatorInput)(input)
  const response = await client.request(GetInputAudioSyncOffset, decodedInput)
  return Schema.decodeUnknownSync(InputAudioSyncOffsetOutput)(response)
}

export const setInputAudioSyncOffset = async (
  client: ObsClient,
  input: SetInputAudioSyncOffsetInput
): Promise<SetInputAudioSyncOffsetOutput> => {
  const decodedInput = Schema.decodeUnknownSync(SetInputAudioSyncOffsetInput)(input)
  await client.request(SetInputAudioSyncOffset, decodedInput)
  return { inputAudioSyncOffset: decodedInput.inputAudioSyncOffset, acknowledged: true }
}

const toObsInputAudioTracks = (tracks: InputAudioTracksOutput["inputAudioTracks"]): ObsInputAudioTracks => ({
  "1": tracks.track1,
  "2": tracks.track2,
  "3": tracks.track3,
  "4": tracks.track4,
  "5": tracks.track5,
  "6": tracks.track6
})

const fromObsInputAudioTracks = (tracks: ObsInputAudioTracks): InputAudioTracksOutput["inputAudioTracks"] => ({
  track1: tracks["1"],
  track2: tracks["2"],
  track3: tracks["3"],
  track4: tracks["4"],
  track5: tracks["5"],
  track6: tracks["6"]
})

export const getInputAudioTracks = async (
  client: ObsClient,
  input: InputLocatorInput
): Promise<InputAudioTracksOutput> => {
  const decodedInput = Schema.decodeUnknownSync(InputLocatorInput)(input)
  const response = await client.request(GetInputAudioTracks, decodedInput)
  return Schema.decodeUnknownSync(InputAudioTracksOutput)({
    inputAudioTracks: fromObsInputAudioTracks(response.inputAudioTracks)
  })
}

export const setInputAudioTracks = async (
  client: ObsClient,
  input: SetInputAudioTracksInput
): Promise<SetInputAudioTracksOutput> => {
  const decodedInput = Schema.decodeUnknownSync(SetInputAudioTracksInput)(input)
  await client.request(SetInputAudioTracks, {
    ...decodedInput,
    inputAudioTracks: toObsInputAudioTracks(decodedInput.inputAudioTracks)
  })
  return { inputAudioTracks: decodedInput.inputAudioTracks, acknowledged: true }
}

export const getInputDeinterlaceMode = async (
  client: ObsClient,
  input: InputLocatorInput
): Promise<InputDeinterlaceModeOutput> => {
  const decodedInput = Schema.decodeUnknownSync(InputLocatorInput)(input)
  const response = await client.request(GetInputDeinterlaceMode, decodedInput)
  return Schema.decodeUnknownSync(InputDeinterlaceModeOutput)(response)
}

export const setInputDeinterlaceMode = async (
  client: ObsClient,
  input: SetInputDeinterlaceModeInput
): Promise<SetInputDeinterlaceModeOutput> => {
  const decodedInput = Schema.decodeUnknownSync(SetInputDeinterlaceModeInput)(input)
  await client.request(SetInputDeinterlaceMode, decodedInput)
  return { inputDeinterlaceMode: decodedInput.inputDeinterlaceMode, acknowledged: true }
}

export const getInputDeinterlaceFieldOrder = async (
  client: ObsClient,
  input: InputLocatorInput
): Promise<InputDeinterlaceFieldOrderOutput> => {
  const decodedInput = Schema.decodeUnknownSync(InputLocatorInput)(input)
  const response = await client.request(GetInputDeinterlaceFieldOrder, decodedInput)
  return Schema.decodeUnknownSync(InputDeinterlaceFieldOrderOutput)(response)
}

export const setInputDeinterlaceFieldOrder = async (
  client: ObsClient,
  input: SetInputDeinterlaceFieldOrderInput
): Promise<SetInputDeinterlaceFieldOrderOutput> => {
  const decodedInput = Schema.decodeUnknownSync(SetInputDeinterlaceFieldOrderInput)(input)
  await client.request(SetInputDeinterlaceFieldOrder, decodedInput)
  return { inputDeinterlaceFieldOrder: decodedInput.inputDeinterlaceFieldOrder, acknowledged: true }
}

export const getMediaInputStatus = async (
  client: ObsClient,
  input: InputLocatorInput
): Promise<MediaInputStatusOutput> => {
  const decodedInput = Schema.decodeUnknownSync(InputLocatorInput)(input)
  const response = await client.request(GetMediaInputStatus, decodedInput)
  return Schema.decodeUnknownSync(MediaInputStatusOutput)(response)
}

export const setMediaInputCursor = async (
  client: ObsClient,
  input: SetMediaInputCursorInput
): Promise<SetMediaInputCursorOutput> => {
  const decodedInput = Schema.decodeUnknownSync(SetMediaInputCursorInput)(input)
  await client.request(SetMediaInputCursor, decodedInput)
  return { mediaCursor: decodedInput.mediaCursor, acknowledged: true }
}

export const offsetMediaInputCursor = async (
  client: ObsClient,
  input: OffsetMediaInputCursorInput
): Promise<OffsetMediaInputCursorOutput> => {
  const decodedInput = Schema.decodeUnknownSync(OffsetMediaInputCursorInput)(input)
  await client.request(OffsetMediaInputCursor, decodedInput)
  return { mediaCursorOffset: decodedInput.mediaCursorOffset, acknowledged: true }
}

export const triggerMediaInputAction = async (
  client: ObsClient,
  input: TriggerMediaInputActionInput
): Promise<TriggerMediaInputActionOutput> => {
  const decodedInput = Schema.decodeUnknownSync(TriggerMediaInputActionInput)(input)
  await client.request(TriggerMediaInputAction, decodedInput)
  return { mediaAction: decodedInput.mediaAction, acknowledged: true }
}
