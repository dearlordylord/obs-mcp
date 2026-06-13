import { Client } from "@modelcontextprotocol/sdk/client/index.js"
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js"
import { ErrorCode } from "@modelcontextprotocol/sdk/types.js"
import { Option } from "effect"
import { afterEach, describe, expect, it } from "vitest"

import type { ObsConfig } from "../../src/config/config.js"
import { createObsMcpServer } from "../../src/mcp/create-mcp-server.js"
import { createObsClient, type ObsClient } from "../../src/obs/client.js"
import { ObsRequestError } from "../../src/obs/errors.js"
import { EventSubscription } from "../../src/obs/protocol.js"
import type { ObsRequestType } from "../../src/obs/requests.js"
import { FakeObsServer } from "../obs/fake-obs-server.js"
import { allAvailableRequests, fakeObsClient } from "./fake-obs-client.js"

const config: ObsConfig = {
  url: "ws://localhost:4455/",
  password: Option.none(),
  connectionTimeoutMs: 300,
  enabledToolsets: ["general", "record", "scenes", "inputs"]
}

const clients: Array<Client> = []
const obsClients: Array<ObsClient> = []
const servers: Array<ReturnType<typeof createObsMcpServer>> = []
const fakeObsServers: Array<FakeObsServer> = []

const obsClient = (
  handler: (requestType: ObsRequestType) => Promise<unknown>,
  availableRequests: ReadonlyArray<string> = allAvailableRequests,
  bufferedEvents: ReturnType<ObsClient["getBufferedEvents"]> = { capacity: 0, droppedEvents: 0, events: [] }
): ObsClient => fakeObsClient(handler, availableRequests, bufferedEvents)

const connect = async (obs: ObsClient, serverConfig: ObsConfig = config): Promise<Client> => {
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
  await Promise.all(obsClients.splice(0).map((client) => client.close().catch(() => undefined)))
  await Promise.all(fakeObsServers.splice(0).map((server) => server.stop()))
})

