/* eslint-disable max-lines -- resource registry is intentionally data-heavy. */

import type { ResourceLink } from "@modelcontextprotocol/sdk/types.js"

import { listCanvases } from "../../obs/operations/canvases.js"
import {
  getRecordDirectory,
  getStreamServiceSettings,
  getVideoSettings,
  listProfiles,
  listSceneCollections
} from "../../obs/operations/config.js"
import { getRecordStatus, getVersion, listHotkeys } from "../../obs/operations/general.js"
import {
  getInputAudioBalance,
  getInputAudioMonitorType,
  getInputAudioSyncOffset,
  getInputAudioTracks,
  getInputDeinterlaceFieldOrder,
  getInputDeinterlaceMode,
  getInputMute,
  getInputSettings,
  getInputVolume,
  listInputs
} from "../../obs/operations/inputs.js"
import { getOutputSettings, getOutputStatus, listOutputs } from "../../obs/operations/outputs.js"
import { getSceneTransitionOverride, listSceneItems, listScenes } from "../../obs/operations/scenes.js"
import { getStreamStatus } from "../../obs/operations/stream.js"
import {
  getCurrentSceneTransition,
  getCurrentSceneTransitionCursor,
  listSceneTransitions,
  listTransitionKinds
} from "../../obs/operations/transitions.js"
import {
  GetCanvasList,
  GetCurrentPreviewScene,
  GetCurrentProgramScene,
  GetCurrentSceneTransition,
  GetCurrentSceneTransitionCursor,
  GetHotkeyList,
  GetInputAudioBalance,
  GetInputAudioMonitorType,
  GetInputAudioSyncOffset,
  GetInputAudioTracks,
  GetInputDeinterlaceFieldOrder,
  GetInputDeinterlaceMode,
  GetInputList,
  GetInputMute,
  GetInputSettings,
  GetInputVolume,
  GetMediaInputStatus,
  GetOutputList,
  GetOutputSettings,
  GetOutputStatus,
  GetProfileList,
  GetRecordDirectory,
  GetRecordStatus,
  GetSceneCollectionList,
  GetSceneItemList,
  GetSceneList,
  GetSceneSceneTransitionOverride,
  GetSceneTransitionList,
  GetSourceFilterList,
  GetStats,
  GetStreamServiceSettings,
  GetStreamStatus,
  GetTransitionKindList,
  GetVersion,
  GetVideoSettings
} from "../../obs/requests.js"
import type { ResourceContext, ResourceDefinition, ResourceTemplateDefinition } from "./mechanics.js"
import { invalidResourceParams, resourceLink } from "./mechanics.js"

const MIME = "application/json" as const

const isAvailable = (context: ResourceContext, requestType: string): boolean =>
  context.client.availableRequests.includes(requestType)

/* v8 ignore start -- helper branches are covered through registry protocol tests. */
const maybeRequest = async <T>(
  context: ResourceContext,
  requestType: string,
  read: () => Promise<T>
): Promise<T | undefined> => {
  if (!isAvailable(context, requestType)) {
    return undefined
  }
  try {
    return await read()
  } catch {
    return undefined
  }
}

const withDefinedValues = (record: Readonly<Record<string, unknown>>): Readonly<Record<string, unknown>> =>
  Object.fromEntries(Object.entries(record).filter(([, value]) => value !== undefined))

const decodeTemplateValue = (uri: string, regex: RegExp, fieldName: string):
  | Readonly<Record<string, string>>
  | undefined =>
{
  const match = regex.exec(uri)
  if (match?.[1] === undefined) {
    return undefined
  }
  try {
    return { [fieldName]: decodeURIComponent(match[1]) }
  } catch {
    throw invalidResourceParams(`Invalid encoded ${fieldName} in resource URI`)
  }
}

const sceneNameFromUri = (uri: string): string =>
  decodeTemplateValue(uri, /^obs:\/\/scenes\/by-name\/([^/]+)$/u, "sceneName")?.["sceneName"] ?? ""

const inputNameFromUri = (uri: string): string =>
  decodeTemplateValue(uri, /^obs:\/\/inputs\/by-name\/([^/]+)$/u, "inputName")?.["inputName"] ?? ""

const outputNameFromUri = (uri: string): string =>
  decodeTemplateValue(uri, /^obs:\/\/outputs\/by-name\/([^/]+)$/u, "outputName")?.["outputName"] ?? ""

