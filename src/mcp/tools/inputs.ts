import {
  InputAudioBalanceOutput,
  InputAudioMonitorTypeOutput,
  InputAudioSyncOffsetOutput,
  InputLocatorInput,
  InputMuteOutput,
  InputVolumeOutput,
  ListInputKindsInput,
  ListInputKindsOutput,
  ListInputsInput,
  ListInputsOutput,
  MediaInputStatusOutput,
  OffsetMediaInputCursorInput,
  OffsetMediaInputCursorOutput,
  SetInputAudioBalanceInput,
  SetInputAudioBalanceOutput,
  SetInputAudioMonitorTypeInput,
  SetInputAudioMonitorTypeOutput,
  SetInputAudioSyncOffsetInput,
  SetInputAudioSyncOffsetOutput,
  SetInputMuteInput,
  SetInputVolumeInput,
  SetInputVolumeOutput,
  SetMediaInputCursorInput,
  SetMediaInputCursorOutput,
  SpecialInputsOutput
} from "../../domain/schemas/index.js"
import { EmptyInput } from "../../domain/schemas/shared.js"
import {
  getInputAudioBalance,
  getInputAudioMonitorType,
  getInputAudioSyncOffset,
  getInputMute,
  getInputVolume,
  getMediaInputStatus,
  getSpecialInputs,
  listInputKinds,
  listInputs,
  offsetMediaInputCursor,
  setInputAudioBalance,
  setInputAudioMonitorType,
  setInputAudioSyncOffset,
  setInputMute,
  setInputVolume,
  setMediaInputCursor,
  toggleInputMute
} from "../../obs/operations/inputs.js"
import {
  GetInputAudioBalance,
  GetInputAudioMonitorType,
  GetInputAudioSyncOffset,
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
  SetInputMute,
  SetInputVolume,
  SetMediaInputCursor,
  ToggleInputMute
} from "../../obs/requests.js"
import { defineTool, type ToolDefinition } from "./mechanics.js"

const CATEGORY = "inputs" as const

