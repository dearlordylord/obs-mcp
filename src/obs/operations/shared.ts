import { Schema } from "effect"

import type { ObsClient } from "../client.js"
import type { ObsRequestDescriptor } from "../requests.js"

export const requestAndDecode = async <Output extends Record<string, unknown>>(
  client: ObsClient,
  descriptor: ObsRequestDescriptor<Output>,
  outputSchema: Schema.Schema<Output>
): Promise<Output> => Schema.decodeUnknownSync(outputSchema)(await client.request(descriptor))

export const requestAndReturn = async <
  Response extends Record<string, unknown>,
  Output extends Record<string, unknown>
>(
  client: ObsClient,
  descriptor: ObsRequestDescriptor<Response>,
  output: Output,
  outputSchema: Schema.Schema<Output>
): Promise<Output> => {
  await client.request(descriptor)
  return Schema.decodeUnknownSync(outputSchema)(output)
}

export const withDefinedFields = <T extends Record<string, unknown>>(fields: T) =>
  Object.fromEntries(Object.entries(fields).filter(([, value]) => value !== undefined))

export const acknowledged = <RequestType extends string>(
  requestType: RequestType
): { readonly requestType: RequestType; readonly acknowledged: true } => ({
  requestType,
  acknowledged: true
})

export const outputActive = (active: boolean): { readonly outputActive: boolean } => ({ outputActive: active })

export const outputActiveSwitch = (
  active: boolean
): { readonly outputActive: boolean; readonly switched: true } => ({ outputActive: active, switched: true })
