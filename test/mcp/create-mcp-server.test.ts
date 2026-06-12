import { Client } from "@modelcontextprotocol/sdk/client/index.js"
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js"
import { ErrorCode } from "@modelcontextprotocol/sdk/types.js"
import { Option, Schema } from "effect"
import { afterEach, describe, expect, it } from "vitest"

import type { ObsConfig } from "../../src/config/config.js"
import { createObsMcpServer } from "../../src/mcp/create-mcp-server.js"
import type { ObsClient } from "../../src/obs/client.js"
import { ObsRequestError } from "../../src/obs/errors.js"
import type { ObsRequestType } from "../../src/obs/requests.js"

const config: ObsConfig = {
  url: "ws://localhost:4455/",
  password: Option.none(),
  connectionTimeoutMs: 300,
  enabledToolsets: ["scenes"]
}

const clients: Array<Client> = []
const servers: Array<ReturnType<typeof createObsMcpServer>> = []

const allAvailableRequests = ["GetVersion", "GetSceneList", "GetCurrentProgramScene", "SetCurrentProgramScene"]

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

const connect = async (obs: ObsClient): Promise<Client> => {
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair()
  const server = createObsMcpServer(config, obs)
  const client = new Client({ name: "test-client", version: "0.0.0" })
  servers.push(server)
  clients.push(client)
  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)])
  return client
}

afterEach(async () => {
  await Promise.all(clients.splice(0).map((client) => client.close().catch(() => undefined)))
  await Promise.all(servers.splice(0).map((server) => server.close().catch(() => undefined)))
})

describe("MCP server protocol handlers", () => {
  it("lists tools with Effect JSON Schema generated input and output schemas", async () => {
    const client = await connect(obsClient(async () => ({})))
    const tools = await client.listTools()
    expect(tools.tools.map((tool) => tool.name)).toEqual([
      "get_obs_context",
      "get_version",
      "list_scenes",
      "get_current_scene",
      "set_current_scene"
    ])
    expect(tools.tools.find((tool) => tool.name === "set_current_scene")?.inputSchema.required).toEqual(["sceneName"])
    expect(tools.tools.find((tool) => tool.name === "get_current_scene")?.outputSchema?.properties)
      .toHaveProperty("sceneName")
  })

  it("lists only context and available capability-backed tools", async () => {
    const client = await connect(obsClient(async () => ({}), ["GetVersion"]))
    const tools = await client.listTools()
    expect(tools.tools.map((tool) => tool.name)).toEqual(["get_obs_context", "get_version"])
  })

  it("returns structured success content", async () => {
    const client = await connect(obsClient(async () => ({ sceneName: "Intro", sceneUuid: "scene-intro" })))
    await expect(client.callTool({ name: "get_current_scene", arguments: {} }))
      .resolves.toMatchObject({ structuredContent: { sceneName: "Intro", sceneUuid: "scene-intro" } })
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
