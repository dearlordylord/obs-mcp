import { randomUUID, timingSafeEqual } from "node:crypto"
import { createServer, type IncomingMessage, type Server as NodeHttpServer, type ServerResponse } from "node:http"
import type { Socket } from "node:net"

import { type Server } from "@modelcontextprotocol/sdk/server/index.js"
import {
  StreamableHTTPServerTransport,
  type StreamableHTTPServerTransportOptions
} from "@modelcontextprotocol/sdk/server/streamableHttp.js"
import type { Transport } from "@modelcontextprotocol/sdk/shared/transport.js"

import { DEFAULT_MCP_HTTP_SESSION_IDLE_TIMEOUT_MS } from "../config/config.js"

type HttpSessionMode = "stateful" | "stateless"

interface HttpTransportConfig {
  readonly host: string
  readonly port: number
  readonly authToken?: string | undefined
  readonly sessionMode?: HttpSessionMode | undefined
  readonly sessionIdleTimeoutMs?: number | undefined
}

export interface RunningHttpTransport {
  readonly url: string
  readonly server: NodeHttpServer
}

interface HttpTransportDependencies {
  readonly createTransport?: (options?: StreamableHTTPServerTransportOptions) => StreamableHTTPServerTransport
  readonly writeError?: (message: string) => void
}

const MCP_ENDPOINT_PATH = "/mcp"
const DEFAULT_HTTP_SESSION_MODE: HttpSessionMode = "stateful"
const HTTP_BAD_REQUEST = 400
const HTTP_UNAUTHORIZED = 401
const HTTP_NOT_FOUND = 404
const HTTP_METHOD_NOT_ALLOWED = 405
const HTTP_INTERNAL_SERVER_ERROR = 500
const HTTP_SERVICE_UNAVAILABLE = 503
const HTTP_SUCCESS_MIN = 200
const HTTP_REDIRECT_MIN = 300
const runningTransportClosers = new WeakMap<RunningHttpTransport, () => Promise<void>>()

const writeJsonRpcError = (res: ServerResponse, status: number, message: string): void => {
  if (res.headersSent) return
  // eslint-disable-next-line functional/immutable-data -- Node HTTP response mutation is the boundary API.
  res.statusCode = status
  res.setHeader("content-type", "application/json")
  res.end(JSON.stringify({
    jsonrpc: "2.0",
    error: { code: -32000, message },
    id: null
  }))
}

const activeAuthToken = (authToken: string | undefined): string | undefined => {
  const trimmed = authToken?.trim()
  return trimmed === undefined || trimmed === "" ? undefined : trimmed
}

const extractBearerToken = (authorization: string | Array<string> | undefined): string | undefined => {
  if (typeof authorization !== "string") return undefined
  const match = /^Bearer ([^ ]+)$/iu.exec(authorization)
  return match?.[1]
}

const tokenMatches = (received: string, expected: string): boolean => {
  const receivedBuffer = Buffer.from(received, "utf8")
  const expectedBuffer = Buffer.from(expected, "utf8")
  if (receivedBuffer.length !== expectedBuffer.length) return false
  return timingSafeEqual(receivedBuffer, expectedBuffer)
}

const isAuthorized = (req: IncomingMessage, authToken: string | undefined): boolean => {
  const expected = activeAuthToken(authToken)
  if (expected === undefined) return true
  const received = extractBearerToken(req.headers.authorization)
  return received !== undefined && tokenMatches(received, expected)
}

const closeNodeHttpServer = (server: NodeHttpServer): Promise<void> =>
  new Promise((resolve, reject) => {
    server.close((error) => error === undefined ? resolve() : reject(error))
  })

export const stopHttpTransport = async (transport: RunningHttpTransport): Promise<void> => {
  const close = runningTransportClosers.get(transport)
  if (close !== undefined) {
    await close()
    return
  }
  await closeNodeHttpServer(transport.server)
}

const listen = (server: NodeHttpServer, port: number, host: string): Promise<void> =>
  new Promise((resolve, reject) => {
    server.once("error", reject)
    server.listen(port, host, () => {
      server.off("error", reject)
      resolve()
    })
  })

const sessionIdFromHeader = (value: string | Array<string> | undefined): string | undefined => {
  if (typeof value === "string" && value.length > 0) {
    return value
  }
  return value?.[0]
}

const cleanupError = (
  writeError: (message: string) => void,
  message: string,
  error: unknown
): void => {
  writeError(`${message}: ${String(error)}\n`)
}

class StatefulHttpSession {
  private idleTimer: NodeJS.Timeout | undefined
  private closing: Promise<void> | undefined
  private activeRequests = 0

  constructor(
    readonly id: string,
    readonly mcpServer: Server,
    readonly transport: StreamableHTTPServerTransport
  ) {}

  beginRequest(): void {
    this.activeRequests += 1
    this.clearIdleCleanup()
  }

