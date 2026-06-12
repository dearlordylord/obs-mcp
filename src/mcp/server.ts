import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js"
import { Effect } from "effect"

import { loadObsConfigFromEnv, redactedObsWebSocketUrl } from "../config/config.js"
import { createObsClient } from "../obs/client.js"
import { createObsMcpServer } from "./create-mcp-server.js"

export const runStdioServer = async (): Promise<void> => {
  const config = await Effect.runPromise(loadObsConfigFromEnv(process.env))
  const client = await createObsClient(config)
  const server = createObsMcpServer(config, client)

  process.stderr.write(`obs-mcp connected to ${redactedObsWebSocketUrl(config.url)}\n`)
  await server.connect(new StdioServerTransport())
}
