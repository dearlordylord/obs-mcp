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
  InputMutationAcknowledgedOutput,
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
  OffsetMediaInputCursorOutput,
  PressInputPropertiesButtonInput,
  PressInputPropertiesButtonOutput,
  SetInputAudioBalanceInput,
  SetInputAudioBalanceOutput,
  SetInputAudioMonitorTypeInput,
  SetInputAudioMonitorTypeOutput,
  SetInputAudioSyncOffsetInput,
  SetInputAudioSyncOffsetOutput,
  SetInputAudioTracksInput,
  SetInputAudioTracksOutput,
  SetInputDeinterlaceFieldOrderInput,
  SetInputDeinterlaceFieldOrderOutput,
  SetInputDeinterlaceModeInput,
  SetInputDeinterlaceModeOutput,
  SetInputMuteInput,
  SetInputNameInput,
  SetInputNameOutput,
  SetInputSettingsInput,
  SetInputSettingsOutput,
  SetInputVolumeInput,
  SetInputVolumeOutput,
  SetMediaInputCursorInput,
  SetMediaInputCursorOutput,
  SpecialInputsOutput,
  TriggerMediaInputActionInput,
  TriggerMediaInputActionOutput
} from "../../domain/schemas/index.js"
import { EmptyInput } from "../../domain/schemas/shared.js"
import {
  createInput,
  getInputAudioBalance,
  getInputAudioMonitorType,
  getInputAudioSyncOffset,
  getInputAudioTracks,
  getInputDefaultSettings,
  getInputDeinterlaceFieldOrder,
  getInputDeinterlaceMode,
  getInputMute,
  getInputPropertiesListPropertyItems,
  getInputSettings,
  getInputVolume,
  getMediaInputStatus,
  getSpecialInputs,
  listInputKinds,
  listInputs,
  offsetMediaInputCursor,
  pressInputPropertiesButton,
  removeInput,
  setInputAudioBalance,
  setInputAudioMonitorType,
  setInputAudioSyncOffset,
  setInputAudioTracks,
  setInputDeinterlaceFieldOrder,
  setInputDeinterlaceMode,
  setInputMute,
  setInputName,
  setInputSettings,
  setInputVolume,
  setMediaInputCursor,
  toggleInputMute,
  triggerMediaInputAction
} from "../../obs/operations/inputs.js"
import * as ObsRequests from "../../obs/requests.js"
import { defineTool, type ToolDefinition } from "./mechanics.js"

const CATEGORY = "inputs" as const

