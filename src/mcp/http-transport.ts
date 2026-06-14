import { timingSafeEqual } from "node:crypto"
import { createServer, type IncomingMessage, type Server as NodeHttpServer, type ServerResponse } from "node:http"

import { type Server } from "@modelcontextprotocol/sdk/server/index.js"
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js"
import type { Transport } from "@modelcontextprotocol/sdk/shared/transport.js"

interface HttpTransportConfig {
  readonly host: string
  readonly port: number
  readonly authToken?: string | undefined
}

export interface RunningHttpTransport {
  readonly url: string
  readonly server: NodeHttpServer
}

interface HttpTransportDependencies {
  readonly createTransport?: () => StreamableHTTPServerTransport
  readonly writeError?: (message: string) => void
}

const MCP_ENDPOINT_PATH = "/mcp"
const HTTP_UNAUTHORIZED = 401
const HTTP_NOT_FOUND = 404
const HTTP_METHOD_NOT_ALLOWED = 405
const HTTP_INTERNAL_SERVER_ERROR = 500

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

export const stopHttpTransport = async (transport: RunningHttpTransport): Promise<void> =>
  closeNodeHttpServer(transport.server)

const listen = (server: NodeHttpServer, port: number, host: string): Promise<void> =>
  new Promise((resolve, reject) => {
    server.once("error", reject)
    server.listen(port, host, () => {
      server.off("error", reject)
      resolve()
    })
  })

export const startHttpTransport = async (
  config: HttpTransportConfig,
  createMcpServer: () => Server,
  dependencies: HttpTransportDependencies = {}
): Promise<RunningHttpTransport> => {
  const writeError = dependencies.writeError ?? ((message: string) => process.stderr.write(message))
  const createTransport = dependencies.createTransport ?? (() => new StreamableHTTPServerTransport({}))

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

      if (req.method !== "POST") {
        writeJsonRpcError(res, HTTP_METHOD_NOT_ALLOWED, "Method not allowed (stateless mode)")
        return
      }

      const mcpServer = createMcpServer()
      const transport = createTransport()
      try {
        // SDK exact-optional-types mismatch: StreamableHTTPServerTransport implements Transport at runtime.
        // eslint-disable-next-line no-restricted-syntax
        await mcpServer.connect(transport as Transport)
        await transport.handleRequest(req, res)
      } catch (error) {
        writeJsonRpcError(res, HTTP_INTERNAL_SERVER_ERROR, `Internal server error: ${String(error)}`)
      } finally {
        await transport.close().catch((error: unknown) => {
          writeError(`HTTP transport cleanup error: ${String(error)}\n`)
        })
        await mcpServer.close().catch((error: unknown) => {
          writeError(`HTTP MCP server cleanup error: ${String(error)}\n`)
        })
      }
    })().catch((error: unknown) => {
      writeJsonRpcError(res, HTTP_INTERNAL_SERVER_ERROR, `Internal server error: ${String(error)}`)
    })
  })

  await listen(server, config.port, config.host)
  const address = server.address()
  const port = typeof address === "object" && address !== null ? address.port : config.port
  return {
    url: `http://${config.host}:${String(port)}${MCP_ENDPOINT_PATH}`,
    server
  }
}
