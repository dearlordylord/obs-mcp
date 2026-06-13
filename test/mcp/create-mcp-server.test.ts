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
  enabledToolsets: ["general", "record", "scenes"]
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
  "GetRecordStatus",
  "PauseRecord",
  "ResumeRecord",
  "ToggleRecordPause"
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
