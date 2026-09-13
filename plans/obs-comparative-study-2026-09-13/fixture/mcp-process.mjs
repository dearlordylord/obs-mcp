import { spawn } from "node:child_process"

const cleanBaseEnvironment = (home, tempDirectory) => {
  const allowed = ["PATH", "LANG", "LC_ALL", "LC_CTYPE", "TZ", "SystemRoot", "WINDIR", "COMSPEC", "PATHEXT"]
  const env = {}
  for (const key of allowed) if (process.env[key] !== undefined) env[key] = process.env[key]
  return {
    ...env,
    HOME: home,
    USERPROFILE: home,
    XDG_CONFIG_HOME: `${home}/.config`,
    XDG_CACHE_HOME: `${home}/.cache`,
    TMPDIR: tempDirectory,
    TEMP: tempDirectory,
    TMP: tempDirectory
  }
}

export class McpProcess {
  constructor(child, options) {
    this.child = child
    this.defaultTimeoutMs = options.defaultTimeoutMs
    this.pending = new Map()
    this.nextId = 1
    this.exchanges = []
    this.stdoutNoise = []
    this.stderr = []
    this.closed = false
    this.startedAt = Date.now()
    let stdoutBuffer = ""
    child.stdout.setEncoding("utf8")
    child.stdout.on("data", (chunk) => {
      stdoutBuffer += chunk
      for (;;) {
        const newline = stdoutBuffer.indexOf("\n")
        if (newline < 0) break
        const line = stdoutBuffer.slice(0, newline).replace(/\r$/, "")
        stdoutBuffer = stdoutBuffer.slice(newline + 1)
        if (line.trim()) this.#receive(line)
      }
    })
    child.stderr.setEncoding("utf8")
    child.stderr.on("data", (chunk) => this.stderr.push(String(chunk)))
    const close = (reason) => {
      if (this.closed) return
      this.closed = true
      for (const entry of this.pending.values()) {
        clearTimeout(entry.timer)
        entry.reject(new Error(`MCP process closed before response: ${reason}`))
      }
      this.pending.clear()
    }
    child.on("error", (error) => close(error.message))
    child.on("exit", (code, signal) => close(`exit=${code} signal=${signal}`))
  }

  static start(launch, context) {
    const env = {
      ...cleanBaseEnvironment(context.home, context.tempDirectory),
      ...launch.env
    }
    const child = spawn(launch.command, launch.args ?? [], {
      cwd: launch.cwd,
      env,
      shell: false,
      detached: process.platform !== "win32",
      stdio: ["pipe", "pipe", "pipe"]
    })
    return new McpProcess(child, { defaultTimeoutMs: context.defaultTimeoutMs })
  }

  #receive(line) {
    let message
    try { message = JSON.parse(line) } catch {
      this.stdoutNoise.push(line)
      return
    }
    const exchange = this.exchanges.findLast((entry) => entry.id === message.id)
    if (exchange) {
      exchange.response = message
      exchange.elapsedMs = Date.now() - exchange.sentAtMs
    }
    const pending = this.pending.get(message.id)
    if (!pending) return
    this.pending.delete(message.id)
    clearTimeout(pending.timer)
    if (message.error) pending.reject(Object.assign(new Error(message.error.message ?? "MCP JSON-RPC error"), { rpcError: message.error }))
    else pending.resolve(message.result)
  }

  request(method, params = {}, timeoutMs = this.defaultTimeoutMs) {
    if (this.closed) return Promise.reject(new Error("MCP process is closed"))
    const id = this.nextId++
    const sentAtMs = Date.now()
    const message = { jsonrpc: "2.0", id, method, params }
    this.exchanges.push({ id, method, params, sentAtMs })
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id)
        const exchange = this.exchanges.findLast((entry) => entry.id === id)
        if (exchange) exchange.watchdogMs = timeoutMs
        reject(Object.assign(new Error(`MCP response watchdog expired after ${timeoutMs}ms for ${method}`), { watchdog: true }))
      }, timeoutMs)
      this.pending.set(id, { resolve, reject, timer })
      this.child.stdin.write(`${JSON.stringify(message)}\n`, (error) => {
        if (error) {
          clearTimeout(timer)
          this.pending.delete(id)
          reject(error)
        }
      })
    })
  }

  notify(method, params = {}) {
    if (!this.closed) this.child.stdin.write(`${JSON.stringify({ jsonrpc: "2.0", method, params })}\n`)
  }

  async initialize(timeoutMs = this.defaultTimeoutMs) {
    const result = await this.request("initialize", {
      protocolVersion: "2024-11-05",
      capabilities: {},
      clientInfo: { name: "obs-comparative-study-fixture", version: "1.0.0" }
    }, timeoutMs)
    this.notify("notifications/initialized")
    return result
  }

  listTools() {
    return this.request("tools/list")
  }

  callTool(tool, args, timeoutMs) {
    return this.request("tools/call", { name: tool, arguments: args ?? {} }, timeoutMs)
  }

  async stop() {
    if (this.closed) return
    try { this.child.stdin.end() } catch {}
    await new Promise((resolve) => {
      const timer = setTimeout(() => {
        if (!this.closed) this.#killTree("SIGKILL")
        resolve()
      }, 1000)
      this.child.once("exit", () => { clearTimeout(timer); resolve() })
      this.#killTree("SIGTERM")
    })
  }

  #killTree(signal) {
    try {
      if (process.platform !== "win32" && this.child.pid) process.kill(-this.child.pid, signal)
      else this.child.kill(signal)
    } catch {
      try { this.child.kill(signal) } catch {}
    }
  }

  sanitizedTrace() {
    return {
      exchanges: this.exchanges.map(({ sentAtMs, ...entry }) => entry),
      stdoutNoise: this.stdoutNoise,
      stderr: this.stderr.join("").slice(0, 64_000),
      lifetimeMs: Date.now() - this.startedAt
    }
  }
}
