import { JSONSchema, Schema } from "effect"

import { ObsMediaInputAction } from "./inputs.js"

const DEFAULT_RECENT_OBS_EVENTS_LIMIT = 20
const MAX_RECENT_OBS_EVENTS_LIMIT = 100

export const ObsEventCategory = Schema.Literal(
  "general",
  "config",
  "scenes",
  "inputs",
  "transitions",
  "filters",
  "outputs",
  "scene_items",
  "media_inputs",
  "ui",
  "canvases",
  "unknown"
)
export type ObsEventCategory = typeof ObsEventCategory.Type

export const RecentObsEventsOrder = Schema.Literal("newest_first", "oldest_first")
export type RecentObsEventsOrder = typeof RecentObsEventsOrder.Type

export const ObsOutputState = Schema.Literal(
  "OBS_WEBSOCKET_OUTPUT_UNKNOWN",
  "OBS_WEBSOCKET_OUTPUT_STARTING",
  "OBS_WEBSOCKET_OUTPUT_STARTED",
  "OBS_WEBSOCKET_OUTPUT_STOPPING",
  "OBS_WEBSOCKET_OUTPUT_STOPPED",
  "OBS_WEBSOCKET_OUTPUT_RECONNECTING",
  "OBS_WEBSOCKET_OUTPUT_RECONNECTED",
  "OBS_WEBSOCKET_OUTPUT_PAUSED",
  "OBS_WEBSOCKET_OUTPUT_RESUMED"
)
export type ObsOutputState = typeof ObsOutputState.Type

export const ObsInputAudioMonitorType = Schema.Literal(
  "OBS_MONITORING_TYPE_NONE",
  "OBS_MONITORING_TYPE_MONITOR_ONLY",
  "OBS_MONITORING_TYPE_MONITOR_AND_OUTPUT"
)
export type ObsInputAudioMonitorType = typeof ObsInputAudioMonitorType.Type

const SceneEventData = Schema.Struct({
  sceneName: Schema.String,
  sceneUuid: Schema.String
})

const SceneListItem = Schema.Struct({
  sceneName: Schema.String,
  sceneUuid: Schema.String,
  sceneIndex: Schema.Number.pipe(Schema.int(), Schema.greaterThanOrEqualTo(0))
})

const SceneListChangedEventData = Schema.Struct({
  scenes: Schema.Array(SceneListItem)
})

const InputEventData = Schema.Struct({
  inputName: Schema.String,
  inputUuid: Schema.String
})

const InputMuteStateChangedEventData = Schema.extend(InputEventData)(
  Schema.Struct({ inputMuted: Schema.Boolean })
)

const InputVolumeChangedEventData = Schema.extend(InputEventData)(
  Schema.Struct({
    inputVolumeMul: Schema.Number,
    inputVolumeDb: Schema.Number
  })
)

const InputAudioBalanceChangedEventData = Schema.extend(InputEventData)(
  Schema.Struct({ inputAudioBalance: Schema.Number })
)

const InputAudioSyncOffsetChangedEventData = Schema.extend(InputEventData)(
  Schema.Struct({ inputAudioSyncOffset: Schema.Number })
)

const InputAudioTracksChangedEventData = Schema.extend(InputEventData)(
  Schema.Struct({
    inputAudioTracks: Schema.Struct({
      "1": Schema.Boolean,
      "2": Schema.Boolean,
      "3": Schema.Boolean,
      "4": Schema.Boolean,
      "5": Schema.Boolean,
      "6": Schema.Boolean
    })
  })
)

const InputAudioMonitorTypeChangedEventData = Schema.extend(InputEventData)(
  Schema.Struct({ monitorType: ObsInputAudioMonitorType })
)

const OutputStateChangedEventData = Schema.Struct({
  outputActive: Schema.Boolean,
  outputState: ObsOutputState
})

const RecordStateChangedEventData = Schema.extend(OutputStateChangedEventData)(
  Schema.Struct({ outputPath: Schema.NullOr(Schema.String) })
)

const ReplayBufferSavedEventData = Schema.Struct({
  savedReplayPath: Schema.String
})

const MediaInputEventData = InputEventData

const MediaInputActionTriggeredEventData = Schema.extend(MediaInputEventData)(
  Schema.Struct({ mediaAction: ObsMediaInputAction })
)

