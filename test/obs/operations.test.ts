import { mkdtemp, rm, writeFile } from "node:fs/promises"
import os from "node:os"
import path from "node:path"

import { Option, Schema } from "effect"
import { afterEach, describe, expect, it } from "vitest"

import type { ObsConfig } from "../../src/config/config.js"
import {
  ProfileNameInput,
  ProfileParameterInput,
  SetProfileParameterInput,
  SetStreamServiceSettingsInput,
  SetVideoSettingsInput
} from "../../src/domain/schemas/config.js"
import { getEnabledTools } from "../../src/mcp/tools/registry.js"
import { createObsClient, type ObsClient } from "../../src/obs/client.js"
import { type ObsRequestError, ObsTimeoutError, type ObsValidationError } from "../../src/obs/errors.js"
import type { BufferedObsEvent } from "../../src/obs/events.js"
import { runObsRequestBatch } from "../../src/obs/operations/batch.js"
import { listCanvases } from "../../src/obs/operations/canvases.js"
import {
  createProfile,
  createSceneCollection,
  getProfileParameter,
  getRecordDirectory,
  getStreamServiceSettings,
  getVideoSettings,
  listProfiles,
  listSceneCollections,
  removeProfile,
  setCurrentProfile,
  setCurrentSceneCollection,
  setProfileParameter,
  setRecordDirectory,
  setStreamServiceSettings,
  setVideoSettings
} from "../../src/obs/operations/config.js"
import {
  confirmObsCanvasInventoryChange,
  confirmObsConfigWorkflow,
  confirmObsInputAudioChange,
  confirmObsInputIdentityChange,
  confirmObsMediaInputWorkflow,
  confirmObsOutputLifecycle,
  confirmObsSceneGraphChange,
  confirmObsSourceFilterChange,
  confirmObsStudioModeStateChange,
  confirmObsTransitionWorkflow
} from "../../src/obs/operations/events.js"
import {
  createSourceFilter,
  getSourceFilter,
  getSourceFilterDefaultSettings,
  listSourceFilterKinds,
  listSourceFilters,
  removeSourceFilter,
  setSourceFilterEnabled,
  setSourceFilterIndex,
  setSourceFilterName,
  setSourceFilterSettings
} from "../../src/obs/operations/filters.js"
import {
  getObsStats,
  getRecordStatus,
  getVersion,
  listHotkeys,
  triggerHotkeyByKeySequence,
  triggerHotkeyByName
} from "../../src/obs/operations/general.js"
import {
  createInput,
  getInputAudioBalance,
  getInputAudioMonitorType,
  getInputAudioSyncOffset,
  getInputAudioTracks,
  getInputDefaultSettings,
  getInputDeinterlaceFieldOrder,
  getInputDeinterlaceMode,
  getInputMute,
  getInputPropertiesListPropertyItems,
  getInputSettings,
  getInputVolume,
  getMediaInputStatus,
  getSpecialInputs,
  listInputKinds,
  listInputs,
  offsetMediaInputCursor,
  pressInputPropertiesButton,
  removeInput,
  setInputAudioBalance,
  setInputAudioMonitorType,
  setInputAudioSyncOffset,
  setInputAudioTracks,
  setInputDeinterlaceFieldOrder,
  setInputDeinterlaceMode,
  setInputMute,
  setInputName,
  setInputSettings,
  setInputVolume,
  setMediaInputCursor,
  toggleInputMute,
  triggerMediaInputAction
} from "../../src/obs/operations/inputs.js"
import {
  getLastReplayBufferReplay,
  getOutputSettings,
  getOutputStatus,
  getReplayBufferStatus,
  getVirtualCamStatus,
  listOutputs,
  saveReplayBuffer,
  setOutputSettings,
  startOutput,
  startReplayBuffer,
  startVirtualCam,
  stopOutput,
  stopReplayBuffer,
  stopVirtualCam,
  toggleOutput,
  toggleReplayBuffer,
  toggleVirtualCam
} from "../../src/obs/operations/outputs.js"
import { getPersistentData, setPersistentData } from "../../src/obs/operations/persistent-data.js"
import {
  createRecordChapter,
  pauseRecord,
  resumeRecord,
  splitRecordFile,
  startRecord,
  stopRecord,
  toggleRecord,
  toggleRecordPause
} from "../../src/obs/operations/record.js"
import {
  createScene,
  createSceneItem,
  duplicateSceneItem,
  getCurrentPreviewScene,
  getCurrentScene,
  getSceneItemBlendMode,
  getSceneItemEnabled,
  getSceneItemIndex,
  getSceneItemSource,
  getSceneItemTransform,
  getSceneTransitionOverride,
  getSourceActive,
  listGroups,
  listGroupSceneItems,
  listSceneItems,
  listScenes,
  removeScene,
  removeSceneItem,
  setCurrentPreviewScene,
  setCurrentScene,
  setSceneItemTransform,
  setSceneName,
  setSceneTransitionOverride
} from "../../src/obs/operations/scenes.js"
import { getSourceScreenshot, saveSourceScreenshot } from "../../src/obs/operations/screenshots.js"
import {
  getStreamStatus,
  sendStreamCaption,
  startStream,
  stopStream,
  toggleStream
} from "../../src/obs/operations/stream.js"
import {
  getCurrentSceneTransition,
  getCurrentSceneTransitionCursor,
  listSceneTransitions,
  listTransitionKinds,
  setCurrentSceneTransition,
  setCurrentSceneTransitionDuration,
  setCurrentSceneTransitionSettings,
  setTBarPosition,
  triggerStudioModeTransition
} from "../../src/obs/operations/transitions.js"
import {
  getStudioModeEnabled,
  listMonitors,
  openInputFiltersDialog,
  openInputInteractDialog,
  openInputPropertiesDialog,
  openSourceProjector,
  openVideoMixProjector,
  setStudioModeEnabled
} from "../../src/obs/operations/ui.js"
import { broadcastCustomEvent, callVendorRequest } from "../../src/obs/operations/vendor.js"
import { EventSubscription } from "../../src/obs/protocol.js"
import type { ObsRequestType } from "../../src/obs/requests.js"
import { expectSchemaDecodeFailure } from "../support/effect-assertions.js"
import { handleFakeObsSceneItemReadRequest } from "./fake-obs-scene-item-requests.js"
import { FakeObsServer } from "./fake-obs-server.js"

const servers: Array<FakeObsServer> = []
const clients: Array<ObsClient> = []

const configFor = (url: string): ObsConfig => ({
  url,
  password: Option.none(),
  connectionTimeoutMs: 300,
  enabledToolsets: ["scenes"]
})

const fakeClient = (handler: (requestType: ObsRequestType, requestData: unknown) => Promise<unknown>): ObsClient => ({
  negotiatedRpcVersion: 1,
  availableRequests: [],
  requestBatch: async () => [],
  request: async (descriptor, requestData) =>
    Schema.decodeUnknownSync(descriptor.responseSchema)(await handler(descriptor.requestType, requestData)),
  getBufferedEvents: () => ({
    capacity: 1,
    droppedEvents: 0,
    oldestSequence: 0,
    latestSequence: 0,
    missedEvents: false,
    events: []
  }),
  waitForBufferedEvent: async (_match, options) => ({
    timedOut: true,
    baselineSequence: options.afterSequence,
    snapshot: {
      capacity: 1,
      droppedEvents: 0,
      oldestSequence: 0,
      latestSequence: 0,
      missedEvents: false,
      events: []
    }
  }),
  addEventListener: () => () => undefined,
  close: async () => undefined
})

const bufferedEventClient = (
  events: ReadonlyArray<BufferedObsEvent>,
  options: { readonly droppedEvents?: number } = {}
): ObsClient => {
  const snapshotFor = (sinceSequence?: number) => {
    const oldestSequence = events[0]?.sequence ?? 0
    const latestSequence = events.at(-1)?.sequence ?? 0
    const missedEvents = sinceSequence !== undefined && oldestSequence > 0 && sinceSequence < oldestSequence - 1
    return {
      capacity: events.length,
      droppedEvents: options.droppedEvents ?? 0,
      oldestSequence,
      latestSequence,
      missedEvents,
      events: sinceSequence === undefined ? events : events.filter((event) => event.sequence > sinceSequence)
    }
  }
  return {
    negotiatedRpcVersion: 1,
    availableRequests: [],
    requestBatch: async () => [],
    request: async (descriptor) => Schema.decodeUnknownSync(descriptor.responseSchema)({}),
    getBufferedEvents: (input) => snapshotFor(input?.sinceSequence),
    waitForBufferedEvent: async (match, waitOptions) => {
      const snapshot = snapshotFor(waitOptions.afterSequence)
      const event = snapshot.events.find(match)
      return {
        timedOut: event === undefined,
        baselineSequence: waitOptions.afterSequence,
        snapshot,
        ...(event === undefined ? {} : { event })
      }
    },
    addEventListener: () => () => undefined,
    close: async () => undefined
  }
}

afterEach(async () => {
  await Promise.all(clients.splice(0).map((client) => client.close().catch(() => undefined)))
  await Promise.all(servers.splice(0).map((server) => server.stop()))
})

