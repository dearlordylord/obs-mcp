import { Effect, Option } from "effect"
import { describe, expect, it } from "vitest"

import { loadObsConfigFromEnv, normalizeObsWebSocketUrl, redactedObsWebSocketUrl } from "../../src/config/config.js"
import { getSanitizedObsContext } from "../../src/config/obs-runtime-context.js"

describe("OBS config", () => {
  it("normalizes bare host urls and preserves ws/wss urls", () => {
    expect(normalizeObsWebSocketUrl("localhost:4455")).toBe("ws://localhost:4455/")
    expect(normalizeObsWebSocketUrl("ws://localhost:4455")).toBe("ws://localhost:4455/")
    expect(normalizeObsWebSocketUrl("wss://obs.example.test")).toBe("wss://obs.example.test/")
  })

  it("decodes environment defaults and toolset filtering", async () => {
    const config = await Effect.runPromise(
      loadObsConfigFromEnv({
        TOOLSETS:
          "scenes,general,events,filters,inputs,outputs,record,screenshots,stream,canvases,config,transitions,ui,admin_raw,vendor,batch,raw"
      })
    )
    expect(config.url).toBe("ws://localhost:4455/")
    expect(config.connectionTimeoutMs).toBe(30_000)
    expect(config.eventBufferCapacity).toBeUndefined()
    expect(config.enabledToolsets).toEqual([
      "scenes",
      "general",
      "events",
      "filters",
      "inputs",
      "outputs",
      "record",
      "screenshots",
      "stream",
      "canvases",
      "config",
      "transitions",
      "ui",
      "admin_raw",
      "vendor",
      "batch"
    ])
  })

  it("decodes optional OBS event buffer capacity", async () => {
    await expect(Effect.runPromise(loadObsConfigFromEnv({ OBS_EVENT_BUFFER_CAPACITY: "7" })))
      .resolves.toMatchObject({ eventBufferCapacity: 7 })
    await expect(Effect.runPromise(loadObsConfigFromEnv({ OBS_EVENT_BUFFER_CAPACITY: "0" })))
      .rejects.toThrow()
    await expect(Effect.runPromise(loadObsConfigFromEnv({ OBS_EVENT_BUFFER_CAPACITY: "nope" })))
      .rejects.toThrow()
  })

  it("loads screenshot save output directory policy from the environment", async () => {
    await expect(Effect.runPromise(loadObsConfigFromEnv({
      OBS_MCP_SCREENSHOT_OUTPUT_DIR: "/tmp/obs-mcp-screenshots"
    }))).resolves.toMatchObject({ screenshotOutputDirectory: "/tmp/obs-mcp-screenshots" })
  })

  it("defaults blank toolsets and rejects non-websocket URLs", async () => {
    await expect(Effect.runPromise(loadObsConfigFromEnv({ TOOLSETS: " , " })))
      .resolves.toMatchObject({ enabledToolsets: ["general", "record", "scenes", "inputs"] })
    await expect(Effect.runPromise(loadObsConfigFromEnv({ OBS_WEBSOCKET_CONNECTION_TIMEOUT: "nope" })))
      .rejects.toThrow()
    expect(() => normalizeObsWebSocketUrl("http://localhost:4455")).toThrow("ws:// or wss://")
    expect(() => normalizeObsWebSocketUrl("ws://user:secret@localhost:4455")).toThrow("must not include")
    expect(redactedObsWebSocketUrl("ws://user:secret@localhost:4455/")).toBe("ws://localhost:4455/")
  })

  it("sanitizes password configuration out of runtime context", async () => {
    const config = await Effect.runPromise(loadObsConfigFromEnv({
      OBS_WEBSOCKET_URL: "wss://obs.example.test:4455",
      OBS_WEBSOCKET_PASSWORD: "secret"
    }))
    expect(Option.isSome(config.password)).toBe(true)
    expect(getSanitizedObsContext(config)).toMatchObject({
      transport: "stdio",
      obs: {
        url: { origin: "wss://obs.example.test:4455", host: "obs.example.test:4455", protocol: "wss:" },
        authMode: "password"
      }
    })
    expect(JSON.stringify(getSanitizedObsContext(config))).not.toContain("secret")
  })
})
