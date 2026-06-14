/* eslint-disable max-lines */
import { JSONSchema, Schema } from "effect"

import { ObsInputAudioTracks, ObsNonEmptyString, ObsNonNegativeInteger, ObsNumber, ObsString } from "./shared.js"

import { CanvasName, CanvasUuid } from "./canvases.js"
import { ProfileName, SceneCollectionName } from "./config.js"
import {
  InputAudioBalance,
  InputAudioMonitorType,
  InputAudioSyncOffset,
  InputAudioTracks,
  InputVolumeDb,
  InputVolumeMul,
  ObsMediaInputAction
} from "./inputs.js"
import { TransitionDuration } from "./transitions.js"

const DEFAULT_RECENT_OBS_EVENTS_LIMIT = 20
const MAX_RECENT_OBS_EVENTS_LIMIT = 100

const SafeInteger = ObsNumber.pipe(
  Schema.int(),
  Schema.greaterThanOrEqualTo(0),
  Schema.lessThanOrEqualTo(Number.MAX_SAFE_INTEGER)
)

const PositiveSafeInteger = ObsNumber.pipe(
  Schema.int(),
  Schema.greaterThan(0),
  Schema.lessThanOrEqualTo(Number.MAX_SAFE_INTEGER)
)

export const EventSequence = PositiveSafeInteger
export type EventSequence = typeof EventSequence.Type

export const EventCursor = SafeInteger
export type EventCursor = typeof EventCursor.Type

export const EventBufferCapacity = ObsNumber.pipe(
  Schema.int(),
  Schema.greaterThan(0),
  Schema.lessThanOrEqualTo(Number.MAX_SAFE_INTEGER)
)
export type EventBufferCapacity = typeof EventBufferCapacity.Type

export const EventCount = SafeInteger
export type EventCount = typeof EventCount.Type

export const EventIntent = SafeInteger
export type EventIntent = typeof EventIntent.Type

const CONFIG_EVENT_INTENT = 2
const ConfigEventIntent = Schema.Literal(CONFIG_EVENT_INTENT)
const UI_EVENT_INTENT = 1024
const UiEventIntent = Schema.Literal(UI_EVENT_INTENT)
const CANVAS_EVENT_INTENT = 2048
const CanvasEventIntent = Schema.Literal(CANVAS_EVENT_INTENT)
const INPUTS_EVENT_INTENT = 8
const InputsEventIntent = Schema.Literal(INPUTS_EVENT_INTENT)

export const EventTimeoutMs = ObsNumber.pipe(
  Schema.int(),
  Schema.greaterThan(0),
  Schema.lessThanOrEqualTo(Number.MAX_SAFE_INTEGER)
)
export type EventTimeoutMs = typeof EventTimeoutMs.Type

export const ObsOutputPath = ObsNonEmptyString
export type ObsOutputPath = typeof ObsOutputPath.Type

export const OptionalObsOutputPath = Schema.NullOr(ObsOutputPath)
export type OptionalObsOutputPath = typeof OptionalObsOutputPath.Type

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

export const OutputLifecycleTarget = Schema.Literal("stream", "record", "replay_buffer", "virtualcam")
export type OutputLifecycleTarget = typeof OutputLifecycleTarget.Type

export const OutputLifecycleOutcome = Schema.Literal(
  "started",
  "stopped",
  "paused",
  "resumed",
  "file_changed",
  "replay_saved"
)
export type OutputLifecycleOutcome = typeof OutputLifecycleOutcome.Type

export const OutputLifecycleEventType = Schema.Literal(
  "StreamStateChanged",
  "RecordStateChanged",
  "RecordFileChanged",
  "ReplayBufferStateChanged",
  "VirtualcamStateChanged",
  "ReplayBufferSaved"
)
export type OutputLifecycleEventType = typeof OutputLifecycleEventType.Type

export const SceneGraphChangeTarget = Schema.Literal(
  "scene",
  "current_program_scene",
  "current_preview_scene",
  "scene_item"
)
export type SceneGraphChangeTarget = typeof SceneGraphChangeTarget.Type

export const SceneGraphChangeOutcome = Schema.Literal(
  "created",
  "removed",
  "renamed",
  "changed",
  "reordered",
  "enabled",
  "disabled",
  "locked",
  "unlocked"
)
export type SceneGraphChangeOutcome = typeof SceneGraphChangeOutcome.Type

export const SceneGraphChangeEventType = Schema.Literal(
  "SceneCreated",
  "SceneRemoved",
  "SceneNameChanged",
  "CurrentProgramSceneChanged",
  "CurrentPreviewSceneChanged",
  "SceneItemCreated",
  "SceneItemRemoved",
  "SceneItemListReindexed",
  "SceneItemEnableStateChanged",
  "SceneItemLockStateChanged"
)
export type SceneGraphChangeEventType = typeof SceneGraphChangeEventType.Type

export const SceneGraphSceneItemId = SafeInteger
export type SceneGraphSceneItemId = typeof SceneGraphSceneItemId.Type

export const SceneGraphIndex = SafeInteger
export type SceneGraphIndex = typeof SceneGraphIndex.Type

export const SourceFilterChangeTarget = Schema.Literal("source_filter")
export type SourceFilterChangeTarget = typeof SourceFilterChangeTarget.Type

export const SourceFilterChangeOutcome = Schema.Literal(
  "created",
  "removed",
  "renamed",
  "reordered",
  "enabled",
  "disabled",
  "settings_changed"
)
export type SourceFilterChangeOutcome = typeof SourceFilterChangeOutcome.Type

export const SourceFilterChangeEventType = Schema.Literal(
  "SourceFilterCreated",
  "SourceFilterRemoved",
  "SourceFilterNameChanged",
  "SourceFilterListReindexed",
  "SourceFilterEnableStateChanged",
  "SourceFilterSettingsChanged"
)
export type SourceFilterChangeEventType = typeof SourceFilterChangeEventType.Type

export const SourceFilterIndex = SafeInteger
export type SourceFilterIndex = typeof SourceFilterIndex.Type

export const MediaInputWorkflowTarget = Schema.Literal("media_input")
export type MediaInputWorkflowTarget = typeof MediaInputWorkflowTarget.Type

export const MediaInputWorkflowOutcome = Schema.Literal(
  "playback_started",
  "playback_ended",
  "action_triggered"
)
export type MediaInputWorkflowOutcome = typeof MediaInputWorkflowOutcome.Type

export const MediaInputWorkflowEventType = Schema.Literal(
  "MediaInputPlaybackStarted",
  "MediaInputPlaybackEnded",
  "MediaInputActionTriggered"
)
export type MediaInputWorkflowEventType = typeof MediaInputWorkflowEventType.Type

export const TransitionWorkflowTarget = Schema.Literal("current_scene_transition", "scene_transition")
export type TransitionWorkflowTarget = typeof TransitionWorkflowTarget.Type

export const TransitionWorkflowOutcome = Schema.Literal(
  "changed",
  "duration_changed",
  "started",
  "ended",
  "video_ended"
)
export type TransitionWorkflowOutcome = typeof TransitionWorkflowOutcome.Type

export const TransitionWorkflowEventType = Schema.Literal(
  "CurrentSceneTransitionChanged",
  "CurrentSceneTransitionDurationChanged",
  "SceneTransitionStarted",
  "SceneTransitionEnded",
  "SceneTransitionVideoEnded"
)
export type TransitionWorkflowEventType = typeof TransitionWorkflowEventType.Type

export const TransitionWorkflowDuration = TransitionDuration
export type TransitionWorkflowDuration = typeof TransitionWorkflowDuration.Type

export const MediaInputWorkflowAction = Schema.Literal(
  "OBS_WEBSOCKET_MEDIA_INPUT_ACTION_PLAY",
  "OBS_WEBSOCKET_MEDIA_INPUT_ACTION_PAUSE",
  "OBS_WEBSOCKET_MEDIA_INPUT_ACTION_STOP",
  "OBS_WEBSOCKET_MEDIA_INPUT_ACTION_RESTART",
  "OBS_WEBSOCKET_MEDIA_INPUT_ACTION_NEXT",
  "OBS_WEBSOCKET_MEDIA_INPUT_ACTION_PREVIOUS"
)
export type MediaInputWorkflowAction = typeof MediaInputWorkflowAction.Type

export const InputAudioChangeTarget = Schema.Literal("input_audio")
export type InputAudioChangeTarget = typeof InputAudioChangeTarget.Type

export const InputAudioChangeOutcome = Schema.Literal(
  "muted",
  "unmuted",
  "volume_changed",
  "balance_changed",
  "sync_offset_changed",
  "tracks_changed",
  "monitor_type_changed"
)
export type InputAudioChangeOutcome = typeof InputAudioChangeOutcome.Type

export const InputAudioChangeEventType = Schema.Literal(
  "InputMuteStateChanged",
  "InputVolumeChanged",
  "InputAudioBalanceChanged",
  "InputAudioSyncOffsetChanged",
  "InputAudioTracksChanged",
  "InputAudioMonitorTypeChanged"
)
export type InputAudioChangeEventType = typeof InputAudioChangeEventType.Type

export const InputIdentityChangeTarget = Schema.Literal("input")
export type InputIdentityChangeTarget = typeof InputIdentityChangeTarget.Type

export const InputIdentityChangeOutcome = Schema.Literal("removed", "renamed")
export type InputIdentityChangeOutcome = typeof InputIdentityChangeOutcome.Type

export const InputIdentityChangeEventType = Schema.Literal("InputRemoved", "InputNameChanged")
export type InputIdentityChangeEventType = typeof InputIdentityChangeEventType.Type

export const InputIdentityName = ObsNonEmptyString
export type InputIdentityName = typeof InputIdentityName.Type

export const InputIdentityUuid = ObsNonEmptyString
export type InputIdentityUuid = typeof InputIdentityUuid.Type

export const ConfigWorkflowTarget = Schema.Literal("profile", "scene_collection")
export type ConfigWorkflowTarget = typeof ConfigWorkflowTarget.Type

