import { createHash } from "node:crypto"
import { readFile, writeFile } from "node:fs/promises"
import { resolve } from "node:path"
import { fileURLToPath } from "node:url"

import { WebSocket, WebSocketServer } from "ws"

import { decodeMsgpack, encodeMsgpack } from "./msgpack.mjs"

const fixtureDirectory = fileURLToPath(new URL(".", import.meta.url))
const protocolPath = new URL("../results/official-protocol.json", import.meta.url)
const protocolSnapshot = JSON.parse(await readFile(protocolPath, "utf8"))
const officialRequests = new Set(protocolSnapshot.requestNames)

export const SYNTHETIC_PASSWORD = "fixture-only-password-OBS-2026"
export const SYNTHETIC_STREAM_KEY = "SYNTHETIC_STREAM_KEY_7d3f1c"
export const PNG_BASE64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGP4z/D/PwAG/gL+DHWJ3gAAAABJRU5ErkJggg=="

export const CORE_REQUESTS = Object.freeze([
  "GetVersion", "GetSceneList", "GetCurrentProgramScene", "SetCurrentProgramScene",
  "GetInputList", "GetInputMute", "SetInputMute", "ToggleInputMute",
  "GetRecordStatus", "StartRecord", "StopRecord", "GetStreamStatus", "GetSourceScreenshot", "SaveSourceScreenshot",
  "GetCanvasList", "GetInputSettings", "SetInputSettings", "GetSourceFilterList",
  "GetInputVolume", "GetSourceFilter", "SetSourceFilterSettings",
  "GetOutputSettings", "SetOutputSettings", "GetSceneTransitionList", "GetCurrentSceneTransition",
  "SetCurrentSceneTransitionSettings", "GetStreamServiceSettings", "SetStreamServiceSettings"
])

for (const requestName of CORE_REQUESTS) {
  if (!officialRequests.has(requestName)) {
    throw new Error(`fixture request ${requestName} is absent from pinned official protocol ${protocolSnapshot.commit}`)
  }
}

const success = (requestType, requestId, responseData = {}) => ({
  op: 7,
  d: { requestType, requestId, requestStatus: { result: true, code: 100 }, responseData }
})

const failure = (requestType, requestId, code, comment) => ({
  op: 7,
  d: { requestType, requestId, requestStatus: { result: false, code, comment } }
})

const authenticate = (password, salt, challenge) => {
  const secret = createHash("sha256").update(password + salt).digest("base64")
  return createHash("sha256").update(secret + challenge).digest("base64")
}

const requireString = (data, key) => typeof data?.[key] === "string" && data[key].length > 0

export class FakeObs {
  static async start(options = {}) {
    const server = new WebSocketServer({
      host: "127.0.0.1",
      port: 0,
      handleProtocols: (protocols) => protocols.has("obswebsocket.msgpack")
        ? "obswebsocket.msgpack"
        : protocols.has("obswebsocket.json") ? "obswebsocket.json" : false
    })
    await new Promise((resolve, reject) => {
      server.once("listening", resolve)
      server.once("error", reject)
    })
    return new FakeObs(server, options)
  }

