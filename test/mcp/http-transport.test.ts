import { Client } from "@modelcontextprotocol/sdk/client/index.js"
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js"
import type { Transport } from "@modelcontextprotocol/sdk/shared/transport.js"
import { Option } from "effect"
import { afterEach, describe, expect, it } from "vitest"

import type { ObsConfig } from "../../src/config/config.js"
import { createObsMcpServer } from "../../src/mcp/create-mcp-server.js"
import { type RunningHttpTransport, startHttpTransport, stopHttpTransport } from "../../src/mcp/http-transport.js"
import type { ObsRequestType } from "../../src/obs/requests.js"
import { allAvailableRequests, fakeObsClient } from "./fake-obs-client.js"

const config: ObsConfig = {
  url: "ws://localhost:4455/",
  password: Option.none(),
  connectionTimeoutMs: 300,
  enabledToolsets: ["general"]
}

const runningTransports: Array<RunningHttpTransport> = []
const clients: Array<Client> = []

afterEach(async () => {
  await Promise.all(clients.splice(0).map((client) => client.close().catch(() => undefined)))
  await Promise.all(runningTransports.splice(0).map((transport) => stopHttpTransport(transport).catch(() => undefined)))
})

const startTestHttpTransport = async (
  handler: (requestType: ObsRequestType, requestData: unknown) => Promise<unknown>,
  options: { readonly authToken?: string | undefined } = {}
): Promise<RunningHttpTransport> => {
  const obs = fakeObsClient(handler, allAvailableRequests)
  const running = await startHttpTransport({
    host: "127.0.0.1",
    port: 0,
    authToken: options.authToken
  }, () => createObsMcpServer(config, obs))
  runningTransports.push(running)
  return running
}

describe("HTTP MCP transport", () => {
  it("serves MCP tools over stateless Streamable HTTP", async () => {
    const running = await startTestHttpTransport(async (requestType) =>
      requestType === "GetVersion"
        ? {
          obsVersion: "31.0.0",
          obsWebSocketVersion: "5.6.0",
          rpcVersion: 1,
          availableRequests: allAvailableRequests,
          supportedImageFormats: ["png"],
          platform: "linux",
          platformDescription: "Linux"
        }
        : {}
    )
    const client = new Client({ name: "http-test-client", version: "0.0.0" })
    clients.push(client)
    await client.connect(new StreamableHTTPClientTransport(new URL(running.url)) as Transport)

    const tools = await client.listTools()
    expect(tools.tools.map((tool) => tool.name)).toEqual([
      "get_obs_context",
      "get_version",
      "get_obs_stats",
      "list_hotkeys",
      "trigger_hotkey_by_name",
      "trigger_hotkey_by_key_sequence"
    ])
    await expect(client.callTool({ name: "get_version", arguments: {} }))
      .resolves.toMatchObject({ structuredContent: { obsVersion: "31.0.0" } })
  })

  it("accepts bearer auth and rejects missing bearer auth", async () => {
    const running = await startTestHttpTransport(async () => ({}), { authToken: "secret-token" })

    await expect(fetch(running.url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list", params: {} })
    })).resolves.toMatchObject({ status: 401 })

    const client = new Client({ name: "http-auth-test-client", version: "0.0.0" })
    clients.push(client)
    await client.connect(
      new StreamableHTTPClientTransport(new URL(running.url), {
        requestInit: { headers: { authorization: "Bearer secret-token" } }
      }) as Transport
    )
    await expect(client.listTools()).resolves.toMatchObject({ tools: expect.any(Array) })
  })

  it("reports unsupported stateless HTTP methods with 405", async () => {
    const running = await startTestHttpTransport(async () => ({}))

    await expect(fetch(running.url, { method: "GET" })).resolves.toMatchObject({ status: 405 })
    await expect(fetch(running.url, { method: "DELETE" })).resolves.toMatchObject({ status: 405 })
  })
})