export const ConfigWorkflowOutcome = Schema.Literal("changing", "changed", "list_changed")
export type ConfigWorkflowOutcome = typeof ConfigWorkflowOutcome.Type

export const ConfigWorkflowEventType = Schema.Literal(
  "CurrentProfileChanging",
  "CurrentProfileChanged",
  "ProfileListChanged",
  "CurrentSceneCollectionChanging",
  "CurrentSceneCollectionChanged",
  "SceneCollectionListChanged"
)
export type ConfigWorkflowEventType = typeof ConfigWorkflowEventType.Type

export const CanvasInventoryChangeTarget = Schema.Literal("canvas")
export type CanvasInventoryChangeTarget = typeof CanvasInventoryChangeTarget.Type

export const CanvasInventoryChangeOutcome = Schema.Literal("created", "removed", "renamed")
export type CanvasInventoryChangeOutcome = typeof CanvasInventoryChangeOutcome.Type

export const CanvasInventoryChangeEventType = Schema.Literal(
  "CanvasCreated",
  "CanvasRemoved",
  "CanvasNameChanged"
)
export type CanvasInventoryChangeEventType = typeof CanvasInventoryChangeEventType.Type

export const StudioModeStateChangeTarget = Schema.Literal("studio_mode")
export type StudioModeStateChangeTarget = typeof StudioModeStateChangeTarget.Type

export const StudioModeStateChangeOutcome = Schema.Literal("enabled", "disabled")
export type StudioModeStateChangeOutcome = typeof StudioModeStateChangeOutcome.Type

export const StudioModeStateChangeEventType = Schema.Literal("StudioModeStateChanged")
export type StudioModeStateChangeEventType = typeof StudioModeStateChangeEventType.Type

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
    filterIndex: SourceFilterIndex
  })
)

const SourceFilterListItem = Schema.Struct({
  filterName: ObsString,
  filterIndex: SourceFilterIndex
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
  sceneItemId: SceneGraphSceneItemId
})

const SceneItemSourceEventData = Schema.extend(SceneItemEventData)(
  Schema.Struct({
    sourceName: ObsString,
    sourceUuid: ObsString
  })
)

const SceneItemCreatedEventData = Schema.extend(SceneItemSourceEventData)(
  Schema.Struct({
    sceneItemIndex: SceneGraphIndex
  })
)