const sourceNameFromFiltersUri = (uri: string): string =>
  decodeTemplateValue(uri, /^obs:\/\/filters\/([^/]+)$/u, "sourceName")?.["sourceName"] ?? ""
/* v8 ignore stop */

const assertInputExists = async (context: ResourceContext, inputName: string): Promise<void> => {
  const inputs = await listInputs(context.client, {})
  if (!inputs.inputs.some((input) => input.inputName === inputName)) {
    throw invalidResourceParams(`OBS input does not exist: ${inputName}`)
  }
}

/* v8 ignore start -- declarative registry branches are dominated by optional OBS capability combinations. */
export const resourceDefinitions: ReadonlyArray<ResourceDefinition> = [
  {
    uri: "obs://state/current",
    name: "obs_state_current",
    title: "Current OBS State",
    description: "Aggregate read-only snapshot of OBS version, scenes, outputs, recording, and streaming state.",
    mimeType: MIME,
    requiredObsRequests: [],
    groups: ["state", "scenes", "record", "stream", "outputs", "transitions", "config", "canvases"],
    read: async (context) =>
      withDefinedValues({
        client: {
          negotiatedRpcVersion: context.client.negotiatedRpcVersion,
          availableRequests: context.client.availableRequests
        },
        version: await maybeRequest(context, GetVersion.requestType, () => getVersion(context.client)),
        stats: await maybeRequest(context, GetStats.requestType, () => context.client.request(GetStats)),
        currentProgramScene: await maybeRequest(context, GetCurrentProgramScene.requestType, () =>
          context.client.request(GetCurrentProgramScene)),
        currentPreviewScene: await maybeRequest(context, GetCurrentPreviewScene.requestType, () =>
          context.client.request(GetCurrentPreviewScene)),
        recording: await maybeRequest(context, GetRecordStatus.requestType, () =>
          getRecordStatus(context.client)),
        streaming: await maybeRequest(context, GetStreamStatus.requestType, () =>
          getStreamStatus(context.client)),
        currentTransition: await maybeRequest(context, GetCurrentSceneTransition.requestType, () =>
          getCurrentSceneTransition(context.client))
      })
  },
  {
    uri: "obs://scenes",
    name: "obs_scenes",
    title: "OBS Scenes",
    description: "Current program and preview scenes plus ordered scene summaries, including groups.",
    mimeType: MIME,
    requiredObsRequests: [GetSceneList.requestType],
    groups: ["scenes", "scene_items", "state"],
    read: async (context) => listScenes(context.client, { includeGroups: true })
  },
  {
    uri: "obs://inputs",
    name: "obs_inputs",
    title: "OBS Inputs",
    description: "Current OBS input/source summaries.",
    mimeType: MIME,
    requiredObsRequests: [GetInputList.requestType],
    groups: ["inputs", "state"],
    read: async (context) => listInputs(context.client, {})
  },
  {
    uri: "obs://recording",
    name: "obs_recording",
    title: "OBS Recording",
    description: "Current OBS recording status.",
    mimeType: MIME,
    requiredObsRequests: [GetRecordStatus.requestType],
    groups: ["record", "outputs", "state"],
    read: async (context) => getRecordStatus(context.client)
  },
  {
    uri: "obs://streaming",
    name: "obs_streaming",
    title: "OBS Streaming",
    description: "Current OBS stream output status.",
    mimeType: MIME,
    requiredObsRequests: [GetStreamStatus.requestType],
    groups: ["stream", "outputs", "state"],
    read: async (context) => getStreamStatus(context.client)
  },
  {
    uri: "obs://outputs",
    name: "obs_outputs",
    title: "OBS Outputs",
    description: "Current OBS output summaries.",
    mimeType: MIME,
    requiredObsRequests: [GetOutputList.requestType],
    groups: ["outputs", "record", "stream", "state"],
    read: async (context) => listOutputs(context.client)
  },
  {
    uri: "obs://config",
    name: "obs_config",
    title: "OBS Configuration",
    description: "Sanitized OBS video, record-directory, stream-service, profile, and scene-collection configuration.",
    mimeType: MIME,
    requiredObsRequests: [],
    groups: ["config", "profiles", "scene_collections", "state"],
    read: async (context) =>
      withDefinedValues({
        videoSettings: await maybeRequest(
          context,
          GetVideoSettings.requestType,
          () => getVideoSettings(context.client)
        ),
        recordDirectory: await maybeRequest(
          context,
          GetRecordDirectory.requestType,
          () => getRecordDirectory(context.client)
        ),
        streamServiceSettings: await maybeRequest(
          context,
          GetStreamServiceSettings.requestType,
          () => getStreamServiceSettings(context.client)
        ),
        profiles: await maybeRequest(context, GetProfileList.requestType, () => listProfiles(context.client)),
        sceneCollections: await maybeRequest(
          context,
          GetSceneCollectionList.requestType,
          () => listSceneCollections(context.client)
        )
      })
  },
  {
    uri: "obs://profiles",
    name: "obs_profiles",
    title: "OBS Profiles",
    description: "Current OBS profile and available profile names.",
    mimeType: MIME,
    requiredObsRequests: [GetProfileList.requestType],
    groups: ["profiles", "config", "state"],
    read: async (context) => listProfiles(context.client)
  },
  {
    uri: "obs://scene-collections",
    name: "obs_scene_collections",
    title: "OBS Scene Collections",
    description: "Current OBS scene collection and available scene collection names.",
    mimeType: MIME,
    requiredObsRequests: [GetSceneCollectionList.requestType],
    groups: ["scene_collections", "config", "state"],
    read: async (context) => listSceneCollections(context.client)
  },
  {
    uri: "obs://canvases",
    name: "obs_canvases",
    title: "OBS Canvases",
    description: "Current OBS canvas inventory when OBS exposes multi-canvas support.",
    mimeType: MIME,
    requiredObsRequests: [GetCanvasList.requestType],
    groups: ["canvases", "state"],
    read: async (context) => listCanvases(context.client)
  },
  {
    uri: "obs://transitions",
    name: "obs_transitions",
    title: "OBS Transitions",
    description: "Current transition state, transition inventory, kinds, and T-bar cursor when available.",
    mimeType: MIME,
    requiredObsRequests: [],
    groups: ["transitions", "scenes", "state"],
    read: async (context) =>
      withDefinedValues({
        transitions: await maybeRequest(context, GetSceneTransitionList.requestType, () =>
          listSceneTransitions(context.client)),
        current: await maybeRequest(context, GetCurrentSceneTransition.requestType, () =>
          getCurrentSceneTransition(context.client)),
        cursor: await maybeRequest(context, GetCurrentSceneTransitionCursor.requestType, () =>
          getCurrentSceneTransitionCursor(context.client)),
        kinds: await maybeRequest(context, GetTransitionKindList.requestType, () =>
          listTransitionKinds(context.client))
      })
  },
  {
    uri: "obs://hotkeys",
    name: "obs_hotkeys",
    title: "OBS Hotkeys",
    description: "Configured OBS hotkey names.",
    mimeType: MIME,
    requiredObsRequests: [GetHotkeyList.requestType],
    groups: ["hotkeys", "state"],
    read: async (context) => listHotkeys(context.client)
  },
  {
    uri: "obs://events/recent",
    name: "obs_events_recent",
    title: "Recent OBS Events",
    description: "Recent OBS event buffer snapshot retained by this server process.",
    mimeType: MIME,
    requiredObsRequests: [],
    groups: ["events", "state"],
    read: async (context) => context.client.getBufferedEvents()
  },
  {
    uri: "obs://screenshots/latest",
    name: "obs_screenshots_latest",
    title: "Latest OBS Screenshot",
    description: "Metadata and bounded inline data for the latest screenshot captured by this server process.",
    mimeType: MIME,
    requiredObsRequests: [],
    groups: ["screenshots", "state"],
    read: async (context) => ({ latest: context.screenshots.getLatest() ?? null })
  }
]

