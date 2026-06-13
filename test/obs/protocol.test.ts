import { describe, expect, it } from "vitest"

import { decodeTypedObsEventData } from "../../src/domain/schemas/events.js"
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
  it("decodes typed low-volume event payloads", () => {
    const cases = [
      ["CurrentProgramSceneChanged", { sceneName: "Program", sceneUuid: "scene-program" }],
      ["SceneListChanged", { scenes: [{ sceneName: "Program", sceneUuid: "scene-program", sceneIndex: 0 }] }],
      ["InputMuteStateChanged", { inputName: "Mic", inputUuid: "input-mic", inputMuted: true }],
      [
        "InputVolumeChanged",
        { inputName: "Mic", inputUuid: "input-mic", inputVolumeMul: 0.5, inputVolumeDb: -6 }
      ],
      ["InputAudioBalanceChanged", { inputName: "Mic", inputUuid: "input-mic", inputAudioBalance: 0.25 }],
      ["InputAudioSyncOffsetChanged", { inputName: "Mic", inputUuid: "input-mic", inputAudioSyncOffset: 120 }],
      [
        "InputAudioTracksChanged",
        {
          inputName: "Mic",
          inputUuid: "input-mic",
          inputAudioTracks: { "1": true, "2": false, "3": false, "4": false, "5": false, "6": false }
        }
      ],
      [
        "InputAudioMonitorTypeChanged",
        { inputName: "Mic", inputUuid: "input-mic", monitorType: "OBS_MONITORING_TYPE_MONITOR_ONLY" }
      ],
      ["StreamStateChanged", { outputActive: true, outputState: "OBS_WEBSOCKET_OUTPUT_STARTED" }],
      [
        "RecordStateChanged",
        { outputActive: false, outputState: "OBS_WEBSOCKET_OUTPUT_STOPPED", outputPath: null }
      ],
      ["ReplayBufferStateChanged", { outputActive: true, outputState: "OBS_WEBSOCKET_OUTPUT_STARTED" }],
      ["ReplayBufferSaved", { savedReplayPath: "/tmp/replay.mkv" }],
      ["MediaInputPlaybackStarted", { inputName: "Media", inputUuid: "input-media" }],
      ["MediaInputPlaybackEnded", { inputName: "Media", inputUuid: "input-media" }],
      [
        "MediaInputActionTriggered",
        {
          inputName: "Media",
          inputUuid: "input-media",
          mediaAction: "OBS_WEBSOCKET_MEDIA_INPUT_ACTION_PAUSE"
        }
      ]
    ] as const

    for (const [eventType, eventData] of cases) {
      const envelope = decodeEventEnvelope(JSON.stringify({
        op: 5,
        d: { eventType, eventIntent: EventSubscription.General, eventData }
      }))
      expect(decodeTypedObsEventData(envelope.d.eventType, envelope.d.eventData)).toEqual(eventData)
    }
  })

  it("rejects malformed typed low-volume event payloads", () => {
    expect(() => decodeTypedObsEventData("InputMuteStateChanged", { inputName: "Mic", inputMuted: true })).toThrow()
    expect(() =>
      decodeTypedObsEventData("MediaInputActionTriggered", {
        inputName: "Media",
        inputUuid: "input-media",
        mediaAction: "OBS_WEBSOCKET_MEDIA_INPUT_ACTION_UNKNOWN"
      })
    ).toThrow()
  })

  it("omits payloads for safe event types without task-owned schemas", () => {
    expect(decodeTypedObsEventData("TransitionStarted", { transitionName: "Fade" })).toBeUndefined()
  })

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
