#!/usr/bin/env node
import { createHash } from "node:crypto"
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { dirname, isAbsolute, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { inflateSync } from "node:zlib"

import {
  CORE_REQUESTS, FakeObs, PNG_BASE64, SYNTHETIC_PASSWORD, SYNTHETIC_STREAM_KEY, officialProtocolIdentity
} from "./fake-obs.mjs"
import { McpProcess } from "./mcp-process.mjs"

const fixtureDirectory = dirname(fileURLToPath(import.meta.url))
const fixtureVersion = "2026-09-13.5"
const statuses = new Set([
  "pass", "fail", "unsupported", "not_testable", "fixture_unimplemented", "environment_blocker",
  "invocation_mapping_error"
])

const usage = () => "node fixture/runner.mjs --adapter FILE --output DIRECTORY"

const parseArguments = (argv) => {
  const result = {}
  for (let index = 0; index < argv.length; index += 2) {
    const flag = argv[index]
    const value = argv[index + 1]
    if (flag === "--adapter") result.adapter = value
    else if (flag === "--output") result.output = value
    else throw new Error(`unknown or incomplete argument ${flag ?? ""}; ${usage()}`)
  }
  if (!result.adapter || !result.output) throw new Error(usage())
  return result
}

const validateAdapter = (adapter) => {
  if (adapter?.schemaVersion !== 1) throw new Error("adapter.schemaVersion must equal 1")
  if (typeof adapter.id !== "string" || !adapter.id) throw new Error("adapter.id must be a non-empty string")
  if (typeof adapter.launch?.command !== "string" || !adapter.launch.command) throw new Error("adapter.launch.command is required")
  if (adapter.operations === null || typeof adapter.operations !== "object") throw new Error("adapter.operations is required")
  for (const [name, operation] of Object.entries(adapter.operations)) {
    if (typeof operation?.tool !== "string" || !operation.tool) throw new Error(`operation ${name} requires tool`)
  }
}

const template = (value, variables) => {
  if (Array.isArray(value)) return value.map((entry) => template(entry, variables))
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, template(entry, variables)]))
  }
  if (typeof value !== "string") return value
  const exact = value.match(/^\{\{([A-Za-z][A-Za-z0-9]*)\}\}$/)
  if (exact) return variables[exact[1]]
  return value.replace(/\{\{([A-Za-z][A-Za-z0-9]*)\}\}/g, (_match, name) => String(variables[name] ?? ""))
}

const stringify = (value) => {
  try { return JSON.stringify(value) } catch { return String(value) }
}

