import { JSONSchema, Schema } from "effect"

import { ObsInteger, ObsNonNegativeInteger, ObsNumber, ObsPositiveInteger, ObsString } from "./shared.js"

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

const SceneCollectionEventData = Schema.Struct({
  sceneCollectionName: ObsString
})

const SceneCollectionListChangedEventData = Schema.Struct({
  sceneCollections: Schema.Array(ObsString)
})

const ProfileEventData = Schema.Struct({
  profileName: ObsString
})

const ProfileListChangedEventData = Schema.Struct({
  profiles: Schema.Array(ObsString)
})

const ExitStartedEventData = Schema.Struct({}).pipe(
  Schema.filter((eventData) => Object.keys(eventData).length === 0, {
    message: () => "Expected no ExitStarted event data"
  })
).annotations({
  jsonSchema: { type: "object", properties: {}, additionalProperties: false }
})

const UnknownEventRecord = Schema.Record({ key: ObsString, value: Schema.Unknown })

const pickEventFields = (eventData: unknown, keys: ReadonlyArray<string>): Record<string, unknown> => {
  const record = Schema.decodeUnknownSync(UnknownEventRecord)(eventData)
  return Object.fromEntries(keys.map((key) => [key, record[key]]))
}

const CanvasEventData = Schema.Struct({
  canvasName: ObsString,
  canvasUuid: ObsString
})

const CanvasNameChangedEventData = Schema.Struct({
  canvasUuid: ObsString,
  oldCanvasName: ObsString,
  canvasName: ObsString
})

const SourceFilterEventData = Schema.Struct({
  sourceName: ObsString,
  filterName: ObsString
})

const SourceFilterCreatedEventData = Schema.extend(SourceFilterEventData)(
  Schema.Struct({
    filterKind: ObsString,
    filterIndex: ObsNonNegativeInteger
  })
)

const SourceFilterListItem = Schema.Struct({
  filterName: ObsString,
  filterIndex: ObsNonNegativeInteger
})

const SourceFilterListReindexedEventData = Schema.Struct({
  sourceName: ObsString,
  filters: Schema.Array(SourceFilterListItem)
})

const SourceFilterNameChangedEventData = Schema.Struct({
  sourceName: ObsString,
  oldFilterName: ObsString,
  filterName: ObsString
})

const SourceFilterEnableStateChangedEventData = Schema.extend(SourceFilterEventData)(
  Schema.Struct({ filterEnabled: Schema.Boolean })
)

const SceneEventData = Schema.Struct({
  sceneName: ObsString,
  sceneUuid: ObsString
})

const SceneGroupEventData = Schema.extend(SceneEventData)(
  Schema.Struct({ isGroup: Schema.Boolean })
)

const SceneNameChangedEventData = Schema.Struct({
  sceneUuid: ObsString,
  oldSceneName: ObsString,
  sceneName: ObsString
})

const SceneListItem = Schema.Struct({
  sceneName: ObsString,
  sceneUuid: ObsString,
  sceneIndex: ObsNonNegativeInteger
})

const SceneListChangedEventData = Schema.Struct({
  scenes: Schema.Array(SceneListItem)
})

const SceneItemEventData = Schema.Struct({
  sceneName: ObsString,
  sceneUuid: ObsString,
  sceneItemId: ObsInteger
})

const SceneItemSourceEventData = Schema.extend(SceneItemEventData)(
  Schema.Struct({
    sourceName: ObsString,
    sourceUuid: ObsString
  })
)

const SceneItemCreatedEventData = Schema.extend(SceneItemSourceEventData)(
  Schema.Struct({
    sceneItemIndex: ObsNonNegativeInteger
  })
)

const ReindexedSceneItem = Schema.Struct({
  sceneItemId: ObsInteger,
  sceneItemIndex: ObsNonNegativeInteger
})

const SceneItemListReindexedEventData = Schema.Struct({
  sceneName: ObsString,
  sceneUuid: ObsString,
  sceneItems: Schema.Array(ReindexedSceneItem)
})

const SceneItemEnableStateChangedEventData = Schema.extend(SceneItemEventData)(
  Schema.Struct({ sceneItemEnabled: Schema.Boolean })
)

const SceneItemLockStateChangedEventData = Schema.extend(SceneItemEventData)(
  Schema.Struct({ sceneItemLocked: Schema.Boolean })
)

const InputEventData = Schema.Struct({
  inputName: ObsString,
  inputUuid: ObsString
})

const InputNameChangedEventData = Schema.Struct({
  inputUuid: ObsString,
  oldInputName: ObsString,
  inputName: ObsString
})

