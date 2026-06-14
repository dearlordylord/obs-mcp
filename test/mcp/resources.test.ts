import { Client } from "@modelcontextprotocol/sdk/client/index.js"
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js"
import { ErrorCode, ResourceUpdatedNotificationSchema } from "@modelcontextprotocol/sdk/types.js"
import { Option } from "effect"
import { mkdtemp, rm } from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import { afterEach, describe, expect, it } from "vitest"

import type { ObsConfig } from "../../src/config/config.js"
import { createObsMcpServer } from "../../src/mcp/create-mcp-server.js"
import {
  resourceDefinitions,
  resourceLinksForTool,
  resourceTemplateDefinitions
} from "../../src/mcp/resources/index.js"
import {
  filterReadableResources,
  filterReadableTemplates,
  invalidationGroupsForTool,
  ResourceManager
} from "../../src/mcp/resources/mechanics.js"
import type { ObsClient } from "../../src/obs/client.js"
import type { ObsRequestType } from "../../src/obs/requests.js"
import {
  DEFAULT_AVAILABLE_REQUESTS,
  DEFAULT_CANVASES,
  DEFAULT_HOTKEYS,
  DEFAULT_INPUTS,
  DEFAULT_PROFILES,
  DEFAULT_RECORD_DIRECTORY,
  DEFAULT_SCENE_COLLECTIONS,
  DEFAULT_SCENES,
  DEFAULT_TRANSITIONS
} from "../obs/fake-obs-fixtures.js"
import { fakeObsClient } from "./fake-obs-client.js"

const config: ObsConfig = {
  url: "ws://localhost:4455/",
  password: Option.none(),
  connectionTimeoutMs: 300,
  enabledToolsets: ["general", "scenes", "inputs", "record", "stream", "screenshots"]
}

const clients: Array<Client> = []
const servers: Array<ReturnType<typeof createObsMcpServer>> = []
const tempDirectories: Array<string> = []

const readJson = async (client: Client, uri: string): Promise<unknown> => {
  const result = await client.readResource({ uri })
  const [content] = result.contents
  if (content === undefined || !("text" in content)) {
    throw new Error(`Resource ${uri} did not return text content`)
  }
  return JSON.parse(content.text)
}

const connect = async (
  obs: ObsClient = fakeObsClient(resourceRequestHandler),
  serverConfig: ObsConfig = config
): Promise<Client> => {
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair()
  const server = createObsMcpServer(serverConfig, obs)
  const client = new Client({ name: "test-client", version: "0.0.0" })
  servers.push(server)
  clients.push(client)
  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)])
  return client
}

afterEach(async () => {
  await Promise.all(clients.splice(0).map((client) => client.close().catch(() => undefined)))
  await Promise.all(servers.splice(0).map((server) => server.close().catch(() => undefined)))
  await Promise.all(tempDirectories.splice(0).map((directory) => rm(directory, { force: true, recursive: true })))
})