describe("OBS operations", () => {
  it("rejects unknown scene graph confirmation fields on direct operation calls", async () => {
    await expect(confirmObsSceneGraphChange(fakeClient(async () => ({})), {
      target: "scene",
      outcome: "created",
      afterSequence: 0,
      sceneItemIndex: 0
    } as never, { maxTimeoutMs: 10 })).rejects.toThrow("sceneItemIndex")
  })

  it("rejects unknown source filter confirmation fields on direct operation calls", async () => {
    await expect(confirmObsSourceFilterChange(fakeClient(async () => ({})), {
      target: "source_filter",
      outcome: "created",
      afterSequence: 0,
      sourceName: "Camera",
      filterSettings: { secret: true }
    } as never, { maxTimeoutMs: 10 })).rejects.toThrow("filterSettings")
  })

  it("rejects unknown media input workflow fields on direct operation calls", async () => {
    await expect(confirmObsMediaInputWorkflow(fakeClient(async () => ({})), {
      target: "media_input",
      outcome: "playback_started",
      afterSequence: 0,
      mediaCursor: 1000
    } as never, { maxTimeoutMs: 10 })).rejects.toThrow("mediaCursor")
  })

  it("rejects unknown transition workflow fields on direct operation calls", async () => {
    await expect(confirmObsTransitionWorkflow(fakeClient(async () => ({})), {
      target: "scene_transition",
      outcome: "started",
      afterSequence: 0,
      position: 0.5
    } as never, { maxTimeoutMs: 10 })).rejects.toThrow("position")
  })

  it("rejects unknown input audio confirmation fields on direct operation calls", async () => {
    await expect(confirmObsInputAudioChange(fakeClient(async () => ({})), {
      target: "input_audio",
      outcome: "muted",
      afterSequence: 0,
      inputMuted: true
    } as never, { maxTimeoutMs: 10 })).rejects.toThrow("inputMuted")
  })

  it("rejects unknown config workflow fields on direct operation calls", async () => {
    await expect(confirmObsConfigWorkflow(fakeClient(async () => ({})), {
      target: "profile",
      outcome: "changed",
      afterSequence: 0,
      eventType: "CurrentProfileChanged"
    } as never, { maxTimeoutMs: 10 })).rejects.toThrow("eventType")
  })

  it("rejects unknown canvas inventory-change fields on direct operation calls", async () => {
    await expect(confirmObsCanvasInventoryChange(fakeClient(async () => ({})), {
      target: "canvas",
      outcome: "created",
      afterSequence: 0,
      oldCanvasName: "Old Canvas"
    } as never, { maxTimeoutMs: 10 })).rejects.toThrow("oldCanvasName")
  })

  it("rejects unknown studio-mode state confirmation fields on direct operation calls", async () => {
    await expect(confirmObsStudioModeStateChange(fakeClient(async () => ({})), {
      target: "studio_mode",
      outcome: "enabled",
      afterSequence: 0,
      studioModeEnabled: true
    } as never, { maxTimeoutMs: 10 })).rejects.toThrow("studioModeEnabled")
  })

  it("confirms canvas inventory-change events with identity filters", async () => {
    const client = bufferedEventClient([
      {
        sequence: 1,
        eventType: "CanvasCreated",
        eventIntent: EventSubscription.Canvases,
        eventData: { canvasName: "Canvas A", canvasUuid: "canvas-a" }
      },
      {
        sequence: 2,
        eventType: "CanvasRemoved",
        eventIntent: EventSubscription.Canvases,
        eventData: { canvasName: "Canvas B", canvasUuid: "canvas-b" }
      },
      {
        sequence: 3,
        eventType: "CanvasNameChanged",
        eventIntent: EventSubscription.Canvases,
        eventData: { oldCanvasName: "Canvas C", canvasName: "Canvas D", canvasUuid: "canvas-d" }
      }
    ])

    await expect(confirmObsCanvasInventoryChange(client, {
      target: "canvas",
      outcome: "created",
      afterSequence: 0,
      canvasName: "Canvas A",
      canvasUuid: "canvas-a"
    }, { maxTimeoutMs: 10 })).resolves.toMatchObject({
      confirmed: true,
      event: {
        sequence: 1,
        eventType: "CanvasCreated",
        eventIntent: EventSubscription.Canvases,
        category: "canvases",
        target: "canvas",
        outcome: "created",
        canvasName: "Canvas A",
        canvasUuid: "canvas-a"
      }
    })
    await expect(confirmObsCanvasInventoryChange(client, {
      target: "canvas",
      outcome: "removed",
      afterSequence: 0,
      canvasUuid: "canvas-b"
    }, { maxTimeoutMs: 10 })).resolves.toMatchObject({
      confirmed: true,
      event: { sequence: 2, eventType: "CanvasRemoved", outcome: "removed", canvasName: "Canvas B" }
    })
    await expect(confirmObsCanvasInventoryChange(client, {
      target: "canvas",
      outcome: "renamed",
      afterSequence: 0,
      oldCanvasName: "Canvas C",
      canvasName: "Canvas D",
      canvasUuid: "canvas-d"
    }, { maxTimeoutMs: 10 })).resolves.toMatchObject({
      confirmed: true,
      event: {
        sequence: 3,
        eventType: "CanvasNameChanged",
        outcome: "renamed",
        oldCanvasName: "Canvas C",
        canvasName: "Canvas D",
        canvasUuid: "canvas-d"
      }
    })
  })

  it("does not cross-match canvas inventory-change outcomes or mismatched filters", async () => {
    const client = bufferedEventClient([
      {
        sequence: 1,
        eventType: "CanvasCreated",
        eventIntent: EventSubscription.Canvases,
        eventData: { canvasName: "Canvas A", canvasUuid: "canvas-a" }
      },
      {
        sequence: 2,
        eventType: "CanvasRemoved",
        eventIntent: EventSubscription.Canvases,
        eventData: { canvasName: "Canvas B", canvasUuid: "canvas-b" }
      },
      {
        sequence: 3,
        eventType: "CanvasNameChanged",
        eventIntent: EventSubscription.Canvases,
        eventData: { oldCanvasName: "Canvas C", canvasName: "Canvas D", canvasUuid: "canvas-d" }
      },
      {
        sequence: 4,
        eventType: "SceneCreated",
        eventIntent: EventSubscription.Scenes,
        eventData: { sceneName: "Canvas A", sceneUuid: "scene-a", isGroup: false }
      }
    ])
    const cases = [
      { target: "canvas", outcome: "removed", afterSequence: 0, canvasUuid: "canvas-a" },
      { target: "canvas", outcome: "created", afterSequence: 0, canvasUuid: "canvas-b" },
      { target: "canvas", outcome: "created", afterSequence: 0, canvasUuid: "canvas-d" },
      { target: "canvas", outcome: "removed", afterSequence: 0, canvasUuid: "canvas-d" },
      { target: "canvas", outcome: "renamed", afterSequence: 0, canvasUuid: "canvas-a" },
      { target: "canvas", outcome: "renamed", afterSequence: 0, oldCanvasName: "Canvas B" },
      { target: "canvas", outcome: "created", afterSequence: 1 },
      { target: "canvas", outcome: "removed", afterSequence: 2 },
      { target: "canvas", outcome: "renamed", afterSequence: 3 }
    ] as const

    for (const input of cases) {
      await expect(confirmObsCanvasInventoryChange(client, { ...input, timeoutMs: 1 }, { maxTimeoutMs: 5 }))
        .resolves.toMatchObject({ confirmed: false, timedOut: true, latestSequence: 4 })
    }
  })

  it("does not let malformed retained canvas events satisfy inventory-change confirmation", async () => {
    const client = bufferedEventClient([
      {
        sequence: 1,
        eventType: "CanvasCreated",
        eventIntent: EventSubscription.Canvases,
        eventData: { canvasName: "", canvasUuid: "canvas-a" }
      },
      {
        sequence: 2,
        eventType: "CanvasRemoved",
        eventIntent: EventSubscription.Canvases,
        eventData: { canvasName: "Canvas B", canvasUuid: "" }
      },
      {
        sequence: 3,
        eventType: "CanvasNameChanged",
        eventIntent: EventSubscription.Canvases,
        eventData: { oldCanvasName: "", canvasName: "Canvas D", canvasUuid: "canvas-d" }
      },
      {
        sequence: 4,
        eventType: "CanvasCreated",
        eventIntent: EventSubscription.General,
        eventData: { canvasName: "Canvas E", canvasUuid: "canvas-e" }
      },
      {
        sequence: 5,
        eventType: "CanvasCreated",
        eventIntent: EventSubscription.Canvases,
        eventData: { canvasName: "Canvas F", canvasUuid: "canvas-f", canvasSettings: {} }
      },
      {
        sequence: 6,
        eventType: "CanvasRemoved",
        eventIntent: EventSubscription.Canvases,
        eventData: { canvasName: "Canvas G", canvasUuid: "canvas-g", canvasSettings: {} }
      },
      {
        sequence: 7,
        eventType: "CanvasNameChanged",
        eventIntent: EventSubscription.Canvases,
        eventData: {
          oldCanvasName: "Canvas H",
          canvasName: "Canvas I",
          canvasUuid: "canvas-i",
          canvasSettings: {}
        }
      }
    ])

    for (const outcome of ["created", "removed", "renamed"] as const) {
      await expect(confirmObsCanvasInventoryChange(client, {
        target: "canvas",
        outcome,
        afterSequence: 0,
        timeoutMs: 1
      }, { maxTimeoutMs: 5 })).resolves.toMatchObject({ confirmed: false, timedOut: true, latestSequence: 7 })
    }
  })

  it("propagates missed-event metadata for canvas inventory-change confirmation", async () => {
    await expect(confirmObsCanvasInventoryChange(
      bufferedEventClient([
        {
          sequence: 3,
          eventType: "CanvasCreated",
          eventIntent: EventSubscription.Canvases,
          eventData: { canvasName: "Canvas A", canvasUuid: "canvas-a" }
        }
      ], { droppedEvents: 2 }),
      {
        target: "canvas",
        outcome: "created",
        afterSequence: 0
      },
      { maxTimeoutMs: 10 }
    )).resolves.toMatchObject({
      confirmed: true,
      baselineSequence: 0,
      latestSequence: 3,
      missedEvents: true,
      event: { sequence: 3, eventType: "CanvasCreated" }
    })
  })

  it("confirms studio-mode state change events by enabled or disabled outcome", async () => {
    const client = bufferedEventClient([
      {
        sequence: 1,
        eventType: "StudioModeStateChanged",
        eventIntent: EventSubscription.Ui,
        eventData: { studioModeEnabled: true }
      },
      {
        sequence: 2,
        eventType: "StudioModeStateChanged",
        eventIntent: EventSubscription.Ui,
        eventData: { studioModeEnabled: false }
      }
    ])

    await expect(confirmObsStudioModeStateChange(client, {
      target: "studio_mode",
      outcome: "enabled",
      afterSequence: 0
    }, { maxTimeoutMs: 10 })).resolves.toMatchObject({
      confirmed: true,
      timedOut: false,
      event: {
        sequence: 1,
        eventType: "StudioModeStateChanged",
        eventIntent: EventSubscription.Ui,
        category: "ui",
        target: "studio_mode",
        outcome: "enabled",
        studioModeEnabled: true
      }
    })
    await expect(confirmObsStudioModeStateChange(client, {
      target: "studio_mode",
      outcome: "disabled",
      afterSequence: 1
    }, { maxTimeoutMs: 10 })).resolves.toMatchObject({
      confirmed: true,
      timedOut: false,
      event: {
        sequence: 2,
        eventType: "StudioModeStateChanged",
        eventIntent: EventSubscription.Ui,
        category: "ui",
        target: "studio_mode",
        outcome: "disabled",
        studioModeEnabled: false
      }
    })
  })

  it("does not cross-match studio-mode outcomes, wrong subscriptions, screenshots, or transition events", async () => {
    const client = bufferedEventClient([
      {
        sequence: 1,
        eventType: "StudioModeStateChanged",
        eventIntent: EventSubscription.Ui,
        eventData: { studioModeEnabled: true }
      },
      {
        sequence: 2,
        eventType: "StudioModeStateChanged",
        eventIntent: EventSubscription.General,
        eventData: { studioModeEnabled: false }
      },
      {
        sequence: 3,
        eventType: "StudioModeStateChanged",
        eventIntent: EventSubscription.Ui | EventSubscription.Vendors,
        eventData: { studioModeEnabled: false }
      },
      {
        sequence: 4,
        eventType: "ScreenshotSaved",
        eventIntent: EventSubscription.Ui,
        eventData: { savedScreenshotPath: "/tmp/screenshot.png" }
      },
      {
        sequence: 5,
        eventType: "SceneTransitionStarted",
        eventIntent: EventSubscription.Transitions,
        eventData: { transitionName: "Fade", transitionUuid: "transition-fade" }
      }
    ])

    await expect(confirmObsStudioModeStateChange(client, {
      target: "studio_mode",
      outcome: "disabled",
      afterSequence: 0,
      timeoutMs: 1
    }, { maxTimeoutMs: 5 })).resolves.toMatchObject({
      confirmed: false,
      timedOut: true,
      latestSequence: 5
    })
    await expect(confirmObsStudioModeStateChange(client, {
      target: "studio_mode",
      outcome: "enabled",
      afterSequence: 1,
      timeoutMs: 1
    }, { maxTimeoutMs: 5 })).resolves.toMatchObject({
      confirmed: false,
      timedOut: true,
      latestSequence: 5
    })
  })

  it("does not let malformed retained studio-mode events satisfy confirmation", async () => {
    const client = bufferedEventClient([
      {
        sequence: 1,
        eventType: "StudioModeStateChanged",
        eventIntent: EventSubscription.Ui,
        eventData: { studioModeEnabled: "yes" }
      },
      {
        sequence: 2,
        eventType: "StudioModeStateChanged",
        eventIntent: EventSubscription.Ui,
        eventData: { studioModeEnabled: true, savedScreenshotPath: "/tmp/screenshot.png" }
      }
    ])

    for (const outcome of ["enabled", "disabled"] as const) {
      await expect(confirmObsStudioModeStateChange(client, {
        target: "studio_mode",
        outcome,
        afterSequence: 0,
        timeoutMs: 1
      }, { maxTimeoutMs: 5 })).resolves.toMatchObject({
        confirmed: false,
        timedOut: true,
        latestSequence: 2
      })
    }
  })

  it("propagates missed-event metadata for studio-mode state confirmation", async () => {
    await expect(confirmObsStudioModeStateChange(
      bufferedEventClient([
        {
          sequence: 3,
          eventType: "StudioModeStateChanged",
          eventIntent: EventSubscription.Ui,
          eventData: { studioModeEnabled: false }
        }
      ], { droppedEvents: 2 }),
      {
        target: "studio_mode",
        outcome: "disabled",
        afterSequence: 0
      },
      { maxTimeoutMs: 10 }
    )).resolves.toMatchObject({
      confirmed: true,
      baselineSequence: 0,
      latestSequence: 3,
      missedEvents: true,
      event: { sequence: 3, eventType: "StudioModeStateChanged", outcome: "disabled" }
    })
  })

  it("confirms input identity changes with identity filters", async () => {
    const client = bufferedEventClient([
      {
        sequence: 1,
        eventType: "InputRemoved",
        eventIntent: EventSubscription.Inputs,
        eventData: { inputName: "Old Mic", inputUuid: "input-old-mic" }
      },
      {
        sequence: 2,
        eventType: "InputNameChanged",
        eventIntent: EventSubscription.Inputs,
        eventData: { inputUuid: "input-camera", oldInputName: "Camera A", inputName: "Camera B" }
      }
    ])

    await expect(confirmObsInputIdentityChange(client, {
      target: "input",
      outcome: "removed",
      afterSequence: 0,
      inputName: "Old Mic",
      inputUuid: "input-old-mic"
    }, { maxTimeoutMs: 10 })).resolves.toMatchObject({
      confirmed: true,
      timedOut: false,
      event: {
        sequence: 1,
        eventType: "InputRemoved",
        eventIntent: EventSubscription.Inputs,
        category: "inputs",
        target: "input",
        outcome: "removed",
        inputName: "Old Mic",
        inputUuid: "input-old-mic"
      }
    })
    await expect(confirmObsInputIdentityChange(client, {
      target: "input",
      outcome: "renamed",
      afterSequence: 0,
      oldInputName: "Camera A",
      inputName: "Camera B",
      inputUuid: "input-camera"
    }, { maxTimeoutMs: 10 })).resolves.toMatchObject({
      confirmed: true,
      timedOut: false,
      event: {
        sequence: 2,
        eventType: "InputNameChanged",
        eventIntent: EventSubscription.Inputs,
        category: "inputs",
        target: "input",
        outcome: "renamed",
        oldInputName: "Camera A",
        inputName: "Camera B",
        inputUuid: "input-camera"
      }
    })
  })

  it("does not cross-match input identity outcomes, deferred input events, or wrong subscriptions", async () => {
    const client = bufferedEventClient([
      {
        sequence: 1,
        eventType: "InputRemoved",
        eventIntent: EventSubscription.Inputs,
        eventData: { inputName: "Mic", inputUuid: "input-mic" }
      },
      {
        sequence: 2,
        eventType: "InputNameChanged",
        eventIntent: EventSubscription.General,
        eventData: { inputUuid: "input-camera", oldInputName: "Camera A", inputName: "Camera B" }
      },
      {
        sequence: 3,
        eventType: "InputCreated",
        eventIntent: EventSubscription.Inputs,
        eventData: {
          inputName: "Media",
          inputUuid: "input-media",
          inputKind: "ffmpeg_source",
          unversionedInputKind: "ffmpeg_source",
          inputKindCaps: 1,
          inputSettings: { secret: true },
          defaultInputSettings: { secret: false }
        }
      },
      {
        sequence: 4,
        eventType: "InputSettingsChanged",
        eventIntent: EventSubscription.Inputs,
        eventData: { inputName: "Mic", inputUuid: "input-mic", inputSettings: { secret: true } }
      }
    ])

    await expect(confirmObsInputIdentityChange(client, {
      target: "input",
      outcome: "renamed",
      afterSequence: 0,
      timeoutMs: 1
    }, { maxTimeoutMs: 5 })).resolves.toMatchObject({
      confirmed: false,
      timedOut: true,
      latestSequence: 4
    })
    await expect(confirmObsInputIdentityChange(client, {
      target: "input",
      outcome: "removed",
      afterSequence: 1,
      timeoutMs: 1
    }, { maxTimeoutMs: 5 })).resolves.toMatchObject({
      confirmed: false,
      timedOut: true,
      latestSequence: 4
    })
  })

  it("does not let malformed retained input identity events satisfy confirmation", async () => {
    const client = bufferedEventClient([
      {
        sequence: 1,
        eventType: "InputRemoved",
        eventIntent: EventSubscription.Inputs,
        eventData: { inputName: "", inputUuid: "input-mic" }
      },
      {
        sequence: 2,
        eventType: "InputNameChanged",
        eventIntent: EventSubscription.Inputs,
        eventData: {
          inputUuid: "input-camera",
          oldInputName: "Camera A",
          inputName: "Camera B",
          inputSettings: { secret: true }
        }
      }
    ])

    for (const outcome of ["removed", "renamed"] as const) {
      await expect(confirmObsInputIdentityChange(client, {
        target: "input",
        outcome,
        afterSequence: 0,
        timeoutMs: 1
      }, { maxTimeoutMs: 5 })).resolves.toMatchObject({
        confirmed: false,
        timedOut: true,
        latestSequence: 2
      })
    }
  })

  it("confirms config workflow events with identity and full ordered list filters", async () => {
    const client = bufferedEventClient([
      {
        sequence: 1,
        eventType: "CurrentProfileChanging",
        eventIntent: EventSubscription.Config,
        eventData: { profileName: "Profile A" }
      },
      {
        sequence: 2,
        eventType: "CurrentProfileChanged",
        eventIntent: EventSubscription.Config,
        eventData: { profileName: "Profile B" }
      },
      {
        sequence: 3,
        eventType: "ProfileListChanged",
        eventIntent: EventSubscription.Config,
        eventData: { profiles: ["Profile A", "Profile B"] }
      },
      {
        sequence: 4,
        eventType: "CurrentSceneCollectionChanging",
        eventIntent: EventSubscription.Config,
        eventData: { sceneCollectionName: "Collection A" }
      },
      {
        sequence: 5,
        eventType: "CurrentSceneCollectionChanged",
        eventIntent: EventSubscription.Config,
        eventData: { sceneCollectionName: "Collection B" }
      },
      {
        sequence: 6,
        eventType: "SceneCollectionListChanged",
        eventIntent: EventSubscription.Config,
        eventData: { sceneCollections: ["Collection A", "Collection B"] }
      }
    ])

    await expect(confirmObsConfigWorkflow(client, {
      target: "profile",
      outcome: "changing",
      afterSequence: 0,
      profileName: "Profile A"
    }, { maxTimeoutMs: 10 })).resolves.toMatchObject({
      confirmed: true,
      event: { sequence: 1, eventType: "CurrentProfileChanging", outcome: "changing", profileName: "Profile A" }
    })
    await expect(confirmObsConfigWorkflow(client, {
      target: "profile",
      outcome: "changed",
      afterSequence: 0,
      profileName: "Profile B"
    }, { maxTimeoutMs: 10 })).resolves.toMatchObject({
      confirmed: true,
      event: { sequence: 2, eventType: "CurrentProfileChanged", outcome: "changed", profileName: "Profile B" }
    })
    await expect(confirmObsConfigWorkflow(client, {
      target: "profile",
      outcome: "list_changed",
      afterSequence: 0,
      profiles: ["Profile A", "Profile B"]
    }, { maxTimeoutMs: 10 })).resolves.toMatchObject({
      confirmed: true,
      event: { sequence: 3, eventType: "ProfileListChanged", outcome: "list_changed" }
    })
    await expect(confirmObsConfigWorkflow(client, {
      target: "scene_collection",
      outcome: "changing",
      afterSequence: 0,
      sceneCollectionName: "Collection A"
    }, { maxTimeoutMs: 10 })).resolves.toMatchObject({
      confirmed: true,
      event: {
        sequence: 4,
        eventType: "CurrentSceneCollectionChanging",
        outcome: "changing",
        sceneCollectionName: "Collection A"
      }
    })
    await expect(confirmObsConfigWorkflow(client, {
      target: "scene_collection",
      outcome: "changed",
      afterSequence: 0,
      sceneCollectionName: "Collection B"
    }, { maxTimeoutMs: 10 })).resolves.toMatchObject({
      confirmed: true,
      event: {
        sequence: 5,
        eventType: "CurrentSceneCollectionChanged",
        outcome: "changed",
        sceneCollectionName: "Collection B"
      }
    })
    await expect(confirmObsConfigWorkflow(client, {
      target: "scene_collection",
      outcome: "list_changed",
      afterSequence: 0,
      sceneCollections: ["Collection A", "Collection B"]
    }, { maxTimeoutMs: 10 })).resolves.toMatchObject({
      confirmed: true,
      event: { sequence: 6, eventType: "SceneCollectionListChanged", outcome: "list_changed" }
    })

    await expect(confirmObsConfigWorkflow(client, {
      target: "profile",
      outcome: "list_changed",
      afterSequence: 0,
      profiles: ["Profile B", "Profile A"],
      timeoutMs: 1
    }, { maxTimeoutMs: 5 })).resolves.toMatchObject({ confirmed: false, timedOut: true, latestSequence: 6 })
  })

  it("does not cross-match config targets, milestones, list events, or excluded events", async () => {
    const client = bufferedEventClient([
      {
        sequence: 1,
        eventType: "CurrentProfileChanging",
        eventIntent: EventSubscription.Config,
        eventData: { profileName: "Profile A" }
      },
      {
        sequence: 2,
        eventType: "CurrentProfileChanged",
        eventIntent: EventSubscription.Config,
        eventData: { profileName: "Profile B" }
      },
      {
        sequence: 3,
        eventType: "ProfileListChanged",
        eventIntent: EventSubscription.Config,
        eventData: { profiles: ["Profile A", "Profile B"] }
      },
      {
        sequence: 4,
        eventType: "CurrentSceneCollectionChanging",
        eventIntent: EventSubscription.Config,
        eventData: { sceneCollectionName: "Collection A" }
      },
      {
        sequence: 5,
        eventType: "CurrentSceneCollectionChanged",
        eventIntent: EventSubscription.Config,
        eventData: { sceneCollectionName: "Collection B" }
      },
      {
        sequence: 6,
        eventType: "SceneCollectionListChanged",
        eventIntent: EventSubscription.Config,
        eventData: { sceneCollections: ["Collection A", "Collection B"] }
      },
      {
        sequence: 7,
        eventType: "ExitStarted",
        eventIntent: EventSubscription.General,
        eventData: {}
      },
      {
        sequence: 8,
        eventType: "CurrentProgramSceneChanged",
        eventIntent: EventSubscription.Scenes,
        eventData: { sceneName: "Program", sceneUuid: "scene-program" }
      },
      {
        sequence: 9,
        eventType: "VendorEvent",
        eventIntent: EventSubscription.Vendors,
        eventData: { vendorName: "plugin", payload: { raw: true } }
      }
    ])
    const cases = [
      { target: "profile", outcome: "changed", afterSequence: 0, profileName: "Profile A" },
      { target: "profile", outcome: "changing", afterSequence: 1 },
      { target: "profile", outcome: "list_changed", afterSequence: 3 },
      { target: "scene_collection", outcome: "changed", afterSequence: 0, sceneCollectionName: "Collection A" },
      { target: "scene_collection", outcome: "changing", afterSequence: 4 },
      { target: "scene_collection", outcome: "list_changed", afterSequence: 6 },
      { target: "scene_collection", outcome: "changed", afterSequence: 0, sceneCollectionName: "Profile B" },
      { target: "profile", outcome: "changed", afterSequence: 6 }
    ] as const

    for (const input of cases) {
      await expect(confirmObsConfigWorkflow(client, { ...input, timeoutMs: 1 }, { maxTimeoutMs: 5 }))
        .resolves.toMatchObject({ confirmed: false, timedOut: true, latestSequence: 9 })
    }
  })

  it("does not let malformed retained config events satisfy workflow confirmation", async () => {
    const client = bufferedEventClient([
      {
        sequence: 1,
        eventType: "CurrentProfileChanged",
        eventIntent: EventSubscription.Config,
        eventData: { profileName: "" }
      },
      {
        sequence: 2,
        eventType: "CurrentProfileChanged",
        eventIntent: EventSubscription.Config,
        eventData: { profileName: "Profile B", profiles: ["Profile B"] }
      },
      {
        sequence: 3,
        eventType: "ProfileListChanged",
        eventIntent: EventSubscription.Config,
        eventData: { profiles: "Profile B" }
      },
      {
        sequence: 4,
        eventType: "ProfileListChanged",
        eventIntent: EventSubscription.Config,
        eventData: { profiles: ["Profile B", 1] }
      },
      {
        sequence: 5,
        eventType: "ProfileListChanged",
        eventIntent: EventSubscription.Config,
        eventData: { profiles: ["Profile B", ""] }
      },
      {
        sequence: 6,
        eventType: "ProfileListChanged",
        eventIntent: EventSubscription.Config,
        eventData: { profiles: ["Profile B"], profileName: "Profile B" }
      },
      {
        sequence: 7,
        eventType: "SceneCollectionListChanged",
        eventIntent: EventSubscription.Config,
        eventData: { sceneCollections: ["Collection B", ""] }
      },
      {
        sequence: 8,
        eventType: "CurrentSceneCollectionChanged",
        eventIntent: EventSubscription.Config,
        eventData: { sceneCollectionName: "Collection B", sceneCollections: ["Collection B"] }
      }
    ])

    await expect(confirmObsConfigWorkflow(client, {
      target: "profile",
      outcome: "changed",
      afterSequence: 0,
      timeoutMs: 1
    }, { maxTimeoutMs: 5 })).resolves.toMatchObject({ confirmed: false, timedOut: true, latestSequence: 8 })
    await expect(confirmObsConfigWorkflow(client, {
      target: "profile",
      outcome: "list_changed",
      afterSequence: 0,
      timeoutMs: 1
    }, { maxTimeoutMs: 5 })).resolves.toMatchObject({ confirmed: false, timedOut: true, latestSequence: 8 })
    await expect(confirmObsConfigWorkflow(client, {
      target: "scene_collection",
      outcome: "list_changed",
      afterSequence: 0,
      timeoutMs: 1
    }, { maxTimeoutMs: 5 })).resolves.toMatchObject({ confirmed: false, timedOut: true, latestSequence: 8 })
    await expect(confirmObsConfigWorkflow(client, {
      target: "scene_collection",
      outcome: "changed",
      afterSequence: 0,
      timeoutMs: 1
    }, { maxTimeoutMs: 5 })).resolves.toMatchObject({ confirmed: false, timedOut: true, latestSequence: 8 })
  })

  it("propagates missed-event metadata for config workflow confirmation", async () => {
    await expect(confirmObsConfigWorkflow(
      bufferedEventClient([
        {
          sequence: 3,
          eventType: "CurrentProfileChanged",
          eventIntent: EventSubscription.Config,
          eventData: { profileName: "Profile B" }
        }
      ], { droppedEvents: 2 }),
      {
        target: "profile",
        outcome: "changed",
        afterSequence: 0
      },
      { maxTimeoutMs: 10 }
    )).resolves.toMatchObject({
      confirmed: true,
      baselineSequence: 0,
      latestSequence: 3,
      missedEvents: true,
      event: { sequence: 3 }
    })
  })

  it("confirms input audio control events with identity and value filters", async () => {
    const client = bufferedEventClient([
      {
        sequence: 1,
        eventType: "InputMuteStateChanged",
        eventIntent: EventSubscription.Inputs,
        eventData: { inputName: "Mic A", inputUuid: "input-mic-a", inputMuted: true }
      },
      {
        sequence: 2,
        eventType: "InputMuteStateChanged",
        eventIntent: EventSubscription.Inputs,
        eventData: { inputName: "Mic B", inputUuid: "input-mic-b", inputMuted: false }
      },
      {
        sequence: 3,
        eventType: "InputVolumeChanged",
        eventIntent: EventSubscription.Inputs,
        eventData: { inputName: "Mic A", inputUuid: "input-mic-a", inputVolumeMul: 0.5, inputVolumeDb: -6 }
      },
      {
        sequence: 4,
        eventType: "InputAudioBalanceChanged",
        eventIntent: EventSubscription.Inputs,
        eventData: { inputName: "Mic A", inputUuid: "input-mic-a", inputAudioBalance: 0.25 }
      },
      {
        sequence: 5,
        eventType: "InputAudioSyncOffsetChanged",
        eventIntent: EventSubscription.Inputs,
        eventData: { inputName: "Mic A", inputUuid: "input-mic-a", inputAudioSyncOffset: -250 }
      },
      {
        sequence: 6,
        eventType: "InputAudioTracksChanged",
        eventIntent: EventSubscription.Inputs,
        eventData: {
          inputName: "Mic A",
          inputUuid: "input-mic-a",
          inputAudioTracks: { "1": true, "2": false, "3": true, "4": false, "5": false, "6": true }
        }
      },
      {
        sequence: 7,
        eventType: "InputAudioMonitorTypeChanged",
        eventIntent: EventSubscription.Inputs,
        eventData: {
          inputName: "Mic A",
          inputUuid: "input-mic-a",
          monitorType: "OBS_MONITORING_TYPE_MONITOR_AND_OUTPUT"
        }
      }
    ])

    await expect(confirmObsInputAudioChange(client, {
      target: "input_audio",
      outcome: "muted",
      afterSequence: 0,
      inputName: "Mic A",
      inputUuid: "input-mic-a"
    }, { maxTimeoutMs: 10 })).resolves.toMatchObject({
      confirmed: true,
      event: { sequence: 1, eventType: "InputMuteStateChanged", outcome: "muted", inputMuted: true }
    })
    await expect(confirmObsInputAudioChange(client, {
      target: "input_audio",
      outcome: "unmuted",
      afterSequence: 0,
      inputUuid: "input-mic-b"
    }, { maxTimeoutMs: 10 })).resolves.toMatchObject({
      confirmed: true,
      event: { sequence: 2, eventType: "InputMuteStateChanged", outcome: "unmuted", inputMuted: false }
    })
    await expect(confirmObsInputAudioChange(client, {
      target: "input_audio",
      outcome: "volume_changed",
      afterSequence: 0,
      inputVolumeMul: 0.5,
      inputVolumeDb: -6
    }, { maxTimeoutMs: 10 })).resolves.toMatchObject({
      confirmed: true,
      event: { sequence: 3, eventType: "InputVolumeChanged", outcome: "volume_changed" }
    })
    await expect(confirmObsInputAudioChange(client, {
      target: "input_audio",
      outcome: "balance_changed",
      afterSequence: 0,
      inputAudioBalance: 0.25
    }, { maxTimeoutMs: 10 })).resolves.toMatchObject({
      confirmed: true,
      event: { sequence: 4, eventType: "InputAudioBalanceChanged", outcome: "balance_changed" }
    })
    await expect(confirmObsInputAudioChange(client, {
      target: "input_audio",
      outcome: "sync_offset_changed",
      afterSequence: 0,
      inputAudioSyncOffset: -250
    }, { maxTimeoutMs: 10 })).resolves.toMatchObject({
      confirmed: true,
      event: { sequence: 5, eventType: "InputAudioSyncOffsetChanged", outcome: "sync_offset_changed" }
    })
    const tracksResult = await confirmObsInputAudioChange(client, {
      target: "input_audio",
      outcome: "tracks_changed",
      afterSequence: 0,
      inputAudioTracks: {
        track1: true,
        track2: false,
        track3: true,
        track4: false,
        track5: false,
        track6: true
      }
    }, { maxTimeoutMs: 10 })
    expect(tracksResult).toMatchObject({
      confirmed: true,
      event: {
        sequence: 6,
        eventType: "InputAudioTracksChanged",
        outcome: "tracks_changed",
        inputAudioTracks: {
          track1: true,
          track2: false,
          track3: true,
          track4: false,
          track5: false,
          track6: true
        }
      }
    })
    expect(JSON.stringify(tracksResult.event)).not.toContain("\"1\"")
    await expect(confirmObsInputAudioChange(client, {
      target: "input_audio",
      outcome: "monitor_type_changed",
      afterSequence: 0,
      monitorType: "OBS_MONITORING_TYPE_MONITOR_AND_OUTPUT"
    }, { maxTimeoutMs: 10 })).resolves.toMatchObject({
      confirmed: true,
      event: {
        sequence: 7,
        eventType: "InputAudioMonitorTypeChanged",
        outcome: "monitor_type_changed",
        monitorType: "OBS_MONITORING_TYPE_MONITOR_AND_OUTPUT"
      }
    })
  })

  it("does not let excluded or malformed input audio retained events satisfy confirmation", async () => {
    const client = bufferedEventClient([
      {
        sequence: 1,
        eventType: "InputVolumeChanged",
        eventIntent: EventSubscription.Inputs,
        eventData: {
          inputName: "Mic",
          inputUuid: "input-mic",
          inputVolumeMul: 21,
          inputVolumeDb: -6
        }
      },
      {
        sequence: 2,
        eventType: "InputAudioTracksChanged",
        eventIntent: EventSubscription.Inputs,
        eventData: {
          inputName: "Mic",
          inputUuid: "input-mic",
          inputAudioTracks: { "1": true, "2": false, "3": false, "4": false, "5": false, "6": false },
          inputSettings: { secret: true }
        }
      },
      {
        sequence: 3,
        eventType: "InputActiveStateChanged",
        eventIntent: EventSubscription.Inputs,
        eventData: { inputName: "Mic", inputUuid: "input-mic", videoActive: true }
      },
      {
        sequence: 4,
        eventType: "InputVolumeMeters",
        eventIntent: EventSubscription.InputVolumeMeters,
        eventData: { inputs: [] }
      },
      {
        sequence: 5,
        eventType: "InputSettingsChanged",
        eventIntent: EventSubscription.Inputs,
        eventData: { inputName: "Mic", inputUuid: "input-mic", inputSettings: { secret: true } }
      },
      {
        sequence: 6,
        eventType: "VendorEvent",
        eventIntent: EventSubscription.Vendors,
        eventData: { vendorName: "plugin", payload: { raw: true } }
      }
    ])

    await expect(confirmObsInputAudioChange(client, {
      target: "input_audio",
      outcome: "volume_changed",
      afterSequence: 0,
      timeoutMs: 1
    }, { maxTimeoutMs: 5 })).resolves.toMatchObject({
      confirmed: false,
      timedOut: true,
      latestSequence: 6
    })
    await expect(confirmObsInputAudioChange(client, {
      target: "input_audio",
      outcome: "tracks_changed",
      afterSequence: 0,
      timeoutMs: 1
    }, { maxTimeoutMs: 5 })).resolves.toMatchObject({
      confirmed: false,
      timedOut: true,
      latestSequence: 6
    })
  })

  it("propagates missed-event metadata for input audio confirmation", async () => {
    await expect(confirmObsInputAudioChange(
      bufferedEventClient([
        {
          sequence: 3,
          eventType: "InputAudioMonitorTypeChanged",
          eventIntent: EventSubscription.Inputs,
          eventData: {
            inputName: "Mic",
            inputUuid: "input-mic",
            monitorType: "OBS_MONITORING_TYPE_NONE"
          }
        }
      ], { droppedEvents: 2 }),
      {
        target: "input_audio",
        outcome: "monitor_type_changed",
        afterSequence: 0
      },
      { maxTimeoutMs: 10 }
    )).resolves.toMatchObject({
      confirmed: true,
      baselineSequence: 0,
      latestSequence: 3,
      missedEvents: true,
      event: { sequence: 3 }
    })
  })

  it("rejects invalid input identity confirmation input through operation schema validation", async () => {
    const confirmObsInputIdentityChangeUnchecked = confirmObsInputIdentityChange as (
      client: ObsClient,
      input: unknown,
      options: { readonly maxTimeoutMs: number }
    ) => ReturnType<typeof confirmObsInputIdentityChange>
    for (
      const input of [
        { target: "input", outcome: "created", afterSequence: 0 },
        { target: "input", outcome: "settings_changed", afterSequence: 0 },
        { target: "input", outcome: "removed", afterSequence: 0, oldInputName: "Old Camera" },
        { target: "input", outcome: "renamed", afterSequence: 0, oldInputName: "" },
        { target: "input", outcome: "removed", afterSequence: 0, inputName: "" },
        { target: "input", outcome: "removed", afterSequence: 0, inputUuid: "" },
        { target: "input", outcome: "removed", afterSequence: 0, eventType: "InputRemoved" },
        { target: "input", outcome: "removed", afterSequence: 0, eventData: {} },
        { target: "input", outcome: "removed", afterSequence: 0, settings: { secret: true } },
        { target: "input", outcome: "removed", afterSequence: 0, inputSettings: { secret: true } },
        { target: "input", outcome: "removed", afterSequence: 0, defaultInputSettings: { secret: false } },
        { target: "input", outcome: "removed", afterSequence: 0, inputKind: "dshow_input" },
        { target: "input", outcome: "removed", afterSequence: 0, unversionedInputKind: "dshow_input" },
        { target: "input", outcome: "removed", afterSequence: 0, inputKindCaps: 1 },
        { target: "input", outcome: "removed", afterSequence: 0, sceneItemId: 1 },
        { target: "input", outcome: "removed", afterSequence: 0, unexpected: true }
      ] as const
    ) {
      await expect(confirmObsInputIdentityChangeUnchecked(
        fakeClient(async () => ({})),
        input,
        { maxTimeoutMs: 5 }
      )).rejects.toThrow(
        /target|outcome|afterSequence|inputName|inputUuid|oldInputName|eventType|eventData|settings|inputSettings|defaultInputSettings|inputKind|unversionedInputKind|inputKindCaps|sceneItemId|unexpected/
      )
    }
  })

  it("propagates missed-event metadata for input identity confirmation", async () => {
    await expect(confirmObsInputIdentityChange(
      bufferedEventClient([
        {
          sequence: 3,
          eventType: "InputRemoved",
          eventIntent: EventSubscription.Inputs,
          eventData: { inputName: "Camera", inputUuid: "input-camera" }
        }
      ], { droppedEvents: 2 }),
      {
        target: "input",
        outcome: "removed",
        afterSequence: 0
      },
      { maxTimeoutMs: 10 }
    )).resolves.toMatchObject({
      confirmed: true,
      baselineSequence: 0,
      latestSequence: 3,
      missedEvents: true,
      event: { sequence: 3 }
    })
  })

  it("confirms media input workflow events with identity and action filters", async () => {
    const client = bufferedEventClient([
      {
        sequence: 1,
        eventType: "MediaInputPlaybackStarted",
        eventIntent: EventSubscription.MediaInputs,
        eventData: { inputName: "Media A", inputUuid: "input-media-a" }
      },
      {
        sequence: 2,
        eventType: "MediaInputPlaybackEnded",
        eventIntent: EventSubscription.MediaInputs,
        eventData: { inputName: "Media B", inputUuid: "input-media-b" }
      },
      {
        sequence: 3,
        eventType: "MediaInputActionTriggered",
        eventIntent: EventSubscription.MediaInputs,
        eventData: {
          inputName: "Media A",
          inputUuid: "input-media-a",
          mediaAction: "OBS_WEBSOCKET_MEDIA_INPUT_ACTION_PAUSE"
        }
      }
    ])

    await expect(confirmObsMediaInputWorkflow(client, {
      target: "media_input",
      outcome: "playback_started",
      afterSequence: 0,
      inputName: "Media A",
      inputUuid: "input-media-a"
    }, { maxTimeoutMs: 10 })).resolves.toMatchObject({
      confirmed: true,
      event: { sequence: 1, eventType: "MediaInputPlaybackStarted", outcome: "playback_started" }
    })
    await expect(confirmObsMediaInputWorkflow(client, {
      target: "media_input",
      outcome: "playback_ended",
      afterSequence: 0,
      inputUuid: "input-media-b"
    }, { maxTimeoutMs: 10 })).resolves.toMatchObject({
      confirmed: true,
      event: { sequence: 2, eventType: "MediaInputPlaybackEnded", outcome: "playback_ended" }
    })
    await expect(confirmObsMediaInputWorkflow(client, {
      target: "media_input",
      outcome: "action_triggered",
      afterSequence: 0,
      inputName: "Media A",
      mediaAction: "OBS_WEBSOCKET_MEDIA_INPUT_ACTION_PAUSE"
    }, { maxTimeoutMs: 10 })).resolves.toMatchObject({
      confirmed: true,
      event: {
        sequence: 3,
        eventType: "MediaInputActionTriggered",
        outcome: "action_triggered",
        mediaAction: "OBS_WEBSOCKET_MEDIA_INPUT_ACTION_PAUSE"
      }
    })
  })

  it("does not cross-match media input playback and action workflow events", async () => {
    const client = bufferedEventClient([
      {
        sequence: 1,
        eventType: "MediaInputPlaybackStarted",
        eventIntent: EventSubscription.MediaInputs,
        eventData: { inputName: "Media", inputUuid: "input-media" }
      },
      {
        sequence: 2,
        eventType: "MediaInputActionTriggered",
        eventIntent: EventSubscription.MediaInputs,
        eventData: {
          inputName: "Media",
          inputUuid: "input-media",
          mediaAction: "OBS_WEBSOCKET_MEDIA_INPUT_ACTION_STOP"
        }
      },
      {
        sequence: 3,
        eventType: "InputSettingsChanged",
        eventIntent: EventSubscription.Inputs,
        eventData: { inputName: "Media", inputUuid: "input-media", inputSettings: { secret: true } }
      },
      {
        sequence: 4,
        eventType: "VendorEvent",
        eventIntent: EventSubscription.Vendors,
        eventData: { vendorName: "plugin", payload: { raw: true } }
      }
    ])

    await expect(confirmObsMediaInputWorkflow(client, {
      target: "media_input",
      outcome: "action_triggered",
      afterSequence: 0,
      mediaAction: "OBS_WEBSOCKET_MEDIA_INPUT_ACTION_PLAY"
    }, { maxTimeoutMs: 10 })).resolves.toMatchObject({
      confirmed: false,
      timedOut: true,
      latestSequence: 4
    })
    await expect(confirmObsMediaInputWorkflow(client, {
      target: "media_input",
      outcome: "playback_ended",
      afterSequence: 0
    }, { maxTimeoutMs: 10 })).resolves.toMatchObject({
      confirmed: false,
      timedOut: true,
      latestSequence: 4
    })
  })

  it("does not let malformed media input event summaries satisfy workflow confirmation", async () => {
    const client = bufferedEventClient([
      {
        sequence: 1,
        eventType: "MediaInputPlaybackEnded",
        eventIntent: EventSubscription.MediaInputs,
        eventData: {
          inputName: "Media",
          inputUuid: "input-media",
          mediaCursor: 1000
        }
      },
      {
        sequence: 2,
        eventType: "MediaInputActionTriggered",
        eventIntent: EventSubscription.MediaInputs,
        eventData: {
          inputName: "Media",
          inputUuid: "input-media",
          mediaAction: "OBS_WEBSOCKET_MEDIA_INPUT_ACTION_NONE"
        }
      }
    ])

    await expect(confirmObsMediaInputWorkflow(client, {
      target: "media_input",
      outcome: "playback_ended",
      afterSequence: 0
    }, { maxTimeoutMs: 10 })).resolves.toMatchObject({
      confirmed: false,
      timedOut: true,
      latestSequence: 2
    })
    await expect(confirmObsMediaInputWorkflow(client, {
      target: "media_input",
      outcome: "action_triggered",
      afterSequence: 0,
      mediaAction: "OBS_WEBSOCKET_MEDIA_INPUT_ACTION_STOP"
    }, { maxTimeoutMs: 10 })).resolves.toMatchObject({
      confirmed: false,
      timedOut: true,
      latestSequence: 2
    })
  })

  it("propagates missed-event metadata for media input workflow confirmation", async () => {
    await expect(confirmObsMediaInputWorkflow(
      bufferedEventClient([
        {
          sequence: 3,
          eventType: "MediaInputPlaybackEnded",
          eventIntent: EventSubscription.MediaInputs,
          eventData: { inputName: "Media", inputUuid: "input-media" }
        }
      ], { droppedEvents: 2 }),
      {
        target: "media_input",
        outcome: "playback_ended",
        afterSequence: 0
      },
      { maxTimeoutMs: 10 }
    )).resolves.toMatchObject({
      confirmed: true,
      baselineSequence: 0,
      latestSequence: 3,
      missedEvents: true,
      event: { sequence: 3 }
    })
  })

  it("confirms transition workflow events with identity and duration filters", async () => {
    const client = bufferedEventClient([
      {
        sequence: 1,
        eventType: "CurrentSceneTransitionChanged",
        eventIntent: EventSubscription.Transitions,
        eventData: { transitionName: "Fade", transitionUuid: "transition-fade" }
      },
      {
        sequence: 2,
        eventType: "CurrentSceneTransitionDurationChanged",
        eventIntent: EventSubscription.Transitions,
        eventData: { transitionDuration: 300 }
      },
      {
        sequence: 3,
        eventType: "SceneTransitionStarted",
        eventIntent: EventSubscription.Transitions,
        eventData: { transitionName: "Cut", transitionUuid: "transition-cut" }
      },
      {
        sequence: 4,
        eventType: "SceneTransitionEnded",
        eventIntent: EventSubscription.Transitions,
        eventData: { transitionName: "Fade", transitionUuid: "transition-fade" }
      },
      {
        sequence: 5,
        eventType: "SceneTransitionVideoEnded",
        eventIntent: EventSubscription.Transitions,
        eventData: { transitionName: "Fade", transitionUuid: "transition-fade" }
      }
    ])

    await expect(confirmObsTransitionWorkflow(client, {
      target: "current_scene_transition",
      outcome: "changed",
      afterSequence: 0,
      transitionName: "Fade",
      transitionUuid: "transition-fade"
    }, { maxTimeoutMs: 10 })).resolves.toMatchObject({
      confirmed: true,
      event: { sequence: 1, eventType: "CurrentSceneTransitionChanged", outcome: "changed" }
    })
    await expect(confirmObsTransitionWorkflow(client, {
      target: "current_scene_transition",
      outcome: "duration_changed",
      afterSequence: 0,
      transitionDuration: 300
    }, { maxTimeoutMs: 10 })).resolves.toMatchObject({
      confirmed: true,
      event: { sequence: 2, eventType: "CurrentSceneTransitionDurationChanged", transitionDuration: 300 }
    })
    await expect(confirmObsTransitionWorkflow(client, {
      target: "scene_transition",
      outcome: "started",
      afterSequence: 0,
      transitionUuid: "transition-cut"
    }, { maxTimeoutMs: 10 })).resolves.toMatchObject({
      confirmed: true,
      event: { sequence: 3, eventType: "SceneTransitionStarted", outcome: "started" }
    })
    await expect(confirmObsTransitionWorkflow(client, {
      target: "scene_transition",
      outcome: "ended",
      afterSequence: 0,
      transitionName: "Fade"
    }, { maxTimeoutMs: 10 })).resolves.toMatchObject({
      confirmed: true,
      event: { sequence: 4, eventType: "SceneTransitionEnded", outcome: "ended" }
    })
    await expect(confirmObsTransitionWorkflow(client, {
      target: "scene_transition",
      outcome: "video_ended",
      afterSequence: 0,
      transitionName: "Fade",
      transitionUuid: "transition-fade"
    }, { maxTimeoutMs: 10 })).resolves.toMatchObject({
      confirmed: true,
      event: { sequence: 5, eventType: "SceneTransitionVideoEnded", outcome: "video_ended" }
    })
  })

  it("does not cross-match transition workflow outcomes or adjacent-domain events", async () => {
    const client = bufferedEventClient([
      {
        sequence: 1,
        eventType: "CurrentSceneTransitionDurationChanged",
        eventIntent: EventSubscription.Transitions,
        eventData: { transitionDuration: 300 }
      },
      {
        sequence: 2,
        eventType: "SceneTransitionStarted",
        eventIntent: EventSubscription.Transitions,
        eventData: { transitionName: "Fade", transitionUuid: "transition-fade" }
      },
      {
        sequence: 3,
        eventType: "SceneTransitionEnded",
        eventIntent: EventSubscription.Transitions,
        eventData: { transitionName: "Fade", transitionUuid: "transition-fade" }
      },
      {
        sequence: 4,
        eventType: "SceneTransitionVideoEnded",
        eventIntent: EventSubscription.Transitions,
        eventData: { transitionName: "Fade", transitionUuid: "transition-fade" }
      },
      {
        sequence: 5,
        eventType: "StudioModeStateChanged",
        eventIntent: EventSubscription.Ui,
        eventData: { studioModeEnabled: true }
      },
      {
        sequence: 6,
        eventType: "CurrentProgramSceneChanged",
        eventIntent: EventSubscription.Scenes,
        eventData: { sceneName: "Program", sceneUuid: "scene-program" }
      },
      {
        sequence: 7,
        eventType: "VendorEvent",
        eventIntent: EventSubscription.Vendors,
        eventData: { vendorName: "plugin", payload: { raw: true } }
      }
    ])

    for (
      const input of [
        { target: "current_scene_transition", outcome: "changed", afterSequence: 0 },
        { target: "scene_transition", outcome: "started", afterSequence: 2 },
        { target: "scene_transition", outcome: "ended", afterSequence: 3 },
        { target: "scene_transition", outcome: "video_ended", afterSequence: 4 },
        { target: "current_scene_transition", outcome: "duration_changed", afterSequence: 0, transitionDuration: 301 }
      ] as const
    ) {
      await expect(confirmObsTransitionWorkflow(client, input, { maxTimeoutMs: 10 })).resolves.toMatchObject({
        confirmed: false,
        timedOut: true,
        latestSequence: 7
      })
    }
  })

  it("does not let malformed retained transition events satisfy workflow confirmation", async () => {
    const malformedDurations = [0, 49, 20001, 300.5] as const
    const client = bufferedEventClient([
      ...malformedDurations.map((transitionDuration, index) => ({
        sequence: index + 1,
        eventType: "CurrentSceneTransitionDurationChanged",
        eventIntent: EventSubscription.Transitions,
        eventData: { transitionDuration }
      })),
      {
        sequence: 5,
        eventType: "CurrentSceneTransitionDurationChanged",
        eventIntent: EventSubscription.Transitions,
        eventData: { transitionDuration: 300, transitionName: "Fade" }
      },
      {
        sequence: 6,
        eventType: "SceneTransitionStarted",
        eventIntent: EventSubscription.Transitions,
        eventData: {
          transitionName: "Fade",
          transitionUuid: "transition-fade",
          transitionSettings: { secret: true }
        }
      },
      {
        sequence: 7,
        eventType: "CurrentSceneTransitionChanged",
        eventIntent: EventSubscription.Transitions,
        eventData: { transitionName: "Fade" }
      }
    ])

    await expect(confirmObsTransitionWorkflow(client, {
      target: "current_scene_transition",
      outcome: "duration_changed",
      afterSequence: 0,
      timeoutMs: 1
    }, { maxTimeoutMs: 5 })).resolves.toMatchObject({
      confirmed: false,
      timedOut: true,
      latestSequence: 7
    })
    await expect(confirmObsTransitionWorkflow(client, {
      target: "scene_transition",
      outcome: "started",
      afterSequence: 0,
      timeoutMs: 1
    }, { maxTimeoutMs: 5 })).resolves.toMatchObject({
      confirmed: false,
      timedOut: true,
      latestSequence: 7
    })
    await expect(confirmObsTransitionWorkflow(client, {
      target: "current_scene_transition",
      outcome: "changed",
      afterSequence: 0,
      timeoutMs: 1
    }, { maxTimeoutMs: 5 })).resolves.toMatchObject({
      confirmed: false,
      timedOut: true,
      latestSequence: 7
    })
  })

  it("propagates missed-event metadata for transition workflow confirmation", async () => {
    await expect(confirmObsTransitionWorkflow(
      bufferedEventClient([
        {
          sequence: 3,
          eventType: "SceneTransitionEnded",
          eventIntent: EventSubscription.Transitions,
          eventData: { transitionName: "Fade", transitionUuid: "transition-fade" }
        }
      ], { droppedEvents: 2 }),
      {
        target: "scene_transition",
        outcome: "ended",
        afterSequence: 0
      },
      { maxTimeoutMs: 10 }
    )).resolves.toMatchObject({
      confirmed: true,
      baselineSequence: 0,
      latestSequence: 3,
      missedEvents: true,
      event: { sequence: 3 }
    })
  })

  it("ignores retained workflow events that are missing required summary fields", async () => {
    const missingFieldEvents: ReadonlyArray<BufferedObsEvent> = [
      {
        sequence: 1,
        eventType: "CanvasCreated",
        eventIntent: EventSubscription.Canvases,
        eventData: { canvasUuid: "canvas-a" }
      },
      {
        sequence: 2,
        eventType: "CurrentProfileChanging",
        eventIntent: EventSubscription.Config,
        eventData: {}
      },
      {
        sequence: 3,
        eventType: "CurrentProfileChanged",
        eventIntent: EventSubscription.Config,
        eventData: {}
      },
      {
        sequence: 4,
        eventType: "ProfileListChanged",
        eventIntent: EventSubscription.Config,
        eventData: {}
      },
      {
        sequence: 5,
        eventType: "CurrentSceneCollectionChanging",
        eventIntent: EventSubscription.Config,
        eventData: {}
      },
      {
        sequence: 6,
        eventType: "CurrentSceneCollectionChanged",
        eventIntent: EventSubscription.Config,
        eventData: {}
      },
      {
        sequence: 7,
        eventType: "SceneCollectionListChanged",
        eventIntent: EventSubscription.Config,
        eventData: {}
      },
      {
        sequence: 8,
        eventType: "InputVolumeChanged",
        eventIntent: EventSubscription.Inputs,
        eventData: { inputUuid: "input-mic", inputVolumeMul: 0.5, inputVolumeDb: -6 }
      },
      {
        sequence: 9,
        eventType: "InputMuteStateChanged",
        eventIntent: EventSubscription.Inputs,
        eventData: { inputName: "Mic", inputUuid: "input-mic" }
      },
      {
        sequence: 10,
        eventType: "InputVolumeChanged",
        eventIntent: EventSubscription.Inputs,
        eventData: { inputName: "Mic", inputUuid: "input-mic", inputVolumeMul: 0.5 }
      },
      {
        sequence: 11,
        eventType: "InputAudioBalanceChanged",
        eventIntent: EventSubscription.Inputs,
        eventData: { inputName: "Mic", inputUuid: "input-mic" }
      },
      {
        sequence: 12,
        eventType: "InputAudioSyncOffsetChanged",
        eventIntent: EventSubscription.Inputs,
        eventData: { inputName: "Mic", inputUuid: "input-mic" }
      },
      {
        sequence: 13,
        eventType: "InputAudioTracksChanged",
        eventIntent: EventSubscription.Inputs,
        eventData: { inputName: "Mic", inputUuid: "input-mic" }
      },
      {
        sequence: 14,
        eventType: "InputAudioMonitorTypeChanged",
        eventIntent: EventSubscription.Inputs,
        eventData: { inputName: "Mic", inputUuid: "input-mic" }
      },
      {
        sequence: 15,
        eventType: "InputRemoved",
        eventIntent: EventSubscription.Inputs,
        eventData: { inputName: "Mic", inputUuid: "input-mic", inputKind: "wasapi_input_capture" }
      },
      {
        sequence: 16,
        eventType: "SceneTransitionStarted",
        eventIntent: EventSubscription.General,
        eventData: { transitionName: "Fade", transitionUuid: "transition-fade" }
      },
      {
        sequence: 17,
        eventType: "CurrentSceneTransitionDurationChanged",
        eventIntent: EventSubscription.Transitions,
        eventData: {}
      },
      {
        sequence: 18,
        eventType: "SceneTransitionStarted",
        eventIntent: EventSubscription.Transitions,
        eventData: { transitionName: "Fade" }
      },
      {
        sequence: 19,
        eventType: "SceneTransitionEnded",
        eventIntent: EventSubscription.Transitions,
        eventData: { transitionUuid: "transition-fade" }
      },
      {
        sequence: 20,
        eventType: "SceneTransitionVideoEnded",
        eventIntent: EventSubscription.Transitions,
        eventData: { transitionName: "Fade" }
      },
      {
        sequence: 21,
        eventType: "MediaInputPlaybackStarted",
        eventIntent: EventSubscription.MediaInputs,
        eventData: { inputUuid: "input-media" }
      },
      {
        sequence: 22,
        eventType: "MediaInputActionTriggered",
        eventIntent: EventSubscription.MediaInputs,
        eventData: { inputName: "Media", inputUuid: "input-media" }
      },
      {
        sequence: 23,
        eventType: "SourceFilterCreated",
        eventIntent: EventSubscription.Filters,
        eventData: { sourceName: "Camera", filterName: "Color", filterKind: "color_filter" }
      },
      {
        sequence: 24,
        eventType: "SourceFilterRemoved",
        eventIntent: EventSubscription.Filters,
        eventData: { sourceName: "Camera" }
      },
      {
        sequence: 25,
        eventType: "SourceFilterNameChanged",
        eventIntent: EventSubscription.Filters,
        eventData: { sourceName: "Camera", filterName: "Color" }
      },
      {
        sequence: 26,
        eventType: "SourceFilterListReindexed",
        eventIntent: EventSubscription.Filters,
        eventData: { sourceName: "Camera" }
      },
      {
        sequence: 27,
        eventType: "SourceFilterListReindexed",
        eventIntent: EventSubscription.Filters,
        eventData: { sourceName: "Camera", filters: [{ filterName: "Color", filterIndex: -1 }] }
      },
      {
        sequence: 28,
        eventType: "SourceFilterEnableStateChanged",
        eventIntent: EventSubscription.Filters,
        eventData: { sourceName: "Camera", filterName: "Color" }
      },
      {
        sequence: 29,
        eventType: "SourceFilterSettingsChanged",
        eventIntent: EventSubscription.Filters,
        eventData: { sourceName: "Camera" }
      },
      {
        sequence: 30,
        eventType: "SceneCreated",
        eventIntent: EventSubscription.Scenes,
        eventData: { sceneName: "Program", sceneUuid: "scene-program" }
      },
      {
        sequence: 31,
        eventType: "SceneRemoved",
        eventIntent: EventSubscription.Scenes,
        eventData: { sceneName: "Program", sceneUuid: "scene-program" }
      },
      {
        sequence: 32,
        eventType: "SceneNameChanged",
        eventIntent: EventSubscription.Scenes,
        eventData: { sceneName: "Program", sceneUuid: "scene-program" }
      },
      {
        sequence: 33,
        eventType: "CurrentProgramSceneChanged",
        eventIntent: EventSubscription.Scenes,
        eventData: { sceneName: "Program" }
      },
      {
        sequence: 34,
        eventType: "CurrentPreviewSceneChanged",
        eventIntent: EventSubscription.Scenes,
        eventData: { sceneUuid: "scene-preview" }
      },
      {
        sequence: 35,
        eventType: "SceneItemCreated",
        eventIntent: EventSubscription.SceneItems,
        eventData: {
          sceneName: "Program",
          sceneUuid: "scene-program",
          sourceName: "Camera",
          sourceUuid: "source-camera",
          sceneItemId: 1
        }
      },
      {
        sequence: 36,
        eventType: "SceneItemRemoved",
        eventIntent: EventSubscription.SceneItems,
        eventData: {
          sceneName: "Program",
          sceneUuid: "scene-program",
          sourceName: "Camera",
          sourceUuid: "source-camera"
        }
      },
      {
        sequence: 37,
        eventType: "SceneItemListReindexed",
        eventIntent: EventSubscription.SceneItems,
        eventData: { sceneName: "Program", sceneUuid: "scene-program" }
      },
      {
        sequence: 38,
        eventType: "SceneItemEnableStateChanged",
        eventIntent: EventSubscription.SceneItems,
        eventData: { sceneName: "Program", sceneUuid: "scene-program", sceneItemId: 1 }
      },
      {
        sequence: 39,
        eventType: "SceneItemLockStateChanged",
        eventIntent: EventSubscription.SceneItems,
        eventData: { sceneName: "Program", sceneUuid: "scene-program", sceneItemId: 1 }
      }
    ]
    const client = bufferedEventClient(missingFieldEvents)

    await expect(confirmObsCanvasInventoryChange(client, {
      target: "canvas",
      outcome: "created",
      afterSequence: 0,
      timeoutMs: 1
    }, { maxTimeoutMs: 5 })).resolves.toMatchObject({ confirmed: false, latestSequence: 39 })
    await expect(confirmObsConfigWorkflow(client, {
      target: "profile",
      outcome: "changing",
      afterSequence: 0,
      timeoutMs: 1
    }, { maxTimeoutMs: 5 })).resolves.toMatchObject({ confirmed: false, latestSequence: 39 })
    await expect(confirmObsInputAudioChange(client, {
      target: "input_audio",
      outcome: "muted",
      afterSequence: 0,
      timeoutMs: 1
    }, { maxTimeoutMs: 5 })).resolves.toMatchObject({ confirmed: false, latestSequence: 39 })
    await expect(confirmObsInputIdentityChange(client, {
      target: "input",
      outcome: "removed",
      afterSequence: 0,
      timeoutMs: 1
    }, { maxTimeoutMs: 5 })).resolves.toMatchObject({ confirmed: false, latestSequence: 39 })
    await expect(confirmObsTransitionWorkflow(client, {
      target: "scene_transition",
      outcome: "started",
      afterSequence: 0,
      timeoutMs: 1
    }, { maxTimeoutMs: 5 })).resolves.toMatchObject({ confirmed: false, latestSequence: 39 })
    await expect(confirmObsMediaInputWorkflow(client, {
      target: "media_input",
      outcome: "action_triggered",
      afterSequence: 0,
      mediaAction: "OBS_WEBSOCKET_MEDIA_INPUT_ACTION_PLAY",
      timeoutMs: 1
    }, { maxTimeoutMs: 5 })).resolves.toMatchObject({ confirmed: false, latestSequence: 39 })
    await expect(confirmObsSourceFilterChange(client, {
      target: "source_filter",
      outcome: "created",
      afterSequence: 0,
      timeoutMs: 1
    }, { maxTimeoutMs: 5 })).resolves.toMatchObject({ confirmed: false, latestSequence: 39 })
    await expect(confirmObsSceneGraphChange(client, {
      target: "scene",
      outcome: "created",
      afterSequence: 0,
      timeoutMs: 1
    }, { maxTimeoutMs: 5 })).resolves.toMatchObject({ confirmed: false, latestSequence: 39 })
  })

  it("confirms output lifecycle events across output targets and outcomes", async () => {
    const client = bufferedEventClient([
      {
        sequence: 1,
        eventType: "StreamStateChanged",
        eventIntent: EventSubscription.Outputs,
        eventData: { outputActive: true, outputState: "OBS_WEBSOCKET_OUTPUT_STARTED" }
      },
      {
        sequence: 2,
        eventType: "RecordStateChanged",
        eventIntent: EventSubscription.Outputs,
        eventData: {
          outputActive: true,
          outputState: "OBS_WEBSOCKET_OUTPUT_PAUSED",
          outputPath: "/tmp/recording.mkv"
        }
      },
      {
        sequence: 3,
        eventType: "RecordStateChanged",
        eventIntent: EventSubscription.Outputs,
        eventData: {
          outputActive: true,
          outputState: "OBS_WEBSOCKET_OUTPUT_RESUMED",
          outputPath: "/tmp/recording.mkv"
        }
      },
      {
        sequence: 4,
        eventType: "RecordFileChanged",
        eventIntent: EventSubscription.Outputs,
        eventData: { newOutputPath: "/tmp/recording-2.mkv" }
      },
      {
        sequence: 5,
        eventType: "ReplayBufferStateChanged",
        eventIntent: EventSubscription.Outputs,
        eventData: { outputActive: false, outputState: "OBS_WEBSOCKET_OUTPUT_STOPPED" }
      },
      {
        sequence: 6,
        eventType: "ReplayBufferSaved",
        eventIntent: EventSubscription.Outputs,
        eventData: { savedReplayPath: "/tmp/replay.mkv" }
      },
      {
        sequence: 7,
        eventType: "VirtualcamStateChanged",
        eventIntent: EventSubscription.Outputs,
        eventData: { outputActive: true, outputState: "OBS_WEBSOCKET_OUTPUT_STARTED" }
      }
    ])

    await expect(confirmObsOutputLifecycle(client, {
      target: "stream",
      outcome: "started",
      afterSequence: 0
    }, { maxTimeoutMs: 10 })).resolves.toMatchObject({
      confirmed: true,
      event: { sequence: 1, eventType: "StreamStateChanged", target: "stream", outcome: "started" }
    })
    await expect(confirmObsOutputLifecycle(client, {
      target: "record",
      outcome: "paused",
      afterSequence: 0
    }, { maxTimeoutMs: 10 })).resolves.toMatchObject({
      confirmed: true,
      event: { sequence: 2, eventType: "RecordStateChanged", target: "record", outcome: "paused" }
    })
    await expect(confirmObsOutputLifecycle(client, {
      target: "record",
      outcome: "resumed",
      afterSequence: 0
    }, { maxTimeoutMs: 10 })).resolves.toMatchObject({
      confirmed: true,
      event: { sequence: 3, eventType: "RecordStateChanged", target: "record", outcome: "resumed" }
    })
    await expect(confirmObsOutputLifecycle(client, {
      target: "record",
      outcome: "file_changed",
      afterSequence: 0
    }, { maxTimeoutMs: 10 })).resolves.toMatchObject({
      confirmed: true,
      event: { sequence: 4, eventType: "RecordFileChanged", newOutputPath: "/tmp/recording-2.mkv" }
    })
    await expect(confirmObsOutputLifecycle(client, {
      target: "replay_buffer",
      outcome: "stopped",
      afterSequence: 0
    }, { maxTimeoutMs: 10 })).resolves.toMatchObject({
      confirmed: true,
      event: { sequence: 5, eventType: "ReplayBufferStateChanged", target: "replay_buffer", outcome: "stopped" }
    })
    await expect(confirmObsOutputLifecycle(client, {
      target: "replay_buffer",
      outcome: "replay_saved",
      afterSequence: 0
    }, { maxTimeoutMs: 10 })).resolves.toMatchObject({
      confirmed: true,
      event: { sequence: 6, eventType: "ReplayBufferSaved", savedReplayPath: "/tmp/replay.mkv" }
    })
    await expect(confirmObsOutputLifecycle(client, {
      target: "virtualcam",
      outcome: "started",
      afterSequence: 0
    }, { maxTimeoutMs: 10 })).resolves.toMatchObject({
      confirmed: true,
      event: { sequence: 7, eventType: "VirtualcamStateChanged", target: "virtualcam", outcome: "started" }
    })
  })

  it("does not let unsupported or malformed output lifecycle events satisfy confirmation", async () => {
    const client = bufferedEventClient([
      {
        sequence: 1,
        eventType: "StreamStateChanged",
        eventIntent: EventSubscription.Outputs,
        eventData: { outputActive: true, outputState: "OBS_WEBSOCKET_OUTPUT_UNKNOWN" }
      },
      {
        sequence: 2,
        eventType: "StreamStateChanged",
        eventIntent: EventSubscription.Outputs,
        eventData: { outputActive: true, outputState: "OBS_WEBSOCKET_OUTPUT_PAUSED" }
      },
      {
        sequence: 3,
        eventType: "RecordStateChanged",
        eventIntent: EventSubscription.Outputs,
        eventData: { outputActive: false, outputState: "OBS_WEBSOCKET_OUTPUT_STOPPED" }
      },
      {
        sequence: 4,
        eventType: "RecordFileChanged",
        eventIntent: EventSubscription.Outputs,
        eventData: { outputPath: "/tmp/old.mkv" }
      },
      {
        sequence: 5,
        eventType: "ReplayBufferSaved",
        eventIntent: EventSubscription.Outputs,
        eventData: { newOutputPath: "/tmp/replay.mkv" }
      },
      {
        sequence: 6,
        eventType: "VirtualcamStateChanged",
        eventIntent: EventSubscription.Outputs,
        eventData: { outputState: "OBS_WEBSOCKET_OUTPUT_STARTED" }
      },
      {
        sequence: 7,
        eventType: "OutputStateChanged",
        eventIntent: EventSubscription.Outputs,
        eventData: { outputActive: true, outputState: "OBS_WEBSOCKET_OUTPUT_STARTED" }
      },
      {
        sequence: 8,
        eventType: "StreamStateChanged",
        eventIntent: EventSubscription.General,
        eventData: { outputActive: true, outputState: "OBS_WEBSOCKET_OUTPUT_STARTED" }
      }
    ])

    for (
      const input of [
        { target: "record", outcome: "stopped", afterSequence: 0 },
        { target: "record", outcome: "file_changed", afterSequence: 0 },
        { target: "replay_buffer", outcome: "replay_saved", afterSequence: 0 },
        { target: "virtualcam", outcome: "started", afterSequence: 0 },
        { target: "stream", outcome: "started", afterSequence: 0 }
      ] as const
    ) {
      await expect(confirmObsOutputLifecycle(client, { ...input, timeoutMs: 1 }, { maxTimeoutMs: 5 }))
        .resolves.toMatchObject({ confirmed: false, timedOut: true, latestSequence: 8 })
    }
  })

  it("returns version data with negotiated RPC version", async () => {
    const server = await FakeObsServer.start()
    servers.push(server)
    const client = await createObsClient(configFor(server.url))
    clients.push(client)
    await expect(getVersion(client)).resolves.toMatchObject({ obsVersion: "31.0.0", negotiatedRpcVersion: 1 })
  })

  it("returns OBS stats and record status from fake OBS", async () => {
    const server = await FakeObsServer.start()
    servers.push(server)
    const client = await createObsClient(configFor(server.url))
    clients.push(client)
    await expect(getObsStats(client)).resolves.toMatchObject({
      cpuUsage: 3.5,
      activeFps: 60,
      webSocketSessionOutgoingMessages: 11
    })
    await expect(getRecordStatus(client)).resolves.toEqual({
      outputActive: false,
      outputPaused: false,
      outputTimecode: "00:00:00.000",
      outputDuration: 0,
      outputBytes: 0
    })
  })

  it("lists and triggers hotkeys through the fake OBS protocol", async () => {
    const server = await FakeObsServer.start({
      hotkeys: ["OBSBasic.StartStreaming", "OBSBasic.StopStreaming"]
    })
    servers.push(server)
    const client = await createObsClient(configFor(server.url))
    clients.push(client)
    await expect(listHotkeys(client)).resolves.toEqual({
      hotkeys: ["OBSBasic.StartStreaming", "OBSBasic.StopStreaming"]
    })
    await expect(triggerHotkeyByName(client, {
      hotkeyName: "OBSBasic.StartStreaming",
      contextName: "OBSBasic"
    })).resolves.toEqual({
      hotkeyName: "OBSBasic.StartStreaming",
      contextName: "OBSBasic",
      triggered: true
    })
    await expect(triggerHotkeyByKeySequence(client, {
      keyId: "OBS_KEY_F9",
      keyModifiers: { control: true, shift: true }
    })).resolves.toEqual({
      keyId: "OBS_KEY_F9",
      keyModifiers: { control: true, shift: true },
      triggered: true
    })
    await expect(triggerHotkeyByKeySequence(client, { keyId: "OBS_KEY_F10" })).resolves.toEqual({
      keyId: "OBS_KEY_F10",
      triggered: true
    })
    await expect(triggerHotkeyByKeySequence(client, { keyModifiers: { alt: true } })).resolves.toEqual({
      keyModifiers: { alt: true },
      triggered: true
    })
    expect(server.requests.filter((request) => request.requestType.startsWith("TriggerHotkey"))).toEqual([
      {
        requestType: "TriggerHotkeyByName",
        requestData: { hotkeyName: "OBSBasic.StartStreaming", contextName: "OBSBasic" }
      },
      {
        requestType: "TriggerHotkeyByKeySequence",
        requestData: { keyId: "OBS_KEY_F9", keyModifiers: { control: true, shift: true } }
      },
      {
        requestType: "TriggerHotkeyByKeySequence",
        requestData: { keyId: "OBS_KEY_F10" }
      },
      {
        requestType: "TriggerHotkeyByKeySequence",
        requestData: { keyModifiers: { alt: true } }
      }
    ])
  })

  it("reads config inventory through the fake OBS protocol", async () => {
    const server = await FakeObsServer.start({
      profiles: ["Untitled", "Production"],
      currentProfileName: "Production",
      sceneCollections: ["Main Scenes", "Backup Scenes"],
      currentSceneCollectionName: "Main Scenes",
      profileParameters: [{
        parameterCategory: "Output",
        parameterName: "Mode",
        parameterValue: "Advanced",
        defaultParameterValue: "Simple"
      }],
      recordDirectory: "/opaque/obs-recordings"
    })
    servers.push(server)
    const client = await createObsClient(configFor(server.url))
    clients.push(client)
    await expect(listProfiles(client)).resolves.toEqual({
      currentProfileName: "Production",
      profiles: ["Untitled", "Production"]
    })
    await expect(listSceneCollections(client)).resolves.toEqual({
      currentSceneCollectionName: "Main Scenes",
      sceneCollections: ["Main Scenes", "Backup Scenes"]
    })
    await expect(getProfileParameter(client, {
      parameterCategory: "Output",
      parameterName: "Mode"
    })).resolves.toEqual({
      parameterValue: "Advanced",
      defaultParameterValue: "Simple"
    })
    await expect(getProfileParameter(client, {
      parameterCategory: "Missing",
      parameterName: "Unset"
    })).resolves.toEqual({
      parameterValue: null,
      defaultParameterValue: null
    })
    await expect(getRecordDirectory(client)).resolves.toEqual({ recordDirectory: "/opaque/obs-recordings" })
    await expect(getVideoSettings(client)).resolves.toEqual({
      baseWidth: 1920,
      baseHeight: 1080,
      outputWidth: 1280,
      outputHeight: 720,
      fpsNumerator: 30000,
      fpsDenominator: 1001
    })
    await expect(getStreamServiceSettings(client)).resolves.toEqual({
      streamServiceType: "rtmp_custom",
      streamServiceSettings: {
        server: "rtmp://example.invalid/live",
        keyConfigured: true
      }
    })
  })

  it("mutates config state through the fake OBS protocol", async () => {
    const server = await FakeObsServer.start({
      profiles: ["Untitled", "Production"],
      currentProfileName: "Untitled",
      sceneCollections: ["Main Scenes"],
      currentSceneCollectionName: "Main Scenes",
      profileParameters: [{
        parameterCategory: "SimpleOutput",
        parameterName: "VBitrate",
        parameterValue: "2500",
        defaultParameterValue: "2500"
      }]
    })
    servers.push(server)
    const client = await createObsClient(configFor(server.url))
    clients.push(client)

    await expect(createProfile(client, { profileName: "Show" })).resolves.toEqual({
      profileName: "Show",
      created: true,
      switched: true
    })
    await expect(listProfiles(client)).resolves.toEqual({
      currentProfileName: "Show",
      profiles: ["Untitled", "Production", "Show"]
    })
    await expect(setCurrentProfile(client, { profileName: "Production" })).resolves.toEqual({
      profileName: "Production",
      switched: true
    })
    await expect(removeProfile(client, { profileName: "Production" })).resolves.toEqual({
      profileName: "Production",
      removed: true
    })
    await expect(listProfiles(client)).resolves.toEqual({
      currentProfileName: "Untitled",
      profiles: ["Untitled", "Show"]
    })

    await expect(createSceneCollection(client, { sceneCollectionName: "Event Scenes" })).resolves.toEqual({
      sceneCollectionName: "Event Scenes",
      created: true,
      switched: true
    })
    await expect(setCurrentSceneCollection(client, { sceneCollectionName: "Main Scenes" })).resolves.toEqual({
      sceneCollectionName: "Main Scenes",
      switched: true
    })
    await expect(listSceneCollections(client)).resolves.toEqual({
      currentSceneCollectionName: "Main Scenes",
      sceneCollections: ["Main Scenes", "Event Scenes"]
    })

    await expect(setProfileParameter(client, {
      parameterCategory: "SimpleOutput",
      parameterName: "VBitrate",
      parameterValue: "6000"
    })).resolves.toEqual({
      parameterCategory: "SimpleOutput",
      parameterName: "VBitrate",
      parameterValue: "6000",
      acknowledged: true
    })
    await expect(getProfileParameter(client, {
      parameterCategory: "SimpleOutput",
      parameterName: "VBitrate"
    })).resolves.toEqual({ parameterValue: "6000", defaultParameterValue: "2500" })
    await expect(setProfileParameter(client, {
      parameterCategory: "SimpleOutput",
      parameterName: "VBitrate",
      parameterValue: null
    })).resolves.toMatchObject({ parameterValue: null })
    await expect(getProfileParameter(client, {
      parameterCategory: "SimpleOutput",
      parameterName: "VBitrate"
    })).resolves.toEqual({ parameterValue: null, defaultParameterValue: "2500" })

    await expect(setRecordDirectory(client, { recordDirectory: "opaque://recordings/show" })).resolves.toEqual({
      recordDirectory: "opaque://recordings/show",
      acknowledged: true
    })
    await expect(getRecordDirectory(client)).resolves.toEqual({ recordDirectory: "opaque://recordings/show" })
    await expect(setVideoSettings(client, {
      baseWidth: 2560,
      baseHeight: 1440,
      fpsNumerator: 60,
      fpsDenominator: 1
    })).resolves.toEqual({
      baseWidth: 2560,
      baseHeight: 1440,
      fpsNumerator: 60,
      fpsDenominator: 1,
      acknowledged: true
    })
    await expect(getVideoSettings(client)).resolves.toEqual({
      baseWidth: 2560,
      baseHeight: 1440,
      outputWidth: 1280,
      outputHeight: 720,
      fpsNumerator: 60,
      fpsDenominator: 1
    })

    await expect(setStreamServiceSettings(client, {
      streamServiceType: "rtmp_custom",
      streamServiceSettings: {
        server: "rtmp://example.invalid/show",
        key: "redacted-test-key"
      }
    })).resolves.toEqual({
      streamServiceType: "rtmp_custom",
      streamServiceSettings: {
        server: "rtmp://example.invalid/show",
        keyConfigured: true
      },
      acknowledged: true
    })
    await expect(getStreamServiceSettings(client)).resolves.toEqual({
      streamServiceType: "rtmp_custom",
      streamServiceSettings: {
        server: "rtmp://example.invalid/show",
        keyConfigured: true
      }
    })
    await expect(setStreamServiceSettings(client, {
      streamServiceType: "rtmp_common",
      streamServiceSettings: {
        fields: {
          service: "Example",
          bwtest: true,
          key: "redacted-generic-key"
        }
      }
    })).resolves.toEqual({
      streamServiceType: "rtmp_common",
      streamServiceSettings: {
        fields: {
          service: "Example",
          bwtest: true
        }
      },
      acknowledged: true
    })
    await expect(getStreamServiceSettings(client)).resolves.toEqual({
      streamServiceType: "rtmp_common",
      streamServiceSettings: {
        fields: {
          service: "Example",
          bwtest: true
        }
      }
    })
  })

  it("validates config read and mutation schemas", () => {
    expectSchemaDecodeFailure(
      ProfileParameterInput,
      { parameterCategory: "", parameterName: "Mode" },
      /parameterCategory/
    )
    expectSchemaDecodeFailure(
      ProfileParameterInput,
      { parameterCategory: "Output", parameterName: "" },
      /parameterName/
    )
    expectSchemaDecodeFailure(ProfileNameInput, { profileName: "" }, /profileName/)
    expectSchemaDecodeFailure(
      SetProfileParameterInput,
      {
        parameterCategory: "Output",
        parameterName: "Mode"
      },
      /parameterValue/
    )
    expectSchemaDecodeFailure(SetVideoSettingsInput, { baseWidth: 1920 }, /baseHeight/)
    expectSchemaDecodeFailure(SetVideoSettingsInput, { outputHeight: 720 }, /outputWidth/)
    expectSchemaDecodeFailure(SetVideoSettingsInput, { fpsNumerator: 60 }, /fpsDenominator/)
    expectSchemaDecodeFailure(SetVideoSettingsInput, { baseWidth: 4097, baseHeight: 1080 }, /baseWidth/)
    expectSchemaDecodeFailure(SetVideoSettingsInput, { outputWidth: 1920, outputHeight: 4097 }, /outputHeight/)
    expectSchemaDecodeFailure(
      SetStreamServiceSettingsInput,
      {
        streamServiceType: "rtmp_custom",
        streamServiceSettings: { fields: { server: "rtmp://example.invalid/live" } }
      },
      /key/
    )
    expectSchemaDecodeFailure(
      SetStreamServiceSettingsInput,
      {
        streamServiceType: "rtmp_custom",
        streamServiceSettings: { server: "rtmp://example.invalid/live", key: "" }
      },
      /key/
    )
  })

  it("surfaces OBS config read and mutation request failures", async () => {
    const server = await FakeObsServer.start({
      failRequests: {
        GetProfileParameter: { code: 601, comment: "Parameter category not found" },
        SetCurrentProfile: { code: 601, comment: "Profile not found" },
        SetVideoSettings: { code: 500, comment: "Video output is active" },
        SetStreamServiceSettings: { code: 500, comment: "Stream output is active" }
      }
    })
    servers.push(server)
    const client = await createObsClient({ ...configFor(server.url), enabledToolsets: ["config"] })
    clients.push(client)
    await expect(getProfileParameter(client, {
      parameterCategory: "Missing",
      parameterName: "Value"
    })).rejects.toMatchObject(
      {
        requestType: "GetProfileParameter",
        code: 601,
        comment: "Parameter category not found"
      } satisfies Partial<ObsRequestError>
    )
    await expect(setCurrentProfile(client, { profileName: "Missing" })).rejects.toMatchObject(
      {
        requestType: "SetCurrentProfile",
        code: 601,
        comment: "Profile not found"
      } satisfies Partial<ObsRequestError>
    )
    await expect(setVideoSettings(client, {
      baseWidth: 1920,
      baseHeight: 1080
    })).rejects.toMatchObject(
      {
        requestType: "SetVideoSettings",
        code: 500,
        comment: "Video output is active"
      } satisfies Partial<ObsRequestError>
    )
    await expect(setStreamServiceSettings(client, {
      streamServiceType: "rtmp_custom",
      streamServiceSettings: {
        server: "rtmp://example.invalid/live",
        key: "redacted-failure-key"
      }
    })).rejects.toMatchObject(
      {
        requestType: "SetStreamServiceSettings",
        code: 500,
        comment: "Stream output is active"
      } satisfies Partial<ObsRequestError>
    )
  })

  it("surfaces OBS hotkey trigger request failures", async () => {
    const server = await FakeObsServer.start({
      failRequests: { TriggerHotkeyByName: { code: 404, comment: "Hotkey not found" } }
    })
    servers.push(server)
    const client = await createObsClient({ ...configFor(server.url), enabledToolsets: ["general"] })
    clients.push(client)
    await expect(triggerHotkeyByName(client, { hotkeyName: "Missing" })).rejects.toMatchObject(
      {
        requestType: "TriggerHotkeyByName",
        code: 404,
        comment: "Hotkey not found"
      } satisfies Partial<ObsRequestError>
    )
  })

  it("lists canvases with stable summaries and reads studio mode state", async () => {
    const server = await FakeObsServer.start({
      canvases: [
        {
          canvasName: "Program",
          canvasUuid: "canvas-program",
          canvasIndex: 2,
          width: 1920,
          height: 1080
        },
        {
          width: 1080,
          height: 1920
        }
      ],
      studioModeEnabled: true
    })
    servers.push(server)
    const client = await createObsClient(configFor(server.url))
    clients.push(client)
    await expect(listCanvases(client)).resolves.toEqual({
      canvases: [
        { canvasIndex: 2, canvasName: "Program", canvasUuid: "canvas-program" },
        { canvasIndex: 1 }
      ]
    })
    await expect(getStudioModeEnabled(client)).resolves.toEqual({ studioModeEnabled: true })
    await expect(setStudioModeEnabled(client, { studioModeEnabled: false })).resolves.toEqual({
      requestType: "SetStudioModeEnabled",
      acknowledged: true
    })
    await expect(openInputPropertiesDialog(client, { inputName: "Camera" })).resolves.toEqual({
      requestType: "OpenInputPropertiesDialog",
      acknowledged: true
    })
    await expect(openInputFiltersDialog(client, { inputUuid: "input-camera" })).resolves.toEqual({
      requestType: "OpenInputFiltersDialog",
      acknowledged: true
    })
    await expect(openInputInteractDialog(client, { inputName: "Browser" })).resolves.toEqual({
      requestType: "OpenInputInteractDialog",
      acknowledged: true
    })
    await expect(listMonitors(client)).resolves.toEqual({
      monitors: [{
        monitorIndex: 0,
        monitorName: "Primary",
        monitorWidth: 1920,
        monitorHeight: 1080,
        monitorPositionX: 0,
        monitorPositionY: 0
      }]
    })
    await expect(openVideoMixProjector(client, {
      videoMixType: "OBS_WEBSOCKET_VIDEO_MIX_TYPE_PROGRAM",
      monitorIndex: 0
    })).resolves.toEqual({ requestType: "OpenVideoMixProjector", acknowledged: true })
    await expect(openSourceProjector(client, {
      sourceName: "Camera",
      monitorIndex: -1
    })).resolves.toEqual({ requestType: "OpenSourceProjector", acknowledged: true })
    await expect(openSourceProjector(client, {
      sourceUuid: "source-camera",
      projectorGeometry: "AdnQyw=="
    })).resolves.toEqual({ requestType: "OpenSourceProjector", acknowledged: true })
    expect(
      server.requests.filter((request) =>
        request.requestType.startsWith("Open") || request.requestType === "SetStudioModeEnabled"
      )
    ).toEqual([
      { requestType: "SetStudioModeEnabled", requestData: { studioModeEnabled: false } },
      { requestType: "OpenInputPropertiesDialog", requestData: { inputName: "Camera" } },
      { requestType: "OpenInputFiltersDialog", requestData: { inputUuid: "input-camera" } },
      { requestType: "OpenInputInteractDialog", requestData: { inputName: "Browser" } },
      {
        requestType: "OpenVideoMixProjector",
        requestData: { videoMixType: "OBS_WEBSOCKET_VIDEO_MIX_TYPE_PROGRAM", monitorIndex: 0 }
      },
      { requestType: "OpenSourceProjector", requestData: { sourceName: "Camera", monitorIndex: -1 } },
      {
        requestType: "OpenSourceProjector",
        requestData: { sourceUuid: "source-camera", projectorGeometry: "AdnQyw==" }
      }
    ])
  })

  it("reads transition inventory without exposing settings objects", async () => {
    const server = await FakeObsServer.start({
      transitions: [
        {
          transitionName: "Fade",
          transitionUuid: "transition-fade",
          transitionKind: "fade_transition",
          transitionFixed: false,
          transitionDuration: 350,
          transitionConfigurable: true,
          transitionSettings: { color: "black" }
        },
        {
          transitionName: "Cut",
          transitionUuid: "transition-cut",
          transitionKind: "cut_transition",
          transitionFixed: true,
          transitionDuration: null,
          transitionConfigurable: false,
          transitionSettings: null
        }
      ],
      transitionCursor: 0.5
    })
    servers.push(server)
    const client = await createObsClient(configFor(server.url))
    clients.push(client)
    await expect(listTransitionKinds(client)).resolves.toEqual({
      transitionKinds: ["fade_transition", "cut_transition"]
    })
    await expect(listSceneTransitions(client)).resolves.toEqual({
      currentSceneTransitionName: "Fade",
      currentSceneTransitionUuid: "transition-fade",
      currentSceneTransitionKind: "fade_transition",
      transitions: [
        {
          transitionName: "Fade",
          transitionUuid: "transition-fade",
          transitionKind: "fade_transition",
          transitionFixed: false,
          transitionDuration: 350
        },
        {
          transitionName: "Cut",
          transitionUuid: "transition-cut",
          transitionKind: "cut_transition",
          transitionFixed: true,
          transitionDuration: null
        }
      ]
    })
    await expect(getCurrentSceneTransition(client)).resolves.toEqual({
      transitionName: "Fade",
      transitionUuid: "transition-fade",
      transitionKind: "fade_transition",
      transitionFixed: false,
      transitionDuration: 350,
      transitionConfigurable: true
    })
    await expect(getCurrentSceneTransitionCursor(client)).resolves.toEqual({ transitionCursor: 0.5 })
  })

  it("sanitizes malformed scene transition rows into stable summaries", async () => {
    const client = fakeClient(async (requestType) => {
      expect(requestType).toBe("GetSceneTransitionList")
      return {
        currentSceneTransitionName: null,
        currentSceneTransitionUuid: null,
        currentSceneTransitionKind: null,
        transitions: [
          {
            transitionName: 42,
            transitionUuid: "transition-partial",
            transitionKind: false,
            transitionFixed: "nope",
            transitionDuration: "300",
            transitionSettings: { color: "black" }
          },
          {
            transitionName: "Stinger",
            transitionKind: "stinger_transition"
          },
          {
            transitionName: "Cut",
            transitionDuration: null
          }
        ]
      }
    })
    await expect(listSceneTransitions(client)).resolves.toEqual({
      currentSceneTransitionName: null,
      currentSceneTransitionUuid: null,
      currentSceneTransitionKind: null,
      transitions: [
        { transitionUuid: "transition-partial" },
        { transitionName: "Stinger", transitionKind: "stinger_transition" },
        { transitionName: "Cut", transitionDuration: null }
      ]
    })
  })

  it("mutates transition state through the fake OBS protocol", async () => {
    const server = await FakeObsServer.start({
      transitions: [
        {
          transitionName: "Cut",
          transitionUuid: "transition-cut",
          transitionKind: "cut_transition",
          transitionFixed: true,
          transitionDuration: null,
          transitionConfigurable: false,
          transitionSettings: null
        },
        {
          transitionName: "Fade",
          transitionUuid: "transition-fade",
          transitionKind: "fade_transition",
          transitionFixed: false,
          transitionDuration: 300,
          transitionConfigurable: true,
          transitionSettings: { color: "black" }
        }
      ]
    })
    servers.push(server)
    const client = await createObsClient(configFor(server.url))
    clients.push(client)
    await expect(setCurrentSceneTransition(client, { transitionName: "Fade" })).resolves.toEqual({
      transitionName: "Fade",
      switched: true
    })
    await expect(setCurrentSceneTransitionDuration(client, { transitionDuration: 750 })).resolves.toEqual({
      transitionDuration: 750,
      acknowledged: true
    })
    await expect(setCurrentSceneTransitionSettings(client, {
      transitionSettings: { path: "left", speed: 0.5, invert: false, label: null },
      overlay: false
    })).resolves.toEqual({ overlay: false, settingsFieldCount: 4, acknowledged: true })
    await expect(triggerStudioModeTransition(client)).resolves.toEqual({
      requestType: "TriggerStudioModeTransition",
      acknowledged: true
    })
    await expect(setTBarPosition(client, { position: 0.25, release: false })).resolves.toEqual({
      position: 0.25,
      release: false,
      acknowledged: true
    })
    await expect(getCurrentSceneTransition(client)).resolves.toMatchObject({
      transitionName: "Fade",
      transitionDuration: 750
    })
    await expect(getCurrentSceneTransitionCursor(client)).resolves.toEqual({ transitionCursor: 0.25 })
    expect(
      server.requests.filter((request) =>
        request.requestType.startsWith("Set") || request.requestType.startsWith("Trigger")
      )
    )
      .toEqual([
        { requestType: "SetCurrentSceneTransition", requestData: { transitionName: "Fade" } },
        { requestType: "SetCurrentSceneTransitionDuration", requestData: { transitionDuration: 750 } },
        {
          requestType: "SetCurrentSceneTransitionSettings",
          requestData: {
            transitionSettings: { path: "left", speed: 0.5, invert: false, label: null },
            overlay: false
          }
        },
        { requestType: "TriggerStudioModeTransition" },
        { requestType: "SetTBarPosition", requestData: { position: 0.25, release: false } }
      ])
  })

  it("surfaces OBS transition mutation request failures", async () => {
    const server = await FakeObsServer.start({
      failRequests: { SetCurrentSceneTransition: { code: 404, comment: "Transition not found" } }
    })
    servers.push(server)
    const client = await createObsClient({ ...configFor(server.url), enabledToolsets: ["transitions"] })
    clients.push(client)
    await expect(setCurrentSceneTransition(client, { transitionName: "Missing" })).rejects.toMatchObject(
      {
        requestType: "SetCurrentSceneTransition",
        code: 404,
        comment: "Transition not found"
      } satisfies Partial<ObsRequestError>
    )
  })

  it("gets and sets JSON-safe OBS persistent data through fake OBS", async () => {
    const server = await FakeObsServer.start()
    servers.push(server)
    const client = await createObsClient({ ...configFor(server.url), enabledToolsets: ["admin_raw"] })
    clients.push(client)
    const locator = { realm: "OBS_WEBSOCKET_DATA_REALM_PROFILE" as const, slotName: "ralph.task8" }
    const slotValue = { count: 2, nested: [true, null, "ok"] }

    await expect(setPersistentData(client, { ...locator, slotValue })).resolves.toEqual({
      ...locator,
      updated: true
    })
    await expect(getPersistentData(client, locator)).resolves.toEqual({ ...locator, slotValue })
    expect(server.requests.filter((request) => request.requestType.includes("PersistentData"))).toEqual([
      { requestType: "SetPersistentData", requestData: { ...locator, slotValue } },
      { requestType: "GetPersistentData", requestData: locator }
    ])
  })

  it("calls vendor requests and broadcasts custom events through fake OBS", async () => {
    const server = await FakeObsServer.start()
    servers.push(server)
    const client = await createObsClient({ ...configFor(server.url), enabledToolsets: ["vendor"] })
    clients.push(client)
    const requestData = { enabled: true, count: 2, nested: { label: "ok" } }

    await expect(callVendorRequest(client, {
      vendorName: "example.vendor",
      requestType: "DoThing",
      requestData
    })).resolves.toEqual({
      vendorName: "example.vendor",
      requestType: "DoThing",
      provenance: "vendor_plugin",
      responseData: {
        accepted: true,
        echo: requestData
      }
    })
    await expect(broadcastCustomEvent(client, { eventData: { eventName: "ralph.task9", requestData } }))
      .resolves.toEqual({ provenance: "custom_event", broadcasted: true })
    expect(
      server.requests.filter((request) =>
        request.requestType === "CallVendorRequest" || request.requestType === "BroadcastCustomEvent"
      )
    ).toEqual([
      {
        requestType: "CallVendorRequest",
        requestData: { vendorName: "example.vendor", requestType: "DoThing", requestData }
      },
      { requestType: "BroadcastCustomEvent", requestData: { eventData: { eventName: "ralph.task9", requestData } } }
    ])
  })

  it("runs schema-limited OBS request batches with batch-only Sleep through fake OBS", async () => {
    const server = await FakeObsServer.start()
    servers.push(server)
    const client = await createObsClient({ ...configFor(server.url), enabledToolsets: ["batch"] })
    clients.push(client)

    await expect(runObsRequestBatch(client, {
      executionType: "serial_realtime",
      haltOnFailure: false,
      requests: [
        { kind: "set_current_scene", sceneName: "Main" },
        { kind: "sleep", sleepMillis: 5 },
        { kind: "get_current_scene" }
      ]
    })).resolves.toMatchObject({
      executionType: "serial_realtime",
      haltOnFailure: false,
      requestedRequests: 3,
      returnedResults: 3,
      results: [
        {
          index: 0,
          kind: "set_current_scene",
          requestType: "SetCurrentProgramScene",
          requestStatus: { result: true, code: 100 },
          responseData: { sceneName: "Main", switched: true }
        },
        { index: 1, kind: "sleep", requestType: "Sleep", requestStatus: { result: true, code: 100 } },
        {
          index: 2,
          kind: "get_current_scene",
          requestType: "GetCurrentProgramScene",
          requestStatus: { result: true, code: 100 },
          responseData: { sceneName: "Main", sceneUuid: "scene-main" }
        }
      ]
    })
    expect(server.requests.filter((request) =>
      request.requestType === "SetCurrentProgramScene"
      || request.requestType === "Sleep"
      || request.requestType === "GetCurrentProgramScene"
    )).toEqual([
      { requestType: "SetCurrentProgramScene", requestData: { sceneName: "Main" } },
      { requestType: "Sleep", requestData: { sleepMillis: 5 } },
      { requestType: "GetCurrentProgramScene" }
    ])
  })

  it("times out waiting for OBS request batch responses", async () => {
    const server = await FakeObsServer.start({ skipResponsesFor: ["RequestBatch"] })
    servers.push(server)
    const client = await createObsClient({
      ...configFor(server.url),
      connectionTimeoutMs: 25,
      enabledToolsets: ["batch"]
    })
    clients.push(client)

    await expect(runObsRequestBatch(client, {
      executionType: "serial_realtime",
      haltOnFailure: false,
      requests: [{ kind: "get_current_scene" }]
    })).rejects.toBeInstanceOf(ObsTimeoutError)
  })

  it("preserves OBS request batch error metadata and halt-on-failure results", async () => {
    const server = await FakeObsServer.start({
      failRequests: { SetCurrentProgramScene: { code: 600, comment: "Scene not found" } }
    })
    servers.push(server)
    const client = await createObsClient({ ...configFor(server.url), enabledToolsets: ["batch"] })
    clients.push(client)

    await expect(runObsRequestBatch(client, {
      executionType: "serial_realtime",
      haltOnFailure: true,
      requests: [
        { kind: "set_current_scene", sceneName: "Missing" },
        { kind: "get_current_scene" }
      ]
    })).resolves.toMatchObject({
      requestedRequests: 2,
      returnedResults: 1,
      results: [{
        index: 0,
        kind: "set_current_scene",
        requestType: "SetCurrentProgramScene",
        requestStatus: { result: false, code: 600, comment: "Scene not found" }
      }]
    })
  })

  it("correlates reordered OBS request batch results by request id", async () => {
    const server = await FakeObsServer.start({ reverseBatchResults: true })
    servers.push(server)
    const client = await createObsClient({ ...configFor(server.url), enabledToolsets: ["batch"] })
    clients.push(client)

    await expect(runObsRequestBatch(client, {
      executionType: "serial_realtime",
      haltOnFailure: false,
      requests: [
        { kind: "set_current_scene", sceneName: "Main" },
        { kind: "get_current_scene" }
      ]
    })).resolves.toMatchObject({
      results: [
        { index: 0, kind: "set_current_scene", requestType: "SetCurrentProgramScene" },
        { index: 1, kind: "get_current_scene", requestType: "GetCurrentProgramScene" }
      ]
    })
  })

  it("rejects OBS request batch results with mismatched request types", async () => {
    const server = await FakeObsServer.start({ mismatchFirstBatchResultType: true })
    servers.push(server)
    const client = await createObsClient({ ...configFor(server.url), enabledToolsets: ["batch"] })
    clients.push(client)

    await expect(runObsRequestBatch(client, {
      executionType: "serial_realtime",
      haltOnFailure: false,
      requests: [{ kind: "get_current_scene" }]
    })).rejects.toThrow("expected GetCurrentProgramScene")
  })

  it("ignores unrelated OBS request batch responses before the correlated response", async () => {
    const server = await FakeObsServer.start({ sendUnrelatedBatchResponseBeforeReal: true })
    servers.push(server)
    const client = await createObsClient({ ...configFor(server.url), enabledToolsets: ["batch"] })
    clients.push(client)

    await expect(runObsRequestBatch(client, {
      executionType: "serial_realtime",
      haltOnFailure: false,
      requests: [{ kind: "get_current_scene" }]
    })).resolves.toMatchObject({
      returnedResults: 1,
      results: [{ requestId: "batch-0", requestType: "GetCurrentProgramScene" }]
    })
  })

  it("runs serial-frame Sleep batches with frame counts", async () => {
    const requestedBatches: Array<Parameters<ObsClient["requestBatch"]>[0]> = []
    const client: ObsClient = {
      ...fakeClient(async () => ({})),
      requestBatch: async (batch) => {
        requestedBatches.push(batch)
        return [{
          requestType: "Sleep",
          requestId: "batch-0",
          requestStatus: { result: true, code: 100 },
          responseData: {}
        }]
      }
    }

    await expect(runObsRequestBatch(client, {
      executionType: "serial_frame",
      haltOnFailure: false,
      requests: [{ kind: "sleep", sleepFrames: 2 }]
    })).resolves.toMatchObject({
      results: [{ kind: "sleep", requestType: "Sleep", requestStatus: { result: true, code: 100 } }]
    })
    expect(requestedBatches).toEqual([{
      executionType: 1,
      haltOnFailure: false,
      requests: [{ requestType: "Sleep", requestId: "batch-0", requestData: { sleepFrames: 2 } }]
    }])
  })

  it("rejects missing, unexpected, and post-halt OBS request batch results", async () => {
    const baseClient = fakeClient(async () => ({}))
    const batchInput = {
      executionType: "serial_realtime" as const,
      haltOnFailure: false,
      requests: [{ kind: "get_current_scene" as const }]
    }
    await expect(runObsRequestBatch({
      ...baseClient,
      requestBatch: async () => [{
        requestType: "GetCurrentProgramScene",
        requestStatus: { result: true, code: 100 },
        responseData: { sceneName: "Intro", sceneUuid: "scene-intro" }
      }]
    }, batchInput)).rejects.toThrow("did not include requestId")
    await expect(runObsRequestBatch({
      ...baseClient,
      requestBatch: async () => [{
        requestType: "GetCurrentProgramScene",
        requestId: "unexpected",
        requestStatus: { result: true, code: 100 },
        responseData: { sceneName: "Intro", sceneUuid: "scene-intro" }
      }]
    }, batchInput)).rejects.toThrow("unexpected batch result")
    await expect(runObsRequestBatch({
      ...baseClient,
      requestBatch: async () => [
        {
          requestType: "GetCurrentProgramScene",
          requestId: "batch-1",
          requestStatus: { result: true, code: 100 },
          responseData: { sceneName: "Intro", sceneUuid: "scene-intro" }
        },
        {
          requestType: "SetCurrentProgramScene",
          requestId: "batch-0",
          requestStatus: { result: false, code: 600, comment: "Scene not found" },
          responseData: {}
        }
      ]
    }, {
      executionType: "serial_realtime",
      haltOnFailure: true,
      requests: [
        { kind: "set_current_scene", sceneName: "Missing" },
        { kind: "get_current_scene" }
      ]
    })).rejects.toThrow("after halt-on-failure")
    await expect(runObsRequestBatch({
      ...baseClient,
      requestBatch: async () => [
        {
          requestType: "SetCurrentProgramScene",
          requestId: "batch-0",
          requestStatus: { result: false, code: 600, comment: "Scene not found" },
          responseData: {}
        },
        {
          requestType: "GetCurrentProgramScene",
          requestId: "batch-1",
          requestStatus: { result: true, code: 100 },
          responseData: { sceneName: "Intro", sceneUuid: "scene-intro" }
        }
      ]
    }, {
      executionType: "serial_realtime",
      haltOnFailure: true,
      requests: [
        { kind: "set_current_scene", sceneName: "Missing" },
        { kind: "get_current_scene" }
      ]
    })).rejects.toThrow("after halt-on-failure")
    await expect(runObsRequestBatch({
      ...baseClient,
      requestBatch: async () => []
    }, batchInput)).rejects.toThrow("did not return batch result")
    await expect(runObsRequestBatch({
      ...baseClient,
      requestBatch: async () => [{
        requestType: "GetCurrentProgramScene",
        requestId: "batch-0",
        requestStatus: { result: true, code: 100 }
      }]
    }, batchInput)).rejects.toThrow("did not include responseData")
  })

  it("rejects duplicate explicit and generated OBS request batch ids before sending", async () => {
    let batchRequests = 0
    const client: ObsClient = {
      ...fakeClient(async () => ({})),
      requestBatch: async () => {
        batchRequests += 1
        return []
      }
    }

    await expect(runObsRequestBatch(client, {
      executionType: "serial_realtime",
      haltOnFailure: false,
      requests: [
        { kind: "get_current_scene", id: "same" },
        { kind: "sleep", id: "same", sleepMillis: 1 }
      ]
    })).rejects.toThrow("Duplicate OBS batch request id same")
    await expect(runObsRequestBatch(client, {
      executionType: "serial_realtime",
      haltOnFailure: false,
      requests: [
        { kind: "get_current_scene", id: "batch-1" },
        { kind: "sleep", sleepMillis: 1 }
      ]
    })).rejects.toThrow("Duplicate OBS batch request id batch-1")
    expect(batchRequests).toBe(0)
  })

  it("rejects request batches after the OBS client is closed", async () => {
    const server = await FakeObsServer.start()
    const client = await createObsClient({ ...configFor(server.url), enabledToolsets: ["batch"] })
    await client.close()
    await server.stop()

    await expect(runObsRequestBatch(client, {
      executionType: "serial_realtime",
      haltOnFailure: false,
      requests: [{ kind: "get_current_scene" }]
    })).rejects.toThrow("OBS websocket is closed")
  })

  it("rejects pending request batches when OBS closes the websocket", async () => {
    const server = await FakeObsServer.start({ skipResponsesFor: ["RequestBatch"] })
    const client = await createObsClient({
      ...configFor(server.url),
      connectionTimeoutMs: 300,
      enabledToolsets: ["batch"]
    })
    const pending = runObsRequestBatch(client, {
      executionType: "serial_realtime",
      haltOnFailure: false,
      requests: [{ kind: "get_current_scene" }]
    })
    await server.stop()

    await expect(pending).rejects.toThrow("OBS websocket closed")
  })

  it("lists scenes and can filter groups", async () => {
    const server = await FakeObsServer.start()
    servers.push(server)
    const client = await createObsClient(configFor(server.url))
    clients.push(client)
    const allScenes = await listScenes(client, { includeGroups: true })
    const noGroups = await listScenes(client, { includeGroups: false })
    expect(allScenes.scenes).toHaveLength(3)
    expect(noGroups.scenes.map((scene) => scene.sceneName)).toEqual(["Intro", "Main"])
  })

  it("lists groups through the fake OBS protocol", async () => {
    const server = await FakeObsServer.start()
    servers.push(server)
    const client = await createObsClient(configFor(server.url))
    clients.push(client)
    await expect(listGroups(client)).resolves.toEqual({ groups: ["Group"] })
  })

  it("gets and sets the current scene", async () => {
    const server = await FakeObsServer.start()
    servers.push(server)
    const client = await createObsClient(configFor(server.url))
    clients.push(client)
    await expect(getCurrentScene(client)).resolves.toEqual({ sceneName: "Intro", sceneUuid: "scene-intro" })
    await expect(setCurrentScene(client, { sceneName: "Main" })).resolves.toEqual({ sceneName: "Main", switched: true })
    await expect(getCurrentScene(client)).resolves.toEqual({ sceneName: "Main", sceneUuid: "scene-main" })
  })

  it("gets and sets the current studio mode preview scene", async () => {
    const server = await FakeObsServer.start()
    servers.push(server)
    const client = await createObsClient(configFor(server.url))
    clients.push(client)
    await expect(getCurrentPreviewScene(client)).resolves.toEqual({ sceneName: "Intro", sceneUuid: "scene-intro" })
    await expect(setCurrentPreviewScene(client, { sceneUuid: "scene-main" }))
      .resolves.toEqual({ sceneUuid: "scene-main", updated: true })
    await expect(getCurrentPreviewScene(client)).resolves.toEqual({ sceneName: "Main", sceneUuid: "scene-main" })
  })

  it("creates, renames, and removes scenes through the fake OBS protocol", async () => {
    const server = await FakeObsServer.start()
    servers.push(server)
    const client = await createObsClient(configFor(server.url))
    clients.push(client)
    await expect(createScene(client, { sceneName: "Break" }))
      .resolves.toEqual({ sceneName: "Break", sceneUuid: "scene-break", created: true })
    await expect(createScene(client, { sceneName: "Temp" }))
      .resolves.toEqual({ sceneName: "Temp", sceneUuid: "scene-temp", created: true })
    await expect(removeScene(client, { sceneUuid: "scene-temp" }))
      .resolves.toEqual({ sceneUuid: "scene-temp", removed: true })
    await expect(listScenes(client, { includeGroups: true }))
      .resolves.toMatchObject({
        scenes: expect.arrayContaining([expect.objectContaining({ sceneName: "Break", sceneUuid: "scene-break" })])
      })
    await expect(setSceneName(client, {
      sceneName: "Break",
      canvasUuid: "canvas-main",
      newSceneName: "Intermission"
    })).resolves.toEqual({
      sceneName: "Break",
      canvasUuid: "canvas-main",
      newSceneName: "Intermission",
      renamed: true
    })
    await expect(listScenes(client, { includeGroups: true }))
      .resolves.toMatchObject({
        scenes: expect.arrayContaining([
          expect.objectContaining({ sceneName: "Intermission", sceneUuid: "scene-break" })
        ])
      })
    await expect(removeScene(client, { sceneName: "Intermission", canvasUuid: "canvas-main" }))
      .resolves.toEqual({ sceneName: "Intermission", canvasUuid: "canvas-main", removed: true })
    const scenes = await listScenes(client, { includeGroups: true })
    expect(scenes.scenes.map((scene) => scene.sceneName)).not.toContain("Intermission")
  })

  it("surfaces duplicate and missing scene lifecycle OBS errors", async () => {
    const server = await FakeObsServer.start()
    servers.push(server)
    const client = await createObsClient(configFor(server.url))
    clients.push(client)
    await expect(createScene(client, { sceneName: "Intro" })).rejects.toMatchObject({
      requestType: "CreateScene",
      code: 601,
      comment: "Scene already exists"
    })
    await expect(removeScene(client, { sceneName: "Missing" })).rejects.toMatchObject({
      requestType: "RemoveScene",
      code: 600,
      comment: "Scene not found"
    })
    await expect(setSceneName(client, { sceneName: "Missing", newSceneName: "Other" })).rejects.toMatchObject({
      requestType: "SetSceneName",
      code: 600,
      comment: "Scene not found"
    })
  })

  it("gets, sets, replaces, and clears scene transition overrides", async () => {
    const server = await FakeObsServer.start()
    servers.push(server)
    const client = await createObsClient(configFor(server.url))
    clients.push(client)
    await expect(getSceneTransitionOverride(client, { sceneName: "Intro" }))
      .resolves.toEqual({ transitionName: null, transitionDuration: null })
    await expect(setSceneTransitionOverride(client, {
      sceneName: "Intro",
      transitionName: "Fade",
      transitionDuration: 300
    })).resolves.toEqual({
      sceneName: "Intro",
      transitionName: "Fade",
      transitionDuration: 300,
      updated: true
    })
    await expect(getSceneTransitionOverride(client, { sceneUuid: "scene-intro" }))
      .resolves.toEqual({ transitionName: "Fade", transitionDuration: 300 })
    await expect(setSceneTransitionOverride(client, { sceneUuid: "scene-intro", transitionName: "Cut" }))
      .resolves.toEqual({ sceneUuid: "scene-intro", transitionName: "Cut", updated: true })
    await expect(getSceneTransitionOverride(client, { sceneName: "Intro" }))
      .resolves.toEqual({ transitionName: "Cut", transitionDuration: 300 })
    await expect(setSceneTransitionOverride(client, { sceneUuid: "scene-intro", transitionDuration: 500 }))
      .resolves.toEqual({ sceneUuid: "scene-intro", transitionDuration: 500, updated: true })
    await expect(getSceneTransitionOverride(client, { sceneName: "Intro" }))
      .resolves.toEqual({ transitionName: "Cut", transitionDuration: 500 })
    await expect(setSceneTransitionOverride(client, {
      sceneName: "Intro",
      transitionName: null,
      transitionDuration: null
    })).resolves.toEqual({
      sceneName: "Intro",
      transitionName: null,
      transitionDuration: null,
      updated: true
    })
    await expect(getSceneTransitionOverride(client, { sceneName: "Intro" }))
      .resolves.toEqual({ transitionName: null, transitionDuration: null })
  })

  it("gets scene item transform fields through the fake OBS protocol", async () => {
    const server = await FakeObsServer.start()
    servers.push(server)
    const client = await createObsClient(configFor(server.url))
    clients.push(client)
    await expect(getSceneItemTransform(client, { sceneName: "Intro", sceneItemId: 9 }))
      .resolves.toEqual({
        sceneItemTransform: {
          alignment: 5,
          boundsAlignment: 5,
          boundsHeight: 120,
          boundsType: "OBS_BOUNDS_SCALE_INNER",
          boundsWidth: 640,
          cropBottom: 4,
          cropLeft: 8,
          cropRight: 0,
          cropTop: 0,
          cropToBounds: true,
          height: 120,
          positionX: 64.5,
          positionY: 512.25,
          rotation: 0.5,
          scaleX: 0.5,
          scaleY: 0.5,
          sourceHeight: 240,
          sourceWidth: 1280,
          width: 640
        }
      })
  })

  it("updates fake OBS scene item lists for lifecycle operations without changing group items", async () => {
    const server = await FakeObsServer.start()
    servers.push(server)
    const client = await createObsClient(configFor(server.url))
    clients.push(client)
    await expect(createSceneItem(client, {
      sceneName: "Intro",
      sourceName: "Title",
      sceneItemEnabled: false
    })).resolves.toEqual({
      sceneName: "Intro",
      sourceName: "Title",
      sceneItemId: 10,
      created: true
    })
    await expect(duplicateSceneItem(client, { sceneName: "Intro", sceneItemId: 7 }))
      .resolves.toEqual({ sceneName: "Intro", sceneItemId: 11, duplicated: true })
    await expect(listSceneItems(client, { sceneName: "Intro" }))
      .resolves.toMatchObject({
        sceneItems: [
          { sceneItemId: 7, sceneItemIndex: 0, sourceName: "Camera" },
          { sceneItemId: 9, sceneItemIndex: 1, sourceName: "Lower Third" },
          { sceneItemId: 10, sceneItemIndex: 2, sourceName: "Title" },
          { sceneItemId: 11, sceneItemIndex: 3, sourceName: "Camera" }
        ]
      })
    await expect(getSceneItemEnabled(client, { sceneName: "Intro", sceneItemId: 10 }))
      .resolves.toEqual({ sceneItemEnabled: false })
    await expect(getSceneItemIndex(client, { sceneName: "Intro", sceneItemId: 10 }))
      .resolves.toEqual({ sceneItemIndex: 2 })
    await expect(getSceneItemBlendMode(client, { sceneName: "Intro", sceneItemId: 10 }))
      .resolves.toEqual({ sceneItemBlendMode: "OBS_BLEND_NORMAL" })
    await expect(getSceneItemSource(client, { sceneName: "Intro", sceneItemId: 10 }))
      .resolves.toEqual({ sourceName: "Title", sourceUuid: "source-10" })
    await expect(getSourceActive(client, { sourceName: "Title" }))
      .resolves.toEqual({ sourceName: "Title", videoActive: false, videoShowing: true })
    await expect(removeSceneItem(client, { sceneName: "Intro", sceneItemId: 9 }))
      .resolves.toEqual({ sceneName: "Intro", sceneItemId: 9, removed: true })
    await expect(listSceneItems(client, { sceneName: "Intro" }))
      .resolves.toMatchObject({
        sceneItems: [
          { sceneItemId: 7, sceneItemIndex: 0, sourceName: "Camera" },
          { sceneItemId: 10, sceneItemIndex: 1, sourceName: "Title" },
          { sceneItemId: 11, sceneItemIndex: 2, sourceName: "Camera" }
        ]
      })
    await expect(listGroupSceneItems(client, { sceneName: "Group" }))
      .resolves.toEqual({
        sceneItems: [{
          sceneItemId: 3,
          sceneItemIndex: 0,
          sourceName: "Nested",
          sourceUuid: "source-nested"
        }]
      })
  })

  it("surfaces fake OBS missing scene item lifecycle errors", async () => {
    const server = await FakeObsServer.start()
    servers.push(server)
    const client = await createObsClient(configFor(server.url))
    clients.push(client)
    await expect(removeSceneItem(client, { sceneName: "Intro", sceneItemId: 404 }))
      .rejects.toMatchObject({
        requestType: "RemoveSceneItem",
        code: 600,
        comment: "Scene item not found"
      })
    await expect(duplicateSceneItem(client, { sceneName: "Intro", sceneItemId: 404 }))
      .rejects.toMatchObject({
        requestType: "DuplicateSceneItem",
        code: 600,
        comment: "Scene item not found"
      })
  })

  it("duplicates scene items into the source scene when selected by scene UUID", async () => {
    const server = await FakeObsServer.start()
    servers.push(server)
    const client = await createObsClient(configFor(server.url))
    clients.push(client)
    await expect(duplicateSceneItem(client, { sceneUuid: "scene-intro", sceneItemId: 7 }))
      .resolves.toEqual({ sceneUuid: "scene-intro", sceneItemId: 10, duplicated: true })
    await expect(listSceneItems(client, { sceneUuid: "scene-intro" }))
      .resolves.toMatchObject({
        sceneItems: [
          { sceneItemId: 7, sceneItemIndex: 0, sourceName: "Camera" },
          { sceneItemId: 9, sceneItemIndex: 1, sourceName: "Lower Third" },
          { sceneItemId: 10, sceneItemIndex: 2, sourceName: "Camera" }
        ]
      })
  })

  it("sets scene item transform fields through the fake OBS protocol", async () => {
    const server = await FakeObsServer.start()
    servers.push(server)
    const client = await createObsClient(configFor(server.url))
    clients.push(client)
    await expect(setSceneItemTransform(client, {
      sceneName: "Intro",
      sceneItemId: 9,
      sceneItemTransform: {
        cropToBounds: false,
        positionX: 320.25,
        scaleX: 0.75
      }
    })).resolves.toEqual({
      sceneItemTransform: {
        cropToBounds: false,
        positionX: 320.25,
        scaleX: 0.75
      },
      updated: true
    })
    await expect(getSceneItemTransform(client, { sceneName: "Intro", sceneItemId: 9 }))
      .resolves.toMatchObject({
        sceneItemTransform: {
          cropToBounds: false,
          positionX: 320.25,
          positionY: 512.25,
          scaleX: 0.75
        }
      })
  })

  it("rejects unsupported-only scene item transform updates in fake OBS", () => {
    const errors: Array<unknown> = []
    const handled = handleFakeObsSceneItemReadRequest(
      "SetSceneItemTransform",
      {
        sceneName: "Intro",
        sceneItemId: 9,
        sceneItemTransform: { width: 1280 }
      },
      () => undefined,
      new Map(),
      (code, comment) => errors.push({ code, comment })
    )
    expect(handled).toBe(true)
    expect(errors).toEqual([{ code: 402, comment: "No valid scene item transform fields" }])
  })

  it("surfaces scene item transform OBS errors", async () => {
    const server = await FakeObsServer.start({
      failRequests: { GetSceneItemTransform: { code: 601, comment: "Scene item not found" } }
    })
    servers.push(server)
    const client = await createObsClient(configFor(server.url))
    clients.push(client)
    await expect(getSceneItemTransform(client, { sceneName: "Intro", sceneItemId: 99 })).rejects.toMatchObject({
      requestType: "GetSceneItemTransform",
      code: 601,
      comment: "Scene item not found"
    })
  })

  it("surfaces set scene item transform OBS errors", async () => {
    const server = await FakeObsServer.start({
      failRequests: { SetSceneItemTransform: { code: 601, comment: "Scene item not found" } }
    })
    servers.push(server)
    const client = await createObsClient(configFor(server.url))
    clients.push(client)
    await expect(setSceneItemTransform(client, {
      sceneName: "Intro",
      sceneItemId: 99,
      sceneItemTransform: { positionX: 1 }
    })).rejects.toMatchObject({
      requestType: "SetSceneItemTransform",
      code: 601,
      comment: "Scene item not found"
    })
  })

  it("discovers inputs and input kinds through the fake OBS protocol", async () => {
    const server = await FakeObsServer.start()
    servers.push(server)
    const client = await createObsClient(configFor(server.url))
    clients.push(client)
    await expect(listInputs(client, {})).resolves.toEqual({
      inputs: [
        {
          inputName: "Desktop Audio",
          inputUuid: "input-desktop-audio",
          inputKind: "wasapi_output_capture",
          unversionedInputKind: "wasapi_output_capture"
        },
        {
          inputName: "Mic/Aux",
          inputUuid: "input-mic-aux",
          inputKind: "wasapi_input_capture",
          unversionedInputKind: "wasapi_input_capture"
        }
      ]
    })
    await expect(listInputs(client, { inputKind: "wasapi_input_capture" })).resolves.toEqual({
      inputs: [{
        inputName: "Mic/Aux",
        inputUuid: "input-mic-aux",
        inputKind: "wasapi_input_capture",
        unversionedInputKind: "wasapi_input_capture"
      }]
    })
    await expect(listInputKinds(client, { unversioned: false })).resolves.toEqual({
      inputKinds: ["wasapi_output_capture", "wasapi_input_capture"]
    })
    await expect(listInputKinds(client, { unversioned: true })).resolves.toEqual({
      inputKinds: ["wasapi_output_capture", "wasapi_input_capture"]
    })
  })

  it("returns nullable special inputs for unassigned fake OBS channels", async () => {
    const server = await FakeObsServer.start()
    servers.push(server)
    const client = await createObsClient(configFor(server.url))
    clients.push(client)
    await expect(getSpecialInputs(client)).resolves.toEqual({
      desktop1: "Desktop Audio",
      desktop2: null,
      mic1: "Mic/Aux",
      mic2: null,
      mic3: null,
      mic4: null
    })
  })

  it("controls input mute over the OBS protocol", async () => {
    const server = await FakeObsServer.start()
    servers.push(server)
    const client = await createObsClient({ ...configFor(server.url), enabledToolsets: ["inputs"] })
    clients.push(client)
    await expect(getInputMute(client, { inputName: "Mic/Aux" })).resolves.toEqual({ inputMuted: false })
    await expect(setInputMute(client, { inputName: "Mic/Aux", inputMuted: true })).resolves.toEqual({
      inputMuted: true
    })
    await expect(getInputMute(client, { inputUuid: "input-mic-aux" })).resolves.toEqual({ inputMuted: true })
    await expect(toggleInputMute(client, { inputUuid: "input-mic-aux" })).resolves.toEqual({ inputMuted: false })
    expect(server.requests.filter((request) => request.requestType.includes("InputMute"))).toEqual([
      { requestType: "GetInputMute", requestData: { inputName: "Mic/Aux" } },
      { requestType: "SetInputMute", requestData: { inputName: "Mic/Aux", inputMuted: true } },
      { requestType: "GetInputMute", requestData: { inputUuid: "input-mic-aux" } },
      { requestType: "ToggleInputMute", requestData: { inputUuid: "input-mic-aux" } }
    ])
  })

  it("surfaces OBS failures for input mute controls", async () => {
    const server = await FakeObsServer.start({
      failRequests: { SetInputMute: { code: 600, comment: "Input not found" } }
    })
    servers.push(server)
    const client = await createObsClient({ ...configFor(server.url), enabledToolsets: ["inputs"] })
    clients.push(client)
    await expect(setInputMute(client, { inputName: "Missing", inputMuted: true })).rejects.toMatchObject(
      {
        requestType: "SetInputMute",
        code: 600,
        comment: "Input not found"
      } satisfies Partial<ObsRequestError>
    )
  })

  it("controls input volume over the OBS protocol", async () => {
    const server = await FakeObsServer.start()
    servers.push(server)
    const client = await createObsClient({ ...configFor(server.url), enabledToolsets: ["inputs"] })
    clients.push(client)
    await expect(getInputVolume(client, { inputName: "Mic/Aux" })).resolves.toEqual({
      inputVolumeMul: 1,
      inputVolumeDb: 0
    })
    await expect(setInputVolume(client, { inputName: "Mic/Aux", inputVolumeMul: 0.5 })).resolves.toEqual({
      inputVolumeMul: 0.5,
      acknowledged: true
    })
    const volume = await getInputVolume(client, { inputUuid: "input-mic-aux" })
    expect(volume.inputVolumeMul).toBe(0.5)
    expect(volume.inputVolumeDb).toBeCloseTo(-6.0206, 4)
    await expect(setInputVolume(client, { inputUuid: "input-mic-aux", inputVolumeDb: -6 })).resolves.toEqual({
      inputVolumeDb: -6,
      acknowledged: true
    })
    expect(server.requests.filter((request) => request.requestType.includes("InputVolume"))).toEqual([
      { requestType: "GetInputVolume", requestData: { inputName: "Mic/Aux" } },
      { requestType: "SetInputVolume", requestData: { inputName: "Mic/Aux", inputVolumeMul: 0.5 } },
      { requestType: "GetInputVolume", requestData: { inputUuid: "input-mic-aux" } },
      { requestType: "SetInputVolume", requestData: { inputUuid: "input-mic-aux", inputVolumeDb: -6 } }
    ])
  })

  it("surfaces OBS failures for input volume controls", async () => {
    const server = await FakeObsServer.start({
      failRequests: { SetInputVolume: { code: 601, comment: "Volume out of range" } }
    })
    servers.push(server)
    const client = await createObsClient({ ...configFor(server.url), enabledToolsets: ["inputs"] })
    clients.push(client)
    await expect(setInputVolume(client, { inputName: "Mic/Aux", inputVolumeMul: 21 })).rejects.toThrow(
      "Expected a number less than or equal to 20"
    )
    await expect(setInputVolume(client, { inputName: "Mic/Aux", inputVolumeMul: 1 })).rejects.toMatchObject(
      {
        requestType: "SetInputVolume",
        code: 601,
        comment: "Volume out of range"
      } satisfies Partial<ObsRequestError>
    )
  })

  it("controls input audio balance and monitor type over the OBS protocol", async () => {
    const server = await FakeObsServer.start()
    servers.push(server)
    const client = await createObsClient({ ...configFor(server.url), enabledToolsets: ["inputs"] })
    clients.push(client)
    await expect(getInputAudioBalance(client, { inputName: "Mic/Aux" })).resolves.toEqual({
      inputAudioBalance: 0.5
    })
    await expect(setInputAudioBalance(client, { inputName: "Mic/Aux", inputAudioBalance: 0.75 })).resolves.toEqual({
      inputAudioBalance: 0.75,
      acknowledged: true
    })
    await expect(getInputAudioBalance(client, { inputUuid: "input-mic-aux" })).resolves.toEqual({
      inputAudioBalance: 0.75
    })
    await expect(getInputAudioMonitorType(client, { inputName: "Mic/Aux" })).resolves.toEqual({
      monitorType: "OBS_MONITORING_TYPE_NONE"
    })
    await expect(setInputAudioMonitorType(client, {
      inputUuid: "input-mic-aux",
      monitorType: "OBS_MONITORING_TYPE_MONITOR_AND_OUTPUT"
    })).resolves.toEqual({
      monitorType: "OBS_MONITORING_TYPE_MONITOR_AND_OUTPUT",
      acknowledged: true
    })
    await expect(getInputAudioMonitorType(client, { inputName: "Mic/Aux" })).resolves.toEqual({
      monitorType: "OBS_MONITORING_TYPE_MONITOR_AND_OUTPUT"
    })
    expect(server.requests.filter((request) => request.requestType.includes("InputAudio"))).toEqual([
      { requestType: "GetInputAudioBalance", requestData: { inputName: "Mic/Aux" } },
      { requestType: "SetInputAudioBalance", requestData: { inputName: "Mic/Aux", inputAudioBalance: 0.75 } },
      { requestType: "GetInputAudioBalance", requestData: { inputUuid: "input-mic-aux" } },
      { requestType: "GetInputAudioMonitorType", requestData: { inputName: "Mic/Aux" } },
      {
        requestType: "SetInputAudioMonitorType",
        requestData: {
          inputUuid: "input-mic-aux",
          monitorType: "OBS_MONITORING_TYPE_MONITOR_AND_OUTPUT"
        }
      },
      { requestType: "GetInputAudioMonitorType", requestData: { inputName: "Mic/Aux" } }
    ])
  })

  it("surfaces OBS failures for input audio controls", async () => {
    const server = await FakeObsServer.start({
      failRequests: { SetInputAudioMonitorType: { code: 602, comment: "Monitor unavailable" } }
    })
    servers.push(server)
    const client = await createObsClient({ ...configFor(server.url), enabledToolsets: ["inputs"] })
    clients.push(client)
    await expect(setInputAudioBalance(client, { inputName: "Mic/Aux", inputAudioBalance: 2 })).rejects.toThrow(
      "Expected a number less than or equal to 1"
    )
    await expect(setInputAudioMonitorType(client, {
      inputName: "Mic/Aux",
      monitorType: "OBS_MONITORING_TYPE_MONITOR_ONLY"
    })).rejects.toMatchObject(
      {
        requestType: "SetInputAudioMonitorType",
        code: 602,
        comment: "Monitor unavailable"
      } satisfies Partial<ObsRequestError>
    )
  })

  it("controls input audio sync offset over the OBS protocol", async () => {
    const server = await FakeObsServer.start()
    servers.push(server)
    const client = await createObsClient({ ...configFor(server.url), enabledToolsets: ["inputs"] })
    clients.push(client)
    await expect(getInputAudioSyncOffset(client, { inputName: "Mic/Aux" })).resolves.toEqual({
      inputAudioSyncOffset: 0
    })
    await expect(setInputAudioSyncOffset(client, { inputName: "Mic/Aux", inputAudioSyncOffset: -250 }))
      .resolves.toEqual({
        inputAudioSyncOffset: -250,
        acknowledged: true
      })
    await expect(getInputAudioSyncOffset(client, { inputUuid: "input-mic-aux" })).resolves.toEqual({
      inputAudioSyncOffset: -250
    })
    await expect(setInputAudioSyncOffset(client, { inputUuid: "input-mic-aux", inputAudioSyncOffset: 125 }))
      .resolves.toEqual({
        inputAudioSyncOffset: 125,
        acknowledged: true
      })
    expect(server.requests.filter((request) => request.requestType.includes("InputAudioSyncOffset"))).toEqual([
      { requestType: "GetInputAudioSyncOffset", requestData: { inputName: "Mic/Aux" } },
      { requestType: "SetInputAudioSyncOffset", requestData: { inputName: "Mic/Aux", inputAudioSyncOffset: -250 } },
      { requestType: "GetInputAudioSyncOffset", requestData: { inputUuid: "input-mic-aux" } },
      { requestType: "SetInputAudioSyncOffset", requestData: { inputUuid: "input-mic-aux", inputAudioSyncOffset: 125 } }
    ])
  })

  it("controls input audio tracks over the OBS protocol", async () => {
    const server = await FakeObsServer.start()
    servers.push(server)
    const client = await createObsClient({ ...configFor(server.url), enabledToolsets: ["inputs"] })
    clients.push(client)
    const inputAudioTracks = {
      track1: true,
      track2: false,
      track3: true,
      track4: false,
      track5: true,
      track6: false
    }
    const obsInputAudioTracks = {
      "1": true,
      "2": false,
      "3": true,
      "4": false,
      "5": true,
      "6": false
    }
    await expect(getInputAudioTracks(client, { inputName: "Mic/Aux" })).resolves.toEqual({
      inputAudioTracks: {
        track1: true,
        track2: true,
        track3: true,
        track4: true,
        track5: true,
        track6: true
      }
    })
    await expect(setInputAudioTracks(client, { inputName: "Mic/Aux", inputAudioTracks })).resolves.toEqual({
      inputAudioTracks,
      acknowledged: true
    })
    await expect(getInputAudioTracks(client, { inputUuid: "input-mic-aux" })).resolves.toEqual({
      inputAudioTracks
    })
    expect(server.requests.filter((request) => request.requestType.includes("InputAudioTracks"))).toEqual([
      { requestType: "GetInputAudioTracks", requestData: { inputName: "Mic/Aux" } },
      {
        requestType: "SetInputAudioTracks",
        requestData: { inputName: "Mic/Aux", inputAudioTracks: obsInputAudioTracks }
      },
      { requestType: "GetInputAudioTracks", requestData: { inputUuid: "input-mic-aux" } }
    ])
  })

  it("surfaces OBS failures for input audio track controls", async () => {
    const server = await FakeObsServer.start({
      failRequests: { SetInputAudioTracks: { code: 604, comment: "Audio tracks rejected" } }
    })
    servers.push(server)
    const client = await createObsClient({ ...configFor(server.url), enabledToolsets: ["inputs"] })
    clients.push(client)
    const invalidInputAudioTracksInput = {
      inputName: "Mic/Aux",
      inputAudioTracks: {
        track1: true,
        track2: true,
        track3: true,
        track4: true,
        track5: true,
        track6: "yes"
      }
    }
    const setInputAudioTracksUnchecked = setInputAudioTracks as (
      client: ObsClient,
      input: unknown
    ) => ReturnType<typeof setInputAudioTracks>
    await expect(setInputAudioTracksUnchecked(
      client,
      invalidInputAudioTracksInput
    )).rejects.toThrow("Expected boolean")
    await expect(setInputAudioTracks(client, {
      inputName: "Mic/Aux",
      inputAudioTracks: {
        track1: true,
        track2: false,
        track3: true,
        track4: false,
        track5: true,
        track6: false
      }
    })).rejects.toMatchObject(
      {
        requestType: "SetInputAudioTracks",
        code: 604,
        comment: "Audio tracks rejected"
      } satisfies Partial<ObsRequestError>
    )
  })

  it("controls input deinterlace mode and field order over the OBS protocol", async () => {
    const server = await FakeObsServer.start()
    servers.push(server)
    const client = await createObsClient({ ...configFor(server.url), enabledToolsets: ["inputs"] })
    clients.push(client)
    await expect(getInputDeinterlaceMode(client, { inputName: "Mic/Aux" })).resolves.toEqual({
      inputDeinterlaceMode: "OBS_DEINTERLACE_MODE_DISABLE"
    })
    await expect(setInputDeinterlaceMode(client, {
      inputName: "Mic/Aux",
      inputDeinterlaceMode: "OBS_DEINTERLACE_MODE_YADIF_2X"
    })).resolves.toEqual({
      inputDeinterlaceMode: "OBS_DEINTERLACE_MODE_YADIF_2X",
      acknowledged: true
    })
    await expect(getInputDeinterlaceMode(client, { inputUuid: "input-mic-aux" })).resolves.toEqual({
      inputDeinterlaceMode: "OBS_DEINTERLACE_MODE_YADIF_2X"
    })
    await expect(getInputDeinterlaceFieldOrder(client, { inputName: "Mic/Aux" })).resolves.toEqual({
      inputDeinterlaceFieldOrder: "OBS_DEINTERLACE_FIELD_ORDER_TOP"
    })
    await expect(setInputDeinterlaceFieldOrder(client, {
      inputUuid: "input-mic-aux",
      inputDeinterlaceFieldOrder: "OBS_DEINTERLACE_FIELD_ORDER_BOTTOM"
    })).resolves.toEqual({
      inputDeinterlaceFieldOrder: "OBS_DEINTERLACE_FIELD_ORDER_BOTTOM",
      acknowledged: true
    })
    await expect(getInputDeinterlaceFieldOrder(client, { inputName: "Mic/Aux" })).resolves.toEqual({
      inputDeinterlaceFieldOrder: "OBS_DEINTERLACE_FIELD_ORDER_BOTTOM"
    })
    expect(server.requests.filter((request) => request.requestType.includes("InputDeinterlace"))).toEqual([
      { requestType: "GetInputDeinterlaceMode", requestData: { inputName: "Mic/Aux" } },
      {
        requestType: "SetInputDeinterlaceMode",
        requestData: { inputName: "Mic/Aux", inputDeinterlaceMode: "OBS_DEINTERLACE_MODE_YADIF_2X" }
      },
      { requestType: "GetInputDeinterlaceMode", requestData: { inputUuid: "input-mic-aux" } },
      { requestType: "GetInputDeinterlaceFieldOrder", requestData: { inputName: "Mic/Aux" } },
      {
        requestType: "SetInputDeinterlaceFieldOrder",
        requestData: {
          inputUuid: "input-mic-aux",
          inputDeinterlaceFieldOrder: "OBS_DEINTERLACE_FIELD_ORDER_BOTTOM"
        }
      },
      { requestType: "GetInputDeinterlaceFieldOrder", requestData: { inputName: "Mic/Aux" } }
    ])
  })

  it("surfaces OBS failures for input deinterlace controls", async () => {
    const server = await FakeObsServer.start({
      failRequests: {
        SetInputDeinterlaceMode: { code: 605, comment: "Deinterlace mode unavailable for input" },
        SetInputDeinterlaceFieldOrder: { code: 606, comment: "Deinterlace field order unavailable for input" }
      }
    })
    servers.push(server)
    const client = await createObsClient({ ...configFor(server.url), enabledToolsets: ["inputs"] })
    clients.push(client)
    const setInputDeinterlaceModeUnchecked = setInputDeinterlaceMode as (
      client: ObsClient,
      input: unknown
    ) => ReturnType<typeof setInputDeinterlaceMode>
    const setInputDeinterlaceFieldOrderUnchecked = setInputDeinterlaceFieldOrder as (
      client: ObsClient,
      input: unknown
    ) => ReturnType<typeof setInputDeinterlaceFieldOrder>
    await expect(setInputDeinterlaceModeUnchecked(client, {
      inputName: "Mic/Aux",
      inputDeinterlaceMode: "OBS_DEINTERLACE_MODE_UNKNOWN"
    })).rejects.toThrow("Expected")
    await expect(setInputDeinterlaceFieldOrderUnchecked(client, {
      inputName: "Mic/Aux",
      inputDeinterlaceFieldOrder: "OBS_DEINTERLACE_FIELD_ORDER_UNKNOWN"
    })).rejects.toThrow("Expected")
    await expect(setInputDeinterlaceMode(client, {
      inputName: "Mic/Aux",
      inputDeinterlaceMode: "OBS_DEINTERLACE_MODE_LINEAR"
    })).rejects.toMatchObject(
      {
        requestType: "SetInputDeinterlaceMode",
        code: 605,
        comment: "Deinterlace mode unavailable for input"
      } satisfies Partial<ObsRequestError>
    )
    await expect(setInputDeinterlaceFieldOrder(client, {
      inputName: "Mic/Aux",
      inputDeinterlaceFieldOrder: "OBS_DEINTERLACE_FIELD_ORDER_TOP"
    })).rejects.toMatchObject(
      {
        requestType: "SetInputDeinterlaceFieldOrder",
        code: 606,
        comment: "Deinterlace field order unavailable for input"
      } satisfies Partial<ObsRequestError>
    )
  })

  it("reads raw input settings discovery values over the OBS protocol", async () => {
    const server = await FakeObsServer.start()
    servers.push(server)
    const client = await createObsClient({ ...configFor(server.url), enabledToolsets: ["inputs"] })
    clients.push(client)
    await expect(getInputDefaultSettings(client, { inputKind: "wasapi_input_capture" })).resolves.toEqual({
      inputKind: "wasapi_input_capture",
      defaultInputSettings: {
        active: true,
        choices: ["primary", "secondary"],
        device_id: "wasapi_input_capture-default-device",
        empty_value: null,
        reconnect_delay_sec: 5,
        nested_policy: { omitted: true }
      }
    })
    await expect(getInputSettings(client, { inputName: "Mic/Aux" })).resolves.toEqual({
      inputKind: "wasapi_input_capture",
      inputSettings: {
        device_id: "mic-aux-device",
        muted_by_default: false,
        reconnect_delay_sec: 10,
        nested_policy: { omitted: true }
      }
    })
    await expect(getInputPropertiesListPropertyItems(client, {
      inputUuid: "input-mic-aux",
      propertyName: "device_id"
    })).resolves.toEqual({
      propertyName: "device_id",
      propertyItems: [
        { itemName: "Primary", itemValue: "primary-device", itemEnabled: true, metadata: { omitted: true } },
        { itemName: "Secondary", itemValue: 2, itemEnabled: false },
        { metadata: { omitted: true } }
      ]
    })
    expect(server.requests.filter((request) =>
      request.requestType === "GetInputDefaultSettings"
      || request.requestType === "GetInputSettings"
      || request.requestType === "GetInputPropertiesListPropertyItems"
    )).toEqual([
      { requestType: "GetInputDefaultSettings", requestData: { inputKind: "wasapi_input_capture" } },
      { requestType: "GetInputSettings", requestData: { inputName: "Mic/Aux" } },
      {
        requestType: "GetInputPropertiesListPropertyItems",
        requestData: { inputUuid: "input-mic-aux", propertyName: "device_id" }
      }
    ])
  })

  it("surfaces OBS failures for input settings reads", async () => {
    const server = await FakeObsServer.start({
      failRequests: { GetInputSettings: { code: 607, comment: "Input settings unavailable" } }
    })
    servers.push(server)
    const client = await createObsClient({ ...configFor(server.url), enabledToolsets: ["inputs"] })
    clients.push(client)
    await expect(getInputDefaultSettings(client, { inputKind: "" })).rejects.toThrow("Expected a non empty string")
    await expect(getInputPropertiesListPropertyItems(client, {
      inputName: "Mic/Aux",
      propertyName: ""
    })).rejects.toThrow("Expected a non empty string")
    await expect(getInputSettings(client, { inputName: "Mic/Aux" })).rejects.toMatchObject(
      {
        requestType: "GetInputSettings",
        code: 607,
        comment: "Input settings unavailable"
      } satisfies Partial<ObsRequestError>
    )
  })

  it("passes raw input settings and presses property buttons over the OBS protocol", async () => {
    const server = await FakeObsServer.start()
    servers.push(server)
    const client = await createObsClient({ ...configFor(server.url), enabledToolsets: ["inputs"] })
    clients.push(client)
    await expect(setInputSettings(client, {
      inputName: "Media Source",
      inputSettings: {
        url: "https://example.invalid/browser",
        css: "body { background: transparent; }",
        device_id: "mic-device",
        looping: true,
        restart_on_activate: false,
        reconnect_delay_sec: 10,
        nested_policy: { plugin_specific: true }
      },
      overlay: false
    })).resolves.toEqual({
      inputSettings: {
        url: "https://example.invalid/browser",
        css: "body { background: transparent; }",
        device_id: "mic-device",
        looping: true,
        restart_on_activate: false,
        reconnect_delay_sec: 10,
        nested_policy: { plugin_specific: true }
      },
      overlay: false,
      acknowledged: true
    })
    await expect(pressInputPropertiesButton(client, {
      inputUuid: "input-mic-aux",
      propertyName: "refreshnocache"
    })).resolves.toEqual({
      propertyName: "refreshnocache",
      acknowledged: true
    })
    await expect(setInputSettings(client, {
      inputUuid: "input-mic-aux",
      inputSettings: { looping: false }
    })).resolves.toEqual({
      inputSettings: { looping: false },
      overlay: true,
      acknowledged: true
    })
    expect(server.requests.filter((request) =>
      request.requestType === "SetInputSettings"
      || request.requestType === "PressInputPropertiesButton"
    )).toEqual([
      {
        requestType: "SetInputSettings",
        requestData: {
          inputName: "Media Source",
          inputSettings: {
            url: "https://example.invalid/browser",
            css: "body { background: transparent; }",
            device_id: "mic-device",
            looping: true,
            restart_on_activate: false,
            reconnect_delay_sec: 10,
            nested_policy: { plugin_specific: true }
          },
          overlay: false
        }
      },
      {
        requestType: "PressInputPropertiesButton",
        requestData: { inputUuid: "input-mic-aux", propertyName: "refreshnocache" }
      },
      {
        requestType: "SetInputSettings",
        requestData: {
          inputUuid: "input-mic-aux",
          inputSettings: { looping: false },
          overlay: true
        }
      }
    ])
  })

  it("validates loose raw input and create-input locators before OBS requests", async () => {
    const server = await FakeObsServer.start()
    servers.push(server)
    const client = await createObsClient({ ...configFor(server.url), enabledToolsets: ["inputs"] })
    clients.push(client)

    await expect(setInputSettings(client, {
      inputSettings: { looping: true }
    })).rejects.toMatchObject(
      {
        kind: "ObsValidationError",
        message: "Exactly one of inputName or inputUuid is required"
      } satisfies Partial<ObsValidationError>
    )
    await expect(setInputSettings(client, {
      inputName: "Media Source",
      inputUuid: "input-media-source",
      inputSettings: { looping: true }
    })).rejects.toMatchObject(
      {
        kind: "ObsValidationError",
        message: "Exactly one of inputName or inputUuid is required"
      } satisfies Partial<ObsValidationError>
    )
    await expect(createInput(client, {
      inputName: "Media Source",
      inputKind: "ffmpeg_source"
    })).rejects.toMatchObject(
      {
        kind: "ObsValidationError",
        message: "Exactly one of sceneName or sceneUuid is required"
      } satisfies Partial<ObsValidationError>
    )
    await expect(createInput(client, {
      sceneName: "Main",
      sceneUuid: "scene-main",
      inputName: "Media Source",
      inputKind: "ffmpeg_source"
    })).rejects.toMatchObject(
      {
        kind: "ObsValidationError",
        message: "Exactly one of sceneName or sceneUuid is required"
      } satisfies Partial<ObsValidationError>
    )
    expect(
      server.requests.filter((request) =>
        request.requestType === "SetInputSettings" || request.requestType === "CreateInput"
      )
    ).toEqual([])
  })

  it("surfaces OBS failures for raw input settings mutations", async () => {
    const server = await FakeObsServer.start({
      failRequests: {
        SetInputSettings: { code: 608, comment: "Settings rejected" },
        PressInputPropertiesButton: { code: 609, comment: "Button unavailable" }
      }
    })
    servers.push(server)
    const client = await createObsClient({ ...configFor(server.url), enabledToolsets: ["inputs"] })
    clients.push(client)
    await expect(pressInputPropertiesButton(client, {
      inputName: "Browser",
      propertyName: ""
    })).rejects.toThrow("Expected a non empty string")
    await expect(setInputSettings(client, {
      inputName: "Media Source",
      inputSettings: { url: "https://example.invalid", looping: true }
    })).rejects.toMatchObject(
      {
        requestType: "SetInputSettings",
        code: 608,
        comment: "Settings rejected"
      } satisfies Partial<ObsRequestError>
    )
    await expect(pressInputPropertiesButton(client, {
      inputName: "Browser",
      propertyName: "refreshnocache"
    })).rejects.toMatchObject(
      {
        requestType: "PressInputPropertiesButton",
        code: 609,
        comment: "Button unavailable"
      } satisfies Partial<ObsRequestError>
    )
  })

  it("creates, renames, and removes inputs through the fake OBS protocol", async () => {
    const server = await FakeObsServer.start()
    servers.push(server)
    const client = await createObsClient(configFor(server.url))
    clients.push(client)
    await expect(createInput(client, {
      sceneName: "Main",
      inputName: "Media Source",
      inputKind: "ffmpeg_source",
      inputSettings: { looping: true, reconnect_delay_sec: 10 },
      sceneItemEnabled: false
    })).resolves.toEqual({ inputUuid: "input-media-source", sceneItemId: 1002 })
    await expect(listInputs(client, { inputKind: "ffmpeg_source" })).resolves.toEqual({
      inputs: [{
        inputName: "Media Source",
        inputUuid: "input-media-source",
        inputKind: "ffmpeg_source",
        unversionedInputKind: "ffmpeg_source"
      }]
    })
    await expect(setInputName(client, {
      inputUuid: "input-media-source",
      newInputName: "Renamed Media"
    })).resolves.toEqual({ inputName: "Renamed Media", acknowledged: true })
    await expect(listInputs(client, { inputKind: "ffmpeg_source" })).resolves.toEqual({
      inputs: [{
        inputName: "Renamed Media",
        inputUuid: "input-media-source",
        inputKind: "ffmpeg_source",
        unversionedInputKind: "ffmpeg_source"
      }]
    })
    await expect(removeInput(client, { inputName: "Renamed Media" })).resolves.toEqual({ acknowledged: true })
    await expect(listInputs(client, { inputKind: "ffmpeg_source" })).resolves.toEqual({ inputs: [] })
    expect(server.requests.filter((request) =>
      request.requestType === "CreateInput"
      || request.requestType === "SetInputName"
      || request.requestType === "RemoveInput"
    )).toEqual([
      {
        requestType: "CreateInput",
        requestData: {
          sceneName: "Main",
          inputName: "Media Source",
          inputKind: "ffmpeg_source",
          inputSettings: { looping: true, reconnect_delay_sec: 10 },
          sceneItemEnabled: false
        }
      },
      {
        requestType: "SetInputName",
        requestData: { inputUuid: "input-media-source", newInputName: "Renamed Media" }
      },
      {
        requestType: "RemoveInput",
        requestData: { inputName: "Renamed Media" }
      }
    ])
  })

  it("surfaces OBS failures for input lifecycle controls", async () => {
    const server = await FakeObsServer.start({
      failRequests: {
        CreateInput: { code: 610, comment: "Input create rejected" },
        RemoveInput: { code: 611, comment: "Input remove rejected" },
        SetInputName: { code: 612, comment: "Input rename rejected" }
      }
    })
    servers.push(server)
    const client = await createObsClient({ ...configFor(server.url), enabledToolsets: ["inputs"] })
    clients.push(client)
    const setInputNameUnchecked = setInputName as (client: ObsClient, input: unknown) => ReturnType<typeof setInputName>
    await expect(setInputNameUnchecked(client, {
      inputName: "Media Source",
      newInputName: ""
    })).rejects.toThrow("Expected a non empty string")
    await expect(createInput(client, {
      sceneUuid: "scene-main",
      inputName: "Media Source",
      inputKind: "ffmpeg_source"
    })).rejects.toMatchObject(
      {
        requestType: "CreateInput",
        code: 610,
        comment: "Input create rejected"
      } satisfies Partial<ObsRequestError>
    )
    await expect(removeInput(client, { inputName: "Media Source" })).rejects.toMatchObject(
      {
        requestType: "RemoveInput",
        code: 611,
        comment: "Input remove rejected"
      } satisfies Partial<ObsRequestError>
    )
    await expect(setInputName(client, {
      inputName: "Media Source",
      newInputName: "Renamed Media"
    })).rejects.toMatchObject(
      {
        requestType: "SetInputName",
        code: 612,
        comment: "Input rename rejected"
      } satisfies Partial<ObsRequestError>
    )
  })

  it("surfaces OBS failures for input audio sync offset controls", async () => {
    const server = await FakeObsServer.start({
      failRequests: { SetInputAudioSyncOffset: { code: 603, comment: "Sync offset rejected" } }
    })
    servers.push(server)
    const client = await createObsClient({ ...configFor(server.url), enabledToolsets: ["inputs"] })
    clients.push(client)
    await expect(setInputAudioSyncOffset(client, { inputName: "Mic/Aux", inputAudioSyncOffset: 1.5 }))
      .rejects.toThrow("Expected an integer")
    await expect(setInputAudioSyncOffset(client, { inputName: "Mic/Aux", inputAudioSyncOffset: 20000 }))
      .rejects.toMatchObject(
        {
          requestType: "SetInputAudioSyncOffset",
          code: 603,
          comment: "Sync offset rejected"
        } satisfies Partial<ObsRequestError>
      )
  })

  it("gets nullable and playing media input status over the OBS protocol", async () => {
    const server = await FakeObsServer.start({
      inputs: [
        {
          inputName: "Media Source",
          inputUuid: "input-media-source",
          inputKind: "ffmpeg_source",
          unversionedInputKind: "ffmpeg_source",
          mediaState: "OBS_MEDIA_STATE_PLAYING",
          mediaDuration: 120000,
          mediaCursor: 4500
        },
        {
          inputName: "Stopped Media",
          inputUuid: "input-stopped-media",
          inputKind: "vlc_source",
          unversionedInputKind: "vlc_source"
        }
      ]
    })
    servers.push(server)
    const client = await createObsClient({ ...configFor(server.url), enabledToolsets: ["inputs"] })
    clients.push(client)
    await expect(getMediaInputStatus(client, { inputName: "Media Source" })).resolves.toEqual({
      mediaState: "OBS_MEDIA_STATE_PLAYING",
      mediaDuration: 120000,
      mediaCursor: 4500
    })
    await expect(getMediaInputStatus(client, { inputUuid: "input-stopped-media" })).resolves.toEqual({
      mediaState: "OBS_MEDIA_STATE_STOPPED",
      mediaDuration: null,
      mediaCursor: null
    })
    expect(server.requests.filter((request) => request.requestType === "GetMediaInputStatus")).toEqual([
      { requestType: "GetMediaInputStatus", requestData: { inputName: "Media Source" } },
      { requestType: "GetMediaInputStatus", requestData: { inputUuid: "input-stopped-media" } }
    ])
  })

  it("surfaces OBS failures for media input status", async () => {
    const server = await FakeObsServer.start({
      failRequests: { GetMediaInputStatus: { code: 604, comment: "Media input unavailable" } }
    })
    servers.push(server)
    const client = await createObsClient({ ...configFor(server.url), enabledToolsets: ["inputs"] })
    clients.push(client)
    await expect(getMediaInputStatus(client, { inputName: "Missing Media" })).rejects.toMatchObject(
      {
        requestType: "GetMediaInputStatus",
        code: 604,
        comment: "Media input unavailable"
      } satisfies Partial<ObsRequestError>
    )
  })

  it("sets and offsets media input cursor over the OBS protocol", async () => {
    const server = await FakeObsServer.start({
      inputs: [{
        inputName: "Media Source",
        inputUuid: "input-media-source",
        inputKind: "ffmpeg_source",
        unversionedInputKind: "ffmpeg_source",
        mediaState: "OBS_MEDIA_STATE_PLAYING",
        mediaDuration: 10000,
        mediaCursor: 1000
      }]
    })
    servers.push(server)
    const client = await createObsClient({ ...configFor(server.url), enabledToolsets: ["inputs"] })
    clients.push(client)
    await expect(setMediaInputCursor(client, { inputName: "Media Source", mediaCursor: 2500 })).resolves.toEqual({
      mediaCursor: 2500,
      acknowledged: true
    })
    await expect(getMediaInputStatus(client, { inputUuid: "input-media-source" })).resolves.toMatchObject({
      mediaCursor: 2500
    })
    await expect(offsetMediaInputCursor(client, {
      inputUuid: "input-media-source",
      mediaCursorOffset: -3000
    })).resolves.toEqual({
      mediaCursorOffset: -3000,
      acknowledged: true
    })
    await expect(getMediaInputStatus(client, { inputName: "Media Source" })).resolves.toMatchObject({
      mediaCursor: -500
    })
    expect(server.requests.filter((request) => request.requestType.includes("MediaInputCursor"))).toEqual([
      { requestType: "SetMediaInputCursor", requestData: { inputName: "Media Source", mediaCursor: 2500 } },
      {
        requestType: "OffsetMediaInputCursor",
        requestData: { inputUuid: "input-media-source", mediaCursorOffset: -3000 }
      }
    ])
  })

  it("validates media cursor shapes before sending OBS requests", async () => {
    const server = await FakeObsServer.start()
    servers.push(server)
    const client = await createObsClient({ ...configFor(server.url), enabledToolsets: ["inputs"] })
    clients.push(client)
    await expect(setMediaInputCursor(client, { inputName: "Media Source", mediaCursor: -1 }))
      .rejects.toThrow("Expected a non-negative number")
    await expect(offsetMediaInputCursor(client, { inputName: "Media Source", mediaCursorOffset: -1 }))
      .resolves.toEqual({ mediaCursorOffset: -1, acknowledged: true })
  })

  it("triggers media input actions over the OBS protocol", async () => {
    const server = await FakeObsServer.start({
      inputs: [{
        inputName: "Media Source",
        inputUuid: "input-media-source",
        inputKind: "ffmpeg_source",
        unversionedInputKind: "ffmpeg_source",
        mediaState: "OBS_MEDIA_STATE_PAUSED",
        mediaDuration: 10000,
        mediaCursor: 5000
      }]
    })
    servers.push(server)
    const client = await createObsClient({ ...configFor(server.url), enabledToolsets: ["inputs"] })
    clients.push(client)
    await expect(triggerMediaInputAction(client, {
      inputName: "Media Source",
      mediaAction: "OBS_WEBSOCKET_MEDIA_INPUT_ACTION_PLAY"
    })).resolves.toEqual({
      mediaAction: "OBS_WEBSOCKET_MEDIA_INPUT_ACTION_PLAY",
      acknowledged: true
    })
    await expect(getMediaInputStatus(client, { inputUuid: "input-media-source" })).resolves.toMatchObject({
      mediaState: "OBS_MEDIA_STATE_PLAYING"
    })
    await expect(triggerMediaInputAction(client, {
      inputUuid: "input-media-source",
      mediaAction: "OBS_WEBSOCKET_MEDIA_INPUT_ACTION_RESTART"
    })).resolves.toEqual({
      mediaAction: "OBS_WEBSOCKET_MEDIA_INPUT_ACTION_RESTART",
      acknowledged: true
    })
    await expect(getMediaInputStatus(client, { inputName: "Media Source" })).resolves.toMatchObject({
      mediaState: "OBS_MEDIA_STATE_PLAYING",
      mediaCursor: 0
    })
    expect(server.requests.filter((request) => request.requestType === "TriggerMediaInputAction")).toEqual([
      {
        requestType: "TriggerMediaInputAction",
        requestData: { inputName: "Media Source", mediaAction: "OBS_WEBSOCKET_MEDIA_INPUT_ACTION_PLAY" }
      },
      {
        requestType: "TriggerMediaInputAction",
        requestData: { inputUuid: "input-media-source", mediaAction: "OBS_WEBSOCKET_MEDIA_INPUT_ACTION_RESTART" }
      }
    ])
  })

  it("surfaces OBS failures for media input actions", async () => {
    const server = await FakeObsServer.start({
      failRequests: { TriggerMediaInputAction: { code: 605, comment: "Media action unavailable" } }
    })
    servers.push(server)
    const client = await createObsClient({ ...configFor(server.url), enabledToolsets: ["inputs"] })
    clients.push(client)
    await expect(triggerMediaInputAction(client, {
      inputName: "Media Source",
      mediaAction: "OBS_WEBSOCKET_MEDIA_INPUT_ACTION_STOP"
    })).rejects.toMatchObject(
      {
        requestType: "TriggerMediaInputAction",
        code: 605,
        comment: "Media action unavailable"
      } satisfies Partial<ObsRequestError>
    )
  })

  it("reads source filter discovery and settings through the fake OBS protocol", async () => {
    const server = await FakeObsServer.start()
    servers.push(server)
    const client = await createObsClient({ ...configFor(server.url), enabledToolsets: ["filters"] })
    clients.push(client)
    await expect(listSourceFilterKinds(client)).resolves.toEqual({
      sourceFilterKinds: ["color_filter_v2", "gain_filter", "mask_filter_v2"]
    })
    await expect(listSourceFilters(client, { sourceName: "Camera", canvasUuid: "canvas-main" })).resolves.toEqual({
      filters: [
        {
          filterName: "Color Correction",
          filterEnabled: true,
          filterIndex: 0,
          filterKind: "color_filter_v2",
          filterSettings: [
            { settingName: "brightness", valueType: "number" },
            { settingName: "color_multiply", valueType: "number" },
            { settingName: "nested_policy", valueType: "object" },
            { settingName: "secret_path", valueType: "string" }
          ],
          rawSettingsDeferred: true
        },
        {
          filterName: "Gain",
          filterEnabled: false,
          filterIndex: 1,
          filterKind: "gain_filter",
          filterSettings: [
            { settingName: "db", valueType: "number" },
            { settingName: "enabled_by_default", valueType: "boolean" },
            { settingName: "labels", valueType: "array" }
          ],
          rawSettingsDeferred: true
        }
      ]
    })
    await expect(getSourceFilterDefaultSettings(client, { filterKind: "color_filter_v2" })).resolves.toEqual({
      filterKind: "color_filter_v2",
      defaultFilterSettings: [
        { settingName: "brightness", valueType: "number" },
        { settingName: "color_multiply", valueType: "number" },
        { settingName: "nested_policy", valueType: "object" }
      ],
      rawSettingsDeferred: true
    })
    await expect(getSourceFilter(client, {
      sourceUuid: "source-camera",
      filterName: "Color Correction"
    })).resolves.toEqual({
      filterName: "Color Correction",
      filterEnabled: true,
      filterIndex: 0,
      filterKind: "color_filter_v2",
      filterSettings: [
        { settingName: "brightness", valueType: "number" },
        { settingName: "color_multiply", valueType: "number" },
        { settingName: "nested_policy", valueType: "object" },
        { settingName: "secret_path", valueType: "string" }
      ],
      rawSettingsDeferred: true
    })
    expect(server.requests.filter((request) => request.requestType.includes("SourceFilter"))).toEqual([
      { requestType: "GetSourceFilterKindList" },
      { requestType: "GetSourceFilterList", requestData: { sourceName: "Camera", canvasUuid: "canvas-main" } },
      { requestType: "GetSourceFilterDefaultSettings", requestData: { filterKind: "color_filter_v2" } },
      {
        requestType: "GetSourceFilter",
        requestData: { sourceUuid: "source-camera", filterName: "Color Correction" }
      }
    ])
  })

  it("mutates source filter enabled state, index, and name through fake OBS state", async () => {
    const server = await FakeObsServer.start()
    servers.push(server)
    const client = await createObsClient({ ...configFor(server.url), enabledToolsets: ["filters"] })
    clients.push(client)
    await expect(setSourceFilterEnabled(client, {
      sourceName: "Camera",
      canvasUuid: "canvas-main",
      filterName: "Color Correction",
      filterEnabled: false
    })).resolves.toEqual({ filterName: "Color Correction", filterEnabled: false, acknowledged: true })
    await expect(setSourceFilterIndex(client, {
      sourceName: "Camera",
      filterName: "Color Correction",
      filterIndex: 1
    })).resolves.toEqual({ filterName: "Color Correction", filterIndex: 1, acknowledged: true })
    await expect(setSourceFilterName(client, {
      sourceUuid: "source-camera",
      filterName: "Color Correction",
      newFilterName: "Primary Color"
    })).resolves.toEqual({ filterName: "Primary Color", acknowledged: true })
    await expect(listSourceFilters(client, { sourceUuid: "source-camera" })).resolves.toMatchObject({
      filters: [
        { filterName: "Gain", filterIndex: 0 },
        { filterName: "Primary Color", filterEnabled: false, filterIndex: 1 }
      ]
    })
    await expect(getSourceFilter(client, {
      sourceName: "Camera",
      filterName: "Primary Color"
    })).resolves.toMatchObject({
      filterName: "Primary Color",
      filterEnabled: false,
      filterIndex: 1,
      filterKind: "color_filter_v2"
    })
    expect(server.requests.filter((request) =>
      request.requestType === "SetSourceFilterEnabled"
      || request.requestType === "SetSourceFilterIndex"
      || request.requestType === "SetSourceFilterName"
    )).toEqual([
      {
        requestType: "SetSourceFilterEnabled",
        requestData: {
          sourceName: "Camera",
          canvasUuid: "canvas-main",
          filterName: "Color Correction",
          filterEnabled: false
        }
      },
      {
        requestType: "SetSourceFilterIndex",
        requestData: { sourceName: "Camera", filterName: "Color Correction", filterIndex: 1 }
      },
      {
        requestType: "SetSourceFilterName",
        requestData: { sourceUuid: "source-camera", filterName: "Color Correction", newFilterName: "Primary Color" }
      }
    ])
  })

  it("creates, updates settings, and removes source filters through fake OBS state", async () => {
    const server = await FakeObsServer.start()
    servers.push(server)
    const client = await createObsClient({ ...configFor(server.url), enabledToolsets: ["filters"] })
    clients.push(client)
    await expect(createSourceFilter(client, {
      sourceName: "Camera",
      canvasUuid: "canvas-main",
      filterName: "Boost",
      filterKind: "gain_filter",
      filterSettings: { db: 6 }
    })).resolves.toEqual({ filterName: "Boost", filterKind: "gain_filter", acknowledged: true })
    await expect(createSourceFilter(client, {
      sourceUuid: "source-camera",
      filterName: "Limiter",
      filterKind: "gain_filter"
    })).resolves.toEqual({ filterName: "Limiter", filterKind: "gain_filter", acknowledged: true })
    await expect(listSourceFilters(client, { sourceName: "Camera" })).resolves.toMatchObject({
      filters: [
        { filterName: "Color Correction", filterIndex: 0 },
        { filterName: "Gain", filterIndex: 1 },
        {
          filterName: "Boost",
          filterIndex: 2,
          filterKind: "gain_filter",
          filterSettings: [{ settingName: "db", valueType: "number" }]
        },
        {
          filterName: "Limiter",
          filterIndex: 3,
          filterKind: "gain_filter",
          filterSettings: []
        }
      ]
    })
    await expect(setSourceFilterSettings(client, {
      sourceName: "Camera",
      filterName: "Boost",
      filterSettings: { db: 3 },
      overlay: true
    })).resolves.toEqual({
      filterName: "Boost",
      filterSettings: { db: 3 },
      overlay: true,
      acknowledged: true
    })
    await expect(setSourceFilterSettings(client, {
      sourceUuid: "source-camera",
      filterName: "Limiter",
      filterSettings: { db: 2 }
    })).resolves.toEqual({
      filterName: "Limiter",
      filterSettings: { db: 2 },
      overlay: true,
      acknowledged: true
    })
    await expect(setSourceFilterSettings(client, {
      sourceName: "Camera",
      filterName: "Boost",
      filterSettings: { brightness: 0.2, hueShift: 45 },
      overlay: false
    })).resolves.toEqual({
      filterName: "Boost",
      filterSettings: { brightness: 0.2, hueShift: 45 },
      overlay: false,
      acknowledged: true
    })
    await expect(getSourceFilter(client, {
      sourceName: "Camera",
      filterName: "Boost"
    })).resolves.toMatchObject({
      filterName: "Boost",
      filterSettings: [
        { settingName: "brightness", valueType: "number" },
        { settingName: "hue_shift", valueType: "number" }
      ]
    })
    await expect(getSourceFilter(client, {
      sourceUuid: "source-camera",
      filterName: "Limiter"
    })).resolves.toMatchObject({
      filterName: "Limiter",
      filterSettings: [{ settingName: "db", valueType: "number" }]
    })
    await expect(removeSourceFilter(client, {
      sourceName: "Camera",
      filterName: "Boost"
    })).resolves.toEqual({ filterName: "Boost", acknowledged: true })
    await expect(removeSourceFilter(client, {
      sourceUuid: "source-camera",
      filterName: "Limiter"
    })).resolves.toEqual({ filterName: "Limiter", acknowledged: true })
    await expect(listSourceFilters(client, { sourceName: "Camera" })).resolves.toMatchObject({
      filters: [
        { filterName: "Color Correction", filterIndex: 0 },
        { filterName: "Gain", filterIndex: 1 }
      ]
    })
    expect(server.requests.filter((request) =>
      request.requestType === "CreateSourceFilter"
      || request.requestType === "SetSourceFilterSettings"
      || request.requestType === "RemoveSourceFilter"
    )).toEqual([
      {
        requestType: "CreateSourceFilter",
        requestData: {
          sourceName: "Camera",
          canvasUuid: "canvas-main",
          filterName: "Boost",
          filterKind: "gain_filter",
          filterSettings: { db: 6 }
        }
      },
      {
        requestType: "CreateSourceFilter",
        requestData: {
          sourceUuid: "source-camera",
          filterName: "Limiter",
          filterKind: "gain_filter"
        }
      },
      {
        requestType: "SetSourceFilterSettings",
        requestData: { sourceName: "Camera", filterName: "Boost", filterSettings: { db: 3 }, overlay: true }
      },
      {
        requestType: "SetSourceFilterSettings",
        requestData: { sourceUuid: "source-camera", filterName: "Limiter", filterSettings: { db: 2 }, overlay: true }
      },
      {
        requestType: "SetSourceFilterSettings",
        requestData: {
          sourceName: "Camera",
          filterName: "Boost",
          filterSettings: { brightness: 0.2, hue_shift: 45 },
          overlay: false
        }
      },
      {
        requestType: "RemoveSourceFilter",
        requestData: { sourceName: "Camera", filterName: "Boost" }
      },
      {
        requestType: "RemoveSourceFilter",
        requestData: { sourceUuid: "source-camera", filterName: "Limiter" }
      }
    ])
  })

  it("surfaces OBS failures for source filter reads", async () => {
    const server = await FakeObsServer.start({
      failRequests: { GetSourceFilter: { code: 602, comment: "Filter not found" } }
    })
    servers.push(server)
    const client = await createObsClient({ ...configFor(server.url), enabledToolsets: ["filters"] })
    clients.push(client)
    const getSourceFilterUnchecked = getSourceFilter as (
      client: ObsClient,
      input: unknown
    ) => ReturnType<typeof getSourceFilter>
    await expect(getSourceFilterUnchecked(client, {
      sourceName: "Camera",
      filterName: ""
    })).rejects.toThrow("Expected a non empty string")
    await expect(getSourceFilter(client, {
      sourceName: "Camera",
      filterName: "Missing"
    })).rejects.toMatchObject(
      {
        requestType: "GetSourceFilter",
        code: 602,
        comment: "Filter not found"
      } satisfies Partial<ObsRequestError>
    )
  })

  it("surfaces validation and OBS failures for source filter mutations", async () => {
    const server = await FakeObsServer.start({
      failRequests: {
        CreateSourceFilter: { code: 603, comment: "Filter create rejected" },
        RemoveSourceFilter: { code: 604, comment: "Filter remove rejected" },
        SetSourceFilterSettings: { code: 605, comment: "Filter settings rejected" },
        SetSourceFilterEnabled: { code: 606, comment: "Filter enable rejected" },
        SetSourceFilterIndex: { code: 607, comment: "Filter index rejected" },
        SetSourceFilterName: { code: 608, comment: "Filter rename rejected" }
      }
    })
    servers.push(server)
    const client = await createObsClient({ ...configFor(server.url), enabledToolsets: ["filters"] })
    clients.push(client)
    const setSourceFilterIndexUnchecked = setSourceFilterIndex as (
      client: ObsClient,
      input: unknown
    ) => ReturnType<typeof setSourceFilterIndex>
    const setSourceFilterSettingsUnchecked = setSourceFilterSettings as (
      client: ObsClient,
      input: unknown
    ) => ReturnType<typeof setSourceFilterSettings>
    const setSourceFilterNameUnchecked = setSourceFilterName as (
      client: ObsClient,
      input: unknown
    ) => ReturnType<typeof setSourceFilterName>
    await expect(setSourceFilterIndexUnchecked(client, {
      sourceName: "Camera",
      filterName: "Color Correction",
      filterIndex: -1
    })).rejects.toThrow("Expected a non-negative number")
    await expect(setSourceFilterNameUnchecked(client, {
      sourceName: "Camera",
      filterName: "",
      newFilterName: "Primary Color"
    })).rejects.toThrow("Expected a non empty string")
    await expect(setSourceFilterSettingsUnchecked(client, {
      sourceName: "Camera",
      filterName: "Color Correction",
      filterSettings: {}
    })).rejects.toThrow("At least one allowlisted filter setting is required")
    await expect(setSourceFilterSettingsUnchecked(client, {
      sourceName: "Camera",
      filterName: "Color Correction",
      filterSettings: { path: "/tmp/private" }
    })).rejects.toThrow("At least one allowlisted filter setting is required")
    await expect(createSourceFilter(client, {
      sourceName: "Camera",
      filterName: "Boost",
      filterKind: "gain_filter",
      filterSettings: { db: 3 }
    })).rejects.toMatchObject(
      {
        requestType: "CreateSourceFilter",
        code: 603,
        comment: "Filter create rejected"
      } satisfies Partial<ObsRequestError>
    )
    await expect(removeSourceFilter(client, {
      sourceName: "Camera",
      filterName: "Boost"
    })).rejects.toMatchObject(
      {
        requestType: "RemoveSourceFilter",
        code: 604,
        comment: "Filter remove rejected"
      } satisfies Partial<ObsRequestError>
    )
    await expect(setSourceFilterSettings(client, {
      sourceName: "Camera",
      filterName: "Color Correction",
      filterSettings: { db: 3 }
    })).rejects.toMatchObject(
      {
        requestType: "SetSourceFilterSettings",
        code: 605,
        comment: "Filter settings rejected"
      } satisfies Partial<ObsRequestError>
    )
    await expect(setSourceFilterEnabled(client, {
      sourceName: "Camera",
      filterName: "Color Correction",
      filterEnabled: false
    })).rejects.toMatchObject(
      {
        requestType: "SetSourceFilterEnabled",
        code: 606,
        comment: "Filter enable rejected"
      } satisfies Partial<ObsRequestError>
    )
    await expect(setSourceFilterIndex(client, {
      sourceName: "Camera",
      filterName: "Color Correction",
      filterIndex: 1
    })).rejects.toMatchObject(
      {
        requestType: "SetSourceFilterIndex",
        code: 607,
        comment: "Filter index rejected"
      } satisfies Partial<ObsRequestError>
    )
    await expect(setSourceFilterName(client, {
      sourceName: "Camera",
      filterName: "Color Correction",
      newFilterName: "Primary Color"
    })).rejects.toMatchObject(
      {
        requestType: "SetSourceFilterName",
        code: 608,
        comment: "Filter rename rejected"
      } satisfies Partial<ObsRequestError>
    )
  })

  it("gets and saves source screenshots with bounded payload and path policy", async () => {
    const server = await FakeObsServer.start()
    servers.push(server)
    const client = await createObsClient({ ...configFor(server.url), enabledToolsets: ["screenshots"] })
    clients.push(client)
    const outputDirectory = await mkdtemp(path.join(os.tmpdir(), "obs-mcp-screenshots-"))
    try {
      await expect(getSourceScreenshot(client, {
        sourceName: "Camera",
        canvasUuid: "canvas-main",
        imageFormat: "png",
        imageWidth: 320,
        imageHeight: 180,
        imageCompressionQuality: 80
      })).resolves.toEqual({
        imageFormat: "png",
        mimeType: "image/png",
        imageBytes: 5,
        maxImageBytes: 1_500_000,
        base64Data: "aW1hZ2U="
      })
      await expect(saveSourceScreenshot(client, {
        sourceUuid: "source-camera",
        imageFormat: "png",
        fileName: "camera.png",
        imageWidth: 320,
        imageHeight: 180
      }, outputDirectory)).resolves.toEqual({
        imageFilePath: path.join(outputDirectory, "camera.png"),
        imageFormat: "png",
        saved: true
      })
      await expect(saveSourceScreenshot(client, {
        sourceUuid: "source-camera",
        imageFormat: "png",
        fileName: "camera.png"
      }, undefined)).rejects.toThrow("OBS_MCP_SCREENSHOT_OUTPUT_DIR")
      await expect(saveSourceScreenshot(client, {
        sourceUuid: "source-camera",
        imageFormat: "png",
        fileName: "../camera.png"
      }, outputDirectory)).rejects.toThrow(/fileName/)
    } finally {
      await rm(outputDirectory, { recursive: true, force: true })
    }
    expect(server.requests.filter((request) =>
      request.requestType === "GetSourceScreenshot"
      || request.requestType === "SaveSourceScreenshot"
    )).toEqual([
      {
        requestType: "GetSourceScreenshot",
        requestData: {
          sourceName: "Camera",
          canvasUuid: "canvas-main",
          imageFormat: "png",
          imageWidth: 320,
          imageHeight: 180,
          imageCompressionQuality: 80
        }
      },
      {
        requestType: "SaveSourceScreenshot",
        requestData: {
          sourceUuid: "source-camera",
          imageFormat: "png",
          imageWidth: 320,
          imageHeight: 180,
          imageFilePath: path.join(outputDirectory, "camera.png")
        }
      }
    ])
  })

  it("validates screenshot image options and OBS screenshot MIME metadata", async () => {
    const server = await FakeObsServer.start({
      failRequests: { GetSourceScreenshot: { code: 613, comment: "Screenshot rejected" } }
    })
    servers.push(server)
    const client = await createObsClient({ ...configFor(server.url), enabledToolsets: ["screenshots"] })
    clients.push(client)
    const getSourceScreenshotUnchecked = getSourceScreenshot as (
      client: ObsClient,
      input: unknown
    ) => ReturnType<typeof getSourceScreenshot>
    await expect(getSourceScreenshotUnchecked(client, {
      sourceName: "Camera",
      imageFormat: "gif"
    })).rejects.toThrow(/imageFormat/)
    await expect(getSourceScreenshotUnchecked(client, {
      sourceName: "Camera",
      imageFormat: "png",
      imageWidth: 7
    })).rejects.toThrow(/imageWidth/)
    await expect(getSourceScreenshot(client, {
      sourceName: "Camera",
      imageFormat: "png"
    })).rejects.toMatchObject(
      {
        requestType: "GetSourceScreenshot",
        code: 613,
        comment: "Screenshot rejected"
      } satisfies Partial<ObsRequestError>
    )
  })

  it("enforces screenshot payload and output directory policies", async () => {
    await expect(getSourceScreenshot(
      fakeClient(async () => ({
        imageData: "aW1hZ2U="
      })),
      {
        sourceName: "Camera",
        imageFormat: "jpg"
      }
    )).resolves.toEqual({
      imageFormat: "jpg",
      mimeType: "image/jpeg",
      imageBytes: 5,
      maxImageBytes: 1_500_000,
      base64Data: "aW1hZ2U="
    })
    await expect(getSourceScreenshot(
      fakeClient(async () => ({
        imageData: "aW1hZ2U="
      })),
      {
        sourceName: "Camera",
        imageFormat: "webp"
      }
    )).resolves.toMatchObject({ mimeType: "image/webp" })
    await expect(getSourceScreenshot(
      fakeClient(async () => ({
        imageData: "aW1hZ2U="
      })),
      {
        sourceName: "Camera",
        imageFormat: "bmp"
      }
    )).resolves.toMatchObject({ mimeType: "image/bmp" })
    await expect(getSourceScreenshot(
      fakeClient(async () => ({
        imageData: "data:image/jpeg;base64,aW1hZ2U="
      })),
      {
        sourceName: "Camera",
        imageFormat: "png"
      }
    )).rejects.toThrow("OBS screenshot MIME image/jpeg does not match requested image/png")
    await expect(getSourceScreenshot(
      fakeClient(async () => ({
        imageData: Buffer.alloc(1_500_001).toString("base64")
      })),
      {
        sourceName: "Camera",
        imageFormat: "png"
      }
    )).rejects.toThrow("OBS screenshot exceeds 1500000 byte limit")

    const outputDirectory = await mkdtemp(path.join(os.tmpdir(), "obs-mcp-screenshot-policy-"))
    const outputFile = path.join(outputDirectory, "not-a-directory")
    const saveRequests: Array<unknown> = []
    try {
      await expect(saveSourceScreenshot(
        fakeClient(async (_requestType, requestData) => {
          saveRequests.push(requestData)
          return {}
        }),
        {
          sourceName: "Camera",
          canvasUuid: "canvas-main",
          imageFormat: "png",
          imageCompressionQuality: 90,
          fileName: "camera.png"
        },
        outputDirectory
      )).resolves.toEqual({
        imageFilePath: path.join(outputDirectory, "camera.png"),
        imageFormat: "png",
        saved: true
      })
      await writeFile(outputFile, "")
      await expect(saveSourceScreenshot(fakeClient(async () => ({})), {
        sourceName: "Camera",
        imageFormat: "png",
        fileName: "camera.png"
      }, outputFile)).rejects.toThrow("OBS_MCP_SCREENSHOT_OUTPUT_DIR must point to an existing directory")
    } finally {
      await rm(outputDirectory, { recursive: true, force: true })
    }
    expect(saveRequests).toEqual([{
      sourceName: "Camera",
      canvasUuid: "canvas-main",
      imageFormat: "png",
      imageCompressionQuality: 90,
      imageFilePath: path.join(outputDirectory, "camera.png")
    }])
  })

  it("lists outputs and gets generic output status over the OBS protocol", async () => {
    const server = await FakeObsServer.start()
    servers.push(server)
    const client = await createObsClient(configFor(server.url))
    clients.push(client)
    await expect(listOutputs(client)).resolves.toEqual({
      outputs: [
        { outputName: "adv_stream", outputKind: "rtmp_output", outputActive: false },
        { outputName: "adv_file_output", outputKind: "ffmpeg_muxer", outputActive: false },
        { outputName: "virtualcam_output", outputKind: "virtualcam_output", outputActive: false },
        { outputName: "replay_buffer", outputKind: "replay_buffer", outputActive: false }
      ]
    })
    await expect(startStream(client)).resolves.toEqual({ outputActive: true })
    await expect(getOutputStatus(client, { outputName: "adv_stream" })).resolves.toMatchObject({
      outputName: "adv_stream",
      outputActive: true,
      outputReconnecting: false,
      outputDuration: 12345,
      outputCongestion: 0,
      outputBytes: 4096,
      outputSkippedFrames: 0,
      outputTotalFrames: 740
    })
    await expect(getOutputStatus(client, { outputName: "missing_output" })).rejects.toMatchObject({
      requestType: "GetOutputStatus",
      code: 600,
      comment: "Output not found"
    })
  })

  it("gets and sets generic output settings over the OBS protocol", async () => {
    const server = await FakeObsServer.start()
    servers.push(server)
    const client = await createObsClient(configFor(server.url))
    clients.push(client)
    await expect(getOutputSettings(client, { outputName: "adv_file_output" })).resolves.toEqual({
      outputName: "adv_file_output",
      outputSettings: {
        path: "/opaque/recordings",
        format_name: "mkv",
        video_encoder: "obs_x264",
        audio_encoder: "ffmpeg_aac",
        muxer_settings: "",
        replay_buffer: true,
        max_time_sec: 0,
        max_size_mb: 0
      }
    })
    await expect(setOutputSettings(client, {
      outputName: "adv_file_output",
      outputSettings: { max_time_sec: 60, replay_buffer: false }
    })).resolves.toEqual({
      outputName: "adv_file_output",
      outputSettings: { max_time_sec: 60, replay_buffer: false },
      updated: true
    })
    await expect(getOutputSettings(client, { outputName: "adv_file_output" })).resolves.toMatchObject({
      outputSettings: { replay_buffer: false, max_time_sec: 60 }
    })
    await expect(getOutputSettings(client, { outputName: "missing_output" })).rejects.toMatchObject({
      requestType: "GetOutputSettings",
      code: 600,
      comment: "Output not found"
    })
  })

  it("controls generic outputs over the OBS protocol", async () => {
    const server = await FakeObsServer.start()
    servers.push(server)
    const client = await createObsClient(configFor(server.url))
    clients.push(client)
    await expect(startOutput(client, { outputName: "adv_stream" }))
      .resolves.toEqual({ outputName: "adv_stream", outputActive: true, updated: true })
    await expect(startOutput(client, { outputName: "adv_stream" })).rejects.toMatchObject({
      requestType: "StartOutput",
      code: 500,
      comment: "Output already active"
    })
    await expect(toggleOutput(client, { outputName: "adv_stream" }))
      .resolves.toEqual({ outputName: "adv_stream", outputActive: false, updated: true })
    await expect(stopOutput(client, { outputName: "adv_stream" })).rejects.toMatchObject({
      requestType: "StopOutput",
      code: 500,
      comment: "Output not active"
    })
    await expect(startOutput(client, { outputName: "missing_output" })).rejects.toMatchObject({
      requestType: "StartOutput",
      code: 600,
      comment: "Output not found"
    })
  })

  it("controls the virtual camera over the OBS protocol", async () => {
    const server = await FakeObsServer.start()
    servers.push(server)
    const client = await createObsClient(configFor(server.url))
    clients.push(client)
    await expect(getVirtualCamStatus(client)).resolves.toEqual({ outputActive: false })
    await expect(startVirtualCam(client)).resolves.toEqual({ outputActive: true, switched: true })
    await expect(getVirtualCamStatus(client)).resolves.toEqual({ outputActive: true })
    await expect(toggleVirtualCam(client)).resolves.toEqual({ outputActive: false, switched: true })
    await expect(stopVirtualCam(client)).resolves.toEqual({ outputActive: false, switched: true })
  })

  it("controls the replay buffer over the OBS protocol", async () => {
    const server = await FakeObsServer.start()
    servers.push(server)
    const client = await createObsClient({ ...configFor(server.url), enabledToolsets: ["outputs"] })
    clients.push(client)
    await expect(getReplayBufferStatus(client)).resolves.toEqual({ outputActive: false })
    await expect(startReplayBuffer(client)).resolves.toEqual({ outputActive: true })
    await expect(getReplayBufferStatus(client)).resolves.toEqual({ outputActive: true })
    await expect(toggleReplayBuffer(client)).resolves.toEqual({ outputActive: false })
    await expect(stopReplayBuffer(client)).resolves.toEqual({ outputActive: false })
    await expect(saveReplayBuffer(client)).resolves.toEqual({
      requestType: "SaveReplayBuffer",
      acknowledged: true
    })
    await expect(getLastReplayBufferReplay(client)).resolves.toEqual({
      savedReplayPath: "/opaque/replay-buffer.mp4"
    })
  })

  it("rejects current scene responses without a scene name", async () => {
    await expect(getCurrentScene(fakeClient(async () => ({})))).rejects.toThrow("current program scene name")
  })

  it("uses deprecated current program scene fields as fallbacks", async () => {
    await expect(getCurrentScene(fakeClient(async () => ({
      currentProgramSceneName: "Fallback",
      currentProgramSceneUuid: "fallback-uuid"
    })))).resolves.toEqual({ sceneName: "Fallback", sceneUuid: "fallback-uuid" })
  })

  it("uses deprecated current preview scene fields as fallbacks", async () => {
    await expect(getCurrentPreviewScene(fakeClient(async () => ({
      currentPreviewSceneName: "Fallback",
      currentPreviewSceneUuid: "fallback-uuid"
    })))).resolves.toEqual({ sceneName: "Fallback", sceneUuid: "fallback-uuid" })
  })

  it("rejects current preview scene responses without a scene name", async () => {
    await expect(getCurrentPreviewScene(fakeClient(async () => ({})))).rejects.toThrow("current preview scene name")
  })

  it("pauses, resumes, and toggles record pause through fake OBS", async () => {
    const server = await FakeObsServer.start()
    servers.push(server)
    const client = await createObsClient({ ...configFor(server.url), enabledToolsets: ["record"] })
    clients.push(client)
    await expect(pauseRecord(client)).resolves.toEqual({
      requestedAction: "pause",
      requestType: "PauseRecord",
      acknowledged: true
    })
    await expect(resumeRecord(client)).resolves.toEqual({
      requestedAction: "resume",
      requestType: "ResumeRecord",
      acknowledged: true
    })
    await expect(toggleRecordPause(client)).resolves.toEqual({
      requestedAction: "toggle_pause",
      requestType: "ToggleRecordPause",
      acknowledged: true
    })
  })

  it("starts, stops, and toggles record lifecycle through fake OBS", async () => {
    const server = await FakeObsServer.start()
    servers.push(server)
    const client = await createObsClient({ ...configFor(server.url), enabledToolsets: ["record"] })
    clients.push(client)
    await expect(startRecord(client)).resolves.toEqual({
      requestType: "StartRecord",
      acknowledged: true
    })
    await expect(getRecordStatus(client)).resolves.toMatchObject({ outputActive: true })
    await expect(toggleRecord(client)).resolves.toEqual({ outputActive: false })
    await expect(stopRecord(client)).resolves.toEqual({
      requestType: "StopRecord",
      acknowledged: true,
      outputPath: "/opaque/obs-recording.mkv"
    })
  })

  it("splits record files and creates record chapters through fake OBS", async () => {
    const server = await FakeObsServer.start()
    servers.push(server)
    const client = await createObsClient({ ...configFor(server.url), enabledToolsets: ["record"] })
    clients.push(client)
    await expect(splitRecordFile(client)).resolves.toEqual({
      requestType: "SplitRecordFile",
      acknowledged: true
    })
    await expect(createRecordChapter(client, {})).resolves.toEqual({
      requestType: "CreateRecordChapter",
      acknowledged: true
    })
    await expect(createRecordChapter(client, { chapterName: "Act 1" })).resolves.toEqual({
      requestType: "CreateRecordChapter",
      acknowledged: true
    })
    expect(server.requests.filter((request) => request.requestType === "CreateRecordChapter")).toEqual([
      { requestType: "CreateRecordChapter", requestData: {} },
      { requestType: "CreateRecordChapter", requestData: { chapterName: "Act 1" } }
    ])
  })

  it("surfaces OBS failures for record pause controls", async () => {
    const server = await FakeObsServer.start({
      failRequests: { PauseRecord: { code: 500, comment: "Record output is not active" } }
    })
    servers.push(server)
    const client = await createObsClient({ ...configFor(server.url), enabledToolsets: ["record"] })
    clients.push(client)
    await expect(pauseRecord(client)).rejects.toThrow("PauseRecord failed")
  })

  it("surfaces OBS failures for record lifecycle controls with metadata", async () => {
    const server = await FakeObsServer.start({
      failRequests: { StartRecord: { code: 207, comment: "Output already active" } }
    })
    servers.push(server)
    const client = await createObsClient({ ...configFor(server.url), enabledToolsets: ["record"] })
    clients.push(client)
    await expect(startRecord(client)).rejects.toMatchObject(
      {
        requestType: "StartRecord",
        code: 207,
        comment: "Output already active"
      } satisfies Partial<ObsRequestError>
    )
  })

  it("surfaces OBS failures for record file and chapter controls with metadata", async () => {
    const splitServer = await FakeObsServer.start({
      failRequests: { SplitRecordFile: { code: 703, comment: "Recording not active" } }
    })
    servers.push(splitServer)
    const splitClient = await createObsClient({ ...configFor(splitServer.url), enabledToolsets: ["record"] })
    clients.push(splitClient)
    await expect(splitRecordFile(splitClient)).rejects.toMatchObject(
      {
        requestType: "SplitRecordFile",
        code: 703,
        comment: "Recording not active"
      } satisfies Partial<ObsRequestError>
    )

    const chapterServer = await FakeObsServer.start({
      failRequests: { CreateRecordChapter: { code: 703, comment: "Chapter markers unavailable" } }
    })
    servers.push(chapterServer)
    const chapterClient = await createObsClient({ ...configFor(chapterServer.url), enabledToolsets: ["record"] })
    clients.push(chapterClient)
    await expect(createRecordChapter(chapterClient, { chapterName: "Act 1" })).rejects.toMatchObject(
      {
        requestType: "CreateRecordChapter",
        code: 703,
        comment: "Chapter markers unavailable"
      } satisfies Partial<ObsRequestError>
    )
  })

  it("filters record lifecycle tools when OBS does not advertise record capabilities", async () => {
    const server = await FakeObsServer.start({
      availableRequestsValue: ["GetVersion", "PauseRecord", "ResumeRecord", "ToggleRecordPause"]
    })
    servers.push(server)
    const client = await createObsClient({ ...configFor(server.url), enabledToolsets: ["record"] })
    clients.push(client)
    expect(getEnabledTools(["record"], client.availableRequests).map((tool) => tool.name)).toEqual([
      "pause_record",
      "resume_record",
      "toggle_record_pause"
    ])
  })

  it("filters record file and chapter tools when OBS does not advertise those capabilities", async () => {
    const server = await FakeObsServer.start({
      availableRequestsValue: ["GetVersion", "SplitRecordFile"]
    })
    servers.push(server)
    const client = await createObsClient({ ...configFor(server.url), enabledToolsets: ["record"] })
    clients.push(client)
    expect(getEnabledTools(["record"], client.availableRequests).map((tool) => tool.name)).toEqual([
      "split_record_file"
    ])
  })

  it("surfaces OBS replay buffer request failures", async () => {
    const lifecycleServer = await FakeObsServer.start({
      failRequests: { StartReplayBuffer: { code: 207, comment: "Output already active" } }
    })
    servers.push(lifecycleServer)
    const lifecycleClient = await createObsClient({ ...configFor(lifecycleServer.url), enabledToolsets: ["outputs"] })
    clients.push(lifecycleClient)
    await expect(startReplayBuffer(lifecycleClient)).rejects.toMatchObject(
      {
        requestType: "StartReplayBuffer",
        code: 207,
        comment: "Output already active"
      } satisfies Partial<ObsRequestError>
    )

    const saveServer = await FakeObsServer.start({
      failRequests: { SaveReplayBuffer: { code: 703, comment: "Replay buffer is not active" } }
    })
    servers.push(saveServer)
    const saveClient = await createObsClient({ ...configFor(saveServer.url), enabledToolsets: ["outputs"] })
    clients.push(saveClient)
    await expect(saveReplayBuffer(saveClient)).rejects.toMatchObject(
      {
        requestType: "SaveReplayBuffer",
        code: 703,
        comment: "Replay buffer is not active"
      } satisfies Partial<ObsRequestError>
    )

    const lastReplayServer = await FakeObsServer.start({
      failRequests: { GetLastReplayBufferReplay: { code: 703, comment: "No replay has been saved" } }
    })
    servers.push(lastReplayServer)
    const lastReplayClient = await createObsClient({
      ...configFor(lastReplayServer.url),
      enabledToolsets: ["outputs"]
    })
    clients.push(lastReplayClient)
    await expect(getLastReplayBufferReplay(lastReplayClient)).rejects.toMatchObject(
      {
        requestType: "GetLastReplayBufferReplay",
        code: 703,
        comment: "No replay has been saved"
      } satisfies Partial<ObsRequestError>
    )
  })

  it("filters replay buffer tools when OBS does not advertise replay buffer capabilities", async () => {
    const server = await FakeObsServer.start({
      availableRequestsValue: ["GetVersion", "GetReplayBufferStatus", "ToggleReplayBuffer", "SaveReplayBuffer"]
    })
    servers.push(server)
    const client = await createObsClient({ ...configFor(server.url), enabledToolsets: ["outputs"] })
    clients.push(client)
    expect(getEnabledTools(["outputs"], client.availableRequests).map((tool) => tool.name)).toEqual([
      "get_replay_buffer_status",
      "toggle_replay_buffer",
      "save_replay_buffer"
    ])
  })

  it("gets and controls stream lifecycle state", async () => {
    const server = await FakeObsServer.start()
    servers.push(server)
    const client = await createObsClient(configFor(server.url))
    clients.push(client)
    await expect(getStreamStatus(client)).resolves.toMatchObject({ outputActive: false, outputDuration: 0 })
    await expect(startStream(client)).resolves.toEqual({ outputActive: true })
    await expect(getStreamStatus(client)).resolves.toMatchObject({ outputActive: true, outputDuration: 12345 })
    await expect(toggleStream(client)).resolves.toEqual({ outputActive: false })
    await expect(stopStream(client)).resolves.toEqual({ outputActive: false })
  })

  it("sends stream captions through fake OBS", async () => {
    const server = await FakeObsServer.start()
    servers.push(server)
    const client = await createObsClient({ ...configFor(server.url), enabledToolsets: ["stream"] })
    clients.push(client)
    await expect(sendStreamCaption(client, { captionText: "Live caption" })).resolves.toEqual({
      requestType: "SendStreamCaption",
      acknowledged: true
    })
    expect(server.requests.filter((request) => request.requestType === "SendStreamCaption")).toEqual([
      { requestType: "SendStreamCaption", requestData: { captionText: "Live caption" } }
    ])
  })

  it("surfaces OBS stream lifecycle request failures", async () => {
    const server = await FakeObsServer.start({
      failRequests: { StartStream: { code: 207, comment: "Output already active" } }
    })
    servers.push(server)
    const client = await createObsClient(configFor(server.url))
    clients.push(client)
    await expect(startStream(client)).rejects.toMatchObject(
      {
        requestType: "StartStream",
        code: 207,
        comment: "Output already active"
      } satisfies Partial<ObsRequestError>
    )
  })

  it("surfaces OBS stream caption request failures", async () => {
    const server = await FakeObsServer.start({
      failRequests: { SendStreamCaption: { code: 703, comment: "Stream output is not active" } }
    })
    servers.push(server)
    const client = await createObsClient(configFor(server.url))
    clients.push(client)
    await expect(sendStreamCaption(client, { captionText: "Live caption" })).rejects.toMatchObject(
      {
        requestType: "SendStreamCaption",
        code: 703,
        comment: "Stream output is not active"
      } satisfies Partial<ObsRequestError>
    )
  })

  it("filters stream tools when OBS does not advertise stream capabilities", async () => {
    const server = await FakeObsServer.start({
      availableRequestsValue: ["GetVersion", "GetSceneList", "GetCurrentProgramScene", "SetCurrentProgramScene"]
    })
    servers.push(server)
    const client = await createObsClient(configFor(server.url))
    clients.push(client)
    expect(getEnabledTools(["stream"], client.availableRequests)).toEqual([])
  })

  it("filters stream caption tools when OBS does not advertise caption capability", async () => {
    const server = await FakeObsServer.start({
      availableRequestsValue: ["GetVersion", "SendStreamCaption"]
    })
    servers.push(server)
    const client = await createObsClient(configFor(server.url))
    clients.push(client)
    expect(getEnabledTools(["stream"], client.availableRequests).map((tool) => tool.name)).toEqual([
      "send_stream_caption"
    ])
  })
})
