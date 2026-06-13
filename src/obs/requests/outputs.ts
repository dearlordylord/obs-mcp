import { VirtualCamStatusOutput } from "../../domain/schemas/outputs.js"
import { UnknownRecord } from "../../domain/schemas/shared.js"
import { EmptyRequestData, type ObsRequestDescriptor } from "./shared.js"

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
