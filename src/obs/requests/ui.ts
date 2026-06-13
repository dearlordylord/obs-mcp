import { StudioModeEnabledOutput } from "../../domain/schemas/ui.js"
import { EmptyRequestData, type ObsRequestDescriptor } from "./shared.js"

export const GetStudioModeEnabled = {
  requestType: "GetStudioModeEnabled",
  requestDataSchema: EmptyRequestData,
  responseSchema: StudioModeEnabledOutput
} satisfies ObsRequestDescriptor<StudioModeEnabledOutput>
