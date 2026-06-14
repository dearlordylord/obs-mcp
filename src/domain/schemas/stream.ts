import { JSONSchema, Schema } from "effect"

import {
  ObsNonEmptyString,
  ObsNumber,
  OutputActiveState,
  outputStatusFields,
  RequestAcknowledgedOutput
} from "./shared.js"

export const StreamStatusOutput = Schema.Struct(outputStatusFields(ObsNumber))
export type StreamStatusOutput = typeof StreamStatusOutput.Type
export const StreamStatusOutputJsonSchema = JSONSchema.make(StreamStatusOutput)

export const StartStreamOutput = OutputActiveState
export type StartStreamOutput = typeof StartStreamOutput.Type
export const StartStreamOutputJsonSchema = JSONSchema.make(StartStreamOutput)

export const StopStreamOutput = OutputActiveState
export type StopStreamOutput = typeof StopStreamOutput.Type
export const StopStreamOutputJsonSchema = JSONSchema.make(StopStreamOutput)

export const ToggleStreamOutput = OutputActiveState
export type ToggleStreamOutput = typeof ToggleStreamOutput.Type
export const ToggleStreamOutputJsonSchema = JSONSchema.make(ToggleStreamOutput)

export const SendStreamCaptionInput = Schema.Struct({
  captionText: ObsNonEmptyString
})
export type SendStreamCaptionInput = typeof SendStreamCaptionInput.Type
export const SendStreamCaptionInputJsonSchema = JSONSchema.make(SendStreamCaptionInput)

export const SendStreamCaptionOutput = RequestAcknowledgedOutput("SendStreamCaption")
export type SendStreamCaptionOutput = typeof SendStreamCaptionOutput.Type
export const SendStreamCaptionOutputJsonSchema = JSONSchema.make(SendStreamCaptionOutput)
