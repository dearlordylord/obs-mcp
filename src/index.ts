#!/usr/bin/env node
import { runMcpServer } from "./mcp/server.js"
import { reportStdioStartupFailure } from "./mcp/stdio-diagnostics.js"

runMcpServer().catch((error) =>
  reportStdioStartupFailure(
    error,
    {
      stderr: process.stderr,
      stdout: process.stdout
    },
    (code) => process.exit(code)
  )
)
