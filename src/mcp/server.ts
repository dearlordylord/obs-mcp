import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js"
import { Effect } from "effect"

import {
  DEFAULT_MCP_HTTP_HOST,
  DEFAULT_MCP_HTTP_PORT,
  loadObsConfigFromEnv,
  redactedObsWebSocketUrl
} from "../config/config.js"
import { createObsClient } from "../obs/client.js"
import { createObsMcpServer } from "./create-mcp-server.js"
import { startHttpTransport, stopHttpTransport } from "./http-transport.js"

const runStdioServer = async (): Promise<void> => {
  const config = await Effect.runPromise(loadObsConfigFromEnv(process.env))
  const client = await createObsClient(config)
  const server = createObsMcpServer(config, client)

  process.stderr.write(`obs-mcp connected to ${redactedObsWebSocketUrl(config.url)}\n`)
  await server.connect(new StdioServerTransport())
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

const runHttpServer = async (): Promise<void> => {
  const config = await Effect.runPromise(loadObsConfigFromEnv(process.env))
  const client = await createObsClient(config)
  const transport = await startHttpTransport({
    host: config.mcpHttpHost ?? DEFAULT_MCP_HTTP_HOST,
    port: config.mcpHttpPort ?? DEFAULT_MCP_HTTP_PORT,
    authToken: config.mcpHttpAuthToken
  }, () => createObsMcpServer(config, client))

  process.stderr.write(`obs-mcp connected to ${redactedObsWebSocketUrl(config.url)}\n`)
  process.stderr.write(`obs-mcp HTTP listening on ${transport.url}\n`)

  try {
    await waitForShutdownSignal()
  } finally {
    await stopHttpTransport(transport)
    await client.close()
  }
}

export const runMcpServer = async (): Promise<void> => {
  const config = await Effect.runPromise(loadObsConfigFromEnv(process.env))
  if ((config.mcpTransport ?? "stdio") === "http") {
    await runHttpServer()
    return
  }
  await runStdioServer()
}
