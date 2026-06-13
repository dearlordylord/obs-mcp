import {
  InputLocatorInput,
  InputMuteOutput,
  InputVolumeOutput,
  ListInputKindsInput,
  ListInputKindsOutput,
  ListInputsInput,
  ListInputsOutput,
  SetInputMuteInput,
  SetInputVolumeInput,
  SetInputVolumeOutput,
  SpecialInputsOutput
} from "../../domain/schemas/index.js"
import { EmptyInput } from "../../domain/schemas/shared.js"
import {
  getInputMute,
  getInputVolume,
  getSpecialInputs,
  listInputKinds,
  listInputs,
  setInputMute,
  setInputVolume,
  toggleInputMute
} from "../../obs/operations/inputs.js"
import {
  GetInputKindList,
  GetInputList,
  GetInputMute,
  GetInputVolume,
  GetSpecialInputs,
  SetInputMute,
  SetInputVolume,
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
  })
]
