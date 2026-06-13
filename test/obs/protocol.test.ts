import { readFileSync } from "node:fs"

import { describe, expect, it } from "vitest"

import { decodeTypedObsEventData } from "../../src/domain/schemas/events.js"
import { ObsRequestError } from "../../src/obs/errors.js"
import { createObsEventBuffer } from "../../src/obs/events.js"
import {
  decodeEventEnvelope,
  decodeJsonTextEnvelope,
  EventSubscription,
  HIGH_VOLUME_EVENT_SUBSCRIPTIONS,
  OP_REQUEST_RESPONSE,
  SAFE_EVENT_SUBSCRIPTION_MASK,
  shouldSurfaceSafeEvent
} from "../../src/obs/protocol.js"

type EventLedgerStatus = "typed-safe" | "high-volume" | "raw-only" | "deferred"

interface MatrixEventRow {
  readonly name: string
  readonly official: {
    readonly eventSubscription: keyof typeof EventSubscription
  }
}

const matrix = JSON.parse(
  readFileSync(new URL("../../plans/obs-websocket-surface-matrix.json", import.meta.url), "utf8")
) as { readonly events: ReadonlyArray<MatrixEventRow> }

const EVENT_LEDGER = {
  CanvasCreated: "deferred",
  CanvasRemoved: "deferred",
  CanvasNameChanged: "deferred",
  CurrentSceneCollectionChanging: "typed-safe",
  CurrentSceneCollectionChanged: "typed-safe",
  SceneCollectionListChanged: "typed-safe",
  CurrentProfileChanging: "typed-safe",
  CurrentProfileChanged: "typed-safe",
  ProfileListChanged: "typed-safe",
  SourceFilterListReindexed: "deferred",
  SourceFilterCreated: "deferred",
  SourceFilterRemoved: "deferred",
  SourceFilterNameChanged: "deferred",
  SourceFilterSettingsChanged: "deferred",
  SourceFilterEnableStateChanged: "deferred",
  ExitStarted: "typed-safe",
  InputCreated: "deferred",
  InputRemoved: "typed-safe",
  InputNameChanged: "typed-safe",
  InputSettingsChanged: "deferred",
  InputActiveStateChanged: "high-volume",
  InputShowStateChanged: "high-volume",
  InputMuteStateChanged: "typed-safe",
  InputVolumeChanged: "typed-safe",
  InputAudioBalanceChanged: "typed-safe",
  InputAudioSyncOffsetChanged: "typed-safe",
  InputAudioTracksChanged: "typed-safe",
  InputAudioMonitorTypeChanged: "typed-safe",
  InputVolumeMeters: "high-volume",
  MediaInputPlaybackStarted: "typed-safe",
  MediaInputPlaybackEnded: "typed-safe",
  MediaInputActionTriggered: "typed-safe",
  StreamStateChanged: "typed-safe",
  RecordStateChanged: "typed-safe",
  RecordFileChanged: "deferred",
  ReplayBufferStateChanged: "typed-safe",
  VirtualcamStateChanged: "deferred",
  ReplayBufferSaved: "typed-safe",
  SceneItemCreated: "typed-safe",
  SceneItemRemoved: "typed-safe",
  SceneItemListReindexed: "typed-safe",
  SceneItemEnableStateChanged: "typed-safe",
  SceneItemLockStateChanged: "typed-safe",
  SceneItemSelected: "typed-safe",
  SceneItemTransformChanged: "high-volume",
  SceneCreated: "typed-safe",
  SceneRemoved: "typed-safe",
  SceneNameChanged: "typed-safe",
  CurrentProgramSceneChanged: "typed-safe",
  CurrentPreviewSceneChanged: "typed-safe",
  SceneListChanged: "typed-safe",
  CurrentSceneTransitionChanged: "deferred",
  CurrentSceneTransitionDurationChanged: "deferred",
  SceneTransitionStarted: "deferred",
  SceneTransitionEnded: "deferred",
  SceneTransitionVideoEnded: "deferred",
  StudioModeStateChanged: "deferred",
  ScreenshotSaved: "deferred",
  VendorEvent: "raw-only",
  CustomEvent: "raw-only"
} satisfies Record<string, EventLedgerStatus>
const EVENT_LEDGER_BY_NAME: Record<string, EventLedgerStatus> = EVENT_LEDGER

