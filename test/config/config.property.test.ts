import { Effect } from "effect"
import fc from "fast-check"
import { describe, expect, it } from "vitest"

import { loadObsConfigFromEnv, normalizeObsWebSocketUrl } from "../../src/config/config.js"

const hostArbitrary = fc.domain().filter((host) => !host.includes("_"))
const portArbitrary = fc.integer({ min: 1, max: 65_535 })

describe("OBS config properties", () => {
  it("normalizes bare host:port values to ws URLs", () => {
    fc.assert(fc.property(hostArbitrary, portArbitrary, (host, port) => {
      expect(normalizeObsWebSocketUrl(`${host}:${port}`)).toBe(`ws://${host}:${port}/`)
    }))
  })

  it("keeps only known enabled toolsets", async () => {
    await fc.assert(fc.asyncProperty(fc.array(fc.string()), async (entries) => {
      const config = await Effect.runPromise(loadObsConfigFromEnv({ TOOLSETS: entries.join(",") }))
      const enabledToolsets: ReadonlyArray<string> = config.enabledToolsets
      const knownToolsets = new Set([
        "canvases",
        "events",
        "general",
        "inputs",
        "outputs",
        "record",
        "scenes",
        "stream",
        "ui"
      ])
      expect(enabledToolsets).toEqual(enabledToolsets.filter((toolset) => knownToolsets.has(toolset)))
    }))
  })
})
