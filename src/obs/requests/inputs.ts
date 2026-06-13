import {
  ListInputKindsInput,
  ListInputKindsOutput,
  ListInputsInput,
  ListInputsOutput,
  SpecialInputsOutput
} from "../../domain/schemas/inputs.js"
import { EmptyRequestData, type ObsRequestDescriptor } from "./shared.js"

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
