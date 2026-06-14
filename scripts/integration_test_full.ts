#!/usr/bin/env tsx
import { spawn } from "node:child_process"
import { randomUUID } from "node:crypto"
import { existsSync } from "node:fs"
import { config as loadDotEnv } from "dotenv"

import { allTools } from "../src/mcp/tools/index.js"

loadDotEnv({ path: ".env", override: false })

const TOOL_TIMEOUT_MS = Number.parseInt(process.env["OBS_INTEGRATION_TOOL_TIMEOUT_MS"] ?? "30000", 10)
const MUTATION_ENABLED = process.env["OBS_INTEGRATION_MUTATION_TESTS"] === "1"
const GLOBAL_CONFIG_MUTATION_ENABLED = process.env["OBS_INTEGRATION_GLOBAL_CONFIG_TESTS"] === "1"
const STREAM_OUTPUT_MUTATION_ENABLED = process.env["OBS_INTEGRATION_STREAM_OUTPUT_TESTS"] === "1"
const ALL_TOOLSETS = [...new Set(allTools.map((tool) => tool.category))].sort().join(",")
const TOOLSETS = process.env["OBS_INTEGRATION_TOOLSETS"] ?? ALL_TOOLSETS
const RUN_ID = randomUUID().slice(0, 8)

const INIT_REQUEST = {
  jsonrpc: "2.0",
  method: "initialize",
  params: {
    protocolVersion: "2024-11-05",
    capabilities: {},
    clientInfo: { name: "obs-mcp-integration", version: "1.0" }
  },
  id: 1
}

class ToolCallError extends Error {
  public constructor(
    message: string,
    public readonly toolName: string,
    public readonly obsStatusCode: number | undefined,
    public readonly comment: string | undefined
  ) {
    super(message)
  }
}

interface McpResponse {
  readonly result?: {
    readonly tools?: ReadonlyArray<{ readonly name: string }>
    readonly structuredContent?: unknown
    readonly isError?: boolean
    readonly _meta?: {
      readonly error?: {
        readonly message?: string
        readonly obsStatusCode?: number
        readonly comment?: string
      }
    }
    readonly content?: ReadonlyArray<{ readonly text?: string }>
  }
  readonly error?: {
    readonly message?: string
  }
}

interface TestContext {
  readonly listedTools: Set<string>
  readonly data: Map<string, unknown>
  readonly cleanup: Array<() => Promise<void>>
}

type TestCase = {
  readonly name: string
  readonly toolName: string
  readonly run: (context: TestContext) => Promise<void>
}

let passed = 0
let failed = 0
let skipped = 0
let errors: ReadonlyArray<string> = []
const accountedTools = new Set<string>()

const writePass = (name: string): void => {
  passed += 1
  process.stdout.write(`PASS ${name}\n`)
}

const writeSkip = (name: string, reason: string): void => {
  skipped += 1
  process.stdout.write(`SKIP ${name}: ${reason}\n`)
}

const writeFail = (name: string, reason: string): void => {
  failed += 1
  const message = `FAIL ${name}: ${reason}`
  errors = [...errors, message]
  process.stdout.write(`${message}\n`)
}

const request = async (payload: object): Promise<McpResponse> =>
  new Promise((resolve, reject) => {
    if (!existsSync("dist/index.cjs")) {
      reject(new Error("dist/index.cjs is missing. Run `pnpm build` before the full integration suite."))
      return
    }

    const child = spawn("node", ["dist/index.cjs"], {
      env: {
        ...process.env,
        MCP_AUTO_EXIT: "true",
        TOOLSETS
      },
      stdio: ["pipe", "pipe", "pipe"]
    })
    let stdoutBuffer = ""
    let stderr = ""
    let settled = false
    const timer = setTimeout(() => {
      if (settled) return
      settled = true
      child.kill("SIGTERM")
      reject(new Error(`Timed out waiting for MCP response after ${TOOL_TIMEOUT_MS}ms. stderr: ${stderr}`))
    }, TOOL_TIMEOUT_MS)

    const settle = (response: McpResponse): void => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      child.kill("SIGTERM")
      resolve(response)
    }

    child.stdout.on("data", (chunk: Buffer) => {
      stdoutBuffer += chunk.toString("utf8")
      const lines = stdoutBuffer.split(/\r?\n/)
      stdoutBuffer = lines.pop() ?? ""
      for (const line of lines) {
        if (line.trim().length === 0) continue
        try {
          const parsed = JSON.parse(line) as McpResponse & { readonly id?: number }
          if (parsed.id === 2) settle(parsed)
        } catch {
          // Ignore non-JSON stdout fragments; protocol tests separately enforce stdout discipline.
        }
      }
    })
    child.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString("utf8")
    })
    child.on("error", (error) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      reject(error)
    })
    child.on("exit", (code) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      reject(new Error(`MCP server exited before response with code ${String(code)}. stderr: ${stderr}`))
    })

    child.stdin.write(`${JSON.stringify(INIT_REQUEST)}\n`)
    child.stdin.write(`${JSON.stringify(payload)}\n`)
    child.stdin.end()
  })

const listTools = async (): Promise<ReadonlyArray<string>> => {
  const response = await request({
    jsonrpc: "2.0",
    method: "tools/list",
    id: 2
  })
  if (response.error !== undefined) {
    throw new Error(response.error.message ?? "tools/list failed")
  }
  return response.result?.tools?.map((tool) => tool.name) ?? []
}

const parseStructuredContent = (toolName: string, response: McpResponse): unknown => {
  if (response.error !== undefined) {
    throw new Error(response.error.message ?? `${toolName} failed`)
  }
  const result = response.result
  if (result?.isError === true) {
    const error = result._meta?.error
    throw new ToolCallError(
      error?.message ?? result.content?.[0]?.text ?? `${toolName} failed`,
      toolName,
      error?.obsStatusCode,
      error?.comment
    )
  }
  if (result?.structuredContent !== undefined) return result.structuredContent
  const text = result?.content?.[0]?.text
  return text === undefined ? {} : JSON.parse(text)
}

const callTool = async (toolName: string, args: Record<string, unknown> = {}): Promise<unknown> => {
  const response = await request({
    jsonrpc: "2.0",
    method: "tools/call",
    params: { name: toolName, arguments: args },
    id: 2
  })
  return parseStructuredContent(toolName, response)
}

const record = <T>(context: TestContext, key: string, value: T): T => {
  context.data.set(key, value)
  return value
}

const getRecord = <T>(context: TestContext, key: string): T | undefined => context.data.get(key) as T | undefined

const addCleanup = (context: TestContext, cleanup: () => Promise<void>): void => {
  context.cleanup.push(cleanup)
}

const asRecord = (value: unknown): Record<string, unknown> => {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error("expected object result")
  }
  return value as Record<string, unknown>
}

const asArrayField = (value: unknown, field: string): ReadonlyArray<Record<string, unknown>> => {
  const array = asRecord(value)[field]
  if (!Array.isArray(array)) throw new Error(`expected ${field} array`)
  return array.filter((entry): entry is Record<string, unknown> => typeof entry === "object" && entry !== null)
}

const requireString = (value: unknown, field: string): string => {
  if (typeof value !== "string" || value.length === 0) throw new Error(`expected ${field} to be non-empty string`)
  return value
}

const requireNumber = (value: unknown, field: string): number => {
  if (typeof value !== "number") throw new Error(`expected ${field} to be number`)
  return value
}

const requireBoolean = (value: unknown, field: string): boolean => {
  if (typeof value !== "boolean") throw new Error(`expected ${field} to be boolean`)
  return value
}

const disposableName = (kind: string): string => `obs-mcp-it-${kind}-${RUN_ID}`

const isNotFoundError = (error: unknown): boolean =>
  error instanceof ToolCallError
  && (error.obsStatusCode === 600 || error.obsStatusCode === 601 || error.obsStatusCode === 602)
  && /not found|no source was found/i.test(error.comment ?? error.message)

const ignoreNotFound = async (cleanup: () => Promise<void>): Promise<void> => {
  try {
    await cleanup()
  } catch (error) {
    if (!isNotFoundError(error)) throw error
  }
}

const delay = async (milliseconds: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, milliseconds))

const waitForRecordInactive = async (): Promise<void> => {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const status = asRecord(await callTool("get_record_status"))
    if (status["outputActive"] !== true) return
    await delay(250)
  }
  throw new Error("recording did not become inactive after stop_record")
}

const waitForStreamInactive = async (): Promise<void> => {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const status = asRecord(await callTool("get_stream_status"))
    if (status["outputActive"] !== true) return
    await delay(250)
  }
  throw new Error("stream did not become inactive after stop_stream")
}

const expectToolError = async (toolName: string, args: Record<string, unknown> = {}): Promise<void> => {
  try {
    await callTool(toolName, args)
  } catch (error) {
    if (error instanceof ToolCallError) return
    throw error
  }
  throw new Error(`expected ${toolName} to return an OBS error`)
}

const expectToolHandledOrErrored = async (toolName: string, args: Record<string, unknown> = {}): Promise<void> => {
  try {
    await callTool(toolName, args)
  } catch (error) {
    if (error instanceof ToolCallError) return
    throw error
  }
}

const writableSceneItemTransform = (value: unknown): Record<string, unknown> => {
  const current = asRecord(value)
  const writableFields = [
    "alignment",
    "boundsAlignment",
    "boundsHeight",
    "boundsType",
    "boundsWidth",
    "cropBottom",
    "cropLeft",
    "cropRight",
    "cropTop",
    "cropToBounds",
    "positionX",
    "positionY",
    "rotation",
    "scaleX",
    "scaleY"
  ] as const
  return Object.fromEntries(
    writableFields
      .filter((field) => {
        const value = current[field]
        if (value === undefined) return false
        if ((field === "boundsHeight" || field === "boundsWidth") && typeof value === "number" && value < 1) {
          return false
        }
        return true
      })
      .map((field) => [field, current[field]])
  )
}