const valuesForKeys = (value, keys, output = []) => {
  if (typeof value === "string" && /^[\s]*[\[{]/.test(value)) {
    try { valuesForKeys(JSON.parse(value), keys, output) } catch {}
  }
  if (Array.isArray(value)) for (const entry of value) valuesForKeys(entry, keys, output)
  else if (value !== null && typeof value === "object") {
    for (const [key, entry] of Object.entries(value)) {
      if (keys.includes(key.replaceAll("_", "").toLowerCase())) output.push(entry)
      valuesForKeys(entry, keys, output)
    }
  }
  return output
}

const reportsValue = (result, keys, expected) => valuesForKeys(result, keys).some((value) => value === expected)

const successfulToolResult = (result) => result !== undefined && result?.isError !== true
const toolErrorText = (outcome) => outcome.error?.message ?? stringify(outcome.result)

const probe = (name, status, evidence = {}) => {
  if (!statuses.has(status)) throw new Error(`invalid probe status ${status}`)
  return { name, status, ...evidence }
}

const pngMagic = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
const crcTable = Array.from({ length: 256 }, (_, value) => {
  let crc = value
  for (let bit = 0; bit < 8; bit += 1) crc = (crc & 1) ? (0xedb88320 ^ (crc >>> 1)) : (crc >>> 1)
  return crc >>> 0
})
const crc32 = (buffer) => {
  let crc = 0xffffffff
  for (const byte of buffer) crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8)
  return (crc ^ 0xffffffff) >>> 0
}
const validPng = (buffer) => {
  if (buffer.length < 45 || !buffer.subarray(0, 8).equals(pngMagic)) return false
  let offset = 8
  let width = 0
  let height = 0
  let sawHeader = false
  let sawEnd = false
  const idat = []
  while (offset + 12 <= buffer.length) {
    const length = buffer.readUInt32BE(offset)
    const chunkEnd = offset + 12 + length
    if (chunkEnd > buffer.length) return false
    const type = buffer.subarray(offset + 4, offset + 8)
    const data = buffer.subarray(offset + 8, offset + 8 + length)
    const expectedCrc = buffer.readUInt32BE(offset + 8 + length)
    if (crc32(Buffer.concat([type, data])) !== expectedCrc) return false
    const name = type.toString("ascii")
    if (name === "IHDR") {
      if (sawHeader || length !== 13) return false
      sawHeader = true
      width = data.readUInt32BE(0)
      height = data.readUInt32BE(4)
      if (width < 1 || height < 1) return false
    } else if (name === "IDAT") idat.push(data)
    else if (name === "IEND") {
      if (length !== 0 || chunkEnd !== buffer.length) return false
      sawEnd = true
      offset = chunkEnd
      break
    }
    offset = chunkEnd
  }
  if (!sawHeader || !sawEnd || idat.length === 0 || offset !== buffer.length) return false
  try { return inflateSync(Buffer.concat(idat)).length >= height } catch { return false }
}

const screenshotEvidence = async (result, workingDirectory) => {
  const text = stringify(result)
  const base64Candidates = [PNG_BASE64]
  for (const match of text.matchAll(/(?:base64,)?([A-Za-z0-9+/]{40,}={0,2})/g)) base64Candidates.push(match[1])
  for (const candidate of base64Candidates) {
    try {
      const decoded = Buffer.from(candidate, "base64")
      if (validPng(decoded) && text.includes(candidate)) return { valid: true, kind: "base64", bytes: decoded.length }
    } catch {}
  }
  const pathCandidates = [...text.matchAll(/(?:[A-Za-z]:[\\/]|\/)[^"'\n\r]+\.png/gi)].map((match) => match[0])
  for (const candidate of pathCandidates) {
    const path = isAbsolute(candidate) ? candidate : resolve(workingDirectory, candidate)
    try {
      const bytes = await readFile(path)
      if (validPng(bytes)) return { valid: true, kind: "file", bytes: bytes.length, path }
    } catch {}
  }
  return { valid: false }
}

const redact = (value, secrets) => {
  if (typeof value === "string") {
    let output = value
    for (const secret of secrets) if (secret) output = output.split(secret).join("[REDACTED_SYNTHETIC_SECRET]")
    return output
  }
  if (Array.isArray(value)) return value.map((entry) => redact(entry, secrets))
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, redact(entry, secrets)]))
  }
  return value
}

