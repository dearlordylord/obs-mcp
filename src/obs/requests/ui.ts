import { Schema } from "effect"

import {
  OpenInputFiltersDialogInput,
  OpenInputInteractDialogInput,
  OpenInputPropertiesDialogInput,
  OpenSourceProjectorInput,
  OpenVideoMixProjectorInput,
  RawMonitorListOutput,
  SetStudioModeEnabledInput,
  StudioModeEnabledOutput
} from "../../domain/schemas/ui.js"
import { EmptyRequestData, type ObsRequestDescriptor } from "./shared.js"

const EmptyResponseData = Schema.Struct({})

export const GetStudioModeEnabled = {
  requestType: "GetStudioModeEnabled",
  requestDataSchema: EmptyRequestData,
  responseSchema: StudioModeEnabledOutput
} satisfies ObsRequestDescriptor<StudioModeEnabledOutput>

export const SetStudioModeEnabled = {
  requestType: "SetStudioModeEnabled",
  requestDataSchema: SetStudioModeEnabledInput,
  responseSchema: EmptyResponseData
} satisfies ObsRequestDescriptor<typeof EmptyResponseData.Type>

export const OpenInputPropertiesDialog = {
  requestType: "OpenInputPropertiesDialog",
  requestDataSchema: OpenInputPropertiesDialogInput,
  responseSchema: EmptyResponseData
} satisfies ObsRequestDescriptor<typeof EmptyResponseData.Type>

export const OpenInputFiltersDialog = {
  requestType: "OpenInputFiltersDialog",
  requestDataSchema: OpenInputFiltersDialogInput,
  responseSchema: EmptyResponseData
} satisfies ObsRequestDescriptor<typeof EmptyResponseData.Type>

export const OpenInputInteractDialog = {
  requestType: "OpenInputInteractDialog",
  requestDataSchema: OpenInputInteractDialogInput,
  responseSchema: EmptyResponseData
} satisfies ObsRequestDescriptor<typeof EmptyResponseData.Type>

export const GetMonitorList = {
  requestType: "GetMonitorList",
  requestDataSchema: EmptyRequestData,
  responseSchema: RawMonitorListOutput
} satisfies ObsRequestDescriptor<RawMonitorListOutput>

export const OpenVideoMixProjector = {
  requestType: "OpenVideoMixProjector",
  requestDataSchema: OpenVideoMixProjectorInput,
  responseSchema: EmptyResponseData
} satisfies ObsRequestDescriptor<typeof EmptyResponseData.Type>

export const OpenSourceProjector = {
  requestType: "OpenSourceProjector",
  requestDataSchema: OpenSourceProjectorInput,
  responseSchema: EmptyResponseData
} satisfies ObsRequestDescriptor<typeof EmptyResponseData.Type>
