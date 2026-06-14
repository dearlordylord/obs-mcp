import { Server } from "@modelcontextprotocol/sdk/server/index.js"
import {
  CallToolRequestSchema,
  type CallToolResult,
  ErrorCode,
  ListResourcesRequestSchema,
  ListResourceTemplatesRequestSchema,
  ListToolsRequestSchema,
  type ListToolsResult,
  McpError,
  ReadResourceRequestSchema,
  SubscribeRequestSchema,
  UnsubscribeRequestSchema
} from "@modelcontextprotocol/sdk/types.js"
import { Schema } from "effect"

import type { ObsConfig } from "../config/config.js"
import { JsonRecordKey } from "../domain/schemas/shared.js"
import type { ObsClient } from "../obs/client.js"
import { packageVersion } from "../version.js"
import { toMcpError } from "./error-mapping.js"
import { resourceDefinitions, resourceLinksForTool, resourceTemplateDefinitions } from "./resources/index.js"
import {
  createScreenshotResourceStore,
  invalidationGroupsForObsEvent,
  invalidationGroupsForTool,
  ResourceManager,
  type ScreenshotMetadata,
  type ScreenshotResourceStore
} from "./resources/mechanics.js"
import { executeTool, getEnabledTools } from "./tools/index.js"

interface ProtocolObjectSchemaSource {
  readonly type: "object"
  readonly properties?: Record<string, object> | undefined
  readonly required?: ReadonlyArray<string> | undefined
  readonly [key: string]: unknown
}

type ProtocolObjectSchema = ListToolsResult["tools"][number]["inputSchema"]

const JsonSchema = Schema.Record({ key: JsonRecordKey, value: Schema.Unknown })
const JsonSchemaProperties = Schema.Record({ key: JsonRecordKey, value: Schema.Object })

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

const successResult = (
  value: unknown,
  resourceLinks: ReturnType<typeof resourceLinksForTool> = []
): CallToolResult => {
  const structuredContent = Schema.decodeUnknownSync(JsonSchema)(value)
  return {
    content: [{ type: "text", text: encodeJsonText(value) }, ...resourceLinks],
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

interface ObsMcpResourceState {
  readonly screenshots: ScreenshotResourceStore
}

export const createObsMcpResourceState = (): ObsMcpResourceState => ({
  screenshots: createScreenshotResourceStore()
})

interface CreateObsMcpServerOptions {
  readonly resourceState?: ObsMcpResourceState | undefined
  readonly enableResourceSubscriptions?: boolean | undefined
}

export const createObsMcpServer = (
  config: ObsConfig,
  client: ObsClient,
  options: CreateObsMcpServerOptions = {}
): Server => {
  const enableResourceSubscriptions = options.enableResourceSubscriptions ?? true
  const server = new Server(
    {
      name: "io.github.dearlordylord/obs-mcp",
      version: packageVersion
    },
    {
      capabilities: {
        resources: enableResourceSubscriptions ? { subscribe: true } : {},
        tools: {}
      }
    }
  )

  const tools = getEnabledTools(config.enabledToolsets, client.availableRequests)
  const byName = new Map(tools.map((tool) => [tool.name, tool]))
  const resourceState = options.resourceState ?? createObsMcpResourceState()
  const screenshots = resourceState.screenshots
  const resources = new ResourceManager(
    resourceDefinitions,
    resourceTemplateDefinitions,
    async (uri) => server.sendResourceUpdated({ uri })
  )
  const removeEventListener = enableResourceSubscriptions
    ? client.addEventListener((event) => resources.invalidate(invalidationGroupsForObsEvent(event)))
    : undefined
  const closeServer = server.close.bind(server)
  // eslint-disable-next-line functional/immutable-data -- wrap SDK close to unregister the OBS event listener.
  server.close = async (): Promise<void> => {
    removeEventListener?.()
    await closeServer()
  }

  server.setRequestHandler(ListResourcesRequestSchema, () => resources.listResources(client.availableRequests))

  server.setRequestHandler(ListResourceTemplatesRequestSchema, () => resources.listTemplates(client.availableRequests))

  server.setRequestHandler(
    ReadResourceRequestSchema,
    async (request) => {
      try {
        return await resources.read(request.params.uri, { config, client, screenshots })
      } catch (error) {
        throw toMcpError(error)
      }
    }
  )

  if (enableResourceSubscriptions) {
    server.setRequestHandler(SubscribeRequestSchema, (request) => {
      resources.subscribe(request.params.uri, client.availableRequests)
      return {}
    })

    server.setRequestHandler(UnsubscribeRequestSchema, (request) => {
      resources.unsubscribe(request.params.uri)
      return {}
    })
  }

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
      const output = await executeTool(tool, request.params.arguments, { config, client })
      recordScreenshotMetadata(tool.name, request.params.arguments, output, screenshots.setLatest)
      resources.invalidate(invalidationGroupsForTool(tool.name, tool.category))
      return successResult(output, resourceLinksForTool(tool.name, output))
    } catch (error) {
      /* v8 ignore next */
      return errorResult(error instanceof McpError ? error : new McpError(ErrorCode.InternalError, String(error)))
    }
  })

  return server
}

