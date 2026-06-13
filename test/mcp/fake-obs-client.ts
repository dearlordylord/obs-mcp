import { Schema } from "effect"

import type { BatchRequestResult, ObsClient } from "../../src/obs/client.js"
import type { ObsEventBufferSnapshot } from "../../src/obs/events.js"
import type { ObsRequestType } from "../../src/obs/requests.js"
import { DEFAULT_AVAILABLE_REQUESTS } from "../obs/fake-obs-fixtures.js"

export const allAvailableRequests = DEFAULT_AVAILABLE_REQUESTS

export type FakeObsRequestHandler = (
  requestType: ObsRequestType,
  requestData: unknown
) => Promise<unknown>

export type FakeObsBatchHandler = (
  batch: Parameters<ObsClient["requestBatch"]>[0]
) => Promise<ReadonlyArray<BatchRequestResult>>

export const fakeObsClient = (
  handler: FakeObsRequestHandler,
  availableRequests: ReadonlyArray<string> = allAvailableRequests,
  bufferedEvents: ObsEventBufferSnapshot = { capacity: 0, droppedEvents: 0, events: [] },
  batchHandler: FakeObsBatchHandler = async () => []
): ObsClient => ({
  negotiatedRpcVersion: 1,
  availableRequests,
  request: async (descriptor, requestData) =>
    Schema.decodeUnknownSync(descriptor.responseSchema)(await handler(descriptor.requestType, requestData)),
  requestBatch: batchHandler,
  getBufferedEvents: () => bufferedEvents,
  close: async () => undefined
})