const locatorForInput = (input: Record<string, unknown>): Record<string, unknown> => ({
  inputName: requireString(input["inputName"], "inputName")
})

const integrationSceneName = (context: TestContext): string | undefined =>
  getRecord<string>(context, "integrationSceneName")

const integrationInputName = (context: TestContext): string | undefined =>
  getRecord<string>(context, "integrationInputName")

const integrationFilterName = (context: TestContext): string | undefined =>
  getRecord<string>(context, "integrationFilterName")

const isolatedProfileName = (context: TestContext): string | undefined =>
  getRecord<string>(context, "isolatedProfileName")

const integrationSourceLocator = (context: TestContext): Record<string, unknown> | undefined => {
  const sourceName = integrationInputName(context)
  return sourceName === undefined ? undefined : { sourceName }
}

const preferredDisposableInputKind = (context: TestContext): string | undefined => {
  const inputKinds = getRecord<ReadonlyArray<string>>(context, "inputKinds") ?? []
  return ["color_source_v3", "color_source"].find((kind) => inputKinds.includes(kind))
}

const preferredDisposableMediaInputKind = (context: TestContext): string | undefined => {
  const inputKinds = getRecord<ReadonlyArray<string>>(context, "inputKinds") ?? []
  return ["ffmpeg_source", "vlc_source"].find((kind) => inputKinds.includes(kind))
}

const preferredDisposableFilterKind = (context: TestContext): string | undefined => {
  const filterKinds = getRecord<ReadonlyArray<string>>(context, "filterKinds") ?? []
  return ["color_filter_v2", "color_filter"].find((kind) => filterKinds.includes(kind))
}

const writableOutputSettings = (settings: Record<string, unknown>): Record<string, unknown> => {
  const writableFields = [
    "path",
    "format_name",
    "muxer_settings",
    "video_encoder",
    "audio_encoder",
    "replay_buffer",
    "max_time_sec",
    "max_size_mb",
    "max_shutdown_time_sec"
  ] as const
  return Object.fromEntries(
    writableFields
      .filter((field) => settings[field] !== undefined)
      .map((field) => [field, settings[field]])
  )
}

const currentSceneName = (context: TestContext): string | undefined => {
  const current = getRecord<Record<string, unknown>>(context, "currentScene")
  return typeof current?.["sceneName"] === "string" ? current["sceneName"] : undefined
}

const sceneItemLocator = (context: TestContext): Record<string, unknown> | undefined => {
  const sceneName = currentSceneName(context)
  const sceneItem = getRecord<Record<string, unknown>>(context, "sceneItem")
  if (sceneName === undefined || sceneItem === undefined) return undefined
  return {
    sceneName,
    sceneItemId: requireNumber(sceneItem["sceneItemId"], "sceneItemId")
  }
}