const TYPED_EVENT_FIXTURES = {
  CurrentSceneCollectionChanging: { sceneCollectionName: "Collection A" },
  CurrentSceneCollectionChanged: { sceneCollectionName: "Collection B" },
  SceneCollectionListChanged: { sceneCollections: ["Collection A", "Collection B"] },
  CurrentProfileChanging: { profileName: "Profile A" },
  CurrentProfileChanged: { profileName: "Profile B" },
  ProfileListChanged: { profiles: ["Profile A", "Profile B"] },
  ExitStarted: {},
  SceneCreated: { sceneName: "Program", sceneUuid: "scene-program", isGroup: false },
  SceneRemoved: { sceneName: "Group", sceneUuid: "scene-group", isGroup: true },
  SceneNameChanged: { sceneUuid: "scene-program", oldSceneName: "Old Program", sceneName: "Program" },
  CurrentProgramSceneChanged: { sceneName: "Program", sceneUuid: "scene-program" },
  CurrentPreviewSceneChanged: { sceneName: "Preview", sceneUuid: "scene-preview" },
  SceneListChanged: { scenes: [{ sceneName: "Program", sceneUuid: "scene-program", sceneIndex: 0 }] },
  SceneItemCreated: {
    sceneName: "Program",
    sceneUuid: "scene-program",
    sourceName: "Camera",
    sourceUuid: "source-camera",
    sceneItemId: 12,
    sceneItemIndex: 1
  },
  SceneItemRemoved: {
    sceneName: "Program",
    sceneUuid: "scene-program",
    sourceName: "Camera",
    sourceUuid: "source-camera",
    sceneItemId: 12
  },
  SceneItemListReindexed: {
    sceneName: "Program",
    sceneUuid: "scene-program",
    sceneItems: [
      { sceneItemId: 12, sceneItemIndex: 0 },
      { sceneItemId: 13, sceneItemIndex: 1 }
    ]
  },
  SceneItemEnableStateChanged: {
    sceneName: "Program",
    sceneUuid: "scene-program",
    sceneItemId: 12,
    sceneItemEnabled: true
  },
  SceneItemLockStateChanged: {
    sceneName: "Program",
    sceneUuid: "scene-program",
    sceneItemId: 12,
    sceneItemLocked: true
  },
  SceneItemSelected: { sceneName: "Program", sceneUuid: "scene-program", sceneItemId: 12 },
  InputRemoved: { inputName: "Camera", inputUuid: "input-camera" },
  InputNameChanged: { inputUuid: "input-camera", oldInputName: "Old Camera", inputName: "Camera" },
  InputMuteStateChanged: { inputName: "Mic", inputUuid: "input-mic", inputMuted: true },
  InputVolumeChanged: { inputName: "Mic", inputUuid: "input-mic", inputVolumeMul: 0.5, inputVolumeDb: -6 },
  InputAudioBalanceChanged: { inputName: "Mic", inputUuid: "input-mic", inputAudioBalance: 0.25 },
  InputAudioSyncOffsetChanged: { inputName: "Mic", inputUuid: "input-mic", inputAudioSyncOffset: 120 },
  InputAudioTracksChanged: {
    inputName: "Mic",
    inputUuid: "input-mic",
    inputAudioTracks: { "1": true, "2": false, "3": false, "4": false, "5": false, "6": false }
  },
  InputAudioMonitorTypeChanged: {
    inputName: "Mic",
    inputUuid: "input-mic",
    monitorType: "OBS_MONITORING_TYPE_MONITOR_ONLY"
  },
  StreamStateChanged: { outputActive: true, outputState: "OBS_WEBSOCKET_OUTPUT_STARTED" },
  RecordStateChanged: { outputActive: false, outputState: "OBS_WEBSOCKET_OUTPUT_STOPPED", outputPath: null },
  ReplayBufferStateChanged: { outputActive: true, outputState: "OBS_WEBSOCKET_OUTPUT_STARTED" },
  ReplayBufferSaved: { savedReplayPath: "/tmp/replay.mkv" },
  MediaInputPlaybackStarted: { inputName: "Media", inputUuid: "input-media" },
  MediaInputPlaybackEnded: { inputName: "Media", inputUuid: "input-media" },
  MediaInputActionTriggered: {
    inputName: "Media",
    inputUuid: "input-media",
    mediaAction: "OBS_WEBSOCKET_MEDIA_INPUT_ACTION_PAUSE"
  }
} as const

