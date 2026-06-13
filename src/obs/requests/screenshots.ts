import {
  GetSourceScreenshotInput,
  ObsGetSourceScreenshotOutput,
  ObsSaveSourceScreenshotInput
} from "../../domain/schemas/screenshots.js"
import { EmptyRequestData, type ObsRequestDescriptor } from "./shared.js"

export const GetSourceScreenshot = {
  requestType: "GetSourceScreenshot",
  requestDataSchema: GetSourceScreenshotInput,
  responseSchema: ObsGetSourceScreenshotOutput
} satisfies ObsRequestDescriptor<ObsGetSourceScreenshotOutput>

export const SaveSourceScreenshot = {
  requestType: "SaveSourceScreenshot",
  requestDataSchema: ObsSaveSourceScreenshotInput,
  responseSchema: EmptyRequestData
} satisfies ObsRequestDescriptor<typeof EmptyRequestData.Type>
