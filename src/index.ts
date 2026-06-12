#!/usr/bin/env node
import { runStdioServer } from "./mcp/server.js"

runStdioServer().catch((error) => {
  const message = error instanceof Error ? error.message : String(error)
  process.stderr.write(`obs-mcp failed: ${message}\n`)
  process.exitCode = 1
})
