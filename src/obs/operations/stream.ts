import { Schema } from "effect"

import {
  StartStreamOutput,
  StopStreamOutput,
  StreamStatusOutput,
  ToggleStreamOutput
} from "../../domain/schemas/stream.js"
import type { ObsClient } from "../client.js"
import { GetStreamStatus, StartStream, StopStream, ToggleStream } from "../requests.js"

export const getStreamStatus = async (client: ObsClient): Promise<StreamStatusOutput> => {
  const response = await client.request(GetStreamStatus)
  return Schema.decodeUnknownSync(StreamStatusOutput)(response)
}

export const startStream = async (client: ObsClient): Promise<StartStreamOutput> => {
  await client.request(StartStream)
  return Schema.decodeUnknownSync(StartStreamOutput)({ outputActive: true })
}

export const stopStream = async (client: ObsClient): Promise<StopStreamOutput> => {
  await client.request(StopStream)
  return Schema.decodeUnknownSync(StopStreamOutput)({ outputActive: false })
}

export const toggleStream = async (client: ObsClient): Promise<ToggleStreamOutput> => {
  const response = await client.request(ToggleStream)
  return Schema.decodeUnknownSync(ToggleStreamOutput)(response)
}
