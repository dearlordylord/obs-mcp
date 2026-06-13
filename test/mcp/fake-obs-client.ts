import { Schema } from "effect"

import type { ObsClient } from "../../src/obs/client.js"
import type { ObsRequestType } from "../../src/obs/requests.js"
import { DEFAULT_AVAILABLE_REQUESTS } from "../obs/fake-obs-fixtures.js"

export const allAvailableRequests = DEFAULT_AVAILABLE_REQUESTS

export type FakeObsRequestHandler = (
  requestType: ObsRequestType,
  requestData: unknown
) => Promise<unknown>

export const fakeObsClient = (
  handler: FakeObsRequestHandler,
  availableRequests: ReadonlyArray<string> = allAvailableRequests
): ObsClient => ({
  negotiatedRpcVersion: 1,
  availableRequests,
  request: async (descriptor, requestData) =>
    Schema.decodeUnknownSync(descriptor.responseSchema)(await handler(descriptor.requestType, requestData)),
  close: async () => undefined
})
