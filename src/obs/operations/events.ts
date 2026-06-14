/* eslint-disable max-lines */
import { Schema } from "effect"

import {
  CanvasInventoryChangeEventSummary,
  type CanvasInventoryChangeOutcome,
  ConfigWorkflowEventSummary,
  type ConfigWorkflowOutcome,
  type ConfigWorkflowTarget,
  ConfirmObsCanvasInventoryChangeInput,
  ConfirmObsCanvasInventoryChangeOutput,
  ConfirmObsConfigWorkflowInput,
  ConfirmObsConfigWorkflowOutput,
  ConfirmObsInputAudioChangeInput,
  ConfirmObsInputAudioChangeOutput,
  ConfirmObsInputIdentityChangeInput,
  ConfirmObsInputIdentityChangeOutput,
  ConfirmObsMediaInputWorkflowInput,
  ConfirmObsMediaInputWorkflowOutput,
  ConfirmObsOutputLifecycleInput,
  ConfirmObsOutputLifecycleOutput,
  ConfirmObsSceneGraphChangeInput,
  ConfirmObsSceneGraphChangeOutput,
  ConfirmObsSourceFilterChangeInput,
  ConfirmObsSourceFilterChangeOutput,
  ConfirmObsStudioModeStateChangeInput,
  ConfirmObsStudioModeStateChangeOutput,
  ConfirmObsTransitionWorkflowInput,
  ConfirmObsTransitionWorkflowOutput,
  GetRecentObsEventsInput,
  GetRecentObsEventsOutput,
  InputAudioChangeEventSummary,
  type InputAudioChangeOutcome,
  InputIdentityChangeEventSummary,
  type InputIdentityChangeOutcome,
  MediaInputWorkflowEventSummary,
  type MediaInputWorkflowOutcome,
  type ObsEventCategory,
  type ObsOutputState,
  type OutputLifecycleEventSummary,
  type OutputLifecycleOutcome,
  type OutputLifecycleTarget,
  SceneGraphChangeEventSummary,
  type SceneGraphChangeOutcome,
  type SceneGraphChangeTarget,
  SourceFilterChangeEventSummary,
  type SourceFilterChangeOutcome,
  StudioModeStateChangeEventSummary,
  type StudioModeStateChangeOutcome,
  TransitionWorkflowEventSummary,
  type TransitionWorkflowOutcome,
  type TransitionWorkflowTarget
} from "../../domain/schemas/events.js"
import { ObsInputAudioTracks } from "../../domain/schemas/shared.js"
import type { ObsClient } from "../client.js"
import type { BufferedObsEvent } from "../events.js"
import {
  eventMatchesOfficialSubscription,
  EventSubscription,
  HIGH_VOLUME_EVENT_SUBSCRIPTIONS,
  officialEventSubscriptionFor
} from "../protocol.js"
import { withDefinedFields } from "./shared.js"

const CATEGORY_INTENTS: ReadonlyArray<{
  readonly category: Exclude<ObsEventCategory, "unknown">
  readonly intent: number
}> = [
  { category: "general", intent: EventSubscription.General },
  { category: "config", intent: EventSubscription.Config },
  { category: "scenes", intent: EventSubscription.Scenes },
  { category: "inputs", intent: EventSubscription.Inputs },
  { category: "transitions", intent: EventSubscription.Transitions },
  { category: "filters", intent: EventSubscription.Filters },
  { category: "outputs", intent: EventSubscription.Outputs },
  { category: "scene_items", intent: EventSubscription.SceneItems },
  { category: "media_inputs", intent: EventSubscription.MediaInputs },
  { category: "ui", intent: EventSubscription.Ui },
  { category: "canvases", intent: EventSubscription.Canvases }
]

const UNSAFE_PUBLIC_EVENT_TYPES = new Set([
  "VendorEvent",
  "CustomEvent",
  ...HIGH_VOLUME_EVENT_SUBSCRIPTIONS
])
const HIGH_VOLUME_EVENT_INTENT_MASK = EventSubscription.InputVolumeMeters
  | EventSubscription.InputActiveStateChanged
  | EventSubscription.InputShowStateChanged
  | EventSubscription.SceneItemTransformChanged

const categoryForIntent = (eventIntent: number): ObsEventCategory =>
  CATEGORY_INTENTS.find((entry) => (eventIntent & entry.intent) !== 0)?.category ?? "unknown"

const isPublicSafeEvent = (event: BufferedObsEvent): boolean =>
  (event.eventIntent & EventSubscription.Vendors) === 0
  && (event.eventIntent & HIGH_VOLUME_EVENT_INTENT_MASK) === 0
  && (
    officialEventSubscriptionFor(event.eventType) === undefined
    || eventMatchesOfficialSubscription(event.eventType, event.eventIntent)
  )
  && !UNSAFE_PUBLIC_EVENT_TYPES.has(event.eventType)

const matchesCategories = (
  event: BufferedObsEvent,
  categories: ReadonlyArray<ObsEventCategory> | undefined
): boolean => {
  if (categories === undefined) {
    return true
  }
  const selected = new Set(categories)
  return selected.has(categoryForIntent(event.eventIntent))
}

const outcomeForOutputState = (outputState: ObsOutputState): OutputLifecycleOutcome | undefined => {
  switch (outputState) {
    case "OBS_WEBSOCKET_OUTPUT_STARTED":
      return "started"
    case "OBS_WEBSOCKET_OUTPUT_STOPPED":
      return "stopped"
    case "OBS_WEBSOCKET_OUTPUT_PAUSED":
      return "paused"
    case "OBS_WEBSOCKET_OUTPUT_RESUMED":
      return "resumed"
    default:
      return undefined
  }
}

const stateEventTarget = (eventType: string): OutputLifecycleTarget | undefined => {
  switch (eventType) {
    case "StreamStateChanged":
      return "stream"
    case "RecordStateChanged":
      return "record"
    case "ReplayBufferStateChanged":
      return "replay_buffer"
    case "VirtualcamStateChanged":
      return "virtualcam"
    /* v8 ignore next -- caller checks the finite state-event set before asking for a target. */
    default:
      return undefined
  }
}

const outputLifecycleSummaryFor = (event: BufferedObsEvent): OutputLifecycleEventSummary | undefined => {
  if (event.eventIntent !== EventSubscription.Outputs) {
    return undefined
  }

  if (event.eventType === "RecordFileChanged") {
    const eventData = event.eventData
    if (eventData === undefined || !("newOutputPath" in eventData)) {
      return undefined
    }
    return {
      sequence: event.sequence,
      eventType: "RecordFileChanged",
      eventIntent: event.eventIntent,
      category: "outputs",
      target: "record",
      outcome: "file_changed",
      newOutputPath: eventData.newOutputPath
    }
  }

  if (event.eventType === "ReplayBufferSaved") {
    const eventData = event.eventData
    if (eventData === undefined || !("savedReplayPath" in eventData)) {
      return undefined
    }
    return {
      sequence: event.sequence,
      eventType: "ReplayBufferSaved",
      eventIntent: event.eventIntent,
      category: "outputs",
      target: "replay_buffer",
      outcome: "replay_saved",
      savedReplayPath: eventData.savedReplayPath
    }
  }

  if (
    event.eventType !== "StreamStateChanged"
    && event.eventType !== "RecordStateChanged"
    && event.eventType !== "ReplayBufferStateChanged"
    && event.eventType !== "VirtualcamStateChanged"
  ) {
    return undefined
  }
  const target = stateEventTarget(event.eventType)
  const eventData = event.eventData
  if (
    target === undefined
    || eventData === undefined
    || !("outputState" in eventData)
    || !("outputActive" in eventData)
    || (event.eventType === "RecordStateChanged" && !("outputPath" in eventData))
  ) {
    return undefined
  }
  const outcome = outcomeForOutputState(eventData.outputState)
  if (outcome === undefined || !isSupportedOutputLifecycleOutcome(target, outcome)) {
    return undefined
  }
  const base = {
    sequence: event.sequence,
    eventIntent: event.eventIntent,
    category: "outputs",
    outputActive: eventData.outputActive,
    outputState: eventData.outputState
  } as const
  if (event.eventType === "RecordStateChanged") {
    /* v8 ignore next -- isSupportedOutputLifecycleOutcome already narrows record outcomes to these cases. */
    if (outcome !== "started" && outcome !== "stopped" && outcome !== "paused" && outcome !== "resumed") {
      return undefined
    }
    /* v8 ignore next -- RecordStateChanged without outputPath is rejected before outcome decoding. */
    if (!("outputPath" in eventData)) {
      return undefined
    }
    return {
      ...base,
      eventType: "RecordStateChanged",
      target: "record",
      outcome,
      outputPath: eventData.outputPath
    }
  }
  /* v8 ignore next -- non-record targets only pass isSupportedOutputLifecycleOutcome for start/stop. */
  if (outcome !== "started" && outcome !== "stopped") {
    return undefined
  }
  if (event.eventType === "StreamStateChanged") {
    return { ...base, eventType: "StreamStateChanged", target: "stream", outcome }
  }
  if (event.eventType === "ReplayBufferStateChanged") {
    return { ...base, eventType: "ReplayBufferStateChanged", target: "replay_buffer", outcome }
  }
  return { ...base, eventType: "VirtualcamStateChanged", target: "virtualcam", outcome }
}

