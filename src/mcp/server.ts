import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js"
import { Effect } from "effect"

import {
  DEFAULT_MCP_HTTP_HOST,
  DEFAULT_MCP_HTTP_PORT,
  loadObsConfigFromEnv,
  type ObsConfig,
  redactedObsWebSocketUrl
} from "../config/config.js"
import {
  type RunningCapabilityDiscoveryObsServer,
  startCapabilityDiscoveryObsServer
} from "../obs/capability-discovery-server.js"
import { createObsClient, type ObsClient } from "../obs/client.js"
import { createObsMcpResourceState, createObsMcpServer } from "./create-mcp-server.js"
import { startHttpTransport, stopHttpTransport } from "./http-transport.js"

interface ObsRuntime {
  readonly config: ObsConfig
  readonly client: ObsClient
  readonly discoveryServer?: RunningCapabilityDiscoveryObsServer | undefined
}

const createObsRuntime = async (
  config: ObsRuntime["config"]
): Promise<ObsRuntime> => {
  if (config.lazyEnvs !== true) {
    return { config, client: await createObsClient(config) }
  }
  const discoveryServer = await startCapabilityDiscoveryObsServer()
  const discoveryConfig = { ...config, url: discoveryServer.url }
  try {
    return {
      config: discoveryConfig,
      client: await createObsClient(discoveryConfig),
      discoveryServer
    }
  } catch (error) {
    await discoveryServer.close()
    throw error
  }
}

const closeObsRuntime = async (runtime: ObsRuntime): Promise<void> => {
  await runtime.client.close()
  await runtime.discoveryServer?.close()
}

const waitForStdioAutoExit = async (): Promise<void> =>
  new Promise((resolve) => {
    const cleanup = (): void => {
      process.stdin.off("end", cleanup)
      process.stdin.off("close", cleanup)
      resolve()
    }
    process.stdin.once("end", cleanup)
    process.stdin.once("close", cleanup)
  })

const runStdioServer = async (config: ObsRuntime["config"]): Promise<void> => {
  const runtime = await createObsRuntime(config)
  const { client } = runtime
  const server = createObsMcpServer(config, client)

  process.stderr.write(`obs-mcp connected to ${redactedObsWebSocketUrl(runtime.config.url)}\n`)
  if (runtime.discoveryServer !== undefined) {
    process.stderr.write("obs-mcp using capability discovery mode; live OBS automation is disabled\n")
  }
  const shutdown = config.mcpAutoExit === true
    ? Promise.race([waitForStdioAutoExit(), waitForShutdownSignal()])
    : waitForShutdownSignal()
  try {
    await server.connect(new StdioServerTransport())
    await shutdown
  } finally {
    await server.close().catch(() => undefined)
    await closeObsRuntime(runtime)
  }
}

const waitForShutdownSignal = async (): Promise<void> =>
  new Promise((resolve) => {
    const cleanup = (): void => {
      process.off("SIGINT", cleanup)
      process.off("SIGTERM", cleanup)
      resolve()
    }
    process.once("SIGINT", cleanup)
    process.once("SIGTERM", cleanup)
  })

const runHttpServer = async (config: ObsRuntime["config"]): Promise<void> => {
  const runtime = await createObsRuntime(config)
  const { client } = runtime
  const resourceState = createObsMcpResourceState()
  const transport = await startHttpTransport({
    host: config.mcpHttpHost ?? DEFAULT_MCP_HTTP_HOST,
    port: config.mcpHttpPort ?? DEFAULT_MCP_HTTP_PORT,
    authToken: config.mcpHttpAuthToken
  }, () =>
    createObsMcpServer(config, client, {
      enableResourceSubscriptions: false,
      resourceState
    }))

  process.stderr.write(`obs-mcp connected to ${redactedObsWebSocketUrl(runtime.config.url)}\n`)
  if (runtime.discoveryServer !== undefined) {
    process.stderr.write("obs-mcp using capability discovery mode; live OBS automation is disabled\n")
  }
  process.stderr.write(`obs-mcp HTTP listening on ${transport.url}\n`)

  try {
    await waitForShutdownSignal()
  } finally {
    await stopHttpTransport(transport)
    await closeObsRuntime(runtime)
  }
}

export const runMcpServer = async (): Promise<void> => {
  const config = await Effect.runPromise(loadObsConfigFromEnv(process.env))
  if ((config.mcpTransport ?? "stdio") === "http") {
    await runHttpServer(config)
    return
  }
  await runStdioServer(config)
}
