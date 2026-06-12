import { Schema } from "effect"

import { UnknownRecord } from "../domain/schemas/shared.js"

const OP_HELLO = 0
export const OP_IDENTIFY = 1
export const OP_IDENTIFIED = 2
const OP_EVENT = 5
export const OP_REQUEST = 6
export const OP_REQUEST_RESPONSE = 7

const ObsAuthenticationSchema = Schema.Struct({
  challenge: Schema.String,
  salt: Schema.String
})

const HelloEnvelope = Schema.Struct({
  op: Schema.Literal(OP_HELLO),
  d: Schema.Struct({
    obsStudioVersion: Schema.String,
    obsWebSocketVersion: Schema.String,
    rpcVersion: Schema.Number,
    authentication: Schema.optional(ObsAuthenticationSchema)
  })
})

const IdentifiedEnvelope = Schema.Struct({
  op: Schema.Literal(OP_IDENTIFIED),
  d: Schema.Struct({
    negotiatedRpcVersion: Schema.Number
  })
})

const RequestStatus = Schema.Struct({
  result: Schema.Boolean,
  code: Schema.Number,
  comment: Schema.optional(Schema.String)
})

export const RequestResponseEnvelope = Schema.Struct({
  op: Schema.Literal(OP_REQUEST_RESPONSE),
  d: Schema.Struct({
    requestType: Schema.String,
    requestId: Schema.String,
    requestStatus: RequestStatus,
    responseData: Schema.optional(UnknownRecord)
  })
})
export type RequestResponseEnvelope = typeof RequestResponseEnvelope.Type

const ObsEnvelope = Schema.Union(
  HelloEnvelope,
  IdentifiedEnvelope,
  RequestResponseEnvelope,
  Schema.Struct({
    op: Schema.Literal(OP_EVENT),
    d: UnknownRecord
  })
)
type ObsEnvelope = typeof ObsEnvelope.Type

export const decodeJsonTextEnvelope = (message: string): ObsEnvelope => {
  const parsed = JSON.parse(message)
  return Schema.decodeUnknownSync(ObsEnvelope)(parsed)
}