const sceneGraphCategoryForEvent = (eventType: string): "scenes" | "scene_items" | undefined => {
  switch (eventType) {
    case "SceneCreated":
    case "SceneRemoved":
    case "SceneNameChanged":
    case "CurrentProgramSceneChanged":
    case "CurrentPreviewSceneChanged":
      return "scenes"
    case "SceneItemCreated":
    case "SceneItemRemoved":
    case "SceneItemListReindexed":
    case "SceneItemEnableStateChanged":
    case "SceneItemLockStateChanged":
      return "scene_items"
    default:
      return undefined
  }
}

const decodeSourceFilterChangeSummary = Schema.decodeUnknownSync(
  SourceFilterChangeEventSummary,
  { onExcessProperty: "error" }
)

const decodeMediaInputWorkflowSummary = Schema.decodeUnknownSync(
  MediaInputWorkflowEventSummary,
  { onExcessProperty: "error" }
)

const decodeInputAudioChangeSummary = Schema.decodeUnknownSync(
  InputAudioChangeEventSummary,
  { onExcessProperty: "error" }
)

const decodeInputIdentityChangeSummary = Schema.decodeUnknownSync(
  InputIdentityChangeEventSummary,
  { onExcessProperty: "error" }
)

const decodeCanvasInventoryChangeSummary = Schema.decodeUnknownSync(
  CanvasInventoryChangeEventSummary,
  { onExcessProperty: "error" }
)

const decodeStudioModeStateChangeSummary = Schema.decodeUnknownSync(
  StudioModeStateChangeEventSummary,
  { onExcessProperty: "error" }
)

const decodeTransitionWorkflowSummary = Schema.decodeUnknownSync(
  TransitionWorkflowEventSummary,
  { onExcessProperty: "error" }
)

const decodeConfigWorkflowSummary = Schema.decodeUnknownSync(
  ConfigWorkflowEventSummary,
  { onExcessProperty: "error" }
)

const decodeObsInputAudioTracks = Schema.decodeUnknownSync(
  ObsInputAudioTracks,
  { onExcessProperty: "error" }
)

const inputAudioTracksFromObsTracks = (
  tracks: {
    readonly "1": boolean
    readonly "2": boolean
    readonly "3": boolean
    readonly "4": boolean
    readonly "5": boolean
    readonly "6": boolean
  }
) => ({
  track1: tracks["1"],
  track2: tracks["2"],
  track3: tracks["3"],
  track4: tracks["4"],
  track5: tracks["5"],
  track6: tracks["6"]
})

const inputAudioOutcomeForEvent = (
  eventType: string,
  inputMuted: boolean | undefined
): InputAudioChangeOutcome | undefined => {
  switch (eventType) {
    case "InputMuteStateChanged":
      return inputMuted === undefined ? undefined : inputMuted ? "muted" : "unmuted"
    case "InputVolumeChanged":
      return "volume_changed"
    case "InputAudioBalanceChanged":
      return "balance_changed"
    case "InputAudioSyncOffsetChanged":
      return "sync_offset_changed"
    case "InputAudioTracksChanged":
      return "tracks_changed"
    case "InputAudioMonitorTypeChanged":
      return "monitor_type_changed"
    default:
      return undefined
  }
}

const INPUT_REMOVED_EVENT_DATA_FIELD_COUNT = 2
const INPUT_NAME_CHANGED_EVENT_DATA_FIELD_COUNT = 3

const mediaInputOutcomeForEventType = (eventType: string): MediaInputWorkflowOutcome | undefined => {
  switch (eventType) {
    case "MediaInputPlaybackStarted":
      return "playback_started"
    case "MediaInputPlaybackEnded":
      return "playback_ended"
    case "MediaInputActionTriggered":
      return "action_triggered"
    default:
      return undefined
  }
}

const transitionWorkflowOutcomeForEventType = (eventType: string): TransitionWorkflowOutcome | undefined => {
  switch (eventType) {
    case "CurrentSceneTransitionChanged":
      return "changed"
    case "CurrentSceneTransitionDurationChanged":
      return "duration_changed"
    case "SceneTransitionStarted":
      return "started"
    case "SceneTransitionEnded":
      return "ended"
    case "SceneTransitionVideoEnded":
      return "video_ended"
    default:
      return undefined
  }
}

const transitionWorkflowTargetForEventType = (eventType: string): TransitionWorkflowTarget | undefined => {
  switch (eventType) {
    case "CurrentSceneTransitionChanged":
    case "CurrentSceneTransitionDurationChanged":
      return "current_scene_transition"
    case "SceneTransitionStarted":
    case "SceneTransitionEnded":
    case "SceneTransitionVideoEnded":
      return "scene_transition"
    default:
      return undefined
  }
}

const configWorkflowOutcomeForEventType = (eventType: string): ConfigWorkflowOutcome | undefined => {
  switch (eventType) {
    case "CurrentProfileChanging":
    case "CurrentSceneCollectionChanging":
      return "changing"
    case "CurrentProfileChanged":
    case "CurrentSceneCollectionChanged":
      return "changed"
    case "ProfileListChanged":
    case "SceneCollectionListChanged":
      return "list_changed"
    default:
      return undefined
  }
}

const configWorkflowTargetForEventType = (eventType: string): ConfigWorkflowTarget | undefined => {
  switch (eventType) {
    case "CurrentProfileChanging":
    case "CurrentProfileChanged":
    case "ProfileListChanged":
      return "profile"
    case "CurrentSceneCollectionChanging":
    case "CurrentSceneCollectionChanged":
    case "SceneCollectionListChanged":
      return "scene_collection"
    default:
      return undefined
  }
}

const canvasInventoryChangeOutcomeForEventType = (
  eventType: string
): CanvasInventoryChangeOutcome | undefined => {
  switch (eventType) {
    case "CanvasCreated":
      return "created"
    case "CanvasRemoved":
      return "removed"
    case "CanvasNameChanged":
      return "renamed"
    default:
      return undefined
  }
}

const CANVAS_INVENTORY_EVENT_DATA_FIELD_COUNT = 2
const CANVAS_INVENTORY_RENAMED_EVENT_DATA_FIELD_COUNT = 3

const canvasInventoryChangeSummaryFor = (
  event: BufferedObsEvent
): CanvasInventoryChangeEventSummary | undefined => {
  if (!eventMatchesOfficialSubscription(event.eventType, event.eventIntent)) {
    return undefined
  }
  const outcome = canvasInventoryChangeOutcomeForEventType(event.eventType)
  const eventData = event.eventData
  if (event.eventIntent !== EventSubscription.Canvases || outcome === undefined || eventData === undefined) {
    return undefined
  }
  if (!("canvasName" in eventData) || !("canvasUuid" in eventData)) {
    return undefined
  }

  const base = {
    sequence: event.sequence,
    eventIntent: event.eventIntent,
    category: "canvases",
    target: "canvas"
  } as const

  try {
    switch (event.eventType) {
      case "CanvasCreated":
        if (Object.keys(eventData).length !== CANVAS_INVENTORY_EVENT_DATA_FIELD_COUNT) return undefined
        return decodeCanvasInventoryChangeSummary({
          ...base,
          eventType: "CanvasCreated",
          outcome: "created",
          canvasName: eventData.canvasName,
          canvasUuid: eventData.canvasUuid
        })
      case "CanvasRemoved":
        if (Object.keys(eventData).length !== CANVAS_INVENTORY_EVENT_DATA_FIELD_COUNT) return undefined
        return decodeCanvasInventoryChangeSummary({
          ...base,
          eventType: "CanvasRemoved",
          outcome: "removed",
          canvasName: eventData.canvasName,
          canvasUuid: eventData.canvasUuid
        })
      case "CanvasNameChanged":
        if (
          !("oldCanvasName" in eventData)
          || Object.keys(eventData).length !== CANVAS_INVENTORY_RENAMED_EVENT_DATA_FIELD_COUNT
        ) {
          return undefined
        }
        return decodeCanvasInventoryChangeSummary({
          ...base,
          eventType: "CanvasNameChanged",
          outcome: "renamed",
          oldCanvasName: eventData.oldCanvasName,
          canvasName: eventData.canvasName,
          canvasUuid: eventData.canvasUuid
        })
      /* v8 ignore next -- outcomeForEventType rejects unsupported canvas events before this switch. */
      default:
        return undefined
    }
  } catch {
    return undefined
  }
}