const ReindexedSceneItem = Schema.Struct({
  sceneItemId: SceneGraphSceneItemId,
  sceneItemIndex: SceneGraphIndex
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
    inputAudioTracks: ObsInputAudioTracks
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
  Schema.Struct({ outputPath: OptionalObsOutputPath })
)

const RecordFileChangedEventData = Schema.Struct({
  newOutputPath: ObsOutputPath
})

const ReplayBufferSavedEventData = Schema.Struct({
  savedReplayPath: ObsOutputPath
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
      return Schema.decodeUnknownSync(SceneCollectionEventData, { onExcessProperty: "error" })(eventData)
    case "SceneCollectionListChanged":
      return Schema.decodeUnknownSync(SceneCollectionListChangedEventData, { onExcessProperty: "error" })(eventData)
    case "CurrentProfileChanging":
    case "CurrentProfileChanged":
      return Schema.decodeUnknownSync(ProfileEventData, { onExcessProperty: "error" })(eventData)
    case "ProfileListChanged":
      return Schema.decodeUnknownSync(ProfileListChangedEventData, { onExcessProperty: "error" })(eventData)
    case "ExitStarted":
      return Schema.decodeUnknownSync(ExitStartedEventData)(eventData ?? {})
    case "CanvasCreated":
    case "CanvasRemoved":
      return Schema.decodeUnknownSync(CanvasEventData, { onExcessProperty: "error" })(eventData)
    case "CanvasNameChanged":
      return Schema.decodeUnknownSync(CanvasNameChangedEventData, { onExcessProperty: "error" })(eventData)
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
      return Schema.decodeUnknownSync(InputEventData, { onExcessProperty: "error" })(eventData)
    case "InputNameChanged":
      return Schema.decodeUnknownSync(InputNameChangedEventData, { onExcessProperty: "error" })(eventData)
    case "InputMuteStateChanged":
      return Schema.decodeUnknownSync(InputMuteStateChangedEventData, { onExcessProperty: "error" })(eventData)
    case "InputVolumeChanged":
      return Schema.decodeUnknownSync(InputVolumeChangedEventData, { onExcessProperty: "error" })(eventData)
    case "InputAudioBalanceChanged":
      return Schema.decodeUnknownSync(InputAudioBalanceChangedEventData, { onExcessProperty: "error" })(eventData)
    case "InputAudioSyncOffsetChanged":
      return Schema.decodeUnknownSync(InputAudioSyncOffsetChangedEventData, { onExcessProperty: "error" })(eventData)
    case "InputAudioTracksChanged":
      return Schema.decodeUnknownSync(InputAudioTracksChangedEventData, { onExcessProperty: "error" })(eventData)
    case "InputAudioMonitorTypeChanged":
      return Schema.decodeUnknownSync(InputAudioMonitorTypeChangedEventData, { onExcessProperty: "error" })(eventData)
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
      return Schema.decodeUnknownSync(TransitionEventData, { onExcessProperty: "error" })(eventData)
    case "CurrentSceneTransitionDurationChanged":
      return Schema.decodeUnknownSync(
        TransitionDurationChangedEventData,
        { onExcessProperty: "error" }
      )(eventData)
    case "StudioModeStateChanged":
      return Schema.decodeUnknownSync(StudioModeStateChangedEventData, { onExcessProperty: "error" })(eventData)
    case "ScreenshotSaved":
      return Schema.decodeUnknownSync(ScreenshotSavedEventData)(eventData)
    case "MediaInputPlaybackStarted":
    case "MediaInputPlaybackEnded":
      return Schema.decodeUnknownSync(MediaInputEventData, { onExcessProperty: "error" })(eventData)
    case "MediaInputActionTriggered":
      return Schema.decodeUnknownSync(
        MediaInputActionTriggeredEventData,
        { onExcessProperty: "error" }
      )(eventData)
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
  categories: Schema.optional(Schema.Array(ObsEventCategory)),
  sinceSequence: Schema.optional(EventCursor)
})
export type GetRecentObsEventsInput = typeof GetRecentObsEventsInput.Type
export const GetRecentObsEventsInputJsonSchema = JSONSchema.make(GetRecentObsEventsInput)

export const ObsEventSummary = Schema.Struct({
  sequence: EventSequence,
  eventType: ObsString,
  eventIntent: EventIntent,
  category: ObsEventCategory,
  eventData: Schema.optional(TypedObsEventData)
})
export type ObsEventSummary = typeof ObsEventSummary.Type

export const GetRecentObsEventsOutput = Schema.Struct({
  capacity: EventBufferCapacity,
  droppedEvents: EventCount,
  oldestSequence: EventCursor,
  latestSequence: EventCursor,
  missedEvents: Schema.Boolean,
  returnedEvents: EventCount,
  order: RecentObsEventsOrder,
  events: Schema.Array(ObsEventSummary)
})
export type GetRecentObsEventsOutput = typeof GetRecentObsEventsOutput.Type
export const GetRecentObsEventsOutputJsonSchema = JSONSchema.make(GetRecentObsEventsOutput)

const isSupportedOutputLifecycleConfirmation = (input: {
  readonly target: OutputLifecycleTarget
  readonly outcome: OutputLifecycleOutcome
}): boolean => {
  switch (input.target) {
    case "stream":
    case "virtualcam":
      return input.outcome === "started" || input.outcome === "stopped"
    case "record":
      return input.outcome === "started"
        || input.outcome === "stopped"
        || input.outcome === "paused"
        || input.outcome === "resumed"
        || input.outcome === "file_changed"
    case "replay_buffer":
      return input.outcome === "started"
        || input.outcome === "stopped"
        || input.outcome === "replay_saved"
  }
}

export const ConfirmObsOutputLifecycleInput = Schema.Struct({
  target: OutputLifecycleTarget,
  outcome: OutputLifecycleOutcome,
  afterSequence: EventCursor,
  timeoutMs: Schema.optional(EventTimeoutMs)
}).pipe(
  Schema.filter(isSupportedOutputLifecycleConfirmation, {
    message: () => "Unsupported output lifecycle target/outcome combination"
  })
)
export type ConfirmObsOutputLifecycleInput = typeof ConfirmObsOutputLifecycleInput.Type
export const ConfirmObsOutputLifecycleInputJsonSchema = JSONSchema.make(ConfirmObsOutputLifecycleInput)

const OutputLifecycleBaseFields = {
  sequence: EventSequence,
  eventIntent: EventIntent,
  category: Schema.Literal("outputs")
} as const

const OutputStateOutcome = Schema.Literal("started", "stopped", "paused", "resumed")
const OutputActiveLifecycleFields = {
  outputActive: Schema.Boolean,
  outputState: ObsOutputState
} as const
const StartStopOutcome = Schema.Literal("started", "stopped")

export const OutputLifecycleEventSummary = Schema.Union(
  Schema.Struct({
    ...OutputLifecycleBaseFields,
    eventType: Schema.Literal("StreamStateChanged"),
    target: Schema.Literal("stream"),
    outcome: StartStopOutcome,
    ...OutputActiveLifecycleFields
  }),
  Schema.Struct({
    ...OutputLifecycleBaseFields,
    eventType: Schema.Literal("RecordStateChanged"),
    target: Schema.Literal("record"),
    outcome: OutputStateOutcome,
    ...OutputActiveLifecycleFields,
    outputPath: OptionalObsOutputPath
  }),
  Schema.Struct({
    ...OutputLifecycleBaseFields,
    eventType: Schema.Literal("RecordFileChanged"),
    target: Schema.Literal("record"),
    outcome: Schema.Literal("file_changed"),
    newOutputPath: ObsOutputPath
  }),
  Schema.Struct({
    ...OutputLifecycleBaseFields,
    eventType: Schema.Literal("ReplayBufferStateChanged"),
    target: Schema.Literal("replay_buffer"),
    outcome: StartStopOutcome,
    ...OutputActiveLifecycleFields
  }),
  Schema.Struct({
    ...OutputLifecycleBaseFields,
    eventType: Schema.Literal("ReplayBufferSaved"),
    target: Schema.Literal("replay_buffer"),
    outcome: Schema.Literal("replay_saved"),
    savedReplayPath: ObsOutputPath
  }),
  Schema.Struct({
    ...OutputLifecycleBaseFields,
    eventType: Schema.Literal("VirtualcamStateChanged"),
    target: Schema.Literal("virtualcam"),
    outcome: StartStopOutcome,
    ...OutputActiveLifecycleFields
  })
)
export type OutputLifecycleEventSummary = typeof OutputLifecycleEventSummary.Type

export const ConfirmObsOutputLifecycleOutput = Schema.Struct({
  confirmed: Schema.Boolean,
  timedOut: Schema.Boolean,
  baselineSequence: EventCursor,
  latestSequence: EventCursor,
  missedEvents: Schema.Boolean,
  event: Schema.optional(OutputLifecycleEventSummary)
})
export type ConfirmObsOutputLifecycleOutput = typeof ConfirmObsOutputLifecycleOutput.Type
export const ConfirmObsOutputLifecycleOutputJsonSchema = JSONSchema.make(ConfirmObsOutputLifecycleOutput)

const ForbidSceneGraphRawWorkflowFields = {
  eventType: Schema.optional(Schema.Never),
  eventIntent: Schema.optional(Schema.Never),
  eventData: Schema.optional(Schema.Never),
  payload: Schema.optional(Schema.Never),
  regex: Schema.optional(Schema.Never)
} as const

const ForbidSceneGraphOldSceneName = {
  oldSceneName: Schema.optional(Schema.Never)
} as const

const ForbidSceneGraphSourceIdentity = {
  sourceName: Schema.optional(Schema.Never),
  sourceUuid: Schema.optional(Schema.Never)
} as const

const ForbidSceneGraphSceneItemId = {
  sceneItemId: Schema.optional(Schema.Never)
} as const

const ConfirmSceneGraphCommonInputFields = {
  afterSequence: EventCursor,
  timeoutMs: Schema.optional(EventTimeoutMs)
} as const

const ConfirmSceneGraphSceneIdentityInputFields = {
  sceneName: Schema.optional(ObsNonEmptyString),
  sceneUuid: Schema.optional(ObsNonEmptyString)
} as const

const ConfirmSceneGraphSourceIdentityInputFields = {
  sourceName: Schema.optional(ObsNonEmptyString),
  sourceUuid: Schema.optional(ObsNonEmptyString)
} as const

const SceneCreatedRemovedConfirmationInput = Schema.Struct({
  target: Schema.Literal("scene"),
  outcome: Schema.Literal("created", "removed"),
  ...ConfirmSceneGraphCommonInputFields,
  ...ConfirmSceneGraphSceneIdentityInputFields,
  ...ForbidSceneGraphOldSceneName,
  ...ForbidSceneGraphSourceIdentity,
  ...ForbidSceneGraphSceneItemId,
  ...ForbidSceneGraphRawWorkflowFields
})

const SceneRenamedConfirmationInput = Schema.Struct({
  target: Schema.Literal("scene"),
  outcome: Schema.Literal("renamed"),
  ...ConfirmSceneGraphCommonInputFields,
  ...ConfirmSceneGraphSceneIdentityInputFields,
  oldSceneName: Schema.optional(ObsNonEmptyString),
  ...ForbidSceneGraphSourceIdentity,
  ...ForbidSceneGraphSceneItemId,
  ...ForbidSceneGraphRawWorkflowFields
})

const CurrentProgramSceneChangedConfirmationInput = Schema.Struct({
  target: Schema.Literal("current_program_scene"),
  outcome: Schema.Literal("changed"),
  ...ConfirmSceneGraphCommonInputFields,
  ...ConfirmSceneGraphSceneIdentityInputFields,
  ...ForbidSceneGraphOldSceneName,
  ...ForbidSceneGraphSourceIdentity,
  ...ForbidSceneGraphSceneItemId,
  ...ForbidSceneGraphRawWorkflowFields
})

const CurrentPreviewSceneChangedConfirmationInput = Schema.Struct({
  target: Schema.Literal("current_preview_scene"),
  outcome: Schema.Literal("changed"),
  ...ConfirmSceneGraphCommonInputFields,
  ...ConfirmSceneGraphSceneIdentityInputFields,
  ...ForbidSceneGraphOldSceneName,
  ...ForbidSceneGraphSourceIdentity,
  ...ForbidSceneGraphSceneItemId,
  ...ForbidSceneGraphRawWorkflowFields
})

const SceneItemCreatedRemovedConfirmationInput = Schema.Struct({
  target: Schema.Literal("scene_item"),
  outcome: Schema.Literal("created", "removed"),
  ...ConfirmSceneGraphCommonInputFields,
  ...ConfirmSceneGraphSceneIdentityInputFields,
  ...ConfirmSceneGraphSourceIdentityInputFields,
  sceneItemId: Schema.optional(SceneGraphSceneItemId),
  ...ForbidSceneGraphOldSceneName,
  ...ForbidSceneGraphRawWorkflowFields
})

const SceneItemStateConfirmationInput = Schema.Struct({
  target: Schema.Literal("scene_item"),
  outcome: Schema.Literal("reordered", "enabled", "disabled", "locked", "unlocked"),
  ...ConfirmSceneGraphCommonInputFields,
  ...ConfirmSceneGraphSceneIdentityInputFields,
  sceneItemId: Schema.optional(SceneGraphSceneItemId),
  ...ForbidSceneGraphOldSceneName,
  ...ForbidSceneGraphSourceIdentity,
  ...ForbidSceneGraphRawWorkflowFields
})

export const ConfirmObsSceneGraphChangeInput = Schema.Union(
  SceneCreatedRemovedConfirmationInput,
  SceneRenamedConfirmationInput,
  CurrentProgramSceneChangedConfirmationInput,
  CurrentPreviewSceneChangedConfirmationInput,
  SceneItemCreatedRemovedConfirmationInput,
  SceneItemStateConfirmationInput
)
export type ConfirmObsSceneGraphChangeInput = typeof ConfirmObsSceneGraphChangeInput.Type
export const ConfirmObsSceneGraphChangeInputJsonSchema = JSONSchema.make(ConfirmObsSceneGraphChangeInput)

const ForbidSourceFilterRawWorkflowFields = {
  eventType: Schema.optional(Schema.Never),
  eventIntent: Schema.optional(Schema.Never),
  eventData: Schema.optional(Schema.Never),
  payload: Schema.optional(Schema.Never),
  regex: Schema.optional(Schema.Never),
  sourceUuid: Schema.optional(Schema.Never),
  canvasUuid: Schema.optional(Schema.Never),
  filterSettings: Schema.optional(Schema.Never),
  defaultFilterSettings: Schema.optional(Schema.Never),
  filterEnabled: Schema.optional(Schema.Never)
} as const

const ForbidSourceFilterOldFilterName = {
  oldFilterName: Schema.optional(Schema.Never)
} as const

const ForbidSourceFilterKind = {
  filterKind: Schema.optional(Schema.Never)
} as const

const ForbidSourceFilterIndex = {
  filterIndex: Schema.optional(Schema.Never)
} as const

const ConfirmSourceFilterCommonInputFields = {
  target: Schema.Literal("source_filter"),
  afterSequence: EventCursor,
  timeoutMs: Schema.optional(EventTimeoutMs),
  sourceName: Schema.optional(ObsNonEmptyString),
  filterName: Schema.optional(ObsNonEmptyString)
} as const

const SourceFilterCreatedConfirmationInput = Schema.Struct({
  ...ConfirmSourceFilterCommonInputFields,
  outcome: Schema.Literal("created"),
  filterKind: Schema.optional(ObsNonEmptyString),
  filterIndex: Schema.optional(SourceFilterIndex),
  ...ForbidSourceFilterOldFilterName,
  ...ForbidSourceFilterRawWorkflowFields
})

const SourceFilterRemovedConfirmationInput = Schema.Struct({
  ...ConfirmSourceFilterCommonInputFields,
  outcome: Schema.Literal("removed"),
  ...ForbidSourceFilterOldFilterName,
  ...ForbidSourceFilterKind,
  ...ForbidSourceFilterIndex,
  ...ForbidSourceFilterRawWorkflowFields
})

const SourceFilterRenamedConfirmationInput = Schema.Struct({
  ...ConfirmSourceFilterCommonInputFields,
  outcome: Schema.Literal("renamed"),
  oldFilterName: Schema.optional(ObsNonEmptyString),
  ...ForbidSourceFilterKind,
  ...ForbidSourceFilterIndex,
  ...ForbidSourceFilterRawWorkflowFields
})

const SourceFilterReorderedConfirmationInput = Schema.Struct({
  ...ConfirmSourceFilterCommonInputFields,
  outcome: Schema.Literal("reordered"),
  filterIndex: Schema.optional(SourceFilterIndex),
  ...ForbidSourceFilterOldFilterName,
  ...ForbidSourceFilterKind,
  ...ForbidSourceFilterRawWorkflowFields
})

const SourceFilterStateConfirmationInput = Schema.Struct({
  ...ConfirmSourceFilterCommonInputFields,
  outcome: Schema.Literal("enabled", "disabled", "settings_changed"),
  ...ForbidSourceFilterOldFilterName,
  ...ForbidSourceFilterKind,
  ...ForbidSourceFilterIndex,
  ...ForbidSourceFilterRawWorkflowFields
})

export const ConfirmObsSourceFilterChangeInput = Schema.Union(
  SourceFilterCreatedConfirmationInput,
  SourceFilterRemovedConfirmationInput,
  SourceFilterRenamedConfirmationInput,
  SourceFilterReorderedConfirmationInput,
  SourceFilterStateConfirmationInput
)
export type ConfirmObsSourceFilterChangeInput = typeof ConfirmObsSourceFilterChangeInput.Type
export const ConfirmObsSourceFilterChangeInputJsonSchema = JSONSchema.make(ConfirmObsSourceFilterChangeInput)

const ForbidMediaInputWorkflowFields = {
  eventType: Schema.optional(Schema.Never),
  eventIntent: Schema.optional(Schema.Never),
  eventData: Schema.optional(Schema.Never),
  payload: Schema.optional(Schema.Never),
  regex: Schema.optional(Schema.Never),
  mediaState: Schema.optional(Schema.Never),
  mediaCursor: Schema.optional(Schema.Never),
  mediaDuration: Schema.optional(Schema.Never),
  mediaCursorOffset: Schema.optional(Schema.Never),
  inputSettings: Schema.optional(Schema.Never),
  defaultInputSettings: Schema.optional(Schema.Never),
  inputKind: Schema.optional(Schema.Never),
  sceneItemId: Schema.optional(Schema.Never),
  filterName: Schema.optional(Schema.Never),
  sourceName: Schema.optional(Schema.Never)
} as const

const ConfirmMediaInputCommonInputFields = {
  target: Schema.Literal("media_input"),
  afterSequence: EventCursor,
  timeoutMs: Schema.optional(EventTimeoutMs),
  inputName: Schema.optional(ObsNonEmptyString),
  inputUuid: Schema.optional(ObsNonEmptyString)
} as const

const MediaInputPlaybackConfirmationInput = Schema.Struct({
  ...ConfirmMediaInputCommonInputFields,
  outcome: Schema.Literal("playback_started", "playback_ended"),
  mediaAction: Schema.optional(Schema.Never),
  ...ForbidMediaInputWorkflowFields
})

const MediaInputActionTriggeredConfirmationInput = Schema.Struct({
  ...ConfirmMediaInputCommonInputFields,
  outcome: Schema.Literal("action_triggered"),
  mediaAction: MediaInputWorkflowAction,
  ...ForbidMediaInputWorkflowFields
})

export const ConfirmObsMediaInputWorkflowInput = Schema.Union(
  MediaInputPlaybackConfirmationInput,
  MediaInputActionTriggeredConfirmationInput
)
export type ConfirmObsMediaInputWorkflowInput = typeof ConfirmObsMediaInputWorkflowInput.Type
export const ConfirmObsMediaInputWorkflowInputJsonSchema = JSONSchema.make(ConfirmObsMediaInputWorkflowInput)

const ForbidTransitionWorkflowFields = {
  eventType: Schema.optional(Schema.Never),
  eventIntent: Schema.optional(Schema.Never),
  eventData: Schema.optional(Schema.Never),
  payload: Schema.optional(Schema.Never),
  regex: Schema.optional(Schema.Never),
  transitionSettings: Schema.optional(Schema.Never),
  overlay: Schema.optional(Schema.Never),
  position: Schema.optional(Schema.Never),
  release: Schema.optional(Schema.Never),
  sceneName: Schema.optional(Schema.Never),
  sceneUuid: Schema.optional(Schema.Never),
  oldSceneName: Schema.optional(Schema.Never),
  sceneItemId: Schema.optional(Schema.Never),
  inputName: Schema.optional(Schema.Never),
  inputUuid: Schema.optional(Schema.Never),
  sourceName: Schema.optional(Schema.Never),
  sourceUuid: Schema.optional(Schema.Never),
  filterName: Schema.optional(Schema.Never),
  filterSettings: Schema.optional(Schema.Never),
  mediaAction: Schema.optional(Schema.Never),
  mediaCursor: Schema.optional(Schema.Never),
  inputMuted: Schema.optional(Schema.Never),
  outputState: Schema.optional(Schema.Never)
} as const

const ForbidTransitionIdentityFields = {
  transitionName: Schema.optional(Schema.Never),
  transitionUuid: Schema.optional(Schema.Never)
} as const

const ForbidTransitionDurationField = {
  transitionDuration: Schema.optional(Schema.Never)
} as const

const ConfirmTransitionCommonInputFields = {
  afterSequence: EventCursor,
  timeoutMs: Schema.optional(EventTimeoutMs)
} as const

const ConfirmTransitionIdentityInputFields = {
  transitionName: Schema.optional(ObsNonEmptyString),
  transitionUuid: Schema.optional(ObsNonEmptyString)
} as const

const CurrentSceneTransitionChangedConfirmationInput = Schema.Struct({
  target: Schema.Literal("current_scene_transition"),
  outcome: Schema.Literal("changed"),
  ...ConfirmTransitionCommonInputFields,
  ...ConfirmTransitionIdentityInputFields,
  ...ForbidTransitionDurationField,
  ...ForbidTransitionWorkflowFields
})

const CurrentSceneTransitionDurationChangedConfirmationInput = Schema.Struct({
  target: Schema.Literal("current_scene_transition"),
  outcome: Schema.Literal("duration_changed"),
  ...ConfirmTransitionCommonInputFields,
  transitionDuration: Schema.optional(TransitionWorkflowDuration),
  ...ForbidTransitionIdentityFields,
  ...ForbidTransitionWorkflowFields
})

const SceneTransitionLifecycleConfirmationInput = Schema.Struct({
  target: Schema.Literal("scene_transition"),
  outcome: Schema.Literal("started", "ended", "video_ended"),
  ...ConfirmTransitionCommonInputFields,
  ...ConfirmTransitionIdentityInputFields,
  ...ForbidTransitionDurationField,
  ...ForbidTransitionWorkflowFields
})

export const ConfirmObsTransitionWorkflowInput = Schema.Union(
  CurrentSceneTransitionChangedConfirmationInput,
  CurrentSceneTransitionDurationChangedConfirmationInput,
  SceneTransitionLifecycleConfirmationInput
)
export type ConfirmObsTransitionWorkflowInput = typeof ConfirmObsTransitionWorkflowInput.Type
export const ConfirmObsTransitionWorkflowInputJsonSchema = JSONSchema.make(ConfirmObsTransitionWorkflowInput)

const ForbidInputAudioWorkflowFields = {
  eventType: Schema.optional(Schema.Never),
  eventIntent: Schema.optional(Schema.Never),
  eventData: Schema.optional(Schema.Never),
  payload: Schema.optional(Schema.Never),
  regex: Schema.optional(Schema.Never),
  inputMuted: Schema.optional(Schema.Never),
  inputSettings: Schema.optional(Schema.Never),
  defaultInputSettings: Schema.optional(Schema.Never),
  inputKind: Schema.optional(Schema.Never),
  inputKindCaps: Schema.optional(Schema.Never),
  mediaState: Schema.optional(Schema.Never),
  mediaCursor: Schema.optional(Schema.Never),
  mediaAction: Schema.optional(Schema.Never),
  sourceName: Schema.optional(Schema.Never),
  filterName: Schema.optional(Schema.Never),
  sceneItemId: Schema.optional(Schema.Never)
} as const

const ForbidInputAudioVolumeFields = {
  inputVolumeMul: Schema.optional(Schema.Never),
  inputVolumeDb: Schema.optional(Schema.Never)
} as const

const ForbidInputAudioBalanceField = {
  inputAudioBalance: Schema.optional(Schema.Never)
} as const

const ForbidInputAudioSyncOffsetField = {
  inputAudioSyncOffset: Schema.optional(Schema.Never)
} as const

const ForbidInputAudioTracksField = {
  inputAudioTracks: Schema.optional(Schema.Never)
} as const

const ForbidInputAudioMonitorTypeField = {
  monitorType: Schema.optional(Schema.Never)
} as const

const ConfirmInputAudioCommonInputFields = {
  target: Schema.Literal("input_audio"),
  afterSequence: EventCursor,
  timeoutMs: Schema.optional(EventTimeoutMs),
  inputName: Schema.optional(ObsNonEmptyString),
  inputUuid: Schema.optional(ObsNonEmptyString)
} as const

const InputAudioMuteConfirmationInput = Schema.Struct({
  ...ConfirmInputAudioCommonInputFields,
  outcome: Schema.Literal("muted", "unmuted"),
  ...ForbidInputAudioVolumeFields,
  ...ForbidInputAudioBalanceField,
  ...ForbidInputAudioSyncOffsetField,
  ...ForbidInputAudioTracksField,
  ...ForbidInputAudioMonitorTypeField,
  ...ForbidInputAudioWorkflowFields
})

const InputAudioVolumeConfirmationInput = Schema.Struct({
  ...ConfirmInputAudioCommonInputFields,
  outcome: Schema.Literal("volume_changed"),
  inputVolumeMul: Schema.optional(InputVolumeMul),
  inputVolumeDb: Schema.optional(InputVolumeDb),
  ...ForbidInputAudioBalanceField,
  ...ForbidInputAudioSyncOffsetField,
  ...ForbidInputAudioTracksField,
  ...ForbidInputAudioMonitorTypeField,
  ...ForbidInputAudioWorkflowFields
})

const InputAudioBalanceConfirmationInput = Schema.Struct({
  ...ConfirmInputAudioCommonInputFields,
  outcome: Schema.Literal("balance_changed"),
  inputAudioBalance: Schema.optional(InputAudioBalance),
  ...ForbidInputAudioVolumeFields,
  ...ForbidInputAudioSyncOffsetField,
  ...ForbidInputAudioTracksField,
  ...ForbidInputAudioMonitorTypeField,
  ...ForbidInputAudioWorkflowFields
})

const InputAudioSyncOffsetConfirmationInput = Schema.Struct({
  ...ConfirmInputAudioCommonInputFields,
  outcome: Schema.Literal("sync_offset_changed"),
  inputAudioSyncOffset: Schema.optional(InputAudioSyncOffset),
  ...ForbidInputAudioVolumeFields,
  ...ForbidInputAudioBalanceField,
  ...ForbidInputAudioTracksField,
  ...ForbidInputAudioMonitorTypeField,
  ...ForbidInputAudioWorkflowFields
})

const InputAudioTracksConfirmationInput = Schema.Struct({
  ...ConfirmInputAudioCommonInputFields,
  outcome: Schema.Literal("tracks_changed"),
  inputAudioTracks: Schema.optional(InputAudioTracks),
  ...ForbidInputAudioVolumeFields,
  ...ForbidInputAudioBalanceField,
  ...ForbidInputAudioSyncOffsetField,
  ...ForbidInputAudioMonitorTypeField,
  ...ForbidInputAudioWorkflowFields
})

const InputAudioMonitorTypeConfirmationInput = Schema.Struct({
  ...ConfirmInputAudioCommonInputFields,
  outcome: Schema.Literal("monitor_type_changed"),
  monitorType: Schema.optional(InputAudioMonitorType),
  ...ForbidInputAudioVolumeFields,
  ...ForbidInputAudioBalanceField,
  ...ForbidInputAudioSyncOffsetField,
  ...ForbidInputAudioTracksField,
  ...ForbidInputAudioWorkflowFields
})

export const ConfirmObsInputAudioChangeInput = Schema.Union(
  InputAudioMuteConfirmationInput,
  InputAudioVolumeConfirmationInput,
  InputAudioBalanceConfirmationInput,
  InputAudioSyncOffsetConfirmationInput,
  InputAudioTracksConfirmationInput,
  InputAudioMonitorTypeConfirmationInput
)
export type ConfirmObsInputAudioChangeInput = typeof ConfirmObsInputAudioChangeInput.Type
export const ConfirmObsInputAudioChangeInputJsonSchema = JSONSchema.make(ConfirmObsInputAudioChangeInput)

const ForbidInputIdentityChangeWorkflowFields = {
  eventType: Schema.optional(Schema.Never),
  eventIntent: Schema.optional(Schema.Never),
  eventData: Schema.optional(Schema.Never),
  payload: Schema.optional(Schema.Never),
  regex: Schema.optional(Schema.Never),
  settings: Schema.optional(Schema.Never),
  inputSettings: Schema.optional(Schema.Never),
  defaultSettings: Schema.optional(Schema.Never),
  defaultInputSettings: Schema.optional(Schema.Never),
  inputKind: Schema.optional(Schema.Never),
  unversionedInputKind: Schema.optional(Schema.Never),
  inputKindCaps: Schema.optional(Schema.Never),
  sceneItemId: Schema.optional(Schema.Never),
  sceneName: Schema.optional(Schema.Never),
  sceneUuid: Schema.optional(Schema.Never),
  oldSceneName: Schema.optional(Schema.Never),
  sourceName: Schema.optional(Schema.Never),
  sourceUuid: Schema.optional(Schema.Never),
  filterName: Schema.optional(Schema.Never),
  filterSettings: Schema.optional(Schema.Never),
  transitionName: Schema.optional(Schema.Never),
  transitionUuid: Schema.optional(Schema.Never),
  transitionDuration: Schema.optional(Schema.Never),
  profileName: Schema.optional(Schema.Never),
  profiles: Schema.optional(Schema.Never),
  sceneCollectionName: Schema.optional(Schema.Never),
  sceneCollections: Schema.optional(Schema.Never),
  canvasName: Schema.optional(Schema.Never),
  canvasUuid: Schema.optional(Schema.Never),
  oldCanvasName: Schema.optional(Schema.Never),
  savedScreenshotPath: Schema.optional(Schema.Never),
  outputName: Schema.optional(Schema.Never),
  outputState: Schema.optional(Schema.Never),
  inputMuted: Schema.optional(Schema.Never),
  inputVolumeMul: Schema.optional(Schema.Never),
  inputVolumeDb: Schema.optional(Schema.Never),
  inputAudioBalance: Schema.optional(Schema.Never),
  inputAudioSyncOffset: Schema.optional(Schema.Never),
  inputAudioTracks: Schema.optional(Schema.Never),
  monitorType: Schema.optional(Schema.Never),
  mediaState: Schema.optional(Schema.Never),
  mediaCursor: Schema.optional(Schema.Never),
  mediaAction: Schema.optional(Schema.Never)
} as const

const ForbidInputIdentityOldInputName = {
  oldInputName: Schema.optional(Schema.Never)
} as const

const ConfirmInputIdentityChangeCommonInputFields = {
  target: InputIdentityChangeTarget,
  afterSequence: EventCursor,
  timeoutMs: Schema.optional(EventTimeoutMs),
  inputName: Schema.optional(InputIdentityName),
  inputUuid: Schema.optional(InputIdentityUuid)
} as const

const InputRemovedConfirmationInput = Schema.Struct({
  ...ConfirmInputIdentityChangeCommonInputFields,
  outcome: Schema.Literal("removed"),
  ...ForbidInputIdentityOldInputName,
  ...ForbidInputIdentityChangeWorkflowFields
})

const InputRenamedConfirmationInput = Schema.Struct({
  ...ConfirmInputIdentityChangeCommonInputFields,
  outcome: Schema.Literal("renamed"),
  oldInputName: Schema.optional(InputIdentityName),
  ...ForbidInputIdentityChangeWorkflowFields
})

export const ConfirmObsInputIdentityChangeInput = Schema.Union(
  InputRemovedConfirmationInput,
  InputRenamedConfirmationInput
)
export type ConfirmObsInputIdentityChangeInput = typeof ConfirmObsInputIdentityChangeInput.Type
export const ConfirmObsInputIdentityChangeInputJsonSchema = JSONSchema.make(ConfirmObsInputIdentityChangeInput)

const ForbidConfigWorkflowFields = {
  eventType: Schema.optional(Schema.Never),
  eventIntent: Schema.optional(Schema.Never),
  eventData: Schema.optional(Schema.Never),
  payload: Schema.optional(Schema.Never),
  regex: Schema.optional(Schema.Never),
  parameterCategory: Schema.optional(Schema.Never),
  parameterName: Schema.optional(Schema.Never),
  parameterValue: Schema.optional(Schema.Never),
  sceneName: Schema.optional(Schema.Never),
  sceneUuid: Schema.optional(Schema.Never),
  oldSceneName: Schema.optional(Schema.Never),
  sceneItemId: Schema.optional(Schema.Never),
  sourceName: Schema.optional(Schema.Never),
  sourceUuid: Schema.optional(Schema.Never),
  inputName: Schema.optional(Schema.Never),
  inputUuid: Schema.optional(Schema.Never),
  filterName: Schema.optional(Schema.Never),
  transitionName: Schema.optional(Schema.Never),
  transitionUuid: Schema.optional(Schema.Never),
  transitionDuration: Schema.optional(Schema.Never),
  outputName: Schema.optional(Schema.Never),
  outputState: Schema.optional(Schema.Never),
  profileParameter: Schema.optional(Schema.Never),
  currentProfileName: Schema.optional(Schema.Never),
  currentSceneCollectionName: Schema.optional(Schema.Never)
} as const

const ForbidProfileNameField = {
  profileName: Schema.optional(Schema.Never)
} as const

const ForbidProfilesField = {
  profiles: Schema.optional(Schema.Never)
} as const

const ForbidSceneCollectionNameField = {
  sceneCollectionName: Schema.optional(Schema.Never)
} as const

const ForbidSceneCollectionsField = {
  sceneCollections: Schema.optional(Schema.Never)
} as const

const ConfirmConfigWorkflowCommonInputFields = {
  afterSequence: EventCursor,
  timeoutMs: Schema.optional(EventTimeoutMs)
} as const

const ProfileCurrentConfigWorkflowInput = Schema.Struct({
  target: Schema.Literal("profile"),
  outcome: Schema.Literal("changing", "changed"),
  ...ConfirmConfigWorkflowCommonInputFields,
  profileName: Schema.optional(ProfileName),
  ...ForbidProfilesField,
  ...ForbidSceneCollectionNameField,
  ...ForbidSceneCollectionsField,
  ...ForbidConfigWorkflowFields
})

const ProfileListConfigWorkflowInput = Schema.Struct({
  target: Schema.Literal("profile"),
  outcome: Schema.Literal("list_changed"),
  ...ConfirmConfigWorkflowCommonInputFields,
  profiles: Schema.optional(Schema.Array(ProfileName)),
  ...ForbidProfileNameField,
  ...ForbidSceneCollectionNameField,
  ...ForbidSceneCollectionsField,
  ...ForbidConfigWorkflowFields
})

const SceneCollectionCurrentConfigWorkflowInput = Schema.Struct({
  target: Schema.Literal("scene_collection"),
  outcome: Schema.Literal("changing", "changed"),
  ...ConfirmConfigWorkflowCommonInputFields,
  sceneCollectionName: Schema.optional(SceneCollectionName),
  ...ForbidProfileNameField,
  ...ForbidProfilesField,
  ...ForbidSceneCollectionsField,
  ...ForbidConfigWorkflowFields
})

const SceneCollectionListConfigWorkflowInput = Schema.Struct({
  target: Schema.Literal("scene_collection"),
  outcome: Schema.Literal("list_changed"),
  ...ConfirmConfigWorkflowCommonInputFields,
  sceneCollections: Schema.optional(Schema.Array(SceneCollectionName)),
  ...ForbidProfileNameField,
  ...ForbidProfilesField,
  ...ForbidSceneCollectionNameField,
  ...ForbidConfigWorkflowFields
})

export const ConfirmObsConfigWorkflowInput = Schema.Union(
  ProfileCurrentConfigWorkflowInput,
  ProfileListConfigWorkflowInput,
  SceneCollectionCurrentConfigWorkflowInput,
  SceneCollectionListConfigWorkflowInput
)
export type ConfirmObsConfigWorkflowInput = typeof ConfirmObsConfigWorkflowInput.Type
export const ConfirmObsConfigWorkflowInputJsonSchema = JSONSchema.make(ConfirmObsConfigWorkflowInput)

const ForbidCanvasInventoryChangeWorkflowFields = {
  eventType: Schema.optional(Schema.Never),
  eventIntent: Schema.optional(Schema.Never),
  eventData: Schema.optional(Schema.Never),
  payload: Schema.optional(Schema.Never),
  regex: Schema.optional(Schema.Never),
  sceneName: Schema.optional(Schema.Never),
  sceneUuid: Schema.optional(Schema.Never),
  oldSceneName: Schema.optional(Schema.Never),
  sceneItemId: Schema.optional(Schema.Never),
  sourceName: Schema.optional(Schema.Never),
  sourceUuid: Schema.optional(Schema.Never),
  inputName: Schema.optional(Schema.Never),
  inputUuid: Schema.optional(Schema.Never),
  transitionName: Schema.optional(Schema.Never),
  transitionUuid: Schema.optional(Schema.Never),
  transitionDuration: Schema.optional(Schema.Never),
  profileName: Schema.optional(Schema.Never),
  profiles: Schema.optional(Schema.Never),
  sceneCollectionName: Schema.optional(Schema.Never),
  sceneCollections: Schema.optional(Schema.Never),
  savedScreenshotPath: Schema.optional(Schema.Never),
  filterName: Schema.optional(Schema.Never),
  filterSettings: Schema.optional(Schema.Never),
  outputName: Schema.optional(Schema.Never),
  outputState: Schema.optional(Schema.Never),
  inputSettings: Schema.optional(Schema.Never),
  defaultInputSettings: Schema.optional(Schema.Never)
} as const

const ForbidCanvasInventoryChangeOldCanvasName = {
  oldCanvasName: Schema.optional(Schema.Never)
} as const

const ConfirmCanvasInventoryChangeCommonInputFields = {
  target: Schema.Literal("canvas"),
  afterSequence: EventCursor,
  timeoutMs: Schema.optional(EventTimeoutMs),
  canvasName: Schema.optional(CanvasName),
  canvasUuid: Schema.optional(CanvasUuid)
} as const

const CanvasCreatedRemovedConfirmationInput = Schema.Struct({
  ...ConfirmCanvasInventoryChangeCommonInputFields,
  outcome: Schema.Literal("created", "removed"),
  ...ForbidCanvasInventoryChangeOldCanvasName,
  ...ForbidCanvasInventoryChangeWorkflowFields
})

const CanvasRenamedConfirmationInput = Schema.Struct({
  ...ConfirmCanvasInventoryChangeCommonInputFields,
  outcome: Schema.Literal("renamed"),
  oldCanvasName: Schema.optional(CanvasName),
  ...ForbidCanvasInventoryChangeWorkflowFields
})

export const ConfirmObsCanvasInventoryChangeInput = Schema.Union(
  CanvasCreatedRemovedConfirmationInput,
  CanvasRenamedConfirmationInput
)
export type ConfirmObsCanvasInventoryChangeInput = typeof ConfirmObsCanvasInventoryChangeInput.Type
export const ConfirmObsCanvasInventoryChangeInputJsonSchema = JSONSchema.make(ConfirmObsCanvasInventoryChangeInput)

const ForbidStudioModeStateChangeWorkflowFields = {
  eventType: Schema.optional(Schema.Never),
  eventIntent: Schema.optional(Schema.Never),
  eventData: Schema.optional(Schema.Never),
  payload: Schema.optional(Schema.Never),
  regex: Schema.optional(Schema.Never),
  studioModeEnabled: Schema.optional(Schema.Never),
  savedScreenshotPath: Schema.optional(Schema.Never),
  sceneName: Schema.optional(Schema.Never),
  sceneUuid: Schema.optional(Schema.Never),
  oldSceneName: Schema.optional(Schema.Never),
  sceneItemId: Schema.optional(Schema.Never),
  sourceName: Schema.optional(Schema.Never),
  sourceUuid: Schema.optional(Schema.Never),
  inputName: Schema.optional(Schema.Never),
  inputUuid: Schema.optional(Schema.Never),
  transitionName: Schema.optional(Schema.Never),
  transitionUuid: Schema.optional(Schema.Never),
  transitionDuration: Schema.optional(Schema.Never),
  profileName: Schema.optional(Schema.Never),
  profiles: Schema.optional(Schema.Never),
  sceneCollectionName: Schema.optional(Schema.Never),
  sceneCollections: Schema.optional(Schema.Never),
  canvasName: Schema.optional(Schema.Never),
  canvasUuid: Schema.optional(Schema.Never),
  oldCanvasName: Schema.optional(Schema.Never),
  filterName: Schema.optional(Schema.Never),
  filterSettings: Schema.optional(Schema.Never),
  outputName: Schema.optional(Schema.Never),
  outputState: Schema.optional(Schema.Never),
  inputSettings: Schema.optional(Schema.Never),
  defaultInputSettings: Schema.optional(Schema.Never)
} as const

export const ConfirmObsStudioModeStateChangeInput = Schema.Struct({
  target: StudioModeStateChangeTarget,
  outcome: StudioModeStateChangeOutcome,
  afterSequence: EventCursor,
  timeoutMs: Schema.optional(EventTimeoutMs),
  ...ForbidStudioModeStateChangeWorkflowFields
})
export type ConfirmObsStudioModeStateChangeInput = typeof ConfirmObsStudioModeStateChangeInput.Type
export const ConfirmObsStudioModeStateChangeInputJsonSchema = JSONSchema.make(ConfirmObsStudioModeStateChangeInput)

const SceneGraphChangeBaseFields = {
  sequence: EventSequence,
  eventIntent: EventIntent,
  category: Schema.Literal("scenes", "scene_items")
} as const

const SceneGraphSceneSummaryFields = {
  sceneName: ObsString,
  sceneUuid: ObsString
} as const

const SceneGraphSceneItemSummaryFields = {
  ...SceneGraphSceneSummaryFields,
  sceneItemId: SceneGraphSceneItemId
} as const

export const ReindexedSceneItemSummary = Schema.Struct({
  sceneItemId: SceneGraphSceneItemId,
  sceneItemIndex: SceneGraphIndex
})
export type ReindexedSceneItemSummary = typeof ReindexedSceneItemSummary.Type

export const SceneGraphChangeEventSummary = Schema.Union(
  Schema.Struct({
    ...SceneGraphChangeBaseFields,
    eventType: Schema.Literal("SceneCreated"),
    category: Schema.Literal("scenes"),
    target: Schema.Literal("scene"),
    outcome: Schema.Literal("created"),
    ...SceneGraphSceneSummaryFields,
    isGroup: Schema.Boolean
  }),
  Schema.Struct({
    ...SceneGraphChangeBaseFields,
    eventType: Schema.Literal("SceneRemoved"),
    category: Schema.Literal("scenes"),
    target: Schema.Literal("scene"),
    outcome: Schema.Literal("removed"),
    ...SceneGraphSceneSummaryFields,
    isGroup: Schema.Boolean
  }),
  Schema.Struct({
    ...SceneGraphChangeBaseFields,
    eventType: Schema.Literal("SceneNameChanged"),
    category: Schema.Literal("scenes"),
    target: Schema.Literal("scene"),
    outcome: Schema.Literal("renamed"),
    oldSceneName: ObsString,
    ...SceneGraphSceneSummaryFields
  }),
  Schema.Struct({
    ...SceneGraphChangeBaseFields,
    eventType: Schema.Literal("CurrentProgramSceneChanged"),
    category: Schema.Literal("scenes"),
    target: Schema.Literal("current_program_scene"),
    outcome: Schema.Literal("changed"),
    ...SceneGraphSceneSummaryFields
  }),
  Schema.Struct({
    ...SceneGraphChangeBaseFields,
    eventType: Schema.Literal("CurrentPreviewSceneChanged"),
    category: Schema.Literal("scenes"),
    target: Schema.Literal("current_preview_scene"),
    outcome: Schema.Literal("changed"),
    ...SceneGraphSceneSummaryFields
  }),
  Schema.Struct({
    ...SceneGraphChangeBaseFields,
    eventType: Schema.Literal("SceneItemCreated"),
    category: Schema.Literal("scene_items"),
    target: Schema.Literal("scene_item"),
    outcome: Schema.Literal("created"),
    ...SceneGraphSceneItemSummaryFields,
    sourceName: ObsString,
    sourceUuid: ObsString,
    sceneItemIndex: SceneGraphIndex
  }),
  Schema.Struct({
    ...SceneGraphChangeBaseFields,
    eventType: Schema.Literal("SceneItemRemoved"),
    category: Schema.Literal("scene_items"),
    target: Schema.Literal("scene_item"),
    outcome: Schema.Literal("removed"),
    ...SceneGraphSceneItemSummaryFields,
    sourceName: ObsString,
    sourceUuid: ObsString
  }),
  Schema.Struct({
    ...SceneGraphChangeBaseFields,
    eventType: Schema.Literal("SceneItemListReindexed"),
    category: Schema.Literal("scene_items"),
    target: Schema.Literal("scene_item"),
    outcome: Schema.Literal("reordered"),
    ...SceneGraphSceneSummaryFields,
    sceneItems: Schema.Array(ReindexedSceneItemSummary)
  }),
  Schema.Struct({
    ...SceneGraphChangeBaseFields,
    eventType: Schema.Literal("SceneItemEnableStateChanged"),
    category: Schema.Literal("scene_items"),
    target: Schema.Literal("scene_item"),
    outcome: Schema.Literal("enabled"),
    ...SceneGraphSceneItemSummaryFields,
    sceneItemEnabled: Schema.Literal(true)
  }),
  Schema.Struct({
    ...SceneGraphChangeBaseFields,
    eventType: Schema.Literal("SceneItemEnableStateChanged"),
    category: Schema.Literal("scene_items"),
    target: Schema.Literal("scene_item"),
    outcome: Schema.Literal("disabled"),
    ...SceneGraphSceneItemSummaryFields,
    sceneItemEnabled: Schema.Literal(false)
  }),
  Schema.Struct({
    ...SceneGraphChangeBaseFields,
    eventType: Schema.Literal("SceneItemLockStateChanged"),
    category: Schema.Literal("scene_items"),
    target: Schema.Literal("scene_item"),
    outcome: Schema.Literal("locked"),
    ...SceneGraphSceneItemSummaryFields,
    sceneItemLocked: Schema.Literal(true)
  }),
  Schema.Struct({
    ...SceneGraphChangeBaseFields,
    eventType: Schema.Literal("SceneItemLockStateChanged"),
    category: Schema.Literal("scene_items"),
    target: Schema.Literal("scene_item"),
    outcome: Schema.Literal("unlocked"),
    ...SceneGraphSceneItemSummaryFields,
    sceneItemLocked: Schema.Literal(false)
  })
)
export type SceneGraphChangeEventSummary = typeof SceneGraphChangeEventSummary.Type

export const ConfirmObsSceneGraphChangeOutput = Schema.Struct({
  confirmed: Schema.Boolean,
  timedOut: Schema.Boolean,
  baselineSequence: EventCursor,
  latestSequence: EventCursor,
  missedEvents: Schema.Boolean,
  event: Schema.optional(SceneGraphChangeEventSummary)
})
export type ConfirmObsSceneGraphChangeOutput = typeof ConfirmObsSceneGraphChangeOutput.Type
export const ConfirmObsSceneGraphChangeOutputJsonSchema = JSONSchema.make(ConfirmObsSceneGraphChangeOutput)

const SourceFilterChangeBaseFields = {
  sequence: EventSequence,
  eventIntent: EventIntent,
  category: Schema.Literal("filters"),
  target: Schema.Literal("source_filter")
} as const

const SourceFilterSummaryIdentityFields = {
  sourceName: ObsString,
  filterName: ObsString
} as const

export const SourceFilterOrderingItem = Schema.Struct({
  filterName: ObsString,
  filterIndex: SourceFilterIndex
})
export type SourceFilterOrderingItem = typeof SourceFilterOrderingItem.Type

export const SourceFilterChangeEventSummary = Schema.Union(
  Schema.Struct({
    ...SourceFilterChangeBaseFields,
    eventType: Schema.Literal("SourceFilterCreated"),
    outcome: Schema.Literal("created"),
    ...SourceFilterSummaryIdentityFields,
    filterKind: ObsString,
    filterIndex: SourceFilterIndex,
    rawSettingsOmitted: Schema.Literal(true),
    defaultSettingsOmitted: Schema.Literal(true)
  }),
  Schema.Struct({
    ...SourceFilterChangeBaseFields,
    eventType: Schema.Literal("SourceFilterRemoved"),
    outcome: Schema.Literal("removed"),
    ...SourceFilterSummaryIdentityFields
  }),
  Schema.Struct({
    ...SourceFilterChangeBaseFields,
    eventType: Schema.Literal("SourceFilterNameChanged"),
    outcome: Schema.Literal("renamed"),
    sourceName: ObsString,
    oldFilterName: ObsString,
    filterName: ObsString
  }),
  Schema.Struct({
    ...SourceFilterChangeBaseFields,
    eventType: Schema.Literal("SourceFilterListReindexed"),
    outcome: Schema.Literal("reordered"),
    sourceName: ObsString,
    filters: Schema.Array(SourceFilterOrderingItem)
  }),
  Schema.Struct({
    ...SourceFilterChangeBaseFields,
    eventType: Schema.Literal("SourceFilterEnableStateChanged"),
    outcome: Schema.Literal("enabled"),
    ...SourceFilterSummaryIdentityFields,
    filterEnabled: Schema.Literal(true)
  }),
  Schema.Struct({
    ...SourceFilterChangeBaseFields,
    eventType: Schema.Literal("SourceFilterEnableStateChanged"),
    outcome: Schema.Literal("disabled"),
    ...SourceFilterSummaryIdentityFields,
    filterEnabled: Schema.Literal(false)
  }),
  Schema.Struct({
    ...SourceFilterChangeBaseFields,
    eventType: Schema.Literal("SourceFilterSettingsChanged"),
    outcome: Schema.Literal("settings_changed"),
    ...SourceFilterSummaryIdentityFields,
    rawSettingsOmitted: Schema.Literal(true)
  })
)
export type SourceFilterChangeEventSummary = typeof SourceFilterChangeEventSummary.Type

export const ConfirmObsSourceFilterChangeOutput = Schema.Struct({
  confirmed: Schema.Boolean,
  timedOut: Schema.Boolean,
  baselineSequence: EventCursor,
  latestSequence: EventCursor,
  missedEvents: Schema.Boolean,
  event: Schema.optional(SourceFilterChangeEventSummary)
})
export type ConfirmObsSourceFilterChangeOutput = typeof ConfirmObsSourceFilterChangeOutput.Type
export const ConfirmObsSourceFilterChangeOutputJsonSchema = JSONSchema.make(ConfirmObsSourceFilterChangeOutput)

const MediaInputWorkflowBaseFields = {
  sequence: EventSequence,
  eventIntent: EventIntent,
  category: Schema.Literal("media_inputs"),
  target: Schema.Literal("media_input")
} as const

const MediaInputWorkflowSummaryIdentityFields = {
  inputName: ObsString,
  inputUuid: ObsString
} as const

export const MediaInputWorkflowEventSummary = Schema.Union(
  Schema.Struct({
    ...MediaInputWorkflowBaseFields,
    eventType: Schema.Literal("MediaInputPlaybackStarted"),
    outcome: Schema.Literal("playback_started"),
    ...MediaInputWorkflowSummaryIdentityFields
  }),
  Schema.Struct({
    ...MediaInputWorkflowBaseFields,
    eventType: Schema.Literal("MediaInputPlaybackEnded"),
    outcome: Schema.Literal("playback_ended"),
    ...MediaInputWorkflowSummaryIdentityFields
  }),
  Schema.Struct({
    ...MediaInputWorkflowBaseFields,
    eventType: Schema.Literal("MediaInputActionTriggered"),
    outcome: Schema.Literal("action_triggered"),
    ...MediaInputWorkflowSummaryIdentityFields,
    mediaAction: MediaInputWorkflowAction
  })
)
export type MediaInputWorkflowEventSummary = typeof MediaInputWorkflowEventSummary.Type

export const ConfirmObsMediaInputWorkflowOutput = Schema.Struct({
  confirmed: Schema.Boolean,
  timedOut: Schema.Boolean,
  baselineSequence: EventCursor,
  latestSequence: EventCursor,
  missedEvents: Schema.Boolean,
  event: Schema.optional(MediaInputWorkflowEventSummary)
})
export type ConfirmObsMediaInputWorkflowOutput = typeof ConfirmObsMediaInputWorkflowOutput.Type
export const ConfirmObsMediaInputWorkflowOutputJsonSchema = JSONSchema.make(ConfirmObsMediaInputWorkflowOutput)

const TransitionWorkflowBaseFields = {
  sequence: EventSequence,
  eventIntent: EventIntent,
  category: Schema.Literal("transitions")
} as const

const TransitionWorkflowIdentityFields = {
  transitionName: ObsString,
  transitionUuid: ObsString
} as const

export const TransitionWorkflowEventSummary = Schema.Union(
  Schema.Struct({
    ...TransitionWorkflowBaseFields,
    eventType: Schema.Literal("CurrentSceneTransitionChanged"),
    target: Schema.Literal("current_scene_transition"),
    outcome: Schema.Literal("changed"),
    ...TransitionWorkflowIdentityFields
  }),
  Schema.Struct({
    ...TransitionWorkflowBaseFields,
    eventType: Schema.Literal("CurrentSceneTransitionDurationChanged"),
    target: Schema.Literal("current_scene_transition"),
    outcome: Schema.Literal("duration_changed"),
    transitionDuration: TransitionWorkflowDuration
  }),
  Schema.Struct({
    ...TransitionWorkflowBaseFields,
    eventType: Schema.Literal("SceneTransitionStarted"),
    target: Schema.Literal("scene_transition"),
    outcome: Schema.Literal("started"),
    ...TransitionWorkflowIdentityFields
  }),
  Schema.Struct({
    ...TransitionWorkflowBaseFields,
    eventType: Schema.Literal("SceneTransitionEnded"),
    target: Schema.Literal("scene_transition"),
    outcome: Schema.Literal("ended"),
    ...TransitionWorkflowIdentityFields
  }),
  Schema.Struct({
    ...TransitionWorkflowBaseFields,
    eventType: Schema.Literal("SceneTransitionVideoEnded"),
    target: Schema.Literal("scene_transition"),
    outcome: Schema.Literal("video_ended"),
    ...TransitionWorkflowIdentityFields
  })
)
export type TransitionWorkflowEventSummary = typeof TransitionWorkflowEventSummary.Type

export const ConfirmObsTransitionWorkflowOutput = Schema.Struct({
  confirmed: Schema.Boolean,
  timedOut: Schema.Boolean,
  baselineSequence: EventCursor,
  latestSequence: EventCursor,
  missedEvents: Schema.Boolean,
  event: Schema.optional(TransitionWorkflowEventSummary)
})
export type ConfirmObsTransitionWorkflowOutput = typeof ConfirmObsTransitionWorkflowOutput.Type
export const ConfirmObsTransitionWorkflowOutputJsonSchema = JSONSchema.make(ConfirmObsTransitionWorkflowOutput)

const InputAudioChangeBaseFields = {
  sequence: EventSequence,
  eventIntent: EventIntent,
  category: Schema.Literal("inputs"),
  target: Schema.Literal("input_audio")
} as const

const InputAudioChangeIdentityFields = {
  inputName: ObsString,
  inputUuid: ObsString
} as const

export const InputAudioChangeEventSummary = Schema.Union(
  Schema.Struct({
    ...InputAudioChangeBaseFields,
    eventType: Schema.Literal("InputMuteStateChanged"),
    outcome: Schema.Literal("muted"),
    ...InputAudioChangeIdentityFields,
    inputMuted: Schema.Literal(true)
  }),
  Schema.Struct({
    ...InputAudioChangeBaseFields,
    eventType: Schema.Literal("InputMuteStateChanged"),
    outcome: Schema.Literal("unmuted"),
    ...InputAudioChangeIdentityFields,
    inputMuted: Schema.Literal(false)
  }),
  Schema.Struct({
    ...InputAudioChangeBaseFields,
    eventType: Schema.Literal("InputVolumeChanged"),
    outcome: Schema.Literal("volume_changed"),
    ...InputAudioChangeIdentityFields,
    inputVolumeMul: InputVolumeMul,
    inputVolumeDb: InputVolumeDb
  }),
  Schema.Struct({
    ...InputAudioChangeBaseFields,
    eventType: Schema.Literal("InputAudioBalanceChanged"),
    outcome: Schema.Literal("balance_changed"),
    ...InputAudioChangeIdentityFields,
    inputAudioBalance: InputAudioBalance
  }),
  Schema.Struct({
    ...InputAudioChangeBaseFields,
    eventType: Schema.Literal("InputAudioSyncOffsetChanged"),
    outcome: Schema.Literal("sync_offset_changed"),
    ...InputAudioChangeIdentityFields,
    inputAudioSyncOffset: InputAudioSyncOffset
  }),
  Schema.Struct({
    ...InputAudioChangeBaseFields,
    eventType: Schema.Literal("InputAudioTracksChanged"),
    outcome: Schema.Literal("tracks_changed"),
    ...InputAudioChangeIdentityFields,
    inputAudioTracks: InputAudioTracks
  }),
  Schema.Struct({
    ...InputAudioChangeBaseFields,
    eventType: Schema.Literal("InputAudioMonitorTypeChanged"),
    outcome: Schema.Literal("monitor_type_changed"),
    ...InputAudioChangeIdentityFields,
    monitorType: InputAudioMonitorType
  })
)
export type InputAudioChangeEventSummary = typeof InputAudioChangeEventSummary.Type

export const ConfirmObsInputAudioChangeOutput = Schema.Struct({
  confirmed: Schema.Boolean,
  timedOut: Schema.Boolean,
  baselineSequence: EventCursor,
  latestSequence: EventCursor,
  missedEvents: Schema.Boolean,
  event: Schema.optional(InputAudioChangeEventSummary)
})
export type ConfirmObsInputAudioChangeOutput = typeof ConfirmObsInputAudioChangeOutput.Type
export const ConfirmObsInputAudioChangeOutputJsonSchema = JSONSchema.make(ConfirmObsInputAudioChangeOutput)

const InputIdentityChangeBaseFields = {
  sequence: EventSequence,
  eventIntent: InputsEventIntent,
  category: Schema.Literal("inputs"),
  target: Schema.Literal("input")
} as const

const InputIdentityChangeIdentityFields = {
  inputName: InputIdentityName,
  inputUuid: InputIdentityUuid
} as const

export const InputIdentityChangeEventSummary = Schema.Union(
  Schema.Struct({
    ...InputIdentityChangeBaseFields,
    eventType: Schema.Literal("InputRemoved"),
    outcome: Schema.Literal("removed"),
    ...InputIdentityChangeIdentityFields
  }),
  Schema.Struct({
    ...InputIdentityChangeBaseFields,
    eventType: Schema.Literal("InputNameChanged"),
    outcome: Schema.Literal("renamed"),
    oldInputName: InputIdentityName,
    ...InputIdentityChangeIdentityFields
  })
)
export type InputIdentityChangeEventSummary = typeof InputIdentityChangeEventSummary.Type

export const ConfirmObsInputIdentityChangeOutput = Schema.Struct({
  confirmed: Schema.Boolean,
  timedOut: Schema.Boolean,
  baselineSequence: EventCursor,
  latestSequence: EventCursor,
  missedEvents: Schema.Boolean,
  event: Schema.optional(InputIdentityChangeEventSummary)
})
export type ConfirmObsInputIdentityChangeOutput = typeof ConfirmObsInputIdentityChangeOutput.Type
export const ConfirmObsInputIdentityChangeOutputJsonSchema = JSONSchema.make(ConfirmObsInputIdentityChangeOutput)

const CanvasInventoryChangeBaseFields = {
  sequence: EventSequence,
  eventIntent: CanvasEventIntent,
  category: Schema.Literal("canvases"),
  target: Schema.Literal("canvas")
} as const

const CanvasInventoryChangeIdentityFields = {
  canvasName: CanvasName,
  canvasUuid: CanvasUuid
} as const

export const CanvasInventoryChangeEventSummary = Schema.Union(
  Schema.Struct({
    ...CanvasInventoryChangeBaseFields,
    eventType: Schema.Literal("CanvasCreated"),
    outcome: Schema.Literal("created"),
    ...CanvasInventoryChangeIdentityFields
  }),
  Schema.Struct({
    ...CanvasInventoryChangeBaseFields,
    eventType: Schema.Literal("CanvasRemoved"),
    outcome: Schema.Literal("removed"),
    ...CanvasInventoryChangeIdentityFields
  }),
  Schema.Struct({
    ...CanvasInventoryChangeBaseFields,
    eventType: Schema.Literal("CanvasNameChanged"),
    outcome: Schema.Literal("renamed"),
    oldCanvasName: CanvasName,
    ...CanvasInventoryChangeIdentityFields
  })
)
export type CanvasInventoryChangeEventSummary = typeof CanvasInventoryChangeEventSummary.Type

export const ConfirmObsCanvasInventoryChangeOutput = Schema.Struct({
  confirmed: Schema.Boolean,
  timedOut: Schema.Boolean,
  baselineSequence: EventCursor,
  latestSequence: EventCursor,
  missedEvents: Schema.Boolean,
  event: Schema.optional(CanvasInventoryChangeEventSummary)
})
export type ConfirmObsCanvasInventoryChangeOutput = typeof ConfirmObsCanvasInventoryChangeOutput.Type
export const ConfirmObsCanvasInventoryChangeOutputJsonSchema = JSONSchema.make(ConfirmObsCanvasInventoryChangeOutput)

const StudioModeStateChangeBaseFields = {
  sequence: EventSequence,
  eventType: StudioModeStateChangeEventType,
  eventIntent: UiEventIntent,
  category: Schema.Literal("ui"),
  target: Schema.Literal("studio_mode")
} as const

export const StudioModeStateChangeEventSummary = Schema.Union(
  Schema.Struct({
    ...StudioModeStateChangeBaseFields,
    outcome: Schema.Literal("enabled"),
    studioModeEnabled: Schema.Literal(true)
  }),
  Schema.Struct({
    ...StudioModeStateChangeBaseFields,
    outcome: Schema.Literal("disabled"),
    studioModeEnabled: Schema.Literal(false)
  })
)
export type StudioModeStateChangeEventSummary = typeof StudioModeStateChangeEventSummary.Type

export const ConfirmObsStudioModeStateChangeOutput = Schema.Struct({
  confirmed: Schema.Boolean,
  timedOut: Schema.Boolean,
  baselineSequence: EventCursor,
  latestSequence: EventCursor,
  missedEvents: Schema.Boolean,
  event: Schema.optional(StudioModeStateChangeEventSummary)
})
export type ConfirmObsStudioModeStateChangeOutput = typeof ConfirmObsStudioModeStateChangeOutput.Type
export const ConfirmObsStudioModeStateChangeOutputJsonSchema = JSONSchema.make(ConfirmObsStudioModeStateChangeOutput)

const ConfigWorkflowBaseFields = {
  sequence: EventSequence,
  eventIntent: ConfigEventIntent,
  category: Schema.Literal("config")
} as const

export const ConfigWorkflowEventSummary = Schema.Union(
  Schema.Struct({
    ...ConfigWorkflowBaseFields,
    eventType: Schema.Literal("CurrentProfileChanging"),
    target: Schema.Literal("profile"),
    outcome: Schema.Literal("changing"),
    profileName: ProfileName
  }),
  Schema.Struct({
    ...ConfigWorkflowBaseFields,
    eventType: Schema.Literal("CurrentProfileChanged"),
    target: Schema.Literal("profile"),
    outcome: Schema.Literal("changed"),
    profileName: ProfileName
  }),
  Schema.Struct({
    ...ConfigWorkflowBaseFields,
    eventType: Schema.Literal("ProfileListChanged"),
    target: Schema.Literal("profile"),
    outcome: Schema.Literal("list_changed"),
    profiles: Schema.Array(ProfileName)
  }),
  Schema.Struct({
    ...ConfigWorkflowBaseFields,
    eventType: Schema.Literal("CurrentSceneCollectionChanging"),
    target: Schema.Literal("scene_collection"),
    outcome: Schema.Literal("changing"),
    sceneCollectionName: SceneCollectionName
  }),
  Schema.Struct({
    ...ConfigWorkflowBaseFields,
    eventType: Schema.Literal("CurrentSceneCollectionChanged"),
    target: Schema.Literal("scene_collection"),
    outcome: Schema.Literal("changed"),
    sceneCollectionName: SceneCollectionName
  }),
  Schema.Struct({
    ...ConfigWorkflowBaseFields,
    eventType: Schema.Literal("SceneCollectionListChanged"),
    target: Schema.Literal("scene_collection"),
    outcome: Schema.Literal("list_changed"),
    sceneCollections: Schema.Array(SceneCollectionName)
  })
)
export type ConfigWorkflowEventSummary = typeof ConfigWorkflowEventSummary.Type

export const ConfirmObsConfigWorkflowOutput = Schema.Struct({
  confirmed: Schema.Boolean,
  timedOut: Schema.Boolean,
  baselineSequence: EventCursor,
  latestSequence: EventCursor,
  missedEvents: Schema.Boolean,
  event: Schema.optional(ConfigWorkflowEventSummary)
})
export type ConfirmObsConfigWorkflowOutput = typeof ConfirmObsConfigWorkflowOutput.Type
export const ConfirmObsConfigWorkflowOutputJsonSchema = JSONSchema.make(ConfirmObsConfigWorkflowOutput)
