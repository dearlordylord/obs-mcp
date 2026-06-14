import { Client } from "@modelcontextprotocol/sdk/client/index.js"
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js"
import type { Transport } from "@modelcontextprotocol/sdk/shared/transport.js"
import { ResourceUpdatedNotificationSchema } from "@modelcontextprotocol/sdk/types.js"
import { Option } from "effect"
import { afterEach, describe, expect, it } from "vitest"

import type { ObsConfig } from "../../src/config/config.js"
import { createObsMcpResourceState, createObsMcpServer } from "../../src/mcp/create-mcp-server.js"
import { type RunningHttpTransport, startHttpTransport, stopHttpTransport } from "../../src/mcp/http-transport.js"
import type { ObsEventListener } from "../../src/obs/events.js"
import { EventSubscription } from "../../src/obs/protocol.js"
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
  options: {
    readonly authToken?: string | undefined
    readonly sessionMode?: "stateful" | "stateless" | undefined
    readonly sessionIdleTimeoutMs?: number | undefined
  } = {}
): Promise<RunningHttpTransport> => {
  const obs = fakeObsClient(handler, allAvailableRequests)
  const running = await startHttpTransport({
    host: "127.0.0.1",
    port: 0,
    authToken: options.authToken,
    sessionMode: options.sessionMode,
    sessionIdleTimeoutMs: options.sessionIdleTimeoutMs
  }, () => createObsMcpServer(config, obs))
  runningTransports.push(running)
  return running
}

