/* eslint-disable max-lines */

import { Schema } from "effect"

import type {
  InputMutationAcknowledgedOutput,
  ObsInputAudioTracks,
  OffsetMediaInputCursorOutput,
  PressInputPropertiesButtonOutput,
  SanitizedInputPropertyItem,
  SanitizedInputSetting,
  SanitizedInputValueType,
  SetInputAudioBalanceOutput,
  SetInputAudioMonitorTypeOutput,
  SetInputAudioSyncOffsetOutput,
  SetInputAudioTracksOutput,
  SetInputDeinterlaceFieldOrderOutput,
  SetInputDeinterlaceModeOutput,
  SetInputNameOutput,
  SetInputSettingsOutput,
  SetMediaInputCursorOutput,
  TriggerMediaInputActionOutput
} from "../../domain/schemas/inputs.js"
import {
  CreateInputInput,
  CreateInputOutput,
  InputAudioBalanceOutput,
  InputAudioMonitorTypeOutput,
  InputAudioSyncOffsetOutput,
  InputAudioTracksOutput,
  InputDefaultSettingsOutput,
  InputDeinterlaceFieldOrderOutput,
  InputDeinterlaceModeOutput,
  InputKindInput,
  InputLocatorInput,
  InputMuteOutput,
  InputPropertiesListPropertyItemsInput,
  InputPropertiesListPropertyItemsOutput,
  InputSettingsOutput,
  InputVolumeOutput,
  ListInputKindsInput,
  ListInputKindsOutput,
  ListInputsInput,
  ListInputsOutput,
  MediaInputStatusOutput,
  OffsetMediaInputCursorInput,
  PressInputPropertiesButtonInput,
  SetInputAudioBalanceInput,
  SetInputAudioMonitorTypeInput,
  SetInputAudioSyncOffsetInput,
  SetInputAudioTracksInput,
  SetInputDeinterlaceFieldOrderInput,
  SetInputDeinterlaceModeInput,
  SetInputMuteInput,
  SetInputNameInput,
  SetInputSettingsInput,
  SetInputVolumeInput,
  SetInputVolumeOutput,
  SetMediaInputCursorInput,
  SpecialInputsOutput,
  TriggerMediaInputActionInput
} from "../../domain/schemas/inputs.js"
import type { ObsClient } from "../client.js"
import {
  CreateInput,
  GetInputAudioBalance,
  GetInputAudioMonitorType,
  GetInputAudioSyncOffset,
  GetInputAudioTracks,
  GetInputDefaultSettings,
  GetInputDeinterlaceFieldOrder,
  GetInputDeinterlaceMode,
  GetInputKindList,
  GetInputList,
  GetInputMute,
  GetInputPropertiesListPropertyItems,
  GetInputSettings,
  GetInputVolume,
  GetMediaInputStatus,
  GetSpecialInputs,
  OffsetMediaInputCursor,
  PressInputPropertiesButton,
  RemoveInput,
  SetInputAudioBalance,
  SetInputAudioMonitorType,
  SetInputAudioSyncOffset,
  SetInputAudioTracks,
  SetInputDeinterlaceFieldOrder,
  SetInputDeinterlaceMode,
  SetInputMute,
  SetInputName,
  SetInputSettings,
  SetInputVolume,
  SetMediaInputCursor,
  ToggleInputMute,
  TriggerMediaInputAction
} from "../requests.js"
import { withDefinedFields } from "./shared.js"

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
    ...withDefinedFields({
      inputVolumeMul: decodedInput.inputVolumeMul,
      inputVolumeDb: decodedInput.inputVolumeDb
    }),
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

const VALUE_PREVIEW_MAX_LENGTH = 160

const sanitizedValueType = (value: unknown): SanitizedInputValueType =>
  value === null
    ? "null"
    : Array.isArray(value)
    ? "array"
    : typeof value === "string"
    ? "string"
    : typeof value === "number"
    ? "number"
    : typeof value === "boolean"
    ? "boolean"
    : typeof value === "object"
    ? "object"
    : "unknown"

const sanitizedValuePreview = (value: unknown): string | undefined => {
  if (typeof value !== "string" && typeof value !== "number" && typeof value !== "boolean" && value !== null) {
    return undefined
  }
  const preview = String(value)
  return preview.length > VALUE_PREVIEW_MAX_LENGTH ? `${preview.slice(0, VALUE_PREVIEW_MAX_LENGTH)}...` : preview
}

const sanitizeSettingsRecord = (settings: Readonly<Record<string, unknown>>): ReadonlyArray<SanitizedInputSetting> =>
  Object.entries(settings)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([settingName, value]) => ({
      settingName,
      valueType: sanitizedValueType(value)
    }))

const optionalStringField = (
  record: Readonly<Record<string, unknown>>,
  keys: ReadonlyArray<string>
): string | undefined => {
  const value = keys.map((key) => record[key]).find((entry) => typeof entry === "string")
  return typeof value === "string" ? value : undefined
}

const optionalBooleanField = (
  record: Readonly<Record<string, unknown>>,
  keys: ReadonlyArray<string>
): boolean | undefined => {
  const value = keys.map((key) => record[key]).find((entry) => typeof entry === "boolean")
  return typeof value === "boolean" ? value : undefined
}

