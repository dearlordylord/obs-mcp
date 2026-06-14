import { JSONSchema, Schema } from "effect"

import { ObsNonEmptyString, ObsNonNegativeInteger, ObsNumber, ObsString } from "./shared.js"

import { SourceLocatorInput } from "./scenes.js"

// Screenshot dimensions are bounded structural pixels, not branded image identities.
const ImageDimensionMin = 8
const ImageDimensionMax = 4_096
const ImageDimension = ObsNumber.pipe(
  Schema.int(),
  Schema.greaterThanOrEqualTo(ImageDimensionMin),
  Schema.lessThanOrEqualTo(ImageDimensionMax)
)
// OBS accepts -1 as "use default quality", so this remains a structural option value instead of a brand.
const ImageCompressionQualityDefault = -1
const ImageCompressionQualityMax = 100
const ImageCompressionQuality = ObsNumber.pipe(
  Schema.int(),
  Schema.greaterThanOrEqualTo(ImageCompressionQualityDefault),
  Schema.lessThanOrEqualTo(ImageCompressionQualityMax)
)
// A byte limit is a transport safety bound; branding would not add meaning beyond positive integer validation.
const PositiveByteLimit = ObsNumber.pipe(Schema.int(), Schema.greaterThan(0))

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
  imageBytes: ObsNonNegativeInteger,
  maxImageBytes: PositiveByteLimit,
  base64Data: ObsString
})
export type GetSourceScreenshotOutput = typeof GetSourceScreenshotOutput.Type
export const GetSourceScreenshotOutputJsonSchema = JSONSchema.make(GetSourceScreenshotOutput)

export const ObsGetSourceScreenshotOutput = Schema.Struct({
  imageData: ObsString
})
export type ObsGetSourceScreenshotOutput = typeof ObsGetSourceScreenshotOutput.Type

export const SaveSourceScreenshotInput = Schema.extend(
  GetSourceScreenshotInput,
  Schema.Struct({
    fileName: ObsNonEmptyString.pipe(
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
  imageFilePath: ObsString,
  imageFormat: SourceScreenshotFormat,
  saved: Schema.Literal(true)
})
export type SaveSourceScreenshotOutput = typeof SaveSourceScreenshotOutput.Type
export const SaveSourceScreenshotOutputJsonSchema = JSONSchema.make(SaveSourceScreenshotOutput)

export const ObsSaveSourceScreenshotInput = Schema.extend(
  GetSourceScreenshotInput,
  Schema.Struct({
    imageFilePath: ObsNonEmptyString
  })
)
export type ObsSaveSourceScreenshotInput = typeof ObsSaveSourceScreenshotInput.Type
