import { Schema } from "effect"

import {
  InputLocatorInput,
  InputMuteOutput,
  ListInputKindsInput,
  ListInputKindsOutput,
  ListInputsInput,
  ListInputsOutput,
  SetInputMuteInput,
  SpecialInputsOutput
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
