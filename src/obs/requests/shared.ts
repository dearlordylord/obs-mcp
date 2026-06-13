import { Schema } from "effect"

import type { ObsRequestType } from "../requests.js"

export interface ObsRequestDescriptor<Output extends Record<string, unknown>> {
  readonly requestType: ObsRequestType
  readonly requestDataSchema: Schema.Schema.AnyNoContext
  readonly responseSchema: Schema.Schema<Output>
}

export const EmptyRequestData = Schema.Struct({})
