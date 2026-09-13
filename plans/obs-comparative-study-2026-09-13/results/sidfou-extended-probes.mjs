import { mkdtemp, mkdir, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { FakeObs, SYNTHETIC_PASSWORD, SYNTHETIC_STREAM_KEY } from "../fixture/fake-obs.mjs"
import { McpProcess } from "../fixture/mcp-process.mjs"

const root = await mkdtemp(join(tmpdir(), "obs-study-sidfou-"))
const home = join(root, "home")
const tempDirectory = join(root, "tmp")
await Promise.all([mkdir(home), mkdir(tempDirectory)])

const fake = await FakeObs.start()
const port = String(new URL(fake.url).port)
const process = McpProcess.start({
  command: "/tmp/obs-sidfou-pKc7OU/repo/.venv/bin/obs-stream-mcp",
  args: ["--no-sse"],
  env: {
    OBS_HOST: "127.0.0.1",
    OBS_PORT: port,
    OBS_PASSWORD: SYNTHETIC_PASSWORD
  }
}, { home, tempDirectory, defaultTimeoutMs: 10_000 })

const outcomes = []
try {
  await process.initialize()
  await process.listTools()
  await process.callTool("obs_connect", {})
  for (const call of [
    { tool: "obs_get_stream_settings", arguments: {} },
    { tool: "obs_stop_stream", arguments: { confirmed: false } },
    { tool: "obs_set_source_visibility", arguments: { scene_name: "Main", source_name: "Mic/Aux", visible: false } },
    { tool: "build_starting_soon_scene", arguments: { scene_name: "Fixture Starting Soon", switch_to: false } }
  ]) {
    const before = fake.requests.length
    try {
      const result = await process.callTool(call.tool, call.arguments)
      outcomes.push({ ...call, result, obsRequests: fake.requests.slice(before) })
    } catch (error) {
      outcomes.push({ ...call, error: error.message, obsRequests: fake.requests.slice(before) })
    }
  }
} finally {
  await process.stop()
  await fake.close()
}

const serialized = JSON.stringify({
  schemaVersion: 1,
  fixtureVersion: "2026-09-13.5",
  streamKeyRedacted: !JSON.stringify(outcomes[0]?.result ?? {}).includes(SYNTHETIC_STREAM_KEY),
  outcomes,
  fixtureUnimplemented: fake.fixtureUnimplemented,
  stdoutNoise: process.stdoutNoise
}, null, 2)
await writeFile(new URL("./sidfou-extended-probes.json", import.meta.url), `${serialized}\n`)
