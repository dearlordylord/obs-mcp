import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process"
import { readFile, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join, resolve } from "node:path"
import { createInterface } from "node:readline"

const TIMEOUT_MS = 10_000
const MIN_EXPECTED_TOOL_COUNT = 100

interface JsonRpcResponse {
  readonly id?: unknown
  readonly result?: {
    readonly serverInfo?: {
      readonly name?: unknown
      readonly version?: unknown
    }
    readonly tools?: ReadonlyArray<unknown>
  }
  readonly error?: unknown
}

const packageJson = JSON.parse(await readFile("package.json", "utf8")) as { readonly version?: unknown }
const expectedVersion = typeof packageJson.version === "string" ? packageJson.version : undefined

if (expectedVersion === undefined) {
  throw new Error("package.json version must be a string")
}

const [tarballArg] = process.argv.slice(2)
if (tarballArg === undefined) {
  throw new Error("Usage: tsx scripts/package-smoke.ts <packed-package.tgz>")
}

const tarballPath = resolve(tarballArg)

const execute = async (command: string, args: ReadonlyArray<string>, cwd: string): Promise<void> =>
  new Promise((resolvePromise, reject) => {
    const child = spawn(command, [...args], {
      cwd,
      env: process.env,
      stdio: ["ignore", "pipe", "pipe"]
    })
    let stdout = ""
    let stderr = ""
    child.stdout.setEncoding("utf8")
    child.stderr.setEncoding("utf8")
    child.stdout.on("data", (chunk: string) => {
      stdout += chunk
    })
    child.stderr.on("data", (chunk: string) => {
      stderr += chunk
    })
    child.once("error", reject)
    child.once("exit", (code) => {
      if (code === 0) {
        resolvePromise()
        return
      }
      reject(new Error(`${command} ${args.join(" ")} failed with code ${code}\nstdout:\n${stdout}\nstderr:\n${stderr}`))
    })
  })

const waitForResponses = async (
  child: ChildProcessWithoutNullStreams,
  expectedIds: ReadonlySet<unknown>
): Promise<ReadonlyMap<unknown, JsonRpcResponse>> =>
  new Promise((resolveResponses, reject) => {
    const responses = new Map<unknown, JsonRpcResponse>()
    const lines = createInterface({ input: child.stdout })
    const timer = setTimeout(() => {
      cleanup()
      reject(new Error("Timed out waiting for MCP smoke responses"))
    }, TIMEOUT_MS)
    const cleanup = (): void => {
      clearTimeout(timer)
      lines.close()
      child.off("exit", onExit)
      child.off("error", onError)
    }
    const onExit = (code: number | null): void => {
      cleanup()
      reject(new Error(`obs-mcp exited before smoke responses with code ${code}`))
    }
    const onError = (error: Error): void => {
      cleanup()
      reject(error)
    }
    lines.on("line", (line) => {
      if (line.trim().length === 0) {
        return
      }
      try {
        const response = JSON.parse(line) as JsonRpcResponse
        if (expectedIds.has(response.id)) {
          responses.set(response.id, response)
        }
      } catch (error) {
        cleanup()
        reject(error)
        return
      }
      if (responses.size === expectedIds.size) {
        cleanup()
        resolveResponses(responses)
      }
    })
    child.once("exit", onExit)
    child.once("error", onError)
  })

const stopChild = async (child: ChildProcessWithoutNullStreams): Promise<void> => {
  if (child.exitCode !== null || child.signalCode !== null) {
    return
  }
  child.kill("SIGTERM")
  await new Promise<void>((resolveStop) => {
    const timer = setTimeout(() => {
      child.kill("SIGKILL")
      resolveStop()
    }, 2_000)
    child.once("exit", () => {
      clearTimeout(timer)
      resolveStop()
    })
  })
}

const assertInitializeResponse = (response: JsonRpcResponse | undefined): void => {
  const serverInfo = response?.result?.serverInfo
  if (response?.error !== undefined) {
    throw new Error(`Initialize failed: ${JSON.stringify(response.error)}`)
  }
  if (serverInfo?.name !== "io.github.dearlordylord/obs-mcp") {
    throw new Error(`Unexpected server name: ${String(serverInfo?.name)}`)
  }
  if (serverInfo.version !== expectedVersion) {
    throw new Error(`Unexpected server version: ${String(serverInfo.version)}; expected ${expectedVersion}`)
  }
}

const assertToolListResponse = (response: JsonRpcResponse | undefined): void => {
  if (response?.error !== undefined) {
    throw new Error(`Tool listing failed: ${JSON.stringify(response.error)}`)
  }
  const toolCount = response?.result?.tools?.length ?? 0
  if (toolCount < MIN_EXPECTED_TOOL_COUNT) {
    throw new Error(`Expected at least ${MIN_EXPECTED_TOOL_COUNT} tools in package smoke, got ${toolCount}`)
  }
}

const smokeDir = await fsMkTemp()
let child: ChildProcessWithoutNullStreams | undefined

try {
  await writeFile(join(smokeDir, "package.json"), "{\"private\":true,\"type\":\"module\"}\n", "utf8")
  await execute("pnpm", ["add", "--silent", tarballPath], smokeDir)
  child = spawn("pnpm", ["exec", "obs-mcp"], {
    cwd: smokeDir,
    env: {
      ...process.env,
      LAZY_ENVS: "true",
      MCP_AUTO_EXIT: "true",
      OBS_WEBSOCKET_CONNECTION_TIMEOUT: "5000"
    },
    stdio: ["pipe", "pipe", "pipe"]
  })
  child.stderr.setEncoding("utf8")
  child.stderr.on("data", (chunk: string) => {
    process.stderr.write(chunk)
  })
  child.stdin.write(`${JSON.stringify({
    jsonrpc: "2.0",
    method: "initialize",
    params: {
      protocolVersion: "2024-11-05",
      capabilities: {},
      clientInfo: { name: "package-smoke", version: "1.0.0" }
    },
    id: 1
  })}\n`)
  child.stdin.write(`${JSON.stringify({
    jsonrpc: "2.0",
    method: "tools/list",
    params: {},
    id: 2
  })}\n`)
  const responses = await waitForResponses(child, new Set([1, 2]))
  assertInitializeResponse(responses.get(1))
  assertToolListResponse(responses.get(2))
  child.stdin.end()
  process.stdout.write(`Packed package initialized obs-mcp ${expectedVersion} and listed tools\n`)
} finally {
  if (child !== undefined) {
    await stopChild(child)
  }
  await rm(smokeDir, { force: true, recursive: true })
}

async function fsMkTemp(): Promise<string> {
  const { mkdtemp } = await import("node:fs/promises")
  return mkdtemp(join(tmpdir(), "obs-mcp-package-smoke-"))
}