const studioModeStateChangeSummaryFor = (
  event: BufferedObsEvent
): StudioModeStateChangeEventSummary | undefined => {
  if (!eventMatchesOfficialSubscription(event.eventType, event.eventIntent)) {
    return undefined
  }
  const eventData = event.eventData
  if (
    event.eventType !== "StudioModeStateChanged"
    || event.eventIntent !== EventSubscription.Ui
    || eventData === undefined
    || !("studioModeEnabled" in eventData)
    || Object.keys(eventData).length !== 1
  ) {
    return undefined
  }

  try {
    return decodeStudioModeStateChangeSummary({
      sequence: event.sequence,
      eventType: "StudioModeStateChanged",
      eventIntent: event.eventIntent,
      category: "ui",
      target: "studio_mode",
      outcome: eventData.studioModeEnabled ? "enabled" : "disabled",
      studioModeEnabled: eventData.studioModeEnabled
    })
  } catch {
    return undefined
  }
}

const configWorkflowSummaryFor = (event: BufferedObsEvent): ConfigWorkflowEventSummary | undefined => {
  if (!eventMatchesOfficialSubscription(event.eventType, event.eventIntent)) {
    return undefined
  }
  const outcome = configWorkflowOutcomeForEventType(event.eventType)
  const target = configWorkflowTargetForEventType(event.eventType)
  const eventData = event.eventData
  if (
    event.eventIntent !== EventSubscription.Config
    || outcome === undefined
    || target === undefined
    || eventData === undefined
  ) {
    return undefined
  }

  const base = {
    sequence: event.sequence,
    eventIntent: event.eventIntent,
    category: "config",
    target
  } as const

  try {
    switch (event.eventType) {
      case "CurrentProfileChanging":
        if (!("profileName" in eventData)) return undefined
        return decodeConfigWorkflowSummary({
          ...base,
          eventType: "CurrentProfileChanging",
          outcome: "changing",
          ...eventData
        })
      case "CurrentProfileChanged":
        if (!("profileName" in eventData)) return undefined
        return decodeConfigWorkflowSummary({
          ...base,
          eventType: "CurrentProfileChanged",
          outcome: "changed",
          ...eventData
        })
      case "ProfileListChanged":
        if (!("profiles" in eventData)) return undefined
        return decodeConfigWorkflowSummary({
          ...base,
          eventType: "ProfileListChanged",
          outcome: "list_changed",
          ...eventData
        })
      case "CurrentSceneCollectionChanging":
        if (!("sceneCollectionName" in eventData)) return undefined
        return decodeConfigWorkflowSummary({
          ...base,
          eventType: "CurrentSceneCollectionChanging",
          outcome: "changing",
          ...eventData
        })
      case "CurrentSceneCollectionChanged":
        if (!("sceneCollectionName" in eventData)) return undefined
        return decodeConfigWorkflowSummary({
          ...base,
          eventType: "CurrentSceneCollectionChanged",
          outcome: "changed",
          ...eventData
        })
      case "SceneCollectionListChanged":
        if (!("sceneCollections" in eventData)) return undefined
        return decodeConfigWorkflowSummary({
          ...base,
          eventType: "SceneCollectionListChanged",
          outcome: "list_changed",
          ...eventData
        })
      /* v8 ignore next -- config target/outcome mappers reject unsupported config events before this switch. */
      default:
        return undefined
    }
  } catch {
    return undefined
  }
}

const inputAudioChangeSummaryFor = (event: BufferedObsEvent): InputAudioChangeEventSummary | undefined => {
  if (!eventMatchesOfficialSubscription(event.eventType, event.eventIntent)) {
    return undefined
  }
  const eventData = event.eventData
  if (event.eventIntent !== EventSubscription.Inputs || eventData === undefined) {
    return undefined
  }
  if (!("inputName" in eventData) || !("inputUuid" in eventData)) {
    return undefined
  }
  const outcome = inputAudioOutcomeForEvent(
    event.eventType,
    "inputMuted" in eventData ? eventData.inputMuted : undefined
  )
  if (outcome === undefined) {
    return undefined
  }

  const base = {
    sequence: event.sequence,
    eventIntent: event.eventIntent,
    category: "inputs",
    target: "input_audio"
  } as const

  try {
    switch (event.eventType) {
      case "InputMuteStateChanged":
        /* v8 ignore next -- inputAudioOutcomeForEvent returns undefined when inputMuted is absent. */
        if (!("inputMuted" in eventData)) return undefined
        return decodeInputAudioChangeSummary({
          ...base,
          eventType: "InputMuteStateChanged",
          outcome,
          ...eventData
        })
      case "InputVolumeChanged":
        if (!("inputVolumeMul" in eventData) || !("inputVolumeDb" in eventData)) return undefined
        return decodeInputAudioChangeSummary({
          ...base,
          eventType: "InputVolumeChanged",
          outcome,
          ...eventData
        })
      case "InputAudioBalanceChanged":
        if (!("inputAudioBalance" in eventData)) return undefined
        return decodeInputAudioChangeSummary({
          ...base,
          eventType: "InputAudioBalanceChanged",
          outcome,
          ...eventData
        })
      case "InputAudioSyncOffsetChanged":
        if (!("inputAudioSyncOffset" in eventData)) return undefined
        return decodeInputAudioChangeSummary({
          ...base,
          eventType: "InputAudioSyncOffsetChanged",
          outcome,
          ...eventData
        })
      case "InputAudioTracksChanged":
        if (!("inputAudioTracks" in eventData)) return undefined
        const inputAudioTracks = inputAudioTracksFromObsTracks(decodeObsInputAudioTracks(eventData.inputAudioTracks))
        return decodeInputAudioChangeSummary({
          ...base,
          eventType: "InputAudioTracksChanged",
          outcome,
          ...eventData,
          inputAudioTracks
        })
      case "InputAudioMonitorTypeChanged":
        if (!("monitorType" in eventData)) return undefined
        return decodeInputAudioChangeSummary({
          ...base,
          eventType: "InputAudioMonitorTypeChanged",
          outcome,
          ...eventData
        })
      /* v8 ignore next -- inputAudioOutcomeForEvent rejects unsupported input-audio events before this switch. */
      default:
        return undefined
    }
  } catch {
    return undefined
  }
}

const inputIdentityChangeSummaryFor = (
  event: BufferedObsEvent
): InputIdentityChangeEventSummary | undefined => {
  if (!eventMatchesOfficialSubscription(event.eventType, event.eventIntent)) {
    return undefined
  }
  const eventData = event.eventData
  if (
    event.eventIntent !== EventSubscription.Inputs
    || eventData === undefined
    || !("inputName" in eventData)
    || !("inputUuid" in eventData)
  ) {
    return undefined
  }

  const base = {
    sequence: event.sequence,
    eventIntent: event.eventIntent,
    category: "inputs",
    target: "input"
  } as const

  try {
    switch (event.eventType) {
      case "InputRemoved":
        if (Object.keys(eventData).length !== INPUT_REMOVED_EVENT_DATA_FIELD_COUNT) return undefined
        return decodeInputIdentityChangeSummary({
          ...base,
          eventType: "InputRemoved",
          outcome: "removed",
          inputName: eventData.inputName,
          inputUuid: eventData.inputUuid
        })
      case "InputNameChanged":
        if (
          !("oldInputName" in eventData)
          || Object.keys(eventData).length !== INPUT_NAME_CHANGED_EVENT_DATA_FIELD_COUNT
        ) {
          return undefined
        }
        return decodeInputIdentityChangeSummary({
          ...base,
          eventType: "InputNameChanged",
          outcome: "renamed",
          oldInputName: eventData.oldInputName,
          inputName: eventData.inputName,
          inputUuid: eventData.inputUuid
        })
      default:
        return undefined
    }
  } catch {
    return undefined
  }
}

