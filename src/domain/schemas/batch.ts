import { Schema } from "effect"

import { ObsNonEmptyString, ObsNonNegativeInteger, ObsNumber, ObsString } from "./shared.js"

import { CurrentSceneOutput, SetCurrentSceneOutput } from "./scenes.js"
import { JsonSafeObject } from "./vendor.js"

const MAX_BATCH_ITEMS = 20
const MAX_SLEEP_MILLIS = 50_000
const MAX_SLEEP_FRAMES = 10_000

// Batch sleeps are request-local structural delays; milliseconds are bounded but not branded durations.
const BatchSleepMillis = ObsNumber.pipe(
  Schema.int(),
  Schema.greaterThanOrEqualTo(0),
  Schema.lessThanOrEqualTo(MAX_SLEEP_MILLIS)
)
// Batch frame sleeps are structural frame counts tied to one request batch, not reusable branded identities.
const BatchSleepFrames = ObsNumber.pipe(
  Schema.int(),
  Schema.greaterThanOrEqualTo(0),
  Schema.lessThanOrEqualTo(MAX_SLEEP_FRAMES)
)

export const BatchExecutionType = Schema.Literal("serial_realtime", "serial_frame", "parallel")
export type BatchExecutionType = typeof BatchExecutionType.Type

const BatchRequestId = Schema.optional(ObsNonEmptyString)

const BatchGetCurrentSceneItem = Schema.Struct({
  kind: Schema.Literal("get_current_scene"),
  id: BatchRequestId
})

const BatchSetCurrentSceneItem = Schema.Struct({
  kind: Schema.Literal("set_current_scene"),
  id: BatchRequestId,
  sceneName: ObsNonEmptyString
})

const BatchSleepMillisItem = Schema.Struct({
  kind: Schema.Literal("sleep"),
  id: BatchRequestId,
  sleepMillis: BatchSleepMillis,
  sleepFrames: Schema.optional(Schema.Never)
})

const BatchSleepFramesItem = Schema.Struct({
  kind: Schema.Literal("sleep"),
  id: BatchRequestId,
  sleepMillis: Schema.optional(Schema.Never),
  sleepFrames: BatchSleepFrames
})

export const BatchRequestItem = Schema.Union(
  BatchGetCurrentSceneItem,
  BatchSetCurrentSceneItem,
  BatchSleepMillisItem,
  BatchSleepFramesItem
)
export type BatchRequestItem = typeof BatchRequestItem.Type

const BatchRequests = Schema.Array(BatchRequestItem).pipe(
  Schema.minItems(1),
  Schema.maxItems(MAX_BATCH_ITEMS)
)

const sleepMatchesExecutionType = (executionType: BatchExecutionType, item: BatchRequestItem): boolean =>
  item.kind !== "sleep"
  || (executionType === "serial_realtime" && "sleepMillis" in item)
  || (executionType === "serial_frame" && "sleepFrames" in item)

export const RunObsRequestBatchInput = Schema.Struct({
  executionType: Schema.optionalWith(BatchExecutionType, { default: () => "serial_realtime" as const }),
  haltOnFailure: Schema.optionalWith(Schema.Boolean, { default: () => false }),
  requests: BatchRequests
}).pipe(
  Schema.filter((input) => input.requests.every((item) => sleepMatchesExecutionType(input.executionType, item)), {
    message: () => "Sleep requests must match the batch execution type"
  })
)
export type RunObsRequestBatchInput = typeof RunObsRequestBatchInput.Type

export const BatchRequestStatus = Schema.Struct({
  result: Schema.Boolean,
  code: ObsNumber,
  comment: Schema.optional(ObsString)
})
export type BatchRequestStatus = typeof BatchRequestStatus.Type

export const BatchResponseItem = Schema.Struct({
  index: ObsNonNegativeInteger,
  kind: Schema.Literal("get_current_scene", "set_current_scene", "sleep"),
  requestType: Schema.Literal("GetCurrentProgramScene", "SetCurrentProgramScene", "Sleep"),
  requestId: Schema.optional(ObsString),
  requestStatus: BatchRequestStatus,
  responseData: Schema.optional(Schema.Union(CurrentSceneOutput, SetCurrentSceneOutput, JsonSafeObject))
})
export type BatchResponseItem = typeof BatchResponseItem.Type

export const RunObsRequestBatchOutput = Schema.Struct({
  executionType: BatchExecutionType,
  haltOnFailure: Schema.Boolean,
  requestedRequests: ObsNonNegativeInteger,
  returnedResults: ObsNonNegativeInteger,
  results: Schema.Array(BatchResponseItem)
})
export type RunObsRequestBatchOutput = typeof RunObsRequestBatchOutput.Type
