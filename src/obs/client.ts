import { Option, Schema } from "effect"
import { randomUUID } from "node:crypto"
import WebSocket from "ws"

import { type ObsConfig, redactedObsWebSocketUrl } from "../config/config.js"
import { UnknownRecord } from "../domain/schemas/shared.js"
import { calculateObsAuthentication } from "./auth.js"
import { ObsProtocolError, ObsRequestError, ObsTimeoutError } from "./errors.js"
import {
  decodeEventEnvelope,
  decodeJsonTextEnvelope,
  type EventEnvelope,
  OP_EVENT,
  OP_IDENTIFIED,
  OP_IDENTIFY,
  OP_REQUEST,
  OP_REQUEST_RESPONSE,
  type RequestResponseEnvelope,
  SAFE_EVENT_SUBSCRIPTION_MASK,
  shouldSurfaceSafeEvent
} from "./protocol.js"
import { GetVersion, type ObsRequestDescriptor } from "./requests.js"

const SUPPORTED_RPC_VERSION = 1

interface PendingRequestMetadata {
  readonly requestType: string
  readonly timer: NodeJS.Timeout
}

interface PendingRequestCallbacks {
  readonly resolve: (value: Record<string, unknown>) => void
  readonly reject: (error: Error) => void
}

type PendingRequest = PendingRequestMetadata & PendingRequestCallbacks

interface ObsClientState {
  readonly negotiatedRpcVersion: number
  readonly availableRequests: ReadonlyArray<string>
}

interface ObsClientCommands {
  request<Output extends Record<string, unknown>>(
    descriptor: ObsRequestDescriptor<Output>,
    requestData?: Record<string, unknown>
  ): Promise<Output>
  close(): Promise<void>
}

export type ObsClient = ObsClientState & ObsClientCommands

