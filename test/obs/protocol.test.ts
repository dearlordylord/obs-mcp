import { describe, expect, it } from "vitest"

import { ObsRequestError } from "../../src/obs/errors.js"
import {
  decodeEventEnvelope,
  decodeJsonTextEnvelope,
  EventSubscription,
  HIGH_VOLUME_EVENT_SUBSCRIPTIONS,
  OP_REQUEST_RESPONSE,
  SAFE_EVENT_SUBSCRIPTION_MASK,
  shouldSurfaceSafeEvent
} from "../../src/obs/protocol.js"

describe("OBS protocol envelopes", () => {
  it("decodes request responses", () => {
    const decoded = decodeJsonTextEnvelope(JSON.stringify({
      op: OP_REQUEST_RESPONSE,
      d: {
        requestType: "SetCurrentProgramScene",
        requestId: "1",
        requestStatus: { result: false, code: 608, comment: "Parameter: sceneName" }
      }
    }))
    expect(decoded.op).toBe(OP_REQUEST_RESPONSE)
  })

  it("formats failed request status as a domain error", () => {
    const error = new ObsRequestError("SetCurrentProgramScene", 608, "Parameter: sceneName")
    expect(error.toUserMessage()).toContain("OBS rejected SetCurrentProgramScene with status 608")
    expect(error.toUserMessage()).toContain("Parameter: sceneName")
  })
})

describe("OBS event protocol foundation", () => {
  it("decodes valid event envelopes", () => {
    expect(decodeEventEnvelope(JSON.stringify({
      op: 5,
      d: {
        eventType: "CurrentProgramSceneChanged",
        eventIntent: EventSubscription.Scenes,
        eventData: {
          sceneName: "Program",
          sceneUuid: "scene-program"
        }
      }
    }))).toMatchObject({
      d: {
        eventType: "CurrentProgramSceneChanged",
        eventIntent: EventSubscription.Scenes,
        eventData: {
          sceneName: "Program",
          sceneUuid: "scene-program"
        }
      }
    })
  })

  it("rejects malformed event envelopes", () => {
    expect(() =>
      decodeEventEnvelope(JSON.stringify({
        op: 5,
        d: {
          eventType: "CurrentProgramSceneChanged",
          eventIntent: "Scenes"
        }
      }))
    ).toThrow()
    expect(() =>
      decodeEventEnvelope(JSON.stringify({
        op: 5,
        d: {
          eventType: "CurrentProgramSceneChanged",
          eventIntent: EventSubscription.Scenes,
          eventData: "not-an-object"
        }
      }))
    ).toThrow()
  })

  it("keeps high-volume subscriptions disabled by default", () => {
    for (const subscription of HIGH_VOLUME_EVENT_SUBSCRIPTIONS) {
      expect(SAFE_EVENT_SUBSCRIPTION_MASK & EventSubscription[subscription]).toBe(0)
    }
  })

  it("defines local safe-all without vendor, custom, or high-volume events", () => {
    expect(SAFE_EVENT_SUBSCRIPTION_MASK & EventSubscription.Vendors).toBe(0)
    expect(shouldSurfaceSafeEvent(decodeEventEnvelope(JSON.stringify({
      op: 5,
      d: {
        eventType: "CurrentProgramSceneChanged",
        eventIntent: EventSubscription.Scenes,
        eventData: {
          sceneName: "Program",
          sceneUuid: "scene-program"
        }
      }
    })))).toBe(true)

    for (const eventType of [...HIGH_VOLUME_EVENT_SUBSCRIPTIONS, "VendorEvent", "CustomEvent"]) {
      expect(shouldSurfaceSafeEvent(decodeEventEnvelope(JSON.stringify({
        op: 5,
        d: {
          eventType,
          eventIntent: EventSubscription.Inputs,
          eventData: {}
        }
      })))).toBe(false)
    }
  })
})