  endRequest(
    idleTimeoutMs: number,
    closeSession: (session: StatefulHttpSession) => Promise<void>,
    writeError: (message: string) => void
  ): void {
    this.activeRequests = Math.max(0, this.activeRequests - 1)
    if (this.activeRequests === 0) {
      this.scheduleIdleCleanup(idleTimeoutMs, closeSession, writeError)
    }
  }

  scheduleIdleCleanup(
    idleTimeoutMs: number,
    closeSession: (session: StatefulHttpSession) => Promise<void>,
    writeError: (message: string) => void
  ): void {
    this.clearIdleCleanup()
    this.idleTimer = setTimeout(() => {
      void closeSession(this).catch((error: unknown) =>
        cleanupError(writeError, `HTTP session idle cleanup error for ${this.id}`, error)
      )
    }, idleTimeoutMs)
    this.idleTimer.unref()
  }

  private clearIdleCleanup(): void {
    if (this.idleTimer !== undefined) {
      clearTimeout(this.idleTimer)
      this.idleTimer = undefined
    }
  }

  async close(writeError: (message: string) => void): Promise<void> {
    if (this.closing !== undefined) {
      return this.closing
    }
    this.closing = this.closeOnce(writeError)
    return this.closing
  }

  private async closeOnce(writeError: (message: string) => void): Promise<void> {
    this.clearIdleCleanup()
    await this.transport.close().catch((error: unknown) => {
      cleanupError(writeError, `HTTP transport cleanup error for ${this.id}`, error)
    })
    await this.mcpServer.close().catch((error: unknown) => {
      cleanupError(writeError, `HTTP MCP server cleanup error for ${this.id}`, error)
    })
  }
}

const connectMcpServer = async (
  mcpServer: Server,
  transport: StreamableHTTPServerTransport
): Promise<void> => {
  // SDK exact-optional-types mismatch: StreamableHTTPServerTransport implements Transport at runtime.
  // eslint-disable-next-line no-restricted-syntax
  await mcpServer.connect(transport as Transport)
}

