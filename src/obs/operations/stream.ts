import { Schema } from "effect"
import {
  SendStreamCaptionInput,
  SendStreamCaptionOutput,
  StartStreamOutput,
  StopStreamOutput,
  StreamStatusOutput,
  ToggleStreamOutput
} from "../../domain/schemas/stream.js"
import type { ObsClient } from "../client.js"
import { GetStreamStatus, SendStreamCaption, StartStream, StopStream, ToggleStream } from "../requests.js"
import { requestAndDecode, requestAndReturn } from "./shared.js"

export const getStreamStatus = async (client: ObsClient): Promise<StreamStatusOutput> => {
  return requestAndDecode(client, GetStreamStatus, StreamStatusOutput)
}

export const startStream = async (client: ObsClient): Promise<StartStreamOutput> => {
  return requestAndReturn(client, StartStream, { outputActive: true }, StartStreamOutput)
}

export const stopStream = async (client: ObsClient): Promise<StopStreamOutput> => {
  return requestAndReturn(client, StopStream, { outputActive: false }, StopStreamOutput)
}

export const toggleStream = async (client: ObsClient): Promise<ToggleStreamOutput> => {
  return requestAndDecode(client, ToggleStream, ToggleStreamOutput)
}

export const sendStreamCaption = async (
  client: ObsClient,
  input: SendStreamCaptionInput
): Promise<SendStreamCaptionOutput> => {
  const decodedInput = Schema.decodeUnknownSync(SendStreamCaptionInput, { onExcessProperty: "error" })(input)
  await client.request(SendStreamCaption, decodedInput)
  return SendStreamCaptionOutput.make({
    requestType: SendStreamCaption.requestType,
    acknowledged: true
  })
}