const transitionWorkflowSummaryFor = (event: BufferedObsEvent): TransitionWorkflowEventSummary | undefined => {
  if (!eventMatchesOfficialSubscription(event.eventType, event.eventIntent)) {
    return undefined
  }
  const outcome = transitionWorkflowOutcomeForEventType(event.eventType)
  const target = transitionWorkflowTargetForEventType(event.eventType)
  const eventData = event.eventData
  if (
    event.eventIntent !== EventSubscription.Transitions
    || outcome === undefined
    || target === undefined
    || eventData === undefined
  ) {
    return undefined
  }

  const base = {
    sequence: event.sequence,
    eventIntent: event.eventIntent,
    category: "transitions",
    target
  } as const

  try {
    switch (event.eventType) {
      case "CurrentSceneTransitionChanged":
        if (!("transitionName" in eventData) || !("transitionUuid" in eventData)) return undefined
        return decodeTransitionWorkflowSummary({
          ...base,
          eventType: "CurrentSceneTransitionChanged",
          outcome: "changed",
          ...eventData
        })
      case "CurrentSceneTransitionDurationChanged":
        if (!("transitionDuration" in eventData)) return undefined
        return decodeTransitionWorkflowSummary({
          ...base,
          eventType: "CurrentSceneTransitionDurationChanged",
          outcome: "duration_changed",
          ...eventData
        })
      case "SceneTransitionStarted":
        if (!("transitionName" in eventData) || !("transitionUuid" in eventData)) return undefined
        return decodeTransitionWorkflowSummary({
          ...base,
          eventType: "SceneTransitionStarted",
          outcome: "started",
          ...eventData
        })
      case "SceneTransitionEnded":
        if (!("transitionName" in eventData) || !("transitionUuid" in eventData)) return undefined
        return decodeTransitionWorkflowSummary({
          ...base,
          eventType: "SceneTransitionEnded",
          outcome: "ended",
          ...eventData
        })
      case "SceneTransitionVideoEnded":
        if (!("transitionName" in eventData) || !("transitionUuid" in eventData)) return undefined
        return decodeTransitionWorkflowSummary({
          ...base,
          eventType: "SceneTransitionVideoEnded",
          outcome: "video_ended",
          ...eventData
        })
      /* v8 ignore next -- transition mappers reject unsupported transition events before this switch. */
      default:
        return undefined
    }
  } catch {
    return undefined
  }
}

const mediaInputWorkflowSummaryFor = (event: BufferedObsEvent): MediaInputWorkflowEventSummary | undefined => {
  if (!eventMatchesOfficialSubscription(event.eventType, event.eventIntent)) {
    return undefined
  }
  const outcome = mediaInputOutcomeForEventType(event.eventType)
  const eventData = event.eventData
  if (event.eventIntent !== EventSubscription.MediaInputs || outcome === undefined || eventData === undefined) {
    return undefined
  }
  if (!("inputName" in eventData) || !("inputUuid" in eventData)) {
    return undefined
  }

  const base = {
    sequence: event.sequence,
    eventIntent: event.eventIntent,
    category: "media_inputs",
    target: "media_input"
  } as const

  try {
    switch (event.eventType) {
      case "MediaInputPlaybackStarted":
        return decodeMediaInputWorkflowSummary({
          ...base,
          eventType: "MediaInputPlaybackStarted",
          outcome: "playback_started",
          ...eventData
        })
      case "MediaInputPlaybackEnded":
        return decodeMediaInputWorkflowSummary({
          ...base,
          eventType: "MediaInputPlaybackEnded",
          outcome: "playback_ended",
          ...eventData
        })
      case "MediaInputActionTriggered":
        if (!("mediaAction" in eventData)) return undefined
        return decodeMediaInputWorkflowSummary({
          ...base,
          eventType: "MediaInputActionTriggered",
          outcome: "action_triggered",
          ...eventData
        })
      /* v8 ignore next -- mediaInputOutcomeForEventType rejects unsupported media events before this switch. */
      default:
        return undefined
    }
  } catch {
    return undefined
  }
}

const sourceFilterSummaryFor = (event: BufferedObsEvent): SourceFilterChangeEventSummary | undefined => {
  if (!eventMatchesOfficialSubscription(event.eventType, event.eventIntent)) {
    return undefined
  }
  const eventData = event.eventData
  if (event.eventIntent !== EventSubscription.Filters || eventData === undefined) {
    return undefined
  }
  const base = {
    sequence: event.sequence,
    eventIntent: event.eventIntent,
    category: "filters",
    target: "source_filter"
  } as const

  try {
    switch (event.eventType) {
      case "SourceFilterCreated":
        if (
          !("sourceName" in eventData)
          || !("filterName" in eventData)
          || !("filterKind" in eventData)
          || !("filterIndex" in eventData)
        ) {
          return undefined
        }
        return decodeSourceFilterChangeSummary({
          ...base,
          eventType: "SourceFilterCreated",
          outcome: "created",
          sourceName: eventData.sourceName,
          filterName: eventData.filterName,
          filterKind: eventData.filterKind,
          filterIndex: eventData.filterIndex,
          rawSettingsOmitted: true,
          defaultSettingsOmitted: true
        })
      case "SourceFilterRemoved":
        if (!("sourceName" in eventData) || !("filterName" in eventData)) return undefined
        return decodeSourceFilterChangeSummary({
          ...base,
          eventType: "SourceFilterRemoved",
          outcome: "removed",
          sourceName: eventData.sourceName,
          filterName: eventData.filterName
        })
      case "SourceFilterNameChanged":
        if (!("sourceName" in eventData) || !("oldFilterName" in eventData) || !("filterName" in eventData)) {
          return undefined
        }
        return decodeSourceFilterChangeSummary({
          ...base,
          eventType: "SourceFilterNameChanged",
          outcome: "renamed",
          sourceName: eventData.sourceName,
          oldFilterName: eventData.oldFilterName,
          filterName: eventData.filterName
        })
      case "SourceFilterListReindexed":
        if (!("sourceName" in eventData) || !("filters" in eventData)) return undefined
        return decodeSourceFilterChangeSummary({
          ...base,
          eventType: "SourceFilterListReindexed",
          outcome: "reordered",
          sourceName: eventData.sourceName,
          filters: eventData.filters
        })
      case "SourceFilterEnableStateChanged":
        if (!("sourceName" in eventData) || !("filterName" in eventData) || !("filterEnabled" in eventData)) {
          return undefined
        }
        return decodeSourceFilterChangeSummary({
          ...base,
          eventType: "SourceFilterEnableStateChanged",
          outcome: eventData.filterEnabled ? "enabled" : "disabled",
          sourceName: eventData.sourceName,
          filterName: eventData.filterName,
          filterEnabled: eventData.filterEnabled
        })
      case "SourceFilterSettingsChanged":
        if (!("sourceName" in eventData) || !("filterName" in eventData)) return undefined
        return decodeSourceFilterChangeSummary({
          ...base,
          eventType: "SourceFilterSettingsChanged",
          outcome: "settings_changed",
          sourceName: eventData.sourceName,
          filterName: eventData.filterName,
          rawSettingsOmitted: true
        })
      /* v8 ignore next -- official filter event handling is exhausted above. */
      default:
        return undefined
    }
  } catch {
    return undefined
  }
}

