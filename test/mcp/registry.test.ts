import { ErrorCode, McpError } from "@modelcontextprotocol/sdk/types.js"
import { JSONSchema, Option, Schema } from "effect"
import { describe, expect, it } from "vitest"

import type { ObsConfig } from "../../src/config/config.js"
import { toMcpError } from "../../src/mcp/error-mapping.js"
import { allTools, executeTool, getEnabledTools } from "../../src/mcp/tools/registry.js"
import type { ToolDefinition } from "../../src/mcp/tools/registry.js"
import type { ObsClient } from "../../src/obs/client.js"
import { ObsProtocolError, ObsRequestError, ObsTimeoutError } from "../../src/obs/errors.js"
import type { ObsRequestType } from "../../src/obs/requests.js"

const config: ObsConfig = {
  url: "ws://localhost:4455/",
  password: Option.none(),
  connectionTimeoutMs: 300,
  enabledToolsets: ["general", "record", "scenes"]
}

const allAvailableRequests = [
  "GetVersion",
  "GetStats",
  "GetSceneList",
  "GetCurrentProgramScene",
  "SetCurrentProgramScene",
  "GetRecordStatus",
  "PauseRecord",
  "ResumeRecord",
  "ToggleRecordPause"
]

const client = (handler: (requestType: ObsRequestType) => Promise<unknown>): ObsClient => ({
  negotiatedRpcVersion: 1,
  availableRequests: allAvailableRequests,
  request: async (descriptor) =>
    Schema.decodeUnknownSync(descriptor.responseSchema)(await handler(descriptor.requestType)),
  close: async () => undefined
})

const toolByName = (name: string): ToolDefinition => {
  const tool = allTools.find((entry) => entry.name === name)
  if (tool === undefined) {
    throw new Error(`Expected tool to be registered: ${name}`)
  }
  return tool
}

