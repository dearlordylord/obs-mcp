#!/usr/bin/env node
import assert from "node:assert/strict"
import { createHash } from "node:crypto"
import { mkdtemp, readFile, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { runStudy } from "./runner.mjs"
import { FakeObs, SYNTHETIC_PASSWORD } from "./fake-obs.mjs"
import { decodeMsgpack, encodeMsgpack } from "./msgpack.mjs"
import WebSocket from "ws"

const adapter = JSON.parse(await readFile(new URL("./adapters/selftest.json", import.meta.url), "utf8"))
adapter.launch.cwd = new URL("./adapters/", import.meta.url).pathname
const output = await mkdtemp(join(tmpdir(), "obs-fixture-selftest-output-"))
try {
  const msgpackValue = { op: 6, d: { requestType: "SetInputMute", requestData: { inputName: "Mic/Aux", inputMuted: true } } }
  assert.deepEqual(decodeMsgpack(encodeMsgpack(msgpackValue)), msgpackValue, "MessagePack envelope roundtrip")
  const msgpackServer = await FakeObs.start()
  try {
    await new Promise((resolveHandshake, rejectHandshake) => {
      const socket = new WebSocket(msgpackServer.url, "obswebsocket.msgpack")
      const timer = setTimeout(() => rejectHandshake(new Error("MessagePack handshake timeout")), 2000)
      socket.on("error", rejectHandshake)
      socket.on("message", (raw) => {
        const message = decodeMsgpack(raw)
        if (message.op === 0) {
          const secret = createHash("sha256").update(SYNTHETIC_PASSWORD + message.d.authentication.salt).digest("base64")
          const authentication = createHash("sha256").update(secret + message.d.authentication.challenge).digest("base64")
          socket.send(encodeMsgpack({ op: 1, d: { rpcVersion: 1, authentication } }))
        } else if (message.op === 2) {
          socket.send(encodeMsgpack({ op: 6, d: { requestType: "GetVersion", requestId: "selftest-msgpack" } }))
        } else if (message.op === 7) {
          try {
            assert.equal(message.d.requestStatus.result, true)
            assert.equal(message.d.responseData.obsVersion, "31.1.0")
            clearTimeout(timer)
            socket.close()
            resolveHandshake()
          } catch (error) { rejectHandshake(error) }
        }
      })
    })
  } finally {
    await msgpackServer.close()
  }
  const { result } = await runStudy(adapter, output)
  const byName = new Map(result.probes.map((entry) => [entry.name, entry]))
  for (const name of [
    "initialize", "tools_list", "version", "scenes", "scene_mutation_readback", "mute_mutation_readback",
    "record_lifecycle", "screenshot", "invalid_arguments", "unknown_entity", "obs_error_propagation",
    "missing_response_watchdog", "in_flight_disconnect", "reduced_capabilities"
  ]) assert.equal(byName.get(name)?.status, "pass", `${name}: ${JSON.stringify(byName.get(name))}`)
  assert.equal(JSON.stringify(result).includes("fixture-only-password-OBS-2026"), false, "synthetic password leaked")
  assert.ok(result.mcp.exchanges.length > 10, "MCP exchanges were not captured")
  assert.ok(result.fixture.requests.length > 10, "OBS requests were not captured")
  process.stdout.write(`fixture selftest passed (${result.probes.length} probes)\n`)
} finally {
  await rm(output, { recursive: true, force: true })
}
