import { mkdtemp, mkdir, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { FakeObs, SYNTHETIC_PASSWORD } from "../fixture/fake-obs.mjs"
import { McpProcess } from "../fixture/mcp-process.mjs"

const root = await mkdtemp(join(tmpdir(), "obs-study-giancarlo-"))
const home = join(root, "home")
const tempDirectory = join(root, "tmp")
await Promise.all([mkdir(home), mkdir(tempDirectory)])
const fake = await FakeObs.start()
const process = McpProcess.start({
  command: "node",
  args: ["server.js"],
  cwd: "/tmp/obs-giancarlo-1vWyaM/repo",
  env: { OBS_WEBSOCKET_URL: fake.url, OBS_WEBSOCKET_PASSWORD: SYNTHETIC_PASSWORD }
}, { home, tempDirectory, defaultTimeoutMs: 17_000 })
let outcome
try {
  await process.initialize()
  await process.listTools()
  fake.dropOnce("GetSceneList")
  const started = Date.now()
  const result = await process.callTool("obs_list_scenes", {}, 17_000)
  outcome = { elapsedMs: Date.now() - started, result, obsRequests: fake.requests }
} catch (error) {
  outcome = { error: error.message, obsRequests: fake.requests }
} finally {
  await process.stop()
  await fake.close()
}
await writeFile(new URL("./giancarlo-timeout-probe.json", import.meta.url), `${JSON.stringify({ schemaVersion: 1, fixtureVersion: "2026-09-13.5", outcome }, null, 2)}\n`)
