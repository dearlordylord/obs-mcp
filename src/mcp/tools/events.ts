import {
  ConfirmObsCanvasInventoryChangeInput,
  ConfirmObsCanvasInventoryChangeOutput,
  ConfirmObsConfigWorkflowInput,
  ConfirmObsConfigWorkflowOutput,
  ConfirmObsInputAudioChangeInput,
  ConfirmObsInputAudioChangeOutput,
  ConfirmObsInputIdentityChangeInput,
  ConfirmObsInputIdentityChangeOutput,
  ConfirmObsMediaInputWorkflowInput,
  ConfirmObsMediaInputWorkflowOutput,
  ConfirmObsOutputLifecycleInput,
  ConfirmObsOutputLifecycleOutput,
  ConfirmObsSceneGraphChangeInput,
  ConfirmObsSceneGraphChangeOutput,
  ConfirmObsSourceFilterChangeInput,
  ConfirmObsSourceFilterChangeOutput,
  ConfirmObsStudioModeStateChangeInput,
  ConfirmObsStudioModeStateChangeOutput,
  ConfirmObsTransitionWorkflowInput,
  ConfirmObsTransitionWorkflowOutput,
  GetRecentObsEventsInput,
  GetRecentObsEventsOutput
} from "../../domain/schemas/index.js"
import {
  confirmObsCanvasInventoryChange,
  confirmObsConfigWorkflow,
  confirmObsInputAudioChange,
  confirmObsInputIdentityChange,
  confirmObsMediaInputWorkflow,
  confirmObsOutputLifecycle,
  confirmObsSceneGraphChange,
  confirmObsSourceFilterChange,
  confirmObsStudioModeStateChange,
  confirmObsTransitionWorkflow,
  getRecentObsEvents
} from "../../obs/operations/events.js"
import { defineTool, type ToolDefinition } from "./mechanics.js"

const CATEGORY = "events" as const

