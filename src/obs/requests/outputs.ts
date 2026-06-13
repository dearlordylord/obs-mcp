import {
  GetOutputStatusInput,
  LastReplayBufferReplayOutput,
  ListOutputsOutput,
  OutputLifecycleInput,
  OutputStatusResponse,
  ReplayBufferStatusOutput,
  VirtualCamStatusOutput
} from "../../domain/schemas/outputs.js"
import { UnknownRecord } from "../../domain/schemas/shared.js"
import { EmptyRequestData, type ObsRequestDescriptor } from "./shared.js"

export const GetOutputList = {
  requestType: "GetOutputList",
  requestDataSchema: EmptyRequestData,
  responseSchema: ListOutputsOutput
} satisfies ObsRequestDescriptor<ListOutputsOutput>

export const GetOutputStatus = {
  requestType: "GetOutputStatus",
  requestDataSchema: GetOutputStatusInput,
  responseSchema: OutputStatusResponse
} satisfies ObsRequestDescriptor<OutputStatusResponse>

export const StartOutput = {
  requestType: "StartOutput",
  requestDataSchema: OutputLifecycleInput,
  responseSchema: UnknownRecord
} satisfies ObsRequestDescriptor<Record<string, unknown>>

export const StopOutput = {
  requestType: "StopOutput",
  requestDataSchema: OutputLifecycleInput,
  responseSchema: UnknownRecord
} satisfies ObsRequestDescriptor<Record<string, unknown>>

export const ToggleOutput = {
  requestType: "ToggleOutput",
  requestDataSchema: OutputLifecycleInput,
  responseSchema: VirtualCamStatusOutput
} satisfies ObsRequestDescriptor<VirtualCamStatusOutput>

export const GetVirtualCamStatus = {
  requestType: "GetVirtualCamStatus",
  requestDataSchema: EmptyRequestData,
  responseSchema: VirtualCamStatusOutput
} satisfies ObsRequestDescriptor<VirtualCamStatusOutput>

export const StartVirtualCam = {
  requestType: "StartVirtualCam",
  requestDataSchema: EmptyRequestData,
  responseSchema: UnknownRecord
} satisfies ObsRequestDescriptor<Record<string, unknown>>

export const StopVirtualCam = {
  requestType: "StopVirtualCam",
  requestDataSchema: EmptyRequestData,
  responseSchema: UnknownRecord
} satisfies ObsRequestDescriptor<Record<string, unknown>>

export const ToggleVirtualCam = {
  requestType: "ToggleVirtualCam",
  requestDataSchema: EmptyRequestData,
  responseSchema: VirtualCamStatusOutput
} satisfies ObsRequestDescriptor<VirtualCamStatusOutput>

export const GetReplayBufferStatus = {
  requestType: "GetReplayBufferStatus",
  requestDataSchema: EmptyRequestData,
  responseSchema: ReplayBufferStatusOutput
} satisfies ObsRequestDescriptor<ReplayBufferStatusOutput>

export const StartReplayBuffer = {
  requestType: "StartReplayBuffer",
  requestDataSchema: EmptyRequestData,
  responseSchema: UnknownRecord
} satisfies ObsRequestDescriptor<Record<string, unknown>>

export const StopReplayBuffer = {
  requestType: "StopReplayBuffer",
  requestDataSchema: EmptyRequestData,
  responseSchema: UnknownRecord
} satisfies ObsRequestDescriptor<Record<string, unknown>>

export const ToggleReplayBuffer = {
  requestType: "ToggleReplayBuffer",
  requestDataSchema: EmptyRequestData,
  responseSchema: ReplayBufferStatusOutput
} satisfies ObsRequestDescriptor<ReplayBufferStatusOutput>

export const SaveReplayBuffer = {
  requestType: "SaveReplayBuffer",
  requestDataSchema: EmptyRequestData,
  responseSchema: UnknownRecord
} satisfies ObsRequestDescriptor<Record<string, unknown>>

export const GetLastReplayBufferReplay = {
  requestType: "GetLastReplayBufferReplay",
  requestDataSchema: EmptyRequestData,
  responseSchema: LastReplayBufferReplayOutput
} satisfies ObsRequestDescriptor<LastReplayBufferReplayOutput>
