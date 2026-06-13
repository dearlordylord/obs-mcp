import { JSONSchema, Schema } from "effect"

import { InputLocatorInput } from "./inputs.js"

export const StudioModeEnabledOutput = Schema.Struct({
  studioModeEnabled: Schema.Boolean
})
export type StudioModeEnabledOutput = typeof StudioModeEnabledOutput.Type
export const StudioModeEnabledOutputJsonSchema = JSONSchema.make(StudioModeEnabledOutput)

export const UiSideEffectOutput = <RequestType extends string>(requestType: RequestType) =>
  Schema.Struct({
    requestType: Schema.Literal(requestType),
    acknowledged: Schema.Literal(true)
  })

export const OpenInputPropertiesDialogInput = InputLocatorInput
export type OpenInputPropertiesDialogInput = typeof OpenInputPropertiesDialogInput.Type
export const OpenInputPropertiesDialogInputJsonSchema = JSONSchema.make(OpenInputPropertiesDialogInput)
export const OpenInputPropertiesDialogOutput = UiSideEffectOutput("OpenInputPropertiesDialog")
export type OpenInputPropertiesDialogOutput = typeof OpenInputPropertiesDialogOutput.Type
export const OpenInputPropertiesDialogOutputJsonSchema = JSONSchema.make(OpenInputPropertiesDialogOutput)

export const OpenInputFiltersDialogInput = InputLocatorInput
export type OpenInputFiltersDialogInput = typeof OpenInputFiltersDialogInput.Type
export const OpenInputFiltersDialogInputJsonSchema = JSONSchema.make(OpenInputFiltersDialogInput)
export const OpenInputFiltersDialogOutput = UiSideEffectOutput("OpenInputFiltersDialog")
export type OpenInputFiltersDialogOutput = typeof OpenInputFiltersDialogOutput.Type
export const OpenInputFiltersDialogOutputJsonSchema = JSONSchema.make(OpenInputFiltersDialogOutput)

export const OpenInputInteractDialogInput = InputLocatorInput
export type OpenInputInteractDialogInput = typeof OpenInputInteractDialogInput.Type
export const OpenInputInteractDialogInputJsonSchema = JSONSchema.make(OpenInputInteractDialogInput)
export const OpenInputInteractDialogOutput = UiSideEffectOutput("OpenInputInteractDialog")
export type OpenInputInteractDialogOutput = typeof OpenInputInteractDialogOutput.Type
export const OpenInputInteractDialogOutputJsonSchema = JSONSchema.make(OpenInputInteractDialogOutput)

const RawMonitor = Schema.Record({ key: Schema.String, value: Schema.Unknown })
const WindowedProjectorMonitorIndex = -1
const ProjectorMonitorIndex = Schema.optional(
  Schema.Number.pipe(Schema.int(), Schema.greaterThanOrEqualTo(WindowedProjectorMonitorIndex))
)
const ProjectorGeometry = Schema.optional(Schema.NonEmptyString)

export const MonitorSummary = Schema.Struct({
  monitorIndex: Schema.Number.pipe(Schema.int(), Schema.greaterThanOrEqualTo(0)),
  monitorName: Schema.optional(Schema.String),
  monitorWidth: Schema.optional(Schema.Number.pipe(Schema.int(), Schema.greaterThanOrEqualTo(0))),
  monitorHeight: Schema.optional(Schema.Number.pipe(Schema.int(), Schema.greaterThanOrEqualTo(0))),
  monitorPositionX: Schema.optional(Schema.Number.pipe(Schema.int())),
  monitorPositionY: Schema.optional(Schema.Number.pipe(Schema.int()))
})
export type MonitorSummary = typeof MonitorSummary.Type

export const RawMonitorListOutput = Schema.Struct({
  monitors: Schema.Array(RawMonitor)
})
export type RawMonitorListOutput = typeof RawMonitorListOutput.Type

export const MonitorListOutput = Schema.Struct({
  monitors: Schema.Array(MonitorSummary)
})
export type MonitorListOutput = typeof MonitorListOutput.Type
export const MonitorListOutputJsonSchema = JSONSchema.make(MonitorListOutput)

const ProjectorPlacementInput = Schema.Struct({
  monitorIndex: ProjectorMonitorIndex,
  projectorGeometry: ProjectorGeometry
}).pipe(
  Schema.filter((input) => !(input.monitorIndex !== undefined && input.projectorGeometry !== undefined), {
    message: () => "monitorIndex and projectorGeometry are mutually exclusive"
  })
)

export const VideoMixType = Schema.Literal(
  "OBS_WEBSOCKET_VIDEO_MIX_TYPE_PREVIEW",
  "OBS_WEBSOCKET_VIDEO_MIX_TYPE_PROGRAM",
  "OBS_WEBSOCKET_VIDEO_MIX_TYPE_MULTIVIEW"
)
export type VideoMixType = typeof VideoMixType.Type

export const OpenVideoMixProjectorInput = Schema.extend(
  ProjectorPlacementInput,
  Schema.Struct({
    videoMixType: VideoMixType
  })
)
export type OpenVideoMixProjectorInput = typeof OpenVideoMixProjectorInput.Type
export const OpenVideoMixProjectorInputJsonSchema = JSONSchema.make(OpenVideoMixProjectorInput)
export const OpenVideoMixProjectorOutput = UiSideEffectOutput("OpenVideoMixProjector")
export type OpenVideoMixProjectorOutput = typeof OpenVideoMixProjectorOutput.Type
export const OpenVideoMixProjectorOutputJsonSchema = JSONSchema.make(OpenVideoMixProjectorOutput)

export const OpenSourceProjectorInput = Schema.Struct({
  canvasUuid: Schema.optional(Schema.NonEmptyString),
  sourceName: Schema.optional(Schema.NonEmptyString),
  sourceUuid: Schema.optional(Schema.NonEmptyString),
  monitorIndex: ProjectorMonitorIndex,
  projectorGeometry: ProjectorGeometry
}).pipe(
  Schema.filter((input) => (input.sourceName === undefined) !== (input.sourceUuid === undefined), {
    message: () => "Exactly one of sourceName or sourceUuid is required"
  }),
  Schema.filter((input) => !(input.monitorIndex !== undefined && input.projectorGeometry !== undefined), {
    message: () => "monitorIndex and projectorGeometry are mutually exclusive"
  })
)
export type OpenSourceProjectorInput = typeof OpenSourceProjectorInput.Type
export const OpenSourceProjectorInputJsonSchema = JSONSchema.make(OpenSourceProjectorInput)
export const OpenSourceProjectorOutput = UiSideEffectOutput("OpenSourceProjector")
export type OpenSourceProjectorOutput = typeof OpenSourceProjectorOutput.Type
export const OpenSourceProjectorOutputJsonSchema = JSONSchema.make(OpenSourceProjectorOutput)