const sceneGraphSummaryFor = (event: BufferedObsEvent): SceneGraphChangeEventSummary | undefined => {
  if (!eventMatchesOfficialSubscription(event.eventType, event.eventIntent)) {
    return undefined
  }
  const category = sceneGraphCategoryForEvent(event.eventType)
  const eventData = event.eventData
  if (category === undefined || eventData === undefined) {
    return undefined
  }
  const base = {
    sequence: event.sequence,
    eventIntent: event.eventIntent,
    category
  } as const

  switch (event.eventType) {
    case "SceneCreated":
      if (!("sceneName" in eventData) || !("sceneUuid" in eventData) || !("isGroup" in eventData)) return undefined
      return Schema.decodeUnknownSync(SceneGraphChangeEventSummary)({
        ...base,
        eventType: "SceneCreated",
        target: "scene",
        outcome: "created",
        sceneName: eventData.sceneName,
        sceneUuid: eventData.sceneUuid,
        isGroup: eventData.isGroup
      })
    case "SceneRemoved":
      if (!("sceneName" in eventData) || !("sceneUuid" in eventData) || !("isGroup" in eventData)) return undefined
      return Schema.decodeUnknownSync(SceneGraphChangeEventSummary)({
        ...base,
        eventType: "SceneRemoved",
        target: "scene",
        outcome: "removed",
        sceneName: eventData.sceneName,
        sceneUuid: eventData.sceneUuid,
        isGroup: eventData.isGroup
      })
    case "SceneNameChanged":
      if (!("sceneName" in eventData) || !("sceneUuid" in eventData) || !("oldSceneName" in eventData)) {
        return undefined
      }
      return Schema.decodeUnknownSync(SceneGraphChangeEventSummary)({
        ...base,
        eventType: "SceneNameChanged",
        target: "scene",
        outcome: "renamed",
        oldSceneName: eventData.oldSceneName,
        sceneName: eventData.sceneName,
        sceneUuid: eventData.sceneUuid
      })
    case "CurrentProgramSceneChanged":
      if (!("sceneName" in eventData) || !("sceneUuid" in eventData)) return undefined
      return Schema.decodeUnknownSync(SceneGraphChangeEventSummary)({
        ...base,
        eventType: "CurrentProgramSceneChanged",
        target: "current_program_scene",
        outcome: "changed",
        sceneName: eventData.sceneName,
        sceneUuid: eventData.sceneUuid
      })
    case "CurrentPreviewSceneChanged":
      if (!("sceneName" in eventData) || !("sceneUuid" in eventData)) return undefined
      return Schema.decodeUnknownSync(SceneGraphChangeEventSummary)({
        ...base,
        eventType: "CurrentPreviewSceneChanged",
        target: "current_preview_scene",
        outcome: "changed",
        sceneName: eventData.sceneName,
        sceneUuid: eventData.sceneUuid
      })
    case "SceneItemCreated":
      if (
        !("sceneName" in eventData)
        || !("sceneUuid" in eventData)
        || !("sourceName" in eventData)
        || !("sourceUuid" in eventData)
        || !("sceneItemId" in eventData)
        || !("sceneItemIndex" in eventData)
      ) {
        return undefined
      }
      return Schema.decodeUnknownSync(SceneGraphChangeEventSummary)({
        ...base,
        eventType: "SceneItemCreated",
        target: "scene_item",
        outcome: "created",
        sceneName: eventData.sceneName,
        sceneUuid: eventData.sceneUuid,
        sourceName: eventData.sourceName,
        sourceUuid: eventData.sourceUuid,
        sceneItemId: eventData.sceneItemId,
        sceneItemIndex: eventData.sceneItemIndex
      })
    case "SceneItemRemoved":
      if (
        !("sceneName" in eventData)
        || !("sceneUuid" in eventData)
        || !("sourceName" in eventData)
        || !("sourceUuid" in eventData)
        || !("sceneItemId" in eventData)
      ) {
        return undefined
      }
      return Schema.decodeUnknownSync(SceneGraphChangeEventSummary)({
        ...base,
        eventType: "SceneItemRemoved",
        target: "scene_item",
        outcome: "removed",
        sceneName: eventData.sceneName,
        sceneUuid: eventData.sceneUuid,
        sourceName: eventData.sourceName,
        sourceUuid: eventData.sourceUuid,
        sceneItemId: eventData.sceneItemId
      })
    case "SceneItemListReindexed":
      if (!("sceneName" in eventData) || !("sceneUuid" in eventData) || !("sceneItems" in eventData)) {
        return undefined
      }
      return Schema.decodeUnknownSync(SceneGraphChangeEventSummary)({
        ...base,
        eventType: "SceneItemListReindexed",
        target: "scene_item",
        outcome: "reordered",
        sceneName: eventData.sceneName,
        sceneUuid: eventData.sceneUuid,
        sceneItems: eventData.sceneItems
      })
    case "SceneItemEnableStateChanged":
      if (
        !("sceneName" in eventData)
        || !("sceneUuid" in eventData)
        || !("sceneItemId" in eventData)
        || !("sceneItemEnabled" in eventData)
      ) {
        return undefined
      }
      return Schema.decodeUnknownSync(SceneGraphChangeEventSummary)({
        ...base,
        eventType: "SceneItemEnableStateChanged",
        target: "scene_item",
        outcome: eventData.sceneItemEnabled ? "enabled" : "disabled",
        sceneName: eventData.sceneName,
        sceneUuid: eventData.sceneUuid,
        sceneItemId: eventData.sceneItemId,
        sceneItemEnabled: eventData.sceneItemEnabled
      })
    case "SceneItemLockStateChanged":
      if (
        !("sceneName" in eventData)
        || !("sceneUuid" in eventData)
        || !("sceneItemId" in eventData)
        || !("sceneItemLocked" in eventData)
      ) {
        return undefined
      }
      return Schema.decodeUnknownSync(SceneGraphChangeEventSummary)({
        ...base,
        eventType: "SceneItemLockStateChanged",
        target: "scene_item",
        outcome: eventData.sceneItemLocked ? "locked" : "unlocked",
        sceneName: eventData.sceneName,
        sceneUuid: eventData.sceneUuid,
        sceneItemId: eventData.sceneItemId,
        sceneItemLocked: eventData.sceneItemLocked
      })
    /* v8 ignore next -- sceneGraphCategoryForEvent rejects unsupported scene graph events before this switch. */
    default:
      return undefined
  }
}

/* v8 ignore next 20 -- private selector branches are exercised through typed workflow matchers. */
const summaryStringFieldValue = (
  summary: SceneGraphChangeEventSummary,
  field: "sceneName" | "sceneUuid" | "oldSceneName" | "sourceName" | "sourceUuid"
): string | undefined => {
  switch (field) {
    case "sceneName":
      return summary.sceneName
    case "sceneUuid":
      return summary.sceneUuid
    case "oldSceneName":
      return summary.eventType === "SceneNameChanged" ? summary.oldSceneName : undefined
    case "sourceName":
      return summary.eventType === "SceneItemCreated" || summary.eventType === "SceneItemRemoved"
        ? summary.sourceName
        : undefined
    case "sourceUuid":
      return summary.eventType === "SceneItemCreated" || summary.eventType === "SceneItemRemoved"
        ? summary.sourceUuid
        : undefined
  }
}

const summaryStringFieldMatches = (
  summary: SceneGraphChangeEventSummary,
  field: "sceneName" | "sceneUuid" | "oldSceneName" | "sourceName" | "sourceUuid",
  expected: string | undefined
): boolean => {
  if (expected === undefined) {
    return true
  }
  return summaryStringFieldValue(summary, field) === expected
}

const sceneItemIdMatches = (
  summary: SceneGraphChangeEventSummary,
  sceneItemId: number | undefined
): boolean => {
  if (sceneItemId === undefined) {
    return true
  }
  if (summary.eventType === "SceneItemListReindexed") {
    return summary.sceneItems.some((sceneItem) => sceneItem.sceneItemId === sceneItemId)
  }
  switch (summary.eventType) {
    case "SceneItemCreated":
    case "SceneItemRemoved":
    case "SceneItemEnableStateChanged":
    case "SceneItemLockStateChanged":
      return summary.sceneItemId === sceneItemId
    default:
      return false
  }
}

const sceneGraphMatches = (
  target: SceneGraphChangeTarget,
  outcome: SceneGraphChangeOutcome,
  input: ConfirmObsSceneGraphChangeInput,
  event: BufferedObsEvent
): boolean => {
  const summary = sceneGraphSummaryFor(event)
  return summary?.target === target
    && summary.outcome === outcome
    && summaryStringFieldMatches(summary, "sceneName", input.sceneName)
    && summaryStringFieldMatches(summary, "sceneUuid", input.sceneUuid)
    && summaryStringFieldMatches(summary, "oldSceneName", "oldSceneName" in input ? input.oldSceneName : undefined)
    && summaryStringFieldMatches(summary, "sourceName", "sourceName" in input ? input.sourceName : undefined)
    && summaryStringFieldMatches(summary, "sourceUuid", "sourceUuid" in input ? input.sourceUuid : undefined)
    && sceneItemIdMatches(summary, "sceneItemId" in input ? input.sceneItemId : undefined)
}

const outputLifecycleMatches = (
  target: OutputLifecycleTarget,
  outcome: OutputLifecycleOutcome,
  event: BufferedObsEvent
): boolean => {
  const summary = outputLifecycleSummaryFor(event)
  return summary?.target === target && summary.outcome === outcome
}

