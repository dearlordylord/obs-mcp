import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

import { reportStdioStartupFailure } from "../../src/mcp/stdio-diagnostics.js"

describe("stdio diagnostics", () => {
  it("writes startup failures to stderr without touching stdout", () => {
    let stderrWrites: ReadonlyArray<string> = []
    let stdoutWrites: ReadonlyArray<string> = []
    let exitCodes: ReadonlyArray<number> = []
    const stderr = {
      write: (message: string): boolean => {
        stderrWrites = [...stderrWrites, message]
        return true
      }
    }
    const stdout = {
      write: (message: string): boolean => {
        stdoutWrites = [...stdoutWrites, message]
        return true
      }
    }
    const exit = (code: number): void => {
      exitCodes = [...exitCodes, code]
    }

    reportStdioStartupFailure(new Error("boom"), { stderr, stdout }, exit)

    expect(stderrWrites).toEqual(["obs-mcp failed: boom\n"])
    expect(stdoutWrites).toEqual([])
    expect(exitCodes).toEqual([1])
  })

  it("formats non-error startup failures on stderr only", () => {
    let stderrWrites: ReadonlyArray<string> = []
    let stdoutWrites: ReadonlyArray<string> = []
    let exitCodes: ReadonlyArray<number> = []
    const stderr = {
      write: (message: string): boolean => {
        stderrWrites = [...stderrWrites, message]
        return true
      }
    }
    const stdout = {
      write: (message: string): boolean => {
        stdoutWrites = [...stdoutWrites, message]
        return true
      }
    }
    const exit = (code: number): void => {
      exitCodes = [...exitCodes, code]
    }

    reportStdioStartupFailure("boom", { stderr, stdout }, exit)

    expect(stderrWrites).toEqual(["obs-mcp failed: boom\n"])
    expect(stdoutWrites).toEqual([])
    expect(exitCodes).toEqual([1])
  })

  it("keeps raw, event, and batch code paths free of direct stdout writes", () => {
    const checkedFiles = [
      "../../src/mcp/create-mcp-server.ts",
      "../../src/mcp/tools/batch.ts",
      "../../src/mcp/tools/events.ts",
      "../../src/mcp/tools/vendor.ts",
      "../../src/obs/operations/batch.ts",
      "../../src/obs/operations/events.ts",
      "../../src/obs/operations/vendor.ts"
    ]

    for (const file of checkedFiles) {
      const source = readFileSync(new URL(file, import.meta.url), "utf8")
      expect(source, file).not.toContain("console.log")
      expect(source, file).not.toContain("process.stdout")
    }
  })
})
