import { Client } from "@modelcontextprotocol/sdk/client/index.js"
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js"
import { ErrorCode } from "@modelcontextprotocol/sdk/types.js"
import { Option, Schema } from "effect"
import { afterEach, describe, expect, it } from "vitest"

import type { ObsConfig } from "../../src/config/config.js"
import { createObsMcpServer } from "../../src/mcp/create-mcp-server.js"
import { createObsClient, type ObsClient } from "../../src/obs/client.js"
import { ObsRequestError } from "../../src/obs/errors.js"
import type { ObsRequestType } from "../../src/obs/requests.js"
import { FakeObsServer } from "../obs/fake-obs-server.js"

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

const allAvailableRequests = [
  "GetVersion",
  "GetStats",
  "GetSceneList",
  "GetCurrentProgramScene",
  "SetCurrentProgramScene",
  "GetSceneItemList",
  "GetGroupSceneItemList",
  "GetSceneItemId",
  "GetSceneItemSource",
  "GetSceneItemEnabled",
  "SetSceneItemEnabled",
  "GetSceneItemLocked",
  "SetSceneItemLocked",
  "GetSceneItemIndex",
  "GetSceneItemBlendMode",
  "SetSceneItemIndex",
  "SetSceneItemBlendMode",
  "GetInputList",
  "GetInputKindList",
  "GetSpecialInputs",
  "GetVirtualCamStatus",
  "StartVirtualCam",
  "StopVirtualCam",
  "ToggleVirtualCam",
  "GetRecordStatus",
  "PauseRecord",
  "ResumeRecord",
  "ToggleRecordPause",
  "GetStreamStatus",
  "StartStream",
  "StopStream",
  "ToggleStream"
]

const obsClient = (
  handler: (requestType: ObsRequestType) => Promise<unknown>,
  availableRequests: ReadonlyArray<string> = allAvailableRequests
): ObsClient => ({
  negotiatedRpcVersion: 1,
  availableRequests,
  request: async (descriptor) =>
    Schema.decodeUnknownSync(descriptor.responseSchema)(await handler(descriptor.requestType)),
  close: async () => undefined
})

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
      "list_inputs",
      "list_input_kinds",
      "get_special_inputs",
      "get_record_status",
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
      "get_obs_stats"
    ])
  })

  it("hides record pause tools when fake OBS does not advertise the pause capabilities", async () => {
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
  })

  it("lists stream tools only when the stream toolset and OBS capabilities are available", async () => {
    const client = await connect(
      obsClient(async () => ({}), [
        "GetStreamStatus",
        "StartStream",
        "StopStream",
        "ToggleStream"
      ]),
      { ...config, enabledToolsets: ["stream"] }
    )
    const tools = await client.listTools()
    expect(tools.tools.map((tool) => tool.name)).toEqual([
      "get_stream_status",
      "start_stream",
      "stop_stream",
      "toggle_stream"
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
      "get_special_inputs"
    ])
    await expect(client.callTool({ name: "list_inputs", arguments: { inputKind: "wasapi_input_capture" } }))
      .resolves.toMatchObject({ structuredContent: { inputs: [{ inputName: "Mic/Aux" }] } })
    await expect(client.callTool({ name: "list_input_kinds", arguments: { unversioned: true } }))
      .resolves.toMatchObject({ structuredContent: { inputKinds: ["wasapi_input_capture"] } })
    await expect(client.callTool({ name: "get_special_inputs", arguments: {} }))
      .resolves.toMatchObject({ structuredContent: { desktop2: null, mic2: null } })
  })

  it("does not list output tools when the outputs toolset is disabled", async () => {
    const client = await connect(obsClient(async () => ({})), { ...config, enabledToolsets: ["scenes"] })
    const tools = await client.listTools()
    expect(tools.tools.map((tool) => tool.name)).not.toContain("get_virtual_cam_status")
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

  it("rejects extra arguments for record pause tools before OBS mutation", async () => {
    const requested: Array<ObsRequestType> = []
    const client = await connect(
      obsClient(async (requestType) => {
        requested.push(requestType)
        return {}
      }),
      { ...config, enabledToolsets: ["record"] }
    )
    for (const name of ["pause_record", "resume_record", "toggle_record_pause"]) {
      await expect(client.callTool({ name, arguments: { unexpected: true } }))
        .resolves.toMatchObject({ isError: true })
    }
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
