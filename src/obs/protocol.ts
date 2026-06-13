import { Schema } from "effect"

import { UnknownRecord } from "../domain/schemas/shared.js"

const OP_HELLO = 0
export const OP_IDENTIFY = 1
export const OP_IDENTIFIED = 2
export const OP_EVENT = 5
export const OP_REQUEST = 6
export const OP_REQUEST_RESPONSE = 7

export const EventSubscription = {
  None: 0,
  General: 1 << 0,
  Config: 1 << 1,
  Scenes: 1 << 2,
  Inputs: 1 << 3,
  Transitions: 1 << 4,
  Filters: 1 << 5,
  Outputs: 1 << 6,
  SceneItems: 1 << 7,
  MediaInputs: 1 << 8,
  Vendors: 1 << 9,
  Ui: 1 << 10,
  Canvases: 1 << 11,
  InputVolumeMeters: 1 << 16,
  InputActiveStateChanged: 1 << 17,
  InputShowStateChanged: 1 << 18,
  SceneItemTransformChanged: 1 << 19
}

export const HIGH_VOLUME_EVENT_SUBSCRIPTIONS = [
  "InputVolumeMeters",
  "InputActiveStateChanged",
  "InputShowStateChanged",
  "SceneItemTransformChanged"
] as const

const EVENT_SUBSCRIPTION_ALL_MASK = EventSubscription.General
  | EventSubscription.Config
  | EventSubscription.Scenes
  | EventSubscription.Inputs
  | EventSubscription.Transitions
  | EventSubscription.Filters
  | EventSubscription.Outputs
  | EventSubscription.SceneItems
  | EventSubscription.MediaInputs
  | EventSubscription.Vendors
  | EventSubscription.Ui
  | EventSubscription.Canvases

export const SAFE_EVENT_SUBSCRIPTION_MASK = EVENT_SUBSCRIPTION_ALL_MASK & ~EventSubscription.Vendors

const UNSAFE_SAFE_ALL_EVENT_TYPES = new Set<string>([
  ...HIGH_VOLUME_EVENT_SUBSCRIPTIONS,
  "VendorEvent",
  "CustomEvent"
])

const OFFICIAL_EVENT_SUBSCRIPTIONS = new Map<string, number>([
  ["CanvasCreated", EventSubscription.Canvases],
  ["CanvasRemoved", EventSubscription.Canvases],
  ["CanvasNameChanged", EventSubscription.Canvases],
  ["CurrentSceneCollectionChanging", EventSubscription.Config],
  ["CurrentSceneCollectionChanged", EventSubscription.Config],
  ["SceneCollectionListChanged", EventSubscription.Config],
  ["CurrentProfileChanging", EventSubscription.Config],
  ["CurrentProfileChanged", EventSubscription.Config],
  ["ProfileListChanged", EventSubscription.Config],
  ["SourceFilterListReindexed", EventSubscription.Filters],
  ["SourceFilterCreated", EventSubscription.Filters],
  ["SourceFilterRemoved", EventSubscription.Filters],
  ["SourceFilterNameChanged", EventSubscription.Filters],
  ["SourceFilterSettingsChanged", EventSubscription.Filters],
  ["SourceFilterEnableStateChanged", EventSubscription.Filters],
  ["ExitStarted", EventSubscription.General],
  ["VendorEvent", EventSubscription.Vendors],
  ["CustomEvent", EventSubscription.General],
  ["InputCreated", EventSubscription.Inputs],
  ["InputRemoved", EventSubscription.Inputs],
  ["InputNameChanged", EventSubscription.Inputs],
  ["InputSettingsChanged", EventSubscription.Inputs],
  ["InputActiveStateChanged", EventSubscription.InputActiveStateChanged],
  ["InputShowStateChanged", EventSubscription.InputShowStateChanged],
  ["InputMuteStateChanged", EventSubscription.Inputs],
  ["InputVolumeChanged", EventSubscription.Inputs],
  ["InputAudioBalanceChanged", EventSubscription.Inputs],
  ["InputAudioSyncOffsetChanged", EventSubscription.Inputs],
  ["InputAudioTracksChanged", EventSubscription.Inputs],
  ["InputAudioMonitorTypeChanged", EventSubscription.Inputs],
  ["InputVolumeMeters", EventSubscription.InputVolumeMeters],
  ["MediaInputPlaybackStarted", EventSubscription.MediaInputs],
  ["MediaInputPlaybackEnded", EventSubscription.MediaInputs],
  ["MediaInputActionTriggered", EventSubscription.MediaInputs],
  ["StreamStateChanged", EventSubscription.Outputs],
  ["RecordStateChanged", EventSubscription.Outputs],
  ["RecordFileChanged", EventSubscription.Outputs],
  ["ReplayBufferStateChanged", EventSubscription.Outputs],
  ["VirtualcamStateChanged", EventSubscription.Outputs],
  ["ReplayBufferSaved", EventSubscription.Outputs],
  ["SceneItemCreated", EventSubscription.SceneItems],
  ["SceneItemRemoved", EventSubscription.SceneItems],
  ["SceneItemListReindexed", EventSubscription.SceneItems],
  ["SceneItemEnableStateChanged", EventSubscription.SceneItems],
  ["SceneItemLockStateChanged", EventSubscription.SceneItems],
  ["SceneItemSelected", EventSubscription.SceneItems],
  ["SceneItemTransformChanged", EventSubscription.SceneItemTransformChanged],
  ["SceneCreated", EventSubscription.Scenes],
  ["SceneRemoved", EventSubscription.Scenes],
  ["SceneNameChanged", EventSubscription.Scenes],
  ["CurrentProgramSceneChanged", EventSubscription.Scenes],
  ["CurrentPreviewSceneChanged", EventSubscription.Scenes],
  ["SceneListChanged", EventSubscription.Scenes],
  ["CurrentSceneTransitionChanged", EventSubscription.Transitions],
  ["CurrentSceneTransitionDurationChanged", EventSubscription.Transitions],
  ["SceneTransitionStarted", EventSubscription.Transitions],
  ["SceneTransitionEnded", EventSubscription.Transitions],
  ["SceneTransitionVideoEnded", EventSubscription.Transitions],
  ["StudioModeStateChanged", EventSubscription.Ui],
  ["ScreenshotSaved", EventSubscription.Ui]
])