describe("MCP server protocol handlers", () => {
  it("lists tools with Effect JSON Schema generated input and output schemas", async () => {
    const client = await connect(obsClient(async () => ({})))
    const tools = await client.listTools()
    expect(tools.tools.map((tool) => tool.name)).toEqual([
      "get_obs_context",
      "get_version",
      "get_obs_stats",
      "list_hotkeys",
      "trigger_hotkey_by_name",
      "trigger_hotkey_by_key_sequence",
      "list_scenes",
      "get_current_scene",
      "set_current_scene",
      "list_scene_items",
      "list_group_scene_items",
      "get_scene_item_id",
      "get_scene_item_source",
      "get_scene_item_enabled",
      "set_scene_item_enabled",
      "get_scene_item_locked",
      "set_scene_item_locked",
      "get_scene_item_index",
      "get_scene_item_blend_mode",
      "set_scene_item_index",
      "set_scene_item_blend_mode",
      "get_source_active",
      "list_inputs",
      "list_input_kinds",
      "get_special_inputs",
      "get_input_mute",
      "set_input_mute",
      "toggle_input_mute",
      "get_input_volume",
      "set_input_volume",
      "get_input_audio_balance",
      "set_input_audio_balance",
      "get_input_audio_monitor_type",
      "set_input_audio_monitor_type",
      "get_input_audio_sync_offset",
      "set_input_audio_sync_offset",
      "get_media_input_status",
      "set_media_input_cursor",
      "offset_media_input_cursor",
      "trigger_media_input_action",
      "get_record_status",
      "start_record",
      "stop_record",
      "toggle_record",
      "split_record_file",
      "create_record_chapter",
      "pause_record",
      "resume_record",
      "toggle_record_pause"
    ])
    expect(tools.tools.find((tool) => tool.name === "set_current_scene")?.inputSchema.required).toEqual(["sceneName"])
    expect(tools.tools.find((tool) => tool.name === "get_current_scene")?.outputSchema?.properties)
      .toHaveProperty("sceneName")
    expect(tools.tools.find((tool) => tool.name === "get_record_status")?.outputSchema?.properties)
      .toHaveProperty("outputActive")
    expect(tools.tools.find((tool) => tool.name === "pause_record")?.outputSchema?.properties)
      .toHaveProperty("requestedAction")
    expect(tools.tools.find((tool) => tool.name === "stop_record")?.outputSchema?.properties)
      .toHaveProperty("outputPath")
    expect(tools.tools.find((tool) => tool.name === "create_record_chapter")?.inputSchema.properties)
      .toHaveProperty("chapterName")
    expect(tools.tools.find((tool) => tool.name === "list_inputs")?.outputSchema?.properties)
      .toHaveProperty("inputs")
  })

  it("lists scene-item tools with MCP-compatible object schemas", async () => {
    const client = await connect(obsClient(async () => ({})))
    const tools = await client.listTools()
    const sceneItemsTool = tools.tools.find((tool) => tool.name === "list_scene_items")
    expect(sceneItemsTool?.inputSchema.type).toBe("object")
    expect(sceneItemsTool?.inputSchema).toHaveProperty("anyOf")
    expect(tools.tools.find((tool) => tool.name === "get_scene_item_id")?.inputSchema.type).toBe("object")
    expect(tools.tools.find((tool) => tool.name === "set_scene_item_enabled")?.inputSchema.type).toBe("object")
    expect(tools.tools.find((tool) => tool.name === "set_scene_item_index")?.inputSchema.type).toBe("object")
    expect(tools.tools.find((tool) => tool.name === "get_source_active")?.inputSchema.type).toBe("object")
    expect(tools.tools.find((tool) => tool.name === "get_scene_item_blend_mode")?.outputSchema?.properties)
      .toHaveProperty("sceneItemBlendMode")
  })

  it("lists only context and available capability-backed tools", async () => {
    const client = await connect(obsClient(async () => ({}), ["GetVersion"]))
    const tools = await client.listTools()
    expect(tools.tools.map((tool) => tool.name)).toEqual(["get_obs_context", "get_version"])
  })

  it("lists general tools together for the general toolset", async () => {
    const client = await connect(obsClient(async () => ({})), {
      ...config,
      enabledToolsets: ["general"]
    })
    const tools = await client.listTools()
    expect(tools.tools.map((tool) => tool.name)).toEqual([
      "get_obs_context",
      "get_version",
      "get_obs_stats",
      "list_hotkeys",
      "trigger_hotkey_by_name",
      "trigger_hotkey_by_key_sequence"
    ])
  })

  it("lists and calls hotkey tools through in-memory MCP handlers", async () => {
    const client = await connect(
      obsClient(async (requestType) => requestType === "GetHotkeyList" ? { hotkeys: ["OBSBasic.StartRecording"] } : {}),
      {
        ...config,
        enabledToolsets: ["general"]
      }
    )
    const tools = await client.listTools()
    expect(tools.tools.map((tool) => tool.name)).toContain("list_hotkeys")
    await expect(client.callTool({ name: "list_hotkeys", arguments: {} }))
      .resolves.toMatchObject({ structuredContent: { hotkeys: ["OBSBasic.StartRecording"] } })
    await expect(client.callTool({
      name: "trigger_hotkey_by_name",
      arguments: { hotkeyName: "OBSBasic.StartRecording" }
    })).resolves.toMatchObject({ structuredContent: { hotkeyName: "OBSBasic.StartRecording", triggered: true } })
    await expect(client.callTool({
      name: "trigger_hotkey_by_key_sequence",
      arguments: { keyId: "OBS_KEY_F10", keyModifiers: { control: true } }
    })).resolves.toMatchObject({
      structuredContent: { keyId: "OBS_KEY_F10", keyModifiers: { control: true }, triggered: true }
    })
  })

  it("lists recent event tools only for the events toolset", async () => {
    const client = await connect(obsClient(async () => ({})), {
      ...config,
      enabledToolsets: ["events"]
    })
    const tools = await client.listTools()
    expect(tools.tools.map((tool) => tool.name)).toEqual(["get_recent_obs_events"])
  })

  it("hides record lifecycle and pause tools when fake OBS does not advertise the capabilities", async () => {
    const fakeObs = await FakeObsServer.start({ availableRequestsValue: ["GetVersion"] })
    fakeObsServers.push(fakeObs)
    const obs = await createObsClient({ ...config, url: fakeObs.url, enabledToolsets: ["record"] })
    obsClients.push(obs)
    const client = await connect(obs, { ...config, enabledToolsets: ["record"] })
    const tools = await client.listTools()
    expect(tools.tools.map((tool) => tool.name)).toEqual([])
  })

  it("hides record pause tools when the record toolset is disabled against fake OBS", async () => {
    const fakeObs = await FakeObsServer.start()
    fakeObsServers.push(fakeObs)
    const obs = await createObsClient({ ...config, url: fakeObs.url, enabledToolsets: ["scenes"] })
    obsClients.push(obs)
    const client = await connect(obs, { ...config, enabledToolsets: ["scenes"] })
    const tools = await client.listTools()
    expect(tools.tools.map((tool) => tool.name)).not.toContain("pause_record")
    expect(tools.tools.map((tool) => tool.name)).not.toContain("start_record")
    expect(tools.tools.map((tool) => tool.name)).not.toContain("split_record_file")
  })

  it("lists record lifecycle and file tools only when OBS capabilities are available", async () => {
    const client = await connect(
      obsClient(async () => ({}), [
        "StartRecord",
        "StopRecord",
        "ToggleRecord",
        "SplitRecordFile",
        "CreateRecordChapter"
      ]),
      { ...config, enabledToolsets: ["record"] }
    )
    const tools = await client.listTools()
    expect(tools.tools.map((tool) => tool.name)).toEqual([
      "start_record",
      "stop_record",
      "toggle_record",
      "split_record_file",
      "create_record_chapter"
    ])
  })

  it("lists stream tools only when the stream toolset and OBS capabilities are available", async () => {
    const client = await connect(
      obsClient(async () => ({}), [
        "GetStreamStatus",
        "StartStream",
        "StopStream",
        "ToggleStream",
        "SendStreamCaption"
      ]),
      { ...config, enabledToolsets: ["stream"] }
    )
    const tools = await client.listTools()
    expect(tools.tools.map((tool) => tool.name)).toEqual([
      "get_stream_status",
      "start_stream",
      "stop_stream",
      "toggle_stream",
      "send_stream_caption"
    ])
  })

  it("does not list stream tools when the stream toolset is disabled", async () => {
    const client = await connect(obsClient(async () => ({})), { ...config, enabledToolsets: ["scenes"] })
    const tools = await client.listTools()
    expect(tools.tools.map((tool) => tool.name)).not.toContain("get_stream_status")
    expect(tools.tools.map((tool) => tool.name)).not.toContain("send_stream_caption")
  })

  it("lists replay buffer tools only when the outputs toolset and OBS capabilities are available", async () => {
    const client = await connect(
      obsClient(async () => ({}), [
        "GetReplayBufferStatus",
        "StartReplayBuffer",
        "StopReplayBuffer",
        "ToggleReplayBuffer",
        "SaveReplayBuffer",
        "GetLastReplayBufferReplay"
      ]),
      { ...config, enabledToolsets: ["outputs"] }
    )
    const tools = await client.listTools()
    expect(tools.tools.map((tool) => tool.name)).toEqual([
      "get_replay_buffer_status",
      "start_replay_buffer",
      "stop_replay_buffer",
      "toggle_replay_buffer",
      "save_replay_buffer",
      "get_last_replay_buffer_replay"
    ])
  })

  it("lists and calls input discovery tools through in-memory MCP handlers", async () => {
    const client = await connect(
      obsClient(async (requestType) => {
        if (requestType === "GetInputList") {
          return {
            inputs: [{
              inputName: "Mic/Aux",
              inputUuid: "input-mic-aux",
              inputKind: "wasapi_input_capture",
              unversionedInputKind: "wasapi_input_capture"
            }]
          }
        }
        if (requestType === "GetInputKindList") {
          return { inputKinds: ["wasapi_input_capture"] }
        }
        return {
          desktop1: "Desktop Audio",
          desktop2: null,
          mic1: "Mic/Aux",
          mic2: null,
          mic3: null,
          mic4: null
        }
      }),
      { ...config, enabledToolsets: ["inputs"] }
    )
    const tools = await client.listTools()
    expect(tools.tools.map((tool) => tool.name)).toEqual([
      "list_inputs",
      "list_input_kinds",
      "get_special_inputs",
      "get_input_mute",
      "set_input_mute",
      "toggle_input_mute",
      "get_input_volume",
      "set_input_volume",
      "get_input_audio_balance",
      "set_input_audio_balance",
      "get_input_audio_monitor_type",
      "set_input_audio_monitor_type",
      "get_input_audio_sync_offset",
      "set_input_audio_sync_offset",
      "get_media_input_status",
      "set_media_input_cursor",
      "offset_media_input_cursor",
      "trigger_media_input_action"
    ])
    await expect(client.callTool({ name: "list_inputs", arguments: { inputKind: "wasapi_input_capture" } }))
      .resolves.toMatchObject({ structuredContent: { inputs: [{ inputName: "Mic/Aux" }] } })
    await expect(client.callTool({ name: "list_input_kinds", arguments: { unversioned: true } }))
      .resolves.toMatchObject({ structuredContent: { inputKinds: ["wasapi_input_capture"] } })
    await expect(client.callTool({ name: "get_special_inputs", arguments: {} }))
      .resolves.toMatchObject({ structuredContent: { desktop2: null, mic2: null } })
  })

  it("lists and calls canvas and studio-mode read tools through in-memory MCP handlers", async () => {
    const client = await connect(
      obsClient(async (requestType) => {
        if (requestType === "GetCanvasList") {
          return {
            canvases: [{
              canvasName: "Program",
              canvasUuid: "canvas-program",
              canvasIndex: 0,
              width: 1920,
              height: 1080
            }]
          }
        }
        return { studioModeEnabled: true }
      }, ["GetCanvasList", "GetStudioModeEnabled"]),
      { ...config, enabledToolsets: ["canvases", "ui"] }
    )
    const tools = await client.listTools()
    expect(tools.tools.map((tool) => tool.name)).toEqual(["list_canvases", "get_studio_mode_enabled"])
    expect(tools.tools.find((tool) => tool.name === "list_canvases")?.outputSchema?.properties)
      .toHaveProperty("canvases")
    await expect(client.callTool({ name: "list_canvases", arguments: {} }))
      .resolves.toMatchObject({
        structuredContent: {
          canvases: [{ canvasIndex: 0, canvasName: "Program", canvasUuid: "canvas-program" }]
        }
      })
    await expect(client.callTool({ name: "get_studio_mode_enabled", arguments: {} }))
      .resolves.toMatchObject({ structuredContent: { studioModeEnabled: true } })
  })

  it("lists and calls config inventory and mutation tools through in-memory MCP handlers", async () => {
    const client = await connect(
      obsClient(async (requestType) => {
        if (requestType === "GetProfileList") {
          return { currentProfileName: "Production", profiles: ["Untitled", "Production"] }
        }
        if (requestType === "GetSceneCollectionList") {
          return { currentSceneCollectionName: "Main Scenes", sceneCollections: ["Main Scenes"] }
        }
        if (requestType === "GetProfileParameter") {
          return { parameterValue: null, defaultParameterValue: "2500" }
        }
        if (requestType === "GetRecordDirectory") {
          return { recordDirectory: "/opaque/obs-recordings" }
        }
        return {}
      }, [
        "GetProfileList",
        "GetSceneCollectionList",
        "GetProfileParameter",
        "GetRecordDirectory",
        "SetCurrentProfile",
        "CreateProfile",
        "RemoveProfile",
        "SetCurrentSceneCollection",
        "CreateSceneCollection",
        "SetProfileParameter"
      ]),
      { ...config, enabledToolsets: ["config"] }
    )
    const tools = await client.listTools()
    expect(tools.tools.map((tool) => tool.name)).toEqual([
      "list_profiles",
      "list_scene_collections",
      "get_profile_parameter",
      "get_record_directory",
      "set_current_profile",
      "create_profile",
      "remove_profile",
      "set_current_scene_collection",
      "create_scene_collection",
      "set_profile_parameter"
    ])
    await expect(client.callTool({ name: "list_profiles", arguments: {} }))
      .resolves.toMatchObject({ structuredContent: { currentProfileName: "Production" } })
    await expect(client.callTool({ name: "list_scene_collections", arguments: {} }))
      .resolves.toMatchObject({ structuredContent: { sceneCollections: ["Main Scenes"] } })
    await expect(client.callTool({
      name: "get_profile_parameter",
      arguments: { parameterCategory: "SimpleOutput", parameterName: "VBitrate" }
    })).resolves.toMatchObject({
      structuredContent: { parameterValue: null, defaultParameterValue: "2500" }
    })
    await expect(client.callTool({ name: "get_record_directory", arguments: {} }))
      .resolves.toMatchObject({ structuredContent: { recordDirectory: "/opaque/obs-recordings" } })
    await expect(client.callTool({ name: "set_current_profile", arguments: { profileName: "Production" } }))
      .resolves.toMatchObject({ structuredContent: { profileName: "Production", switched: true } })
    await expect(client.callTool({ name: "create_profile", arguments: { profileName: "Show" } }))
      .resolves.toMatchObject({ structuredContent: { profileName: "Show", created: true, switched: true } })
    await expect(client.callTool({
      name: "set_current_scene_collection",
      arguments: { sceneCollectionName: "Main Scenes" }
    })).resolves.toMatchObject({ structuredContent: { sceneCollectionName: "Main Scenes", switched: true } })
    await expect(client.callTool({
      name: "set_profile_parameter",
      arguments: { parameterCategory: "SimpleOutput", parameterName: "VBitrate", parameterValue: null }
    })).resolves.toMatchObject({ structuredContent: { parameterValue: null, acknowledged: true } })
  })

  it("lists and calls transition inventory tools through in-memory MCP handlers", async () => {
    const client = await connect(
      obsClient(async (requestType) => {
        if (requestType === "GetTransitionKindList") {
          return { transitionKinds: ["fade_transition", "cut_transition"] }
        }
        if (requestType === "GetSceneTransitionList") {
          return {
            currentSceneTransitionName: "Fade",
            currentSceneTransitionUuid: "transition-fade",
            currentSceneTransitionKind: "fade_transition",
            transitions: [{
              transitionName: "Fade",
              transitionUuid: "transition-fade",
              transitionKind: "fade_transition",
              transitionFixed: false,
              transitionDuration: 300,
              transitionSettings: { color: "black" }
            }]
          }
        }
        if (requestType === "GetCurrentSceneTransition") {
          return {
            transitionName: "Fade",
            transitionUuid: "transition-fade",
            transitionKind: "fade_transition",
            transitionFixed: false,
            transitionDuration: 300,
            transitionConfigurable: true,
            transitionSettings: { color: "black" }
          }
        }
        if (
          requestType === "SetCurrentSceneTransition"
          || requestType === "SetCurrentSceneTransitionDuration"
          || requestType === "SetCurrentSceneTransitionSettings"
          || requestType === "TriggerStudioModeTransition"
          || requestType === "SetTBarPosition"
        ) {
          return {}
        }
        return { transitionCursor: 1 }
      }, [
        "GetTransitionKindList",
        "GetSceneTransitionList",
        "GetCurrentSceneTransition",
        "GetCurrentSceneTransitionCursor",
        "SetCurrentSceneTransition",
        "SetCurrentSceneTransitionDuration",
        "SetCurrentSceneTransitionSettings",
        "TriggerStudioModeTransition",
        "SetTBarPosition"
      ]),
      { ...config, enabledToolsets: ["transitions"] }
    )
    const tools = await client.listTools()
    expect(tools.tools.map((tool) => tool.name)).toEqual([
      "list_transition_kinds",
      "list_scene_transitions",
      "get_current_scene_transition",
      "get_current_scene_transition_cursor",
      "set_current_scene_transition",
      "set_current_scene_transition_duration",
      "set_current_scene_transition_settings",
      "trigger_studio_mode_transition",
      "set_tbar_position"
    ])
    await expect(client.callTool({ name: "list_transition_kinds", arguments: {} }))
      .resolves.toMatchObject({ structuredContent: { transitionKinds: ["fade_transition", "cut_transition"] } })
    await expect(client.callTool({ name: "list_scene_transitions", arguments: {} }))
      .resolves.toMatchObject({
        structuredContent: {
          currentSceneTransitionName: "Fade",
          transitions: [{
            transitionName: "Fade",
            transitionKind: "fade_transition",
            transitionDuration: 300
          }]
        }
      })
    await expect(client.callTool({ name: "get_current_scene_transition", arguments: {} }))
      .resolves.toMatchObject({
        structuredContent: {
          transitionName: "Fade",
          transitionKind: "fade_transition",
          transitionConfigurable: true
        }
      })
    await expect(client.callTool({ name: "get_current_scene_transition_cursor", arguments: {} }))
      .resolves.toMatchObject({ structuredContent: { transitionCursor: 1 } })
    await expect(client.callTool({ name: "set_current_scene_transition", arguments: { transitionName: "Fade" } }))
      .resolves.toMatchObject({ structuredContent: { transitionName: "Fade", switched: true } })
    await expect(client.callTool({
      name: "set_current_scene_transition_duration",
      arguments: { transitionDuration: 500 }
    })).resolves.toMatchObject({ structuredContent: { transitionDuration: 500, acknowledged: true } })
    await expect(client.callTool({
      name: "set_current_scene_transition_settings",
      arguments: { transitionSettings: { path: "left" } }
    })).resolves.toMatchObject({ structuredContent: { overlay: true, settingsFieldCount: 1, acknowledged: true } })
    await expect(client.callTool({ name: "trigger_studio_mode_transition", arguments: {} }))
      .resolves.toMatchObject({
        structuredContent: { requestType: "TriggerStudioModeTransition", acknowledged: true }
      })
    await expect(client.callTool({ name: "set_tbar_position", arguments: { position: 0.75 } }))
      .resolves.toMatchObject({ structuredContent: { position: 0.75, release: true, acknowledged: true } })
  })

  it("does not list output tools when the outputs toolset is disabled", async () => {
    const client = await connect(obsClient(async () => ({})), { ...config, enabledToolsets: ["scenes"] })
    const tools = await client.listTools()
    expect(tools.tools.map((tool) => tool.name)).not.toContain("get_virtual_cam_status")
    expect(tools.tools.map((tool) => tool.name)).not.toContain("get_replay_buffer_status")
    expect(tools.tools.map((tool) => tool.name)).not.toContain("save_replay_buffer")
  })

  it("returns structured success content", async () => {
    const client = await connect(obsClient(async (requestType) => {
      if (requestType === "GetStats") {
        return {
          cpuUsage: 4,
          memoryUsage: 256,
          availableDiskSpace: 4096,
          activeFps: 30,
          averageFrameRenderTime: 2,
          renderSkippedFrames: 1,
          renderTotalFrames: 100,
          outputSkippedFrames: 2,
          outputTotalFrames: 90,
          webSocketSessionIncomingMessages: 3,
          webSocketSessionOutgoingMessages: 4
        }
      }
      if (requestType === "GetRecordStatus") {
        return {
          outputActive: true,
          outputPaused: false,
          outputTimecode: "00:00:12.345",
          outputDuration: 12345,
          outputBytes: 67890
        }
      }
      if (requestType === "GetSceneItemEnabled") {
        return { sceneItemEnabled: true }
      }
      if (requestType === "GetSceneItemIndex") {
        return { sceneItemIndex: 2 }
      }
      if (requestType === "GetSceneItemBlendMode") {
        return { sceneItemBlendMode: "OBS_BLEND_LIGHTEN" }
      }
      if (requestType === "GetSourceActive") {
        return { videoActive: true, videoShowing: false }
      }
      return { sceneName: "Intro", sceneUuid: "scene-intro" }
    }))
    await expect(client.callTool({ name: "get_current_scene", arguments: {} }))
      .resolves.toMatchObject({ structuredContent: { sceneName: "Intro", sceneUuid: "scene-intro" } })
    await expect(client.callTool({ name: "get_obs_stats", arguments: {} }))
      .resolves.toMatchObject({
        structuredContent: {
          cpuUsage: 4,
          memoryUsage: 256,
          availableDiskSpace: 4096,
          activeFps: 30,
          averageFrameRenderTime: 2,
          renderSkippedFrames: 1,
          renderTotalFrames: 100,
          outputSkippedFrames: 2,
          outputTotalFrames: 90,
          webSocketSessionIncomingMessages: 3,
          webSocketSessionOutgoingMessages: 4
        }
      })
    await expect(client.callTool({ name: "get_record_status", arguments: {} }))
      .resolves.toMatchObject({
        structuredContent: {
          outputActive: true,
          outputPaused: false,
          outputTimecode: "00:00:12.345",
          outputDuration: 12345,
          outputBytes: 67890
        }
      })
    await expect(client.callTool({
      name: "get_scene_item_enabled",
      arguments: { sceneName: "Scene", sceneItemId: 42 }
    })).resolves.toMatchObject({ structuredContent: { sceneItemEnabled: true } })
    await expect(client.callTool({
      name: "set_scene_item_enabled",
      arguments: { sceneName: "Scene", sceneItemId: 42, sceneItemEnabled: false }
    })).resolves.toMatchObject({ structuredContent: { sceneItemEnabled: false, updated: true } })
    await expect(client.callTool({
      name: "get_scene_item_index",
      arguments: { sceneName: "Scene", sceneItemId: 42 }
    })).resolves.toMatchObject({ structuredContent: { sceneItemIndex: 2 } })
    await expect(client.callTool({
      name: "get_scene_item_blend_mode",
      arguments: { sceneUuid: "scene-uuid", sceneItemId: 42 }
    })).resolves.toMatchObject({ structuredContent: { sceneItemBlendMode: "OBS_BLEND_LIGHTEN" } })
    await expect(client.callTool({
      name: "set_scene_item_index",
      arguments: { sceneName: "Scene", sceneItemId: 42, sceneItemIndex: 3 }
    })).resolves.toMatchObject({ structuredContent: { sceneItemIndex: 3, updated: true } })
    await expect(client.callTool({
      name: "set_scene_item_blend_mode",
      arguments: { sceneUuid: "scene-uuid", sceneItemId: 42, sceneItemBlendMode: "OBS_BLEND_MULTIPLY" }
    })).resolves.toMatchObject({ structuredContent: { sceneItemBlendMode: "OBS_BLEND_MULTIPLY", updated: true } })
    await expect(client.callTool({
      name: "get_source_active",
      arguments: { sourceName: "Camera" }
    })).resolves.toMatchObject({
      structuredContent: { sourceName: "Camera", videoActive: true, videoShowing: false }
    })
  })

  it("returns structured recent safe OBS events", async () => {
    const client = await connect(
      obsClient(
        async () => ({}),
        allAvailableRequests,
        {
          capacity: 3,
          droppedEvents: 0,
          events: [{
            sequence: 1,
            eventType: "CurrentProgramSceneChanged",
            eventIntent: EventSubscription.Scenes,
            eventData: { sceneName: "Intro", sceneUuid: "scene-intro" }
          }]
        }
      ),
      { ...config, enabledToolsets: ["events"] }
    )

    await expect(client.callTool({
      name: "get_recent_obs_events",
      arguments: { order: "oldest_first", categories: ["scenes"] }
    })).resolves.toMatchObject({
      structuredContent: {
        capacity: 3,
        droppedEvents: 0,
        returnedEvents: 1,
        order: "oldest_first",
        events: [{
          sequence: 1,
          eventType: "CurrentProgramSceneChanged",
          category: "scenes",
          eventData: { sceneName: "Intro", sceneUuid: "scene-intro" }
        }]
      }
    })
  })

  it("rejects invalid recent event limits before reading the buffer", async () => {
    const client = await connect(obsClient(async () => ({})), { ...config, enabledToolsets: ["events"] })
    await expect(client.callTool({ name: "get_recent_obs_events", arguments: { limit: 0 } }))
      .resolves.toMatchObject({
        isError: true,
        _meta: {
          error: {
            code: ErrorCode.InvalidParams
          }
        }
      })
  })

  it("rejects invalid scene item IDs before OBS scene-item state requests", async () => {
    const requested: Array<ObsRequestType> = []
    const client = await connect(obsClient(async (requestType) => {
      requested.push(requestType)
      return {}
    }))

    await expect(client.callTool({
      name: "get_scene_item_locked",
      arguments: { sceneName: "Scene", sceneItemId: -1 }
    })).resolves.toMatchObject({
      isError: true,
      content: [{ type: "text" }],
      _meta: {
        error: {
          code: ErrorCode.InvalidParams
        }
      }
    })
    expect(requested).toEqual([])
  })

  it("rejects invalid scene item mutation values before OBS requests", async () => {
    const requested: Array<ObsRequestType> = []
    const client = await connect(obsClient(async (requestType) => {
      requested.push(requestType)
      return {}
    }))

    await expect(client.callTool({
      name: "set_scene_item_index",
      arguments: { sceneName: "Scene", sceneItemId: 1, sceneItemIndex: -1 }
    })).resolves.toMatchObject({
      isError: true,
      _meta: {
        error: {
          code: ErrorCode.InvalidParams
        }
      }
    })
    await expect(client.callTool({
      name: "set_scene_item_blend_mode",
      arguments: { sceneName: "Scene", sceneItemId: 1, sceneItemBlendMode: "invalid" }
    })).resolves.toMatchObject({
      isError: true,
      _meta: {
        error: {
          code: ErrorCode.InvalidParams
        }
      }
    })
    expect(requested).toEqual([])
  })

  it("reports malformed scene item getter responses as internal errors", async () => {
    const client = await connect(obsClient(async (requestType) => {
      if (requestType === "GetSceneItemLocked") {
        return { sceneItemLocked: "not-a-boolean" }
      }
      return {}
    }))

    await expect(client.callTool({
      name: "get_scene_item_locked",
      arguments: { sceneName: "Scene", sceneItemId: 1 }
    })).resolves.toMatchObject({
      isError: true,
      _meta: {
        error: {
          code: ErrorCode.InternalError
        }
      }
    })
  })

  it("rejects extra arguments for no-arg status tools", async () => {
    const client = await connect(obsClient(async () => ({})))
    await expect(client.callTool({ name: "get_obs_stats", arguments: { unexpected: true } }))
      .resolves.toMatchObject({
        isError: true,
        content: [{ type: "text" }]
      })
    await expect(client.callTool({ name: "get_record_status", arguments: { unexpected: true } }))
      .resolves.toMatchObject({
        isError: true,
        content: [{ type: "text" }]
      })
  })

  it("returns structured success content for record pause tools", async () => {
    const client = await connect(
      obsClient(async () => ({})),
      { ...config, enabledToolsets: ["record"] }
    )
    await expect(client.callTool({ name: "pause_record", arguments: {} }))
      .resolves.toMatchObject({
        structuredContent: {
          requestedAction: "pause",
          requestType: "PauseRecord",
          acknowledged: true
        }
      })
  })

  it("returns structured success content for record lifecycle tools", async () => {
    const client = await connect(
      obsClient(async (requestType) => {
        if (requestType === "StopRecord") {
          return { outputPath: "/opaque/obs-recording.mkv" }
        }
        if (requestType === "ToggleRecord") {
          return { outputActive: true }
        }
        return {}
      }),
      { ...config, enabledToolsets: ["record"] }
    )
    await expect(client.callTool({ name: "start_record", arguments: {} }))
      .resolves.toMatchObject({
        structuredContent: {
          requestType: "StartRecord",
          acknowledged: true
        }
      })
    await expect(client.callTool({ name: "stop_record", arguments: {} }))
      .resolves.toMatchObject({
        structuredContent: {
          requestType: "StopRecord",
          acknowledged: true,
          outputPath: "/opaque/obs-recording.mkv"
        }
      })
    await expect(client.callTool({ name: "toggle_record", arguments: {} }))
      .resolves.toMatchObject({
        structuredContent: {
          outputActive: true
        }
      })
  })

  it("returns structured success content for record file and chapter tools", async () => {
    const requested: Array<ObsRequestType> = []
    const client = await connect(
      obsClient(async (requestType) => {
        requested.push(requestType)
        return {}
      }),
      { ...config, enabledToolsets: ["record"] }
    )
    await expect(client.callTool({ name: "split_record_file", arguments: {} }))
      .resolves.toMatchObject({
        structuredContent: {
          requestType: "SplitRecordFile",
          acknowledged: true
        }
      })
    await expect(client.callTool({ name: "create_record_chapter", arguments: { chapterName: "Act 1" } }))
      .resolves.toMatchObject({
        structuredContent: {
          requestType: "CreateRecordChapter",
          acknowledged: true
        }
      })
    expect(requested).toEqual(["SplitRecordFile", "CreateRecordChapter"])
  })

  it("rejects extra arguments for record pause tools before OBS mutation", async () => {
    const requested: Array<ObsRequestType> = []
    const client = await connect(
      obsClient(async (requestType) => {
        requested.push(requestType)
        return {}
      }),
      { ...config, enabledToolsets: ["record"] }
    )
    for (
      const name of [
        "start_record",
        "stop_record",
        "toggle_record",
        "split_record_file",
        "pause_record",
        "resume_record",
        "toggle_record_pause"
      ]
    ) {
      await expect(client.callTool({ name, arguments: { unexpected: true } }))
        .resolves.toMatchObject({ isError: true })
    }
    expect(requested).toEqual([])
  })

  it("rejects empty record chapter names before OBS mutation", async () => {
    const requested: Array<ObsRequestType> = []
    const client = await connect(
      obsClient(async (requestType) => {
        requested.push(requestType)
        return {}
      }),
      { ...config, enabledToolsets: ["record"] }
    )
    await expect(client.callTool({ name: "create_record_chapter", arguments: { chapterName: "" } }))
      .resolves.toMatchObject({
        isError: true,
        _meta: {
          error: {
            code: ErrorCode.InvalidParams
          }
        }
      })
    expect(requested).toEqual([])
  })

  it("rejects unexpected record chapter arguments before OBS mutation", async () => {
    const requested: Array<ObsRequestType> = []
    const client = await connect(
      obsClient(async (requestType) => {
        requested.push(requestType)
        return {}
      }),
      { ...config, enabledToolsets: ["record"] }
    )
    await expect(
      client.callTool({
        name: "create_record_chapter",
        arguments: { chapterName: "Act 1", unexpected: true }
      })
    ).resolves.toMatchObject({
      isError: true,
      _meta: {
        error: {
          code: ErrorCode.InvalidParams
        }
      }
    })
    expect(requested).toEqual([])
  })

  it("returns structured stream lifecycle content", async () => {
    const client = await connect(
      obsClient(async (requestType) => {
        if (requestType === "GetStreamStatus") {
          return {
            outputActive: true,
            outputReconnecting: false,
            outputTimecode: "00:00:12.345",
            outputDuration: 12345,
            outputCongestion: 0,
            outputBytes: 4096,
            outputSkippedFrames: 0,
            outputTotalFrames: 740
          }
        }
        if (requestType === "ToggleStream") {
          return { outputActive: false }
        }
        return {}
      }),
      { ...config, enabledToolsets: ["stream"] }
    )
    await expect(client.callTool({ name: "get_stream_status", arguments: {} }))
      .resolves.toMatchObject({ structuredContent: { outputActive: true, outputTotalFrames: 740 } })
    await expect(client.callTool({ name: "start_stream", arguments: {} }))
      .resolves.toMatchObject({ structuredContent: { outputActive: true } })
    await expect(client.callTool({ name: "stop_stream", arguments: {} }))
      .resolves.toMatchObject({ structuredContent: { outputActive: false } })
    await expect(client.callTool({ name: "toggle_stream", arguments: {} }))
      .resolves.toMatchObject({ structuredContent: { outputActive: false } })
    await expect(client.callTool({ name: "send_stream_caption", arguments: { captionText: "Live caption" } }))
      .resolves.toMatchObject({
        structuredContent: {
          requestType: "SendStreamCaption",
          acknowledged: true
        }
      })
  })

  it("rejects empty stream captions before OBS mutation", async () => {
    const requested: Array<ObsRequestType> = []
    const client = await connect(
      obsClient(async (requestType) => {
        requested.push(requestType)
        return {}
      }),
      { ...config, enabledToolsets: ["stream"] }
    )
    await expect(client.callTool({ name: "send_stream_caption", arguments: { captionText: "" } }))
      .resolves.toMatchObject({
        isError: true,
        _meta: {
          error: {
            code: ErrorCode.InvalidParams
          }
        }
      })
    expect(requested).toEqual([])
  })

  it("returns structured virtual camera status and switch results", async () => {
    const client = await connect(
      obsClient(async (requestType) => {
        if (requestType === "GetVirtualCamStatus" || requestType === "ToggleVirtualCam") {
          return { outputActive: true }
        }
        return {}
      }),
      { ...config, enabledToolsets: ["outputs"] }
    )
    await expect(client.callTool({ name: "get_virtual_cam_status", arguments: {} }))
      .resolves.toMatchObject({ structuredContent: { outputActive: true } })
    await expect(client.callTool({ name: "toggle_virtual_cam", arguments: {} }))
      .resolves.toMatchObject({ structuredContent: { outputActive: true, switched: true } })
  })

  it("returns structured replay buffer lifecycle results", async () => {
    const client = await connect(
      obsClient(async (requestType) => {
        if (requestType === "GetReplayBufferStatus") {
          return { outputActive: false }
        }
        if (requestType === "ToggleReplayBuffer") {
          return { outputActive: true }
        }
        if (requestType === "GetLastReplayBufferReplay") {
          return { savedReplayPath: "/opaque/replay-buffer.mp4" }
        }
        return {}
      }),
      { ...config, enabledToolsets: ["outputs"] }
    )
    await expect(client.callTool({ name: "get_replay_buffer_status", arguments: {} }))
      .resolves.toMatchObject({ structuredContent: { outputActive: false } })
    await expect(client.callTool({ name: "start_replay_buffer", arguments: {} }))
      .resolves.toMatchObject({ structuredContent: { outputActive: true } })
    await expect(client.callTool({ name: "stop_replay_buffer", arguments: {} }))
      .resolves.toMatchObject({ structuredContent: { outputActive: false } })
    await expect(client.callTool({ name: "toggle_replay_buffer", arguments: {} }))
      .resolves.toMatchObject({ structuredContent: { outputActive: true } })
    await expect(client.callTool({ name: "save_replay_buffer", arguments: {} }))
      .resolves.toMatchObject({
        structuredContent: {
          requestType: "SaveReplayBuffer",
          acknowledged: true
        }
      })
    await expect(client.callTool({ name: "get_last_replay_buffer_replay", arguments: {} }))
      .resolves.toMatchObject({
        structuredContent: {
          savedReplayPath: "/opaque/replay-buffer.mp4"
        }
      })
  })

  it("keeps OBS status metadata in actual tools/call error results", async () => {
    const client = await connect(obsClient(async () => {
      throw new ObsRequestError("SetCurrentProgramScene", 608, "Parameter: sceneName")
    }))
    await expect(client.callTool({ name: "set_current_scene", arguments: { sceneName: "Missing" } }))
      .resolves.toMatchObject({
        isError: true,
        _meta: {
          error: {
            code: ErrorCode.InvalidParams,
            requestType: "SetCurrentProgramScene",
            obsStatusCode: 608,
            comment: "Parameter: sceneName"
          }
        }
      })
  })

  it("keeps OBS status metadata for record file tool errors", async () => {
    const client = await connect(obsClient(async (requestType) => {
      if (requestType === "CreateRecordChapter") {
        throw new ObsRequestError("CreateRecordChapter", 703, "Chapter markers unavailable")
      }
      throw new ObsRequestError("SplitRecordFile", 703, "Recording not active")
    }))
    await expect(client.callTool({ name: "split_record_file", arguments: {} }))
      .resolves.toMatchObject({
        isError: true,
        _meta: {
          error: {
            code: ErrorCode.InvalidParams,
            requestType: "SplitRecordFile",
            obsStatusCode: 703,
            comment: "Recording not active"
          }
        }
      })
    await expect(client.callTool({ name: "create_record_chapter", arguments: { chapterName: "Act 1" } }))
      .resolves.toMatchObject({
        isError: true,
        _meta: {
          error: {
            code: ErrorCode.InvalidParams,
            requestType: "CreateRecordChapter",
            obsStatusCode: 703,
            comment: "Chapter markers unavailable"
          }
        }
      })
  })

  it("keeps OBS status metadata for replay buffer save and metadata errors", async () => {
    const client = await connect(
      obsClient(async (requestType) => {
        if (requestType === "GetLastReplayBufferReplay") {
          throw new ObsRequestError("GetLastReplayBufferReplay", 703, "No replay has been saved")
        }
        throw new ObsRequestError("SaveReplayBuffer", 703, "Replay buffer is not active")
      }),
      { ...config, enabledToolsets: ["outputs"] }
    )
    await expect(client.callTool({ name: "save_replay_buffer", arguments: {} }))
      .resolves.toMatchObject({
        isError: true,
        _meta: {
          error: {
            code: ErrorCode.InvalidParams,
            requestType: "SaveReplayBuffer",
            obsStatusCode: 703,
            comment: "Replay buffer is not active"
          }
        }
      })
    await expect(client.callTool({ name: "get_last_replay_buffer_replay", arguments: {} }))
      .resolves.toMatchObject({
        isError: true,
        _meta: {
          error: {
            code: ErrorCode.InvalidParams,
            requestType: "GetLastReplayBufferReplay",
            obsStatusCode: 703,
            comment: "No replay has been saved"
          }
        }
      })
  })

  it("keeps OBS status metadata for stream caption errors", async () => {
    const client = await connect(
      obsClient(async () => {
        throw new ObsRequestError("SendStreamCaption", 703, "Stream output is not active")
      }),
      { ...config, enabledToolsets: ["stream"] }
    )
    await expect(client.callTool({ name: "send_stream_caption", arguments: { captionText: "Live caption" } }))
      .resolves.toMatchObject({
        isError: true,
        _meta: {
          error: {
            code: ErrorCode.InvalidParams,
            requestType: "SendStreamCaption",
            obsStatusCode: 703,
            comment: "Stream output is not active"
          }
        }
      })
  })

  it("returns tool errors without success-schema structured content", async () => {
    const client = await connect(obsClient(async () => ({})))
    await expect(client.callTool({ name: "get_current_scene", arguments: {} }))
      .resolves.toMatchObject({
        isError: true,
        content: [{ type: "text" }]
      })
    await expect(client.callTool({ name: "get_current_scene", arguments: {} }))
      .resolves.not.toHaveProperty("structuredContent")
  })

  it("returns unknown tools as tool errors", async () => {
    const client = await connect(obsClient(async () => ({})))
    await expect(client.callTool({ name: "missing_tool", arguments: {} }))
      .resolves.toMatchObject({ isError: true })
  })
})
