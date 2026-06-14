import { Schema } from "effect"
import { type WebSocket, WebSocketServer } from "ws"

import { OBS_REQUEST_TYPES } from "./requests.js"

const OP_HELLO = 0
const OP_IDENTIFY = 1
const OP_IDENTIFIED = 2
const OP_REQUEST = 6
const OP_REQUEST_RESPONSE = 7
const REQUEST_STATUS_SUCCESS = 100
const REQUEST_STATUS_NOT_READY = 207

const IdentifyEnvelope = Schema.Struct({
  op: Schema.Number
})

const RequestEnvelope = Schema.Struct({
  op: Schema.Number,
  d: Schema.Struct({
    requestType: Schema.optional(Schema.String),
    requestId: Schema.optional(Schema.Unknown)
  })
})

export class RunningCapabilityDiscoveryObsServer {
  public constructor(
    public readonly url: string,
    private readonly server: WebSocketServer
  ) {}

  public async close(): Promise<void> {
    for (const client of this.server.clients) client.close()
    await new Promise<void>((resolve, reject) =>
      this.server.close((error) => error === undefined ? resolve() : reject(error))
    )
  }
}

const requestResponse = (
  requestType: unknown,
  requestId: unknown,
  responseData: Record<string, unknown>
): string =>
  JSON.stringify({
    op: OP_REQUEST_RESPONSE,
    d: {
      requestType,
      requestId,
      requestStatus: { result: true, code: REQUEST_STATUS_SUCCESS },
      responseData
    }
  })

const unsupportedResponse = (requestType: unknown, requestId: unknown): string =>
  JSON.stringify({
    op: OP_REQUEST_RESPONSE,
    d: {
      requestType,
      requestId,
      requestStatus: {
        result: false,
        code: REQUEST_STATUS_NOT_READY,
        comment: "OBS MCP capability discovery mode only supports metadata discovery"
      }
    }
  })

const installSocketHandlers = (socket: WebSocket): void => {
  socket.send(JSON.stringify({
    op: OP_HELLO,
    d: {
      obsStudioVersion: "31.0.0",
      obsWebSocketVersion: "5.6.0",
      rpcVersion: 1
    }
  }))
  socket.once("message", (identify) => {
    const envelope = Schema.decodeUnknownSync(IdentifyEnvelope)(JSON.parse(identify.toString("utf8")))
    if (envelope.op !== OP_IDENTIFY) {
      socket.close()
      return
    }
    socket.send(JSON.stringify({ op: OP_IDENTIFIED, d: { negotiatedRpcVersion: 1 } }))
    socket.on("message", (message) => {
      const request = Schema.decodeUnknownSync(RequestEnvelope)(JSON.parse(message.toString("utf8")))
      if (request.op !== OP_REQUEST) {
        return
      }
      const requestType = request.d.requestType
      const requestId = request.d.requestId
      socket.send(
        requestType === "GetVersion"
          ? requestResponse(requestType, requestId, {
            obsVersion: "31.0.0",
            obsWebSocketVersion: "5.6.0",
            rpcVersion: 1,
            availableRequests: OBS_REQUEST_TYPES,
            supportedImageFormats: ["png", "jpg", "webp"],
            platform: "linux",
            platformDescription: "OBS MCP capability discovery mode"
          })
          : unsupportedResponse(requestType, requestId)
      )
    })
  })
}

export const startCapabilityDiscoveryObsServer = async (): Promise<RunningCapabilityDiscoveryObsServer> => {
  const server = new WebSocketServer({ host: "127.0.0.1", port: 0 })
  const address = await new Promise<{ readonly port: number }>((resolve) => {
    server.once("listening", () => {
      const rawAddress = server.address()
      if (typeof rawAddress === "object" && rawAddress !== null) {
        resolve({ port: rawAddress.port })
      }
    })
  })
  server.on("connection", installSocketHandlers)
  return new RunningCapabilityDiscoveryObsServer(`ws://127.0.0.1:${address.port}`, server)
}