export const resourceTemplateDefinitions: ReadonlyArray<ResourceTemplateDefinition> = [
  {
    uriTemplate: "obs://scenes/by-name/{sceneName}",
    name: "obs_scene_by_name",
    title: "OBS Scene By Name",
    description: "Scene summary, items, and transition override for a URL-encoded OBS scene name.",
    mimeType: MIME,
    requiredObsRequests: [GetSceneList.requestType],
    groups: ["scenes", "scene_items", "transitions", "state"],
    match: (uri) => decodeTemplateValue(uri, /^obs:\/\/scenes\/by-name\/([^/]+)$/u, "sceneName"),
    read: async (context, uri) => {
      const sceneName = sceneNameFromUri(uri)
      const scenes = await listScenes(context.client, { includeGroups: true })
      const scene = scenes.scenes.find((entry) => entry.sceneName === sceneName)
      if (scene === undefined) {
        throw invalidResourceParams(`OBS scene does not exist: ${sceneName}`)
      }
      return withDefinedValues({
        scene,
        items: await maybeRequest(
          context,
          GetSceneItemList.requestType,
          () => listSceneItems(context.client, { sceneName })
        ),
        transitionOverride: await maybeRequest(
          context,
          GetSceneSceneTransitionOverride.requestType,
          () => getSceneTransitionOverride(context.client, { sceneName })
        )
      })
    }
  },
  {
    uriTemplate: "obs://inputs/by-name/{inputName}",
    name: "obs_input_by_name",
    title: "OBS Input By Name",
    description: "Input summary and optional status/settings/audio details for a URL-encoded OBS input name.",
    mimeType: MIME,
    requiredObsRequests: [GetInputList.requestType],
    groups: ["inputs", "state"],
    match: (uri) => decodeTemplateValue(uri, /^obs:\/\/inputs\/by-name\/([^/]+)$/u, "inputName"),
    read: async (context, uri) => {
      const inputName = inputNameFromUri(uri)
      const inputs = await listInputs(context.client, {})
      const input = inputs.inputs.find((entry) => entry.inputName === inputName)
      if (input === undefined) {
        throw invalidResourceParams(`OBS input does not exist: ${inputName}`)
      }
      return withDefinedValues({
        input,
        mute: await maybeRequest(context, GetInputMute.requestType, () => getInputMute(context.client, { inputName })),
        volume: await maybeRequest(
          context,
          GetInputVolume.requestType,
          () => getInputVolume(context.client, { inputName })
        ),
        audioBalance: await maybeRequest(
          context,
          GetInputAudioBalance.requestType,
          () => getInputAudioBalance(context.client, { inputName })
        ),
        audioMonitorType: await maybeRequest(
          context,
          GetInputAudioMonitorType.requestType,
          () => getInputAudioMonitorType(context.client, { inputName })
        ),
        audioSyncOffset: await maybeRequest(
          context,
          GetInputAudioSyncOffset.requestType,
          () => getInputAudioSyncOffset(context.client, { inputName })
        ),
        audioTracks: await maybeRequest(
          context,
          GetInputAudioTracks.requestType,
          () => getInputAudioTracks(context.client, { inputName })
        ),
        deinterlaceMode: await maybeRequest(
          context,
          GetInputDeinterlaceMode.requestType,
          () => getInputDeinterlaceMode(context.client, { inputName })
        ),
        deinterlaceFieldOrder: await maybeRequest(
          context,
          GetInputDeinterlaceFieldOrder.requestType,
          () => getInputDeinterlaceFieldOrder(context.client, { inputName })
        ),
        settings: await maybeRequest(
          context,
          GetInputSettings.requestType,
          () => getInputSettings(context.client, { inputName })
        )
      })
    }
  },
  {
    uriTemplate: "obs://outputs/by-name/{outputName}",
    name: "obs_output_by_name",
    title: "OBS Output By Name",
    description: "Output summary plus status and sanitized settings for a URL-encoded OBS output name.",
    mimeType: MIME,
    requiredObsRequests: [GetOutputList.requestType],
    groups: ["outputs", "record", "stream", "state"],
    match: (uri) => decodeTemplateValue(uri, /^obs:\/\/outputs\/by-name\/([^/]+)$/u, "outputName"),
    read: async (context, uri) => {
      const outputName = outputNameFromUri(uri)
      const outputs = await listOutputs(context.client)
      const output = outputs.outputs.find((entry) => entry.outputName === outputName)
      if (output === undefined) {
        throw invalidResourceParams(`OBS output does not exist: ${outputName}`)
      }
      return withDefinedValues({
        output,
        status: await maybeRequest(
          context,
          GetOutputStatus.requestType,
          () => getOutputStatus(context.client, { outputName })
        ),
        settings: await maybeRequest(
          context,
          GetOutputSettings.requestType,
          () => getOutputSettings(context.client, { outputName })
        )
      })
    }
  },
  {
    uriTemplate: "obs://filters/{sourceName}",
    name: "obs_filters_by_source_name",
    title: "OBS Source Filters",
    description: "Filters for a URL-encoded OBS source name.",
    mimeType: MIME,
    requiredObsRequests: [GetSourceFilterList.requestType],
    groups: ["filters", "inputs", "scenes", "state"],
    match: (uri) => decodeTemplateValue(uri, /^obs:\/\/filters\/([^/]+)$/u, "sourceName"),
    read: async (context, uri) => {
      const sourceName = sourceNameFromFiltersUri(uri)
      const filters = await context.client.request(GetSourceFilterList, { sourceName })
      return { sourceName, ...filters }
    }
  },
  {
    uriTemplate: "obs://media/by-name/{inputName}",
    name: "obs_media_input_by_name",
    title: "OBS Media Input By Name",
    description: "Media status and raw settings for a URL-encoded OBS input name.",
    mimeType: MIME,
    requiredObsRequests: [GetInputList.requestType, GetMediaInputStatus.requestType],
    groups: ["inputs", "state"],
    match: (uri) => decodeTemplateValue(uri, /^obs:\/\/media\/by-name\/([^/]+)$/u, "inputName"),
    read: async (context, uri) => {
      const inputName = inputNameFromUri(uri.replace("obs://media/by-name/", "obs://inputs/by-name/"))
      await assertInputExists(context, inputName)
      return withDefinedValues({
        inputName,
        status: await context.client.request(GetMediaInputStatus, { inputName }),
        settings: await maybeRequest(
          context,
          GetInputSettings.requestType,
          () => getInputSettings(context.client, { inputName })
        )
      })
    }
  }
]

