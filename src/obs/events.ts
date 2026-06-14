import { decodeTypedObsEventData, type TypedObsEventData } from "../domain/schemas/events.js"
import type { EventEnvelope } from "./protocol.js"
import { eventMatchesOfficialSubscription, shouldSurfaceSafeEvent } from "./protocol.js"

const DEFAULT_OBS_EVENT_BUFFER_CAPACITY = 100

export interface BufferedObsEvent {
  readonly sequence: number
  readonly eventType: string
  readonly eventIntent: number
  readonly eventData: TypedObsEventData | undefined
}

export interface ObsEventBufferSnapshot {
  readonly capacity: number
  readonly droppedEvents: number
  readonly oldestSequence: number
  readonly latestSequence: number
  readonly missedEvents: boolean
  readonly events: ReadonlyArray<BufferedObsEvent>
}

export interface ObsEventBufferSnapshotInput {
  readonly sinceSequence?: number | undefined
}

export type ObsEventMatcher = (event: BufferedObsEvent) => boolean
export type ObsEventListener = (event: BufferedObsEvent) => void

export interface ObsEventWaitOptions {
  readonly afterSequence: number
  readonly timeoutMs: number
}

export interface ObsEventWaitResult {
  readonly timedOut: boolean
  readonly baselineSequence: number
  readonly snapshot: ObsEventBufferSnapshot
  readonly event?: BufferedObsEvent | undefined
}

interface ObsEventBuffer {
  record(event: EventEnvelope): void
  snapshot(input?: ObsEventBufferSnapshotInput): ObsEventBufferSnapshot
  waitFor(match: ObsEventMatcher, options: ObsEventWaitOptions): Promise<ObsEventWaitResult>
  close(error: Error): void
}

interface ObsEventBufferOptions {
  readonly capacity?: number
}

export const createObsEventBuffer = (options: ObsEventBufferOptions = {}): ObsEventBuffer => {
  const capacity = options.capacity ?? DEFAULT_OBS_EVENT_BUFFER_CAPACITY
  if (!Number.isInteger(capacity) || capacity < 1) {
    throw new Error("OBS event buffer capacity must be a positive integer")
  }
  let events: ReadonlyArray<BufferedObsEvent> = []
  let droppedEvents = 0
  let nextSequence = 1
  let closedError: Error | undefined
  let waiters: ReadonlyArray<{
    readonly match: ObsEventMatcher
    readonly options: ObsEventWaitOptions
    readonly resolve: (result: ObsEventWaitResult) => void
    readonly reject: (error: Error) => void
    readonly timer: NodeJS.Timeout
  }> = []

  const snapshot = (input: ObsEventBufferSnapshotInput = {}): ObsEventBufferSnapshot => {
    const sinceSequence = input.sinceSequence
    const oldestSequence = events[0]?.sequence ?? 0
    const latestSequence = nextSequence - 1
    const missedEvents = sinceSequence !== undefined
      && oldestSequence > 0
      && sinceSequence < oldestSequence - 1
    const retainedEvents = sinceSequence === undefined
      ? events
      : events.filter((event) => event.sequence > sinceSequence)
    return {
      capacity,
      droppedEvents,
      oldestSequence,
      latestSequence,
      missedEvents,
      events: retainedEvents
    }
  }

  const resolveWaiter = (
    waiter: typeof waiters[number],
    event: BufferedObsEvent | undefined,
    timedOut: boolean
  ): void => {
    clearTimeout(waiter.timer)
    waiters = waiters.filter((entry) => entry !== waiter)
    waiter.resolve({
      timedOut,
      baselineSequence: waiter.options.afterSequence,
      snapshot: snapshot({ sinceSequence: waiter.options.afterSequence }),
      ...(event === undefined ? {} : { event })
    })
  }

  return {
    record: (event) => {
      if (!shouldSurfaceSafeEvent(event) || !eventMatchesOfficialSubscription(event.d.eventType, event.d.eventIntent)) {
        return
      }
      let eventData: TypedObsEventData | undefined
      try {
        eventData = decodeTypedObsEventData(event.d.eventType, event.d.eventData)
      } catch {
        return
      }
      const bufferedEvent: BufferedObsEvent = {
        sequence: nextSequence,
        eventType: event.d.eventType,
        eventIntent: event.d.eventIntent,
        eventData
      }
      nextSequence += 1
      if (events.length >= capacity) {
        droppedEvents += 1
        events = [...events.slice(1), bufferedEvent]
      } else {
        events = [...events, bufferedEvent]
      }
      for (const waiter of waiters) {
        if (bufferedEvent.sequence > waiter.options.afterSequence && waiter.match(bufferedEvent)) {
          resolveWaiter(waiter, bufferedEvent, false)
        }
      }
    },
    snapshot,
    waitFor: async (match, options) => {
      if (closedError !== undefined) {
        throw closedError
      }
      const retainedMatch = events.find((event) => event.sequence > options.afterSequence && match(event))
      if (retainedMatch !== undefined) {
        return {
          timedOut: false,
          baselineSequence: options.afterSequence,
          snapshot: snapshot({ sinceSequence: options.afterSequence }),
          event: retainedMatch
        }
      }
      return await new Promise<ObsEventWaitResult>((resolve, reject) => {
        const waiter = {
          match,
          options,
          resolve,
          reject,
          timer: setTimeout(() => {
            resolveWaiter(waiter, undefined, true)
          }, options.timeoutMs)
        }
        waiters = [...waiters, waiter]
      })
    },
    close: (error) => {
      closedError = error
      for (const waiter of waiters) {
        clearTimeout(waiter.timer)
        waiter.reject(error)
      }
      waiters = []
    }
  }
}
