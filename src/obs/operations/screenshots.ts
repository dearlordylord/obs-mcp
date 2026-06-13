import { stat } from "node:fs/promises"
import path from "node:path"

import { Schema } from "effect"

import * as ScreenshotSchemas from "../../domain/schemas/screenshots.js"
import type {
  GetSourceScreenshotInput,
  GetSourceScreenshotOutput,
  SaveSourceScreenshotInput,
  SaveSourceScreenshotOutput,
  SourceScreenshotFormat
} from "../../domain/schemas/screenshots.js"
import { ObsString } from "../../domain/schemas/shared.js"
import type { ObsClient } from "../client.js"
import { GetSourceScreenshot, SaveSourceScreenshot } from "../requests.js"

const MAX_SCREENSHOT_BYTES = 1_500_000

const mimeForFormat = (format: SourceScreenshotFormat): GetSourceScreenshotOutput["mimeType"] =>
  format === "jpg" || format === "jpeg"
    ? "image/jpeg"
    : format === "webp"
    ? "image/webp"
    : format === "bmp"
    ? "image/bmp"
    : "image/png"

const parseScreenshotData = (
  imageData: string,
  requestedFormat: SourceScreenshotFormat
): { readonly base64Data: string; readonly mimeType: GetSourceScreenshotOutput["mimeType"] } => {
  const match = /^data:([^;]+);base64,(.*)$/u.exec(imageData)
  if (match === null) {
    return { base64Data: imageData, mimeType: mimeForFormat(requestedFormat) }
  }
  const [, mimeTypeText, base64Data] = match
  const mimeType = Schema.decodeUnknownSync(ScreenshotSchemas.GetSourceScreenshotOutput.fields.mimeType)(
    Schema.decodeUnknownSync(ObsString)(mimeTypeText)
  )
  const expectedMimeType = mimeForFormat(requestedFormat)
  if (mimeType !== expectedMimeType) {
    throw new Error(`OBS screenshot MIME ${mimeType} does not match requested ${expectedMimeType}`)
  }
  return { base64Data: Schema.decodeUnknownSync(ObsString)(base64Data), mimeType }
}

export const getSourceScreenshot = async (
  client: ObsClient,
  input: GetSourceScreenshotInput
): Promise<GetSourceScreenshotOutput> => {
  const decodedInput = Schema.decodeUnknownSync(ScreenshotSchemas.GetSourceScreenshotInput)(input)
  const response = await client.request(GetSourceScreenshot, decodedInput)
  const parsed = parseScreenshotData(response.imageData, decodedInput.imageFormat)
  const imageBytes = Buffer.byteLength(parsed.base64Data, "base64")
  if (imageBytes > MAX_SCREENSHOT_BYTES) {
    throw new Error(`OBS screenshot exceeds ${MAX_SCREENSHOT_BYTES} byte limit`)
  }
  return Schema.decodeUnknownSync(ScreenshotSchemas.GetSourceScreenshotOutput)({
    imageFormat: decodedInput.imageFormat,
    mimeType: parsed.mimeType,
    imageBytes,
    maxImageBytes: MAX_SCREENSHOT_BYTES,
    base64Data: parsed.base64Data
  })
}

export const saveSourceScreenshot = async (
  client: ObsClient,
  input: SaveSourceScreenshotInput,
  outputDirectory: string | undefined
): Promise<SaveSourceScreenshotOutput> => {
  if (outputDirectory === undefined) {
    throw new Error("save_source_screenshot requires OBS_MCP_SCREENSHOT_OUTPUT_DIR")
  }
  const directory = path.resolve(outputDirectory)
  const directoryStat = await stat(directory)
  if (!directoryStat.isDirectory()) {
    throw new Error("OBS_MCP_SCREENSHOT_OUTPUT_DIR must point to an existing directory")
  }
  const decodedInput = Schema.decodeUnknownSync(ScreenshotSchemas.SaveSourceScreenshotInput)(input)
  const imageFilePath = path.resolve(directory, decodedInput.fileName)
  await client.request(SaveSourceScreenshot, {
    ...(decodedInput.sourceName === undefined ? {} : { sourceName: decodedInput.sourceName }),
    ...(decodedInput.sourceUuid === undefined ? {} : { sourceUuid: decodedInput.sourceUuid }),
    ...(decodedInput.canvasUuid === undefined ? {} : { canvasUuid: decodedInput.canvasUuid }),
    imageFormat: decodedInput.imageFormat,
    ...(decodedInput.imageWidth === undefined ? {} : { imageWidth: decodedInput.imageWidth }),
    ...(decodedInput.imageHeight === undefined ? {} : { imageHeight: decodedInput.imageHeight }),
    ...(decodedInput.imageCompressionQuality === undefined
      ? {}
      : { imageCompressionQuality: decodedInput.imageCompressionQuality }),
    imageFilePath
  })
  return { imageFilePath, imageFormat: decodedInput.imageFormat, saved: true }
}