  constructor(server, options) {
    this.server = server
    this.password = options.password ?? SYNTHETIC_PASSWORD
    this.availableRequests = [...(options.availableRequests ?? CORE_REQUESTS)]
    this.requests = []
    this.stateChanges = []
    this.fixtureUnimplemented = []
    this.connections = 0
    this.behavior = { failNext: new Map(), dropNext: new Set(), disconnectNext: new Set() }
    this.state = {
      currentSceneName: "Intro",
      recordActive: false,
      inputs: new Map([["Mic/Aux", false], ["Desktop Audio", false]]),
      inputSettings: {
        "Mic/Aux": { device_id: "fixture-mic", reconnect_delay_sec: 7, nested: { mode: "synthetic", values: [1, null, true] } }
      },
      outputSettings: {
        adv_file_output: { path: "/synthetic/recordings", encoder: { id: "fixture-x264", options: { preset: "fast" } } }
      },
      filterSettings: { opacity: 0.75, nested: { preserve: ["x", 2, false] } },
      transitionSettings: { curve: "ease-in-out", nested: { points: [0, 0.5, 1] } }
    }
    const address = server.address()
    this.url = `ws://127.0.0.1:${address.port}`
    server.on("connection", (socket) => this.#connection(socket))
  }

  failOnce(requestType, code = 600, comment = "Synthetic OBS rejection") {
    this.behavior.failNext.set(requestType, { code, comment })
  }

  dropOnce(requestType) {
    this.behavior.dropNext.add(requestType)
  }

  disconnectOnce(requestType) {
    this.behavior.disconnectNext.add(requestType)
  }

  async close() {
    for (const client of this.server.clients) client.terminate()
    await new Promise((resolve) => this.server.close(resolve))
  }

  #connection(socket) {
    this.connections += 1
    const salt = "synthetic-salt"
    const challenge = "synthetic-challenge"
    this.#send(socket, {
      op: 0,
      d: {
        obsStudioVersion: "31.1.0",
        obsWebSocketVersion: "5.6.2",
        rpcVersion: 1,
        authentication: { salt, challenge }
      }
    })
    socket.once("message", (raw) => {
      let identify
      try { identify = this.#decode(socket, raw) } catch { socket.close(4001, "invalid identify"); return }
      const expected = authenticate(this.password, salt, challenge)
      if (identify?.op !== 1 || identify?.d?.authentication !== expected) {
        socket.close(4009, "authentication failed")
        return
      }
      this.#send(socket, { op: 2, d: { negotiatedRpcVersion: 1 } })
      socket.on("message", (message) => void this.#request(socket, message))
    })
  }

  async #request(socket, raw) {
    let envelope
    try { envelope = this.#decode(socket, raw) } catch { return }
    if (envelope?.op !== 6) return
    const { requestType, requestId, requestData = {} } = envelope.d ?? {}
    const trace = { at: new Date().toISOString(), requestType, requestData: structuredClone(requestData) }
    this.requests.push(trace)

    if (!officialRequests.has(requestType)) {
      trace.classification = "candidate_invalid_request"
      this.#send(socket, failure(requestType, requestId, 204, "Unknown request type"))
      return
    }
    if (!CORE_REQUESTS.includes(requestType)) {
      trace.classification = "fixture_unimplemented"
      this.fixtureUnimplemented.push(requestType)
      this.#send(socket, failure(requestType, requestId, 204, "Official request not implemented by study fixture"))
      return
    }
    if (!this.availableRequests.includes(requestType)) {
      trace.classification = "capability_unavailable"
      this.#send(socket, failure(requestType, requestId, 204, "Request unavailable in this fixture profile"))
      return
    }
    if (this.behavior.disconnectNext.delete(requestType)) {
      trace.classification = "in_flight_disconnect"
      socket.close(4000, "synthetic disconnect")
      return
    }
    if (this.behavior.dropNext.delete(requestType)) {
      trace.classification = "missing_response"
      return
    }
    const injected = this.behavior.failNext.get(requestType)
    if (injected) {
      this.behavior.failNext.delete(requestType)
      trace.classification = "injected_obs_error"
      this.#send(socket, failure(requestType, requestId, injected.code, injected.comment))
      return
    }

    const response = await this.#handle(requestType, requestData)
    trace.classification = response.ok ? "implemented" : "validation_error"
    this.#send(socket, response.ok
      ? success(requestType, requestId, response.data)
      : failure(requestType, requestId, response.code, response.comment))
  }

  #send(socket, value) {
    socket.send(socket.protocol === "obswebsocket.msgpack" ? encodeMsgpack(value) : JSON.stringify(value))
  }

  #decode(socket, raw) {
    return socket.protocol === "obswebsocket.msgpack" ? decodeMsgpack(raw) : JSON.parse(raw.toString())
  }

  async #handle(requestType, data) {
    const ok = (responseData = {}) => ({ ok: true, data: responseData })
    const bad = (comment, code = 300) => ({ ok: false, code, comment })
    const findInput = () => {
      if (requireString(data, "inputName")) return data.inputName
      if (data?.inputUuid === "input-mic-aux") return "Mic/Aux"
      if (data?.inputUuid === "input-desktop-audio") return "Desktop Audio"
      return undefined
    }
    switch (requestType) {
      case "GetVersion": return ok({
        obsVersion: "31.1.0", obsWebSocketVersion: "5.6.2", rpcVersion: 1,
        availableRequests: this.availableRequests, supportedImageFormats: ["bmp", "jpeg", "png", "webp"],
        platform: "fixture", platformDescription: "Deterministic loopback study fixture"
      })
      case "GetSceneList": return ok({
        currentProgramSceneName: this.state.currentSceneName,
        currentProgramSceneUuid: this.state.currentSceneName === "Intro" ? "scene-intro" : "scene-main",
        currentPreviewSceneName: "Main", currentPreviewSceneUuid: "scene-main",
        scenes: [
          { sceneName: "Intro", sceneUuid: "scene-intro", sceneIndex: 1 },
          { sceneName: "Main", sceneUuid: "scene-main", sceneIndex: 0 }
        ]
      })
      case "GetCurrentProgramScene": return ok({
        currentProgramSceneName: this.state.currentSceneName,
        currentProgramSceneUuid: this.state.currentSceneName === "Intro" ? "scene-intro" : "scene-main",
        sceneName: this.state.currentSceneName,
        sceneUuid: this.state.currentSceneName === "Intro" ? "scene-intro" : "scene-main"
      })
      case "SetCurrentProgramScene": {
        if (!requireString(data, "sceneName")) return bad("Missing request field: sceneName")
        if (!["Intro", "Main"].includes(data.sceneName)) return bad("Scene not found", 600)
        const before = this.state.currentSceneName
        this.state.currentSceneName = data.sceneName
        this.stateChanges.push({ kind: "scene", before, after: data.sceneName })
        return ok()
      }
      case "GetInputList": {
        const inputs = [
        { inputName: "Mic/Aux", inputUuid: "input-mic-aux", inputKind: "wasapi_input_capture", unversionedInputKind: "wasapi_input_capture" },
        { inputName: "Desktop Audio", inputUuid: "input-desktop-audio", inputKind: "wasapi_output_capture", unversionedInputKind: "wasapi_output_capture" }
        ]
        return ok({ inputs: requireString(data, "inputKind") ? inputs.filter((input) => input.inputKind === data.inputKind) : inputs })
      }
      case "GetInputVolume": {
        const name = findInput()
        return name && this.state.inputs.has(name) ? ok({ inputVolumeMul: 0.75, inputVolumeDb: -2.498 }) : bad("Input not found", 600)
      }
      case "GetInputMute": {
        const name = findInput()
        return name && this.state.inputs.has(name) ? ok({ inputMuted: this.state.inputs.get(name) }) : bad("Input not found", 600)
      }
      case "SetInputMute": {
        const name = findInput()
        if (!name || !this.state.inputs.has(name)) return bad("Input not found", 600)
        if (typeof data.inputMuted !== "boolean") return bad("Missing request field: inputMuted")
        const before = this.state.inputs.get(name)
        this.state.inputs.set(name, data.inputMuted)
        this.stateChanges.push({ kind: "mute", inputName: name, before, after: data.inputMuted })
        return ok()
      }
      case "ToggleInputMute": {
        const name = findInput()
        if (!name || !this.state.inputs.has(name)) return bad("Input not found", 600)
        const after = !this.state.inputs.get(name)
        this.state.inputs.set(name, after)
        this.stateChanges.push({ kind: "mute", inputName: name, after, via: "toggle" })
        return ok({ inputMuted: after })
      }
      case "GetRecordStatus": return ok({
        outputActive: this.state.recordActive, outputPaused: false,
        outputTimecode: this.state.recordActive ? "00:00:01.250" : "00:00:00.000",
        outputDuration: this.state.recordActive ? 1250 : 0,
        outputBytes: this.state.recordActive ? 4096 : 0
      })
      case "StartRecord": {
        if (this.state.recordActive) return bad("Output already active", 500)
        this.state.recordActive = true
        this.stateChanges.push({ kind: "record", after: true })
        return ok()
      }
      case "StopRecord": {
        if (!this.state.recordActive) return bad("Output not active", 500)
        this.state.recordActive = false
        this.stateChanges.push({ kind: "record", after: false })
        return ok({ outputPath: "/synthetic/recordings/fixture.mkv" })
      }
      case "GetStreamStatus": return ok({
        outputActive: false, outputReconnecting: false, outputTimecode: "00:00:00.000",
        outputDuration: 0, outputCongestion: 0, outputBytes: 0, outputSkippedFrames: 0, outputTotalFrames: 0
      })
      case "GetStreamServiceSettings": return ok({
        streamServiceType: "rtmp_common",
        streamServiceSettings: { server: "rtmp://127.0.0.1/synthetic", key: SYNTHETIC_STREAM_KEY, use_auth: false }
      })
      case "SetStreamServiceSettings": {
        if (typeof data.streamServiceType !== "string" || typeof data.streamServiceSettings !== "object") {
          return bad("Missing stream service settings")
        }
        this.stateChanges.push({ kind: "streamServiceSettings", after: structuredClone(data.streamServiceSettings) })
        return ok()
      }
      case "GetSourceScreenshot": {
        const source = data.sourceName ?? (data.sourceUuid === "input-mic-aux" ? "Mic/Aux" : undefined)
        if (!source) return bad("Missing request field: sourceName or sourceUuid")
        if (!["Mic/Aux", "Desktop Audio", "Intro", "Main"].includes(source)) return bad("Source not found", 600)
        if (data.imageFormat !== "png") return bad("Fixture screenshot probe requires png")
        return ok({ imageData: `data:image/png;base64,${PNG_BASE64}` })
      }
      case "SaveSourceScreenshot": {
        const source = data.sourceName ?? (data.sourceUuid === "input-mic-aux" ? "Mic/Aux" : undefined)
        if (!source) return bad("Missing request field: sourceName or sourceUuid")
        if (data.imageFormat !== "png") return bad("Fixture screenshot probe requires png")
        if (!requireString(data, "imageFilePath")) return bad("Missing request field: imageFilePath")
        const target = resolve(data.imageFilePath)
        if (!target.startsWith("/tmp/obs-study-")) {
          this.fixtureUnimplemented.push(`SaveSourceScreenshot:${target}`)
          return bad("Study fixture only writes screenshots beneath its isolated /tmp/obs-study-* directory", 204)
        }
        try {
          await writeFile(target, Buffer.from(PNG_BASE64, "base64"))
          return ok()
        } catch (error) {
          return bad(`Unable to save screenshot: ${error.code ?? error.message}`, 700)
        }
      }
      case "GetCanvasList": return ok({ canvases: [
        { canvasName: "Program", canvasUuid: "canvas-program", canvasWidth: 1920, canvasHeight: 1080 }
      ] })
      case "GetInputSettings": {
        const name = findInput()
        if (!name || !this.state.inputs.has(name)) return bad("Input not found", 600)
        return ok({ inputKind: "wasapi_input_capture", inputSettings: this.state.inputSettings[name] ?? {} })
      }
      case "SetInputSettings": {
        const name = findInput()
        if (!name || !this.state.inputs.has(name)) return bad("Input not found", 600)
        if (typeof data.inputSettings !== "object" || data.inputSettings === null) return bad("Missing request field: inputSettings")
        this.state.inputSettings[name] = data.overlay === false ? structuredClone(data.inputSettings) : {
          ...(this.state.inputSettings[name] ?? {}), ...structuredClone(data.inputSettings)
        }
        this.stateChanges.push({ kind: "inputSettings", inputName: name, after: this.state.inputSettings[name] })
        return ok()
      }
      case "GetSourceFilterList": return ok({ filters: [{
        filterEnabled: true, filterIndex: 0, filterKind: "color_filter_v2", filterName: "Synthetic Color",
        filterSettings: this.state.filterSettings
      }] })
      case "GetSourceFilter": return data.filterName === "Synthetic Color"
        ? ok({ filterEnabled: true, filterIndex: 0, filterKind: "color_filter_v2", filterSettings: this.state.filterSettings })
        : bad("Filter not found", 600)
      case "SetSourceFilterSettings": {
        if (data.filterName !== "Synthetic Color") return bad("Filter not found", 600)
        if (typeof data.filterSettings !== "object" || data.filterSettings === null) return bad("Missing request field: filterSettings")
        this.state.filterSettings = data.overlay === false ? structuredClone(data.filterSettings) : {
          ...this.state.filterSettings, ...structuredClone(data.filterSettings)
        }
        this.stateChanges.push({ kind: "filterSettings", after: this.state.filterSettings })
        return ok()
      }
      case "GetOutputSettings": return data.outputName === "adv_file_output"
        ? ok({ outputSettings: this.state.outputSettings.adv_file_output }) : bad("Output not found", 600)
      case "SetOutputSettings": {
        if (data.outputName !== "adv_file_output") return bad("Output not found", 600)
        if (typeof data.outputSettings !== "object" || data.outputSettings === null) return bad("Missing request field: outputSettings")
        this.state.outputSettings.adv_file_output = { ...this.state.outputSettings.adv_file_output, ...structuredClone(data.outputSettings) }
        this.stateChanges.push({ kind: "outputSettings", after: this.state.outputSettings.adv_file_output })
        return ok()
      }
      case "GetSceneTransitionList": return ok({
        currentSceneTransitionName: "Fade", currentSceneTransitionKind: "fade_transition",
        currentSceneTransitionUuid: "transition-fade",
        transitions: [{ transitionName: "Fade", transitionKind: "fade_transition", transitionUuid: "transition-fade", configurable: true, fixed: false }]
      })
      case "GetCurrentSceneTransition": return ok({ transitionName: "Fade", transitionKind: "fade_transition", transitionUuid: "transition-fade", transitionDuration: 300, transitionConfigurable: true, transitionFixed: false, transitionSettings: this.state.transitionSettings })
      case "SetCurrentSceneTransitionSettings": {
        if (typeof data.transitionSettings !== "object" || data.transitionSettings === null) return bad("Missing request field: transitionSettings")
        this.state.transitionSettings = data.overlay === false ? structuredClone(data.transitionSettings) : {
          ...this.state.transitionSettings, ...structuredClone(data.transitionSettings)
        }
        this.stateChanges.push({ kind: "transitionSettings", after: this.state.transitionSettings })
        return ok()
      }
      default: return bad("Official request not implemented by study fixture", 204)
    }
  }
}

export const officialProtocolIdentity = Object.freeze({
  commit: protocolSnapshot.commit,
  sha256: protocolSnapshot.sha256,
  sourceUrl: protocolSnapshot.sourceUrl,
  path: fixtureDirectory
})
