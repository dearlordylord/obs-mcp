import { Server } from "@modelcontextprotocol/sdk/server/index.js"
import {
  CallToolRequestSchema,
  type CallToolResult,
  ErrorCode,
  ListToolsRequestSchema,
  type ListToolsResult,
  McpError
} from "@modelcontextprotocol/sdk/types.js"
import { Schema } from "effect"

import type { ObsConfig } from "../config/config.js"
import type { ObsClient } from "../obs/client.js"
import { packageVersion } from "../version.js"
import { executeTool, getEnabledTools } from "./tools/registry.js"

interface ProtocolObjectSchemaSource {
  readonly type: "object"
  readonly properties?: Record<string, object> | undefined
  readonly required?: ReadonlyArray<string> | undefined
  readonly [key: string]: unknown
}

type ProtocolObjectSchema = ListToolsResult["tools"][number]["inputSchema"]

const JsonSchema = Schema.Record({ key: Schema.String, value: Schema.Unknown })
const JsonSchemaProperties = Schema.Record({ key: Schema.String, value: Schema.Object })

/* v8 ignore start -- defensive normalization for Effect-generated JSON Schemas; list/call handlers are covered. */
const jsonObjectSchema = (schema: unknown): ProtocolObjectSchemaSource => {
  const record = Schema.decodeUnknownSync(JsonSchema)(schema)
  const isObjectUnion = Array.isArray(record["anyOf"])
  if (record["type"] !== "object" && !isObjectUnion) {
    /* v8 ignore next */
    throw new McpError(ErrorCode.InternalError, "Tool schema must be a JSON object schema")
  }
  const required = Array.isArray(record["required"])
    ? record["required"].filter((entry): entry is string => typeof entry === "string")
    : undefined
  const properties = typeof record["properties"] === "object" && record["properties"] !== null
      && !Array.isArray(record["properties"])
    ? Schema.decodeUnknownSync(JsonSchemaProperties)(record["properties"])
    : undefined
  return {
    ...record,
    type: "object",
    ...(properties === undefined ? {} : { properties }),
    ...(required === undefined ? {} : { required })
  }
}

const encodeJsonText = (value: unknown): string => {
  const encoded = JSON.stringify(value)
  return typeof encoded === "string" ? encoded : "null"
}

const toProtocolObjectSchema = (schema: ProtocolObjectSchemaSource): ProtocolObjectSchema => {
  const { properties, required, ...rest } = schema
  return {
    ...rest,
    type: "object",
    ...(properties === undefined ? {} : { properties }),
    ...(required === undefined ? {} : { required: [...required] })
  }
}
/* v8 ignore stop */

const successResult = (value: unknown): CallToolResult => {
  const structuredContent = Schema.decodeUnknownSync(JsonSchema)(value)
  return {
    content: [{ type: "text", text: encodeJsonText(value) }],
    structuredContent
  }
}

const errorResult = (error: McpError): CallToolResult => {
  const data = typeof error.data === "object" && error.data !== null ? error.data : {}
  const metadata = Schema.decodeUnknownSync(JsonSchema)({
    error: {
      code: error.code,
      message: error.message,
      ...data
    }
  })
  return {
    content: [{ type: "text", text: error.message }],
    _meta: metadata,
    isError: true
  }
}

const unknownToolError = (toolName: string): McpError =>
  new McpError(ErrorCode.InvalidParams, `Unknown tool: ${toolName}`)

export const createObsMcpServer = (config: ObsConfig, client: ObsClient): Server => {
  const server = new Server(
    {
      name: "io.github.dearlordylord/obs-mcp",
      version: packageVersion
    },
    {
      capabilities: {
        tools: {}
      }
    }
  )

  const tools = getEnabledTools(config.enabledToolsets, client.availableRequests)
  const byName = new Map(tools.map((tool) => [tool.name, tool]))

  server.setRequestHandler(ListToolsRequestSchema, () => ({
    tools: tools.map((tool) => ({
      name: tool.name,
      title: tool.title,
      description: tool.description,
      inputSchema: toProtocolObjectSchema(jsonObjectSchema(tool.inputJsonSchema)),
      outputSchema: toProtocolObjectSchema(jsonObjectSchema(tool.outputJsonSchema))
    }))
  }))

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const tool = byName.get(request.params.name)
    if (tool === undefined) {
      return errorResult(unknownToolError(request.params.name))
    }

    try {
      return successResult(await executeTool(tool, request.params.arguments, { config, client }))
    } catch (error) {
      /* v8 ignore next */
      return errorResult(error instanceof McpError ? error : new McpError(ErrorCode.InternalError, String(error)))
    }
  })

  return server
}