export const eventTools: ReadonlyArray<ToolDefinition> = [
  defineTool({
    name: "get_recent_obs_events",
    title: "Get Recent Safe OBS Events",
    description: "Return recent buffered safe OBS events with optional category filters and explicit ordering.",
    category: CATEGORY,
    requiredObsRequests: [],
    inputSchema: GetRecentObsEventsInput,
    outputSchema: GetRecentObsEventsOutput,
    handler: async (input, context) => getRecentObsEvents(context.client, input)
  }),
  defineTool({
    name: "confirm_obs_output_lifecycle",
    title: "Confirm OBS Output Lifecycle",
    description: "Wait for a typed OBS output lifecycle outcome after a known event sequence cursor.",
    category: CATEGORY,
    requiredObsRequests: [],
    inputSchema: ConfirmObsOutputLifecycleInput,
    outputSchema: ConfirmObsOutputLifecycleOutput,
    handler: async (input, context) =>
      confirmObsOutputLifecycle(context.client, input, { maxTimeoutMs: context.config.connectionTimeoutMs })
  }),
  defineTool({
    name: "confirm_obs_scene_graph_change",
    title: "Confirm OBS Scene Graph Change",
    description: "Wait for a typed OBS scene graph or scene-item outcome after a known event sequence cursor.",
    category: CATEGORY,
    requiredObsRequests: [],
    inputSchema: ConfirmObsSceneGraphChangeInput,
    outputSchema: ConfirmObsSceneGraphChangeOutput,
    handler: async (input, context) =>
      confirmObsSceneGraphChange(context.client, input, { maxTimeoutMs: context.config.connectionTimeoutMs })
  }),
  defineTool({
    name: "confirm_obs_source_filter_change",
    title: "Confirm OBS Source Filter Change",
    description: "Wait for a typed OBS source-filter workflow outcome after a known event sequence cursor.",
    category: CATEGORY,
    requiredObsRequests: [],
    inputSchema: ConfirmObsSourceFilterChangeInput,
    outputSchema: ConfirmObsSourceFilterChangeOutput,
    handler: async (input, context) =>
      confirmObsSourceFilterChange(context.client, input, { maxTimeoutMs: context.config.connectionTimeoutMs })
  }),
  defineTool({
    name: "confirm_obs_media_input_workflow",
    title: "Confirm OBS Media Input Workflow",
    description: "Wait for a typed OBS media input playback or action outcome after a known event sequence cursor.",
    category: CATEGORY,
    requiredObsRequests: [],
    inputSchema: ConfirmObsMediaInputWorkflowInput,
    outputSchema: ConfirmObsMediaInputWorkflowOutput,
    handler: async (input, context) =>
      confirmObsMediaInputWorkflow(context.client, input, { maxTimeoutMs: context.config.connectionTimeoutMs })
  }),
  defineTool({
    name: "confirm_obs_transition_workflow",
    title: "Confirm OBS Transition Workflow",
    description:
      "Wait for a typed OBS transition configuration or lifecycle outcome after a known event sequence cursor.",
    category: CATEGORY,
    requiredObsRequests: [],
    inputSchema: ConfirmObsTransitionWorkflowInput,
    outputSchema: ConfirmObsTransitionWorkflowOutput,
    handler: async (input, context) =>
      confirmObsTransitionWorkflow(context.client, input, { maxTimeoutMs: context.config.connectionTimeoutMs })
  }),
  defineTool({
    name: "confirm_obs_input_audio_change",
    title: "Confirm OBS Input Audio Change",
    description: "Wait for a typed OBS input audio control outcome after a known event sequence cursor.",
    category: CATEGORY,
    requiredObsRequests: [],
    inputSchema: ConfirmObsInputAudioChangeInput,
    outputSchema: ConfirmObsInputAudioChangeOutput,
    handler: async (input, context) =>
      confirmObsInputAudioChange(context.client, input, { maxTimeoutMs: context.config.connectionTimeoutMs })
  }),
  defineTool({
    name: "confirm_obs_input_identity_change",
    title: "Confirm OBS Input Identity Change",
    description: "Wait for a typed OBS input removal or rename event after a known event sequence cursor.",
    category: CATEGORY,
    requiredObsRequests: [],
    inputSchema: ConfirmObsInputIdentityChangeInput,
    outputSchema: ConfirmObsInputIdentityChangeOutput,
    handler: async (input, context) =>
      confirmObsInputIdentityChange(context.client, input, { maxTimeoutMs: context.config.connectionTimeoutMs })
  }),
  defineTool({
    name: "confirm_obs_canvas_inventory_change",
    title: "Confirm OBS Canvas Inventory Change",
    description: "Wait for a typed OBS canvas creation, removal, or rename event after a known event sequence cursor.",
    category: CATEGORY,
    requiredObsRequests: [],
    inputSchema: ConfirmObsCanvasInventoryChangeInput,
    outputSchema: ConfirmObsCanvasInventoryChangeOutput,
    handler: async (input, context) =>
      confirmObsCanvasInventoryChange(context.client, input, { maxTimeoutMs: context.config.connectionTimeoutMs })
  }),
  defineTool({
    name: "confirm_obs_studio_mode_state_change",
    title: "Confirm OBS Studio Mode State Change",
    description: "Wait for a typed OBS studio-mode enabled or disabled event after a known event sequence cursor.",
    category: CATEGORY,
    requiredObsRequests: [],
    inputSchema: ConfirmObsStudioModeStateChangeInput,
    outputSchema: ConfirmObsStudioModeStateChangeOutput,
    handler: async (input, context) =>
      confirmObsStudioModeStateChange(context.client, input, { maxTimeoutMs: context.config.connectionTimeoutMs })
  }),
  defineTool({
    name: "confirm_obs_config_workflow",
    title: "Confirm OBS Config Workflow",
    description: "Wait for a typed OBS profile or scene-collection config outcome after a known event sequence cursor.",
    category: CATEGORY,
    requiredObsRequests: [],
    inputSchema: ConfirmObsConfigWorkflowInput,
    outputSchema: ConfirmObsConfigWorkflowOutput,
    handler: async (input, context) =>
      confirmObsConfigWorkflow(context.client, input, { maxTimeoutMs: context.config.connectionTimeoutMs })
  })
]