/* v8 ignore stop */
export const resourceLinksForTool = (toolName: string, output: unknown): ReadonlyArray<ResourceLink> => {
  switch (toolName) {
    case "get_obs_context":
    case "get_version":
    case "get_obs_stats":
      return [
        resourceLink(
          "obs://state/current",
          "obs_state_current",
          "Current OBS State",
          "Read the current OBS state snapshot."
        )
      ]
    case "list_scenes":
    case "get_current_scene":
    case "get_current_preview_scene":
      return [resourceLink("obs://scenes", "obs_scenes", "OBS Scenes", "Read the OBS scene list.")]
    case "list_inputs":
      return [resourceLink("obs://inputs", "obs_inputs", "OBS Inputs", "Read the OBS input list.")]
    case "get_record_status":
    case "start_record":
    case "stop_record":
    case "toggle_record":
    case "pause_record":
    case "resume_record":
    case "toggle_record_pause":
      return [resourceLink("obs://recording", "obs_recording", "OBS Recording", "Read the OBS recording status.")]
    case "get_stream_status":
    case "start_stream":
    case "stop_stream":
    case "toggle_stream":
      return [resourceLink("obs://streaming", "obs_streaming", "OBS Streaming", "Read the OBS streaming status.")]
    case "list_outputs":
      return [resourceLink("obs://outputs", "obs_outputs", "OBS Outputs", "Read the OBS outputs list.")]
    case "list_profiles":
      return [resourceLink("obs://profiles", "obs_profiles", "OBS Profiles", "Read the OBS profile list.")]
    case "list_scene_collections":
      return [
        resourceLink(
          "obs://scene-collections",
          "obs_scene_collections",
          "OBS Scene Collections",
          "Read the OBS scene collection list."
        )
      ]
    case "list_canvases":
      return [resourceLink("obs://canvases", "obs_canvases", "OBS Canvases", "Read the OBS canvas list.")]
    case "list_scene_transitions":
    case "get_current_scene_transition":
      return [resourceLink("obs://transitions", "obs_transitions", "OBS Transitions", "Read OBS transition state.")]
    case "list_hotkeys":
      return [resourceLink("obs://hotkeys", "obs_hotkeys", "OBS Hotkeys", "Read the OBS hotkey list.")]
    case "get_recent_obs_events":
      return [
        resourceLink("obs://events/recent", "obs_events_recent", "Recent OBS Events", "Read buffered OBS events.")
      ]
    case "get_source_screenshot":
    case "save_source_screenshot":
      return [
        resourceLink(
          "obs://screenshots/latest",
          "obs_screenshots_latest",
          "Latest OBS Screenshot",
          "Read the latest screenshot metadata captured by this server."
        )
      ]
    default:
      if (toolName === "list_scene_items" && typeof output === "object" && output !== null && "sceneName" in output) {
        return []
      }
      return []
  }
}