describe("HTTP MCP transport", () => {
  it("serves MCP tools over stateful Streamable HTTP by default", async () => {
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
    const transport = new StreamableHTTPClientTransport(new URL(running.url))
    clients.push(client)
    await client.connect(transport as Transport)

    expect(transport.sessionId).toEqual(expect.any(String))
    expect(client.getServerCapabilities()?.resources).toEqual({ subscribe: true })
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

  it("delivers resource update notifications to subscribed stateful HTTP clients", async () => {
    const eventListeners: Array<ObsEventListener> = []
    const obs = fakeObsClient(async () => ({}), allAvailableRequests, undefined, undefined, eventListeners)
    const running = await startHttpTransport({
      host: "127.0.0.1",
      port: 0
    }, () => createObsMcpServer(config, obs))
    runningTransports.push(running)

    const client = new Client({ name: "http-subscription-test-client", version: "0.0.0" })
    clients.push(client)
    const updated = new Promise<string>((resolve) => {
      client.setNotificationHandler(ResourceUpdatedNotificationSchema, (notification) => {
        resolve(notification.params.uri)
      })
    })

    await client.connect(new StreamableHTTPClientTransport(new URL(running.url)) as Transport)
    expect(client.getServerCapabilities()?.resources).toEqual({ subscribe: true })
    await client.subscribeResource({ uri: "obs://scenes" })
    await new Promise((resolve) => setTimeout(resolve, 20))
    eventListeners[0]?.({
      eventData: { sceneName: "Intro", sceneUuid: "scene-intro" },
      eventIntent: EventSubscription.Scenes,
      eventType: "CurrentProgramSceneChanged",
      sequence: 1
    })

    await expect(updated).resolves.toBe("obs://scenes")
  })

  it("does not expire stateful HTTP sessions while a subscription stream is active", async () => {
    const running = await startTestHttpTransport(async () => ({}), { sessionIdleTimeoutMs: 50 })
    const client = new Client({ name: "http-idle-subscription-test-client", version: "0.0.0" })
    clients.push(client)

    await client.connect(new StreamableHTTPClientTransport(new URL(running.url)) as Transport)
    await client.subscribeResource({ uri: "obs://scenes" })
    await new Promise((resolve) => setTimeout(resolve, 120))

    await expect(client.listTools()).resolves.toMatchObject({ tools: expect.any(Array) })
  })

  it("stops stateful HTTP transport while a subscription stream is active", async () => {
    const running = await startTestHttpTransport(async () => ({}))
    const client = new Client({ name: "http-stop-subscription-test-client", version: "0.0.0" })
    clients.push(client)
    await client.connect(new StreamableHTTPClientTransport(new URL(running.url)) as Transport)
    await client.subscribeResource({ uri: "obs://scenes" })

    await expect(Promise.race([
      stopHttpTransport(running).then(() => "stopped"),
      new Promise((resolve) => setTimeout(() => resolve("timeout"), 1_000))
    ])).resolves.toBe("stopped")
  })

  it("terminates stateful HTTP sessions with DELETE and rejects later session requests", async () => {
    const running = await startTestHttpTransport(async () => ({}))
    const client = new Client({ name: "http-delete-test-client", version: "0.0.0" })
    const transport = new StreamableHTTPClientTransport(new URL(running.url))
    clients.push(client)
    await client.connect(transport as Transport)
    const sessionId = transport.sessionId
    expect(sessionId).toEqual(expect.any(String))

    await transport.terminateSession()

    await expect(fetch(running.url, {
      method: "POST",
      headers: {
        "accept": "application/json, text/event-stream",
        "content-type": "application/json",
        "mcp-session-id": sessionId ?? ""
      },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list", params: {} })
    })).resolves.toMatchObject({ status: 404 })
  })

  it("does not terminate stateful HTTP sessions when DELETE is rejected", async () => {
    const running = await startTestHttpTransport(async () => ({}))
    const client = new Client({ name: "http-rejected-delete-test-client", version: "0.0.0" })
    const transport = new StreamableHTTPClientTransport(new URL(running.url))
    clients.push(client)
    await client.connect(transport as Transport)
    expect(transport.sessionId).toEqual(expect.any(String))

    await expect(fetch(running.url, {
      method: "DELETE",
      headers: {
        "mcp-protocol-version": "1900-01-01",
        "mcp-session-id": transport.sessionId ?? ""
      }
    })).resolves.toMatchObject({ status: 400 })

    await expect(client.listTools()).resolves.toMatchObject({ tools: expect.any(Array) })
  })

  it("shares resource state across stateless HTTP requests without advertising subscriptions", async () => {
    const obs = fakeObsClient(async (requestType) =>
      requestType === "GetSourceScreenshot"
        ? { imageData: "data:image/png;base64,dGVzdA==" }
        : {}
    )
    const resourceState = createObsMcpResourceState()
    const running = await startHttpTransport({
      host: "127.0.0.1",
      port: 0,
      sessionMode: "stateless"
    }, () =>
      createObsMcpServer(
        {
          ...config,
          enabledToolsets: ["screenshots"]
        },
        obs,
        {
          enableResourceSubscriptions: false,
          resourceState
        }
      ))
    runningTransports.push(running)

    const client = new Client({ name: "http-resource-test-client", version: "0.0.0" })
    clients.push(client)
    await client.connect(new StreamableHTTPClientTransport(new URL(running.url)) as Transport)

    expect(client.getServerCapabilities()?.resources).toEqual({})
    await client.callTool({
      name: "get_source_screenshot",
      arguments: { imageFormat: "png", sourceName: "Intro" }
    })
    const latest = await client.readResource({ uri: "obs://screenshots/latest" })
    expect(latest.contents).toContainEqual(expect.objectContaining({
      text: expect.stringContaining("\"base64Data\":\"dGVzdA==\"")
    }))
  })

  it("accepts bearer auth and rejects missing bearer auth", async () => {
    const running = await startTestHttpTransport(async () => ({}), { authToken: "secret-token" })

    await expect(fetch(running.url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list", params: {} })
    })).resolves.toMatchObject({ status: 401 })

    await expect(fetch(running.url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "mcp-session-id": "missing-session"
      },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list", params: {} })
    })).resolves.toMatchObject({ status: 401 })

    await expect(fetch(running.url, {
      method: "POST",
      headers: {
        "authorization": "Bearer secret-token",
        "content-type": "application/json",
        "mcp-session-id": "missing-session"
      },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list", params: {} })
    })).resolves.toMatchObject({ status: 404 })

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
    const running = await startTestHttpTransport(async () => ({}), { sessionMode: "stateless" })

    await expect(fetch(running.url, { method: "GET" })).resolves.toMatchObject({ status: 405 })
    await expect(fetch(running.url, { method: "DELETE" })).resolves.toMatchObject({ status: 405 })
  })

  it("reports missing stateful HTTP session IDs for GET and DELETE with 400", async () => {
    const running = await startTestHttpTransport(async () => ({}))

    await expect(fetch(running.url, { method: "GET" })).resolves.toMatchObject({ status: 400 })
    await expect(fetch(running.url, { method: "DELETE" })).resolves.toMatchObject({ status: 400 })
  })
})