const InputMuteStateChangedEventData = Schema.extend(InputEventData)(
  Schema.Struct({ inputMuted: Schema.Boolean })
)

const InputVolumeChangedEventData = Schema.extend(InputEventData)(
  Schema.Struct({
    inputVolumeMul: ObsNumber,
    inputVolumeDb: ObsNumber
  })
)

const InputAudioBalanceChangedEventData = Schema.extend(InputEventData)(
  Schema.Struct({ inputAudioBalance: ObsNumber })
)

const InputAudioSyncOffsetChangedEventData = Schema.extend(InputEventData)(
  Schema.Struct({ inputAudioSyncOffset: ObsNumber })
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
  Schema.Struct({ outputPath: Schema.NullOr(ObsString) })
)

const RecordFileChangedEventData = Schema.Struct({
  newOutputPath: ObsString
})

const ReplayBufferSavedEventData = Schema.Struct({
  savedReplayPath: ObsString
})

const TransitionEventData = Schema.Struct({
  transitionName: ObsString,
  transitionUuid: ObsString
})

const TransitionDurationChangedEventData = Schema.Struct({
  transitionDuration: ObsNonNegativeInteger
})

const StudioModeStateChangedEventData = Schema.Struct({
  studioModeEnabled: Schema.Boolean
})

const ScreenshotSavedEventData = Schema.Struct({
  savedScreenshotPath: ObsString
})

const MediaInputEventData = InputEventData

const MediaInputActionTriggeredEventData = Schema.extend(MediaInputEventData)(
  Schema.Struct({ mediaAction: ObsMediaInputAction })
)

export const TypedObsEventData = Schema.Union(
  SceneCollectionEventData,
  SceneCollectionListChangedEventData,
  ProfileEventData,
  ProfileListChangedEventData,
  ExitStartedEventData,
  CanvasNameChangedEventData,
  CanvasEventData,
  SourceFilterCreatedEventData,
  SourceFilterListReindexedEventData,
  SourceFilterNameChangedEventData,
  SourceFilterEnableStateChangedEventData,
  SourceFilterEventData,
  SceneGroupEventData,
  SceneNameChangedEventData,
  SceneItemCreatedEventData,
  SceneItemSourceEventData,
  SceneItemListReindexedEventData,
  SceneItemEnableStateChangedEventData,
  SceneItemLockStateChangedEventData,
  SceneItemEventData,
  SceneEventData,
  SceneListChangedEventData,
  InputNameChangedEventData,
  InputMuteStateChangedEventData,
  InputVolumeChangedEventData,
  InputAudioBalanceChangedEventData,
  InputAudioSyncOffsetChangedEventData,
  InputAudioTracksChangedEventData,
  InputAudioMonitorTypeChangedEventData,
  RecordStateChangedEventData,
  RecordFileChangedEventData,
  OutputStateChangedEventData,
  ReplayBufferSavedEventData,
  TransitionEventData,
  TransitionDurationChangedEventData,
  StudioModeStateChangedEventData,
  ScreenshotSavedEventData,
  MediaInputActionTriggeredEventData,
  MediaInputEventData
)
export type TypedObsEventData = typeof TypedObsEventData.Type

