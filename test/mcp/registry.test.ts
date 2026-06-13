import { ErrorCode, McpError } from "@modelcontextprotocol/sdk/types.js"
import { JSONSchema, Option, Schema } from "effect"
import { describe, expect, it } from "vitest"

import type { ObsConfig } from "../../src/config/config.js"
import { InputLocatorInput, ListInputKindsInput } from "../../src/domain/schemas/inputs.js"
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
  enabledToolsets: ["general", "record", "scenes", "inputs"]
}

const allAvailableRequests = [
  "GetVersion",
  "GetStats",
  "GetSceneList",
  "GetCurrentProgramScene",
  "SetCurrentProgramScene",
  "GetSceneItemList",
  "GetGroupSceneItemList",
  "GetSceneItemId",
  "GetSceneItemSource",
  "GetInputList",
  "GetInputKindList",
  "GetSpecialInputs",
  "GetVirtualCamStatus",
  "StartVirtualCam",
  "StopVirtualCam",
  "ToggleVirtualCam",
  "GetRecordStatus",
  "PauseRecord",
  "ResumeRecord",
  "ToggleRecordPause",
  "GetStreamStatus",
  "StartStream",
  "StopStream",
  "ToggleStream"
]

const client = (handler: (requestType: ObsRequestType, requestData: unknown) => Promise<unknown>): ObsClient => ({
  negotiatedRpcVersion: 1,
  availableRequests: allAvailableRequests,
  request: async (descriptor, requestData) =>
    Schema.decodeUnknownSync(descriptor.responseSchema)(await handler(descriptor.requestType, requestData)),
  close: async () => undefined
})