/* v8 ignore start -- defensive field readers are exercised through screenshot protocol tests. */
const stringField = (record: Readonly<Record<string, unknown>>, key: string): string | undefined =>
  typeof record[key] === "string" ? record[key] : undefined

const numberField = (record: Readonly<Record<string, unknown>>, key: string): number | undefined =>
  typeof record[key] === "number" ? record[key] : undefined

const optionalRecord = (value: unknown): Readonly<Record<string, unknown>> | undefined =>
  typeof value === "object" && value !== null && !Array.isArray(value)
    ? Schema.decodeUnknownSync(JsonSchema)(value)
    : undefined
/* v8 ignore stop */

/* v8 ignore start -- screenshot retention glue is covered through MCP protocol assertions. */
const currentIsoTimestamp = (): string => new Date(performance.timeOrigin + performance.now()).toISOString()

const recordScreenshotMetadata = (
  toolName: string,
  input: unknown,
  output: unknown,
  setLatest: (metadata: ScreenshotMetadata) => void
): void => {
  if (toolName !== "get_source_screenshot" && toolName !== "save_source_screenshot") {
    return
  }
  const inputRecord = optionalRecord(input) ?? {}
  const outputRecord = optionalRecord(output)
  if (outputRecord === undefined) {
    return
  }
  if (toolName === "get_source_screenshot") {
    const imageFormat = stringField(outputRecord, "imageFormat")
    const base64Data = stringField(outputRecord, "base64Data")
    if (imageFormat === undefined || base64Data === undefined) {
      return
    }
    setLatest({
      capturedAt: currentIsoTimestamp(),
      imageFormat,
      base64Data,
      ...(stringField(inputRecord, "sourceName") === undefined
        ? {}
        : { sourceName: stringField(inputRecord, "sourceName") }),
      ...(stringField(inputRecord, "sourceUuid") === undefined
        ? {}
        : { sourceUuid: stringField(inputRecord, "sourceUuid") }),
      ...(stringField(outputRecord, "mimeType") === undefined
        ? {}
        : { mimeType: stringField(outputRecord, "mimeType") }),
      ...(numberField(outputRecord, "imageBytes") === undefined
        ? {}
        : { imageBytes: numberField(outputRecord, "imageBytes") })
    })
    return
  }
  const imageFilePath = stringField(outputRecord, "imageFilePath")
  const imageFormat = stringField(outputRecord, "imageFormat")
  if (imageFilePath === undefined || imageFormat === undefined) {
    return
  }
  setLatest({
    capturedAt: currentIsoTimestamp(),
    imageFormat,
    imageFilePath,
    ...(stringField(inputRecord, "sourceName") === undefined
      ? {}
      : { sourceName: stringField(inputRecord, "sourceName") }),
    ...(stringField(inputRecord, "sourceUuid") === undefined
      ? {}
      : { sourceUuid: stringField(inputRecord, "sourceUuid") })
  })
}
/* v8 ignore stop */
