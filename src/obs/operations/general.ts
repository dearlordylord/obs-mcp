import { Schema } from "effect"

import { VersionOutput } from "../../domain/schemas/general.js"
import type { ObsClient } from "../client.js"
import { GetVersion } from "../requests.js"

export const getVersion = async (client: ObsClient): Promise<VersionOutput> => {
  const response = await client.request(GetVersion)
  return Schema.decodeUnknownSync(VersionOutput)({
    ...response,
    negotiatedRpcVersion: client.negotiatedRpcVersion
  })
}
