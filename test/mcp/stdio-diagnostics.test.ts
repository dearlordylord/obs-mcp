import { afterEach, describe, expect, it } from "vitest"

import { reportStdioStartupFailure } from "../../src/mcp/stdio-diagnostics.js"

describe("stdio diagnostics", () => {
  const previousExitCode = process.exitCode

  afterEach(() => {
    process.exitCode = previousExitCode
  })

  it("writes startup failures to stderr without touching stdout", () => {
    let stderrWrites: ReadonlyArray<string> = []
    let stdoutWrites: ReadonlyArray<string> = []
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

    process.exitCode = undefined
    reportStdioStartupFailure(new Error("boom"), { stderr, stdout })

    expect(stderrWrites).toEqual(["obs-mcp failed: boom\n"])
    expect(stdoutWrites).toEqual([])
    expect(process.exitCode).toBe(1)
  })

  it("formats non-error startup failures on stderr only", () => {
    let stderrWrites: ReadonlyArray<string> = []
    let stdoutWrites: ReadonlyArray<string> = []
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

    process.exitCode = undefined
    reportStdioStartupFailure("boom", { stderr, stdout })

    expect(stderrWrites).toEqual(["obs-mcp failed: boom\n"])
    expect(stdoutWrites).toEqual([])
    expect(process.exitCode).toBe(1)
  })
})