const readOnlyCases: ReadonlyArray<TestCase> = [
  {
    name: "get_obs_context",
    toolName: "get_obs_context",
    run: async () => {
      const output = asRecord(await callTool("get_obs_context"))
      requireString(output["packageVersion"], "packageVersion")
    }
  },
  {
    name: "get_version",
    toolName: "get_version",
    run: async (context) => {
      const output = record(context, "version", asRecord(await callTool("get_version")))
      const availableRequests = output["availableRequests"]
      if (!Array.isArray(availableRequests)) throw new Error("expected availableRequests")
    }
  },
  {
    name: "get_obs_stats",
    toolName: "get_obs_stats",
    run: async () => {
      asRecord(await callTool("get_obs_stats"))
    }
  },
  {
    name: "list_hotkeys",
    toolName: "list_hotkeys",
    run: async (context) => {
      record(context, "hotkeys", asArrayField(await callTool("list_hotkeys"), "hotkeys"))
    }
  },
  {
    name: "get_recent_obs_events",
    toolName: "get_recent_obs_events",
    run: async () => {
      const output = asRecord(await callTool("get_recent_obs_events", { limit: 10 }))
      if (!Array.isArray(output["events"])) throw new Error("expected events array")
    }
  },
  ...[
    {
      toolName: "confirm_obs_output_lifecycle",
      input: { target: "stream", outcome: "started", afterSequence: 999_999_999, timeoutMs: 1 }
    },
    {
      toolName: "confirm_obs_scene_graph_change",
      input: { target: "scene", outcome: "created", afterSequence: 999_999_999, timeoutMs: 1 }
    },
    {
      toolName: "confirm_obs_source_filter_change",
      input: { target: "source_filter", outcome: "created", afterSequence: 999_999_999, timeoutMs: 1 }
    },
    {
      toolName: "confirm_obs_media_input_workflow",
      input: { target: "media_input", outcome: "playback_started", afterSequence: 999_999_999, timeoutMs: 1 }
    },
    {
      toolName: "confirm_obs_transition_workflow",
      input: { target: "scene_transition", outcome: "started", afterSequence: 999_999_999, timeoutMs: 1 }
    },
    {
      toolName: "confirm_obs_input_audio_change",
      input: { target: "input_audio", outcome: "muted", afterSequence: 999_999_999, timeoutMs: 1 }
    },
    {
      toolName: "confirm_obs_input_identity_change",
      input: { target: "input", outcome: "removed", afterSequence: 999_999_999, timeoutMs: 1 }
    },
    {
      toolName: "confirm_obs_canvas_inventory_change",
      input: { target: "canvas", outcome: "created", afterSequence: 999_999_999, timeoutMs: 1 }
    },
    {
      toolName: "confirm_obs_studio_mode_state_change",
      input: { target: "studio_mode", outcome: "enabled", afterSequence: 999_999_999, timeoutMs: 1 }
    },
    {
      toolName: "confirm_obs_config_workflow",
      input: { target: "profile", outcome: "changed", afterSequence: 999_999_999, timeoutMs: 1 }
    }
  ].map(({ toolName, input }): TestCase => ({
    name: `${toolName} timeout path`,
    toolName,
    run: async () => {
      const output = asRecord(await callTool(toolName, input))
      if (output["confirmed"] !== false) throw new Error("expected timeout result with confirmed=false")
    }
  })),
  {
    name: "list_canvases",
    toolName: "list_canvases",
    run: async (context) => {
      record(context, "canvases", asArrayField(await callTool("list_canvases"), "canvases"))
    }
  },
  {
    name: "list_profiles",
    toolName: "list_profiles",
    run: async (context) => {
      const output = record(context, "profiles", asRecord(await callTool("list_profiles")))
      if (!Array.isArray(output["profiles"])) throw new Error("expected profiles")
    }
  },
  {
    name: "list_scene_collections",
    toolName: "list_scene_collections",
    run: async (context) => {
      const output = record(context, "sceneCollections", asRecord(await callTool("list_scene_collections")))
      if (!Array.isArray(output["sceneCollections"])) throw new Error("expected sceneCollections")
    }
  },
  {
    name: "get_record_directory",
    toolName: "get_record_directory",
    run: async (context) => {
      record(context, "recordDirectory", asRecord(await callTool("get_record_directory")))
    }
  },
  {
    name: "get_profile_parameter",
    toolName: "get_profile_parameter",
    run: async (context) => {
      try {
        record(context, "profileParameter", asRecord(await callTool("get_profile_parameter", {
          parameterCategory: "SimpleOutput",
          parameterName: "VBitrate"
        })))
      } catch (error) {
        if (error instanceof ToolCallError) {
          throw new Error(error.comment === undefined ? "SKIP: profile parameter unavailable" : `SKIP: ${error.comment}`)
        }
        throw error
      }
    }
  },
  {
    name: "get_video_settings",
    toolName: "get_video_settings",
    run: async (context) => {
      record(context, "videoSettings", asRecord(await callTool("get_video_settings")))
    }
  },
  {
    name: "get_stream_service_settings",
    toolName: "get_stream_service_settings",
    run: async (context) => {
      record(context, "streamServiceSettings", asRecord(await callTool("get_stream_service_settings")))
    }
  },
  {
    name: "list_scenes",
    toolName: "list_scenes",
    run: async (context) => {
      record(context, "scenes", asArrayField(await callTool("list_scenes", { includeGroups: true }), "scenes"))
    }
  },
  {
    name: "list_groups",
    toolName: "list_groups",
    run: async (context) => {
      record(context, "groups", asArrayField(await callTool("list_groups"), "groups"))
    }
  },
  {
    name: "get_current_scene",
    toolName: "get_current_scene",
    run: async (context) => {
      record(context, "currentScene", asRecord(await callTool("get_current_scene")))
    }
  },
  {
    name: "get_studio_mode_enabled",
    toolName: "get_studio_mode_enabled",
    run: async (context) => {
      const output = record(context, "studioMode", asRecord(await callTool("get_studio_mode_enabled")))
      requireBoolean(output["studioModeEnabled"], "studioModeEnabled")
    }
  },
  {
    name: "set_studio_mode_enabled(no-op)",
    toolName: "set_studio_mode_enabled",
    run: async (context) => {
      if (!MUTATION_ENABLED) {
        throw new Error("SKIP: mutation checks require OBS_INTEGRATION_MUTATION_TESTS=1")
      }
      const studioMode = getRecord<Record<string, unknown>>(context, "studioMode")
      const studioModeEnabled = requireBoolean(studioMode?.["studioModeEnabled"], "studioModeEnabled")
      await callTool("set_studio_mode_enabled", { studioModeEnabled })
    }
  },
  {
    name: "get_current_preview_scene",
    toolName: "get_current_preview_scene",
    run: async (context) => {
      const studioMode = getRecord<Record<string, unknown>>(context, "studioMode")
      if (studioMode?.["studioModeEnabled"] !== true) {
        await expectToolError("get_current_preview_scene")
        return
      }
      record(context, "currentPreviewScene", asRecord(await callTool("get_current_preview_scene")))
    }
  },
  {
    name: "get_scene_transition_override",
    toolName: "get_scene_transition_override",
    run: async (context) => {
      const sceneName = currentSceneName(context)
      if (sceneName === undefined) throw new Error("SKIP: no current scene")
      asRecord(await callTool("get_scene_transition_override", { sceneName }))
    }
  },
  {
    name: "list_scene_items",
    toolName: "list_scene_items",
    run: async (context) => {
      const sceneName = currentSceneName(context)
      if (sceneName === undefined) throw new Error("SKIP: no current scene")
      const sceneItems = record(context, "sceneItems", asArrayField(
        await callTool("list_scene_items", { sceneName }),
        "sceneItems"
      ))
      const first = sceneItems[0]
      if (first !== undefined) record(context, "sceneItem", first)
    }
  },
  {
    name: "list_group_scene_items",
    toolName: "list_group_scene_items",
    run: async (context) => {
      const group = getRecord<ReadonlyArray<Record<string, unknown>>>(context, "groups")?.[0]
      if (group === undefined) {
        const sceneName = currentSceneName(context)
        if (sceneName === undefined) throw new Error("SKIP: no current scene")
        await expectToolError("list_group_scene_items", { sceneName })
        return
      }
      await callTool("list_group_scene_items", { sceneName: requireString(group["sceneName"], "sceneName") })
    }
  },
  {
    name: "get_scene_item_source",
    toolName: "get_scene_item_source",
    run: async (context) => {
      const locator = sceneItemLocator(context)
      if (locator === undefined) throw new Error("SKIP: no scene item in current scene")
      asRecord(await callTool("get_scene_item_source", locator))
    }
  },
  {
    name: "get_scene_item_id",
    toolName: "get_scene_item_id",
    run: async (context) => {
      const sceneName = currentSceneName(context)
      const sceneItem = getRecord<Record<string, unknown>>(context, "sceneItem")
      if (sceneName === undefined || sceneItem === undefined) throw new Error("SKIP: no scene item in current scene")
      await callTool("get_scene_item_id", {
        sceneName,
        sourceName: requireString(sceneItem["sourceName"], "sourceName"),
        searchOffset: 0
      })
    }
  },
  {
    name: "get_scene_item_transform",
    toolName: "get_scene_item_transform",
    run: async (context) => {
      const locator = sceneItemLocator(context)
      if (locator === undefined) throw new Error("SKIP: no scene item in current scene")
      record(context, "get_scene_item_transform", asRecord(await callTool("get_scene_item_transform", locator)))
    }
  },
  {
    name: "get_scene_item_enabled",
    toolName: "get_scene_item_enabled",
    run: async (context) => {
      const locator = sceneItemLocator(context)
      if (locator === undefined) throw new Error("SKIP: no scene item in current scene")
      const output = record(context, "get_scene_item_enabled", asRecord(await callTool("get_scene_item_enabled", locator)))
      requireBoolean(output["sceneItemEnabled"], "sceneItemEnabled")
    }
  },
  {
    name: "get_scene_item_locked",
    toolName: "get_scene_item_locked",
    run: async (context) => {
      const locator = sceneItemLocator(context)
      if (locator === undefined) throw new Error("SKIP: no scene item in current scene")
      const output = record(context, "get_scene_item_locked", asRecord(await callTool("get_scene_item_locked", locator)))
      requireBoolean(output["sceneItemLocked"], "sceneItemLocked")
    }
  },
  {
    name: "get_scene_item_index",
    toolName: "get_scene_item_index",
    run: async (context) => {
      const locator = sceneItemLocator(context)
      if (locator === undefined) throw new Error("SKIP: no scene item in current scene")
      const output = record(context, "get_scene_item_index", asRecord(await callTool("get_scene_item_index", locator)))
      requireNumber(output["sceneItemIndex"], "sceneItemIndex")
    }
  },
  {
    name: "get_scene_item_blend_mode",
    toolName: "get_scene_item_blend_mode",
    run: async (context) => {
      const locator = sceneItemLocator(context)
      if (locator === undefined) throw new Error("SKIP: no scene item in current scene")
      const output = record(context, "get_scene_item_blend_mode", asRecord(await callTool("get_scene_item_blend_mode", locator)))
      requireString(output["sceneItemBlendMode"], "sceneItemBlendMode")
    }
  },
  {
    name: "get_source_active",
    toolName: "get_source_active",
    run: async (context) => {
      const sceneItem = getRecord<Record<string, unknown>>(context, "sceneItem")
      if (sceneItem === undefined) throw new Error("SKIP: no scene item source in current scene")
      asRecord(await callTool("get_source_active", { sourceName: requireString(sceneItem["sourceName"], "sourceName") }))
    }
  },
  {
    name: "get_source_screenshot",
    toolName: "get_source_screenshot",
    run: async (context) => {
      const sceneItem = getRecord<Record<string, unknown>>(context, "sceneItem")
      if (sceneItem === undefined) throw new Error("SKIP: no scene item source in current scene")
      const output = asRecord(await callTool("get_source_screenshot", {
        sourceName: requireString(sceneItem["sourceName"], "sourceName"),
        imageFormat: "png",
        imageWidth: 8,
        imageHeight: 8
      }))
      requireNumber(output["imageBytes"], "imageBytes")
      requireString(output["base64Data"], "base64Data")
    }
  },
  {
    name: "save_source_screenshot",
    toolName: "save_source_screenshot",
    run: async (context) => {
      if (process.env["OBS_MCP_SCREENSHOT_OUTPUT_DIR"] === undefined) {
        throw new Error("SKIP: requires OBS-visible OBS_MCP_SCREENSHOT_OUTPUT_DIR")
      }
      const sceneItem = getRecord<Record<string, unknown>>(context, "sceneItem")
      if (sceneItem === undefined) throw new Error("SKIP: no scene item source in current scene")
      const output = asRecord(await callTool("save_source_screenshot", {
        sourceName: requireString(sceneItem["sourceName"], "sourceName"),
        imageFormat: "png",
        imageWidth: 8,
        imageHeight: 8,
        fileName: `obs-mcp-it-${RUN_ID}.png`
      }))
      requireString(output["imageFilePath"], "imageFilePath")
    }
  },
  {
    name: "list_inputs",
    toolName: "list_inputs",
    run: async (context) => {
      const inputs = record(context, "inputs", asArrayField(await callTool("list_inputs"), "inputs"))
      const first = inputs[0]
      if (first !== undefined) record(context, "input", first)
    }
  },
  {
    name: "list_input_kinds",
    toolName: "list_input_kinds",
    run: async (context) => {
      const output = asRecord(await callTool("list_input_kinds", { unversioned: false }))
      const inputKinds = output["inputKinds"]
      if (!Array.isArray(inputKinds)) throw new Error("expected inputKinds")
      record(context, "inputKinds", inputKinds.filter((kind): kind is string => typeof kind === "string"))
    }
  },
  {
    name: "get_special_inputs",
    toolName: "get_special_inputs",
    run: async () => {
      asRecord(await callTool("get_special_inputs"))
    }
  },
  {
    name: "get_input_default_settings",
    toolName: "get_input_default_settings",
    run: async (context) => {
      const input = getRecord<Record<string, unknown>>(context, "input")
      if (input === undefined) throw new Error("SKIP: no inputs in current OBS profile")
      await callTool("get_input_default_settings", { inputKind: requireString(input["inputKind"], "inputKind") })
    }
  },
  {
    name: "get_input_settings",
    toolName: "get_input_settings",
    run: async (context) => {
      const input = getRecord<Record<string, unknown>>(context, "input")
      if (input === undefined) throw new Error("SKIP: no inputs in current OBS profile")
      await callTool("get_input_settings", locatorForInput(input))
    }
  },
  {
    name: "get_input_properties_list_property_items",
    toolName: "get_input_properties_list_property_items",
    run: async (context) => {
      const input = getRecord<Record<string, unknown>>(context, "input")
      if (input === undefined) throw new Error("SKIP: no inputs in current OBS profile")
      try {
        await callTool("get_input_properties_list_property_items", {
          ...locatorForInput(input),
          propertyName: "device_id"
        })
      } catch (error) {
        if (error instanceof ToolCallError) {
          throw new Error(error.comment === undefined ? "SKIP: property list unavailable" : `SKIP: ${error.comment}`)
        }
        throw error
      }
    }
  },
  ...[
    "get_input_mute",
    "get_input_volume",
    "get_input_audio_balance",
    "get_input_audio_monitor_type",
    "get_input_audio_sync_offset",
    "get_input_audio_tracks",
    "get_input_deinterlace_mode",
    "get_input_deinterlace_field_order"
  ].map((toolName): TestCase => ({
    name: toolName,
    toolName,
    run: async (context) => {
      const input = getRecord<Record<string, unknown>>(context, "input")
      if (input === undefined) throw new Error("SKIP: no inputs in current OBS profile")
      try {
        record(context, toolName, asRecord(await callTool(toolName, locatorForInput(input))))
      } catch (error) {
        if (error instanceof ToolCallError && toolName.startsWith("get_input_deinterlace_")) return
        throw error
      }
    }
  })),
  {
    name: "get_media_input_status",
    toolName: "get_media_input_status",
    run: async (context) => {
      const input = getRecord<Record<string, unknown>>(context, "input")
      if (input === undefined) throw new Error("SKIP: no inputs in current OBS profile")
      await callTool("get_media_input_status", locatorForInput(input))
    }
  },
  {
    name: "list_source_filter_kinds",
    toolName: "list_source_filter_kinds",
    run: async (context) => {
      const output = asRecord(await callTool("list_source_filter_kinds"))
      const kinds = output["sourceFilterKinds"]
      if (!Array.isArray(kinds)) throw new Error("expected sourceFilterKinds")
      record(context, "filterKinds", kinds.filter((kind): kind is string => typeof kind === "string"))
      const first = kinds.find((kind): kind is string => typeof kind === "string" && kind.length > 0)
      if (first !== undefined) record(context, "filterKind", first)
    }
  },
  {
    name: "get_source_filter_default_settings",
    toolName: "get_source_filter_default_settings",
    run: async (context) => {
      const filterKind = getRecord<string>(context, "filterKind")
      if (filterKind === undefined) throw new Error("SKIP: OBS returned no source filter kinds")
      await callTool("get_source_filter_default_settings", { filterKind })
    }
  },
  {
    name: "list_source_filters",
    toolName: "list_source_filters",
    run: async (context) => {
      const input = getRecord<Record<string, unknown>>(context, "input")
      if (input === undefined) throw new Error("SKIP: no source candidate in current OBS profile")
      const filters = record(context, "filters", asArrayField(
        await callTool("list_source_filters", { sourceName: requireString(input["inputName"], "inputName") }),
        "filters"
      ))
      const first = filters[0]
      if (first !== undefined) record(context, "filter", first)
    }
  },
  {
    name: "get_source_filter",
    toolName: "get_source_filter",
    run: async (context) => {
      const input = getRecord<Record<string, unknown>>(context, "input")
      const filter = getRecord<Record<string, unknown>>(context, "filter")
      if (input === undefined) throw new Error("SKIP: no source candidate in current OBS profile")
      if (filter === undefined) {
        await expectToolError("get_source_filter", {
          sourceName: requireString(input["inputName"], "inputName"),
          filterName: disposableName("missing-filter")
        })
        return
      }
      await callTool("get_source_filter", {
        sourceName: requireString(input["inputName"], "inputName"),
        filterName: requireString(filter["filterName"], "filterName")
      })
    }
  },
  {
    name: "list_outputs",
    toolName: "list_outputs",
    run: async (context) => {
      const outputs = record(context, "outputs", asArrayField(await callTool("list_outputs"), "outputs"))
      const first = outputs[0]
      if (first !== undefined) record(context, "output", first)
    }
  },
  {
    name: "get_output_status",
    toolName: "get_output_status",
    run: async (context) => {
      const output = getRecord<Record<string, unknown>>(context, "output")
      if (output === undefined) throw new Error("SKIP: no outputs in current OBS profile")
      await callTool("get_output_status", { outputName: requireString(output["outputName"], "outputName") })
    }
  },
  {
    name: "get_output_settings",
    toolName: "get_output_settings",
    run: async (context) => {
      const output = getRecord<Record<string, unknown>>(context, "output")
      if (output === undefined) throw new Error("SKIP: no outputs in current OBS profile")
      await callTool("get_output_settings", { outputName: requireString(output["outputName"], "outputName") })
    }
  },
  {
    name: "get_virtual_cam_status",
    toolName: "get_virtual_cam_status",
    run: async () => {
      await callTool("get_virtual_cam_status")
    }
  },
  {
    name: "get_replay_buffer_status",
    toolName: "get_replay_buffer_status",
    run: async () => {
      try {
        await callTool("get_replay_buffer_status")
      } catch (error) {
        if (error instanceof ToolCallError && error.obsStatusCode === 604) return
        throw error
      }
    }
  },
  {
    name: "get_last_replay_buffer_replay",
    toolName: "get_last_replay_buffer_replay",
    run: async () => {
      try {
        await callTool("get_last_replay_buffer_replay")
      } catch (error) {
        if (error instanceof ToolCallError && (error.obsStatusCode === 604 || error.obsStatusCode === 703)) return
        throw error
      }
    }
  },
  {
    name: "get_record_status",
    toolName: "get_record_status",
    run: async (context) => {
      const output = record(context, "recordStatus", asRecord(await callTool("get_record_status")))
      requireBoolean(output["outputActive"], "outputActive")
    }
  },
  {
    name: "get_stream_status",
    toolName: "get_stream_status",
    run: async (context) => {
      const output = record(context, "streamStatus", asRecord(await callTool("get_stream_status")))
      requireBoolean(output["outputActive"], "outputActive")
    }
  },
  {
    name: "list_transition_kinds",
    toolName: "list_transition_kinds",
    run: async () => {
      const output = asRecord(await callTool("list_transition_kinds"))
      if (!Array.isArray(output["transitionKinds"])) throw new Error("expected transitionKinds")
    }
  },
  {
    name: "list_scene_transitions",
    toolName: "list_scene_transitions",
    run: async () => {
      const output = asRecord(await callTool("list_scene_transitions"))
      if (!Array.isArray(output["transitions"])) throw new Error("expected transitions")
    }
  },
  {
    name: "get_current_scene_transition",
    toolName: "get_current_scene_transition",
    run: async (context) => {
      record(context, "get_current_scene_transition", asRecord(await callTool("get_current_scene_transition")))
    }
  },
  {
    name: "get_current_scene_transition_cursor",
    toolName: "get_current_scene_transition_cursor",
    run: async () => {
      asRecord(await callTool("get_current_scene_transition_cursor"))
    }
  },
  {
    name: "list_monitors",
    toolName: "list_monitors",
    run: async () => {
      const output = asRecord(await callTool("list_monitors"))
      if (!Array.isArray(output["monitors"])) throw new Error("expected monitors")
    }
  },
  {
    name: "get_persistent_data",
    toolName: "get_persistent_data",
    run: async () => {
      await callTool("get_persistent_data", {
        realm: "OBS_WEBSOCKET_DATA_REALM_GLOBAL",
        slotName: "obs-mcp.integration.readonly"
      })
    }
  }
]

