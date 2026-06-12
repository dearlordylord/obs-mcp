import { Option } from "effect"

import { packageVersion } from "../version.js"
import { type ObsConfig, protocolReferencePath } from "./config.js"

interface SanitizedObsContext {
  readonly packageVersion: string
  readonly transport: "stdio"
  readonly obs: {
    readonly url: {
      readonly origin: string
      readonly host: string
      readonly protocol: "ws:" | "wss:"
    }
    readonly connectionTimeoutMs: number
    readonly authMode: "password" | "none"
  }
  readonly enabledToolsets: ReadonlyArray<string>
  readonly protocolReferencePath: string
}

export const getSanitizedObsContext = (config: ObsConfig): SanitizedObsContext => {
  const url = new URL(config.url)
  return {
    packageVersion,
    transport: "stdio",
    obs: {
      url: {
        origin: url.origin,
        host: url.host,
        protocol: url.protocol === "wss:" ? "wss:" : "ws:"
      },
      connectionTimeoutMs: config.connectionTimeoutMs,
      authMode: Option.isSome(config.password) && config.password.value.length > 0 ? "password" : "none"
    },
    enabledToolsets: config.enabledToolsets,
    protocolReferencePath
  }
}
