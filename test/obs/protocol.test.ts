import { readFileSync } from "node:fs"

import { Schema } from "effect"
import { describe, expect, it } from "vitest"

import {
  CanvasInventoryChangeEventSummary,
  ConfigWorkflowEventSummary,
  ConfirmObsCanvasInventoryChangeInput,
  ConfirmObsCanvasInventoryChangeOutput,
  ConfirmObsConfigWorkflowInput,
  ConfirmObsConfigWorkflowOutput,
  ConfirmObsInputAudioChangeInput,
  ConfirmObsInputAudioChangeOutput,
  ConfirmObsInputIdentityChangeInput,
  ConfirmObsInputIdentityChangeOutput,
  ConfirmObsMediaInputWorkflowInput,
  ConfirmObsMediaInputWorkflowOutput,
  ConfirmObsSceneGraphChangeInput,
  ConfirmObsSceneGraphChangeOutput,
  ConfirmObsSourceFilterChangeInput,
  ConfirmObsSourceFilterChangeOutput,
  ConfirmObsStudioModeStateChangeInput,
  ConfirmObsStudioModeStateChangeOutput,
  ConfirmObsTransitionWorkflowInput,
  ConfirmObsTransitionWorkflowOutput,
  decodeTypedObsEventData,
  EventSequence,
  InputAudioChangeEventSummary,
  InputIdentityChangeEventSummary,
  MediaInputWorkflowEventSummary,
  OutputLifecycleEventSummary,
  SceneGraphChangeEventSummary,
  SourceFilterChangeEventSummary,
  StudioModeStateChangeEventSummary,
  TransitionWorkflowEventSummary
} from "../../src/domain/schemas/events.js"
import { ObsRequestError } from "../../src/obs/errors.js"
import { createObsEventBuffer } from "../../src/obs/events.js"
import {
  decodeEventEnvelope,
  decodeJsonTextEnvelope,
  eventMatchesOfficialSubscription,
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

interface MatrixRequestRow {
  readonly name: string
}

const matrix = JSON.parse(
  readFileSync(new URL("../../plans/obs-websocket-surface-matrix.json", import.meta.url), "utf8")
) as { readonly events: ReadonlyArray<MatrixEventRow>; readonly requests: ReadonlyArray<MatrixRequestRow> }

const EVENT_LEDGER = {
  CanvasCreated: "typed-safe",
  CanvasRemoved: "typed-safe",
  CanvasNameChanged: "typed-safe",
  CurrentSceneCollectionChanging: "typed-safe",
  CurrentSceneCollectionChanged: "typed-safe",
  SceneCollectionListChanged: "typed-safe",
  CurrentProfileChanging: "typed-safe",
  CurrentProfileChanged: "typed-safe",
  ProfileListChanged: "typed-safe",
  SourceFilterListReindexed: "typed-safe",
  SourceFilterCreated: "typed-safe",
  SourceFilterRemoved: "typed-safe",
  SourceFilterNameChanged: "typed-safe",
  SourceFilterSettingsChanged: "typed-safe",
  SourceFilterEnableStateChanged: "typed-safe",
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
  RecordFileChanged: "typed-safe",
  ReplayBufferStateChanged: "typed-safe",
  VirtualcamStateChanged: "typed-safe",
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
  CurrentSceneTransitionChanged: "typed-safe",
  CurrentSceneTransitionDurationChanged: "typed-safe",
  SceneTransitionStarted: "typed-safe",
  SceneTransitionEnded: "typed-safe",
  SceneTransitionVideoEnded: "typed-safe",
  StudioModeStateChanged: "typed-safe",
  ScreenshotSaved: "typed-safe",
  VendorEvent: "raw-only",
  CustomEvent: "raw-only"
} satisfies Record<string, EventLedgerStatus>
const EVENT_LEDGER_BY_NAME: Record<string, EventLedgerStatus> = EVENT_LEDGER

const RAW_BATCH_SURFACE_LEDGER = {
  GetPersistentData: { status: "admin-raw", tool: "get_persistent_data" },
  SetPersistentData: { status: "admin-raw", tool: "set_persistent_data" },
  CallVendorRequest: { status: "vendor", tool: "call_vendor_request" },
  BroadcastCustomEvent: { status: "vendor", tool: "broadcast_custom_event" },
  RequestBatch: { status: "batch-op", tool: "run_obs_request_batch" },
  Sleep: { status: "batch-only", tool: "run_obs_request_batch" }
} as const

const TYPED_EVENT_FIXTURES = {
  CanvasCreated: { canvasName: "Canvas A", canvasUuid: "canvas-a" },
  CanvasRemoved: { canvasName: "Canvas B", canvasUuid: "canvas-b" },
  CanvasNameChanged: { canvasUuid: "canvas-a", oldCanvasName: "Old Canvas", canvasName: "Canvas A" },
  CurrentSceneCollectionChanging: { sceneCollectionName: "Collection A" },
  CurrentSceneCollectionChanged: { sceneCollectionName: "Collection B" },
  SceneCollectionListChanged: { sceneCollections: ["Collection A", "Collection B"] },
  CurrentProfileChanging: { profileName: "Profile A" },
  CurrentProfileChanged: { profileName: "Profile B" },
  ProfileListChanged: { profiles: ["Profile A", "Profile B"] },
  SourceFilterListReindexed: {
    sourceName: "Camera",
    filters: [
      { filterName: "Color", filterIndex: 0 },
      { filterName: "Crop", filterIndex: 1 }
    ]
  },
  SourceFilterCreated: { sourceName: "Camera", filterName: "Color", filterKind: "color_filter", filterIndex: 0 },
  SourceFilterRemoved: { sourceName: "Camera", filterName: "Color" },
  SourceFilterNameChanged: { sourceName: "Camera", oldFilterName: "Old Color", filterName: "Color" },
  SourceFilterSettingsChanged: { sourceName: "Camera", filterName: "Color" },
  SourceFilterEnableStateChanged: { sourceName: "Camera", filterName: "Color", filterEnabled: true },
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
  RecordFileChanged: { newOutputPath: "/tmp/recording-2.mkv" },
  ReplayBufferStateChanged: { outputActive: true, outputState: "OBS_WEBSOCKET_OUTPUT_STARTED" },
  VirtualcamStateChanged: { outputActive: true, outputState: "OBS_WEBSOCKET_OUTPUT_STARTED" },
  ReplayBufferSaved: { savedReplayPath: "/tmp/replay.mkv" },
  CurrentSceneTransitionChanged: { transitionName: "Fade", transitionUuid: "transition-fade" },
  CurrentSceneTransitionDurationChanged: { transitionDuration: 300 },
  SceneTransitionStarted: { transitionName: "Fade", transitionUuid: "transition-fade" },
  SceneTransitionEnded: { transitionName: "Fade", transitionUuid: "transition-fade" },
  SceneTransitionVideoEnded: { transitionName: "Fade", transitionUuid: "transition-fade" },
  StudioModeStateChanged: { studioModeEnabled: true },
  ScreenshotSaved: { savedScreenshotPath: "/tmp/screenshot.png" },
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
      "typed-safe": 52,
      "high-volume": 4,
      "raw-only": 2,
      deferred: 2
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

  it("documents final raw, vendor, persistent, and batch protocol surface policy", () => {
    const requestNames = new Set(matrix.requests.map((request) => request.name))
    for (
      const requestName of [
        "GetPersistentData",
        "SetPersistentData",
        "CallVendorRequest",
        "BroadcastCustomEvent",
        "Sleep"
      ]
    ) {
      expect(requestNames.has(requestName), requestName).toBe(true)
    }

    expect(RAW_BATCH_SURFACE_LEDGER).toEqual({
      GetPersistentData: { status: "admin-raw", tool: "get_persistent_data" },
      SetPersistentData: { status: "admin-raw", tool: "set_persistent_data" },
      CallVendorRequest: { status: "vendor", tool: "call_vendor_request" },
      BroadcastCustomEvent: { status: "vendor", tool: "broadcast_custom_event" },
      RequestBatch: { status: "batch-op", tool: "run_obs_request_batch" },
      Sleep: { status: "batch-only", tool: "run_obs_request_batch" }
    })
  })

  it("decodes typed low-volume event payloads", () => {
    const cases = [
      ["CanvasCreated", { canvasName: "Canvas A", canvasUuid: "canvas-a" }],
      ["CanvasRemoved", { canvasName: "Canvas B", canvasUuid: "canvas-b" }],
      ["CanvasNameChanged", { canvasUuid: "canvas-a", oldCanvasName: "Old Canvas", canvasName: "Canvas A" }],
      ["CurrentSceneCollectionChanging", { sceneCollectionName: "Collection A" }],
      ["CurrentSceneCollectionChanged", { sceneCollectionName: "Collection B" }],
      ["SceneCollectionListChanged", { sceneCollections: ["Collection A", "Collection B"] }],
      ["CurrentProfileChanging", { profileName: "Profile A" }],
      ["CurrentProfileChanged", { profileName: "Profile B" }],
      ["ProfileListChanged", { profiles: ["Profile A", "Profile B"] }],
      [
        "SourceFilterListReindexed",
        {
          sourceName: "Camera",
          filters: [
            { filterName: "Color", filterIndex: 0 },
            { filterName: "Crop", filterIndex: 1 }
          ]
        }
      ],
      ["SourceFilterCreated", {
        sourceName: "Camera",
        filterName: "Color",
        filterKind: "color_filter",
        filterIndex: 0
      }],
      ["SourceFilterRemoved", { sourceName: "Camera", filterName: "Color" }],
      ["SourceFilterNameChanged", { sourceName: "Camera", oldFilterName: "Old Color", filterName: "Color" }],
      ["SourceFilterSettingsChanged", { sourceName: "Camera", filterName: "Color" }],
      ["SourceFilterEnableStateChanged", { sourceName: "Camera", filterName: "Color", filterEnabled: true }],
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
      ["RecordFileChanged", { newOutputPath: "/tmp/recording-2.mkv" }],
      ["ReplayBufferStateChanged", { outputActive: true, outputState: "OBS_WEBSOCKET_OUTPUT_STARTED" }],
      ["VirtualcamStateChanged", { outputActive: true, outputState: "OBS_WEBSOCKET_OUTPUT_STARTED" }],
      ["ReplayBufferSaved", { savedReplayPath: "/tmp/replay.mkv" }],
      ["CurrentSceneTransitionChanged", { transitionName: "Fade", transitionUuid: "transition-fade" }],
      ["CurrentSceneTransitionDurationChanged", { transitionDuration: 300 }],
      ["SceneTransitionStarted", { transitionName: "Fade", transitionUuid: "transition-fade" }],
      ["SceneTransitionEnded", { transitionName: "Fade", transitionUuid: "transition-fade" }],
      ["SceneTransitionVideoEnded", { transitionName: "Fade", transitionUuid: "transition-fade" }],
      ["StudioModeStateChanged", { studioModeEnabled: true }],
      ["ScreenshotSaved", { savedScreenshotPath: "/tmp/screenshot.png" }],
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
    expect(() => decodeTypedObsEventData("CanvasNameChanged", { canvasName: "Canvas A" })).toThrow()
    expect(() =>
      decodeTypedObsEventData("CanvasCreated", {
        canvasName: "Canvas A",
        canvasUuid: "canvas-a",
        rawCanvasField: true
      })
    ).toThrow()
    expect(() => decodeTypedObsEventData("SceneCollectionListChanged", { sceneCollections: [1] })).toThrow()
    expect(() => decodeTypedObsEventData("CurrentProfileChanged", { sceneCollectionName: "Profile" })).toThrow()
    for (const filterIndex of [-1, 1.5, Number.MAX_SAFE_INTEGER + 1]) {
      expect(() =>
        decodeTypedObsEventData("SourceFilterCreated", {
          sourceName: "Camera",
          filterName: "Color",
          filterKind: "color_filter",
          filterIndex
        })
      ).toThrow()
      expect(() =>
        decodeTypedObsEventData("SourceFilterListReindexed", {
          sourceName: "Camera",
          filters: [{ filterName: "Color", filterIndex }]
        })
      ).toThrow()
    }
    expect(() =>
      decodeTypedObsEventData("SourceFilterEnableStateChanged", {
        sourceName: "Camera",
        filterName: "Color",
        filterEnabled: "yes"
      })
    ).toThrow()
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
    expect(() =>
      decodeTypedObsEventData("SceneItemCreated", {
        sceneName: "Program",
        sceneUuid: "scene-program",
        sourceName: "Camera",
        sourceUuid: "source-camera",
        sceneItemId: -1,
        sceneItemIndex: 0
      })
    ).toThrow()
    expect(() =>
      decodeTypedObsEventData("SceneItemRemoved", {
        sceneName: "Program",
        sceneUuid: "scene-program",
        sourceName: "Camera",
        sourceUuid: "source-camera",
        sceneItemId: 1.25
      })
    ).toThrow()
    expect(() =>
      decodeTypedObsEventData("SceneItemListReindexed", {
        sceneName: "Program",
        sceneUuid: "scene-program",
        sceneItems: [{ sceneItemId: 12, sceneItemIndex: -1 }]
      })
    ).toThrow()
    expect(() => decodeTypedObsEventData("InputNameChanged", { inputUuid: "input-camera", inputName: "Camera" }))
      .toThrow()
    expect(() =>
      decodeTypedObsEventData("InputRemoved", {
        inputName: "Camera",
        inputUuid: "input-camera",
        inputSettings: { secret: true }
      })
    ).toThrow()
    expect(() =>
      decodeTypedObsEventData("InputNameChanged", {
        inputUuid: "input-camera",
        oldInputName: "Old Camera",
        inputName: "Camera",
        inputKind: "dshow_input"
      })
    ).toThrow()
    expect(() => decodeTypedObsEventData("InputMuteStateChanged", { inputName: "Mic", inputMuted: true })).toThrow()
    expect(() =>
      decodeTypedObsEventData("InputVolumeChanged", {
        inputName: "Mic",
        inputUuid: "input-mic",
        inputVolumeMul: 0.5,
        inputVolumeDb: -6,
        inputSettings: { secret: true }
      })
    ).toThrow()
    expect(() =>
      decodeTypedObsEventData("InputAudioTracksChanged", {
        inputName: "Mic",
        inputUuid: "input-mic",
        inputAudioTracks: { "1": true, "2": false, "3": false, "4": false, "5": false, "6": false, "7": true }
      })
    ).toThrow()
    expect(() => decodeTypedObsEventData("RecordFileChanged", { outputPath: "/tmp/recording.mkv" })).toThrow()
    expect(() => decodeTypedObsEventData("CurrentSceneTransitionDurationChanged", { transitionDuration: -1 }))
      .toThrow()
    for (const transitionDuration of [0, 49, 20001]) {
      expect(() => decodeTypedObsEventData("CurrentSceneTransitionDurationChanged", { transitionDuration }))
        .not.toThrow()
    }
    expect(() => decodeTypedObsEventData("CurrentSceneTransitionDurationChanged", { transitionDuration: 300.5 }))
      .toThrow()
    expect(() =>
      decodeTypedObsEventData("CurrentSceneTransitionDurationChanged", {
        transitionDuration: 300,
        transitionName: "Fade"
      })
    ).toThrow()
    expect(() =>
      decodeTypedObsEventData("SceneTransitionStarted", {
        transitionName: "Fade",
        transitionUuid: "transition-fade",
        position: 0.5
      })
    ).toThrow()
    expect(() =>
      decodeTypedObsEventData("MediaInputActionTriggered", {
        inputName: "Media",
        inputUuid: "input-media",
        mediaAction: "OBS_WEBSOCKET_MEDIA_INPUT_ACTION_UNKNOWN"
      })
    ).toThrow()
    expect(() =>
      decodeTypedObsEventData("MediaInputActionTriggered", {
        inputName: "Media",
        inputUuid: "input-media",
        mediaAction: "OBS_WEBSOCKET_MEDIA_INPUT_ACTION_NONE"
      })
    ).not.toThrow()
    expect(() =>
      decodeTypedObsEventData("MediaInputPlaybackEnded", {
        inputName: "Media",
        inputUuid: "input-media",
        mediaCursor: 1000
      })
    ).toThrow()
    expect(() =>
      decodeTypedObsEventData("MediaInputActionTriggered", {
        inputName: "Media",
        inputUuid: "input-media",
        mediaAction: "OBS_WEBSOCKET_MEDIA_INPUT_ACTION_PLAY",
        mediaState: "OBS_MEDIA_STATE_PLAYING"
      })
    ).toThrow()
    expect(() =>
      decodeTypedObsEventData("StudioModeStateChanged", {
        studioModeEnabled: true,
        savedScreenshotPath: "/tmp/screenshot.png"
      })
    ).toThrow()
  })

  it("matches event types to their official event subscriptions", () => {
    expect(eventMatchesOfficialSubscription("InputNameChanged", EventSubscription.Inputs)).toBe(true)
    expect(eventMatchesOfficialSubscription("MediaInputPlaybackStarted", EventSubscription.MediaInputs)).toBe(true)
    expect(eventMatchesOfficialSubscription("InputNameChanged", EventSubscription.General)).toBe(false)
    expect(eventMatchesOfficialSubscription("MediaInputPlaybackStarted", EventSubscription.Inputs)).toBe(false)
    expect(eventMatchesOfficialSubscription("MysteryEvent", EventSubscription.General)).toBe(false)
  })

  it("sanitizes raw filter settings from typed filter events", () => {
    expect(decodeTypedObsEventData("SourceFilterCreated", {
      sourceName: "Camera",
      filterName: "Color",
      filterKind: "color_filter",
      filterIndex: 0,
      filterSettings: { secret: true },
      defaultFilterSettings: { secret: false }
    })).toEqual({
      sourceName: "Camera",
      filterName: "Color",
      filterKind: "color_filter",
      filterIndex: 0
    })
    expect(decodeTypedObsEventData("SourceFilterSettingsChanged", {
      sourceName: "Camera",
      filterName: "Color",
      filterSettings: { secret: true }
    })).toEqual({ sourceName: "Camera", filterName: "Color" })
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

  it("snapshots buffered events with cursor metadata and missed-event detection", () => {
    const buffer = createObsEventBuffer({ capacity: 2 })
    const event = matrix.events.find((row) => row.name === "CurrentProgramSceneChanged")
    expect(event).toBeDefined()
    if (event === undefined) return

    buffer.record(envelopeFor(event, { sceneName: "Scene 1", sceneUuid: "scene-1" }))
    buffer.record(envelopeFor(event, { sceneName: "Scene 2", sceneUuid: "scene-2" }))
    buffer.record(envelopeFor(event, { sceneName: "Scene 3", sceneUuid: "scene-3" }))

    expect(buffer.snapshot({ sinceSequence: 1 })).toMatchObject({
      capacity: 2,
      droppedEvents: 1,
      oldestSequence: 2,
      latestSequence: 3,
      missedEvents: false,
      events: [
        { sequence: 2, eventData: { sceneName: "Scene 2", sceneUuid: "scene-2" } },
        { sequence: 3, eventData: { sceneName: "Scene 3", sceneUuid: "scene-3" } }
      ]
    })
    expect(buffer.snapshot({ sinceSequence: 0 })).toMatchObject({
      oldestSequence: 2,
      latestSequence: 3,
      missedEvents: true
    })
  })

  it("waits for matching buffered events and rejects waiters when closed", async () => {
    const buffer = createObsEventBuffer({ capacity: 2 })
    const event = matrix.events.find((row) => row.name === "RecordStateChanged")
    expect(event).toBeDefined()
    if (event === undefined) return

    const wait = buffer.waitFor(
      (entry) => entry.eventType === "RecordStateChanged" && entry.sequence > 0,
      { afterSequence: 0, timeoutMs: 50 }
    )
    buffer.record(envelopeFor(event, {
      outputActive: false,
      outputState: "OBS_WEBSOCKET_OUTPUT_STOPPED",
      outputPath: "/tmp/recording.mkv"
    }))

    await expect(wait).resolves.toMatchObject({
      timedOut: false,
      baselineSequence: 0,
      event: { sequence: 1, eventType: "RecordStateChanged" },
      snapshot: { latestSequence: 1, missedEvents: false }
    })

    const closed = buffer.waitFor(() => false, { afterSequence: 1, timeoutMs: 50 })
    buffer.close(new Error("closed"))
    await expect(closed).rejects.toThrow("closed")
    await expect(buffer.waitFor(() => false, { afterSequence: 1, timeoutMs: 50 })).rejects.toThrow("closed")
  })

  it("validates scene graph confirmation input variants", () => {
    const validInputs = [
      { target: "scene", outcome: "created", afterSequence: 0, sceneName: "Program", sceneUuid: "scene-program" },
      { target: "scene", outcome: "removed", afterSequence: 1, sceneName: "Program" },
      {
        target: "scene",
        outcome: "renamed",
        afterSequence: 1,
        oldSceneName: "Old Program",
        sceneName: "Program",
        sceneUuid: "scene-program"
      },
      { target: "current_program_scene", outcome: "changed", afterSequence: 1, sceneName: "Program" },
      { target: "current_preview_scene", outcome: "changed", afterSequence: 1, sceneUuid: "scene-preview" },
      {
        target: "scene_item",
        outcome: "created",
        afterSequence: 1,
        sceneName: "Program",
        sourceName: "Camera",
        sourceUuid: "source-camera",
        sceneItemId: 12
      },
      {
        target: "scene_item",
        outcome: "removed",
        afterSequence: 1,
        sceneUuid: "scene-program",
        sourceName: "Camera",
        sceneItemId: 12
      },
      { target: "scene_item", outcome: "reordered", afterSequence: 1, sceneName: "Program", sceneItemId: 12 },
      { target: "scene_item", outcome: "enabled", afterSequence: 1, sceneName: "Program", sceneItemId: 12 },
      { target: "scene_item", outcome: "disabled", afterSequence: 1, sceneName: "Program", sceneItemId: 12 },
      { target: "scene_item", outcome: "locked", afterSequence: 1, sceneName: "Program", sceneItemId: 12 },
      { target: "scene_item", outcome: "unlocked", afterSequence: 1, sceneName: "Program", sceneItemId: 12 }
    ] as const

    for (const input of validInputs) {
      expect(() => Schema.decodeUnknownSync(ConfirmObsSceneGraphChangeInput)(input), JSON.stringify(input))
        .not.toThrow()
    }
  })

  it("rejects invalid scene graph confirmation workflow inputs", () => {
    const invalidInputs = [
      { target: "scene", outcome: "changed", afterSequence: 0 },
      { target: "current_program_scene", outcome: "created", afterSequence: 0 },
      { target: "scene_item", outcome: "renamed", afterSequence: 0 },
      { target: "scene", outcome: "created", afterSequence: 0, oldSceneName: "Old Program" },
      { target: "scene", outcome: "renamed", afterSequence: 0, sourceName: "Camera" },
      { target: "current_preview_scene", outcome: "changed", afterSequence: 0, sceneItemId: 12 },
      { target: "scene_item", outcome: "enabled", afterSequence: 0, sourceUuid: "source-camera" },
      { target: "scene_item", outcome: "created", afterSequence: 0, oldSceneName: "Old Program" },
      { target: "scene_item", outcome: "created", afterSequence: 0, sourceName: "" },
      { target: "scene", outcome: "created", afterSequence: 0, sceneName: "" },
      { target: "scene_item", outcome: "enabled", afterSequence: 0, sceneItemId: -1 },
      { target: "scene_item", outcome: "enabled", afterSequence: 0, sceneItemId: 1.5 },
      { target: "scene_item", outcome: "enabled", afterSequence: 0, sceneItemId: Number.MAX_SAFE_INTEGER + 1 },
      { target: "scene", outcome: "created", afterSequence: 0, eventType: "SceneCreated" },
      { target: "scene", outcome: "created", afterSequence: 0, eventIntent: EventSubscription.Scenes },
      { target: "scene", outcome: "created", afterSequence: 0, payload: { raw: true } },
      { target: "scene", outcome: "created", afterSequence: 0, regex: "Program.*" }
    ] as const

    for (const input of invalidInputs) {
      expect(() => Schema.decodeUnknownSync(ConfirmObsSceneGraphChangeInput)(input), JSON.stringify(input))
        .toThrow()
    }
    expect(() => Schema.decodeUnknownSync(EventSequence)(0)).toThrow()
    expect(() =>
      Schema.decodeUnknownSync(ConfirmObsSceneGraphChangeInput)({
        target: "scene",
        outcome: "created",
        afterSequence: 0
      })
    ).not.toThrow()
  })

  it("validates canvas inventory-change confirmation input variants", () => {
    const validInputs = [
      { target: "canvas", outcome: "created", afterSequence: 0 },
      { target: "canvas", outcome: "removed", afterSequence: 1, canvasName: "Canvas A" },
      {
        target: "canvas",
        outcome: "renamed",
        afterSequence: 2,
        canvasName: "Canvas B",
        canvasUuid: "canvas-b",
        oldCanvasName: "Canvas A"
      }
    ] as const

    for (const input of validInputs) {
      expect(() => Schema.decodeUnknownSync(ConfirmObsCanvasInventoryChangeInput)(input), JSON.stringify(input))
        .not.toThrow()
    }
  })

  it("rejects invalid canvas inventory-change confirmation inputs", () => {
    const invalidInputs = [
      { target: "scene", outcome: "created", afterSequence: 0 },
      { target: "canvas", outcome: "changed", afterSequence: 0 },
      { target: "canvas", outcome: "created" },
      { target: "canvas", outcome: "created", afterSequence: 0, oldCanvasName: "Old Canvas" },
      { target: "canvas", outcome: "removed", afterSequence: 0, oldCanvasName: "Old Canvas" },
      { target: "canvas", outcome: "created", afterSequence: 0, canvasName: "" },
      { target: "canvas", outcome: "created", afterSequence: 0, canvasUuid: "" },
      { target: "canvas", outcome: "renamed", afterSequence: 0, oldCanvasName: "" },
      { target: "canvas", outcome: "created", afterSequence: 0, eventType: "CanvasCreated" },
      { target: "canvas", outcome: "created", afterSequence: 0, eventIntent: EventSubscription.Canvases },
      { target: "canvas", outcome: "created", afterSequence: 0, eventData: {} },
      { target: "canvas", outcome: "created", afterSequence: 0, payload: { raw: true } },
      { target: "canvas", outcome: "created", afterSequence: 0, regex: "Canvas.*" },
      { target: "canvas", outcome: "created", afterSequence: 0, sceneName: "Scene" },
      { target: "canvas", outcome: "created", afterSequence: 0, sourceName: "Camera" },
      { target: "canvas", outcome: "created", afterSequence: 0, inputName: "Mic" },
      { target: "canvas", outcome: "created", afterSequence: 0, transitionName: "Fade" },
      { target: "canvas", outcome: "created", afterSequence: 0, profileName: "Profile A" },
      { target: "canvas", outcome: "created", afterSequence: 0, savedScreenshotPath: "/tmp/shot.png" },
      { target: "canvas", outcome: "created", afterSequence: 0, unexpected: true }
    ] as const

    for (const input of invalidInputs) {
      expect(
        () =>
          Schema.decodeUnknownSync(
            ConfirmObsCanvasInventoryChangeInput,
            { onExcessProperty: "error" }
          )(input),
        JSON.stringify(input)
      ).toThrow()
    }
    expect(() =>
      Schema.decodeUnknownSync(ConfirmObsCanvasInventoryChangeInput)({
        target: "canvas",
        outcome: "created",
        afterSequence: 0
      })
    ).not.toThrow()
  })

  it("validates studio-mode state confirmation input variants", () => {
    const validInputs = [
      { target: "studio_mode", outcome: "enabled", afterSequence: 0 },
      { target: "studio_mode", outcome: "disabled", afterSequence: 1, timeoutMs: 10 }
    ] as const

    for (const input of validInputs) {
      expect(() => Schema.decodeUnknownSync(ConfirmObsStudioModeStateChangeInput)(input), JSON.stringify(input))
        .not.toThrow()
    }
  })

  it("rejects invalid studio-mode state confirmation inputs", () => {
    const invalidInputs = [
      { target: "ui", outcome: "enabled", afterSequence: 0 },
      { target: "studio_mode", outcome: "changed", afterSequence: 0 },
      { target: "studio_mode", outcome: "enabled" },
      { target: "studio_mode", outcome: "enabled", afterSequence: 0, studioModeEnabled: true },
      { target: "studio_mode", outcome: "enabled", afterSequence: 0, eventType: "StudioModeStateChanged" },
      { target: "studio_mode", outcome: "enabled", afterSequence: 0, eventIntent: EventSubscription.Ui },
      { target: "studio_mode", outcome: "enabled", afterSequence: 0, eventData: {} },
      { target: "studio_mode", outcome: "enabled", afterSequence: 0, payload: { raw: true } },
      { target: "studio_mode", outcome: "enabled", afterSequence: 0, regex: "Studio.*" },
      { target: "studio_mode", outcome: "enabled", afterSequence: 0, savedScreenshotPath: "/tmp/shot.png" },
      { target: "studio_mode", outcome: "enabled", afterSequence: 0, sceneName: "Program" },
      { target: "studio_mode", outcome: "enabled", afterSequence: 0, inputName: "Mic" },
      { target: "studio_mode", outcome: "enabled", afterSequence: 0, transitionName: "Fade" },
      { target: "studio_mode", outcome: "enabled", afterSequence: 0, canvasName: "Canvas A" },
      { target: "studio_mode", outcome: "enabled", afterSequence: 0, filterName: "Color" },
      { target: "studio_mode", outcome: "enabled", afterSequence: 0, outputState: "OBS_WEBSOCKET_OUTPUT_STARTED" },
      { target: "studio_mode", outcome: "enabled", afterSequence: 0, unexpected: true }
    ] as const

    for (const input of invalidInputs) {
      expect(
        () =>
          Schema.decodeUnknownSync(
            ConfirmObsStudioModeStateChangeInput,
            { onExcessProperty: "error" }
          )(input),
        JSON.stringify(input)
      ).toThrow()
    }
  })

  it("validates source filter confirmation input variants", () => {
    const validInputs = [
      {
        target: "source_filter",
        outcome: "created",
        afterSequence: 0,
        sourceName: "Camera",
        filterName: "Color",
        filterKind: "color_filter",
        filterIndex: 0
      },
      { target: "source_filter", outcome: "removed", afterSequence: 1, sourceName: "Camera", filterName: "Color" },
      {
        target: "source_filter",
        outcome: "renamed",
        afterSequence: 1,
        sourceName: "Camera",
        oldFilterName: "Old Color",
        filterName: "Color"
      },
      {
        target: "source_filter",
        outcome: "reordered",
        afterSequence: 1,
        sourceName: "Camera",
        filterName: "Color",
        filterIndex: 1
      },
      { target: "source_filter", outcome: "enabled", afterSequence: 1, sourceName: "Camera", filterName: "Color" },
      { target: "source_filter", outcome: "disabled", afterSequence: 1, sourceName: "Camera", filterName: "Color" },
      {
        target: "source_filter",
        outcome: "settings_changed",
        afterSequence: 1,
        sourceName: "Camera",
        filterName: "Color"
      }
    ] as const

    for (const input of validInputs) {
      expect(() => Schema.decodeUnknownSync(ConfirmObsSourceFilterChangeInput)(input), JSON.stringify(input))
        .not.toThrow()
    }
  })

  it("rejects invalid source filter confirmation workflow inputs", () => {
    const invalidInputs = [
      { target: "source_filter", outcome: "changed", afterSequence: 0 },
      { target: "scene_item", outcome: "created", afterSequence: 0, sourceName: "Camera" },
      { target: "source_filter", outcome: "created", afterSequence: 0, oldFilterName: "Old Color" },
      { target: "source_filter", outcome: "removed", afterSequence: 0, oldFilterName: "Old Color" },
      { target: "source_filter", outcome: "removed", afterSequence: 0, filterKind: "color_filter" },
      { target: "source_filter", outcome: "removed", afterSequence: 0, filterIndex: 0 },
      { target: "source_filter", outcome: "renamed", afterSequence: 0, filterKind: "color_filter" },
      { target: "source_filter", outcome: "renamed", afterSequence: 0, filterIndex: 0 },
      { target: "source_filter", outcome: "reordered", afterSequence: 0, oldFilterName: "Old Color" },
      { target: "source_filter", outcome: "reordered", afterSequence: 0, filterKind: "color_filter" },
      { target: "source_filter", outcome: "enabled", afterSequence: 0, filterIndex: 0 },
      { target: "source_filter", outcome: "disabled", afterSequence: 0, filterKind: "color_filter" },
      { target: "source_filter", outcome: "settings_changed", afterSequence: 0, oldFilterName: "Old Color" },
      { target: "source_filter", outcome: "created", afterSequence: 0, sourceName: "" },
      { target: "source_filter", outcome: "created", afterSequence: 0, filterName: "" },
      { target: "source_filter", outcome: "created", afterSequence: 0, filterKind: "" },
      { target: "source_filter", outcome: "renamed", afterSequence: 0, oldFilterName: "" },
      { target: "source_filter", outcome: "created", afterSequence: 0, filterIndex: -1 },
      { target: "source_filter", outcome: "created", afterSequence: 0, filterIndex: 1.5 },
      { target: "source_filter", outcome: "created", afterSequence: 0, filterIndex: Number.MAX_SAFE_INTEGER + 1 },
      { target: "source_filter", outcome: "reordered", afterSequence: 0, filterIndex: -1 },
      { target: "source_filter", outcome: "reordered", afterSequence: 0, filterIndex: 1.5 },
      { target: "source_filter", outcome: "reordered", afterSequence: 0, filterIndex: Number.MAX_SAFE_INTEGER + 1 },
      { target: "source_filter", outcome: "created", afterSequence: 0, eventType: "SourceFilterCreated" },
      { target: "source_filter", outcome: "created", afterSequence: 0, eventIntent: EventSubscription.Filters },
      { target: "source_filter", outcome: "created", afterSequence: 0, eventData: {} },
      { target: "source_filter", outcome: "created", afterSequence: 0, payload: { raw: true } },
      { target: "source_filter", outcome: "created", afterSequence: 0, regex: "Color.*" },
      { target: "source_filter", outcome: "created", afterSequence: 0, sourceUuid: "source-camera" },
      { target: "source_filter", outcome: "created", afterSequence: 0, canvasUuid: "canvas-main" },
      { target: "source_filter", outcome: "created", afterSequence: 0, filterSettings: { secret: true } },
      { target: "source_filter", outcome: "created", afterSequence: 0, defaultFilterSettings: { secret: false } },
      { target: "source_filter", outcome: "enabled", afterSequence: 0, filterEnabled: true },
      { target: "source_filter", outcome: "created", afterSequence: 0, unexpected: true }
    ] as const

    for (const input of invalidInputs) {
      expect(
        () =>
          Schema.decodeUnknownSync(
            ConfirmObsSourceFilterChangeInput,
            { onExcessProperty: "error" }
          )(input),
        JSON.stringify(input)
      )
        .toThrow()
    }
    expect(() =>
      Schema.decodeUnknownSync(ConfirmObsSourceFilterChangeInput)({
        target: "source_filter",
        outcome: "created",
        afterSequence: 0
      })
    ).not.toThrow()
  })

  it("validates media input workflow confirmation input variants", () => {
    const validInputs = [
      { target: "media_input", outcome: "playback_started", afterSequence: 0, inputName: "Media" },
      { target: "media_input", outcome: "playback_ended", afterSequence: 1, inputUuid: "input-media" },
      {
        target: "media_input",
        outcome: "action_triggered",
        afterSequence: 1,
        inputName: "Media",
        inputUuid: "input-media",
        mediaAction: "OBS_WEBSOCKET_MEDIA_INPUT_ACTION_PLAY"
      },
      {
        target: "media_input",
        outcome: "action_triggered",
        afterSequence: 1,
        mediaAction: "OBS_WEBSOCKET_MEDIA_INPUT_ACTION_PREVIOUS"
      }
    ] as const

    for (const input of validInputs) {
      expect(() => Schema.decodeUnknownSync(ConfirmObsMediaInputWorkflowInput)(input), JSON.stringify(input))
        .not.toThrow()
    }
  })

  it("rejects invalid media input workflow confirmation inputs", () => {
    const invalidInputs = [
      { target: "media_input", outcome: "created", afterSequence: 0 },
      { target: "input", outcome: "playback_started", afterSequence: 0 },
      {
        target: "media_input",
        outcome: "playback_started",
        afterSequence: 0,
        mediaAction: "OBS_WEBSOCKET_MEDIA_INPUT_ACTION_PLAY"
      },
      { target: "media_input", outcome: "action_triggered", afterSequence: 0 },
      {
        target: "media_input",
        outcome: "action_triggered",
        afterSequence: 0,
        mediaAction: "OBS_WEBSOCKET_MEDIA_INPUT_ACTION_NONE"
      },
      {
        target: "media_input",
        outcome: "action_triggered",
        afterSequence: 0,
        mediaAction: "OBS_WEBSOCKET_MEDIA_INPUT_ACTION_UNKNOWN"
      },
      { target: "media_input", outcome: "playback_started", afterSequence: 0, inputName: "" },
      { target: "media_input", outcome: "playback_started", afterSequence: 0, inputUuid: "" },
      { target: "media_input", outcome: "playback_started", afterSequence: 0, eventType: "MediaInputPlaybackStarted" },
      {
        target: "media_input",
        outcome: "playback_started",
        afterSequence: 0,
        eventIntent: EventSubscription.MediaInputs
      },
      { target: "media_input", outcome: "playback_started", afterSequence: 0, eventData: {} },
      { target: "media_input", outcome: "playback_started", afterSequence: 0, payload: { raw: true } },
      { target: "media_input", outcome: "playback_started", afterSequence: 0, regex: "Media.*" },
      { target: "media_input", outcome: "playback_started", afterSequence: 0, mediaState: "OBS_MEDIA_STATE_PLAYING" },
      { target: "media_input", outcome: "playback_started", afterSequence: 0, mediaCursor: 1 },
      { target: "media_input", outcome: "playback_started", afterSequence: 0, mediaDuration: 1 },
      { target: "media_input", outcome: "playback_started", afterSequence: 0, mediaCursorOffset: 1 },
      { target: "media_input", outcome: "playback_started", afterSequence: 0, inputSettings: { secret: true } },
      { target: "media_input", outcome: "playback_started", afterSequence: 0, defaultInputSettings: {} },
      { target: "media_input", outcome: "playback_started", afterSequence: 0, inputKind: "ffmpeg_source" },
      { target: "media_input", outcome: "playback_started", afterSequence: 0, sceneItemId: 12 },
      { target: "media_input", outcome: "playback_started", afterSequence: 0, filterName: "Color" },
      { target: "media_input", outcome: "playback_started", afterSequence: 0, sourceName: "Camera" },
      { target: "media_input", outcome: "playback_started", afterSequence: 0, unexpected: true }
    ] as const

    for (const input of invalidInputs) {
      expect(
        () =>
          Schema.decodeUnknownSync(
            ConfirmObsMediaInputWorkflowInput,
            { onExcessProperty: "error" }
          )(input),
        JSON.stringify(input)
      ).toThrow()
    }
    expect(() =>
      Schema.decodeUnknownSync(ConfirmObsMediaInputWorkflowInput)({
        target: "media_input",
        outcome: "playback_started",
        afterSequence: 0
      })
    ).not.toThrow()
  })

  it("validates transition workflow confirmation input variants", () => {
    const validInputs = [
      {
        target: "current_scene_transition",
        outcome: "changed",
        afterSequence: 0,
        transitionName: "Fade",
        transitionUuid: "transition-fade"
      },
      {
        target: "current_scene_transition",
        outcome: "duration_changed",
        afterSequence: 1,
        transitionDuration: 50
      },
      {
        target: "current_scene_transition",
        outcome: "duration_changed",
        afterSequence: 1,
        transitionDuration: 20000
      },
      {
        target: "scene_transition",
        outcome: "started",
        afterSequence: 1,
        transitionName: "Fade"
      },
      {
        target: "scene_transition",
        outcome: "ended",
        afterSequence: 1,
        transitionUuid: "transition-fade"
      },
      {
        target: "scene_transition",
        outcome: "video_ended",
        afterSequence: 1,
        transitionName: "Fade",
        transitionUuid: "transition-fade"
      }
    ] as const

    for (const input of validInputs) {
      expect(() => Schema.decodeUnknownSync(ConfirmObsTransitionWorkflowInput)(input), JSON.stringify(input))
        .not.toThrow()
    }
  })

  it("rejects invalid transition workflow confirmation inputs", () => {
    const invalidInputs = [
      { target: "current_scene_transition", outcome: "started", afterSequence: 0 },
      { target: "scene_transition", outcome: "changed", afterSequence: 0 },
      { target: "scene_transition", outcome: "duration_changed", afterSequence: 0 },
      { target: "transition", outcome: "started", afterSequence: 0 },
      {
        target: "current_scene_transition",
        outcome: "duration_changed",
        afterSequence: 0,
        transitionName: "Fade"
      },
      {
        target: "current_scene_transition",
        outcome: "duration_changed",
        afterSequence: 0,
        transitionUuid: "transition-fade"
      },
      {
        target: "current_scene_transition",
        outcome: "changed",
        afterSequence: 0,
        transitionDuration: 300
      },
      { target: "scene_transition", outcome: "started", afterSequence: 0, transitionDuration: 300 },
      { target: "scene_transition", outcome: "ended", afterSequence: 0, transitionDuration: 300 },
      { target: "scene_transition", outcome: "video_ended", afterSequence: 0, transitionDuration: 300 },
      { target: "scene_transition", outcome: "started", afterSequence: 0, transitionName: "" },
      { target: "scene_transition", outcome: "started", afterSequence: 0, transitionUuid: "" },
      {
        target: "current_scene_transition",
        outcome: "duration_changed",
        afterSequence: 0,
        transitionDuration: 0
      },
      {
        target: "current_scene_transition",
        outcome: "duration_changed",
        afterSequence: 0,
        transitionDuration: 49
      },
      {
        target: "current_scene_transition",
        outcome: "duration_changed",
        afterSequence: 0,
        transitionDuration: 20001
      },
      {
        target: "current_scene_transition",
        outcome: "duration_changed",
        afterSequence: 0,
        transitionDuration: 300.5
      },
      {
        target: "scene_transition",
        outcome: "started",
        afterSequence: 0,
        eventType: "SceneTransitionStarted"
      },
      {
        target: "scene_transition",
        outcome: "started",
        afterSequence: 0,
        eventIntent: EventSubscription.Transitions
      },
      { target: "scene_transition", outcome: "started", afterSequence: 0, eventData: {} },
      { target: "scene_transition", outcome: "started", afterSequence: 0, payload: { raw: true } },
      { target: "scene_transition", outcome: "started", afterSequence: 0, regex: "Fade.*" },
      { target: "scene_transition", outcome: "started", afterSequence: 0, transitionSettings: { secret: true } },
      { target: "scene_transition", outcome: "started", afterSequence: 0, overlay: true },
      { target: "scene_transition", outcome: "started", afterSequence: 0, position: 0.5 },
      { target: "scene_transition", outcome: "started", afterSequence: 0, release: true },
      { target: "scene_transition", outcome: "started", afterSequence: 0, sceneName: "Program" },
      { target: "scene_transition", outcome: "started", afterSequence: 0, sceneUuid: "scene-program" },
      { target: "scene_transition", outcome: "started", afterSequence: 0, inputName: "Media" },
      { target: "scene_transition", outcome: "started", afterSequence: 0, sourceName: "Camera" },
      { target: "scene_transition", outcome: "started", afterSequence: 0, filterName: "Color" },
      { target: "scene_transition", outcome: "started", afterSequence: 0, unexpected: true }
    ] as const

    for (const input of invalidInputs) {
      expect(
        () =>
          Schema.decodeUnknownSync(
            ConfirmObsTransitionWorkflowInput,
            { onExcessProperty: "error" }
          )(input),
        JSON.stringify(input)
      ).toThrow()
    }
    expect(() =>
      Schema.decodeUnknownSync(ConfirmObsTransitionWorkflowInput)({
        target: "current_scene_transition",
        outcome: "changed",
        afterSequence: 0
      })
    ).not.toThrow()
  })

  it("validates config workflow confirmation input variants", () => {
    const validInputs = [
      { target: "profile", outcome: "changing", afterSequence: 0, profileName: "Profile A" },
      { target: "profile", outcome: "changed", afterSequence: 1, profileName: "Profile B" },
      { target: "profile", outcome: "list_changed", afterSequence: 1, profiles: ["Profile A", "Profile B"] },
      {
        target: "scene_collection",
        outcome: "changing",
        afterSequence: 0,
        sceneCollectionName: "Collection A"
      },
      {
        target: "scene_collection",
        outcome: "changed",
        afterSequence: 1,
        sceneCollectionName: "Collection B"
      },
      {
        target: "scene_collection",
        outcome: "list_changed",
        afterSequence: 1,
        sceneCollections: ["Collection A", "Collection B"]
      }
    ] as const

    for (const input of validInputs) {
      expect(() => Schema.decodeUnknownSync(ConfirmObsConfigWorkflowInput)(input), JSON.stringify(input))
        .not.toThrow()
    }
  })

  it("rejects invalid config workflow confirmation inputs", () => {
    const invalidInputs = [
      { target: "profile", outcome: "started", afterSequence: 0 },
      { target: "scene_collection", outcome: "removed", afterSequence: 0 },
      { target: "profile", outcome: "list_changed", afterSequence: 0, profileName: "Profile A" },
      { target: "profile", outcome: "changed", afterSequence: 0, profiles: ["Profile A"] },
      { target: "scene_collection", outcome: "list_changed", afterSequence: 0, sceneCollectionName: "Collection A" },
      { target: "scene_collection", outcome: "changed", afterSequence: 0, sceneCollections: ["Collection A"] },
      { target: "profile", outcome: "changed", afterSequence: 0, sceneCollectionName: "Collection A" },
      { target: "scene_collection", outcome: "changed", afterSequence: 0, profileName: "Profile A" },
      { target: "profile", outcome: "changed", afterSequence: 0, profileName: "" },
      { target: "profile", outcome: "list_changed", afterSequence: 0, profiles: ["Profile A", ""] },
      { target: "profile", outcome: "list_changed", afterSequence: 0, profiles: ["Profile A", 1] },
      { target: "profile", outcome: "list_changed", afterSequence: 0, profiles: "Profile A" },
      { target: "scene_collection", outcome: "changed", afterSequence: 0, sceneCollectionName: "" },
      { target: "scene_collection", outcome: "list_changed", afterSequence: 0, sceneCollections: [""] },
      { target: "profile", outcome: "changed", afterSequence: 0, eventType: "CurrentProfileChanged" },
      { target: "profile", outcome: "changed", afterSequence: 0, eventIntent: EventSubscription.Config },
      { target: "profile", outcome: "changed", afterSequence: 0, eventData: {} },
      { target: "profile", outcome: "changed", afterSequence: 0, payload: { raw: true } },
      { target: "profile", outcome: "changed", afterSequence: 0, regex: "Profile.*" },
      { target: "profile", outcome: "changed", afterSequence: 0, parameterCategory: "Output" },
      { target: "profile", outcome: "changed", afterSequence: 0, parameterName: "Mode" },
      { target: "profile", outcome: "changed", afterSequence: 0, parameterValue: "Advanced" },
      { target: "profile", outcome: "changed", afterSequence: 0, sceneName: "Program" },
      { target: "profile", outcome: "changed", afterSequence: 0, sourceName: "Camera" },
      { target: "profile", outcome: "changed", afterSequence: 0, inputName: "Mic" },
      { target: "profile", outcome: "changed", afterSequence: 0, transitionName: "Fade" },
      { target: "profile", outcome: "changed", afterSequence: 0, outputState: "OBS_WEBSOCKET_OUTPUT_STARTED" },
      { target: "profile", outcome: "changed", afterSequence: 0, unexpected: true }
    ] as const

    for (const input of invalidInputs) {
      expect(
        () =>
          Schema.decodeUnknownSync(
            ConfirmObsConfigWorkflowInput,
            { onExcessProperty: "error" }
          )(input),
        JSON.stringify(input)
      ).toThrow()
    }
  })

  it("validates input audio change confirmation input variants", () => {
    const trackFilter = {
      track1: true,
      track2: false,
      track3: false,
      track4: true,
      track5: false,
      track6: true
    } as const
    const validInputs = [
      { target: "input_audio", outcome: "muted", afterSequence: 0, inputName: "Mic" },
      { target: "input_audio", outcome: "unmuted", afterSequence: 1, inputUuid: "input-mic" },
      {
        target: "input_audio",
        outcome: "volume_changed",
        afterSequence: 1,
        inputName: "Mic",
        inputVolumeMul: 0,
        inputVolumeDb: -100
      },
      { target: "input_audio", outcome: "balance_changed", afterSequence: 1, inputAudioBalance: 1 },
      { target: "input_audio", outcome: "sync_offset_changed", afterSequence: 1, inputAudioSyncOffset: -950 },
      { target: "input_audio", outcome: "tracks_changed", afterSequence: 1, inputAudioTracks: trackFilter },
      {
        target: "input_audio",
        outcome: "monitor_type_changed",
        afterSequence: 1,
        monitorType: "OBS_MONITORING_TYPE_MONITOR_AND_OUTPUT"
      }
    ] as const

    for (const input of validInputs) {
      expect(() => Schema.decodeUnknownSync(ConfirmObsInputAudioChangeInput)(input), JSON.stringify(input))
        .not.toThrow()
    }
  })

  it("rejects invalid input audio change confirmation inputs", () => {
    const invalidInputs = [
      { target: "input_audio", outcome: "created", afterSequence: 0 },
      { target: "media_input", outcome: "muted", afterSequence: 0 },
      { target: "input_audio", outcome: "muted", afterSequence: 0, inputMuted: true },
      { target: "input_audio", outcome: "unmuted", afterSequence: 0, inputVolumeMul: 1 },
      { target: "input_audio", outcome: "balance_changed", afterSequence: 0, inputVolumeDb: -6 },
      { target: "input_audio", outcome: "sync_offset_changed", afterSequence: 0, inputAudioBalance: 0.5 },
      { target: "input_audio", outcome: "tracks_changed", afterSequence: 0, inputAudioSyncOffset: 10 },
      { target: "input_audio", outcome: "monitor_type_changed", afterSequence: 0, inputAudioTracks: {} },
      { target: "input_audio", outcome: "volume_changed", afterSequence: 0, inputVolumeMul: -0.1 },
      { target: "input_audio", outcome: "volume_changed", afterSequence: 0, inputVolumeMul: 20.1 },
      { target: "input_audio", outcome: "volume_changed", afterSequence: 0, inputVolumeDb: -100.1 },
      { target: "input_audio", outcome: "volume_changed", afterSequence: 0, inputVolumeDb: 26.1 },
      { target: "input_audio", outcome: "balance_changed", afterSequence: 0, inputAudioBalance: -0.1 },
      { target: "input_audio", outcome: "balance_changed", afterSequence: 0, inputAudioBalance: 1.1 },
      { target: "input_audio", outcome: "sync_offset_changed", afterSequence: 0, inputAudioSyncOffset: 1.5 },
      { target: "input_audio", outcome: "sync_offset_changed", afterSequence: 0, inputAudioSyncOffset: -951 },
      { target: "input_audio", outcome: "sync_offset_changed", afterSequence: 0, inputAudioSyncOffset: 20001 },
      {
        target: "input_audio",
        outcome: "tracks_changed",
        afterSequence: 0,
        inputAudioTracks: { track1: true }
      },
      {
        target: "input_audio",
        outcome: "tracks_changed",
        afterSequence: 0,
        inputAudioTracks: { "1": true, "2": false, "3": false, "4": false, "5": false, "6": false }
      },
      { target: "input_audio", outcome: "monitor_type_changed", afterSequence: 0, monitorType: "UNKNOWN" },
      { target: "input_audio", outcome: "muted", afterSequence: 0, inputName: "" },
      { target: "input_audio", outcome: "muted", afterSequence: 0, inputUuid: "" },
      { target: "input_audio", outcome: "muted", afterSequence: 0, eventType: "InputMuteStateChanged" },
      { target: "input_audio", outcome: "muted", afterSequence: 0, eventIntent: EventSubscription.Inputs },
      { target: "input_audio", outcome: "muted", afterSequence: 0, eventData: {} },
      { target: "input_audio", outcome: "muted", afterSequence: 0, payload: { raw: true } },
      { target: "input_audio", outcome: "muted", afterSequence: 0, regex: "Mic.*" },
      { target: "input_audio", outcome: "muted", afterSequence: 0, inputSettings: { secret: true } },
      { target: "input_audio", outcome: "muted", afterSequence: 0, defaultInputSettings: {} },
      { target: "input_audio", outcome: "muted", afterSequence: 0, inputKind: "wasapi_input_capture" },
      { target: "input_audio", outcome: "muted", afterSequence: 0, inputKindCaps: 1 },
      { target: "input_audio", outcome: "muted", afterSequence: 0, mediaState: "OBS_MEDIA_STATE_PLAYING" },
      { target: "input_audio", outcome: "muted", afterSequence: 0, mediaCursor: 1 },
      { target: "input_audio", outcome: "muted", afterSequence: 0, sourceName: "Camera" },
      { target: "input_audio", outcome: "muted", afterSequence: 0, filterName: "Gain" },
      { target: "input_audio", outcome: "muted", afterSequence: 0, sceneItemId: 1 },
      { target: "input_audio", outcome: "muted", afterSequence: 0, unexpected: true }
    ] as const

    for (const input of invalidInputs) {
      expect(
        () =>
          Schema.decodeUnknownSync(
            ConfirmObsInputAudioChangeInput,
            { onExcessProperty: "error" }
          )(input),
        JSON.stringify(input)
      ).toThrow()
    }
    expect(() =>
      Schema.decodeUnknownSync(ConfirmObsInputAudioChangeInput)({
        target: "input_audio",
        outcome: "muted",
        afterSequence: 0
      })
    ).not.toThrow()
  })

  it("rejects malformed input audio change output summaries", () => {
    const publicTracks = {
      track1: true,
      track2: false,
      track3: false,
      track4: true,
      track5: false,
      track6: true
    } as const
    const validOutput = {
      confirmed: true,
      timedOut: false,
      baselineSequence: 0,
      latestSequence: 6,
      missedEvents: false,
      event: {
        sequence: 6,
        eventType: "InputAudioMonitorTypeChanged",
        eventIntent: EventSubscription.Inputs,
        category: "inputs",
        target: "input_audio",
        outcome: "monitor_type_changed",
        inputName: "Mic",
        inputUuid: "input-mic",
        monitorType: "OBS_MONITORING_TYPE_MONITOR_ONLY"
      }
    } as const
    expect(Schema.decodeUnknownSync(ConfirmObsInputAudioChangeOutput)(validOutput)).toEqual(validOutput)

    const validSummaries = [
      {
        sequence: 1,
        eventType: "InputMuteStateChanged",
        eventIntent: EventSubscription.Inputs,
        category: "inputs",
        target: "input_audio",
        outcome: "muted",
        inputName: "Mic",
        inputUuid: "input-mic",
        inputMuted: true
      },
      {
        sequence: 2,
        eventType: "InputMuteStateChanged",
        eventIntent: EventSubscription.Inputs,
        category: "inputs",
        target: "input_audio",
        outcome: "unmuted",
        inputName: "Mic",
        inputUuid: "input-mic",
        inputMuted: false
      },
      {
        sequence: 3,
        eventType: "InputVolumeChanged",
        eventIntent: EventSubscription.Inputs,
        category: "inputs",
        target: "input_audio",
        outcome: "volume_changed",
        inputName: "Mic",
        inputUuid: "input-mic",
        inputVolumeMul: 20,
        inputVolumeDb: 26
      },
      {
        sequence: 4,
        eventType: "InputAudioBalanceChanged",
        eventIntent: EventSubscription.Inputs,
        category: "inputs",
        target: "input_audio",
        outcome: "balance_changed",
        inputName: "Mic",
        inputUuid: "input-mic",
        inputAudioBalance: 0.25
      },
      {
        sequence: 5,
        eventType: "InputAudioSyncOffsetChanged",
        eventIntent: EventSubscription.Inputs,
        category: "inputs",
        target: "input_audio",
        outcome: "sync_offset_changed",
        inputName: "Mic",
        inputUuid: "input-mic",
        inputAudioSyncOffset: -250
      },
      {
        sequence: 6,
        eventType: "InputAudioTracksChanged",
        eventIntent: EventSubscription.Inputs,
        category: "inputs",
        target: "input_audio",
        outcome: "tracks_changed",
        inputName: "Mic",
        inputUuid: "input-mic",
        inputAudioTracks: publicTracks
      },
      validOutput.event
    ] as const
    for (const summary of validSummaries) {
      expect(Schema.decodeUnknownSync(InputAudioChangeEventSummary)(summary)).toEqual(summary)
    }

    const invalidSummaries = [
      { ...validSummaries[0], outcome: "volume_changed" },
      { ...validSummaries[0], inputMuted: false },
      { ...validSummaries[2], inputVolumeMul: 20.1 },
      { ...validSummaries[2], inputVolumeDb: -100.1 },
      { ...validSummaries[3], inputAudioBalance: 1.1 },
      { ...validSummaries[4], inputAudioSyncOffset: 1.5 },
      { ...validSummaries[4], inputAudioSyncOffset: 20001 },
      { ...validSummaries[5], inputAudioTracks: { track1: true } },
      {
        ...validSummaries[5],
        inputAudioTracks: { "1": true, "2": false, "3": false, "4": true, "5": false, "6": true }
      },
      { ...validOutput.event, monitorType: "UNKNOWN" },
      { ...validOutput.event, eventIntent: Number.MAX_SAFE_INTEGER + 1 },
      { ...validOutput.event, sequence: 0 },
      { ...validOutput.event, inputSettings: { secret: true } },
      { ...validOutput.event, eventData: {} },
      { ...validOutput.event, payload: { raw: true } },
      { ...validOutput.event, unexpected: true }
    ] as const
    for (const summary of invalidSummaries) {
      expect(() => Schema.decodeUnknownSync(InputAudioChangeEventSummary, { onExcessProperty: "error" })(summary))
        .toThrow()
    }
  })

  it("accepts valid input identity change confirmation inputs", () => {
    const validInputs = [
      { target: "input", outcome: "removed", afterSequence: 0, inputName: "Camera" },
      { target: "input", outcome: "removed", afterSequence: 1, inputUuid: "input-camera" },
      {
        target: "input",
        outcome: "renamed",
        afterSequence: 1,
        inputName: "Camera",
        inputUuid: "input-camera",
        oldInputName: "Old Camera"
      }
    ] as const

    for (const input of validInputs) {
      expect(() => Schema.decodeUnknownSync(ConfirmObsInputIdentityChangeInput)(input), JSON.stringify(input))
        .not.toThrow()
    }
  })

  it("rejects invalid input identity change confirmation inputs", () => {
    const invalidInputs = [
      { target: "input", outcome: "created", afterSequence: 0 },
      { target: "input", outcome: "settings_changed", afterSequence: 0 },
      { target: "input_audio", outcome: "removed", afterSequence: 0 },
      { target: "input", outcome: "removed" },
      { target: "input", outcome: "removed", afterSequence: 0, inputName: "" },
      { target: "input", outcome: "removed", afterSequence: 0, inputUuid: "" },
      { target: "input", outcome: "renamed", afterSequence: 0, oldInputName: "" },
      { target: "input", outcome: "removed", afterSequence: 0, oldInputName: "Old Camera" },
      { target: "input", outcome: "removed", afterSequence: 0, eventType: "InputRemoved" },
      { target: "input", outcome: "removed", afterSequence: 0, eventIntent: EventSubscription.Inputs },
      { target: "input", outcome: "removed", afterSequence: 0, eventData: {} },
      { target: "input", outcome: "removed", afterSequence: 0, payload: { raw: true } },
      { target: "input", outcome: "removed", afterSequence: 0, regex: "Camera.*" },
      { target: "input", outcome: "removed", afterSequence: 0, settings: { secret: true } },
      { target: "input", outcome: "removed", afterSequence: 0, inputSettings: { secret: true } },
      { target: "input", outcome: "removed", afterSequence: 0, defaultSettings: { secret: false } },
      { target: "input", outcome: "removed", afterSequence: 0, defaultInputSettings: { secret: false } },
      { target: "input", outcome: "removed", afterSequence: 0, inputKind: "dshow_input" },
      { target: "input", outcome: "removed", afterSequence: 0, unversionedInputKind: "dshow_input" },
      { target: "input", outcome: "removed", afterSequence: 0, inputKindCaps: 1 },
      { target: "input", outcome: "removed", afterSequence: 0, sceneItemId: 1 },
      { target: "input", outcome: "removed", afterSequence: 0, sceneName: "Scene" },
      { target: "input", outcome: "removed", afterSequence: 0, sourceName: "Camera" },
      { target: "input", outcome: "removed", afterSequence: 0, filterName: "Gain" },
      { target: "input", outcome: "removed", afterSequence: 0, transitionName: "Fade" },
      { target: "input", outcome: "removed", afterSequence: 0, canvasName: "Canvas A" },
      { target: "input", outcome: "removed", afterSequence: 0, unexpected: true }
    ] as const

    for (const input of invalidInputs) {
      expect(
        () =>
          Schema.decodeUnknownSync(
            ConfirmObsInputIdentityChangeInput,
            { onExcessProperty: "error" }
          )(input),
        JSON.stringify(input)
      ).toThrow()
    }
  })

  it("rejects malformed input identity change output summaries", () => {
    const validOutput = {
      confirmed: true,
      timedOut: false,
      baselineSequence: 0,
      latestSequence: 2,
      missedEvents: false,
      event: {
        sequence: 2,
        eventType: "InputNameChanged",
        eventIntent: EventSubscription.Inputs,
        category: "inputs",
        target: "input",
        outcome: "renamed",
        oldInputName: "Old Camera",
        inputName: "Camera",
        inputUuid: "input-camera"
      }
    } as const
    expect(Schema.decodeUnknownSync(ConfirmObsInputIdentityChangeOutput)(validOutput)).toEqual(validOutput)

    const validSummaries = [
      {
        sequence: 1,
        eventType: "InputRemoved",
        eventIntent: EventSubscription.Inputs,
        category: "inputs",
        target: "input",
        outcome: "removed",
        inputName: "Camera",
        inputUuid: "input-camera"
      },
      validOutput.event
    ] as const
    for (const summary of validSummaries) {
      expect(Schema.decodeUnknownSync(InputIdentityChangeEventSummary)(summary)).toEqual(summary)
    }

    const invalidSummaries = [
      { ...validSummaries[0], outcome: "renamed" },
      { ...validSummaries[0], target: "input_audio" },
      { ...validSummaries[0], category: "media_inputs" },
      { ...validSummaries[0], inputName: "" },
      { ...validSummaries[0], inputUuid: "" },
      { ...validSummaries[0], oldInputName: "Old Camera" },
      { ...validOutput.event, oldInputName: "" },
      { ...validOutput.event, eventType: "InputRemoved" },
      { ...validOutput.event, outcome: "removed" },
      { ...validOutput.event, eventIntent: EventSubscription.General },
      { ...validOutput.event, eventIntent: Number.MAX_SAFE_INTEGER },
      { ...validOutput.event, sequence: 0 },
      { ...validOutput.event, inputSettings: { secret: true } },
      { ...validOutput.event, defaultInputSettings: { secret: false } },
      { ...validOutput.event, inputKind: "dshow_input" },
      { ...validOutput.event, inputKindCaps: 1 },
      { ...validOutput.event, eventData: {} },
      { ...validOutput.event, payload: { raw: true } },
      { ...validOutput.event, unexpected: true }
    ] as const
    for (const summary of invalidSummaries) {
      expect(
        () => Schema.decodeUnknownSync(InputIdentityChangeEventSummary, { onExcessProperty: "error" })(summary)
      ).toThrow()
    }
  })

  it("rejects malformed media input workflow output summaries", () => {
    const validOutput = {
      confirmed: true,
      timedOut: false,
      baselineSequence: 0,
      latestSequence: 3,
      missedEvents: false,
      event: {
        sequence: 3,
        eventType: "MediaInputActionTriggered",
        eventIntent: EventSubscription.MediaInputs,
        category: "media_inputs",
        target: "media_input",
        outcome: "action_triggered",
        inputName: "Media",
        inputUuid: "input-media",
        mediaAction: "OBS_WEBSOCKET_MEDIA_INPUT_ACTION_STOP"
      }
    } as const
    expect(Schema.decodeUnknownSync(ConfirmObsMediaInputWorkflowOutput)(validOutput)).toEqual(validOutput)

    const validSummaries = [
      {
        sequence: 1,
        eventType: "MediaInputPlaybackStarted",
        eventIntent: EventSubscription.MediaInputs,
        category: "media_inputs",
        target: "media_input",
        outcome: "playback_started",
        inputName: "Media",
        inputUuid: "input-media"
      },
      {
        sequence: 2,
        eventType: "MediaInputPlaybackEnded",
        eventIntent: EventSubscription.MediaInputs,
        category: "media_inputs",
        target: "media_input",
        outcome: "playback_ended",
        inputName: "Media",
        inputUuid: "input-media"
      },
      validOutput.event
    ] as const
    for (const summary of validSummaries) {
      expect(Schema.decodeUnknownSync(MediaInputWorkflowEventSummary)(summary)).toEqual(summary)
    }

    const invalidSummaries = [
      { ...validSummaries[0], outcome: "action_triggered" },
      { ...validSummaries[0], mediaAction: "OBS_WEBSOCKET_MEDIA_INPUT_ACTION_PLAY" },
      { ...validSummaries[0], mediaState: "OBS_MEDIA_STATE_PLAYING" },
      { ...validSummaries[0], mediaCursor: 1 },
      { ...validSummaries[0], mediaDuration: 1 },
      { ...validOutput.event, mediaAction: "OBS_WEBSOCKET_MEDIA_INPUT_ACTION_NONE" },
      { ...validOutput.event, mediaAction: undefined },
      { ...validOutput.event, mediaState: "OBS_MEDIA_STATE_PLAYING" },
      { ...validOutput.event, payload: { raw: true } },
      { ...validOutput.event, inputSettings: { secret: true } },
      { ...validOutput.event, unexpected: true },
      { ...validOutput.event, eventIntent: Number.MAX_SAFE_INTEGER + 1 },
      { ...validOutput.event, sequence: 0 },
      {
        sequence: 1,
        eventType: "MediaInputActionTriggered",
        eventIntent: EventSubscription.MediaInputs,
        category: "media_inputs",
        target: "media_input",
        outcome: "action_triggered",
        inputName: "Media",
        inputUuid: "input-media"
      }
    ] as const
    for (const summary of invalidSummaries) {
      expect(() => Schema.decodeUnknownSync(MediaInputWorkflowEventSummary, { onExcessProperty: "error" })(summary))
        .toThrow()
    }
  })

  it("rejects malformed transition workflow output summaries", () => {
    const validOutput = {
      confirmed: true,
      timedOut: false,
      baselineSequence: 0,
      latestSequence: 5,
      missedEvents: false,
      event: {
        sequence: 5,
        eventType: "SceneTransitionVideoEnded",
        eventIntent: EventSubscription.Transitions,
        category: "transitions",
        target: "scene_transition",
        outcome: "video_ended",
        transitionName: "Fade",
        transitionUuid: "transition-fade"
      }
    } as const
    expect(Schema.decodeUnknownSync(ConfirmObsTransitionWorkflowOutput)(validOutput)).toEqual(validOutput)

    const validSummaries = [
      {
        sequence: 1,
        eventType: "CurrentSceneTransitionChanged",
        eventIntent: EventSubscription.Transitions,
        category: "transitions",
        target: "current_scene_transition",
        outcome: "changed",
        transitionName: "Fade",
        transitionUuid: "transition-fade"
      },
      {
        sequence: 2,
        eventType: "CurrentSceneTransitionDurationChanged",
        eventIntent: Number.MAX_SAFE_INTEGER,
        category: "transitions",
        target: "current_scene_transition",
        outcome: "duration_changed",
        transitionDuration: 300
      },
      {
        sequence: 3,
        eventType: "SceneTransitionStarted",
        eventIntent: EventSubscription.Transitions,
        category: "transitions",
        target: "scene_transition",
        outcome: "started",
        transitionName: "Fade",
        transitionUuid: "transition-fade"
      },
      {
        sequence: 4,
        eventType: "SceneTransitionEnded",
        eventIntent: EventSubscription.Transitions,
        category: "transitions",
        target: "scene_transition",
        outcome: "ended",
        transitionName: "Fade",
        transitionUuid: "transition-fade"
      },
      validOutput.event
    ] as const
    for (const summary of validSummaries) {
      expect(Schema.decodeUnknownSync(TransitionWorkflowEventSummary)(summary)).toEqual(summary)
    }

    const invalidSummaries = [
      { ...validSummaries[0], outcome: "ended" },
      { ...validSummaries[0], target: "scene_transition" },
      { ...validSummaries[1], transitionDuration: 0 },
      { ...validSummaries[1], transitionDuration: 49 },
      { ...validSummaries[1], transitionDuration: 20001 },
      { ...validSummaries[1], transitionDuration: 300.5 },
      { ...validSummaries[1], transitionName: "Fade" },
      { ...validSummaries[1], transitionUuid: "transition-fade" },
      { ...validSummaries[2], transitionDuration: 300 },
      { ...validSummaries[2], transitionSettings: { secret: true } },
      { ...validSummaries[2], eventData: {} },
      { ...validSummaries[2], payload: { raw: true } },
      { ...validSummaries[2], unexpected: true },
      { ...validSummaries[2], eventIntent: Number.MAX_SAFE_INTEGER + 1 },
      { ...validSummaries[2], sequence: 0 },
      {
        sequence: 1,
        eventType: "SceneTransitionEnded",
        eventIntent: EventSubscription.Transitions,
        category: "transitions",
        target: "scene_transition",
        outcome: "ended",
        transitionName: "Fade"
      }
    ] as const
    for (const summary of invalidSummaries) {
      expect(() => Schema.decodeUnknownSync(TransitionWorkflowEventSummary, { onExcessProperty: "error" })(summary))
        .toThrow()
    }
  })

  it("rejects malformed canvas inventory-change confirmation output summaries", () => {
    const validOutput = {
      confirmed: true,
      timedOut: false,
      baselineSequence: 0,
      latestSequence: 3,
      missedEvents: false,
      event: {
        sequence: 3,
        eventType: "CanvasNameChanged",
        eventIntent: EventSubscription.Canvases,
        category: "canvases",
        target: "canvas",
        outcome: "renamed",
        oldCanvasName: "Canvas A",
        canvasName: "Canvas B",
        canvasUuid: "canvas-b"
      }
    } as const
    expect(Schema.decodeUnknownSync(ConfirmObsCanvasInventoryChangeOutput)(validOutput)).toEqual(validOutput)

    const validSummaries = [
      {
        sequence: 1,
        eventType: "CanvasCreated",
        eventIntent: EventSubscription.Canvases,
        category: "canvases",
        target: "canvas",
        outcome: "created",
        canvasName: "Canvas A",
        canvasUuid: "canvas-a"
      },
      {
        sequence: 2,
        eventType: "CanvasRemoved",
        eventIntent: EventSubscription.Canvases,
        category: "canvases",
        target: "canvas",
        outcome: "removed",
        canvasName: "Canvas A",
        canvasUuid: "canvas-a"
      },
      validOutput.event
    ] as const
    for (const summary of validSummaries) {
      expect(Schema.decodeUnknownSync(CanvasInventoryChangeEventSummary)(summary)).toEqual(summary)
    }

    const invalidSummaries = [
      { ...validSummaries[0], outcome: "removed" },
      { ...validSummaries[0], target: "scene" },
      { ...validSummaries[0], category: "scenes" },
      { ...validSummaries[0], canvasName: "" },
      { ...validSummaries[0], canvasUuid: "" },
      { ...validSummaries[0], oldCanvasName: "Old Canvas" },
      { ...validOutput.event, oldCanvasName: "" },
      { ...validOutput.event, eventType: "CanvasCreated" },
      { ...validOutput.event, outcome: "created" },
      { ...validOutput.event, eventIntent: EventSubscription.General },
      { ...validOutput.event, eventIntent: Number.MAX_SAFE_INTEGER },
      { ...validOutput.event, sequence: 0 },
      { ...validOutput.event, eventData: {} },
      { ...validOutput.event, payload: { raw: true } },
      { ...validOutput.event, unexpected: true }
    ] as const
    for (const summary of invalidSummaries) {
      expect(() => Schema.decodeUnknownSync(CanvasInventoryChangeEventSummary, { onExcessProperty: "error" })(summary))
        .toThrow()
    }
  })

  it("rejects malformed studio-mode state confirmation output summaries", () => {
    const validOutput = {
      confirmed: true,
      timedOut: false,
      baselineSequence: 0,
      latestSequence: 1,
      missedEvents: false,
      event: {
        sequence: 1,
        eventType: "StudioModeStateChanged",
        eventIntent: EventSubscription.Ui,
        category: "ui",
        target: "studio_mode",
        outcome: "enabled",
        studioModeEnabled: true
      }
    } as const
    expect(Schema.decodeUnknownSync(ConfirmObsStudioModeStateChangeOutput)(validOutput)).toEqual(validOutput)

    const validSummaries = [
      validOutput.event,
      {
        sequence: 2,
        eventType: "StudioModeStateChanged",
        eventIntent: EventSubscription.Ui,
        category: "ui",
        target: "studio_mode",
        outcome: "disabled",
        studioModeEnabled: false
      }
    ] as const
    for (const summary of validSummaries) {
      expect(Schema.decodeUnknownSync(StudioModeStateChangeEventSummary)(summary)).toEqual(summary)
    }

    const invalidSummaries = [
      { ...validOutput.event, outcome: "disabled" },
      { ...validOutput.event, studioModeEnabled: false },
      { ...validOutput.event, eventType: "ScreenshotSaved" },
      { ...validOutput.event, eventIntent: EventSubscription.General },
      { ...validOutput.event, eventIntent: EventSubscription.Ui | EventSubscription.Vendors },
      { ...validOutput.event, category: "unknown" },
      { ...validOutput.event, target: "ui" },
      { ...validOutput.event, sequence: 0 },
      { ...validOutput.event, savedScreenshotPath: "/tmp/screenshot.png" },
      { ...validOutput.event, eventData: {} },
      { ...validOutput.event, payload: { raw: true } },
      { ...validOutput.event, unexpected: true }
    ] as const
    for (const summary of invalidSummaries) {
      expect(
        () => Schema.decodeUnknownSync(StudioModeStateChangeEventSummary, { onExcessProperty: "error" })(summary)
      ).toThrow()
    }
  })

  it("rejects malformed config workflow output summaries", () => {
    const validOutput = {
      confirmed: true,
      timedOut: false,
      baselineSequence: 0,
      latestSequence: 6,
      missedEvents: false,
      event: {
        sequence: 6,
        eventType: "SceneCollectionListChanged",
        eventIntent: EventSubscription.Config,
        category: "config",
        target: "scene_collection",
        outcome: "list_changed",
        sceneCollections: ["Collection A", "Collection B"]
      }
    } as const
    expect(Schema.decodeUnknownSync(ConfirmObsConfigWorkflowOutput)(validOutput)).toEqual(validOutput)

    const validSummaries = [
      {
        sequence: 1,
        eventType: "CurrentProfileChanging",
        eventIntent: EventSubscription.Config,
        category: "config",
        target: "profile",
        outcome: "changing",
        profileName: "Profile A"
      },
      {
        sequence: 2,
        eventType: "CurrentProfileChanged",
        eventIntent: EventSubscription.Config,
        category: "config",
        target: "profile",
        outcome: "changed",
        profileName: "Profile B"
      },
      {
        sequence: 3,
        eventType: "ProfileListChanged",
        eventIntent: EventSubscription.Config,
        category: "config",
        target: "profile",
        outcome: "list_changed",
        profiles: ["Profile A", "Profile B"]
      },
      {
        sequence: 4,
        eventType: "CurrentSceneCollectionChanging",
        eventIntent: EventSubscription.Config,
        category: "config",
        target: "scene_collection",
        outcome: "changing",
        sceneCollectionName: "Collection A"
      },
      {
        sequence: 5,
        eventType: "CurrentSceneCollectionChanged",
        eventIntent: EventSubscription.Config,
        category: "config",
        target: "scene_collection",
        outcome: "changed",
        sceneCollectionName: "Collection B"
      },
      validOutput.event
    ] as const
    for (const summary of validSummaries) {
      expect(Schema.decodeUnknownSync(ConfigWorkflowEventSummary)(summary)).toEqual(summary)
    }

    const invalidSummaries = [
      { ...validSummaries[0], outcome: "changed" },
      { ...validSummaries[0], target: "scene_collection" },
      { ...validSummaries[0], profileName: "" },
      { ...validSummaries[0], profiles: ["Profile A"] },
      { ...validSummaries[2], profiles: ["Profile A", ""] },
      { ...validSummaries[2], profiles: ["Profile A", 1] },
      { ...validSummaries[2], profiles: "Profile A" },
      { ...validSummaries[2], profileName: "Profile A" },
      { ...validSummaries[3], sceneCollectionName: "" },
      { ...validSummaries[3], sceneCollections: ["Collection A"] },
      { ...validOutput.event, sceneCollections: ["Collection A", ""] },
      { ...validOutput.event, sceneCollections: [1] },
      { ...validOutput.event, sceneCollectionName: "Collection A" },
      { ...validOutput.event, parameterCategory: "Output" },
      { ...validOutput.event, parameterName: "Mode" },
      { ...validOutput.event, eventData: {} },
      { ...validOutput.event, payload: { raw: true } },
      { ...validOutput.event, eventIntent: EventSubscription.General },
      { ...validOutput.event, eventIntent: Number.MAX_SAFE_INTEGER + 1 },
      { ...validOutput.event, eventIntent: Number.MAX_SAFE_INTEGER },
      { ...validOutput.event, sequence: 0 },
      { ...validOutput.event, unexpected: true }
    ] as const
    for (const summary of invalidSummaries) {
      expect(() => Schema.decodeUnknownSync(ConfigWorkflowEventSummary, { onExcessProperty: "error" })(summary))
        .toThrow()
    }
  })

  it("rejects malformed source filter confirmation output summaries", () => {
    const validOutput = {
      confirmed: true,
      timedOut: false,
      baselineSequence: 0,
      latestSequence: 1,
      missedEvents: false,
      event: {
        sequence: 1,
        eventType: "SourceFilterCreated",
        eventIntent: EventSubscription.Filters,
        category: "filters",
        target: "source_filter",
        outcome: "created",
        sourceName: "Camera",
        filterName: "Color",
        filterKind: "color_filter",
        filterIndex: 0,
        rawSettingsOmitted: true,
        defaultSettingsOmitted: true
      }
    } as const
    expect(Schema.decodeUnknownSync(ConfirmObsSourceFilterChangeOutput)(validOutput)).toEqual(validOutput)

    const summaryCases = [
      validOutput.event,
      {
        sequence: 2,
        eventType: "SourceFilterRemoved",
        eventIntent: EventSubscription.Filters,
        category: "filters",
        target: "source_filter",
        outcome: "removed",
        sourceName: "Camera",
        filterName: "Color"
      },
      {
        sequence: 3,
        eventType: "SourceFilterNameChanged",
        eventIntent: EventSubscription.Filters,
        category: "filters",
        target: "source_filter",
        outcome: "renamed",
        sourceName: "Camera",
        oldFilterName: "Old Color",
        filterName: "Color"
      },
      {
        sequence: 4,
        eventType: "SourceFilterListReindexed",
        eventIntent: EventSubscription.Filters,
        category: "filters",
        target: "source_filter",
        outcome: "reordered",
        sourceName: "Camera",
        filters: [{ filterName: "Color", filterIndex: 0 }]
      },
      {
        sequence: 5,
        eventType: "SourceFilterEnableStateChanged",
        eventIntent: EventSubscription.Filters,
        category: "filters",
        target: "source_filter",
        outcome: "enabled",
        sourceName: "Camera",
        filterName: "Color",
        filterEnabled: true
      },
      {
        sequence: 6,
        eventType: "SourceFilterEnableStateChanged",
        eventIntent: EventSubscription.Filters,
        category: "filters",
        target: "source_filter",
        outcome: "disabled",
        sourceName: "Camera",
        filterName: "Color",
        filterEnabled: false
      },
      {
        sequence: 7,
        eventType: "SourceFilterSettingsChanged",
        eventIntent: EventSubscription.Filters,
        category: "filters",
        target: "source_filter",
        outcome: "settings_changed",
        sourceName: "Camera",
        filterName: "Color",
        rawSettingsOmitted: true
      }
    ] as const
    for (const summary of summaryCases) {
      expect(Schema.decodeUnknownSync(SourceFilterChangeEventSummary)(summary)).toEqual(summary)
    }

    const invalidReindexedSummaries = [-1, 1.5, Number.MAX_SAFE_INTEGER + 1].map((filterIndex) => ({
      sequence: 1,
      eventType: "SourceFilterListReindexed",
      eventIntent: EventSubscription.Filters,
      category: "filters",
      target: "source_filter",
      outcome: "reordered",
      sourceName: "Camera",
      filters: [{ filterName: "Color", filterIndex }]
    }))
    const invalidSummaries = [
      { ...validOutput.event, filterIndex: -1 },
      { ...validOutput.event, filterIndex: 1.5 },
      { ...validOutput.event, filterIndex: Number.MAX_SAFE_INTEGER + 1 },
      { ...validOutput.event, eventIntent: Number.MAX_SAFE_INTEGER + 1 },
      { ...validOutput.event, filterSettings: { secret: true } },
      { ...validOutput.event, defaultFilterSettings: { secret: false } },
      { ...validOutput.event, rawSettingsOmitted: false },
      { ...validOutput.event, eventType: "SourceFilterSettingsChanged", outcome: "created" },
      {
        sequence: 1,
        eventType: "SourceFilterEnableStateChanged",
        eventIntent: EventSubscription.Filters,
        category: "filters",
        target: "source_filter",
        outcome: "settings_changed",
        sourceName: "Camera",
        filterName: "Color",
        filterEnabled: true
      },
      ...invalidReindexedSummaries,
      {
        sequence: 1,
        eventType: "SourceFilterListReindexed",
        eventIntent: EventSubscription.Filters,
        category: "filters",
        target: "source_filter",
        outcome: "reordered",
        sourceName: "Camera",
        filters: [{ filterName: "Color", filterIndex: 0, filterSettings: { secret: true } }]
      },
      {
        sequence: 1,
        eventType: "SourceFilterSettingsChanged",
        eventIntent: EventSubscription.Filters,
        category: "filters",
        target: "source_filter",
        outcome: "settings_changed",
        sourceName: "Camera",
        filterName: "Color",
        filterSettings: { secret: true },
        rawSettingsOmitted: true
      }
    ] as const
    for (const summary of invalidSummaries) {
      expect(() => Schema.decodeUnknownSync(SourceFilterChangeEventSummary, { onExcessProperty: "error" })(summary))
        .toThrow()
    }
  })

  it("rejects malformed scene graph confirmation output summaries", () => {
    const validOutput = {
      confirmed: true,
      timedOut: false,
      baselineSequence: 0,
      latestSequence: 1,
      missedEvents: false,
      event: {
        sequence: 1,
        eventType: "SceneItemEnableStateChanged",
        eventIntent: EventSubscription.SceneItems,
        category: "scene_items",
        target: "scene_item",
        outcome: "enabled",
        sceneName: "Program",
        sceneUuid: "scene-program",
        sceneItemId: 12,
        sceneItemEnabled: true
      }
    } as const
    expect(Schema.decodeUnknownSync(ConfirmObsSceneGraphChangeOutput)(validOutput)).toEqual(validOutput)

    expect(() =>
      Schema.decodeUnknownSync(SceneGraphChangeEventSummary)({
        ...validOutput.event,
        outcome: "locked"
      })
    ).toThrow()
    expect(() =>
      Schema.decodeUnknownSync(SceneGraphChangeEventSummary)({
        sequence: 1,
        eventType: "CurrentProgramSceneChanged",
        eventIntent: EventSubscription.Scenes,
        category: "scenes",
        target: "scene",
        outcome: "changed",
        sceneName: "Program",
        sceneUuid: "scene-program"
      })
    ).toThrow()
    expect(() =>
      Schema.decodeUnknownSync(SceneGraphChangeEventSummary)({
        sequence: 1,
        eventType: "SceneItemListReindexed",
        eventIntent: EventSubscription.SceneItems,
        category: "scene_items",
        target: "scene_item",
        outcome: "reordered",
        sceneName: "Program",
        sceneUuid: "scene-program",
        sceneItems: [{ sceneItemId: 12, sceneItemIndex: -1 }]
      })
    ).toThrow()
    expect(() =>
      Schema.decodeUnknownSync(ConfirmObsSceneGraphChangeOutput)({
        ...validOutput,
        event: { ...validOutput.event, sequence: 0 }
      })
    ).toThrow()
  })

  it("rejects malformed output lifecycle event summaries", () => {
    expect(() =>
      Schema.decodeUnknownSync(OutputLifecycleEventSummary)({
        sequence: 1,
        eventType: "RecordStateChanged",
        eventIntent: EventSubscription.Outputs,
        category: "outputs",
        target: "record",
        outcome: "stopped",
        outputActive: false,
        outputState: "OBS_WEBSOCKET_OUTPUT_STOPPED"
      })
    ).toThrow()
    expect(() =>
      Schema.decodeUnknownSync(OutputLifecycleEventSummary)({
        sequence: 1,
        eventType: "ReplayBufferSaved",
        eventIntent: EventSubscription.Outputs,
        category: "outputs",
        target: "replay_buffer",
        outcome: "replay_saved",
        newOutputPath: "/tmp/replay.mkv"
      })
    ).toThrow()
    expect(() =>
      Schema.decodeUnknownSync(OutputLifecycleEventSummary)({
        sequence: 0,
        eventType: "StreamStateChanged",
        eventIntent: EventSubscription.Outputs,
        category: "outputs",
        target: "stream",
        outcome: "started",
        outputActive: true,
        outputState: "OBS_WEBSOCKET_OUTPUT_STARTED"
      })
    ).toThrow()
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
