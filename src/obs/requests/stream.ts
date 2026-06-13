import { UnknownRecord } from "../../domain/schemas/shared.js"
import { SendStreamCaptionInput, StreamStatusOutput, ToggleStreamOutput } from "../../domain/schemas/stream.js"
import { EmptyRequestData, type ObsRequestDescriptor } from "./shared.js"

export const GetStreamStatus = {
  requestType: "GetStreamStatus",
  requestDataSchema: EmptyRequestData,
  responseSchema: StreamStatusOutput
} satisfies ObsRequestDescriptor<StreamStatusOutput>

export const StartStream = {
  requestType: "StartStream",
  requestDataSchema: EmptyRequestData,
  responseSchema: UnknownRecord
} satisfies ObsRequestDescriptor<Record<string, unknown>>

export const StopStream = {
  requestType: "StopStream",
  requestDataSchema: EmptyRequestData,
  responseSchema: UnknownRecord
} satisfies ObsRequestDescriptor<Record<string, unknown>>

export const ToggleStream = {
  requestType: "ToggleStream",
  requestDataSchema: EmptyRequestData,
  responseSchema: ToggleStreamOutput
} satisfies ObsRequestDescriptor<ToggleStreamOutput>

export const SendStreamCaption = {
  requestType: "SendStreamCaption",
  requestDataSchema: SendStreamCaptionInput,
  responseSchema: UnknownRecord
} satisfies ObsRequestDescriptor<Record<string, unknown>>
