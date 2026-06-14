import { Schema } from "effect"

import type { BatchRequestResult, ObsClient } from "../../src/obs/client.js"
import type { ObsEventBufferSnapshot, ObsEventBufferSnapshotInput, ObsEventMatcher } from "../../src/obs/events.js"
import type { ObsRequestType } from "../../src/obs/requests.js"
import { DEFAULT_AVAILABLE_REQUESTS } from "../obs/fake-obs-fixtures.js"

const LAST_BUFFERED_EVENT_OFFSET = -1

export const allAvailableRequests = DEFAULT_AVAILABLE_REQUESTS

export type FakeObsRequestHandler = (
  requestType: ObsRequestType,
  requestData: unknown
) => Promise<unknown>

export type FakeObsBatchHandler = (
  batch: Parameters<ObsClient["requestBatch"]>[0]
) => Promise<ReadonlyArray<BatchRequestResult>>

type FakeObsEventSnapshotInput =
  & Omit<ObsEventBufferSnapshot, "oldestSequence" | "latestSequence" | "missedEvents">
  & Partial<Pick<ObsEventBufferSnapshot, "oldestSequence" | "latestSequence" | "missedEvents">>

const normalizeSnapshot = (
  snapshot: FakeObsEventSnapshotInput,
  input: ObsEventBufferSnapshotInput = {}
): ObsEventBufferSnapshot => {
  const sinceSequence = input.sinceSequence
  const oldestSequence = snapshot.oldestSequence ?? snapshot.events[0]?.sequence ?? 0
  const latestSequence = snapshot.latestSequence ?? snapshot.events.at(LAST_BUFFERED_EVENT_OFFSET)?.sequence ?? 0
  const missedEvents = snapshot.missedEvents ?? (
    sinceSequence !== undefined
    && oldestSequence > 0
    && sinceSequence < oldestSequence - 1
  )
  const events = sinceSequence === undefined
    ? snapshot.events
    : snapshot.events.filter((event) => event.sequence > sinceSequence)
  return { ...snapshot, oldestSequence, latestSequence, missedEvents, events }
}

export const fakeObsClient = (
  handler: FakeObsRequestHandler,
  availableRequests: ReadonlyArray<string> = allAvailableRequests,
  bufferedEvents: FakeObsEventSnapshotInput = { capacity: 0, droppedEvents: 0, events: [] },
  batchHandler: FakeObsBatchHandler = async () => []
): ObsClient => ({
  negotiatedRpcVersion: 1,
  availableRequests,
  request: async (descriptor, requestData) =>
    Schema.decodeUnknownSync(descriptor.responseSchema)(await handler(descriptor.requestType, requestData)),
  requestBatch: batchHandler,
  getBufferedEvents: (input) => normalizeSnapshot(bufferedEvents, input),
  waitForBufferedEvent: async (match: ObsEventMatcher, options) => {
    const snapshot = normalizeSnapshot(bufferedEvents, { sinceSequence: options.afterSequence })
    const event = snapshot.events.find(match)
    return {
      timedOut: event === undefined,
      baselineSequence: options.afterSequence,
      snapshot,
      ...(event === undefined ? {} : { event })
    }
  },
  close: async () => undefined
})