const ObsAuthenticationSchema = Schema.Struct({
  challenge: Schema.String,
  salt: Schema.String
})

const HelloEnvelope = Schema.Struct({
  op: Schema.Literal(OP_HELLO),
  d: Schema.Struct({
    obsStudioVersion: Schema.String,
    obsWebSocketVersion: Schema.String,
    rpcVersion: Schema.Number,
    authentication: Schema.optional(ObsAuthenticationSchema)
  })
})

const IdentifiedEnvelope = Schema.Struct({
  op: Schema.Literal(OP_IDENTIFIED),
  d: Schema.Struct({
    negotiatedRpcVersion: Schema.Number
  })
})

const RequestStatus = Schema.Struct({
  result: Schema.Boolean,
  code: Schema.Number,
  comment: Schema.optional(Schema.String)
})

export const RequestResponseEnvelope = Schema.Struct({
  op: Schema.Literal(OP_REQUEST_RESPONSE),
  d: Schema.Struct({
    requestType: Schema.String,
    requestId: Schema.String,
    requestStatus: RequestStatus,
    responseData: Schema.optional(UnknownRecord)
  })
})
export type RequestResponseEnvelope = typeof RequestResponseEnvelope.Type

export const EventEnvelope = Schema.Struct({
  op: Schema.Literal(OP_EVENT),
  d: Schema.Struct({
    eventType: Schema.String,
    eventIntent: Schema.Number,
    eventData: Schema.optional(UnknownRecord)
  })
})
export type EventEnvelope = typeof EventEnvelope.Type

const RawEventEnvelope = Schema.Struct({
  op: Schema.Literal(OP_EVENT),
  d: UnknownRecord
})

const ObsEnvelope = Schema.Union(
  HelloEnvelope,
  IdentifiedEnvelope,
  RequestResponseEnvelope,
  RawEventEnvelope
)
type ObsEnvelope = typeof ObsEnvelope.Type

export const decodeJsonTextEnvelope = (message: string): ObsEnvelope => {
  const parsed = JSON.parse(message)
  return Schema.decodeUnknownSync(ObsEnvelope)(parsed)
}

export const decodeEventEnvelope = (message: string): EventEnvelope => {
  const parsed = JSON.parse(message)
  return Schema.decodeUnknownSync(EventEnvelope)(parsed)
}

export const shouldSurfaceSafeEvent = (event: EventEnvelope): boolean =>
  !UNSAFE_SAFE_ALL_EVENT_TYPES.has(event.d.eventType)

export const officialEventSubscriptionFor = (eventType: string): number | undefined =>
  OFFICIAL_EVENT_SUBSCRIPTIONS.get(eventType)

export const eventMatchesOfficialSubscription = (eventType: string, eventIntent: number): boolean =>
  officialEventSubscriptionFor(eventType) === eventIntent
