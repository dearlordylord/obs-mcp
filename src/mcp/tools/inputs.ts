import {
  ListInputKindsInput,
  ListInputKindsOutput,
  ListInputsInput,
  ListInputsOutput,
  SpecialInputsOutput
} from "../../domain/schemas/index.js"
import { EmptyInput } from "../../domain/schemas/shared.js"
import { getSpecialInputs, listInputKinds, listInputs } from "../../obs/operations/inputs.js"
import { GetInputKindList, GetInputList, GetSpecialInputs } from "../../obs/requests.js"
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
  })
]