const mutationCases: ReadonlyArray<TestCase> = [
  {
    name: "run_obs_request_batch(no-op)",
    toolName: "run_obs_request_batch",
    run: async (context) => {
      const sceneName = currentSceneName(context)
      if (sceneName === undefined) throw new Error("SKIP: no current scene")
      const output = asRecord(await callTool("run_obs_request_batch", {
        executionType: "serial_realtime",
        haltOnFailure: true,
        requests: [
          { kind: "get_current_scene", id: "read-current" },
          { kind: "set_current_scene", id: "set-current", sceneName },
          { kind: "sleep", id: "sleep-zero", sleepMillis: 0 }
        ]
      }))
      if (!Array.isArray(output["results"])) throw new Error("expected batch results")
    }
  },
  {
    name: "set_persistent_data(restore)",
    toolName: "set_persistent_data",
    run: async (context) => {
      const realm = "OBS_WEBSOCKET_DATA_REALM_GLOBAL"
      const slotName = "obs-mcp.integration.mutation"
      const previous = asRecord(await callTool("get_persistent_data", { realm, slotName }))
      const previousValue = previous["slotValue"]
      if (previousValue === undefined) {
        throw new Error("SKIP: persistent data slot is absent and cannot be deleted after mutation")
      }
      addCleanup(context, async () => {
        await callTool("set_persistent_data", { realm, slotName, slotValue: previousValue })
      })
      await callTool("set_persistent_data", {
        realm,
        slotName,
        slotValue: { suite: "obs-mcp", runId: RUN_ID }
      })
    }
  },
  {
    name: "remove_profile(missing error path)",
    toolName: "remove_profile",
    run: async () => {
      await expectToolError("remove_profile", { profileName: disposableName("missing-profile") })
    }
  },
  {
    name: "set_current_profile(missing error path)",
    toolName: "set_current_profile",
    run: async () => {
      await expectToolError("set_current_profile", { profileName: disposableName("missing-profile") })
    }
  },
  {
    name: "create_profile(existing error path or isolated fixture)",
    toolName: "create_profile",
    run: async (context) => {
      const profiles = getRecord<Record<string, unknown>>(context, "profiles")
      if (GLOBAL_CONFIG_MUTATION_ENABLED) {
        const originalProfileName = requireString(profiles?.["currentProfileName"], "currentProfileName")
        const profileName = disposableName("profile")
        await callTool("create_profile", { profileName })
        context.data.set("isolatedProfileName", profileName)
        context.data.set("originalProfileName", originalProfileName)
        addCleanup(context, async () => {
          const originalName = getRecord<string>(context, "originalProfileName")
          const isolatedName = isolatedProfileName(context)
          if (originalName !== undefined) {
            await callTool("set_current_profile", { profileName: originalName }).then(() => undefined).catch(() => undefined)
          }
          if (isolatedName !== undefined) {
            await ignoreNotFound(() => callTool("remove_profile", { profileName: isolatedName }).then(() => undefined))
          }
        })
        return
      }
      await expectToolError("create_profile", {
        profileName: requireString(profiles?.["currentProfileName"], "currentProfileName")
      })
    }
  },
  {
    name: "set_record_directory(isolated no-op)",
    toolName: "set_record_directory",
    run: async (context) => {
      if (!GLOBAL_CONFIG_MUTATION_ENABLED) {
        throw new Error("SKIP: requires OBS_INTEGRATION_GLOBAL_CONFIG_TESTS=1")
      }
      if (isolatedProfileName(context) === undefined) throw new Error("SKIP: no isolated profile fixture")
      const current = asRecord(await callTool("get_record_directory"))
      await callTool("set_record_directory", {
        recordDirectory: requireString(current["recordDirectory"], "recordDirectory")
      })
    }
  },
  {
    name: "set_video_settings(isolated no-op)",
    toolName: "set_video_settings",
    run: async (context) => {
      if (!GLOBAL_CONFIG_MUTATION_ENABLED) {
        throw new Error("SKIP: requires OBS_INTEGRATION_GLOBAL_CONFIG_TESTS=1")
      }
      if (isolatedProfileName(context) === undefined) throw new Error("SKIP: no isolated profile fixture")
      const current = asRecord(await callTool("get_video_settings"))
      await callTool("set_video_settings", {
        baseWidth: requireNumber(current["baseWidth"], "baseWidth"),
        baseHeight: requireNumber(current["baseHeight"], "baseHeight"),
        outputWidth: requireNumber(current["outputWidth"], "outputWidth"),
        outputHeight: requireNumber(current["outputHeight"], "outputHeight"),
        fpsNumerator: requireNumber(current["fpsNumerator"], "fpsNumerator"),
        fpsDenominator: requireNumber(current["fpsDenominator"], "fpsDenominator")
      })
    }
  },
  {
    name: "set_stream_service_settings(isolated localhost sink)",
    toolName: "set_stream_service_settings",
    run: async (context) => {
      if (!GLOBAL_CONFIG_MUTATION_ENABLED) {
        throw new Error("SKIP: requires OBS_INTEGRATION_GLOBAL_CONFIG_TESTS=1")
      }
      if (isolatedProfileName(context) === undefined) throw new Error("SKIP: no isolated profile fixture")
      await callTool("set_stream_service_settings", {
        streamServiceType: "rtmp_custom",
        streamServiceSettings: {
          server: "rtmp://127.0.0.1:1/live",
          key: `obs-mcp-${RUN_ID}`
        }
      })
      context.data.set("isolatedStreamService", true)
    }
  },
  {
    name: "set_profile_parameter(isolated set/delete)",
    toolName: "set_profile_parameter",
    run: async (context) => {
      if (!GLOBAL_CONFIG_MUTATION_ENABLED) {
        throw new Error("SKIP: requires OBS_INTEGRATION_GLOBAL_CONFIG_TESTS=1")
      }
      if (isolatedProfileName(context) === undefined) throw new Error("SKIP: no isolated profile fixture")
      const parameterCategory = "obs-mcp-integration"
      const parameterName = "runId"
      await callTool("set_profile_parameter", { parameterCategory, parameterName, parameterValue: RUN_ID })
      await callTool("set_profile_parameter", { parameterCategory, parameterName, parameterValue: null })
    }
  },
  {
    name: "set_current_scene_collection(missing error path)",
    toolName: "set_current_scene_collection",
    run: async () => {
      await expectToolError("set_current_scene_collection", {
        sceneCollectionName: disposableName("missing-scene-collection")
      })
    }
  },
  {
    name: "create_scene_collection(existing error path)",
    toolName: "create_scene_collection",
    run: async (context) => {
      const sceneCollections = getRecord<Record<string, unknown>>(context, "sceneCollections")
      await expectToolError("create_scene_collection", {
        sceneCollectionName: requireString(
          sceneCollections?.["currentSceneCollectionName"],
          "currentSceneCollectionName"
        )
      })
    }
  },
  {
    name: "trigger_hotkey_by_name(missing error path)",
    toolName: "trigger_hotkey_by_name",
    run: async () => {
      await expectToolError("trigger_hotkey_by_name", { hotkeyName: disposableName("missing-hotkey") })
    }
  },
  {
    name: "trigger_hotkey_by_key_sequence(no-op key)",
    toolName: "trigger_hotkey_by_key_sequence",
    run: async () => {
      await expectToolHandledOrErrored("trigger_hotkey_by_key_sequence", { keyId: "OBS_KEY_NONE" })
    }
  },
  {
    name: "set_current_scene(no-op)",
    toolName: "set_current_scene",
    run: async (context) => {
      const sceneName = currentSceneName(context)
      if (sceneName === undefined) throw new Error("SKIP: no current scene")
      await callTool("set_current_scene", { sceneName })
    }
  },
  {
    name: "set_current_preview_scene(no-op)",
    toolName: "set_current_preview_scene",
    run: async (context) => {
      const preview = getRecord<Record<string, unknown>>(context, "currentPreviewScene")
      if (preview !== undefined) {
        await callTool("set_current_preview_scene", { sceneName: requireString(preview["sceneName"], "sceneName") })
        return
      }
      const sceneName = currentSceneName(context)
      if (sceneName === undefined) throw new Error("SKIP: no current scene")
      await expectToolError("set_current_preview_scene", { sceneName })
    }
  },
  {
    name: "create_scene(disposable)",
    toolName: "create_scene",
    run: async (context) => {
      const sceneName = disposableName("scene")
      context.data.set("integrationSceneName", sceneName)
      addCleanup(context, async () => {
        const currentName = integrationSceneName(context)
        if (currentName !== undefined) {
          await ignoreNotFound(() => callTool("remove_scene", { sceneName: currentName }).then(() => undefined))
        }
      })
      await callTool("create_scene", { sceneName })
    }
  },
  {
    name: "set_scene_name(disposable)",
    toolName: "set_scene_name",
    run: async (context) => {
      const sceneName = integrationSceneName(context)
      if (sceneName === undefined) throw new Error("SKIP: no disposable scene fixture")
      const newSceneName = disposableName("scene-renamed")
      await callTool("set_scene_name", { sceneName, newSceneName })
      context.data.set("integrationSceneName", newSceneName)
    }
  },
  {
    name: "set_scene_transition_override(disposable)",
    toolName: "set_scene_transition_override",
    run: async (context) => {
      const sceneName = integrationSceneName(context)
      if (sceneName === undefined) throw new Error("SKIP: no disposable scene fixture")
      await callTool("set_scene_transition_override", { sceneName, transitionName: null, transitionDuration: null })
    }
  },
  {
    name: "create_input(disposable)",
    toolName: "create_input",
    run: async (context) => {
      const sceneName = integrationSceneName(context)
      if (sceneName === undefined) throw new Error("SKIP: no disposable scene fixture")
      const inputKind = preferredDisposableInputKind(context)
      if (inputKind === undefined) throw new Error("SKIP: no color source input kind available")
      const inputName = disposableName("input")
      const output = asRecord(await callTool("create_input", {
        sceneName,
        inputName,
        inputKind,
        sceneItemEnabled: false
      }))
      context.data.set("integrationInputName", inputName)
      context.data.set("integrationInputSceneItemId", requireNumber(output["sceneItemId"], "sceneItemId"))
      addCleanup(context, async () => {
        const currentName = integrationInputName(context)
        if (currentName !== undefined) {
          await ignoreNotFound(() => callTool("remove_input", { inputName: currentName }).then(() => undefined))
        }
      })
    }
  },
  {
    name: "set_input_name(disposable)",
    toolName: "set_input_name",
    run: async (context) => {
      const inputName = integrationInputName(context)
      if (inputName === undefined) throw new Error("SKIP: no disposable input fixture")
      const newInputName = disposableName("input-renamed")
      await callTool("set_input_name", { inputName, newInputName })
      context.data.set("integrationInputName", newInputName)
    }
  },
  {
    name: "create_scene_item(disposable)",
    toolName: "create_scene_item",
    run: async (context) => {
      const sceneName = integrationSceneName(context)
      const sourceName = integrationInputName(context)
      if (sceneName === undefined || sourceName === undefined) throw new Error("SKIP: no disposable scene/input fixture")
      const output = asRecord(await callTool("create_scene_item", { sceneName, sourceName, sceneItemEnabled: false }))
      const sceneItemId = requireNumber(output["sceneItemId"], "sceneItemId")
      context.data.set("integrationExtraSceneItemId", sceneItemId)
      addCleanup(context, async () => {
        const currentSceneName = integrationSceneName(context)
        const currentSceneItemId = getRecord<number>(context, "integrationExtraSceneItemId")
        if (currentSceneName !== undefined && currentSceneItemId !== undefined) {
          await ignoreNotFound(() =>
            callTool("remove_scene_item", { sceneName: currentSceneName, sceneItemId: currentSceneItemId })
              .then(() => undefined)
          )
        }
      })
    }
  },
  {
    name: "duplicate_scene_item(disposable)",
    toolName: "duplicate_scene_item",
    run: async (context) => {
      const sceneName = integrationSceneName(context)
      const sourceSceneItemId = getRecord<number>(context, "integrationInputSceneItemId")
      if (sceneName === undefined || sourceSceneItemId === undefined) {
        throw new Error("SKIP: no disposable scene item fixture")
      }
      const output = asRecord(await callTool("duplicate_scene_item", { sceneName, sceneItemId: sourceSceneItemId }))
      const sceneItemId = requireNumber(output["sceneItemId"], "sceneItemId")
      context.data.set("integrationDuplicateSceneItemId", sceneItemId)
      addCleanup(context, async () => {
        const currentSceneName = integrationSceneName(context)
        const currentSceneItemId = getRecord<number>(context, "integrationDuplicateSceneItemId")
        if (currentSceneName !== undefined && currentSceneItemId !== undefined) {
          await ignoreNotFound(() =>
            callTool("remove_scene_item", { sceneName: currentSceneName, sceneItemId: currentSceneItemId })
              .then(() => undefined)
          )
        }
      })
    }
  },
  {
    name: "remove_scene_item(disposable)",
    toolName: "remove_scene_item",
    run: async (context) => {
      const sceneName = integrationSceneName(context)
      const sceneItemId = getRecord<number>(context, "integrationDuplicateSceneItemId")
      if (sceneName === undefined || sceneItemId === undefined) throw new Error("SKIP: no duplicate scene item fixture")
      await callTool("remove_scene_item", { sceneName, sceneItemId })
      context.data.delete("integrationDuplicateSceneItemId")
    }
  },
  {
    name: "create_source_filter(disposable)",
    toolName: "create_source_filter",
    run: async (context) => {
      const sourceLocator = integrationSourceLocator(context)
      if (sourceLocator === undefined) throw new Error("SKIP: no disposable source fixture")
      const filterKind = preferredDisposableFilterKind(context)
      if (filterKind === undefined) throw new Error("SKIP: no color filter kind available")
      const filterName = disposableName("filter")
      await callTool("create_source_filter", {
        ...sourceLocator,
        filterName,
        filterKind,
        filterSettings: { brightness: 0 }
      })
      context.data.set("integrationFilterName", filterName)
      addCleanup(context, async () => {
        const currentSourceLocator = integrationSourceLocator(context)
        const currentFilterName = integrationFilterName(context)
        if (currentSourceLocator !== undefined && currentFilterName !== undefined) {
          await ignoreNotFound(() =>
            callTool("remove_source_filter", { ...currentSourceLocator, filterName: currentFilterName })
              .then(() => undefined)
          )
        }
      })
    }
  },
  {
    name: "set_source_filter_enabled(disposable)",
    toolName: "set_source_filter_enabled",
    run: async (context) => {
      const sourceLocator = integrationSourceLocator(context)
      const filterName = integrationFilterName(context)
      if (sourceLocator === undefined || filterName === undefined) throw new Error("SKIP: no disposable filter fixture")
      await callTool("set_source_filter_enabled", { ...sourceLocator, filterName, filterEnabled: true })
    }
  },
  {
    name: "set_source_filter_settings(disposable)",
    toolName: "set_source_filter_settings",
    run: async (context) => {
      const sourceLocator = integrationSourceLocator(context)
      const filterName = integrationFilterName(context)
      if (sourceLocator === undefined || filterName === undefined) throw new Error("SKIP: no disposable filter fixture")
      await callTool("set_source_filter_settings", {
        ...sourceLocator,
        filterName,
        filterSettings: { brightness: 0 },
        overlay: true
      })
    }
  },
  {
    name: "set_source_filter_index(disposable)",
    toolName: "set_source_filter_index",
    run: async (context) => {
      const sourceLocator = integrationSourceLocator(context)
      const filterName = integrationFilterName(context)
      if (sourceLocator === undefined || filterName === undefined) throw new Error("SKIP: no disposable filter fixture")
      await callTool("set_source_filter_index", { ...sourceLocator, filterName, filterIndex: 0 })
    }
  },
  {
    name: "set_source_filter_name(disposable)",
    toolName: "set_source_filter_name",
    run: async (context) => {
      const sourceLocator = integrationSourceLocator(context)
      const filterName = integrationFilterName(context)
      if (sourceLocator === undefined || filterName === undefined) throw new Error("SKIP: no disposable filter fixture")
      const newFilterName = disposableName("filter-renamed")
      await callTool("set_source_filter_name", { ...sourceLocator, filterName, newFilterName })
      context.data.set("integrationFilterName", newFilterName)
    }
  },
  {
    name: "remove_source_filter(disposable)",
    toolName: "remove_source_filter",
    run: async (context) => {
      const sourceLocator = integrationSourceLocator(context)
      const filterName = integrationFilterName(context)
      if (sourceLocator === undefined || filterName === undefined) throw new Error("SKIP: no disposable filter fixture")
      await callTool("remove_source_filter", { ...sourceLocator, filterName })
      context.data.delete("integrationFilterName")
    }
  },
  {
    name: "set_input_settings(disposable media no-op)",
    toolName: "set_input_settings",
    run: async (context) => {
      const sceneName = integrationSceneName(context)
      if (sceneName === undefined) throw new Error("SKIP: no disposable scene fixture")
      const inputKind = preferredDisposableMediaInputKind(context)
      if (inputKind === undefined) throw new Error("SKIP: no media input kind available")
      const inputName = disposableName("media-input")
      await callTool("create_input", {
        sceneName,
        inputName,
        inputKind,
        inputSettings: { isLocalFile: false, looping: false },
        sceneItemEnabled: false
      })
      context.data.set("integrationMediaInputName", inputName)
      addCleanup(context, async () => {
        const currentName = getRecord<string>(context, "integrationMediaInputName")
        if (currentName !== undefined) {
          await ignoreNotFound(() => callTool("remove_input", { inputName: currentName }).then(() => undefined))
        }
      })
      await callTool("set_input_settings", {
        inputName,
        inputSettings: { isLocalFile: false, looping: false },
        overlay: true
      })
    }
  },
  {
    name: "press_input_properties_button(error path)",
    toolName: "press_input_properties_button",
    run: async (context) => {
      const inputName = getRecord<string>(context, "integrationMediaInputName") ?? integrationInputName(context)
      if (inputName === undefined) throw new Error("SKIP: no disposable input fixture")
      await expectToolError("press_input_properties_button", {
        inputName,
        propertyName: `obs-mcp-it-missing-${RUN_ID}`
      })
    }
  },
  {
    name: "set_media_input_cursor(disposable media handled path)",
    toolName: "set_media_input_cursor",
    run: async (context) => {
      const inputName = getRecord<string>(context, "integrationMediaInputName")
      if (inputName === undefined) throw new Error("SKIP: no disposable media input fixture")
      await expectToolHandledOrErrored("set_media_input_cursor", { inputName, mediaCursor: 0 })
    }
  },
  {
    name: "offset_media_input_cursor(disposable media handled path)",
    toolName: "offset_media_input_cursor",
    run: async (context) => {
      const inputName = getRecord<string>(context, "integrationMediaInputName")
      if (inputName === undefined) throw new Error("SKIP: no disposable media input fixture")
      await expectToolHandledOrErrored("offset_media_input_cursor", { inputName, mediaCursorOffset: 0 })
    }
  },
  {
    name: "trigger_media_input_action(disposable media no-op)",
    toolName: "trigger_media_input_action",
    run: async (context) => {
      const inputName = getRecord<string>(context, "integrationMediaInputName")
      if (inputName === undefined) throw new Error("SKIP: no disposable media input fixture")
      await expectToolHandledOrErrored("trigger_media_input_action", {
        inputName,
        mediaAction: "OBS_WEBSOCKET_MEDIA_INPUT_ACTION_NONE"
      })
    }
  },
  {
    name: "remove_input(disposable)",
    toolName: "remove_input",
    run: async (context) => {
      const inputName = integrationInputName(context)
      if (inputName === undefined) throw new Error("SKIP: no disposable input fixture")
      await callTool("remove_input", { inputName })
      context.data.delete("integrationInputName")
      context.data.delete("integrationInputSceneItemId")
      context.data.delete("integrationExtraSceneItemId")
    }
  },
  {
    name: "remove_scene(disposable)",
    toolName: "remove_scene",
    run: async (context) => {
      const sceneName = integrationSceneName(context)
      if (sceneName === undefined) throw new Error("SKIP: no disposable scene fixture")
      await callTool("remove_scene", { sceneName })
      context.data.delete("integrationSceneName")
    }
  },
  {
    name: "set_scene_item_transform(no-op)",
    toolName: "set_scene_item_transform",
    run: async (context) => {
      const locator = sceneItemLocator(context)
      const current = getRecord<Record<string, unknown>>(context, "get_scene_item_transform")
      const sceneItemTransform = current?.["sceneItemTransform"]
      if (locator === undefined || typeof sceneItemTransform !== "object" || sceneItemTransform === null) {
        throw new Error("SKIP: no scene item transform fixture")
      }
      await callTool("set_scene_item_transform", {
        ...locator,
        sceneItemTransform: writableSceneItemTransform(sceneItemTransform)
      })
    }
  },
  {
    name: "set_scene_item_enabled(no-op)",
    toolName: "set_scene_item_enabled",
    run: async (context) => {
      const locator = sceneItemLocator(context)
      const current = getRecord<Record<string, unknown>>(context, "get_scene_item_enabled")
      if (locator === undefined || current === undefined) throw new Error("SKIP: no scene item enabled fixture")
      await callTool("set_scene_item_enabled", {
        ...locator,
        sceneItemEnabled: requireBoolean(current["sceneItemEnabled"], "sceneItemEnabled")
      })
    }
  },
  {
    name: "set_scene_item_locked(no-op)",
    toolName: "set_scene_item_locked",
    run: async (context) => {
      const locator = sceneItemLocator(context)
      const current = getRecord<Record<string, unknown>>(context, "get_scene_item_locked")
      if (locator === undefined || current === undefined) throw new Error("SKIP: no scene item locked fixture")
      await callTool("set_scene_item_locked", {
        ...locator,
        sceneItemLocked: requireBoolean(current["sceneItemLocked"], "sceneItemLocked")
      })
    }
  },
  {
    name: "set_scene_item_index(no-op)",
    toolName: "set_scene_item_index",
    run: async (context) => {
      const locator = sceneItemLocator(context)
      const current = getRecord<Record<string, unknown>>(context, "get_scene_item_index")
      if (locator === undefined || current === undefined) throw new Error("SKIP: no scene item index fixture")
      await callTool("set_scene_item_index", {
        ...locator,
        sceneItemIndex: requireNumber(current["sceneItemIndex"], "sceneItemIndex")
      })
    }
  },
  {
    name: "set_scene_item_blend_mode(no-op)",
    toolName: "set_scene_item_blend_mode",
    run: async (context) => {
      const locator = sceneItemLocator(context)
      const current = getRecord<Record<string, unknown>>(context, "get_scene_item_blend_mode")
      if (locator === undefined || current === undefined) throw new Error("SKIP: no scene item blend mode fixture")
      await callTool("set_scene_item_blend_mode", {
        ...locator,
        sceneItemBlendMode: requireString(current["sceneItemBlendMode"], "sceneItemBlendMode")
      })
    }
  },
  ...([
    ["set_input_mute", "get_input_mute", "inputMuted"],
    ["set_input_audio_balance", "get_input_audio_balance", "inputAudioBalance"],
    ["set_input_audio_monitor_type", "get_input_audio_monitor_type", "monitorType"],
    ["set_input_audio_sync_offset", "get_input_audio_sync_offset", "inputAudioSyncOffset"],
    ["set_input_audio_tracks", "get_input_audio_tracks", "inputAudioTracks"],
    ["set_input_deinterlace_mode", "get_input_deinterlace_mode", "inputDeinterlaceMode"],
    ["set_input_deinterlace_field_order", "get_input_deinterlace_field_order", "inputDeinterlaceFieldOrder"]
  ] as const).map(([toolName, readKey, valueKey]): TestCase => ({
    name: `${toolName}(no-op)`,
    toolName,
    run: async (context) => {
      const input = getRecord<Record<string, unknown>>(context, "input")
      const current = getRecord<Record<string, unknown>>(context, readKey)
      if (input === undefined || current === undefined || current[valueKey] === undefined) {
        if (input !== undefined && toolName === "set_input_deinterlace_mode") {
          await expectToolError(toolName, {
            ...locatorForInput(input),
            inputDeinterlaceMode: "OBS_DEINTERLACE_MODE_DISABLE"
          })
          return
        }
        if (input !== undefined && toolName === "set_input_deinterlace_field_order") {
          await expectToolError(toolName, {
            ...locatorForInput(input),
            inputDeinterlaceFieldOrder: "OBS_DEINTERLACE_FIELD_ORDER_TOP"
          })
          return
        }
        throw new Error(`SKIP: no ${valueKey} fixture`)
      }
      await callTool(toolName, { ...locatorForInput(input), [valueKey]: current[valueKey] })
    }
  })),
  {
    name: "toggle_input_mute(restore)",
    toolName: "toggle_input_mute",
    run: async (context) => {
      const input = getRecord<Record<string, unknown>>(context, "input")
      const current = getRecord<Record<string, unknown>>(context, "get_input_mute")
      if (input === undefined || current === undefined) throw new Error("SKIP: no input mute fixture")
      const inputMuted = requireBoolean(current["inputMuted"], "inputMuted")
      addCleanup(context, async () => {
        await callTool("set_input_mute", { ...locatorForInput(input), inputMuted })
      })
      await callTool("toggle_input_mute", locatorForInput(input))
      await callTool("set_input_mute", { ...locatorForInput(input), inputMuted })
    }
  },
  {
    name: "set_input_volume(no-op)",
    toolName: "set_input_volume",
    run: async (context) => {
      const input = getRecord<Record<string, unknown>>(context, "input")
      const current = getRecord<Record<string, unknown>>(context, "get_input_volume")
      if (input === undefined || current === undefined) throw new Error("SKIP: no input volume fixture")
      await callTool("set_input_volume", {
        ...locatorForInput(input),
        inputVolumeMul: requireNumber(current["inputVolumeMul"], "inputVolumeMul")
      })
    }
  },
  {
    name: "set_current_scene_transition(no-op)",
    toolName: "set_current_scene_transition",
    run: async (context) => {
      const transition = getRecord<Record<string, unknown>>(context, "get_current_scene_transition")
      if (transition === undefined) throw new Error("SKIP: no current transition fixture")
      await callTool("set_current_scene_transition", {
        transitionName: requireString(transition["transitionName"], "transitionName")
      })
    }
  },
  {
    name: "set_current_scene_transition_duration(no-op)",
    toolName: "set_current_scene_transition_duration",
    run: async (context) => {
      const transition = getRecord<Record<string, unknown>>(context, "get_current_scene_transition")
      const transitionDuration = transition?.["transitionDuration"]
      if (!Number.isInteger(transitionDuration)) throw new Error("SKIP: current transition has no integer duration")
      await callTool("set_current_scene_transition_duration", { transitionDuration })
    }
  },
  {
    name: "set_current_scene_transition_settings(no-op)",
    toolName: "set_current_scene_transition_settings",
    run: async () => {
      await expectToolHandledOrErrored("set_current_scene_transition_settings", { transitionSettings: {}, overlay: true })
    }
  },
  {
    name: "trigger_studio_mode_transition(error path)",
    toolName: "trigger_studio_mode_transition",
    run: async (context) => {
      const studioMode = getRecord<Record<string, unknown>>(context, "studioMode")
      if (studioMode?.["studioModeEnabled"] === true) {
        throw new Error("SKIP: studio mode is enabled; transition trigger would mutate program output")
      }
      await expectToolError("trigger_studio_mode_transition")
    }
  },
  {
    name: "set_tbar_position(handled path)",
    toolName: "set_tbar_position",
    run: async () => {
      await expectToolHandledOrErrored("set_tbar_position", { position: 0, release: true })
    }
  },
  {
    name: "set_output_settings(no-op)",
    toolName: "set_output_settings",
    run: async (context) => {
      const output = getRecord<Record<string, unknown>>(context, "output")
      if (output === undefined) throw new Error("SKIP: no outputs in current OBS profile")
      const outputName = requireString(output["outputName"], "outputName")
      const currentSettings = asRecord(await callTool("get_output_settings", { outputName }))["outputSettings"]
      if (typeof currentSettings !== "object" || currentSettings === null || Array.isArray(currentSettings)) {
        throw new Error("SKIP: output settings unavailable")
      }
      const outputSettings = writableOutputSettings(currentSettings as Record<string, unknown>)
      if (Object.keys(outputSettings).length === 0) {
        await expectToolError("set_output_settings", {
          outputName: disposableName("missing-output"),
          outputSettings: { path: "/tmp" }
        })
        return
      }
      await callTool("set_output_settings", { outputName, outputSettings })
    }
  },
  ...([
    "start_output",
    "toggle_output"
  ] as const).map((toolName): TestCase => ({
    name: `${toolName}(missing output error path)`,
    toolName,
    run: async () => {
      await expectToolError(toolName, { outputName: disposableName("missing-output") })
    }
  })),
  {
    name: "stop_output(inactive error path)",
    toolName: "stop_output",
    run: async (context) => {
      const output = getRecord<Record<string, unknown>>(context, "output")
      if (output === undefined) throw new Error("SKIP: no outputs in current OBS profile")
      if (output["outputActive"] === true) throw new Error("SKIP: selected output is active")
      await expectToolError("stop_output", { outputName: requireString(output["outputName"], "outputName") })
    }
  },
  {
    name: "stop_record(inactive error path)",
    toolName: "stop_record",
    run: async (context) => {
      const status = getRecord<Record<string, unknown>>(context, "recordStatus")
      if (status?.["outputActive"] === true) throw new Error("SKIP: recording is active")
      await expectToolError("stop_record")
    }
  },
  ...[
    "split_record_file",
    "resume_record"
  ].map((toolName): TestCase => ({
    name: `${toolName}(inactive error path)`,
    toolName,
    run: async (context) => {
      const status = getRecord<Record<string, unknown>>(context, "recordStatus")
      if (status?.["outputActive"] === true) throw new Error("SKIP: recording is active")
      await expectToolError(toolName)
    }
  })),
  ...[
    "pause_record",
    "toggle_record_pause"
  ].map((toolName): TestCase => ({
    name: `${toolName}(inactive handled path)`,
    toolName,
    run: async (context) => {
      const status = getRecord<Record<string, unknown>>(context, "recordStatus")
      if (status?.["outputActive"] === true) throw new Error("SKIP: recording is active")
      await expectToolHandledOrErrored(toolName)
    }
  })),
  {
    name: "create_record_chapter(inactive error path)",
    toolName: "create_record_chapter",
    run: async (context) => {
      const status = getRecord<Record<string, unknown>>(context, "recordStatus")
      if (status?.["outputActive"] === true) throw new Error("SKIP: recording is active")
      await expectToolError("create_record_chapter", { chapterName: `obs-mcp-it-${RUN_ID}` })
    }
  },
  {
    name: "start_record(start-stop guarded)",
    toolName: "start_record",
    run: async (context) => {
      const status = asRecord(await callTool("get_record_status"))
      if (status["outputActive"] === true) throw new Error("SKIP: recording is active")
      let started = false
      addCleanup(context, async () => {
        if (started) {
          await callTool("stop_record").then(() => undefined).catch(() => undefined)
        }
      })
      try {
        await callTool("start_record")
        started = true
        const activeStatus = asRecord(await callTool("get_record_status"))
        if (activeStatus["outputActive"] !== true) throw new Error("expected recording to become active")
        await delay(250)
        await callTool("stop_record")
        await waitForRecordInactive()
        started = false
      } catch (error) {
        if (error instanceof ToolCallError) return
        throw error
      }
    }
  },
  {
    name: "toggle_record(start-stop guarded)",
    toolName: "toggle_record",
    run: async (context) => {
      const status = asRecord(await callTool("get_record_status"))
      if (status["outputActive"] === true) throw new Error("SKIP: recording is active")
      let started = false
      addCleanup(context, async () => {
        if (started) {
          await callTool("stop_record").then(() => undefined).catch(() => undefined)
        }
      })
      try {
        const output = asRecord(await callTool("toggle_record"))
        started = output["outputActive"] === true
        if (started) {
          await delay(250)
          await callTool("stop_record")
          await waitForRecordInactive()
          started = false
        }
      } catch (error) {
        if (error instanceof ToolCallError) return
        throw error
      }
    }
  },
  {
    name: "stop_stream(inactive error path)",
    toolName: "stop_stream",
    run: async (context) => {
      const status = getRecord<Record<string, unknown>>(context, "streamStatus")
      if (status?.["outputActive"] === true) throw new Error("SKIP: stream is active")
      await expectToolError("stop_stream")
    }
  },
  {
    name: "send_stream_caption(inactive error path)",
    toolName: "send_stream_caption",
    run: async (context) => {
      const status = getRecord<Record<string, unknown>>(context, "streamStatus")
      if (status?.["outputActive"] === true) throw new Error("SKIP: stream is active")
      await expectToolError("send_stream_caption", { captionText: `obs-mcp integration ${RUN_ID}` })
    }
  },
  ...([
    "start_stream",
    "toggle_stream"
  ] as const).map((toolName): TestCase => ({
    name: `${toolName}(unconfigured error path)`,
    toolName,
    run: async (context) => {
      if (STREAM_OUTPUT_MUTATION_ENABLED && getRecord<boolean>(context, "isolatedStreamService") === true) {
        let started = false
        addCleanup(context, async () => {
          if (started) {
            await callTool("stop_stream").then(() => undefined).catch(() => undefined)
          }
        })
        try {
          const output = asRecord(await callTool(toolName))
          started = output["outputActive"] === true || toolName === "start_stream"
          if (started) {
            await delay(250)
            await callTool("stop_stream")
            await waitForStreamInactive()
            started = false
          }
        } catch (error) {
          if (error instanceof ToolCallError) return
          throw error
        }
        return
      }
      const streamService = getRecord<Record<string, unknown>>(context, "streamServiceSettings")
      const settings = streamService?.["streamServiceSettings"]
      const keyConfigured = typeof settings === "object" && settings !== null && "keyConfigured" in settings
        ? (settings as Record<string, unknown>)["keyConfigured"]
        : undefined
      if (keyConfigured !== false) {
        throw new Error(
          STREAM_OUTPUT_MUTATION_ENABLED
            ? "SKIP: stream output tests require isolated stream service fixture"
            : "SKIP: stream service may be configured; start/toggle would affect external streaming"
        )
      }
      await expectToolError(toolName)
    }
  })),
  {
    name: "start_replay_buffer(unavailable error path)",
    toolName: "start_replay_buffer",
    run: async () => {
      try {
        await callTool("get_replay_buffer_status")
      } catch (error) {
        if (error instanceof ToolCallError && error.obsStatusCode === 604) {
          await expectToolError("start_replay_buffer")
          return
        }
        throw error
      }
      throw new Error("SKIP: replay buffer is available; start would mutate live output")
    }
  },
  {
    name: "stop_replay_buffer(inactive or unavailable error path)",
    toolName: "stop_replay_buffer",
    run: async () => {
      try {
        const status = asRecord(await callTool("get_replay_buffer_status"))
        if (status["outputActive"] === true) throw new Error("SKIP: replay buffer is active")
      } catch (error) {
        if (!(error instanceof ToolCallError && error.obsStatusCode === 604)) throw error
      }
      await expectToolError("stop_replay_buffer")
    }
  },
  {
    name: "toggle_replay_buffer(unavailable error path)",
    toolName: "toggle_replay_buffer",
    run: async () => {
      try {
        await callTool("get_replay_buffer_status")
      } catch (error) {
        if (error instanceof ToolCallError && error.obsStatusCode === 604) {
          await expectToolError("toggle_replay_buffer")
          return
        }
        throw error
      }
      throw new Error("SKIP: replay buffer is available; toggle would mutate live output")
    }
  },
  {
    name: "save_replay_buffer(inactive or unavailable error path)",
    toolName: "save_replay_buffer",
    run: async () => {
      try {
        const status = asRecord(await callTool("get_replay_buffer_status"))
        if (status["outputActive"] === true) throw new Error("SKIP: replay buffer is active")
      } catch (error) {
        if (!(error instanceof ToolCallError && error.obsStatusCode === 604)) throw error
      }
      await expectToolError("save_replay_buffer")
    }
  },
  ...([
    "open_input_properties_dialog",
    "open_input_filters_dialog",
    "open_input_interact_dialog"
  ] as const).map((toolName): TestCase => ({
    name: `${toolName}(missing input error path)`,
    toolName,
    run: async () => {
      await expectToolError(toolName, { inputName: disposableName("missing-input") })
    }
  })),
  {
    name: "open_source_projector(missing source error path)",
    toolName: "open_source_projector",
    run: async () => {
      await expectToolError("open_source_projector", {
        sourceName: disposableName("missing-source"),
        monitorIndex: -1
      })
    }
  },
  {
    name: "open_video_mix_projector(invalid monitor error path)",
    toolName: "open_video_mix_projector",
    run: async () => {
      await expectToolError("open_video_mix_projector", {
        videoMixType: "OBS_WEBSOCKET_VIDEO_MIX_TYPE_PROGRAM",
        monitorIndex: 1_000_000
      })
    }
  },
  {
    name: "call_vendor_request(missing vendor error path)",
    toolName: "call_vendor_request",
    run: async () => {
      await expectToolError("call_vendor_request", {
        vendorName: disposableName("missing-vendor"),
        requestType: "obs_mcp_missing_request",
        requestData: {}
      })
    }
  },
  {
    name: "broadcast_custom_event(integration marker)",
    toolName: "broadcast_custom_event",
    run: async () => {
      await callTool("broadcast_custom_event", {
        eventData: {
          suite: "obs-mcp",
          runId: RUN_ID,
          purpose: "integration-harness"
        }
      })
    }
  }
]