export const createObsClient = async (config: ObsConfig): Promise<ObsClient> => {
  const ws = new WebSocket(config.url, "obswebsocket.json")
  const pending = new Map<string, PendingRequest>()
  const queuedMessages: Array<{ readonly data: WebSocket.RawData; readonly isBinary: boolean }> = []
  const messageWaiters: Array<{
    readonly resolve: (message: { readonly data: WebSocket.RawData; readonly isBinary: boolean }) => void
  }> = []
  let negotiatedRpcVersion = 0
  let closed = false

  const onBufferedMessage = (data: WebSocket.RawData, isBinary: boolean): void => {
    const waiter = messageWaiters.shift()
    if (waiter === undefined) {
      queuedMessages.push({ data, isBinary })
      return
    }
    waiter.resolve({ data, isBinary })
  }
  ws.on("message", onBufferedMessage)

  const rejectAll = (error: Error): void => {
    for (const request of pending.values()) {
      clearTimeout(request.timer)
      request.reject(error)
    }
    pending.clear()
  }

  const waitForOpen = async (): Promise<void> =>
    new Promise((resolve, reject) => {
      /* v8 ignore next 3 */
      const timer = setTimeout(() => {
        reject(new ObsTimeoutError(`Timed out connecting to OBS at ${redactedObsWebSocketUrl(config.url)}`))
        ws.close()
      }, config.connectionTimeoutMs)
      ws.once("open", () => {
        clearTimeout(timer)
        resolve()
      })
      /* v8 ignore next 4 */
      ws.once("error", (error) => {
        clearTimeout(timer)
        reject(error)
      })
    })

  const nextTextMessage = async (): Promise<string> =>
    new Promise((resolve, reject) => {
      /* v8 ignore next 4 */
      const timer = setTimeout(
        () => reject(new ObsTimeoutError("Timed out waiting for OBS handshake")),
        config.connectionTimeoutMs
      )
      /* v8 ignore next 4 */
      const onClose = (): void => {
        cleanup()
        reject(new ObsProtocolError("OBS closed the socket during handshake"))
      }
      /* v8 ignore next 4 */
      const onError = (error: Error): void => {
        cleanup()
        reject(error)
      }
      const cleanup = (): void => {
        clearTimeout(timer)
        ws.off("close", onClose)
        ws.off("error", onError)
      }
      const handleMessage = (data: WebSocket.RawData, isBinary: boolean): void => {
        cleanup()
        if (isBinary) {
          reject(new ObsProtocolError("OBS sent a binary frame; JSON text frames are required"))
          return
        }
        resolve(data.toString("utf8"))
      }
      const queued = queuedMessages.shift()
      if (queued !== undefined) {
        handleMessage(queued.data, queued.isBinary)
        return
      }
      messageWaiters.push({ resolve: (message) => handleMessage(message.data, message.isBinary) })
      ws.once("close", onClose)
      ws.once("error", onError)
    })

  try {
    await waitForOpen()
    const hello = decodeJsonTextEnvelope(await nextTextMessage())
    if (hello.op !== 0) {
      throw new ObsProtocolError("Expected OBS Hello message")
    }
    if (hello.d.rpcVersion < SUPPORTED_RPC_VERSION) {
      throw new ObsProtocolError(`OBS websocket RPC version ${hello.d.rpcVersion} is not supported`)
    }

    const password = Option.getOrUndefined(config.password)
    const identifyData: Record<string, unknown> = {
      rpcVersion: SUPPORTED_RPC_VERSION,
      eventSubscriptions: SAFE_EVENT_SUBSCRIPTION_MASK
    }
    if (hello.d.authentication !== undefined) {
      if (password === undefined || password.length === 0) {
        throw new ObsProtocolError("OBS requires authentication but OBS_WEBSOCKET_PASSWORD is not configured")
      }
      identifyData["authentication"] = calculateObsAuthentication(password, hello.d.authentication)
    }
    ws.send(JSON.stringify({ op: OP_IDENTIFY, d: identifyData }))

    const identified = decodeJsonTextEnvelope(await nextTextMessage())
    if (identified.op !== OP_IDENTIFIED) {
      throw new ObsProtocolError("Expected OBS Identified message")
    }
    negotiatedRpcVersion = identified.d.negotiatedRpcVersion
    ws.off("message", onBufferedMessage)
  } catch (error) {
    ws.off("message", onBufferedMessage)
    if (ws.readyState !== WebSocket.CLOSED && ws.readyState !== WebSocket.CLOSING) {
      ws.close()
    }
    throw error
  }

  const handleResponse = (response: RequestResponseEnvelope): void => {
    const pendingRequest = pending.get(response.d.requestId)
    if (pendingRequest === undefined) {
      return
    }
    pending.delete(response.d.requestId)
    clearTimeout(pendingRequest.timer)
    if (response.d.requestStatus.result === false) {
      pendingRequest.reject(
        new ObsRequestError(response.d.requestType, response.d.requestStatus.code, response.d.requestStatus.comment)
      )
      return
    }
    pendingRequest.resolve(response.d.responseData ?? {})
  }

  const handleEvent = (event: EventEnvelope): void => {
    if (!shouldSurfaceSafeEvent(event)) {
      return
    }
  }

  ws.on("message", (data, isBinary) => {
    if (isBinary) {
      rejectAll(new ObsProtocolError("OBS sent a binary frame; JSON text frames are required"))
      ws.close()
      return
    }
    try {
      const text = data.toString("utf8")
      const envelope = decodeJsonTextEnvelope(text)
      if (envelope.op === OP_REQUEST_RESPONSE) {
        handleResponse(envelope)
        return
      }
      if (envelope.op === OP_EVENT) {
        handleEvent(decodeEventEnvelope(text))
      }
    } catch (error) {
      /* v8 ignore next */
      const protocolError = error instanceof Error ? error : new ObsProtocolError(String(error))
      rejectAll(protocolError)
      ws.close()
    }
  })
  ws.on("close", () => {
    closed = true
    rejectAll(new ObsProtocolError("OBS websocket closed"))
  })
  /* v8 ignore next 3 */
  ws.on("error", (error) => {
    rejectAll(error)
  })

  const sendRawRequest = async (
    requestType: string,
    requestData?: Record<string, unknown>
  ): Promise<Record<string, unknown>> =>
    new Promise((resolve, reject) => {
      if (closed) {
        reject(new ObsProtocolError("OBS websocket is closed"))
        return
      }
      const requestId = randomUUID()
      const timer = setTimeout(() => {
        pending.delete(requestId)
        reject(new ObsTimeoutError(`Timed out waiting for OBS ${requestType} response`))
      }, config.connectionTimeoutMs)
      pending.set(requestId, { requestType, resolve, reject, timer })
      ws.send(JSON.stringify({
        op: OP_REQUEST,
        d: requestData === undefined
          ? { requestType, requestId }
          : { requestType, requestId, requestData }
      }))
    })

  const request = async <Output extends Record<string, unknown>>(
    descriptor: ObsRequestDescriptor<Output>,
    requestData?: Record<string, unknown>
  ): Promise<Output> => {
    const decodedRequestData = requestData === undefined
      ? undefined
      : Schema.decodeUnknownSync(UnknownRecord)(Schema.decodeUnknownSync(descriptor.requestDataSchema)(requestData))
    return Schema.decodeUnknownSync(descriptor.responseSchema)(
      await sendRawRequest(descriptor.requestType, decodedRequestData)
    )
  }

  const getVersion = await request(GetVersion)
  const availableRequests = Schema.decodeUnknownSync(Schema.Array(Schema.String))(getVersion["availableRequests"])

  return {
    negotiatedRpcVersion,
    availableRequests,
    request,
    close: async () => {
      rejectAll(new ObsProtocolError("OBS client closed"))
      if (ws.readyState === WebSocket.CLOSED) {
        return
      }
      await new Promise<void>((resolve) => {
        ws.once("close", () => resolve())
        ws.close()
      })
    }
  }
}