/* v8 ignore next 14 -- private selector branches are exercised through typed workflow matchers. */
const sourceFilterStringFieldValue = (
  summary: SourceFilterChangeEventSummary,
  field: "sourceName" | "filterName" | "oldFilterName" | "filterKind"
): string | undefined => {
  switch (field) {
    case "sourceName":
      return summary.sourceName
    case "filterName":
      return summary.eventType === "SourceFilterListReindexed" ? undefined : summary.filterName
    case "oldFilterName":
      return summary.eventType === "SourceFilterNameChanged" ? summary.oldFilterName : undefined
    case "filterKind":
      return summary.eventType === "SourceFilterCreated" ? summary.filterKind : undefined
  }
}

const sourceFilterStringFieldMatches = (
  summary: SourceFilterChangeEventSummary,
  field: "sourceName" | "filterName" | "oldFilterName" | "filterKind",
  expected: string | undefined
): boolean => {
  if (expected === undefined) {
    return true
  }
  return sourceFilterStringFieldValue(summary, field) === expected
}

/* v8 ignore next 15 -- private selector branches are exercised through typed workflow matchers. */
const sourceFilterIndexMatches = (
  summary: SourceFilterChangeEventSummary,
  filterIndex: number | undefined
): boolean => {
  if (filterIndex === undefined) {
    return true
  }
  if (summary.eventType === "SourceFilterCreated") {
    return summary.filterIndex === filterIndex
  }
  if (summary.eventType === "SourceFilterListReindexed") {
    return summary.filters.some((filter) => filter.filterIndex === filterIndex)
  }
  return false
}

/* v8 ignore next 15 -- private selector branches are exercised through typed workflow matchers. */
const sourceFilterReindexedItemMatches = (
  summary: SourceFilterChangeEventSummary,
  filterName: string | undefined,
  filterIndex: number | undefined
): boolean => {
  if (summary.eventType !== "SourceFilterListReindexed") {
    return true
  }
  if (filterName === undefined && filterIndex === undefined) {
    return true
  }
  return summary.filters.some((filter) =>
    (filterName === undefined || filter.filterName === filterName)
    && (filterIndex === undefined || filter.filterIndex === filterIndex)
  )
}

const sourceFilterMatches = (
  outcome: SourceFilterChangeOutcome,
  input: ConfirmObsSourceFilterChangeInput,
  event: BufferedObsEvent
): boolean => {
  const summary = sourceFilterSummaryFor(event)
  const reindexedFilterName = input.outcome === "reordered" ? input.filterName : undefined
  const reindexedFilterIndex = input.outcome === "reordered" && "filterIndex" in input
    ? input.filterIndex
    : undefined
  return summary?.target === "source_filter"
    && summary.outcome === outcome
    && sourceFilterStringFieldMatches(summary, "sourceName", input.sourceName)
    && sourceFilterStringFieldMatches(
      summary,
      "filterName",
      input.outcome === "reordered" ? undefined : input.filterName
    )
    && sourceFilterStringFieldMatches(
      summary,
      "oldFilterName",
      "oldFilterName" in input ? input.oldFilterName : undefined
    )
    && sourceFilterStringFieldMatches(summary, "filterKind", "filterKind" in input ? input.filterKind : undefined)
    && sourceFilterIndexMatches(
      summary,
      input.outcome === "reordered" ? undefined : (
        "filterIndex" in input ? input.filterIndex : undefined
      )
    )
    && sourceFilterReindexedItemMatches(summary, reindexedFilterName, reindexedFilterIndex)
}

const mediaInputWorkflowMatches = (
  outcome: MediaInputWorkflowOutcome,
  input: ConfirmObsMediaInputWorkflowInput,
  event: BufferedObsEvent
): boolean => {
  const summary = mediaInputWorkflowSummaryFor(event)
  return summary?.target === "media_input"
    && summary.outcome === outcome
    && (input.inputName === undefined || summary.inputName === input.inputName)
    && (input.inputUuid === undefined || summary.inputUuid === input.inputUuid)
    && (
      outcome !== "action_triggered"
      || (
        summary.eventType === "MediaInputActionTriggered"
        && "mediaAction" in input
        && summary.mediaAction === input.mediaAction
      )
    )
}

const transitionWorkflowMatches = (
  target: TransitionWorkflowTarget,
  outcome: TransitionWorkflowOutcome,
  input: ConfirmObsTransitionWorkflowInput,
  event: BufferedObsEvent
): boolean => {
  const summary = transitionWorkflowSummaryFor(event)
  return summary?.target === target
    && summary.outcome === outcome
    && (
      outcome === "duration_changed"
        ? summary.eventType === "CurrentSceneTransitionDurationChanged"
          && (!("transitionDuration" in input) || summary.transitionDuration === input.transitionDuration)
        : "transitionName" in summary
          && (
            !("transitionName" in input)
            || input.transitionName === undefined
            || summary.transitionName === input.transitionName
          )
          && (
            !("transitionUuid" in input)
            || input.transitionUuid === undefined
            || summary.transitionUuid === input.transitionUuid
          )
    )
}

/* v8 ignore next 22 -- private track comparison branches are covered by workflow-level confirmation tests. */
const inputAudioTracksMatch = (
  actual: InputAudioChangeEventSummary,
  expected: ConfirmObsInputAudioChangeInput
): boolean => {
  if (expected.outcome !== "tracks_changed" || !("inputAudioTracks" in expected)) {
    return true
  }
  const expectedTracks = expected.inputAudioTracks
  if (expectedTracks === undefined) {
    return true
  }
  if (actual.eventType !== "InputAudioTracksChanged") {
    return false
  }
  return actual.inputAudioTracks.track1 === expectedTracks.track1
    && actual.inputAudioTracks.track2 === expectedTracks.track2
    && actual.inputAudioTracks.track3 === expectedTracks.track3
    && actual.inputAudioTracks.track4 === expectedTracks.track4
    && actual.inputAudioTracks.track5 === expectedTracks.track5
    && actual.inputAudioTracks.track6 === expectedTracks.track6
}

const inputAudioValueFiltersMatch = (
  summary: InputAudioChangeEventSummary,
  input: ConfirmObsInputAudioChangeInput
): boolean => {
  switch (input.outcome) {
    case "muted":
    case "unmuted":
      return true
    case "volume_changed":
      return summary.eventType === "InputVolumeChanged"
        && (!("inputVolumeMul" in input) || summary.inputVolumeMul === input.inputVolumeMul)
        && (!("inputVolumeDb" in input) || summary.inputVolumeDb === input.inputVolumeDb)
    case "balance_changed":
      return summary.eventType === "InputAudioBalanceChanged"
        && (!("inputAudioBalance" in input) || summary.inputAudioBalance === input.inputAudioBalance)
    case "sync_offset_changed":
      return summary.eventType === "InputAudioSyncOffsetChanged"
        && (!("inputAudioSyncOffset" in input) || summary.inputAudioSyncOffset === input.inputAudioSyncOffset)
    case "tracks_changed":
      return inputAudioTracksMatch(summary, input)
    case "monitor_type_changed":
      return summary.eventType === "InputAudioMonitorTypeChanged"
        && (!("monitorType" in input) || summary.monitorType === input.monitorType)
  }
}

const inputAudioChangeMatches = (
  outcome: InputAudioChangeOutcome,
  input: ConfirmObsInputAudioChangeInput,
  event: BufferedObsEvent
): boolean => {
  const summary = inputAudioChangeSummaryFor(event)
  return summary?.target === "input_audio"
    && summary.outcome === outcome
    && (input.inputName === undefined || summary.inputName === input.inputName)
    && (input.inputUuid === undefined || summary.inputUuid === input.inputUuid)
    && inputAudioValueFiltersMatch(summary, input)
}

const inputIdentityChangeMatches = (
  outcome: InputIdentityChangeOutcome,
  input: ConfirmObsInputIdentityChangeInput,
  event: BufferedObsEvent
): boolean => {
  const summary = inputIdentityChangeSummaryFor(event)
  return summary?.target === "input"
    && summary.outcome === outcome
    && (input.inputName === undefined || summary.inputName === input.inputName)
    && (input.inputUuid === undefined || summary.inputUuid === input.inputUuid)
    && (
      input.outcome !== "renamed"
      || input.oldInputName === undefined
      || (
        summary.eventType === "InputNameChanged"
        && summary.oldInputName === input.oldInputName
      )
    )
}