export const startHttpTransport = async (
  config: HttpTransportConfig,
  createMcpServer: () => Server,
  dependencies: HttpTransportDependencies = {}
): Promise<RunningHttpTransport> => {
  const writeError = dependencies.writeError ?? ((message: string) => process.stderr.write(message))
  const createTransport = dependencies.createTransport ?? ((options) => new StreamableHTTPServerTransport(options))
  const sessionMode = config.sessionMode ?? DEFAULT_HTTP_SESSION_MODE
  const sessionIdleTimeoutMs = config.sessionIdleTimeoutMs ?? DEFAULT_MCP_HTTP_SESSION_IDLE_TIMEOUT_MS
  const sessions = new Map<string, StatefulHttpSession>()
  const sockets = new Set<Socket>()
  let closed = false

  const closeSession = async (session: StatefulHttpSession): Promise<void> => {
    sessions.delete(session.id)
    await session.close(writeError)
  }

  const closeAllSessions = async (): Promise<void> => {
    await Promise.all([...sessions.values()].map(closeSession))
  }

  const touchSession = (session: StatefulHttpSession): void => {
    session.scheduleIdleCleanup(sessionIdleTimeoutMs, closeSession, writeError)
  }

  const destroyActiveSockets = (): void => {
    for (const socket of sockets) {
      socket.destroy()
    }
    sockets.clear()
  }

  const beginSessionRequest = (session: StatefulHttpSession): () => void => {
    let ended = false
    session.beginRequest()
    return () => {
      if (ended || !sessions.has(session.id)) {
        return
      }
      ended = true
      session.endRequest(sessionIdleTimeoutMs, closeSession, writeError)
    }
  }

  const handleStatelessPost = async (req: IncomingMessage, res: ServerResponse): Promise<void> => {
    const mcpServer = createMcpServer()
    const transport = createTransport()
    try {
      await connectMcpServer(mcpServer, transport)
      await transport.handleRequest(req, res)
    } catch (error) {
      writeJsonRpcError(res, HTTP_INTERNAL_SERVER_ERROR, `Internal server error: ${String(error)}`)
    } finally {
      await transport.close().catch((error: unknown) => {
        cleanupError(writeError, "HTTP transport cleanup error", error)
      })
      await mcpServer.close().catch((error: unknown) => {
        cleanupError(writeError, "HTTP MCP server cleanup error", error)
      })
    }
  }

  const handleStatefulInitialization = async (req: IncomingMessage, res: ServerResponse): Promise<void> => {
    const mcpServer = createMcpServer()
    let initializedSession: StatefulHttpSession | undefined
    // eslint-disable-next-line prefer-const -- the SDK session callback needs this binding before construction.
    let transport: StreamableHTTPServerTransport | undefined

    const registerSession = (sessionId: string): void => {
      if (closed) {
        throw new Error("HTTP transport is shutting down")
      }
      if (transport === undefined) {
        throw new Error("HTTP session initialized before transport was created")
      }
      if (sessions.has(sessionId)) {
        throw new Error(`Duplicate HTTP session ID: ${sessionId}`)
      }
      initializedSession = new StatefulHttpSession(sessionId, mcpServer, transport)
      sessions.set(sessionId, initializedSession)
    }

    transport = createTransport({
      sessionIdGenerator: randomUUID,
      onsessioninitialized: registerSession
    })

    try {
      await connectMcpServer(mcpServer, transport)
      await transport.handleRequest(req, res)
      if (initializedSession !== undefined) {
        touchSession(initializedSession)
      }
    } catch (error) {
      writeJsonRpcError(res, HTTP_INTERNAL_SERVER_ERROR, `Internal server error: ${String(error)}`)
    } finally {
      if (initializedSession === undefined) {
        await transport.close().catch((error: unknown) => {
          cleanupError(writeError, "HTTP tentative transport cleanup error", error)
        })
        await mcpServer.close().catch((error: unknown) => {
          cleanupError(writeError, "HTTP tentative MCP server cleanup error", error)
        })
      }
    }
  }

  const handleStatefulRequest = async (req: IncomingMessage, res: ServerResponse): Promise<void> => {
    if (closed) {
      writeJsonRpcError(res, HTTP_SERVICE_UNAVAILABLE, "HTTP transport is shutting down")
      return
    }

    if (req.method !== "POST" && req.method !== "GET" && req.method !== "DELETE") {
      writeJsonRpcError(res, HTTP_METHOD_NOT_ALLOWED, "Method not allowed")
      return
    }

    const sessionId = sessionIdFromHeader(req.headers["mcp-session-id"])
    if (sessionId !== undefined) {
      const session = sessions.get(sessionId)
      if (session === undefined) {
        writeJsonRpcError(res, HTTP_NOT_FOUND, "Session not found")
        return
      }
      const endSessionRequest = beginSessionRequest(session)
      let handled = false
      if (req.method === "GET") {
        res.once("close", endSessionRequest)
      }
      try {
        await session.transport.handleRequest(req, res)
        handled = true
      } catch (error) {
        writeJsonRpcError(res, HTTP_INTERNAL_SERVER_ERROR, `Internal server error: ${String(error)}`)
      } finally {
        if (req.method !== "GET") {
          endSessionRequest()
        }
        if (
          req.method === "DELETE"
          && handled
          && res.statusCode >= HTTP_SUCCESS_MIN
          && res.statusCode < HTTP_REDIRECT_MIN
        ) {
          await closeSession(session)
        }
      }
      return
    }

    if (req.method === "GET" || req.method === "DELETE") {
      writeJsonRpcError(res, HTTP_BAD_REQUEST, "Mcp-Session-Id header is required")
      return
    }

    await handleStatefulInitialization(req, res)
  }

  const handleMcpRequest = async (req: IncomingMessage, res: ServerResponse): Promise<void> => {
    if (sessionMode === "stateful") {
      await handleStatefulRequest(req, res)
      return
    }

    if (req.method !== "POST") {
      writeJsonRpcError(res, HTTP_METHOD_NOT_ALLOWED, "Method not allowed (stateless mode)")
      return
    }

    await handleStatelessPost(req, res)
  }

  const server = createServer((req, res) => {
    void (async () => {
      const path = new URL(req.url ?? "/", `http://${req.headers.host ?? `${config.host}:${String(config.port)}`}`)
        .pathname

      if (path !== MCP_ENDPOINT_PATH) {
        writeJsonRpcError(res, HTTP_NOT_FOUND, "Not found")
        return
      }

      if (!isAuthorized(req, config.authToken)) {
        res.setHeader("WWW-Authenticate", "Bearer")
        writeJsonRpcError(res, HTTP_UNAUTHORIZED, "Unauthorized")
        return
      }

      await handleMcpRequest(req, res)
    })().catch((error: unknown) => {
      writeJsonRpcError(res, HTTP_INTERNAL_SERVER_ERROR, `Internal server error: ${String(error)}`)
    })
  })
  server.on("connection", (socket) => {
    sockets.add(socket)
    socket.once("close", () => {
      sockets.delete(socket)
    })
  })

  await listen(server, config.port, config.host)
  const address = server.address()
  const port = typeof address === "object" && address !== null ? address.port : config.port
  const running: RunningHttpTransport = {
    url: `http://${config.host}:${String(port)}${MCP_ENDPOINT_PATH}`,
    server
  }
  runningTransportClosers.set(running, async () => {
    if (closed) {
      return
    }
    closed = true
    const serverClosed = closeNodeHttpServer(server)
    await closeAllSessions()
    destroyActiveSockets()
    await serverClosed
  })
  return running
}