const envelopeFor = (event: MatrixEventRow, eventData: Record<string, unknown> = {}) =>
  decodeEventEnvelope(JSON.stringify({
    op: 5,
    d: {
      eventType: event.name,
      eventIntent: EventSubscription[event.official.eventSubscription],
      eventData
    }
  }))

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
  it("maps every official matrix event row to the current event policy ledger", () => {
    expect(matrix.events).toHaveLength(60)
    expect(new Set(matrix.events.map((event) => event.name)).size).toBe(matrix.events.length)

    const ledgerNames = Object.keys(EVENT_LEDGER)
    expect(ledgerNames.toSorted()).toEqual(matrix.events.map((event) => event.name).toSorted())
    expect(
      Object.entries(EVENT_LEDGER).reduce<Record<EventLedgerStatus, number>>(
        (counts, [, status]) => ({ ...counts, [status]: counts[status] + 1 }),
        { "typed-safe": 0, "high-volume": 0, "raw-only": 0, deferred: 0 }
      )
    ).toEqual({
      "typed-safe": 34,
      "high-volume": 4,
      "raw-only": 2,
      deferred: 20
    })

    for (const event of matrix.events) {
      const status = EVENT_LEDGER_BY_NAME[event.name]
      const eventIntent = EventSubscription[event.official.eventSubscription]
      expect(eventIntent, event.name).toBeGreaterThan(0)

      if (status === "typed-safe") {
        const fixture = TYPED_EVENT_FIXTURES[event.name as keyof typeof TYPED_EVENT_FIXTURES]
        expect(fixture, event.name).toBeDefined()
        const envelope = envelopeFor(event, fixture)
        expect(shouldSurfaceSafeEvent(envelope), event.name).toBe(true)
        expect(decodeTypedObsEventData(event.name, fixture), event.name).toEqual(fixture)

        const buffer = createObsEventBuffer()
        buffer.record(envelope)
        expect(buffer.snapshot().events).toEqual([{
          sequence: 1,
          eventType: event.name,
          eventIntent,
          eventData: fixture
        }])
        continue
      }

      expect(decodeTypedObsEventData(event.name, {}), event.name).toBeUndefined()

      if (status === "high-volume") {
        expect(HIGH_VOLUME_EVENT_SUBSCRIPTIONS).toContain(event.name)
        expect(SAFE_EVENT_SUBSCRIPTION_MASK & eventIntent, event.name).toBe(0)
        expect(shouldSurfaceSafeEvent(envelopeFor(event)), event.name).toBe(false)
        const buffer = createObsEventBuffer()
        buffer.record(envelopeFor(event))
        expect(buffer.snapshot().events, event.name).toEqual([])
        continue
      }

      if (status === "raw-only") {
        expect(["VendorEvent", "CustomEvent"]).toContain(event.name)
        expect(shouldSurfaceSafeEvent(envelopeFor(event)), event.name).toBe(false)
        continue
      }

      expect(SAFE_EVENT_SUBSCRIPTION_MASK & eventIntent, event.name).toBe(eventIntent)
      expect(shouldSurfaceSafeEvent(envelopeFor(event)), event.name).toBe(true)
      const buffer = createObsEventBuffer()
      buffer.record(envelopeFor(event))
      expect(buffer.snapshot().events).toEqual([{
        sequence: 1,
        eventType: event.name,
        eventIntent,
        eventData: undefined
      }])
    }
  })

  it("decodes typed low-volume event payloads", () => {
    const cases = [
      ["CurrentSceneCollectionChanging", { sceneCollectionName: "Collection A" }],
      ["CurrentSceneCollectionChanged", { sceneCollectionName: "Collection B" }],
      ["SceneCollectionListChanged", { sceneCollections: ["Collection A", "Collection B"] }],
      ["CurrentProfileChanging", { profileName: "Profile A" }],
      ["CurrentProfileChanged", { profileName: "Profile B" }],
      ["ProfileListChanged", { profiles: ["Profile A", "Profile B"] }],
      ["ExitStarted", {}],
      ["SceneCreated", { sceneName: "Program", sceneUuid: "scene-program", isGroup: false }],
      ["SceneRemoved", { sceneName: "Group", sceneUuid: "scene-group", isGroup: true }],
      ["SceneNameChanged", { sceneUuid: "scene-program", oldSceneName: "Old Program", sceneName: "Program" }],
      ["CurrentProgramSceneChanged", { sceneName: "Program", sceneUuid: "scene-program" }],
      ["CurrentPreviewSceneChanged", { sceneName: "Preview", sceneUuid: "scene-preview" }],
      ["SceneListChanged", { scenes: [{ sceneName: "Program", sceneUuid: "scene-program", sceneIndex: 0 }] }],
      [
        "SceneItemCreated",
        {
          sceneName: "Program",
          sceneUuid: "scene-program",
          sourceName: "Camera",
          sourceUuid: "source-camera",
          sceneItemId: 12,
          sceneItemIndex: 1
        }
      ],
      [
        "SceneItemRemoved",
        {
          sceneName: "Program",
          sceneUuid: "scene-program",
          sourceName: "Camera",
          sourceUuid: "source-camera",
          sceneItemId: 12
        }
      ],
      [
        "SceneItemListReindexed",
        {
          sceneName: "Program",
          sceneUuid: "scene-program",
          sceneItems: [
            { sceneItemId: 12, sceneItemIndex: 0 },
            { sceneItemId: 13, sceneItemIndex: 1 }
          ]
        }
      ],
      [
        "SceneItemEnableStateChanged",
        { sceneName: "Program", sceneUuid: "scene-program", sceneItemId: 12, sceneItemEnabled: true }
      ],
      [
        "SceneItemLockStateChanged",
        { sceneName: "Program", sceneUuid: "scene-program", sceneItemId: 12, sceneItemLocked: true }
      ],
      ["SceneItemSelected", { sceneName: "Program", sceneUuid: "scene-program", sceneItemId: 12 }],
      ["InputRemoved", { inputName: "Camera", inputUuid: "input-camera" }],
      ["InputNameChanged", { inputUuid: "input-camera", oldInputName: "Old Camera", inputName: "Camera" }],
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
    expect(decodeTypedObsEventData("ExitStarted", undefined)).toEqual({})
  })

  it("rejects malformed typed low-volume event payloads", () => {
    expect(() => decodeTypedObsEventData("SceneCollectionListChanged", { sceneCollections: [1] })).toThrow()
    expect(() => decodeTypedObsEventData("CurrentProfileChanged", { sceneCollectionName: "Profile" })).toThrow()
    expect(() => decodeTypedObsEventData("ExitStarted", { raw: true })).toThrow()
    expect(() => decodeTypedObsEventData("SceneCreated", { sceneName: "Program", sceneUuid: "scene-program" }))
      .toThrow()
    expect(() =>
      decodeTypedObsEventData("SceneItemListReindexed", {
        sceneName: "Program",
        sceneUuid: "scene-program",
        sceneItems: [{ sceneItemId: 12, rawIndex: 0 }]
      })
    ).toThrow()
    expect(() => decodeTypedObsEventData("InputNameChanged", { inputUuid: "input-camera", inputName: "Camera" }))
      .toThrow()
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
    expect(decodeTypedObsEventData("InputCreated", {
      inputName: "Camera",
      inputUuid: "input-camera",
      inputKind: "dshow_input",
      unversionedInputKind: "dshow_input",
      inputKindCaps: 1,
      inputSettings: { secret: true },
      defaultInputSettings: { secret: false }
    })).toBeUndefined()
    expect(decodeTypedObsEventData("InputSettingsChanged", {
      inputName: "Camera",
      inputUuid: "input-camera",
      inputSettings: { secret: true }
    })).toBeUndefined()
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
