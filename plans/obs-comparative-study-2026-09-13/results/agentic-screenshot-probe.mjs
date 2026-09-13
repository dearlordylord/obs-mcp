import { mkdir, writeFile } from "node:fs/promises"
import { FakeObs, PNG_BASE64, SYNTHETIC_PASSWORD, officialProtocolIdentity } from "../fixture/fake-obs.mjs"
import { McpProcess } from "../fixture/mcp-process.mjs"

const binary = "/tmp/obs-polyglot-study.1UfDPr/agentic/agentic-obs"
const home = "/tmp/obs-polyglot-study.1UfDPr/agentic-fixed-home"
const fixtureSources = {
  "fake-obs.mjs": "6c87648ea0ade612e75d60a349a827f9ed422bab3454f81f1d52f8dd17bcef75",
  "mcp-process.mjs": "0dc1a6d6549546548ff11774f882e95700a230d9df6ad91b650137d1fae43b88"
}

const run = async (enabled, name, port) => {
  const fake = await FakeObs.start()
  const temp = `/tmp/obs-agentic-screenshot-${name}`
  await mkdir(temp, { recursive: true })
  const process = McpProcess.start({
    command: binary,
    env: {
      HOME: home,
      AGENTIC_OBS_DB: `${home}/.agentic-obs/db.sqlite`,
      OBS_HOST: "127.0.0.1",
      OBS_PORT: String(new URL(fake.url).port),
      OBS_PASSWORD: SYNTHETIC_PASSWORD,
      AGENTIC_OBS_HTTP_ENABLED: String(enabled),
      AGENTIC_OBS_HTTP_PORT: String(port)
    }
  }, { home, tempDirectory: temp, defaultTimeoutMs: 10_000 })
  let outcome
  try {
    await process.initialize(30_000)
    await process.listTools()
    const created = await process.callTool("create_screenshot_source", {
      name,
      source_name: "Main",
      cadence_ms: 100,
      image_format: "png"
    })
    if (!enabled) {
      outcome = { result: "unexpected response", created }
    } else {
      await new Promise((resolve) => setTimeout(resolve, 750))
      const resource = await process.request("resources/read", { uri: `obs://screenshot/${name}` })
      const content = resource?.contents?.[0]
      const blob = content?.blob ?? ""
      outcome = {
        result: blob === PNG_BASE64 ? "pass" : "fail",
        mimeType: content?.mimeType,
        bytes: Buffer.from(blob, "base64").length,
        pngMagic: Buffer.from(blob, "base64").subarray(0, 8).toString("hex"),
        created
      }
    }
  } catch (error) {
    const stderrLines = process.stderr.join("").split("\n").filter(Boolean)
    outcome = {
      result: enabled ? "error" : "process panic",
      error: error.message,
      panicEvidence: stderrLines.filter((line) => /panic:|nil pointer|GetAddr|handleCreateScreenshotSource/.test(line)).slice(0, 8),
      stderrTail: stderrLines.slice(-12)
    }
  } finally {
    await process.stop()
    await fake.close()
  }
  return { ...outcome, obsRequests: fake.requests }
}

const stamp = Date.now().toString(36)
const httpDisabled = await run(false, `disabled-${stamp}`, 18765)
const httpEnabled = await run(true, `enabled-${stamp}`, 18766)
const output = {
  observedAt: "2026-09-13",
  fixtureVersion: "2026-09-13.5",
  fixtureSources,
  officialProtocol: officialProtocolIdentity,
  httpDisabled,
  httpEnabled
}
await writeFile(new URL("./agentic-screenshot-probes.json", import.meta.url), `${JSON.stringify(output, null, 2)}\n`)
