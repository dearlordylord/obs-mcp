import { Schema } from "effect"

import {
  type BatchRequestItem,
  BatchResponseItem,
  RunObsRequestBatchInput,
  RunObsRequestBatchOutput
} from "../../domain/schemas/batch.js"
import { CurrentSceneOutput, SetCurrentSceneOutput } from "../../domain/schemas/scenes.js"
import type { BatchRequestResult, ObsClient } from "../client.js"

const EXECUTION_TYPE_VALUES = {
  serial_realtime: 0,
  serial_frame: 1,
  parallel: 2
} as const

interface PreparedBatchRequest {
  readonly item: BatchRequestItem
  readonly index: number
  readonly requestType: "GetCurrentProgramScene" | "SetCurrentProgramScene" | "Sleep"
  readonly requestId: string
  readonly requestData?: Record<string, unknown>
}

const requestTypeForItem = (item: BatchRequestItem): "GetCurrentProgramScene" | "SetCurrentProgramScene" | "Sleep" => {
  if (item.kind === "get_current_scene") {
    return "GetCurrentProgramScene"
  }
  if (item.kind === "set_current_scene") {
    return "SetCurrentProgramScene"
  }
  return "Sleep"
}

const requestDataForItem = (item: BatchRequestItem): Record<string, unknown> | undefined => {
  if (item.kind === "set_current_scene") {
    return { sceneName: item.sceneName }
  }
  if (item.kind === "sleep" && "sleepMillis" in item) {
    return { sleepMillis: item.sleepMillis }
  }
  if (item.kind === "sleep" && "sleepFrames" in item) {
    return { sleepFrames: item.sleepFrames }
  }
  return undefined
}

const responseDataForResult = (
  item: BatchRequestItem,
  result: BatchRequestResult
): Record<string, unknown> | undefined => {
  if (result.requestStatus.result === false) {
    return result.responseData
  }
  if (item.kind === "get_current_scene") {
    if (result.responseData === undefined) {
      throw new Error("OBS batch GetCurrentProgramScene result did not include responseData")
    }
    return Schema.decodeUnknownSync(CurrentSceneOutput)(result.responseData)
  }
  if (item.kind === "set_current_scene") {
    return Schema.decodeUnknownSync(SetCurrentSceneOutput)({
      sceneName: item.sceneName,
      switched: true
    })
  }
  return result.responseData
}

const outputItem = (
  request: PreparedBatchRequest,
  result: BatchRequestResult
): BatchResponseItem => {
  const responseData = responseDataForResult(request.item, result)
  return Schema.decodeUnknownSync(BatchResponseItem)({
    index: request.index,
    kind: request.item.kind,
    requestType: result.requestType,
    requestId: request.requestId,
    requestStatus: result.requestStatus,
    ...(responseData === undefined ? {} : { responseData })
  })
}

const validateUniqueRequestIds = (requests: ReadonlyArray<PreparedBatchRequest>): void => {
  const seen = new Set<string>()
  for (const request of requests) {
    if (seen.has(request.requestId)) {
      throw new Error(`Duplicate OBS batch request id ${request.requestId}`)
    }
    seen.add(request.requestId)
  }
}

const correlateBatchResults = (
  requests: ReadonlyArray<PreparedBatchRequest>,
  results: ReadonlyArray<BatchRequestResult>,
  haltOnFailure: boolean
): ReadonlyArray<BatchResponseItem> => {
  const byId = new Map(requests.map((request) => [request.requestId, request]))
  const seen = new Map<string, { readonly request: PreparedBatchRequest; readonly result: BatchRequestResult }>()
  let failureIndex: number | undefined

  for (const result of results) {
    if (result.requestId === undefined) {
      throw new Error(`OBS batch result for ${result.requestType} did not include requestId`)
    }
    const request = byId.get(result.requestId)
    if (request === undefined) {
      throw new Error(`OBS returned unexpected batch result requestId ${result.requestId}`)
    }
    if (seen.has(result.requestId)) {
      throw new Error(`OBS returned duplicate batch result requestId ${result.requestId}`)
    }
    if (request.requestType !== result.requestType) {
      throw new Error(
        `OBS batch result ${result.requestId} used requestType ${result.requestType}; expected ${request.requestType}`
      )
    }
    seen.set(result.requestId, { request, result })
    if (result.requestStatus.result === false) {
      failureIndex = failureIndex === undefined ? request.index : Math.min(failureIndex, request.index)
    }
  }

  if (haltOnFailure && failureIndex !== undefined) {
    const afterFailure = [...seen.values()].find(({ request }) => request.index > failureIndex)
    if (afterFailure !== undefined) {
      throw new Error(`OBS returned batch result ${afterFailure.request.requestId} after halt-on-failure item`)
    }
  }

  const requiredCount = haltOnFailure && failureIndex !== undefined ? failureIndex + 1 : requests.length
  for (const request of requests.slice(0, requiredCount)) {
    if (!seen.has(request.requestId)) {
      throw new Error(`OBS did not return batch result requestId ${request.requestId}`)
    }
  }

  return [...seen.values()]
    .sort((left, right) => left.request.index - right.request.index)
    .map(({ request, result }) => outputItem(request, result))
}

export const runObsRequestBatch = async (
  client: ObsClient,
  input: RunObsRequestBatchInput
): Promise<RunObsRequestBatchOutput> => {
  const decodedInput = Schema.decodeUnknownSync(RunObsRequestBatchInput)(input)
  const requests = decodedInput.requests.map((item, index) => {
    const requestData = requestDataForItem(item)
    return {
      item,
      index,
      requestType: requestTypeForItem(item),
      requestId: item.id ?? `batch-${index}`,
      ...(requestData === undefined ? {} : { requestData })
    }
  })
  validateUniqueRequestIds(requests)
  const results = await client.requestBatch({
    executionType: EXECUTION_TYPE_VALUES[decodedInput.executionType],
    haltOnFailure: decodedInput.haltOnFailure,
    requests: requests.map(({ index: _index, item: _item, ...request }) => request)
  })

  return Schema.decodeUnknownSync(RunObsRequestBatchOutput)({
    executionType: decodedInput.executionType,
    haltOnFailure: decodedInput.haltOnFailure,
    requestedRequests: decodedInput.requests.length,
    returnedResults: results.length,
    results: correlateBatchResults(requests, results, decodedInput.haltOnFailure)
  })
}
