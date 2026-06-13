import { getSanitizedObsContext } from "../../config/obs-runtime-context.js"
import {
  HotkeyListOutput,
  ObsContextOutput,
  ObsStatsOutput,
  TriggerHotkeyByKeySequenceInput,
  TriggerHotkeyByKeySequenceOutput,
  TriggerHotkeyByNameInput,
  TriggerHotkeyByNameOutput,
  VersionOutput
} from "../../domain/schemas/index.js"
import { EmptyInput } from "../../domain/schemas/shared.js"
import {
  getObsStats,
  getVersion,
  listHotkeys,
  triggerHotkeyByKeySequence,
  triggerHotkeyByName
} from "../../obs/operations/general.js"
import {
  GetHotkeyList,
  GetStats,
  GetVersion,
  TriggerHotkeyByKeySequence,
  TriggerHotkeyByName
} from "../../obs/requests.js"
import { defineTool, type ToolDefinition } from "./mechanics.js"

const CATEGORY = "general" as const

export const generalTools: ReadonlyArray<ToolDefinition> = [
  defineTool({
    name: "get_obs_context",
    title: "Get OBS MCP Context",
    description: "Return sanitized OBS MCP runtime context without secrets.",
    category: CATEGORY,
    requiredObsRequests: [],
    inputSchema: EmptyInput,
    outputSchema: ObsContextOutput,
    handler: async (_input, context) => getSanitizedObsContext(context.config)
  }),
  defineTool({
    name: "get_version",
    title: "Get OBS Version",
    description:
      "Return OBS Studio, obs-websocket, negotiated RPC, request, image, and platform capability information.",
    category: CATEGORY,
    requiredObsRequests: [GetVersion.requestType],
    inputSchema: EmptyInput,
    outputSchema: VersionOutput,
    handler: async (_input, context) => getVersion(context.client)
  }),
  defineTool({
    name: "get_obs_stats",
    title: "Get OBS Stats",
    description: "Return current OBS, obs-websocket, render, output, CPU, memory, and disk statistics.",
    category: CATEGORY,
    requiredObsRequests: [GetStats.requestType],
    inputSchema: EmptyInput,
    outputSchema: ObsStatsOutput,
    handler: async (_input, context) => getObsStats(context.client)
  }),
  defineTool({
    name: "list_hotkeys",
    title: "List OBS Hotkeys",
    description:
      "Return OBS hotkey names. OBS hotkeys are best-effort; dedicated OBS requests are usually more reliable when available.",
    category: CATEGORY,
    requiredObsRequests: [GetHotkeyList.requestType],
    inputSchema: EmptyInput,
    outputSchema: HotkeyListOutput,
    handler: async (_input, context) => listHotkeys(context.client)
  }),
  defineTool({
    name: "trigger_hotkey_by_name",
    title: "Trigger OBS Hotkey By Name",
    description:
      "Trigger an OBS hotkey by name. OBS hotkeys are best-effort; prefer dedicated OBS requests for reliable actions when available.",
    category: CATEGORY,
    requiredObsRequests: [TriggerHotkeyByName.requestType],
    inputSchema: TriggerHotkeyByNameInput,
    outputSchema: TriggerHotkeyByNameOutput,
    handler: async (input, context) => triggerHotkeyByName(context.client, input)
  }),
  defineTool({
    name: "trigger_hotkey_by_key_sequence",
    title: "Trigger OBS Hotkey By Key Sequence",
    description:
      "Trigger an OBS hotkey by bounded key sequence. OBS hotkeys are best-effort; prefer dedicated OBS requests for reliable actions when available.",
    category: CATEGORY,
    requiredObsRequests: [TriggerHotkeyByKeySequence.requestType],
    inputSchema: TriggerHotkeyByKeySequenceInput,
    outputSchema: TriggerHotkeyByKeySequenceOutput,
    handler: async (input, context) => triggerHotkeyByKeySequence(context.client, input)
  })
]