export const inputTools: ReadonlyArray<ToolDefinition> = [
  defineTool({
    name: "list_inputs",
    title: "List OBS Inputs",
    description: "Return OBS inputs, optionally restricted to one input kind.",
    category: CATEGORY,
    requiredObsRequests: [ObsRequests.GetInputList.requestType],
    inputSchema: ListInputsInput,
    outputSchema: ListInputsOutput,
    handler: async (input, context) => listInputs(context.client, input)
  }),
  defineTool({
    name: "list_input_kinds",
    title: "List OBS Input Kinds",
    description: "Return input kinds available on this OBS install, with optional unversioned kind names.",
    category: CATEGORY,
    requiredObsRequests: [ObsRequests.GetInputKindList.requestType],
    inputSchema: ListInputKindsInput,
    outputSchema: ListInputKindsOutput,
    handler: async (input, context) => listInputKinds(context.client, input)
  }),
  defineTool({
    name: "get_special_inputs",
    title: "Get OBS Special Inputs",
    description: "Return OBS desktop and microphone special input names.",
    category: CATEGORY,
    requiredObsRequests: [ObsRequests.GetSpecialInputs.requestType],
    inputSchema: EmptyInput,
    outputSchema: SpecialInputsOutput,
    handler: async (_input, context) => getSpecialInputs(context.client)
  }),
  defineTool({
    name: "get_input_mute",
    title: "Get OBS Input Mute",
    description: "Return whether an OBS input is muted.",
    category: CATEGORY,
    requiredObsRequests: [ObsRequests.GetInputMute.requestType],
    inputSchema: InputLocatorInput,
    outputSchema: InputMuteOutput,
    handler: async (input, context) => getInputMute(context.client, input)
  }),
  defineTool({
    name: "set_input_mute",
    title: "Set OBS Input Mute",
    description: "Set whether an OBS input is muted.",
    category: CATEGORY,
    requiredObsRequests: [ObsRequests.SetInputMute.requestType],
    inputSchema: SetInputMuteInput,
    outputSchema: InputMuteOutput,
    handler: async (input, context) => setInputMute(context.client, input)
  }),
  defineTool({
    name: "toggle_input_mute",
    title: "Toggle OBS Input Mute",
    description: "Toggle whether an OBS input is muted.",
    category: CATEGORY,
    requiredObsRequests: [ObsRequests.ToggleInputMute.requestType],
    inputSchema: InputLocatorInput,
    outputSchema: InputMuteOutput,
    handler: async (input, context) => toggleInputMute(context.client, input)
  }),
  defineTool({
    name: "get_input_volume",
    title: "Get OBS Input Volume",
    description: "Return an OBS input volume in multiplier and dB units.",
    category: CATEGORY,
    requiredObsRequests: [ObsRequests.GetInputVolume.requestType],
    inputSchema: InputLocatorInput,
    outputSchema: InputVolumeOutput,
    handler: async (input, context) => getInputVolume(context.client, input)
  }),
  defineTool({
    name: "set_input_volume",
    title: "Set OBS Input Volume",
    description: "Set an OBS input volume using either multiplier or dB units.",
    category: CATEGORY,
    requiredObsRequests: [ObsRequests.SetInputVolume.requestType],
    inputSchema: SetInputVolumeInput,
    outputSchema: SetInputVolumeOutput,
    handler: async (input, context) => setInputVolume(context.client, input)
  }),
  defineTool({
    name: "get_input_audio_balance",
    title: "Get OBS Input Audio Balance",
    description: "Return an OBS input audio balance.",
    category: CATEGORY,
    requiredObsRequests: [ObsRequests.GetInputAudioBalance.requestType],
    inputSchema: InputLocatorInput,
    outputSchema: InputAudioBalanceOutput,
    handler: async (input, context) => getInputAudioBalance(context.client, input)
  }),
  defineTool({
    name: "set_input_audio_balance",
    title: "Set OBS Input Audio Balance",
    description: "Set an OBS input audio balance.",
    category: CATEGORY,
    requiredObsRequests: [ObsRequests.SetInputAudioBalance.requestType],
    inputSchema: SetInputAudioBalanceInput,
    outputSchema: SetInputAudioBalanceOutput,
    handler: async (input, context) => setInputAudioBalance(context.client, input)
  }),
  defineTool({
    name: "get_input_audio_monitor_type",
    title: "Get OBS Input Audio Monitor Type",
    description: "Return an OBS input audio monitor type.",
    category: CATEGORY,
    requiredObsRequests: [ObsRequests.GetInputAudioMonitorType.requestType],
    inputSchema: InputLocatorInput,
    outputSchema: InputAudioMonitorTypeOutput,
    handler: async (input, context) => getInputAudioMonitorType(context.client, input)
  }),
  defineTool({
    name: "set_input_audio_monitor_type",
    title: "Set OBS Input Audio Monitor Type",
    description: "Set an OBS input audio monitor type.",
    category: CATEGORY,
    requiredObsRequests: [ObsRequests.SetInputAudioMonitorType.requestType],
    inputSchema: SetInputAudioMonitorTypeInput,
    outputSchema: SetInputAudioMonitorTypeOutput,
    handler: async (input, context) => setInputAudioMonitorType(context.client, input)
  }),
  defineTool({
    name: "get_input_audio_sync_offset",
    title: "Get OBS Input Audio Sync Offset",
    description: "Return an OBS input audio sync offset in milliseconds.",
    category: CATEGORY,
    requiredObsRequests: [ObsRequests.GetInputAudioSyncOffset.requestType],
    inputSchema: InputLocatorInput,
    outputSchema: InputAudioSyncOffsetOutput,
    handler: async (input, context) => getInputAudioSyncOffset(context.client, input)
  }),
  defineTool({
    name: "set_input_audio_sync_offset",
    title: "Set OBS Input Audio Sync Offset",
    description: "Set an OBS input audio sync offset in milliseconds.",
    category: CATEGORY,
    requiredObsRequests: [ObsRequests.SetInputAudioSyncOffset.requestType],
    inputSchema: SetInputAudioSyncOffsetInput,
    outputSchema: SetInputAudioSyncOffsetOutput,
    handler: async (input, context) => setInputAudioSyncOffset(context.client, input)
  }),
  defineTool({
    name: "get_input_audio_tracks",
    title: "Get OBS Input Audio Tracks",
    description: "Return enabled OBS audio tracks for an input.",
    category: CATEGORY,
    requiredObsRequests: [ObsRequests.GetInputAudioTracks.requestType],
    inputSchema: InputLocatorInput,
    outputSchema: InputAudioTracksOutput,
    handler: async (input, context) => getInputAudioTracks(context.client, input)
  }),
  defineTool({
    name: "set_input_audio_tracks",
    title: "Set OBS Input Audio Tracks",
    description: "Set enabled OBS audio tracks for an input.",
    category: CATEGORY,
    requiredObsRequests: [ObsRequests.SetInputAudioTracks.requestType],
    inputSchema: SetInputAudioTracksInput,
    outputSchema: SetInputAudioTracksOutput,
    handler: async (input, context) => setInputAudioTracks(context.client, input)
  }),
  defineTool({
    name: "get_input_deinterlace_mode",
    title: "Get OBS Input Deinterlace Mode",
    description: "Return an OBS input deinterlace mode. OBS restricts deinterlacing to async inputs.",
    category: CATEGORY,
    requiredObsRequests: [ObsRequests.GetInputDeinterlaceMode.requestType],
    inputSchema: InputLocatorInput,
    outputSchema: InputDeinterlaceModeOutput,
    handler: async (input, context) => getInputDeinterlaceMode(context.client, input)
  }),
  defineTool({
    name: "set_input_deinterlace_mode",
    title: "Set OBS Input Deinterlace Mode",
    description: "Set an OBS input deinterlace mode. OBS restricts deinterlacing to async inputs.",
    category: CATEGORY,
    requiredObsRequests: [ObsRequests.SetInputDeinterlaceMode.requestType],
    inputSchema: SetInputDeinterlaceModeInput,
    outputSchema: SetInputDeinterlaceModeOutput,
    handler: async (input, context) => setInputDeinterlaceMode(context.client, input)
  }),
  defineTool({
    name: "get_input_deinterlace_field_order",
    title: "Get OBS Input Deinterlace Field Order",
    description: "Return an OBS input deinterlace field order. OBS restricts deinterlacing to async inputs.",
    category: CATEGORY,
    requiredObsRequests: [ObsRequests.GetInputDeinterlaceFieldOrder.requestType],
    inputSchema: InputLocatorInput,
    outputSchema: InputDeinterlaceFieldOrderOutput,
    handler: async (input, context) => getInputDeinterlaceFieldOrder(context.client, input)
  }),
  defineTool({
    name: "set_input_deinterlace_field_order",
    title: "Set OBS Input Deinterlace Field Order",
    description: "Set an OBS input deinterlace field order. OBS restricts deinterlacing to async inputs.",
    category: CATEGORY,
    requiredObsRequests: [ObsRequests.SetInputDeinterlaceFieldOrder.requestType],
    inputSchema: SetInputDeinterlaceFieldOrderInput,
    outputSchema: SetInputDeinterlaceFieldOrderOutput,
    handler: async (input, context) => setInputDeinterlaceFieldOrder(context.client, input)
  }),
  defineTool({
    name: "get_input_default_settings",
    title: "Get OBS Input Default Settings",
    description:
      "Return raw default inputSettings for an OBS input kind. Keys and values are source-kind-specific; use this with list_input_kinds before writing settings.",
    category: CATEGORY,
    requiredObsRequests: [ObsRequests.GetInputDefaultSettings.requestType],
    inputSchema: InputKindInput,
    outputSchema: InputDefaultSettingsOutput,
    handler: async (input, context) => getInputDefaultSettings(context.client, input)
  }),
  defineTool({
    name: "get_input_settings",
    title: "Get OBS Input Settings",
    description:
      "Return raw inputKind and inputSettings for an OBS input. Keys and values are source-kind-specific and reflect the current OBS/plugin/OS surface.",
    category: CATEGORY,
    requiredObsRequests: [ObsRequests.GetInputSettings.requestType],
    inputSchema: InputLocatorInput,
    outputSchema: InputSettingsOutput,
    handler: async (input, context) => getInputSettings(context.client, input)
  }),
  defineTool({
    name: "get_input_properties_list_property_items",
    title: "Get OBS Input Property List Items",
    description:
      "Return raw OBS list-property items for an input property, including item names, values, and enabled flags when OBS provides them.",
    category: CATEGORY,
    requiredObsRequests: [ObsRequests.GetInputPropertiesListPropertyItems.requestType],
    inputSchema: InputPropertiesListPropertyItemsInput,
    outputSchema: InputPropertiesListPropertyItemsOutput,
    handler: async (input, context) => getInputPropertiesListPropertyItems(context.client, input)
  }),
  defineTool({
    name: "set_input_settings",
    title: "Set OBS Input Settings",
    description:
      "Apply free-form, source-kind-specific OBS inputSettings verbatim. Use snake_case OBS keys discovered from get_input_default_settings, get_input_properties_list_property_items, and get_input_settings; there is no universal key list.",
    category: CATEGORY,
    requiredObsRequests: [ObsRequests.SetInputSettings.requestType],
    inputSchema: SetInputSettingsInput,
    outputSchema: SetInputSettingsOutput,
    handler: async (input, context) => setInputSettings(context.client, input)
  }),
  defineTool({
    name: "press_input_properties_button",
    title: "Press OBS Input Properties Button",
    description: "Press a named OBS input properties button. This is an OBS-side effect.",
    category: CATEGORY,
    requiredObsRequests: [ObsRequests.PressInputPropertiesButton.requestType],
    inputSchema: PressInputPropertiesButtonInput,
    outputSchema: PressInputPropertiesButtonOutput,
    handler: async (input, context) => pressInputPropertiesButton(context.client, input)
  }),
  defineTool({
    name: "create_input",
    title: "Create OBS Input",
    description:
      "Create an OBS input in a scene. Optional inputSettings is free-form and source-kind-specific, using the same verbatim snake_case OBS keys as set_input_settings.",
    category: CATEGORY,
    requiredObsRequests: [ObsRequests.CreateInput.requestType],
    inputSchema: CreateInputInput,
    outputSchema: CreateInputOutput,
    handler: async (input, context) => createInput(context.client, input)
  }),
  defineTool({
    name: "remove_input",
    title: "Remove OBS Input",
    description: "Remove an OBS input by name or UUID.",
    category: CATEGORY,
    requiredObsRequests: [ObsRequests.RemoveInput.requestType],
    inputSchema: InputLocatorInput,
    outputSchema: InputMutationAcknowledgedOutput,
    handler: async (input, context) => removeInput(context.client, input)
  }),
  defineTool({
    name: "set_input_name",
    title: "Rename OBS Input",
    description: "Rename an OBS input by name or UUID.",
    category: CATEGORY,
    requiredObsRequests: [ObsRequests.SetInputName.requestType],
    inputSchema: SetInputNameInput,
    outputSchema: SetInputNameOutput,
    handler: async (input, context) => setInputName(context.client, input)
  }),
  defineTool({
    name: "get_media_input_status",
    title: "Get OBS Media Input Status",
    description: "Return an OBS media input status with duration and cursor data.",
    category: CATEGORY,
    requiredObsRequests: [ObsRequests.GetMediaInputStatus.requestType],
    inputSchema: InputLocatorInput,
    outputSchema: MediaInputStatusOutput,
    handler: async (input, context) => getMediaInputStatus(context.client, input)
  }),
  defineTool({
    name: "set_media_input_cursor",
    title: "Set OBS Media Input Cursor",
    description: "Set a media input cursor in milliseconds. OBS does not perform duration bounds checking.",
    category: CATEGORY,
    requiredObsRequests: [ObsRequests.SetMediaInputCursor.requestType],
    inputSchema: SetMediaInputCursorInput,
    outputSchema: SetMediaInputCursorOutput,
    handler: async (input, context) => setMediaInputCursor(context.client, input)
  }),
  defineTool({
    name: "offset_media_input_cursor",
    title: "Offset OBS Media Input Cursor",
    description: "Offset a media input cursor in milliseconds. OBS does not perform duration bounds checking.",
    category: CATEGORY,
    requiredObsRequests: [ObsRequests.OffsetMediaInputCursor.requestType],
    inputSchema: OffsetMediaInputCursorInput,
    outputSchema: OffsetMediaInputCursorOutput,
    handler: async (input, context) => offsetMediaInputCursor(context.client, input)
  }),
  defineTool({
    name: "trigger_media_input_action",
    title: "Trigger OBS Media Input Action",
    description: "Trigger an official OBS media input action.",
    category: CATEGORY,
    requiredObsRequests: [ObsRequests.TriggerMediaInputAction.requestType],
    inputSchema: TriggerMediaInputActionInput,
    outputSchema: TriggerMediaInputActionOutput,
    handler: async (input, context) => triggerMediaInputAction(context.client, input)
  })
]