const isolatedConfigMutationTools = new Set([
  "set_record_directory",
  "set_video_settings",
  "set_stream_service_settings",
  "set_current_profile",
  "create_profile",
  "remove_profile",
  "set_current_scene_collection",
  "create_scene_collection",
  "set_profile_parameter"
])

const mediaInputFixtureMutationTools = new Set([
  "set_input_settings",
  "press_input_properties_button",
  "set_media_input_cursor",
  "offset_media_input_cursor",
  "trigger_media_input_action"
])

const liveOutputMutationTools = new Set([
  "set_output_settings",
  "start_output",
  "stop_output",
  "toggle_output",
  "start_virtual_cam",
  "stop_virtual_cam",
  "toggle_virtual_cam",
  "start_replay_buffer",
  "stop_replay_buffer",
  "toggle_replay_buffer",
  "save_replay_buffer",
  "start_record",
  "stop_record",
  "toggle_record",
  "split_record_file",
  "create_record_chapter",
  "pause_record",
  "resume_record",
  "toggle_record_pause",
  "start_stream",
  "stop_stream",
  "toggle_stream",
  "send_stream_caption"
])

const transitionFixtureMutationTools = new Set([
  "set_current_scene_transition_settings",
  "trigger_studio_mode_transition",
  "set_tbar_position"
])

