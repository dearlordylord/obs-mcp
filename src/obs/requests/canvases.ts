import { RawCanvasListOutput } from "../../domain/schemas/canvases.js"
import { EmptyRequestData, type ObsRequestDescriptor } from "./shared.js"

export const GetCanvasList = {
  requestType: "GetCanvasList",
  requestDataSchema: EmptyRequestData,
  responseSchema: RawCanvasListOutput
} satisfies ObsRequestDescriptor<RawCanvasListOutput>