describe("MCP tool registry", () => {
  it("exposes exactly the enabled tools by default", () => {
    expect(getEnabledTools(["general", "record", "scenes"]).map((tool) => tool.name)).toEqual([
      "get_obs_context",
      "get_version",
      "get_obs_stats",
      "list_scenes",
      "get_current_scene",
      "set_current_scene",
      "get_record_status",
      "pause_record",
      "resume_record",
      "toggle_record_pause"
    ])
  })

  it("filters disabled categories", () => {
    expect(getEnabledTools([])).toEqual([])
  })

  it("filters tools by toolset category", () => {
    expect(getEnabledTools(["general"], allAvailableRequests).map((tool) => tool.name)).toEqual([
      "get_obs_context",
      "get_version",
      "get_obs_stats"
    ])
    expect(getEnabledTools(["record"], allAvailableRequests).map((tool) => tool.name)).toEqual([
      "get_record_status",
      "pause_record",
      "resume_record",
      "toggle_record_pause"
    ])
    expect(getEnabledTools(["scenes"], allAvailableRequests).map((tool) => tool.name)).toEqual([
      "list_scenes",
      "get_current_scene",
      "set_current_scene"
    ])
    expect(getEnabledTools(["scenes"]).map((tool) => tool.name)).not.toContain("pause_record")
  })

  it("filters tools by negotiated OBS capabilities", () => {
    expect(getEnabledTools(["general"], ["GetVersion"]).map((tool) => tool.name)).toEqual([
      "get_obs_context",
      "get_version"
    ])
    expect(getEnabledTools(["general", "record"], ["GetStats"]).map((tool) => tool.name)).toEqual([
      "get_obs_context",
      "get_obs_stats"
    ])
    expect(getEnabledTools(["record"], ["PauseRecord", "ResumeRecord"]).map((tool) => tool.name)).toEqual([
      "pause_record",
      "resume_record"
    ])
  })

  it("keeps protocol schemas owned by each registered tool definition", () => {
    for (const tool of allTools) {
      expect(tool.inputJsonSchema).toEqual(JSONSchema.make(tool.inputSchema))
      expect(tool.outputJsonSchema).toEqual(JSONSchema.make(tool.outputSchema))
    }
  })

  it("accepts no-arg tools with empty or missing args", async () => {
    const output = await executeTool(toolByName("get_obs_context"), undefined, {
      config,
      client: client(async () => ({}))
    })
    expect(output).toMatchObject({ transport: "stdio" })
  })

  it("uses default list_scenes args", async () => {
    const output = await executeTool(toolByName("list_scenes"), {}, {
      config,
      client: client(async () => ({
        currentProgramSceneName: "Intro",
        currentProgramSceneUuid: "scene-intro",
        currentPreviewSceneName: null,
        currentPreviewSceneUuid: null,
        scenes: [{ sceneName: "Intro", sceneUuid: "scene-intro", sceneIndex: 0, isGroup: true }]
      }))
    })
    expect(output).toMatchObject({ scenes: [{ sceneName: "Intro" }] })
  })

  it("executes get_version, get_obs_stats, get_current_scene, and get_record_status handlers", async () => {
    const versionTool = toolByName("get_version")
    const statsTool = toolByName("get_obs_stats")
    const currentTool = toolByName("get_current_scene")
    const recordTool = toolByName("get_record_status")
    const fakeClient = client(async (requestType) => {
      if (requestType === "GetVersion") {
        return {
          obsVersion: "31.0.0",
          obsWebSocketVersion: "5.6.0",
          rpcVersion: 1,
          availableRequests: [],
          supportedImageFormats: []
        }
      }
      if (requestType === "GetStats") {
        return {
          cpuUsage: 4,
          memoryUsage: 256,
          availableDiskSpace: 4096,
          activeFps: 30,
          averageFrameRenderTime: 2,
          renderSkippedFrames: 1,
          renderTotalFrames: 100,
          outputSkippedFrames: 2,
          outputTotalFrames: 90,
          webSocketSessionIncomingMessages: 3,
          webSocketSessionOutgoingMessages: 4
        }
      }
      if (requestType === "GetRecordStatus") {
        return {
          outputActive: false,
          outputPaused: false,
          outputTimecode: "00:00:00.000",
          outputDuration: 0,
          outputBytes: 0
        }
      }
      return { sceneName: "Intro", sceneUuid: "scene-intro" }
    })
    await expect(executeTool(versionTool, {}, { config, client: fakeClient }))
      .resolves.toMatchObject({ negotiatedRpcVersion: 1 })
    await expect(executeTool(statsTool, {}, { config, client: fakeClient }))
      .resolves.toMatchObject({ activeFps: 30, outputTotalFrames: 90 })
    await expect(executeTool(currentTool, {}, { config, client: fakeClient }))
      .resolves.toEqual({ sceneName: "Intro", sceneUuid: "scene-intro" })
    await expect(executeTool(recordTool, {}, { config, client: fakeClient }))
      .resolves.toEqual({
        outputActive: false,
        outputPaused: false,
        outputTimecode: "00:00:00.000",
        outputDuration: 0,
        outputBytes: 0
      })
  })

  it("executes record pause handlers with structured action outputs", async () => {
    const fakeClient = client(async () => ({}))
    await expect(executeTool(toolByName("pause_record"), {}, { config, client: fakeClient }))
      .resolves.toEqual({ requestedAction: "pause", requestType: "PauseRecord", acknowledged: true })
    await expect(executeTool(toolByName("resume_record"), {}, { config, client: fakeClient }))
      .resolves.toEqual({ requestedAction: "resume", requestType: "ResumeRecord", acknowledged: true })
    await expect(executeTool(toolByName("toggle_record_pause"), {}, { config, client: fakeClient }))
      .resolves.toEqual({ requestedAction: "toggle_pause", requestType: "ToggleRecordPause", acknowledged: true })
  })

  it("rejects invalid scene params through schema validation", async () => {
    await expect(
      executeTool(toolByName("set_current_scene"), { sceneName: "" }, { config, client: client(async () => ({})) })
    )
      .rejects.toBeInstanceOf(McpError)
  })

  it("maps scene operation errors to MCP errors with OBS status metadata", async () => {
    await expect(executeTool(toolByName("set_current_scene"), { sceneName: "Missing" }, {
      config,
      client: client(async () => {
        throw new ObsRequestError("SetCurrentProgramScene", 608, "Parameter: sceneName")
      })
    })).rejects.toMatchObject({ code: ErrorCode.InvalidParams })
  })

  it("maps generic, protocol, timeout, and existing MCP errors", () => {
    const existing = new McpError(ErrorCode.InvalidParams, "existing")
    expect(toMcpError(existing)).toBe(existing)
    expect(toMcpError(new ObsTimeoutError("slow"))).toMatchObject({ code: ErrorCode.InternalError })
    expect(toMcpError(new ObsProtocolError("bad"))).toMatchObject({ code: ErrorCode.InternalError })
    expect(toMcpError(new Error("generic"))).toMatchObject({ code: ErrorCode.InternalError })
    expect(toMcpError("string error")).toMatchObject({ code: ErrorCode.InternalError })
    expect(toMcpError(new ObsRequestError("GetVersion", 207, "OBS is busy"))).toMatchObject({
      code: ErrorCode.InternalError,
      data: { retryable: true }
    })
    expect(new ObsRequestError("GetVersion", 500, undefined).toUserMessage()).not.toContain("OBS said")
  })

  it("maps OBS status code families to MCP error classes", () => {
    const invalidParamStatuses = [203, 204, 206, 300, 400, 500, 600, 608, 703]
    for (const status of invalidParamStatuses) {
      expect(toMcpError(new ObsRequestError("SetCurrentProgramScene", status, "bad request"))).toMatchObject({
        code: ErrorCode.InvalidParams,
        data: { obsStatusCode: status, retryable: false }
      })
    }

    const internalStatuses = [205, 207, 700, 702, 999]
    for (const status of internalStatuses) {
      expect(toMcpError(new ObsRequestError("GetVersion", status, "OBS failed"))).toMatchObject({
        code: ErrorCode.InternalError,
        data: { obsStatusCode: status }
      })
    }
  })
})
