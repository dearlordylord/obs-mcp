import { mkdtemp, mkdir, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { FakeObs, SYNTHETIC_PASSWORD } from "../fixture/fake-obs.mjs"
import { McpProcess } from "../fixture/mcp-process.mjs"

const root = await mkdtemp(join(tmpdir(), "obs-study-workflows-"))

const run = async (id, launch, calls) => {
  const home = join(root, `${id}-home`)
  const tempDirectory = join(root, `${id}-tmp`)
  await Promise.all([mkdir(home), mkdir(tempDirectory)])
  const fake = await FakeObs.start()
  const process = McpProcess.start(launch(fake), { home, tempDirectory, defaultTimeoutMs: 10_000 })
  const outcomes = []
  try {
    await process.initialize()
    await process.listTools()
    for (const call of calls) {
      const before = fake.requests.length
      try {
        const result = await process.callTool(call.tool, call.arguments, call.timeoutMs)
        outcomes.push({ ...call, result, obsRequests: fake.requests.slice(before) })
      } catch (error) {
        outcomes.push({ ...call, error: error.message, obsRequests: fake.requests.slice(before) })
      }
    }
    return {
      id,
      outcomes,
      stateChanges: fake.stateChanges,
      fixtureUnimplemented: fake.fixtureUnimplemented,
      stdoutNoise: process.stdoutNoise
    }
  } finally {
    await process.stop()
    await fake.close()
  }
}

const results = []
results.push(await run("aaron", (fake) => ({
  command: "/tmp/obs-aaron-TqsKC1/repo/.venv/bin/obs-studio-mcp",
  env: {
    OBS_MCP_HOST: "127.0.0.1",
    OBS_MCP_PORT: String(new URL(fake.url).port),
    OBS_MCP_PASSWORD: SYNTHETIC_PASSWORD,
    OBS_MCP_SECRETS: "env"
  }
}), [
  { tool: "switch_scene", arguments: { scene: "Main", dry_run: true } },
  { tool: "set_mute", arguments: { input_name: "Mic/Aux", muted: true, dry_run: true } },
  { tool: "start_record", arguments: { dry_run: true } },
  { tool: "screenshot_source", arguments: { source: "Main", file_path: join(root, "dry.png"), dry_run: true } },
  { tool: "set_video_settings", arguments: { output_width: 1280, dry_run: true } }
]))

results.push(await run("xdark", (fake) => ({
  command: "/tmp/obs-xdark-CQiKZs/repo/.venv/bin/obs-mcp",
  env: {
    OBS_HOST: "127.0.0.1",
    OBS_PORT: String(new URL(fake.url).port),
    OBS_PASSWORD: SYNTHETIC_PASSWORD
  }
}), [
  { tool: "diagnose_av_health", arguments: {} },
  { tool: "clean_audio_input", arguments: { input_name: "Mic/Aux" } }
]))

await writeFile(new URL("./aaron-xdark-workflow-extended-probes.json", import.meta.url), `${JSON.stringify({ schemaVersion: 1, results }, null, 2)}\n`)
