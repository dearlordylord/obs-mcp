import { JSONSchema, Schema } from "effect"

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
  category: ObsEventCategory
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