const policySkipReason = (toolName: string): string | undefined => {
  if (toolName === "call_vendor_request" || toolName === "broadcast_custom_event") {
    return "raw vendor/custom surface requires plugin-specific fixture"
  }
  if (toolName === "trigger_hotkey_by_name" || toolName === "trigger_hotkey_by_key_sequence") {
    return "hotkeys are local UI side effects"
  }
  if (toolName.startsWith("open_")) {
    return "opens local OBS UI windows"
  }
  if (!MUTATION_ENABLED && toolName === "run_obs_request_batch") {
    return "mutation checks require OBS_INTEGRATION_MUTATION_TESTS=1"
  }
  if (!MUTATION_ENABLED && /^(set_|create_|remove_|duplicate_|start_|stop_|toggle_|pause_|resume_|split_|save_|trigger_|send_|press_|offset_)/.test(toolName)) {
    return "mutation checks require OBS_INTEGRATION_MUTATION_TESTS=1"
  }
  if (MUTATION_ENABLED && isolatedConfigMutationTools.has(toolName)) {
    return "changes OBS profile, scene collection, or global config; requires isolated OBS config fixture"
  }
  if (MUTATION_ENABLED && mediaInputFixtureMutationTools.has(toolName)) {
    return "requires disposable media input/property fixture"
  }
  if (MUTATION_ENABLED && liveOutputMutationTools.has(toolName)) {
    return "controls live outputs or writes recording/replay artifacts"
  }
  if (MUTATION_ENABLED && transitionFixtureMutationTools.has(toolName)) {
    return "requires isolated Studio Mode transition fixture"
  }
  if (MUTATION_ENABLED && /^(create_|remove_|duplicate_|save_|split_|send_|press_|offset_)/.test(toolName)) {
    return "destructive or externally visible mutation needs a disposable fixture"
  }
  return undefined
}