const sanitizePropertyItem = (
  propertyItem: Readonly<Record<string, unknown>>,
  itemIndex: number
): SanitizedInputPropertyItem => {
  const itemValue = propertyItem.itemValue
  const itemName = optionalStringField(propertyItem, ["itemName", "name"])
  const itemEnabled = optionalBooleanField(propertyItem, ["itemEnabled", "enabled"])
  const itemValuePreview = sanitizedValuePreview(itemValue)
  return {
    itemIndex,
    ...withDefinedFields({
      itemName,
      itemValueType: itemValue === undefined ? undefined : sanitizedValueType(itemValue),
      itemValuePreview,
      itemEnabled
    }),
    fields: sanitizeSettingsRecord(propertyItem)
  }
}

export const getInputDefaultSettings = async (
  client: ObsClient,
  input: InputKindInput
): Promise<InputDefaultSettingsOutput> => {
  const decodedInput = Schema.decodeUnknownSync(InputKindInput)(input)
  const response = await client.request(GetInputDefaultSettings, decodedInput)
  return Schema.decodeUnknownSync(InputDefaultSettingsOutput)({
    inputKind: decodedInput.inputKind,
    defaultInputSettings: sanitizeSettingsRecord(response.defaultInputSettings),
    rawSettingsDeferred: true
  })
}

export const getInputSettings = async (
  client: ObsClient,
  input: InputLocatorInput
): Promise<InputSettingsOutput> => {
  const decodedInput = Schema.decodeUnknownSync(InputLocatorInput)(input)
  const response = await client.request(GetInputSettings, decodedInput)
  return Schema.decodeUnknownSync(InputSettingsOutput)({
    inputKind: response.inputKind,
    inputSettings: sanitizeSettingsRecord(response.inputSettings),
    rawSettingsDeferred: true
  })
}

export const getInputPropertiesListPropertyItems = async (
  client: ObsClient,
  input: InputPropertiesListPropertyItemsInput
): Promise<InputPropertiesListPropertyItemsOutput> => {
  const decodedInput = Schema.decodeUnknownSync(InputPropertiesListPropertyItemsInput)(input)
  const response = await client.request(GetInputPropertiesListPropertyItems, decodedInput)
  return Schema.decodeUnknownSync(InputPropertiesListPropertyItemsOutput)({
    propertyName: decodedInput.propertyName,
    propertyItems: response.propertyItems.map(sanitizePropertyItem),
    rawPropertyItemsDeferred: true
  })
}

const inputSettingsPatchToObsSettings = (
  settings: SetInputSettingsInput["inputSettings"]
): Readonly<Record<string, unknown>> =>
  withDefinedFields({
    is_local_file: settings.isLocalFile,
    looping: settings.looping,
    restart_on_activate: settings.restartOnActivate,
    close_when_inactive: settings.closeWhenInactive,
    clear_on_media_end: settings.clearOnMediaEnd,
    hw_decode: settings.hwDecode,
    speed_percent: settings.speedPercent,
    reconnect_delay_sec: settings.reconnectDelaySec
  })

export const setInputSettings = async (
  client: ObsClient,
  input: SetInputSettingsInput
): Promise<SetInputSettingsOutput> => {
  const decodedInput = Schema.decodeUnknownSync(SetInputSettingsInput)(input)
  const overlay = decodedInput.overlay ?? true
  await client.request(SetInputSettings, {
    ...withDefinedFields({
      inputName: decodedInput.inputName,
      inputUuid: decodedInput.inputUuid,
      inputSettings: inputSettingsPatchToObsSettings(decodedInput.inputSettings)
    }),
    overlay
  })
  return { inputSettings: decodedInput.inputSettings, overlay, acknowledged: true }
}

export const pressInputPropertiesButton = async (
  client: ObsClient,
  input: PressInputPropertiesButtonInput
): Promise<PressInputPropertiesButtonOutput> => {
  const decodedInput = Schema.decodeUnknownSync(PressInputPropertiesButtonInput)(input)
  await client.request(PressInputPropertiesButton, decodedInput)
  return { propertyName: decodedInput.propertyName, acknowledged: true }
}

export const createInput = async (client: ObsClient, input: CreateInputInput): Promise<CreateInputOutput> => {
  const decodedInput = Schema.decodeUnknownSync(CreateInputInput)(input)
  const inputSettings = decodedInput.inputSettings === undefined
    ? undefined
    : inputSettingsPatchToObsSettings(decodedInput.inputSettings)
  const response = await client.request(CreateInput, {
    ...withDefinedFields({
      sceneName: decodedInput.sceneName,
      sceneUuid: decodedInput.sceneUuid,
      canvasUuid: decodedInput.canvasUuid,
      inputSettings
    }),
    inputName: decodedInput.inputName,
    inputKind: decodedInput.inputKind,
    sceneItemEnabled: decodedInput.sceneItemEnabled ?? true
  })
  return Schema.decodeUnknownSync(CreateInputOutput)(response)
}

export const removeInput = async (
  client: ObsClient,
  input: InputLocatorInput
): Promise<InputMutationAcknowledgedOutput> => {
  const decodedInput = Schema.decodeUnknownSync(InputLocatorInput)(input)
  await client.request(RemoveInput, decodedInput)
  return { acknowledged: true }
}

export const setInputName = async (client: ObsClient, input: SetInputNameInput): Promise<SetInputNameOutput> => {
  const decodedInput = Schema.decodeUnknownSync(SetInputNameInput)(input)
  await client.request(SetInputName, decodedInput)
  return { inputName: decodedInput.newInputName, acknowledged: true }
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
