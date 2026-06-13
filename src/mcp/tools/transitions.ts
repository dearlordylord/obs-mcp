import {
  CurrentSceneTransitionOutput,
  SceneTransitionCursorOutput,
  SceneTransitionListOutput,
  SetCurrentSceneTransitionDurationInput,
  SetCurrentSceneTransitionDurationOutput,
  SetCurrentSceneTransitionInput,
  SetCurrentSceneTransitionOutput,
  SetCurrentSceneTransitionSettingsInput,
  SetCurrentSceneTransitionSettingsOutput,
  SetTBarPositionInput,
  SetTBarPositionOutput,
  TransitionKindListOutput,
  TriggerStudioModeTransitionOutput
} from "../../domain/schemas/index.js"
import { EmptyInput } from "../../domain/schemas/shared.js"
import {
  getCurrentSceneTransition,
  getCurrentSceneTransitionCursor,
  listSceneTransitions,
  listTransitionKinds,
  setCurrentSceneTransition,
  setCurrentSceneTransitionDuration,
  setCurrentSceneTransitionSettings,
  setTBarPosition,
  triggerStudioModeTransition
} from "../../obs/operations/transitions.js"
import {
  GetCurrentSceneTransition,
  GetCurrentSceneTransitionCursor,
  GetSceneTransitionList,
  GetTransitionKindList,
  SetCurrentSceneTransition,
  SetCurrentSceneTransitionDuration,
  SetCurrentSceneTransitionSettings,
  SetTBarPosition,
  TriggerStudioModeTransition
} from "../../obs/requests.js"
import { defineTool, type ToolDefinition } from "./mechanics.js"

const CATEGORY = "transitions" as const

export const transitionTools: ReadonlyArray<ToolDefinition> = [
  defineTool({
    name: "list_transition_kinds",
    title: "List OBS Transition Kinds",
    description: "Return OBS transition kind identifiers.",
    category: CATEGORY,
    requiredObsRequests: [GetTransitionKindList.requestType],
    inputSchema: EmptyInput,
    outputSchema: TransitionKindListOutput,
    handler: async (_input, context) => listTransitionKinds(context.client)
  }),
  defineTool({
    name: "list_scene_transitions",
    title: "List OBS Scene Transitions",
    description: "Return current scene transition identity and stable transition summaries.",
    category: CATEGORY,
    requiredObsRequests: [GetSceneTransitionList.requestType],
    inputSchema: EmptyInput,
    outputSchema: SceneTransitionListOutput,
    handler: async (_input, context) => listSceneTransitions(context.client)
  }),
  defineTool({
    name: "get_current_scene_transition",
    title: "Get Current OBS Scene Transition",
    description: "Return current scene transition identity, kind, fixed-duration state, and configured duration.",
    category: CATEGORY,
    requiredObsRequests: [GetCurrentSceneTransition.requestType],
    inputSchema: EmptyInput,
    outputSchema: CurrentSceneTransitionOutput,
    handler: async (_input, context) => getCurrentSceneTransition(context.client)
  }),
  defineTool({
    name: "get_current_scene_transition_cursor",
    title: "Get Current OBS Scene Transition Cursor",
    description: "Return the current scene transition cursor position between 0 and 1.",
    category: CATEGORY,
    requiredObsRequests: [GetCurrentSceneTransitionCursor.requestType],
    inputSchema: EmptyInput,
    outputSchema: SceneTransitionCursorOutput,
    handler: async (_input, context) => getCurrentSceneTransitionCursor(context.client)
  }),
  defineTool({
    name: "set_current_scene_transition",
    title: "Set Current OBS Scene Transition",
    description: "Set the current OBS scene transition by non-empty transition name.",
    category: CATEGORY,
    requiredObsRequests: [SetCurrentSceneTransition.requestType],
    inputSchema: SetCurrentSceneTransitionInput,
    outputSchema: SetCurrentSceneTransitionOutput,
    handler: async (input, context) => setCurrentSceneTransition(context.client, input)
  }),
  defineTool({
    name: "set_current_scene_transition_duration",
    title: "Set Current OBS Scene Transition Duration",
    description: "Set the current OBS scene transition duration in milliseconds, bounded from 50 to 20000.",
    category: CATEGORY,
    requiredObsRequests: [SetCurrentSceneTransitionDuration.requestType],
    inputSchema: SetCurrentSceneTransitionDurationInput,
    outputSchema: SetCurrentSceneTransitionDurationOutput,
    handler: async (input, context) => setCurrentSceneTransitionDuration(context.client, input)
  }),
  defineTool({
    name: "set_current_scene_transition_settings",
    title: "Set Current OBS Scene Transition Settings",
    description:
      "Set current OBS scene transition settings using a flat primitive settings record; overlay defaults to true and merges over existing settings, while false replaces them.",
    category: CATEGORY,
    requiredObsRequests: [SetCurrentSceneTransitionSettings.requestType],
    inputSchema: SetCurrentSceneTransitionSettingsInput,
    outputSchema: SetCurrentSceneTransitionSettingsOutput,
    handler: async (input, context) => setCurrentSceneTransitionSettings(context.client, input)
  }),
  defineTool({
    name: "trigger_studio_mode_transition",
    title: "Trigger OBS Studio Mode Transition",
    description: "Trigger the current OBS studio mode transition.",
    category: CATEGORY,
    requiredObsRequests: [TriggerStudioModeTransition.requestType],
    inputSchema: EmptyInput,
    outputSchema: TriggerStudioModeTransitionOutput,
    handler: async (_input, context) => triggerStudioModeTransition(context.client)
  }),
  defineTool({
    name: "set_tbar_position",
    title: "Set OBS T-Bar Position",
    description: "Set the OBS T-Bar position between 0 and 1; release defaults to true.",
    category: CATEGORY,
    requiredObsRequests: [SetTBarPosition.requestType],
    inputSchema: SetTBarPositionInput,
    outputSchema: SetTBarPositionOutput,
    handler: async (input, context) => setTBarPosition(context.client, input)
  })
]