/* v8 ignore next 6 -- private list comparison branches are covered by workflow-level confirmation tests. */
const listsMatch = (actual: ReadonlyArray<string>, expected: ReadonlyArray<string> | undefined): boolean => {
  if (expected === undefined) {
    return true
  }
  return actual.length === expected.length
    && actual.every((value, index) => value === expected[index])
}

const configWorkflowMatches = (
  target: ConfigWorkflowTarget,
  outcome: ConfigWorkflowOutcome,
  input: ConfirmObsConfigWorkflowInput,
  event: BufferedObsEvent
): boolean => {
  const summary = configWorkflowSummaryFor(event)
  if (summary?.target !== target || summary.outcome !== outcome) {
    return false
  }
  switch (summary.eventType) {
    case "CurrentProfileChanging":
    case "CurrentProfileChanged":
      return !("profileName" in input)
        || input.profileName === undefined
        || summary.profileName === input.profileName
    case "ProfileListChanged":
      return "profiles" in input && listsMatch(summary.profiles, input.profiles)
    case "CurrentSceneCollectionChanging":
    case "CurrentSceneCollectionChanged":
      return !("sceneCollectionName" in input)
        || input.sceneCollectionName === undefined
        || summary.sceneCollectionName === input.sceneCollectionName
    case "SceneCollectionListChanged":
      return "sceneCollections" in input && listsMatch(summary.sceneCollections, input.sceneCollections)
  }
}

const canvasInventoryChangeMatches = (
  outcome: CanvasInventoryChangeOutcome,
  input: ConfirmObsCanvasInventoryChangeInput,
  event: BufferedObsEvent
): boolean => {
  const summary = canvasInventoryChangeSummaryFor(event)
  return summary?.target === "canvas"
    && summary.outcome === outcome
    && (input.canvasName === undefined || summary.canvasName === input.canvasName)
    && (input.canvasUuid === undefined || summary.canvasUuid === input.canvasUuid)
    && (
      input.outcome !== "renamed"
      || input.oldCanvasName === undefined
      || (
        summary.eventType === "CanvasNameChanged"
        && summary.oldCanvasName === input.oldCanvasName
      )
    )
}

const studioModeStateChangeMatches = (
  outcome: StudioModeStateChangeOutcome,
  event: BufferedObsEvent
): boolean => {
  const summary = studioModeStateChangeSummaryFor(event)
  return summary?.target === "studio_mode" && summary.outcome === outcome
}

const isSupportedOutputLifecycleOutcome = (
  target: OutputLifecycleTarget,
  outcome: OutputLifecycleOutcome
): boolean => {
  switch (target) {
    case "stream":
    case "virtualcam":
      return outcome === "started" || outcome === "stopped"
    case "record":
      return outcome === "started"
        || outcome === "stopped"
        || outcome === "paused"
        || outcome === "resumed"
        || outcome === "file_changed"
    case "replay_buffer":
      return outcome === "started" || outcome === "stopped" || outcome === "replay_saved"
  }
}

export const getRecentObsEvents = (
  client: ObsClient,
  input: GetRecentObsEventsInput
): GetRecentObsEventsOutput => {
  const decodedInput = Schema.decodeUnknownSync(GetRecentObsEventsInput)(input)
  const snapshot = client.getBufferedEvents({ sinceSequence: decodedInput.sinceSequence })
  const filtered = snapshot.events.filter(
    (event) => isPublicSafeEvent(event) && matchesCategories(event, decodedInput.categories)
  )
  const ordered = decodedInput.order === "newest_first" ? [...filtered].reverse() : filtered
  const events = ordered.slice(0, decodedInput.limit).map((event) => ({
    sequence: event.sequence,
    eventType: event.eventType,
    eventIntent: event.eventIntent,
    category: categoryForIntent(event.eventIntent),
    ...withDefinedFields({ eventData: event.eventData })
  }))
  return Schema.decodeUnknownSync(GetRecentObsEventsOutput)({
    capacity: snapshot.capacity,
    droppedEvents: snapshot.droppedEvents,
    oldestSequence: snapshot.oldestSequence,
    latestSequence: snapshot.latestSequence,
    missedEvents: snapshot.missedEvents,
    returnedEvents: events.length,
    order: decodedInput.order,
    events
  })
}

export const confirmObsOutputLifecycle = async (
  client: ObsClient,
  input: ConfirmObsOutputLifecycleInput,
  options: { readonly maxTimeoutMs: number }
): Promise<ConfirmObsOutputLifecycleOutput> => {
  const decodedInput = Schema.decodeUnknownSync(ConfirmObsOutputLifecycleInput)(input)
  const timeoutMs = Math.min(decodedInput.timeoutMs ?? options.maxTimeoutMs, options.maxTimeoutMs)
  const waitResult = await client.waitForBufferedEvent(
    (event) => outputLifecycleMatches(decodedInput.target, decodedInput.outcome, event),
    {
      afterSequence: decodedInput.afterSequence,
      timeoutMs
    }
  )
  const event = waitResult.event === undefined
    ? undefined
    : outputLifecycleSummaryFor(waitResult.event)

  return Schema.decodeUnknownSync(ConfirmObsOutputLifecycleOutput)({
    confirmed: event !== undefined,
    timedOut: waitResult.timedOut,
    baselineSequence: waitResult.baselineSequence,
    latestSequence: waitResult.snapshot.latestSequence,
    missedEvents: waitResult.snapshot.missedEvents,
    ...withDefinedFields({ event })
  })
}

export const confirmObsSceneGraphChange = async (
  client: ObsClient,
  input: ConfirmObsSceneGraphChangeInput,
  options: { readonly maxTimeoutMs: number }
): Promise<ConfirmObsSceneGraphChangeOutput> => {
  const decodedInput = Schema.decodeUnknownSync(
    ConfirmObsSceneGraphChangeInput,
    { onExcessProperty: "error" }
  )(input)
  const timeoutMs = Math.min(decodedInput.timeoutMs ?? options.maxTimeoutMs, options.maxTimeoutMs)
  const waitResult = await client.waitForBufferedEvent(
    (event) => sceneGraphMatches(decodedInput.target, decodedInput.outcome, decodedInput, event),
    {
      afterSequence: decodedInput.afterSequence,
      timeoutMs
    }
  )
  const event = waitResult.event === undefined
    ? undefined
    : sceneGraphSummaryFor(waitResult.event)

  return Schema.decodeUnknownSync(ConfirmObsSceneGraphChangeOutput)({
    confirmed: event !== undefined,
    timedOut: waitResult.timedOut,
    baselineSequence: waitResult.baselineSequence,
    latestSequence: waitResult.snapshot.latestSequence,
    missedEvents: waitResult.snapshot.missedEvents,
    ...withDefinedFields({ event })
  })
}

export const confirmObsSourceFilterChange = async (
  client: ObsClient,
  input: ConfirmObsSourceFilterChangeInput,
  options: { readonly maxTimeoutMs: number }
): Promise<ConfirmObsSourceFilterChangeOutput> => {
  const decodedInput = Schema.decodeUnknownSync(
    ConfirmObsSourceFilterChangeInput,
    { onExcessProperty: "error" }
  )(input)
  const timeoutMs = Math.min(decodedInput.timeoutMs ?? options.maxTimeoutMs, options.maxTimeoutMs)
  const waitResult = await client.waitForBufferedEvent(
    (event) => sourceFilterMatches(decodedInput.outcome, decodedInput, event),
    {
      afterSequence: decodedInput.afterSequence,
      timeoutMs
    }
  )
  const event = waitResult.event === undefined
    ? undefined
    : sourceFilterSummaryFor(waitResult.event)

  return Schema.decodeUnknownSync(ConfirmObsSourceFilterChangeOutput)({
    confirmed: event !== undefined,
    timedOut: waitResult.timedOut,
    baselineSequence: waitResult.baselineSequence,
    latestSequence: waitResult.snapshot.latestSequence,
    missedEvents: waitResult.snapshot.missedEvents,
    ...withDefinedFields({ event })
  })
}

