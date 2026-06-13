import { JSONSchema, Schema } from "effect"

import { SourceLocatorInput } from "./scenes.js"

const ImageDimension = Schema.Number.pipe(Schema.int(), Schema.greaterThanOrEqualTo(8), Schema.lessThanOrEqualTo(4_096))
const ImageCompressionQuality = Schema.Number.pipe(
  Schema.int(),
  Schema.greaterThanOrEqualTo(-1),
  Schema.lessThanOrEqualTo(100)
)

export const SourceScreenshotFormat = Schema.Literal("png", "jpg", "jpeg", "webp", "bmp")
export type SourceScreenshotFormat = typeof SourceScreenshotFormat.Type

export const SourceScreenshotRequestFields = Schema.Struct({
  imageFormat: SourceScreenshotFormat,
  imageWidth: Schema.optional(ImageDimension),
  imageHeight: Schema.optional(ImageDimension),
  imageCompressionQuality: Schema.optional(ImageCompressionQuality)
})
export type SourceScreenshotRequestFields = typeof SourceScreenshotRequestFields.Type

export const GetSourceScreenshotInput = Schema.extend(SourceLocatorInput, SourceScreenshotRequestFields)
export type GetSourceScreenshotInput = typeof GetSourceScreenshotInput.Type
export const GetSourceScreenshotInputJsonSchema = JSONSchema.make(GetSourceScreenshotInput)

export const GetSourceScreenshotOutput = Schema.Struct({
  imageFormat: SourceScreenshotFormat,
  mimeType: Schema.Literal("image/png", "image/jpeg", "image/webp", "image/bmp"),
  imageBytes: Schema.Number.pipe(Schema.int(), Schema.greaterThanOrEqualTo(0)),
  maxImageBytes: Schema.Number.pipe(Schema.int(), Schema.greaterThan(0)),
  base64Data: Schema.String
})
export type GetSourceScreenshotOutput = typeof GetSourceScreenshotOutput.Type
export const GetSourceScreenshotOutputJsonSchema = JSONSchema.make(GetSourceScreenshotOutput)

export const ObsGetSourceScreenshotOutput = Schema.Struct({
  imageData: Schema.String
})
export type ObsGetSourceScreenshotOutput = typeof ObsGetSourceScreenshotOutput.Type

export const SaveSourceScreenshotInput = Schema.extend(
  GetSourceScreenshotInput,
  Schema.Struct({
    fileName: Schema.NonEmptyString.pipe(
      Schema.pattern(/^[A-Za-z0-9._-]+$/),
      Schema.filter((value) => value !== "." && value !== "..", {
        message: () => "fileName must be a simple filename, not a path"
      })
    )
  })
)
export type SaveSourceScreenshotInput = typeof SaveSourceScreenshotInput.Type
export const SaveSourceScreenshotInputJsonSchema = JSONSchema.make(SaveSourceScreenshotInput)

export const SaveSourceScreenshotOutput = Schema.Struct({
  imageFilePath: Schema.String,
  imageFormat: SourceScreenshotFormat,
  saved: Schema.Literal(true)
})
export type SaveSourceScreenshotOutput = typeof SaveSourceScreenshotOutput.Type
export const SaveSourceScreenshotOutputJsonSchema = JSONSchema.make(SaveSourceScreenshotOutput)

export const ObsSaveSourceScreenshotInput = Schema.extend(
  GetSourceScreenshotInput,
  Schema.Struct({
    imageFilePath: Schema.NonEmptyString
  })
)
export type ObsSaveSourceScreenshotInput = typeof ObsSaveSourceScreenshotInput.Type
