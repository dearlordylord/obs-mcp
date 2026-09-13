#!/usr/bin/env node
import { createHash } from "node:crypto"
import readline from "node:readline"

import WebSocket from "ws"

const hash = (value) => createHash("sha256").update(value).digest("base64")
const socket = new WebSocket(process.env.OBS_WEBSOCKET_URL)
let nextRequest = 1
let readyResolve
let readyReject
const ready = new Promise((resolve, reject) => { readyResolve = resolve; readyReject = reject })
const pending = new Map()

socket.on("message", (raw) => {
  const message = JSON.parse(raw.toString())
  if (message.op === 0) {
    const secret = hash(process.env.OBS_WEBSOCKET_PASSWORD + message.d.authentication.salt)
    const authentication = hash(secret + message.d.authentication.challenge)
    socket.send(JSON.stringify({ op: 1, d: { rpcVersion: 1, authentication } }))
  } else if (message.op === 2) readyResolve()
  else if (message.op === 7) {
    const entry = pending.get(message.d.requestId)
    if (!entry) return
    pending.delete(message.d.requestId)
    clearTimeout(entry.timer)
    if (message.d.requestStatus.result) entry.resolve(message.d.responseData ?? {})
    else entry.reject(new Error(`OBS ${message.d.requestStatus.code}: ${message.d.requestStatus.comment}`))
  }
})
socket.on("close", () => {
  const error = new Error("OBS disconnected")
  readyReject(error)
  for (const entry of pending.values()) { clearTimeout(entry.timer); entry.reject(error) }
  pending.clear()
})
socket.on("error", (error) => readyReject(error))

const obs = async (requestType, requestData) => {
  await ready
  const requestId = String(nextRequest++)
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => { pending.delete(requestId); reject(new Error("OBS request timeout after 300ms")) }, 300)
    pending.set(requestId, { resolve, reject, timer })
    socket.send(JSON.stringify({ op: 6, d: { requestType, requestId, ...(requestData === undefined ? {} : { requestData }) } }))
  })
}

const toolDefinitions = [
  ["get_version", {}, []], ["list_scenes", {}, []], ["get_current_scene", {}, []],
  ["set_current_scene", { sceneName: { type: "string" } }, ["sceneName"]],
  ["get_input_mute", { inputName: { type: "string" } }, ["inputName"]],
  ["set_input_mute", { inputName: { type: "string" }, inputMuted: { type: "boolean" } }, ["inputName", "inputMuted"]],
  ["start_record", {}, []], ["get_record_status", {}, []], ["stop_record", {}, []],
  ["get_source_screenshot", { sourceName: { type: "string" }, imageFormat: { type: "string" } }, ["sourceName", "imageFormat"]]
].map(([name, properties, required]) => ({ name, description: `Selftest ${name}`, inputSchema: { type: "object", properties, required, additionalProperties: false } }))

const call = async (name, args) => {
  switch (name) {
    case "get_version": return obs("GetVersion")
    case "list_scenes": return obs("GetSceneList")
    case "get_current_scene": return obs("GetCurrentProgramScene")
    case "set_current_scene":
      if (typeof args.sceneName !== "string" || !args.sceneName) throw new Error("sceneName is required")
      await obs("SetCurrentProgramScene", { sceneName: args.sceneName }); return { switched: true, sceneName: args.sceneName }
    case "get_input_mute": return obs("GetInputMute", { inputName: args.inputName })
    case "set_input_mute": await obs("SetInputMute", args); return { acknowledged: true }
    case "start_record": await obs("StartRecord"); return { acknowledged: true }
    case "get_record_status": return obs("GetRecordStatus")
    case "stop_record": return { ...(await obs("StopRecord")), acknowledged: true }
    case "get_source_screenshot": return obs("GetSourceScreenshot", args)
    default: throw new Error(`unknown tool ${name}`)
  }
}

const send = (message) => process.stdout.write(`${JSON.stringify(message)}\n`)
const lines = readline.createInterface({ input: process.stdin })
lines.on("line", async (line) => {
  const message = JSON.parse(line)
  if (message.id === undefined) return
  if (message.method === "initialize") {
    send({ jsonrpc: "2.0", id: message.id, result: { protocolVersion: message.params.protocolVersion, capabilities: { tools: {} }, serverInfo: { name: "fixture-selftest", version: "1" } } })
    return
  }
  if (message.method === "tools/list") {
    send({ jsonrpc: "2.0", id: message.id, result: { tools: toolDefinitions } })
    return
  }
  if (message.method === "tools/call") {
    try {
      const output = await call(message.params.name, message.params.arguments ?? {})
      send({ jsonrpc: "2.0", id: message.id, result: { content: [{ type: "text", text: JSON.stringify(output) }], structuredContent: output } })
    } catch (error) {
      send({ jsonrpc: "2.0", id: message.id, result: { content: [{ type: "text", text: error.message }], isError: true } })
    }
    return
  }
  send({ jsonrpc: "2.0", id: message.id, error: { code: -32601, message: "method not found" } })
})