describe("MCP resources", () => {
  it("advertises resource capabilities and lists static resources", async () => {
    const client = await connect()

    expect(client.getServerCapabilities()?.resources).toEqual({ subscribe: true })
    const resources = await client.listResources()

    expect(resources.resources.map((resource) => resource.uri)).toEqual([
      "obs://state/current",
      "obs://scenes",
      "obs://inputs",
      "obs://recording",
      "obs://streaming",
      "obs://outputs",
      "obs://config",
      "obs://profiles",
      "obs://scene-collections",
      "obs://canvases",
      "obs://transitions",
      "obs://hotkeys",
      "obs://events/recent",
      "obs://screenshots/latest"
    ])
  })

  it("lists resource templates", async () => {
    const client = await connect()

    const templates = await client.listResourceTemplates()

    expect(templates.resourceTemplates.map((template) => template.uriTemplate)).toEqual([
      "obs://scenes/by-name/{sceneName}",
      "obs://inputs/by-name/{inputName}",
      "obs://outputs/by-name/{outputName}",
      "obs://filters/{sourceName}",
      "obs://media/by-name/{inputName}"
    ])
  })

  it("reads each static JSON resource", async () => {
    const client = await connect()

    for (const resource of (await client.listResources()).resources) {
      const payload = await readJson(client, resource.uri)
      expect(payload).toBeDefined()
    }
  })

  it("reads encoded name-based template resources", async () => {
    const client = await connect()

    await expect(readJson(client, "obs://scenes/by-name/Intro")).resolves.toMatchObject({
      scene: { sceneName: "Intro" }
    })
    await expect(readJson(client, "obs://inputs/by-name/Mic%2FAux")).resolves.toMatchObject({
      input: { inputName: "Mic/Aux" }
    })
    await expect(readJson(client, "obs://outputs/by-name/adv_file_output")).resolves.toMatchObject({
      output: { outputName: "adv_file_output" }
    })
    await expect(readJson(client, "obs://filters/Mic%2FAux")).resolves.toMatchObject({
      sourceName: "Mic/Aux",
      filters: []
    })
    await expect(readJson(client, "obs://media/by-name/Mic%2FAux")).resolves.toMatchObject({
      inputName: "Mic/Aux",
      status: { mediaState: "OBS_MEDIA_STATE_STOPPED" }
    })
  })

  it("returns InvalidParams for unknown resources and missing template entities", async () => {
    const client = await connect()

    await expect(client.readResource({ uri: "obs://missing" })).rejects.toMatchObject({
      code: ErrorCode.InvalidParams
    })
    await expect(client.readResource({ uri: "obs://inputs/by-name/%E0%A4%A" })).rejects.toMatchObject({
      code: ErrorCode.InvalidParams
    })
    await expect(client.readResource({ uri: "obs://scenes/by-name/Nope" })).rejects.toMatchObject({
      code: ErrorCode.InvalidParams
    })
    await expect(client.readResource({ uri: "obs://media/by-name/Nope" })).rejects.toMatchObject({
      code: ErrorCode.InvalidParams
    })
  })

  it("filters resources and templates by advertised OBS requests", async () => {
    const client = await connect(fakeObsClient(resourceRequestHandler, ["GetVersion", "GetInputList"]))

    expect((await client.listResources()).resources.map((resource) => resource.uri)).toEqual([
      "obs://state/current",
      "obs://inputs",
      "obs://config",
      "obs://transitions",
      "obs://events/recent",
      "obs://screenshots/latest"
    ])
    expect((await client.listResourceTemplates()).resourceTemplates.map((template) => template.uriTemplate)).toEqual([
      "obs://inputs/by-name/{inputName}"
    ])
    expect(filterReadableResources(resourceDefinitions, ["GetSceneList"]).map((resource) => resource.uri))
      .toContain("obs://scenes")
    expect(
      filterReadableTemplates(resourceTemplateDefinitions, ["GetInputList"]).map((template) => template.uriTemplate)
    )
      .toEqual(["obs://inputs/by-name/{inputName}"])
  })

  it("records latest screenshot metadata and returns resource links from screenshot tools", async () => {
    const client = await connect()

    const result = await client.callTool({
      name: "get_source_screenshot",
      arguments: { sourceName: "Intro", imageFormat: "png" }
    })

    expect(result.content).toContainEqual(expect.objectContaining({
      type: "resource_link",
      uri: "obs://screenshots/latest"
    }))
    await expect(readJson(client, "obs://screenshots/latest")).resolves.toMatchObject({
      latest: {
        sourceName: "Intro",
        imageFormat: "png",
        mimeType: "image/png",
        imageBytes: 4,
        base64Data: "dGVzdA=="
      }
    })
  })

  it("records latest saved screenshot metadata", async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), "obs-mcp-resources-"))
    tempDirectories.push(directory)
    const client = await connect(undefined, {
      ...config,
      screenshotOutputDirectory: directory
    })

    await client.callTool({
      name: "save_source_screenshot",
      arguments: { sourceUuid: "scene-intro", imageFormat: "png", fileName: "capture.png" }
    })

    await expect(readJson(client, "obs://screenshots/latest")).resolves.toMatchObject({
      latest: {
        sourceUuid: "scene-intro",
        imageFormat: "png",
        imageFilePath: path.join(directory, "capture.png")
      }
    })
  })

  it("exercises resource manager cache, invalidation, subscriptions, and helper mappings", async () => {
    let readCount = 0
    const updatedUris: Array<string> = []
    const manager = new ResourceManager(
      [{
        uri: "obs://unit",
        name: "unit",
        title: "Unit",
        description: "Unit resource",
        mimeType: "application/json",
        requiredObsRequests: [],
        groups: ["state"],
        read: async () => ({ readCount: ++readCount })
      }],
      [{
        uriTemplate: "obs://unit/{name}",
        name: "unit_template",
        title: "Unit Template",
        description: "Unit template",
        mimeType: "application/json",
        requiredObsRequests: ["GetVersion"],
        groups: ["inputs"],
        match: (uri) => uri === "obs://unit/name" ? { name: "name" } : undefined,
        read: async () => ({ templated: true })
      }],
      async (uri) => {
        updatedUris.push(uri)
      }
    )
    const context = {
      config,
      client: fakeObsClient(resourceRequestHandler),
      screenshots: { getLatest: () => undefined, setLatest: () => undefined }
    }

    await expect(manager.read("obs://unit", context)).resolves.toMatchObject({
      contents: [{ text: "{\"readCount\":1}" }]
    })
    await expect(manager.read("obs://unit", context)).resolves.toMatchObject({
      contents: [{ text: "{\"readCount\":1}" }]
    })
    expect(manager.definitionForUri("obs://unit/name", ["GetVersion"])?.name).toBe("unit_template")
    expect(() => manager.subscribe("obs://missing", [])).toThrow("Unknown resource")
    manager.invalidate([])
    manager.invalidate(["inputs"])

    manager.subscribe("obs://unit", [])
    manager.subscribe("obs://unit/name", ["GetVersion"])
    manager.invalidate(["state"])
    manager.invalidate(["state"])
    await new Promise((resolve) => setTimeout(resolve, 80))
    expect(updatedUris).toEqual(["obs://unit"])
    await expect(manager.read("obs://unit", context)).resolves.toMatchObject({
      contents: [{ text: "{\"readCount\":2}" }]
    })

    manager.unsubscribe("obs://unit")
    manager.invalidate(["state"])
    await new Promise((resolve) => setTimeout(resolve, 80))
    expect(updatedUris).toEqual(["obs://unit"])

    expect(invalidationGroupsForTool("set_canvas", "canvases")).toEqual(["canvases", "state"])
    expect(invalidationGroupsForTool("set_config", "config")).toEqual([
      "config",
      "profiles",
      "scene_collections",
      "state"
    ])
    expect(invalidationGroupsForTool("confirm_obs_output_lifecycle", "events")).toEqual(["events"])
    expect(invalidationGroupsForTool("set_filter", "filters")).toEqual(["filters", "inputs", "scenes", "state"])
    expect(invalidationGroupsForTool("trigger_hotkey_by_name", "general")).toEqual(["hotkeys", "events"])
    expect(invalidationGroupsForTool("noop", "general")).toEqual([])
    expect(invalidationGroupsForTool("set_input_mute", "inputs")).toEqual(["inputs", "state"])
    expect(invalidationGroupsForTool("set_output_settings", "outputs")).toEqual([
      "outputs",
      "record",
      "stream",
      "state"
    ])
    expect(invalidationGroupsForTool("start_record", "record")).toEqual(["record", "outputs", "state"])
    expect(invalidationGroupsForTool("set_scene_name", "scenes")).toEqual([
      "scenes",
      "scene_items",
      "transitions",
      "state"
    ])
    expect(invalidationGroupsForTool("save_source_screenshot", "screenshots")).toEqual(["screenshots", "state"])
    expect(invalidationGroupsForTool("start_stream", "stream")).toEqual(["stream", "outputs", "state"])
    expect(invalidationGroupsForTool("set_current_scene_transition", "transitions")).toEqual([
      "transitions",
      "scenes",
      "state"
    ])
    expect(invalidationGroupsForTool("set_vendor", "vendor")).toEqual([])
    expect(invalidationGroupsForTool("list_inputs", "inputs")).toEqual([])

    expect(resourceLinksForTool("get_obs_context", {}).map((link) => link.uri)).toEqual(["obs://state/current"])
    expect(resourceLinksForTool("list_scenes", {}).map((link) => link.uri)).toEqual(["obs://scenes"])
    expect(resourceLinksForTool("list_inputs", {}).map((link) => link.uri)).toEqual(["obs://inputs"])
    expect(resourceLinksForTool("start_record", {}).map((link) => link.uri)).toEqual(["obs://recording"])
    expect(resourceLinksForTool("start_stream", {}).map((link) => link.uri)).toEqual(["obs://streaming"])
    expect(resourceLinksForTool("list_outputs", {}).map((link) => link.uri)).toEqual(["obs://outputs"])
    expect(resourceLinksForTool("list_profiles", {}).map((link) => link.uri)).toEqual(["obs://profiles"])
    expect(resourceLinksForTool("list_scene_collections", {}).map((link) => link.uri)).toEqual([
      "obs://scene-collections"
    ])
    expect(resourceLinksForTool("list_canvases", {}).map((link) => link.uri)).toEqual(["obs://canvases"])
    expect(resourceLinksForTool("list_scene_transitions", {}).map((link) => link.uri)).toEqual([
      "obs://transitions"
    ])
    expect(resourceLinksForTool("list_hotkeys", {}).map((link) => link.uri)).toEqual(["obs://hotkeys"])
    expect(resourceLinksForTool("get_recent_obs_events", {}).map((link) => link.uri)).toEqual([
      "obs://events/recent"
    ])
    expect(resourceLinksForTool("save_source_screenshot", {}).map((link) => link.uri)).toEqual([
      "obs://screenshots/latest"
    ])
    expect(resourceLinksForTool("unknown", {})).toEqual([])
    expect(resourceLinksForTool("list_scene_items", { sceneName: "Intro" })).toEqual([])
  })

  it("sends subscribed resource update notifications after relevant tool mutations", async () => {
    const client = await connect()
    const updated = new Promise<string>((resolve) => {
      client.setNotificationHandler(ResourceUpdatedNotificationSchema, (notification) => {
        resolve(notification.params.uri)
      })
    })

    await client.subscribeResource({ uri: "obs://scenes" })
    await client.callTool({ name: "set_current_scene", arguments: { sceneName: "Main" } })

    await expect(updated).resolves.toBe("obs://scenes")
    await client.unsubscribeResource({ uri: "obs://scenes" })
  })

  it("returns structured tool errors for unknown tools", async () => {
    const client = await connect()

    await expect(client.callTool({ name: "missing_tool", arguments: {} })).resolves.toMatchObject({
      isError: true,
      _meta: { error: { code: ErrorCode.InvalidParams, message: "MCP error -32602: Unknown tool: missing_tool" } }
    })
  })
})

