import { ErrorCode, McpError } from "@modelcontextprotocol/sdk/types.js"
import { JSONSchema, ParseResult, Schema } from "effect"

import type { ObsConfig } from "../../config/config.js"
import type { ObsClient } from "../../obs/client.js"
import { toMcpError } from "../error-mapping.js"

export interface ToolContext {
  readonly config: ObsConfig
  readonly client: ObsClient
}

export type RuntimeSchema = Schema.Schema.AnyNoContext
export type ToolCategory =
  | "canvases"
  | "events"
  | "general"
  | "inputs"
  | "outputs"
  | "record"
  | "scenes"
  | "stream"
  | "ui"
type ToolHandler<Input> = {
  bivarianceHack(input: Input, context: ToolContext): Promise<unknown>
}["bivarianceHack"]

// eslint-disable-next-line functional/no-mixed-types -- tool definitions carry metadata plus a handler.
export interface ToolDefinition<Input = unknown> {
  readonly name: string
  readonly title: string
  readonly description: string
  readonly category: ToolCategory
  readonly requiredObsRequests: ReadonlyArray<string>
  readonly inputSchema: RuntimeSchema
  readonly inputJsonSchema: unknown
  readonly outputSchema: RuntimeSchema
  readonly outputJsonSchema: unknown
  readonly handler: ToolHandler<Input>
}

export function defineTool<InputSchema extends RuntimeSchema, OutputSchema extends RuntimeSchema>(definition: {
  readonly name: string
  readonly title: string
  readonly description: string
  readonly category: ToolCategory
  readonly requiredObsRequests: ReadonlyArray<string>
  readonly inputSchema: InputSchema
  readonly outputSchema: OutputSchema
  readonly handler: (input: Schema.Schema.Type<InputSchema>, context: ToolContext) => Promise<unknown>
}): ToolDefinition<Schema.Schema.Type<InputSchema>> {
  return {
    ...definition,
    inputSchema: definition.inputSchema,
    inputJsonSchema: JSONSchema.make(definition.inputSchema),
    outputSchema: definition.outputSchema,
    outputJsonSchema: JSONSchema.make(definition.outputSchema)
  }
}

export const filterEnabledTools = (
  tools: ReadonlyArray<ToolDefinition>,
  enabledToolsets: ReadonlyArray<string>,
  availableRequests?: ReadonlyArray<string>
): ReadonlyArray<ToolDefinition> => {
  const enabled = new Set(enabledToolsets)
  const available = availableRequests === undefined ? undefined : new Set(availableRequests)
  return tools.filter((tool) =>
    enabled.has(tool.category)
    && (
      available === undefined
      || tool.requiredObsRequests.every((requestType) => available.has(requestType))
    )
  )
}

export const executeTool = async (
  tool: ToolDefinition,
  input: unknown,
  context: ToolContext
): Promise<unknown> => {
  let decodedInput: unknown
  try {
    decodedInput = Schema.decodeUnknownSync(tool.inputSchema, { onExcessProperty: "error" })(input ?? {})
  } catch (error) {
    if (ParseResult.isParseError(error)) {
      throw new McpError(ErrorCode.InvalidParams, error.message)
    }
    /* v8 ignore next -- defensive: Effect schema input decoding throws ParseError. */
    throw toMcpError(error)
  }

  try {
    const result = await tool.handler(decodedInput, context)
    return Schema.decodeUnknownSync(tool.outputSchema)(result)
  } catch (error) {
    throw toMcpError(error)
  }
}
