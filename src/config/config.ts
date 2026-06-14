import { Effect, Schema } from "effect"

import { EventBufferCapacity } from "../domain/schemas/events.js"
import { ObsNonEmptyString, ObsPositiveInteger, ObsString } from "../domain/schemas/shared.js"

export const protocolReferencePath = ".references/protocol/obs-websocket/docs/generated/protocol.md"

const TOOLSETS = [
  "admin_raw",
  "batch",
  "canvases",
  "config",
  "events",
  "filters",
  "general",
  "inputs",
  "outputs",
  "record",
  "scenes",
  "screenshots",
  "stream",
  "transitions",
  "ui",
  "vendor"
] as const

const Toolset = Schema.Literal(...TOOLSETS)
type Toolset = typeof Toolset.Type
const ALL_TOOLSETS: ReadonlyArray<Toolset> = TOOLSETS
const DEFAULT_TOOLSETS: ReadonlyArray<Toolset> = ["general", "record", "scenes", "inputs"]

const DEFAULT_OBS_WEBSOCKET_URL = "ws://localhost:4455"
const DEFAULT_OBS_CONNECTION_TIMEOUT = 30_000
export const DEFAULT_MCP_HTTP_HOST = "127.0.0.1"
export const DEFAULT_MCP_HTTP_PORT = 3000

const McpTransport = Schema.Literal("stdio", "http")

export const ObsConfig = Schema.Struct({
  url: ObsString,
  password: Schema.OptionFromNullOr(ObsString),
  connectionTimeoutMs: ObsPositiveInteger,
  enabledToolsets: Schema.Array(Toolset),
  eventBufferCapacity: Schema.optional(EventBufferCapacity),
  screenshotOutputDirectory: Schema.optional(ObsNonEmptyString),
  mcpTransport: Schema.optional(McpTransport),
  mcpHttpHost: Schema.optional(ObsNonEmptyString),
  mcpHttpPort: Schema.optional(ObsPositiveInteger),
  mcpHttpAuthToken: Schema.optional(ObsNonEmptyString),
  lazyEnvs: Schema.optional(Schema.Boolean),
  mcpAutoExit: Schema.optional(Schema.Boolean)
})
export type ObsConfig = typeof ObsConfig.Type

const parseConfigBoolean = (value: string | undefined, name: string): boolean => {
  if (value === undefined) return false
  const normalized = value.toLowerCase()
  if (normalized === "true") return true
  if (normalized === "false") return false
  throw new Error(`${name} must be true or false`)
}

const lazyEnvsEnabled = (value: string | undefined): boolean => value?.toLowerCase() === "true"

const parseToolsets = (
  value: string | undefined,
  defaultToolsets: ReadonlyArray<Toolset>
): ReadonlyArray<Toolset> => {
  if (value === undefined || value.trim() === "") {
    return defaultToolsets
  }

  const values = value.split(",").map((entry) => entry.trim()).filter((entry) => entry.length > 0)
  if (values.length === 0) {
    return defaultToolsets
  }
  if (values.some((entry) => entry.toLowerCase() === "all")) {
    return ALL_TOOLSETS
  }

  const allowed = new Set<string>(TOOLSETS)
  return values.filter((entry): entry is Toolset => allowed.has(entry))
}

export const normalizeObsWebSocketUrl = (input: string): string => {
  const trimmed = input.trim()
  const withProtocol = /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed) ? trimmed : `ws://${trimmed}`
  const url = new URL(withProtocol)

  if (url.protocol !== "ws:" && url.protocol !== "wss:") {
    throw new Error(`OBS_WEBSOCKET_URL must use ws:// or wss://, received ${url.protocol}`)
  }
  if (url.username.length > 0 || url.password.length > 0) {
    throw new Error("OBS_WEBSOCKET_URL must not include username or password credentials")
  }

  return url.toString()
}

export const redactedObsWebSocketUrl = (value: string): string => {
  const url = new URL(value)
  return `${url.protocol}//${url.host}${url.pathname}${url.search}${url.hash}`
}

export const loadObsConfigFromEnv = (env: NodeJS.ProcessEnv): Effect.Effect<ObsConfig, Error> =>
  Effect.try({
    try: () => {
      const timeoutRaw = env["OBS_WEBSOCKET_CONNECTION_TIMEOUT"]
      const timeout = timeoutRaw === undefined ? DEFAULT_OBS_CONNECTION_TIMEOUT : Number.parseInt(timeoutRaw, 10)
      const eventBufferCapacityRaw = env["OBS_EVENT_BUFFER_CAPACITY"]
      const httpPortRaw = env["MCP_HTTP_PORT"]
      const lazyEnvs = lazyEnvsEnabled(env["LAZY_ENVS"])
      return Schema.decodeUnknownSync(ObsConfig)({
        url: normalizeObsWebSocketUrl(env["OBS_WEBSOCKET_URL"] ?? DEFAULT_OBS_WEBSOCKET_URL),
        password: env["OBS_WEBSOCKET_PASSWORD"] ?? null,
        connectionTimeoutMs: timeout,
        enabledToolsets: parseToolsets(env["TOOLSETS"], lazyEnvs ? ALL_TOOLSETS : DEFAULT_TOOLSETS),
        ...(eventBufferCapacityRaw === undefined
          ? {}
          : { eventBufferCapacity: Number.parseInt(eventBufferCapacityRaw, 10) }),
        ...(env["OBS_MCP_SCREENSHOT_OUTPUT_DIR"] === undefined
          ? {}
          : { screenshotOutputDirectory: env["OBS_MCP_SCREENSHOT_OUTPUT_DIR"] }),
        mcpTransport: env["MCP_TRANSPORT"] ?? "stdio",
        mcpHttpHost: env["MCP_HTTP_HOST"] ?? DEFAULT_MCP_HTTP_HOST,
        mcpHttpPort: httpPortRaw === undefined ? DEFAULT_MCP_HTTP_PORT : Number.parseInt(httpPortRaw, 10),
        ...(env["MCP_HTTP_AUTH_TOKEN"] === undefined ? {} : { mcpHttpAuthToken: env["MCP_HTTP_AUTH_TOKEN"] }),
        lazyEnvs,
        mcpAutoExit: parseConfigBoolean(env["MCP_AUTO_EXIT"], "MCP_AUTO_EXIT")
      })
    },
    catch: (error) => {
      /* v8 ignore next */
      return error instanceof Error ? error : new Error(String(error))
    }
  })
