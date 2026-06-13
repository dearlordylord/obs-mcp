import * as ScreenshotSchemas from "../../domain/schemas/index.js"
import { getSourceScreenshot, saveSourceScreenshot } from "../../obs/operations/screenshots.js"
import { GetSourceScreenshot, SaveSourceScreenshot } from "../../obs/requests.js"
import { defineTool, type ToolDefinition } from "./mechanics.js"

const CATEGORY = "screenshots" as const

export const screenshotTools: ReadonlyArray<ToolDefinition> = [
  defineTool({
    name: "get_source_screenshot",
    title: "Get OBS Source Screenshot",
    description: "Return bounded base64 image data for an OBS source screenshot.",
    category: CATEGORY,
    requiredObsRequests: [GetSourceScreenshot.requestType],
    inputSchema: ScreenshotSchemas.GetSourceScreenshotInput,
    outputSchema: ScreenshotSchemas.GetSourceScreenshotOutput,
    handler: async (input, context) => getSourceScreenshot(context.client, input)
  }),
  defineTool({
    name: "save_source_screenshot",
    title: "Save OBS Source Screenshot",
    description: "Save an OBS source screenshot under OBS_MCP_SCREENSHOT_OUTPUT_DIR using a safe filename.",
    category: CATEGORY,
    requiredObsRequests: [SaveSourceScreenshot.requestType],
    inputSchema: ScreenshotSchemas.SaveSourceScreenshotInput,
    outputSchema: ScreenshotSchemas.SaveSourceScreenshotOutput,
    handler: async (input, context) =>
      saveSourceScreenshot(context.client, input, context.config.screenshotOutputDirectory)
  })
]
