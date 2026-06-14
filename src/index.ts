#!/usr/bin/env node
import { runStdioServer } from "./mcp/server.js"
import { reportStdioStartupFailure } from "./mcp/stdio-diagnostics.js"

runStdioServer().catch((error) =>
  reportStdioStartupFailure(
    error,
    {
      stderr: process.stderr,
      stdout: process.stdout
    },
    (code) => process.exit(code)
  )
)