export const confirmObsMediaInputWorkflow = async (
  client: ObsClient,
  input: ConfirmObsMediaInputWorkflowInput,
  options: { readonly maxTimeoutMs: number }
): Promise<ConfirmObsMediaInputWorkflowOutput> => {
  const decodedInput = Schema.decodeUnknownSync(
    ConfirmObsMediaInputWorkflowInput,
    { onExcessProperty: "error" }
  )(input)
  const timeoutMs = Math.min(decodedInput.timeoutMs ?? options.maxTimeoutMs, options.maxTimeoutMs)
  const waitResult = await client.waitForBufferedEvent(
    (event) => mediaInputWorkflowMatches(decodedInput.outcome, decodedInput, event),
    {
      afterSequence: decodedInput.afterSequence,
      timeoutMs
    }
  )
  const event = waitResult.event === undefined
    ? undefined
    : mediaInputWorkflowSummaryFor(waitResult.event)

  return Schema.decodeUnknownSync(ConfirmObsMediaInputWorkflowOutput)({
    confirmed: event !== undefined,
    timedOut: waitResult.timedOut,
    baselineSequence: waitResult.baselineSequence,
    latestSequence: waitResult.snapshot.latestSequence,
    missedEvents: waitResult.snapshot.missedEvents,
    ...withDefinedFields({ event })
  })
}

export const confirmObsTransitionWorkflow = async (
  client: ObsClient,
  input: ConfirmObsTransitionWorkflowInput,
  options: { readonly maxTimeoutMs: number }
): Promise<ConfirmObsTransitionWorkflowOutput> => {
  const decodedInput = Schema.decodeUnknownSync(
    ConfirmObsTransitionWorkflowInput,
    { onExcessProperty: "error" }
  )(input)
  const timeoutMs = Math.min(decodedInput.timeoutMs ?? options.maxTimeoutMs, options.maxTimeoutMs)
  const waitResult = await client.waitForBufferedEvent(
    (event) => transitionWorkflowMatches(decodedInput.target, decodedInput.outcome, decodedInput, event),
    {
      afterSequence: decodedInput.afterSequence,
      timeoutMs
    }
  )
  const event = waitResult.event === undefined
    ? undefined
    : transitionWorkflowSummaryFor(waitResult.event)

  return Schema.decodeUnknownSync(ConfirmObsTransitionWorkflowOutput)({
    confirmed: event !== undefined,
    timedOut: waitResult.timedOut,
    baselineSequence: waitResult.baselineSequence,
    latestSequence: waitResult.snapshot.latestSequence,
    missedEvents: waitResult.snapshot.missedEvents,
    ...withDefinedFields({ event })
  })
}

export const confirmObsInputAudioChange = async (
  client: ObsClient,
  input: ConfirmObsInputAudioChangeInput,
  options: { readonly maxTimeoutMs: number }
): Promise<ConfirmObsInputAudioChangeOutput> => {
  const decodedInput = Schema.decodeUnknownSync(
    ConfirmObsInputAudioChangeInput,
    { onExcessProperty: "error" }
  )(input)
  const timeoutMs = Math.min(decodedInput.timeoutMs ?? options.maxTimeoutMs, options.maxTimeoutMs)
  const waitResult = await client.waitForBufferedEvent(
    (event) => inputAudioChangeMatches(decodedInput.outcome, decodedInput, event),
    {
      afterSequence: decodedInput.afterSequence,
      timeoutMs
    }
  )
  const event = waitResult.event === undefined
    ? undefined
    : inputAudioChangeSummaryFor(waitResult.event)

  return Schema.decodeUnknownSync(ConfirmObsInputAudioChangeOutput)({
    confirmed: event !== undefined,
    timedOut: waitResult.timedOut,
    baselineSequence: waitResult.baselineSequence,
    latestSequence: waitResult.snapshot.latestSequence,
    missedEvents: waitResult.snapshot.missedEvents,
    ...withDefinedFields({ event })
  })
}

export const confirmObsInputIdentityChange = async (
  client: ObsClient,
  input: ConfirmObsInputIdentityChangeInput,
  options: { readonly maxTimeoutMs: number }
): Promise<ConfirmObsInputIdentityChangeOutput> => {
  const decodedInput = Schema.decodeUnknownSync(
    ConfirmObsInputIdentityChangeInput,
    { onExcessProperty: "error" }
  )(input)
  const timeoutMs = Math.min(decodedInput.timeoutMs ?? options.maxTimeoutMs, options.maxTimeoutMs)
  const waitResult = await client.waitForBufferedEvent(
    (event) => inputIdentityChangeMatches(decodedInput.outcome, decodedInput, event),
    {
      afterSequence: decodedInput.afterSequence,
      timeoutMs
    }
  )
  const event = waitResult.event === undefined
    ? undefined
    : inputIdentityChangeSummaryFor(waitResult.event)

  return Schema.decodeUnknownSync(ConfirmObsInputIdentityChangeOutput)({
    confirmed: event !== undefined,
    timedOut: waitResult.timedOut,
    baselineSequence: waitResult.baselineSequence,
    latestSequence: waitResult.snapshot.latestSequence,
    missedEvents: waitResult.snapshot.missedEvents,
    ...withDefinedFields({ event })
  })
}

export const confirmObsCanvasInventoryChange = async (
  client: ObsClient,
  input: ConfirmObsCanvasInventoryChangeInput,
  options: { readonly maxTimeoutMs: number }
): Promise<ConfirmObsCanvasInventoryChangeOutput> => {
  const decodedInput = Schema.decodeUnknownSync(
    ConfirmObsCanvasInventoryChangeInput,
    { onExcessProperty: "error" }
  )(input)
  const timeoutMs = Math.min(decodedInput.timeoutMs ?? options.maxTimeoutMs, options.maxTimeoutMs)
  const waitResult = await client.waitForBufferedEvent(
    (event) => canvasInventoryChangeMatches(decodedInput.outcome, decodedInput, event),
    {
      afterSequence: decodedInput.afterSequence,
      timeoutMs
    }
  )
  const event = waitResult.event === undefined
    ? undefined
    : canvasInventoryChangeSummaryFor(waitResult.event)

  return Schema.decodeUnknownSync(ConfirmObsCanvasInventoryChangeOutput)({
    confirmed: event !== undefined,
    timedOut: waitResult.timedOut,
    baselineSequence: waitResult.baselineSequence,
    latestSequence: waitResult.snapshot.latestSequence,
    missedEvents: waitResult.snapshot.missedEvents,
    ...withDefinedFields({ event })
  })
}

export const confirmObsStudioModeStateChange = async (
  client: ObsClient,
  input: ConfirmObsStudioModeStateChangeInput,
  options: { readonly maxTimeoutMs: number }
): Promise<ConfirmObsStudioModeStateChangeOutput> => {
  const decodedInput = Schema.decodeUnknownSync(
    ConfirmObsStudioModeStateChangeInput,
    { onExcessProperty: "error" }
  )(input)
  const timeoutMs = Math.min(decodedInput.timeoutMs ?? options.maxTimeoutMs, options.maxTimeoutMs)
  const waitResult = await client.waitForBufferedEvent(
    (event) => studioModeStateChangeMatches(decodedInput.outcome, event),
    {
      afterSequence: decodedInput.afterSequence,
      timeoutMs
    }
  )
  const event = waitResult.event === undefined
    ? undefined
    : studioModeStateChangeSummaryFor(waitResult.event)

  return Schema.decodeUnknownSync(ConfirmObsStudioModeStateChangeOutput)({
    confirmed: event !== undefined,
    timedOut: waitResult.timedOut,
    baselineSequence: waitResult.baselineSequence,
    latestSequence: waitResult.snapshot.latestSequence,
    missedEvents: waitResult.snapshot.missedEvents,
    ...withDefinedFields({ event })
  })
}

export const confirmObsConfigWorkflow = async (
  client: ObsClient,
  input: ConfirmObsConfigWorkflowInput,
  options: { readonly maxTimeoutMs: number }
): Promise<ConfirmObsConfigWorkflowOutput> => {
  const decodedInput = Schema.decodeUnknownSync(
    ConfirmObsConfigWorkflowInput,
    { onExcessProperty: "error" }
  )(input)
  const timeoutMs = Math.min(decodedInput.timeoutMs ?? options.maxTimeoutMs, options.maxTimeoutMs)
  const waitResult = await client.waitForBufferedEvent(
    (event) => configWorkflowMatches(decodedInput.target, decodedInput.outcome, decodedInput, event),
    {
      afterSequence: decodedInput.afterSequence,
      timeoutMs
    }
  )
  const event = waitResult.event === undefined
    ? undefined
    : configWorkflowSummaryFor(waitResult.event)

  return Schema.decodeUnknownSync(ConfirmObsConfigWorkflowOutput)({
    confirmed: event !== undefined,
    timedOut: waitResult.timedOut,
    baselineSequence: waitResult.baselineSequence,
    latestSequence: waitResult.snapshot.latestSequence,
    missedEvents: waitResult.snapshot.missedEvents,
    ...withDefinedFields({ event })
  })
}