export const TypedObsEventData = Schema.Union(
  SceneEventData,
  SceneListChangedEventData,
  InputMuteStateChangedEventData,
  InputVolumeChangedEventData,
  InputAudioBalanceChangedEventData,
  InputAudioSyncOffsetChangedEventData,
  InputAudioTracksChangedEventData,
  InputAudioMonitorTypeChangedEventData,
  RecordStateChangedEventData,
  OutputStateChangedEventData,
  ReplayBufferSavedEventData,
  MediaInputActionTriggeredEventData,
  MediaInputEventData
)
export type TypedObsEventData = typeof TypedObsEventData.Type

export const decodeTypedObsEventData = (
  eventType: string,
  eventData: unknown
): TypedObsEventData | undefined => {
  switch (eventType) {
    case "CurrentProgramSceneChanged":
      return Schema.decodeUnknownSync(SceneEventData)(eventData)
    case "SceneListChanged":
      return Schema.decodeUnknownSync(SceneListChangedEventData)(eventData)
    case "InputMuteStateChanged":
      return Schema.decodeUnknownSync(InputMuteStateChangedEventData)(eventData)
    case "InputVolumeChanged":
      return Schema.decodeUnknownSync(InputVolumeChangedEventData)(eventData)
    case "InputAudioBalanceChanged":
      return Schema.decodeUnknownSync(InputAudioBalanceChangedEventData)(eventData)
    case "InputAudioSyncOffsetChanged":
      return Schema.decodeUnknownSync(InputAudioSyncOffsetChangedEventData)(eventData)
    case "InputAudioTracksChanged":
      return Schema.decodeUnknownSync(InputAudioTracksChangedEventData)(eventData)
    case "InputAudioMonitorTypeChanged":
      return Schema.decodeUnknownSync(InputAudioMonitorTypeChangedEventData)(eventData)
    case "StreamStateChanged":
      return Schema.decodeUnknownSync(OutputStateChangedEventData)(eventData)
    case "RecordStateChanged":
      return Schema.decodeUnknownSync(RecordStateChangedEventData)(eventData)
    case "ReplayBufferStateChanged":
      return Schema.decodeUnknownSync(OutputStateChangedEventData)(eventData)
    case "ReplayBufferSaved":
      return Schema.decodeUnknownSync(ReplayBufferSavedEventData)(eventData)
    case "MediaInputPlaybackStarted":
    case "MediaInputPlaybackEnded":
      return Schema.decodeUnknownSync(MediaInputEventData)(eventData)
    case "MediaInputActionTriggered":
      return Schema.decodeUnknownSync(MediaInputActionTriggeredEventData)(eventData)
    default:
      return undefined
  }
}

const RecentObsEventsLimit = Schema.Number.pipe(
  Schema.int(),
  Schema.greaterThanOrEqualTo(1),
  Schema.lessThanOrEqualTo(MAX_RECENT_OBS_EVENTS_LIMIT)
)

export const GetRecentObsEventsInput = Schema.Struct({
  limit: Schema.optionalWith(RecentObsEventsLimit, { default: () => DEFAULT_RECENT_OBS_EVENTS_LIMIT }),
  order: Schema.optionalWith(RecentObsEventsOrder, { default: () => "newest_first" as const }),
  categories: Schema.optional(Schema.Array(ObsEventCategory))
})
export type GetRecentObsEventsInput = typeof GetRecentObsEventsInput.Type
export const GetRecentObsEventsInputJsonSchema = JSONSchema.make(GetRecentObsEventsInput)

export const ObsEventSummary = Schema.Struct({
  sequence: Schema.Number.pipe(Schema.int(), Schema.positive()),
  eventType: Schema.String,
  eventIntent: Schema.Number.pipe(Schema.int(), Schema.greaterThanOrEqualTo(0)),
  category: ObsEventCategory,
  eventData: Schema.optional(TypedObsEventData)
})
export type ObsEventSummary = typeof ObsEventSummary.Type

export const GetRecentObsEventsOutput = Schema.Struct({
  capacity: Schema.Number.pipe(Schema.int(), Schema.positive()),
  droppedEvents: Schema.Number.pipe(Schema.int(), Schema.greaterThanOrEqualTo(0)),
  returnedEvents: Schema.Number.pipe(Schema.int(), Schema.greaterThanOrEqualTo(0)),
  order: RecentObsEventsOrder,
  events: Schema.Array(ObsEventSummary)
})
export type GetRecentObsEventsOutput = typeof GetRecentObsEventsOutput.Type
export const GetRecentObsEventsOutputJsonSchema = JSONSchema.make(GetRecentObsEventsOutput)
