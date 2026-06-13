import { Schema } from "effect"

import { ObsStatsOutput, RecordStatusOutput, VersionOutput } from "../../domain/schemas/general.js"
import type { ObsClient } from "../client.js"
import { GetRecordStatus, GetStats, GetVersion } from "../requests.js"

export const getVersion = async (client: ObsClient): Promise<VersionOutput> => {
  const response = await client.request(GetVersion)
  return Schema.decodeUnknownSync(VersionOutput)({
    ...response,
    negotiatedRpcVersion: client.negotiatedRpcVersion
  })
}

export const getObsStats = async (client: ObsClient): Promise<ObsStatsOutput> => {
  const response = await client.request(GetStats)
  return Schema.decodeUnknownSync(ObsStatsOutput)(response)
}

export const getRecordStatus = async (client: ObsClient): Promise<RecordStatusOutput> => {
  const response = await client.request(GetRecordStatus)
  return Schema.decodeUnknownSync(RecordStatusOutput)(response)
}
