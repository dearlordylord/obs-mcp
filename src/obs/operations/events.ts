import { Schema } from "effect"

import {
  GetRecentObsEventsInput,
  GetRecentObsEventsOutput,
  type ObsEventCategory
} from "../../domain/schemas/events.js"
import type { ObsClient } from "../client.js"
import type { BufferedObsEvent } from "../events.js"
import { EventSubscription, HIGH_VOLUME_EVENT_SUBSCRIPTIONS } from "../protocol.js"

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

export const getRecentObsEvents = (
  client: ObsClient,
  input: GetRecentObsEventsInput
): GetRecentObsEventsOutput => {
  const decodedInput = Schema.decodeUnknownSync(GetRecentObsEventsInput)(input)
  const snapshot = client.getBufferedEvents()
  const filtered = snapshot.events.filter(
    (event) => isPublicSafeEvent(event) && matchesCategories(event, decodedInput.categories)
  )
  const ordered = decodedInput.order === "newest_first" ? [...filtered].reverse() : filtered
  const events = ordered.slice(0, decodedInput.limit).map((event) => ({
    sequence: event.sequence,
    eventType: event.eventType,
    eventIntent: event.eventIntent,
    category: categoryForIntent(event.eventIntent),
    ...(event.eventData === undefined ? {} : { eventData: event.eventData })
  }))
  return Schema.decodeUnknownSync(GetRecentObsEventsOutput)({
    capacity: snapshot.capacity,
    droppedEvents: snapshot.droppedEvents,
    returnedEvents: events.length,
    order: decodedInput.order,
    events
  })
}
