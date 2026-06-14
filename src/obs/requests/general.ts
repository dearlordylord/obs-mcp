import { Schema } from "effect"

import {
  HotkeyListOutput,
  ObsStatsOutput,
  TriggerHotkeyByKeySequenceInput,
  TriggerHotkeyByNameInput,
  VersionResponse
} from "../../domain/schemas/general.js"
import { EmptyRequestData, type ObsRequestDescriptor } from "./shared.js"

const EmptyResponseData = Schema.Struct({})

export const GetVersion = {
  requestType: "GetVersion",
  requestDataSchema: EmptyRequestData,
  responseSchema: VersionResponse
} satisfies ObsRequestDescriptor<VersionResponse>

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