const runCase = async (testCase: TestCase, context: TestContext): Promise<void> => {
  accountedTools.add(testCase.toolName)
  if (!context.listedTools.has(testCase.toolName)) {
    writeSkip(testCase.name, "tool is not listed for this OBS version/capability set")
    return
  }
  try {
    await testCase.run(context)
    writePass(testCase.name)
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("SKIP: ")) {
      writeSkip(testCase.name, error.message.slice("SKIP: ".length))
      return
    }
    if (
      error instanceof ToolCallError
      && (error.obsStatusCode === 604 || error.obsStatusCode === 207)
    ) {
      writeSkip(testCase.name, error.comment ?? `OBS status ${String(error.obsStatusCode)}`)
      return
    }
    writeFail(testCase.name, error instanceof Error ? error.message : String(error))
  }
}

const runCleanup = async (context: TestContext): Promise<void> => {
  for (const cleanup of [...context.cleanup].reverse()) {
    try {
      await cleanup()
    } catch (error) {
      writeFail("fixture cleanup", error instanceof Error ? error.message : String(error))
    }
  }
}

const main = async (): Promise<void> => {
  process.stdout.write("=== OBS MCP full live integration suite ===\n")
  process.stdout.write(`TOOLSETS=${TOOLSETS}\n`)
  process.stdout.write(`mutations=${MUTATION_ENABLED ? "enabled" : "disabled"}\n`)
  process.stdout.write(`global_config_mutations=${GLOBAL_CONFIG_MUTATION_ENABLED ? "enabled" : "disabled"}\n`)
  process.stdout.write(`stream_output_mutations=${STREAM_OUTPUT_MUTATION_ENABLED ? "enabled" : "disabled"}\n`)

  let listedToolNames: ReadonlyArray<string>
  try {
    listedToolNames = await listTools()
    if (listedToolNames.length === 0) {
      writeFail("tools/list", "no tools listed")
    } else {
      writePass(`tools/list exposes ${String(listedToolNames.length)} tools`)
    }
  } catch (error) {
    writeFail("tools/list", error instanceof Error ? error.message : String(error))
    listedToolNames = []
  }

  const context: TestContext = {
    listedTools: new Set(listedToolNames),
    data: new Map(),
    cleanup: []
  }

  const cases = MUTATION_ENABLED ? [...readOnlyCases, ...mutationCases] : readOnlyCases
  for (const testCase of cases) {
    await runCase(testCase, context)
  }

  await runCleanup(context)

  for (const tool of allTools) {
    if (accountedTools.has(tool.name)) continue
    const reason = context.listedTools.has(tool.name)
      ? policySkipReason(tool.name)
      : "tool is not listed for this OBS version/capability set"
    if (reason === undefined) {
      writeFail(`coverage:${tool.name}`, "listed tool has no full integration case or explicit skip policy")
    } else {
      writeSkip(tool.name, reason)
    }
  }

  const total = passed + failed + skipped
  process.stdout.write(`=== RESULTS: ${String(passed)} passed, ${String(failed)} failed, ${String(skipped)} skipped (of ${String(total)}) ===\n`)
  if (failed > 0) {
    process.stdout.write("=== FAILURES ===\n")
    for (const error of errors) process.stdout.write(`${error}\n`)
    process.exit(1)
  }
}

main().catch((error) => {
  writeFail("integration harness", error instanceof Error ? error.message : String(error))
  process.exit(1)
})
