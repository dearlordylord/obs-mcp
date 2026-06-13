import { Schema } from "effect"

import {
  HotkeyListOutput,
  ObsStatsOutput,
  TriggerHotkeyByKeySequenceInput,
  TriggerHotkeyByNameInput
} from "../../domain/schemas/general.js"
import { StringArray } from "../../domain/schemas/shared.js"
import { EmptyRequestData, type ObsRequestDescriptor } from "./shared.js"

const EmptyResponseData = Schema.Struct({})

const GetVersionResponse = Schema.Struct({
  obsVersion: Schema.String,
  obsWebSocketVersion: Schema.String,
  rpcVersion: Schema.Number,
  availableRequests: StringArray,
  supportedImageFormats: StringArray,
  platform: Schema.optional(Schema.String),
  platformDescription: Schema.optional(Schema.String)
})
type GetVersionResponse = typeof GetVersionResponse.Type

export const GetVersion = {
  requestType: "GetVersion",
  requestDataSchema: EmptyRequestData,
  responseSchema: GetVersionResponse
} satisfies ObsRequestDescriptor<GetVersionResponse>

export const GetStats = {
  requestType: "GetStats",
  requestDataSchema: EmptyRequestData,
  responseSchema: ObsStatsOutput
} satisfies ObsRequestDescriptor<ObsStatsOutput>

export const GetHotkeyList = {
  requestType: "GetHotkeyList",
  requestDataSchema: EmptyRequestData,
  responseSchema: HotkeyListOutput
} satisfies ObsRequestDescriptor<HotkeyListOutput>

export const TriggerHotkeyByName = {
  requestType: "TriggerHotkeyByName",
  requestDataSchema: TriggerHotkeyByNameInput,
  responseSchema: EmptyResponseData
} satisfies ObsRequestDescriptor<typeof EmptyResponseData.Type>

export const TriggerHotkeyByKeySequence = {
  requestType: "TriggerHotkeyByKeySequence",
  requestDataSchema: TriggerHotkeyByKeySequenceInput,
  responseSchema: EmptyResponseData
} satisfies ObsRequestDescriptor<typeof EmptyResponseData.Type>
