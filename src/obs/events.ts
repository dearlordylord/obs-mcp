import type { EventEnvelope } from "./protocol.js"
import { shouldSurfaceSafeEvent } from "./protocol.js"

const DEFAULT_OBS_EVENT_BUFFER_CAPACITY = 100

interface BufferedObsEvent {
  readonly sequence: number
  readonly eventType: string
  readonly eventIntent: number
  readonly eventData: Record<string, unknown> | undefined
}

export interface ObsEventBufferSnapshot {
  readonly capacity: number
  readonly droppedEvents: number
  readonly events: ReadonlyArray<BufferedObsEvent>
}

interface ObsEventBuffer {
  record(event: EventEnvelope): void
  snapshot(): ObsEventBufferSnapshot
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

  return {
    record: (event) => {
      if (!shouldSurfaceSafeEvent(event)) {
        return
      }
      const bufferedEvent: BufferedObsEvent = {
        sequence: nextSequence,
        eventType: event.d.eventType,
        eventIntent: event.d.eventIntent,
        eventData: event.d.eventData
      }
      nextSequence += 1
      if (events.length >= capacity) {
        droppedEvents += 1
        events = [...events.slice(1), bufferedEvent]
        return
      }
      events = [...events, bufferedEvent]
    },
    snapshot: () => ({
      capacity,
      droppedEvents,
      events
    })
  }
}
