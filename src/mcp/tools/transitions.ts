import {
  CurrentSceneTransitionOutput,
  SceneTransitionCursorOutput,
  SceneTransitionListOutput,
  TransitionKindListOutput
} from "../../domain/schemas/index.js"
import { EmptyInput } from "../../domain/schemas/shared.js"
import {
  getCurrentSceneTransition,
  getCurrentSceneTransitionCursor,
  listSceneTransitions,
  listTransitionKinds
} from "../../obs/operations/transitions.js"
import {
  GetCurrentSceneTransition,
  GetCurrentSceneTransitionCursor,
  GetSceneTransitionList,
  GetTransitionKindList
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
  })
]