const resourceRequestHandler = async (
  requestType: ObsRequestType,
  requestData: unknown
): Promise<unknown> => {
  switch (requestType) {
    case "GetVersion":
      return {
        obsVersion: "32.0.0",
        obsWebSocketVersion: "5.6.0",
        rpcVersion: 1,
        availableRequests: DEFAULT_AVAILABLE_REQUESTS,
        supportedImageFormats: ["png"]
      }
    case "GetStats":
      return {
        cpuUsage: 1,
        memoryUsage: 2,
        availableDiskSpace: 3,
        activeFps: 60,
        averageFrameRenderTime: 1,
        renderSkippedFrames: 0,
        renderTotalFrames: 10,
        outputSkippedFrames: 0,
        outputTotalFrames: 10,
        webSocketSessionIncomingMessages: 1,
        webSocketSessionOutgoingMessages: 1
      }
    case "GetSceneList":
      return {
        currentProgramSceneName: "Intro",
        currentProgramSceneUuid: "scene-intro",
        currentPreviewSceneName: "Main",
        currentPreviewSceneUuid: "scene-main",
        scenes: DEFAULT_SCENES
      }
    case "GetCurrentProgramScene":
      return { sceneName: "Intro", sceneUuid: "scene-intro" }
    case "GetCurrentPreviewScene":
      return { sceneName: "Main", sceneUuid: "scene-main" }
    case "SetCurrentProgramScene":
      return {}
    case "GetSceneItemList":
      return { sceneItems: [] }
    case "GetSceneSceneTransitionOverride":
      return { transitionName: null, transitionDuration: null }
    case "GetInputList":
      return { inputs: DEFAULT_INPUTS }
    case "GetInputMute":
      return { inputMuted: false }
    case "GetInputVolume":
      return { inputVolumeMul: 1, inputVolumeDb: 0 }
    case "GetInputAudioBalance":
      return { inputAudioBalance: 0.5 }
    case "GetInputAudioMonitorType":
      return { monitorType: "OBS_MONITORING_TYPE_NONE" }
    case "GetInputAudioSyncOffset":
      return { inputAudioSyncOffset: 0 }
    case "GetInputAudioTracks":
      return { inputAudioTracks: { "1": true, "2": true, "3": true, "4": true, "5": true, "6": true } }
    case "GetInputDeinterlaceMode":
      return { inputDeinterlaceMode: "OBS_DEINTERLACE_MODE_DISABLE" }
    case "GetInputDeinterlaceFieldOrder":
      return { inputDeinterlaceFieldOrder: "OBS_DEINTERLACE_FIELD_ORDER_TOP" }
    case "GetInputSettings":
      return { inputKind: "ffmpeg_source", inputSettings: { local_file: "/tmp/example.mp4" } }
    case "GetMediaInputStatus":
      return { mediaState: "OBS_MEDIA_STATE_STOPPED", mediaDuration: null, mediaCursor: null }
    case "GetOutputList":
      return {
        outputs: [
          { outputName: "adv_file_output", outputKind: "ffmpeg_muxer", outputActive: false }
        ]
      }
    case "GetOutputStatus":
      return outputStatus()
    case "GetOutputSettings":
      return { outputSettings: { path: "/tmp", format_name: "mp4" } }
    case "GetRecordStatus":
      return {
        outputActive: false,
        outputPaused: false,
        outputTimecode: "00:00:00.000",
        outputDuration: 0,
        outputBytes: 0
      }
    case "GetStreamStatus":
      return outputStatus()
    case "GetProfileList":
      return { currentProfileName: DEFAULT_PROFILES[0], profiles: DEFAULT_PROFILES }
    case "GetSceneCollectionList":
      return { currentSceneCollectionName: DEFAULT_SCENE_COLLECTIONS[0], sceneCollections: DEFAULT_SCENE_COLLECTIONS }
    case "GetRecordDirectory":
      return { recordDirectory: DEFAULT_RECORD_DIRECTORY }
    case "GetVideoSettings":
      return {
        baseWidth: 1920,
        baseHeight: 1080,
        outputWidth: 1920,
        outputHeight: 1080,
        fpsNumerator: 60,
        fpsDenominator: 1
      }
    case "GetStreamServiceSettings":
      return {
        streamServiceType: "rtmp_custom",
        streamServiceSettings: { server: "rtmp://example.test", key: "secret" }
      }
    case "GetCanvasList":
      return { canvases: DEFAULT_CANVASES }
    case "GetSceneTransitionList":
      return {
        currentSceneTransitionName: "Fade",
        currentSceneTransitionUuid: "transition-fade",
        currentSceneTransitionKind: "fade_transition",
        transitions: DEFAULT_TRANSITIONS
      }
    case "GetCurrentSceneTransition":
      return DEFAULT_TRANSITIONS[1]
    case "GetCurrentSceneTransitionCursor":
      return { transitionCursor: 0 }
    case "GetTransitionKindList":
      return { transitionKinds: ["cut_transition", "fade_transition"] }
    case "GetHotkeyList":
      return { hotkeys: DEFAULT_HOTKEYS }
    case "GetSourceFilterList":
      return { filters: [] }
    case "GetSourceScreenshot":
      return { imageData: "data:image/png;base64,dGVzdA==" }
    case "SaveSourceScreenshot":
      return {}
    default:
      throw new Error(`Unhandled OBS request in resource test: ${requestType} ${JSON.stringify(requestData)}`)
  }
}

const outputStatus = (): Record<string, unknown> => ({
  outputActive: false,
  outputReconnecting: false,
  outputTimecode: "00:00:00.000",
  outputDuration: 0,
  outputCongestion: 0,
  outputBytes: 0,
  outputSkippedFrames: 0,
  outputTotalFrames: 0
})
