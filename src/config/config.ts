import { Effect, Schema } from "effect"

export const protocolReferencePath = ".references/protocol/obs-websocket/docs/generated/protocol.md"

const Toolset = Schema.Literal("general", "inputs", "record", "scenes", "stream")
type Toolset = typeof Toolset.Type
const DEFAULT_TOOLSETS: ReadonlyArray<Toolset> = ["general", "record", "scenes", "inputs"]

const DEFAULT_OBS_WEBSOCKET_URL = "ws://localhost:4455"
const DEFAULT_OBS_CONNECTION_TIMEOUT = 30_000

export const ObsConfig = Schema.Struct({
  url: Schema.String,
  password: Schema.OptionFromNullOr(Schema.String),
  connectionTimeoutMs: Schema.Number.pipe(Schema.int(), Schema.positive()),
  enabledToolsets: Schema.Array(Toolset)
})
export type ObsConfig = typeof ObsConfig.Type

const parseToolsets = (value: string | undefined): ReadonlyArray<Toolset> => {
  if (value === undefined || value.trim() === "") {
    return DEFAULT_TOOLSETS
  }

  const values = value.split(",").map((entry) => entry.trim()).filter((entry) => entry.length > 0)
  if (values.length === 0) {
    return DEFAULT_TOOLSETS
  }

  const allowed = new Set<string>(["general", "inputs", "record", "scenes", "stream"])
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
  url.username = ""
  url.password = ""
  return url.toString()
}

export const loadObsConfigFromEnv = (env: NodeJS.ProcessEnv): Effect.Effect<ObsConfig, Error> =>
  Effect.try({
    try: () => {
      const timeoutRaw = env["OBS_WEBSOCKET_CONNECTION_TIMEOUT"]
      const timeout = timeoutRaw === undefined ? DEFAULT_OBS_CONNECTION_TIMEOUT : Number.parseInt(timeoutRaw, 10)
      return Schema.decodeUnknownSync(ObsConfig)({
        url: normalizeObsWebSocketUrl(env["OBS_WEBSOCKET_URL"] ?? DEFAULT_OBS_WEBSOCKET_URL),
        password: env["OBS_WEBSOCKET_PASSWORD"] ?? null,
        connectionTimeoutMs: timeout,
        enabledToolsets: parseToolsets(env["TOOLSETS"])
      })
    },
    catch: (error) => {
      /* v8 ignore next */
      return error instanceof Error ? error : new Error(String(error))
    }
  })