export const inputTools: ReadonlyArray<ToolDefinition> = [
  defineTool({
    name: "list_inputs",
    title: "List OBS Inputs",
    description: "Return OBS inputs, optionally restricted to one input kind.",
    category: CATEGORY,
    requiredObsRequests: [GetInputList.requestType],
    inputSchema: ListInputsInput,
    outputSchema: ListInputsOutput,
    handler: async (input, context) => listInputs(context.client, input)
  }),
  defineTool({
    name: "list_input_kinds",
    title: "List OBS Input Kinds",
    description: "Return OBS input kinds, with optional unversioned kind names.",
    category: CATEGORY,
    requiredObsRequests: [GetInputKindList.requestType],
    inputSchema: ListInputKindsInput,
    outputSchema: ListInputKindsOutput,
    handler: async (input, context) => listInputKinds(context.client, input)
  }),
  defineTool({
    name: "get_special_inputs",
    title: "Get OBS Special Inputs",
    description: "Return OBS desktop and microphone special input names.",
    category: CATEGORY,
    requiredObsRequests: [GetSpecialInputs.requestType],
    inputSchema: EmptyInput,
    outputSchema: SpecialInputsOutput,
    handler: async (_input, context) => getSpecialInputs(context.client)
  }),
  defineTool({
    name: "get_input_mute",
    title: "Get OBS Input Mute",
    description: "Return whether an OBS input is muted.",
    category: CATEGORY,
    requiredObsRequests: [GetInputMute.requestType],
    inputSchema: InputLocatorInput,
    outputSchema: InputMuteOutput,
    handler: async (input, context) => getInputMute(context.client, input)
  }),
  defineTool({
    name: "set_input_mute",
    title: "Set OBS Input Mute",
    description: "Set whether an OBS input is muted.",
    category: CATEGORY,
    requiredObsRequests: [SetInputMute.requestType],
    inputSchema: SetInputMuteInput,
    outputSchema: InputMuteOutput,
    handler: async (input, context) => setInputMute(context.client, input)
  }),
  defineTool({
    name: "toggle_input_mute",
    title: "Toggle OBS Input Mute",
    description: "Toggle whether an OBS input is muted.",
    category: CATEGORY,
    requiredObsRequests: [ToggleInputMute.requestType],
    inputSchema: InputLocatorInput,
    outputSchema: InputMuteOutput,
    handler: async (input, context) => toggleInputMute(context.client, input)
  }),
  defineTool({
    name: "get_input_volume",
    title: "Get OBS Input Volume",
    description: "Return an OBS input volume in multiplier and dB units.",
    category: CATEGORY,
    requiredObsRequests: [GetInputVolume.requestType],
    inputSchema: InputLocatorInput,
    outputSchema: InputVolumeOutput,
    handler: async (input, context) => getInputVolume(context.client, input)
  }),
  defineTool({
    name: "set_input_volume",
    title: "Set OBS Input Volume",
    description: "Set an OBS input volume using either multiplier or dB units.",
    category: CATEGORY,
    requiredObsRequests: [SetInputVolume.requestType],
    inputSchema: SetInputVolumeInput,
    outputSchema: SetInputVolumeOutput,
    handler: async (input, context) => setInputVolume(context.client, input)
  }),
  defineTool({
    name: "get_input_audio_balance",
    title: "Get OBS Input Audio Balance",
    description: "Return an OBS input audio balance.",
    category: CATEGORY,
    requiredObsRequests: [GetInputAudioBalance.requestType],
    inputSchema: InputLocatorInput,
    outputSchema: InputAudioBalanceOutput,
    handler: async (input, context) => getInputAudioBalance(context.client, input)
  }),
  defineTool({
    name: "set_input_audio_balance",
    title: "Set OBS Input Audio Balance",
    description: "Set an OBS input audio balance.",
    category: CATEGORY,
    requiredObsRequests: [SetInputAudioBalance.requestType],
    inputSchema: SetInputAudioBalanceInput,
    outputSchema: SetInputAudioBalanceOutput,
    handler: async (input, context) => setInputAudioBalance(context.client, input)
  }),
  defineTool({
    name: "get_input_audio_monitor_type",
    title: "Get OBS Input Audio Monitor Type",
    description: "Return an OBS input audio monitor type.",
    category: CATEGORY,
    requiredObsRequests: [GetInputAudioMonitorType.requestType],
    inputSchema: InputLocatorInput,
    outputSchema: InputAudioMonitorTypeOutput,
    handler: async (input, context) => getInputAudioMonitorType(context.client, input)
  }),
  defineTool({
    name: "set_input_audio_monitor_type",
    title: "Set OBS Input Audio Monitor Type",
    description: "Set an OBS input audio monitor type.",
    category: CATEGORY,
    requiredObsRequests: [SetInputAudioMonitorType.requestType],
    inputSchema: SetInputAudioMonitorTypeInput,
    outputSchema: SetInputAudioMonitorTypeOutput,
    handler: async (input, context) => setInputAudioMonitorType(context.client, input)
  }),
  defineTool({
    name: "get_input_audio_sync_offset",
    title: "Get OBS Input Audio Sync Offset",
    description: "Return an OBS input audio sync offset in milliseconds.",
    category: CATEGORY,
    requiredObsRequests: [GetInputAudioSyncOffset.requestType],
    inputSchema: InputLocatorInput,
    outputSchema: InputAudioSyncOffsetOutput,
    handler: async (input, context) => getInputAudioSyncOffset(context.client, input)
  }),
  defineTool({
    name: "set_input_audio_sync_offset",
    title: "Set OBS Input Audio Sync Offset",
    description: "Set an OBS input audio sync offset in milliseconds.",
    category: CATEGORY,
    requiredObsRequests: [SetInputAudioSyncOffset.requestType],
    inputSchema: SetInputAudioSyncOffsetInput,
    outputSchema: SetInputAudioSyncOffsetOutput,
    handler: async (input, context) => setInputAudioSyncOffset(context.client, input)
  }),
  defineTool({
    name: "get_media_input_status",
    title: "Get OBS Media Input Status",
    description: "Return an OBS media input status with duration and cursor data.",
    category: CATEGORY,
    requiredObsRequests: [GetMediaInputStatus.requestType],
    inputSchema: InputLocatorInput,
    outputSchema: MediaInputStatusOutput,
    handler: async (input, context) => getMediaInputStatus(context.client, input)
  }),
  defineTool({
    name: "set_media_input_cursor",
    title: "Set OBS Media Input Cursor",
    description: "Set a media input cursor in milliseconds. OBS does not perform duration bounds checking.",
    category: CATEGORY,
    requiredObsRequests: [SetMediaInputCursor.requestType],
    inputSchema: SetMediaInputCursorInput,
    outputSchema: SetMediaInputCursorOutput,
    handler: async (input, context) => setMediaInputCursor(context.client, input)
  }),
  defineTool({
    name: "offset_media_input_cursor",
    title: "Offset OBS Media Input Cursor",
    description: "Offset a media input cursor in milliseconds. OBS does not perform duration bounds checking.",
    category: CATEGORY,
    requiredObsRequests: [OffsetMediaInputCursor.requestType],
    inputSchema: OffsetMediaInputCursorInput,
    outputSchema: OffsetMediaInputCursorOutput,
    handler: async (input, context) => offsetMediaInputCursor(context.client, input)
  })
]