const runStudy = async (adapter, outputDirectory) => {
  validateAdapter(adapter)
  const tempRoot = await mkdtemp(join(tmpdir(), `obs-study-${adapter.id.replace(/[^a-z0-9_-]/gi, "-")}-`))
  const home = join(tempRoot, "home")
  const tempDirectory = join(tempRoot, "tmp")
  await Promise.all([mkdir(home), mkdir(tempDirectory)])
  const fake = await FakeObs.start()
  let mcp
  const probes = []
  const normalTimeoutMs = adapter.normalTimeoutMs ?? 10_000
  const documentedTimeoutMs = adapter.requestTimeoutMs ?? 10_000
  const watchdogMs = documentedTimeoutMs + (adapter.requestTimeoutMs === undefined ? 0 : 1_000)
  const variables = {
    obsUrl: fake.url,
    obsHost: "127.0.0.1",
    obsPort: Number(new URL(fake.url).port),
    obsPassword: SYNTHETIC_PASSWORD,
    sceneName: "Main",
    inputName: "Mic/Aux",
    inputMuted: true,
    sourceName: "Main",
    imageFormat: "png",
    tempDir: tempDirectory,
    home
  }
  let tools = []
  let initializeResult
  let observedScreenshotRequests = []

  const call = async (operationName, overrides = {}, timeoutMs = normalTimeoutMs) => {
    const operation = adapter.operations[operationName]
    if (!operation) return { unsupported: true }
    if (!tools.some((tool) => tool.name === operation.tool)) {
      return { mappingError: true, error: new Error(`adapter tool ${operation.tool} was not advertised`) }
    }
    try {
      const args = template(operation.arguments ?? {}, { ...variables, ...overrides })
      const result = await mcp.callTool(operation.tool, args, timeoutMs)
      return { result, success: successfulToolResult(result), args }
    } catch (error) {
      return { error, success: false }
    }
  }

  const operationProbe = (name, outcome, passed, evidence = {}) => {
    if (outcome.unsupported) return probe(name, "unsupported", evidence)
    if (outcome.mappingError) return probe(name, "invocation_mapping_error", { ...evidence, error: outcome.error.message })
    return probe(name, passed ? "pass" : "fail", {
      ...evidence,
      toolResult: outcome.result,
      ...(outcome.error ? { error: outcome.error.message, watchdogExpired: outcome.error.watchdog === true } : {})
    })
  }

  try {
    const launch = template(adapter.launch, variables)
    mcp = McpProcess.start(launch, { home, tempDirectory, defaultTimeoutMs: normalTimeoutMs })
    try {
      initializeResult = await mcp.initialize(Math.max(normalTimeoutMs, 30_000))
      const validInitialize = typeof initializeResult?.protocolVersion === "string"
        && initializeResult.protocolVersion.length > 0
        && initializeResult.capabilities !== null
        && typeof initializeResult.capabilities === "object"
        && typeof initializeResult.serverInfo?.name === "string"
        && typeof initializeResult.serverInfo?.version === "string"
      probes.push(probe("initialize", validInitialize ? "pass" : "fail", {
        requestedProtocolVersion: "2024-11-05",
        serverInfo: initializeResult?.serverInfo,
        protocolVersion: initializeResult?.protocolVersion,
        capabilities: initializeResult?.capabilities,
        ...(validInitialize ? {} : { error: "malformed initialize result" })
      }))
      if (!validInitialize) return await finish()
    } catch (error) {
      const environmental = /ENOENT|not found|cannot find|spawn/i.test(error.message)
      probes.push(probe("initialize", environmental ? "environment_blocker" : "fail", { error: error.message }))
      return await finish()
    }
    try {
      const listed = await mcp.listTools()
      tools = Array.isArray(listed?.tools) ? listed.tools : []
      probes.push(probe("tools_list", tools.length > 0 ? "pass" : "fail", {
        count: tools.length,
        tools: tools.map(({ name, inputSchema }) => ({ name, inputSchema }))
      }))
    } catch (error) {
      probes.push(probe("tools_list", "fail", { error: error.message }))
      return await finish()
    }
    for (const setup of adapter.setup ?? []) {
      const exists = tools.some((tool) => tool.name === setup.tool)
      if (!exists) {
        probes.push(probe(`setup:${setup.tool}`, "invocation_mapping_error", { error: "setup tool was not advertised" }))
        continue
      }
      try {
        const result = await mcp.callTool(setup.tool, template(setup.arguments ?? {}, variables))
        probes.push(probe(`setup:${setup.tool}`, successfulToolResult(result) ? "pass" : "fail", { toolResult: result }))
      } catch (error) {
        probes.push(probe(`setup:${setup.tool}`, "fail", { error: error.message }))
      }
    }
    const startupGraceMs = Math.min(Math.max(adapter.startupGraceMs ?? 250, 0), 2_000)
    if (startupGraceMs > 0) await new Promise((resolveGrace) => setTimeout(resolveGrace, startupGraceMs))

    let before = fake.requests.length
    const version = await call("getVersion")
    probes.push(operationProbe("version", version,
      version.success && fake.requests.slice(before).some((entry) => entry.requestType === "GetVersion")
        && stringify(version.result).includes("31.1.0"),
      { obsRequests: fake.requests.slice(before) }))

    before = fake.requests.length
    const scenes = await call("listScenes")
    probes.push(operationProbe("scenes", scenes,
      scenes.success && fake.requests.slice(before).some((entry) => entry.requestType === "GetSceneList"),
      { obsRequests: fake.requests.slice(before) }))

    before = fake.requests.length
    const setScene = await call("setCurrentScene", { sceneName: "Main" })
    const sceneReadback = adapter.operations.getCurrentScene ? await call("getCurrentScene") : await call("listScenes")
    probes.push(operationProbe("scene_mutation_readback", setScene,
      setScene.success && sceneReadback.success && fake.state.currentSceneName === "Main"
        && (adapter.operations.getCurrentScene
          ? reportsValue(sceneReadback.result, ["scenename", "currentscene", "currentprogramscenename"], "Main")
            || /current(?: program)? scene:\s*Main/i.test(stringify(sceneReadback.result))
          : reportsValue(sceneReadback.result, ["currentscene", "currentprogramscenename"], "Main")
            || /current(?: program)? scene:\s*Main/i.test(stringify(sceneReadback.result))),
      { readback: sceneReadback.result, obsRequests: fake.requests.slice(before), finalState: fake.state.currentSceneName }))

    before = fake.requests.length
    const setMute = await call("setInputMute", { inputMuted: true })
    const muteReadback = await call("getInputMute")
    probes.push(operationProbe("mute_mutation_readback", setMute,
      setMute.success && muteReadback.success && fake.state.inputs.get("Mic/Aux") === true
        && (reportsValue(muteReadback.result, ["inputmuted", "muted"], true)
          || /(?:is|input[^.]{0,80}) muted/i.test(stringify(muteReadback.result))),
      { readback: muteReadback.result, obsRequests: fake.requests.slice(before), finalState: fake.state.inputs.get("Mic/Aux") }))

    before = fake.requests.length
    const startRecord = await call("startRecord")
    const activeAfterStart = fake.state.recordActive
    const recordStatus = await call("getRecordStatus")
    const stopRecord = await call("stopRecord")
    probes.push(operationProbe("record_lifecycle", startRecord,
      startRecord.success && activeAfterStart && recordStatus.success
        && (reportsValue(recordStatus.result, ["outputactive", "recording", "active"], true)
          || /record(?:ing)?(?: is|:) active/i.test(stringify(recordStatus.result)))
        && stopRecord.success && !fake.state.recordActive,
      { statusResult: recordStatus.result, stopResult: stopRecord.result, obsRequests: fake.requests.slice(before), finalState: fake.state.recordActive }))

    before = fake.requests.length
    const screenshot = await call("getSourceScreenshot")
    const image = screenshot.success ? await screenshotEvidence(screenshot.result, adapter.launch.cwd ?? tempRoot) : { valid: false }
    observedScreenshotRequests = [...new Set(fake.requests.slice(before).map((entry) => entry.requestType))]
    probes.push(operationProbe("screenshot", screenshot,
      screenshot.success && image.valid,
      { image, obsRequests: fake.requests.slice(before) }))

    if (adapter.operations.getStreamServiceSettings) {
      before = fake.requests.length
      const streamSettings = await call("getStreamServiceSettings")
      probes.push(operationProbe("synthetic_secret_surface", streamSettings,
        streamSettings.success && fake.requests.slice(before).some((entry) => entry.requestType === "GetStreamServiceSettings"),
        { returnedSyntheticSecret: stringify(streamSettings.result).includes(SYNTHETIC_STREAM_KEY), obsRequests: fake.requests.slice(before) }))
    } else probes.push(probe("synthetic_secret_surface", "unsupported"))

    const invalid = await call("setCurrentScene", { sceneName: undefined })
    probes.push(operationProbe("invalid_arguments", invalid, !invalid.success, { observedError: toolErrorText(invalid) }))

    before = fake.requests.length
    const unknown = await call("setCurrentScene", { sceneName: "Missing Fixture Scene" })
    probes.push(operationProbe("unknown_entity", unknown,
      !unknown.success && (fake.requests.length === before
        || fake.requests.slice(before).some((entry) => entry.classification === "validation_error")),
      { observedError: toolErrorText(unknown), obsRequests: fake.requests.slice(before) }))

    fake.failOnce("SetCurrentProgramScene", 600, "Synthetic OBS rejection: scene locked")
    before = fake.requests.length
    const rejected = await call("setCurrentScene", { sceneName: "Intro" })
    probes.push(operationProbe("obs_error_propagation", rejected,
      !rejected.success && toolErrorText(rejected).includes("Synthetic OBS rejection"),
      { observedError: toolErrorText(rejected), obsRequests: fake.requests.slice(before) }))

    if (adapter.operations.listScenes) {
      fake.dropOnce("GetSceneList")
      before = fake.requests.length
      const timeout = await call("listScenes", {}, watchdogMs)
      const retried = fake.requests.slice(before).filter((entry) => entry.requestType === "GetSceneList").length > 1
      const boundedOrRecovered = timeout.success || (!timeout.error?.watchdog && !timeout.success)
      probes.push(operationProbe("missing_response_watchdog", timeout, boundedOrRecovered, {
        interpretation: timeout.error?.watchdog ? "no bounded response observed; this finite probe does not prove an indefinite hang" : timeout.success ? "candidate recovered a read-only request" : "candidate returned a bounded error",
        retried, watchdogMs, obsRequests: fake.requests.slice(before)
      }))
    } else probes.push(probe("missing_response_watchdog", "unsupported"))

    if (adapter.operations.setCurrentScene) {
      fake.disconnectOnce("SetCurrentProgramScene")
      before = fake.requests.length
      const disconnected = await call("setCurrentScene", { sceneName: "Intro" }, watchdogMs)
      const attempts = fake.requests.slice(before).filter((entry) => entry.requestType === "SetCurrentProgramScene").length
      probes.push(operationProbe("in_flight_disconnect", disconnected,
        disconnected.success || (!disconnected.success && !disconnected.error?.watchdog),
        {
          attempts,
          retriedAfterUnknownOutcome: attempts > 1,
          finalState: fake.state.currentSceneName,
          interpretation: "SetCurrentProgramScene is idempotent and the fixture disconnects before applying it; retry safety requires semantic review.",
          obsRequests: fake.requests.slice(before)
        }))
    } else probes.push(probe("in_flight_disconnect", "unsupported"))

    await mcp.stop()
    await runReducedCapabilities()
    return await finish()
  } catch (error) {
    probes.push(probe("runner_unexpected_error", "not_testable", { error: error.stack ?? error.message }))
    return await finish()
  }

  async function runReducedCapabilities() {
    const unavailableRequests = [...new Set(["GetSourceScreenshot", "SaveSourceScreenshot", ...observedScreenshotRequests])]
    const reduced = await FakeObs.start({ availableRequests: CORE_REQUESTS.filter((name) => !unavailableRequests.includes(name)) })
    const reducedTemp = join(tempRoot, "reduced")
    await mkdir(reducedTemp)
    const reducedVariables = {
      ...variables,
      obsUrl: reduced.url,
      obsPort: Number(new URL(reduced.url).port),
      tempDir: reducedTemp
    }
    const reducedMcp = McpProcess.start(template(adapter.launch, reducedVariables), {
      home, tempDirectory: reducedTemp, defaultTimeoutMs: Math.max(normalTimeoutMs, 5_000)
    })
    try {
      await reducedMcp.initialize(30_000)
      const listed = await reducedMcp.listTools()
      const listedTools = Array.isArray(listed?.tools) ? listed.tools : []
      for (const setup of adapter.setup ?? []) {
        if (listedTools.some((tool) => tool.name === setup.tool)) {
          await reducedMcp.callTool(setup.tool, template(setup.arguments ?? {}, reducedVariables))
        }
      }
      const startupGraceMs = Math.min(Math.max(adapter.startupGraceMs ?? 250, 0), 2_000)
      if (startupGraceMs > 0) await new Promise((resolveGrace) => setTimeout(resolveGrace, startupGraceMs))
      if (!reduced.requests.some((entry) => entry.requestType === "GetVersion")) {
        const versionOperation = adapter.operations.getVersion
        if (versionOperation && listedTools.some((tool) => tool.name === versionOperation.tool)) {
          try {
            await reducedMcp.callTool(versionOperation.tool, template(versionOperation.arguments ?? {}, reducedVariables))
          } catch {}
        }
      }
      const connected = reduced.requests.some((entry) => entry.requestType === "GetVersion")
      const operation = adapter.operations.getSourceScreenshot
      if (!operation) {
        probes.push(probe("reduced_capabilities", "unsupported", { unavailableRequests }))
      } else if (!connected) {
        probes.push(probe("reduced_capabilities", "not_testable", {
          error: "candidate did not complete OBS capability discovery before reduced-capability observation",
          unavailableRequests,
          mcpTrace: reducedMcp.sanitizedTrace(),
          obsRequests: reduced.requests
        }))
      } else if (!listedTools.some((tool) => tool.name === operation.tool)) {
        probes.push(probe("reduced_capabilities", "pass", { behavior: "unavailable tool omitted", unavailableRequests }))
      } else {
        let result
        let error
        try { result = await reducedMcp.callTool(operation.tool, template(operation.arguments ?? {}, reducedVariables)) } catch (caught) { error = caught }
        probes.push(probe("reduced_capabilities", !successfulToolResult(result) || error ? "pass" : "fail", {
          behavior: error ? "bounded error" : result?.isError ? "tool error" : "invented success",
          unavailableRequests, toolResult: result, error: error?.message,
          obsRequests: reduced.requests
        }))
      }
    } catch (error) {
      probes.push(probe("reduced_capabilities", "not_testable", {
        error: error.message,
        mcpTrace: reducedMcp.sanitizedTrace(),
        obsRequests: reduced.requests
      }))
    } finally {
      await reducedMcp.stop()
      await reduced.close()
    }
  }

  async function finish() {
    if (mcp) await mcp.stop()
    await fake.close()
    const fixtureSources = {}
    for (const file of ["runner.mjs", "fake-obs.mjs", "mcp-process.mjs", "msgpack.mjs"]) {
      const bytes = await readFile(join(fixtureDirectory, file))
      fixtureSources[file] = createHash("sha256").update(bytes).digest("hex")
    }
    const result = {
      schemaVersion: 1,
      fixtureVersion,
      fixtureSources,
      candidateId: adapter.id,
      observedAt: new Date().toISOString(),
      limitations: [
        "Mocked protocol execution does not establish rendering, codecs/devices, platform capture behavior, live streaming, or real OBS performance.",
        "A finite watchdog expiration records that no bounded response was observed; it does not prove an indefinite hang.",
        "The disconnect probe closes before applying an idempotent scene setter; it cannot establish behavior after an applied non-idempotent mutation."
      ],
      officialProtocol: officialProtocolIdentity,
      launch: { command: adapter.launch.command, args: adapter.launch.args ?? [], cwd: adapter.launch.cwd },
      fixture: {
        connections: fake.connections,
        requests: fake.requests,
        stateChanges: fake.stateChanges,
        fixtureUnimplemented: fake.fixtureUnimplemented
      },
      mcp: mcp?.sanitizedTrace(),
      probes
    }
    const sanitized = redact(result, [SYNTHETIC_PASSWORD, SYNTHETIC_STREAM_KEY])
    await mkdir(outputDirectory, { recursive: true })
    const outputPath = join(outputDirectory, `${adapter.id}.json`)
    await writeFile(outputPath, `${JSON.stringify(sanitized, null, 2)}\n`)
    await rm(tempRoot, { recursive: true, force: true })
    return { result: sanitized, outputPath }
  }
}

export { runStudy }

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const args = parseArguments(process.argv.slice(2))
    const adapterPath = resolve(args.adapter)
    const adapter = JSON.parse(await readFile(adapterPath, "utf8"))
    if (adapter.launch?.cwd !== undefined && !isAbsolute(adapter.launch.cwd)) {
      adapter.launch.cwd = resolve(dirname(adapterPath), adapter.launch.cwd)
    }
    const { result, outputPath } = await runStudy(adapter, resolve(args.output))
    const counts = Object.fromEntries([...statuses].map((status) => [status, result.probes.filter((entry) => entry.status === status).length]))
    process.stdout.write(`${JSON.stringify({ candidateId: adapter.id, outputPath, counts })}\n`)
  } catch (error) {
    process.stderr.write(`${error.stack ?? error.message}\n`)
    process.exitCode = 1
  }
}