export const decodeTypedObsEventData = (
  eventType: string,
  eventData: unknown
): TypedObsEventData | undefined => {
  switch (eventType) {
    case "CurrentSceneCollectionChanging":
    case "CurrentSceneCollectionChanged":
      return Schema.decodeUnknownSync(SceneCollectionEventData)(eventData)
    case "SceneCollectionListChanged":
      return Schema.decodeUnknownSync(SceneCollectionListChangedEventData)(eventData)
    case "CurrentProfileChanging":
    case "CurrentProfileChanged":
      return Schema.decodeUnknownSync(ProfileEventData)(eventData)
    case "ProfileListChanged":
      return Schema.decodeUnknownSync(ProfileListChangedEventData)(eventData)
    case "ExitStarted":
      return Schema.decodeUnknownSync(ExitStartedEventData)(eventData ?? {})
    case "CanvasCreated":
    case "CanvasRemoved":
      return Schema.decodeUnknownSync(CanvasEventData)(eventData)
    case "CanvasNameChanged":
      return Schema.decodeUnknownSync(CanvasNameChangedEventData)(eventData)
    case "SourceFilterListReindexed":
      return Schema.decodeUnknownSync(SourceFilterListReindexedEventData)(eventData)
    case "SourceFilterCreated":
      return Schema.decodeUnknownSync(SourceFilterCreatedEventData)(
        pickEventFields(eventData, ["sourceName", "filterName", "filterKind", "filterIndex"])
      )
    case "SourceFilterRemoved":
      return Schema.decodeUnknownSync(SourceFilterEventData)(eventData)
    case "SourceFilterNameChanged":
      return Schema.decodeUnknownSync(SourceFilterNameChangedEventData)(eventData)
    case "SourceFilterSettingsChanged":
      return Schema.decodeUnknownSync(SourceFilterEventData)(
        pickEventFields(eventData, ["sourceName", "filterName"])
      )
    case "SourceFilterEnableStateChanged":
      return Schema.decodeUnknownSync(SourceFilterEnableStateChangedEventData)(eventData)
    case "SceneCreated":
    case "SceneRemoved":
      return Schema.decodeUnknownSync(SceneGroupEventData)(eventData)
    case "SceneNameChanged":
      return Schema.decodeUnknownSync(SceneNameChangedEventData)(eventData)
    case "CurrentProgramSceneChanged":
    case "CurrentPreviewSceneChanged":
      return Schema.decodeUnknownSync(SceneEventData)(eventData)
    case "SceneListChanged":
      return Schema.decodeUnknownSync(SceneListChangedEventData)(eventData)
    case "SceneItemCreated":
      return Schema.decodeUnknownSync(SceneItemCreatedEventData)(eventData)
    case "SceneItemRemoved":
      return Schema.decodeUnknownSync(SceneItemSourceEventData)(eventData)
    case "SceneItemListReindexed":
      return Schema.decodeUnknownSync(SceneItemListReindexedEventData)(eventData)
    case "SceneItemEnableStateChanged":
      return Schema.decodeUnknownSync(SceneItemEnableStateChangedEventData)(eventData)
    case "SceneItemLockStateChanged":
      return Schema.decodeUnknownSync(SceneItemLockStateChangedEventData)(eventData)
    case "SceneItemSelected":
      return Schema.decodeUnknownSync(SceneItemEventData)(eventData)
    case "InputRemoved":
      return Schema.decodeUnknownSync(InputEventData)(eventData)
    case "InputNameChanged":
      return Schema.decodeUnknownSync(InputNameChangedEventData)(eventData)
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
    case "RecordFileChanged":
      return Schema.decodeUnknownSync(RecordFileChangedEventData)(eventData)
    case "ReplayBufferStateChanged":
    case "VirtualcamStateChanged":
      return Schema.decodeUnknownSync(OutputStateChangedEventData)(eventData)
    case "ReplayBufferSaved":
      return Schema.decodeUnknownSync(ReplayBufferSavedEventData)(eventData)
    case "CurrentSceneTransitionChanged":
    case "SceneTransitionStarted":
    case "SceneTransitionEnded":
    case "SceneTransitionVideoEnded":
      return Schema.decodeUnknownSync(TransitionEventData)(eventData)
    case "CurrentSceneTransitionDurationChanged":
      return Schema.decodeUnknownSync(TransitionDurationChangedEventData)(eventData)
    case "StudioModeStateChanged":
      return Schema.decodeUnknownSync(StudioModeStateChangedEventData)(eventData)
    case "ScreenshotSaved":
      return Schema.decodeUnknownSync(ScreenshotSavedEventData)(eventData)
    case "MediaInputPlaybackStarted":
    case "MediaInputPlaybackEnded":
      return Schema.decodeUnknownSync(MediaInputEventData)(eventData)
    case "MediaInputActionTriggered":
      return Schema.decodeUnknownSync(MediaInputActionTriggeredEventData)(eventData)
    default:
      return undefined
  }
}

// Recent-event limit is a request-local page size, not a durable branded count type.
const RecentObsEventsLimit = ObsNumber.pipe(
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
  sequence: ObsPositiveInteger,
  eventType: ObsString,
  eventIntent: ObsNonNegativeInteger,
  category: ObsEventCategory,
  eventData: Schema.optional(TypedObsEventData)
})
export type ObsEventSummary = typeof ObsEventSummary.Type

export const GetRecentObsEventsOutput = Schema.Struct({
  capacity: ObsPositiveInteger,
  droppedEvents: ObsNonNegativeInteger,
  returnedEvents: ObsNonNegativeInteger,
  order: RecentObsEventsOrder,
  events: Schema.Array(ObsEventSummary)
})
export type GetRecentObsEventsOutput = typeof GetRecentObsEventsOutput.Type
export const GetRecentObsEventsOutputJsonSchema = JSONSchema.make(GetRecentObsEventsOutput)