const clientWithData = (
  handler: (requestType: ObsRequestType, requestData: unknown) => Promise<unknown>
): ObsClient => ({
  negotiatedRpcVersion: 1,
  availableRequests: allAvailableRequests,
  request: async (descriptor, requestData) =>
    Schema.decodeUnknownSync(descriptor.responseSchema)(await handler(descriptor.requestType, requestData)),
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
    expect(getEnabledTools(config.enabledToolsets).map((tool) => tool.name)).toEqual([
      "get_obs_context",
      "get_version",
      "get_obs_stats",
      "list_scenes",
      "get_current_scene",
      "set_current_scene",
      "list_scene_items",
      "list_group_scene_items",
      "get_scene_item_id",
      "get_scene_item_source",
      "list_inputs",
      "list_input_kinds",
      "get_special_inputs",
      "get_record_status",
      "pause_record",
      "resume_record",
      "toggle_record_pause"
    ])
  })

  it("exposes input discovery tools when the input toolset is enabled", () => {
    expect(getEnabledTools(["inputs"]).map((tool) => tool.name)).toEqual([
      "list_inputs",
      "list_input_kinds",
      "get_special_inputs"
    ])
  })

  it("exposes virtual camera tools when the outputs toolset is enabled", () => {
    expect(getEnabledTools(["outputs"]).map((tool) => tool.name)).toEqual([
      "get_virtual_cam_status",
      "start_virtual_cam",
      "stop_virtual_cam",
      "toggle_virtual_cam"
    ])
  })

  it("filters disabled categories", () => {
    expect(getEnabledTools([])).toEqual([])
    expect(getEnabledTools(["scenes"], allAvailableRequests).map((tool) => tool.name)).not.toContain(
      "get_stream_status"
    )
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
      "set_current_scene",
      "list_scene_items",
      "list_group_scene_items",
      "get_scene_item_id",
      "get_scene_item_source"
    ])
    expect(getEnabledTools(["inputs"], allAvailableRequests).map((tool) => tool.name)).toEqual([
      "list_inputs",
      "list_input_kinds",
      "get_special_inputs"
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
    expect(getEnabledTools(["stream"], ["GetStreamStatus", "StartStream", "StopStream"]).map((tool) => tool.name))
      .toEqual(["get_stream_status", "start_stream", "stop_stream"])
    expect(getEnabledTools(["outputs"], ["GetVirtualCamStatus", "ToggleVirtualCam"]).map((tool) => tool.name))
      .toEqual(["get_virtual_cam_status", "toggle_virtual_cam"])
  })

  it("filters unavailable input requests by negotiated OBS capabilities", () => {
    expect(getEnabledTools(["inputs"], ["GetInputList"]).map((tool) => tool.name)).toEqual(["list_inputs"])
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

  it("executes input discovery handlers with structured output", async () => {
    const output = await executeTool(toolByName("list_inputs"), { inputKind: "wasapi_input_capture" }, {
      config: { ...config, enabledToolsets: ["inputs"] },
      client: {
        ...client(async () => ({ inputs: [] })),
        request: async (descriptor, requestData) => {
          expect(descriptor.requestType).toBe("GetInputList")
          expect(requestData).toEqual({ inputKind: "wasapi_input_capture" })
          return Schema.decodeUnknownSync(descriptor.responseSchema)({
            inputs: [{
              inputName: "Mic/Aux",
              inputUuid: "input-mic-aux",
              inputKind: "wasapi_input_capture",
              unversionedInputKind: "wasapi_input_capture"
            }]
          })
        }
      }
    })
    expect(output).toEqual({
      inputs: [{
        inputName: "Mic/Aux",
        inputUuid: "input-mic-aux",
        inputKind: "wasapi_input_capture",
        unversionedInputKind: "wasapi_input_capture"
      }]
    })
  })

  it("passes optional unversioned input-kind behavior through to OBS", async () => {
    const output = await executeTool(toolByName("list_input_kinds"), { unversioned: true }, {
      config: { ...config, enabledToolsets: ["inputs"] },
      client: {
        ...client(async () => ({ inputKinds: ["wasapi_input_capture"] })),
        request: async (descriptor, requestData) => {
          expect(descriptor.requestType).toBe("GetInputKindList")
          expect(requestData).toEqual({ unversioned: true })
          return Schema.decodeUnknownSync(descriptor.responseSchema)({ inputKinds: ["wasapi_input_capture"] })
        }
      }
    })
    expect(output).toEqual({ inputKinds: ["wasapi_input_capture"] })
  })

  it("enforces input locator exactly-one boundary and input-kind defaults", () => {
    expect(Schema.decodeUnknownSync(InputLocatorInput)({ inputName: "Mic/Aux" })).toEqual({ inputName: "Mic/Aux" })
    expect(Schema.decodeUnknownSync(InputLocatorInput)({ inputUuid: "input-mic-aux" })).toEqual({
      inputUuid: "input-mic-aux"
    })
    expect(Schema.decodeUnknownSync(ListInputKindsInput)({})).toEqual({ unversioned: false })
    expect(() => Schema.decodeUnknownSync(InputLocatorInput)({})).toThrow("Exactly one")
    const duplicateLocator = { inputName: "Mic/Aux", inputUuid: "input-mic-aux" }
    expect(() => Schema.decodeUnknownSync(InputLocatorInput)(duplicateLocator)).toThrow("Exactly one")
  })

  it("executes get_special_inputs handler", async () => {
    const output = await executeTool(toolByName("get_special_inputs"), {}, {
      config: { ...config, enabledToolsets: ["inputs"] },
      client: client(async () => ({
        desktop1: "Desktop Audio",
        desktop2: null,
        mic1: "Mic/Aux",
        mic2: null,
        mic3: null,
        mic4: null
      }))
    })
    expect(output).toMatchObject({ desktop1: "Desktop Audio", mic1: "Mic/Aux" })
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

  it("executes stream status and lifecycle handlers", async () => {
    const streamConfig: ObsConfig = { ...config, enabledToolsets: ["stream"] }
    const fakeClient = client(async (requestType) => {
      if (requestType === "GetStreamStatus") {
        return {
          outputActive: false,
          outputReconnecting: false,
          outputTimecode: "00:00:00.000",
          outputDuration: 0,
          outputCongestion: 0,
          outputBytes: 0,
          outputSkippedFrames: 0,
          outputTotalFrames: 0
        }
      }
      if (requestType === "ToggleStream") {
        return { outputActive: true }
      }
      return {}
    })
    await expect(executeTool(toolByName("get_stream_status"), {}, { config: streamConfig, client: fakeClient }))
      .resolves.toMatchObject({ outputActive: false, outputTotalFrames: 0 })
    await expect(executeTool(toolByName("start_stream"), {}, { config: streamConfig, client: fakeClient }))
      .resolves.toEqual({ outputActive: true })
    await expect(executeTool(toolByName("stop_stream"), {}, { config: streamConfig, client: fakeClient }))
      .resolves.toEqual({ outputActive: false })
    await expect(executeTool(toolByName("toggle_stream"), {}, { config: streamConfig, client: fakeClient }))
      .resolves.toEqual({ outputActive: true })
  })

  it("executes virtual camera handlers", async () => {
    const seen: Array<ObsRequestType> = []
    const fakeClient = client(async (requestType) => {
      seen.push(requestType)
      if (requestType === "GetVirtualCamStatus") {
        return { outputActive: false }
      }
      if (requestType === "ToggleVirtualCam") {
        return { outputActive: true }
      }
      return {}
    })
    await expect(executeTool(toolByName("get_virtual_cam_status"), {}, { config, client: fakeClient }))
      .resolves.toEqual({ outputActive: false })
    await expect(executeTool(toolByName("start_virtual_cam"), {}, { config, client: fakeClient }))
      .resolves.toEqual({ outputActive: true, switched: true })
    await expect(executeTool(toolByName("stop_virtual_cam"), {}, { config, client: fakeClient }))
      .resolves.toEqual({ outputActive: false, switched: true })
    await expect(executeTool(toolByName("toggle_virtual_cam"), {}, { config, client: fakeClient }))
      .resolves.toEqual({ outputActive: true, switched: true })
    expect(seen).toEqual(["GetVirtualCamStatus", "StartVirtualCam", "StopVirtualCam", "ToggleVirtualCam"])
  })

  it("rejects invalid scene params through schema validation", async () => {
    await expect(
      executeTool(toolByName("set_current_scene"), { sceneName: "" }, { config, client: client(async () => ({})) })
    )
      .rejects.toBeInstanceOf(McpError)
  })

  it("rejects invalid scene-item locator params through schema validation", async () => {
    await expect(
      executeTool(toolByName("list_scene_items"), { sceneName: "Scene", sceneUuid: "scene-uuid" }, {
        config,
        client: client(async () => ({}))
      })
    ).rejects.toBeInstanceOf(McpError)

    await expect(
      executeTool(toolByName("list_scene_items"), { sceneUuid: "scene-uuid", canvasUuid: "canvas-uuid" }, {
        config,
        client: client(async () => ({}))
      })
    ).rejects.toBeInstanceOf(McpError)

    await expect(
      executeTool(toolByName("get_scene_item_id"), { sceneName: "Scene", sourceName: "Camera", searchOffset: -2 }, {
        config,
        client: client(async () => ({}))
      })
    ).rejects.toBeInstanceOf(McpError)
  })

  it("lists scene items by scene name and preserves ordered item identity", async () => {
    const requests: Array<unknown> = []
    const output = await executeTool(toolByName("list_scene_items"), {
      sceneName: "Scene",
      canvasUuid: "canvas-uuid"
    }, {
      config,
      client: clientWithData(async (_requestType, requestData) => {
        requests.push(requestData)
        return {
          sceneItems: [
            {
              sceneItemId: 7,
              sceneItemIndex: 0,
              sourceName: "Camera",
              sourceUuid: "source-camera",
              sourceType: "OBS_SOURCE_TYPE_INPUT",
              inputKind: "dshow_input",
              isGroup: false
            },
            {
              sceneItemId: 9,
              sceneItemIndex: 1,
              sourceName: "Lower Third",
              sourceUuid: "source-lower-third",
              sourceType: "OBS_SOURCE_TYPE_SCENE"
            }
          ]
        }
      })
    })

    expect(requests).toEqual([{ sceneName: "Scene", canvasUuid: "canvas-uuid" }])
    expect(output).toEqual({
      sceneItems: [
        {
          sceneItemId: 7,
          sceneItemIndex: 0,
          sourceName: "Camera",
          sourceUuid: "source-camera",
          sourceType: "OBS_SOURCE_TYPE_INPUT",
          inputKind: "dshow_input",
          isGroup: false
        },
        {
          sceneItemId: 9,
          sceneItemIndex: 1,
          sourceName: "Lower Third",
          sourceUuid: "source-lower-third",
          sourceType: "OBS_SOURCE_TYPE_SCENE"
        }
      ]
    })
  })

  it("lists scene items by scene UUID where OBS supports it", async () => {
    const requests: Array<unknown> = []
    await expect(executeTool(toolByName("list_scene_items"), { sceneUuid: "scene-uuid" }, {
      config,
      client: clientWithData(async (_requestType, requestData) => {
        requests.push(requestData)
        return { sceneItems: [] }
      })
    })).resolves.toEqual({ sceneItems: [] })
    expect(requests).toEqual([{ sceneUuid: "scene-uuid" }])
  })

  it("lists group scene items", async () => {
    const requests: Array<unknown> = []
    await expect(executeTool(toolByName("list_group_scene_items"), { sceneName: "Group" }, {
      config,
      client: clientWithData(async (requestType, requestData) => {
        requests.push({ requestType, requestData })
        return {
          sceneItems: [{ sceneItemId: 3, sceneItemIndex: 0, sourceName: "Nested", sourceUuid: "source-nested" }]
        }
      })
    })).resolves.toEqual({
      sceneItems: [{ sceneItemId: 3, sceneItemIndex: 0, sourceName: "Nested", sourceUuid: "source-nested" }]
    })
    expect(requests).toEqual([{ requestType: "GetGroupSceneItemList", requestData: { sceneName: "Group" } }])
  })

  it("looks up scene item IDs by source name", async () => {
    const requests: Array<unknown> = []
    await expect(executeTool(toolByName("get_scene_item_id"), {
      sceneName: "Scene",
      sourceName: "Camera",
      searchOffset: -1
    }, {
      config,
      client: clientWithData(async (_requestType, requestData) => {
        requests.push(requestData)
        return { sceneItemId: 42 }
      })
    })).resolves.toEqual({ sceneItemId: 42 })
    expect(requests).toEqual([{ sceneName: "Scene", sourceName: "Camera", searchOffset: -1 }])
  })

  it("gets a scene item's source", async () => {
    await expect(executeTool(toolByName("get_scene_item_source"), {
      sceneUuid: "scene-uuid",
      sceneItemId: 42
    }, {
      config,
      client: clientWithData(async (_requestType, requestData) => {
        expect(requestData).toEqual({ sceneUuid: "scene-uuid", sceneItemId: 42 })
        return { sourceName: "Camera", sourceUuid: "source-camera" }
      })
    })).resolves.toEqual({ sourceName: "Camera", sourceUuid: "source-camera" })
  })

  it("maps OBS missing scene item errors to MCP errors", async () => {
    await expect(executeTool(toolByName("get_scene_item_id"), { sceneName: "Scene", sourceName: "Missing" }, {
      config,
      client: client(async () => {
        throw new ObsRequestError("GetSceneItemId", 601, "Source not found")
      })
    })).rejects.toMatchObject({ code: ErrorCode.InvalidParams })
  })

  it("filters unavailable scene-item requests by negotiated OBS capabilities", () => {
    expect(
      getEnabledTools(["scenes"], [
        "GetVersion",
        "GetSceneList",
        "GetCurrentProgramScene",
        "SetCurrentProgramScene"
      ]).map((tool) => tool.name)
    ).toEqual(["list_scenes", "get_current_scene", "set_current_scene"])
  })

  it("maps scene operation errors to MCP errors with OBS status metadata", async () => {
    await expect(executeTool(toolByName("set_current_scene"), { sceneName: "Missing" }, {
      config,
      client: client(async () => {
        throw new ObsRequestError("SetCurrentProgramScene", 608, "Parameter: sceneName")
      })
    })).rejects.toMatchObject({ code: ErrorCode.InvalidParams })
  })

  it("maps stream operation errors to MCP errors with OBS status metadata", async () => {
    await expect(executeTool(toolByName("start_stream"), {}, {
      config: { ...config, enabledToolsets: ["stream"] },
      client: client(async () => {
        throw new ObsRequestError("StartStream", 207, "Output already active")
      })
    })).rejects.toMatchObject({
      code: ErrorCode.InternalError,
      data: { requestType: "StartStream", obsStatusCode: 207 }
    })
  })

  it("maps virtual camera operation errors to MCP errors with OBS status metadata", async () => {
    await expect(executeTool(toolByName("start_virtual_cam"), {}, {
      config: { ...config, enabledToolsets: ["outputs"] },
      client: client(async () => {
        throw new ObsRequestError("StartVirtualCam", 500, "virtual camera unavailable")
      })
    })).rejects.toMatchObject({
      code: ErrorCode.InvalidParams,
      data: {
        requestType: "StartVirtualCam",
        obsStatusCode: 500,
        comment: "virtual camera unavailable"
      }
    })
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
