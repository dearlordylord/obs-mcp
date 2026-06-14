import { Schema } from "effect"

import { ObsNonNegativeInteger, ObsNumber, ObsString, UnknownRecord } from "../domain/schemas/shared.js"

const OP_HELLO = 0
export const OP_IDENTIFY = 1
export const OP_IDENTIFIED = 2
export const OP_EVENT = 5
export const OP_REQUEST = 6
export const OP_REQUEST_RESPONSE = 7
export const OP_REQUEST_BATCH = 8
export const OP_REQUEST_BATCH_RESPONSE = 9

const EventSubscriptionGeneralBit = 0
const EventSubscriptionConfigBit = 1
const EventSubscriptionScenesBit = 2
const EventSubscriptionInputsBit = 3
const EventSubscriptionTransitionsBit = 4
const EventSubscriptionFiltersBit = 5
const EventSubscriptionOutputsBit = 6
const EventSubscriptionSceneItemsBit = 7
const EventSubscriptionMediaInputsBit = 8
const EventSubscriptionVendorsBit = 9
const EventSubscriptionUiBit = 10
const EventSubscriptionCanvasesBit = 11
const EventSubscriptionInputVolumeMetersBit = 16
const EventSubscriptionInputActiveStateChangedBit = 17
const EventSubscriptionInputShowStateChangedBit = 18
const EventSubscriptionSceneItemTransformChangedBit = 19

export const EventSubscription = {
  None: 0,
  General: 1 << EventSubscriptionGeneralBit,
  Config: 1 << EventSubscriptionConfigBit,
  Scenes: 1 << EventSubscriptionScenesBit,
  Inputs: 1 << EventSubscriptionInputsBit,
  Transitions: 1 << EventSubscriptionTransitionsBit,
  Filters: 1 << EventSubscriptionFiltersBit,
  Outputs: 1 << EventSubscriptionOutputsBit,
  SceneItems: 1 << EventSubscriptionSceneItemsBit,
  MediaInputs: 1 << EventSubscriptionMediaInputsBit,
  Vendors: 1 << EventSubscriptionVendorsBit,
  Ui: 1 << EventSubscriptionUiBit,
  Canvases: 1 << EventSubscriptionCanvasesBit,
  InputVolumeMeters: 1 << EventSubscriptionInputVolumeMetersBit,
  InputActiveStateChanged: 1 << EventSubscriptionInputActiveStateChangedBit,
  InputShowStateChanged: 1 << EventSubscriptionInputShowStateChangedBit,
  SceneItemTransformChanged: 1 << EventSubscriptionSceneItemTransformChangedBit
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
  challenge: ObsString,
  salt: ObsString
})

const HelloEnvelope = Schema.Struct({
  op: Schema.Literal(OP_HELLO),
  d: Schema.Struct({
    obsStudioVersion: ObsString,
    obsWebSocketVersion: ObsString,
    rpcVersion: ObsNumber,
    authentication: Schema.optional(ObsAuthenticationSchema)
  })
})

const IdentifiedEnvelope = Schema.Struct({
  op: Schema.Literal(OP_IDENTIFIED),
  d: Schema.Struct({
    negotiatedRpcVersion: ObsNumber
  })
})

const RequestStatus = Schema.Struct({
  result: Schema.Boolean,
  code: ObsNumber,
  comment: Schema.optional(ObsString)
})

const EventIntent = ObsNonNegativeInteger.pipe(Schema.lessThanOrEqualTo(Number.MAX_SAFE_INTEGER))

export const RequestResponseEnvelope = Schema.Struct({
  op: Schema.Literal(OP_REQUEST_RESPONSE),
  d: Schema.Struct({
    requestType: ObsString,
    requestId: ObsString,
    requestStatus: RequestStatus,
    responseData: Schema.optional(UnknownRecord)
  })
})
export type RequestResponseEnvelope = typeof RequestResponseEnvelope.Type

export const RequestBatchResponseEnvelope = Schema.Struct({
  op: Schema.Literal(OP_REQUEST_BATCH_RESPONSE),
  d: Schema.Struct({
    requestId: ObsString,
    results: Schema.Array(Schema.Struct({
      requestType: ObsString,
      requestId: Schema.optional(ObsString),
      requestStatus: RequestStatus,
      responseData: Schema.optional(UnknownRecord)
    }))
  })
})
export type RequestBatchResponseEnvelope = typeof RequestBatchResponseEnvelope.Type

export const EventEnvelope = Schema.Struct({
  op: Schema.Literal(OP_EVENT),
  d: Schema.Struct({
    eventType: ObsString,
    eventIntent: EventIntent,
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
  RequestBatchResponseEnvelope,
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
