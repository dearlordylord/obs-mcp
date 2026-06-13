import {
  CurrentSceneOutput,
  GetSceneItemBlendModeInput,
  GetSceneItemBlendModeOutput,
  GetSceneItemEnabledInput,
  GetSceneItemEnabledOutput,
  GetSceneItemIdInput,
  GetSceneItemIdOutput,
  GetSceneItemIndexInput,
  GetSceneItemIndexOutput,
  GetSceneItemLockedInput,
  GetSceneItemLockedOutput,
  GetSceneItemSourceInput,
  GetSceneItemSourceOutput,
  ListGroupSceneItemsInput,
  ListGroupSceneItemsOutput,
  ListSceneItemsInput,
  ListSceneItemsOutput,
  ListScenesInput,
  ListScenesOutput,
  SetCurrentSceneInput,
  SetCurrentSceneOutput,
  SetSceneItemEnabledInput,
  SetSceneItemEnabledOutput,
  SetSceneItemLockedInput,
  SetSceneItemLockedOutput
} from "../../domain/schemas/index.js"
import { EmptyInput } from "../../domain/schemas/shared.js"
import {
  getCurrentScene,
  getSceneItemBlendMode,
  getSceneItemEnabled,
  getSceneItemId,
  getSceneItemIndex,
  getSceneItemLocked,
  getSceneItemSource,
  listGroupSceneItems,
  listSceneItems,
  listScenes,
  setCurrentScene,
  setSceneItemEnabled,
  setSceneItemLocked
} from "../../obs/operations/scenes.js"
import {
  GetCurrentProgramScene,
  GetGroupSceneItemList,
  GetSceneItemBlendMode,
  GetSceneItemEnabled,
  GetSceneItemId,
  GetSceneItemIndex,
  GetSceneItemList,
  GetSceneItemLocked,
  GetSceneItemSource,
  GetSceneList,
  SetCurrentProgramScene,
  SetSceneItemEnabled,
  SetSceneItemLocked
} from "../../obs/requests.js"
import { defineTool, type ToolDefinition } from "./mechanics.js"

const CATEGORY = "scenes" as const

export const sceneTools: ReadonlyArray<ToolDefinition> = [
  defineTool({
    name: "list_scenes",
    title: "List OBS Scenes",
    description: "Return current program and preview scenes plus ordered scene summaries.",
    category: CATEGORY,
    requiredObsRequests: [GetSceneList.requestType],
    inputSchema: ListScenesInput,
    outputSchema: ListScenesOutput,
    handler: async (input, context) => listScenes(context.client, input)
  }),
  defineTool({
    name: "get_current_scene",
    title: "Get Current OBS Scene",
    description: "Return the current OBS program scene name and UUID when OBS provides one.",
    category: CATEGORY,
    requiredObsRequests: [GetCurrentProgramScene.requestType],
    inputSchema: EmptyInput,
    outputSchema: CurrentSceneOutput,
    handler: async (_input, context) => getCurrentScene(context.client)
  }),
  defineTool({
    name: "set_current_scene",
    title: "Set Current OBS Scene",
    description: "Switch the current OBS program scene by scene name.",
    category: CATEGORY,
    requiredObsRequests: [SetCurrentProgramScene.requestType],
    inputSchema: SetCurrentSceneInput,
    outputSchema: SetCurrentSceneOutput,
    handler: async (input, context) => setCurrentScene(context.client, input)
  }),
  defineTool({
    name: "list_scene_items",
    title: "List OBS Scene Items",
    description: "Return ordered scene item summaries for a scene selected by name or UUID.",
    category: CATEGORY,
    requiredObsRequests: [GetSceneItemList.requestType],
    inputSchema: ListSceneItemsInput,
    outputSchema: ListSceneItemsOutput,
    handler: async (input, context) => listSceneItems(context.client, input)
  }),
  defineTool({
    name: "list_group_scene_items",
    title: "List OBS Group Scene Items",
    description: "Return ordered scene item summaries for a group selected by name or UUID.",
    category: CATEGORY,
    requiredObsRequests: [GetGroupSceneItemList.requestType],
    inputSchema: ListGroupSceneItemsInput,
    outputSchema: ListGroupSceneItemsOutput,
    handler: async (input, context) => listGroupSceneItems(context.client, input)
  }),
  defineTool({
    name: "get_scene_item_id",
    title: "Get OBS Scene Item ID",
    description: "Find a source by name in a scene or group and return its numeric scene item ID.",
    category: CATEGORY,
    requiredObsRequests: [GetSceneItemId.requestType],
    inputSchema: GetSceneItemIdInput,
    outputSchema: GetSceneItemIdOutput,
    handler: async (input, context) => getSceneItemId(context.client, input)
  }),
  defineTool({
    name: "get_scene_item_source",
    title: "Get OBS Scene Item Source",
    description: "Return the source name and UUID associated with a scene item ID.",
    category: CATEGORY,
    requiredObsRequests: [GetSceneItemSource.requestType],
    inputSchema: GetSceneItemSourceInput,
    outputSchema: GetSceneItemSourceOutput,
    handler: async (input, context) => getSceneItemSource(context.client, input)
  }),
  defineTool({
    name: "get_scene_item_enabled",
    title: "Get OBS Scene Item Enabled",
    description: "Return whether a scene item is enabled.",
    category: CATEGORY,
    requiredObsRequests: [GetSceneItemEnabled.requestType],
    inputSchema: GetSceneItemEnabledInput,
    outputSchema: GetSceneItemEnabledOutput,
    handler: async (input, context) => getSceneItemEnabled(context.client, input)
  }),
  defineTool({
    name: "set_scene_item_enabled",
    title: "Set OBS Scene Item Enabled",
    description: "Set whether a scene item is enabled.",
    category: CATEGORY,
    requiredObsRequests: [SetSceneItemEnabled.requestType],
    inputSchema: SetSceneItemEnabledInput,
    outputSchema: SetSceneItemEnabledOutput,
    handler: async (input, context) => setSceneItemEnabled(context.client, input)
  }),
  defineTool({
    name: "get_scene_item_locked",
    title: "Get OBS Scene Item Locked",
    description: "Return whether a scene item is locked.",
    category: CATEGORY,
    requiredObsRequests: [GetSceneItemLocked.requestType],
    inputSchema: GetSceneItemLockedInput,
    outputSchema: GetSceneItemLockedOutput,
    handler: async (input, context) => getSceneItemLocked(context.client, input)
  }),
  defineTool({
    name: "set_scene_item_locked",
    title: "Set OBS Scene Item Locked",
    description: "Set whether a scene item is locked.",
    category: CATEGORY,
    requiredObsRequests: [SetSceneItemLocked.requestType],
    inputSchema: SetSceneItemLockedInput,
    outputSchema: SetSceneItemLockedOutput,
    handler: async (input, context) => setSceneItemLocked(context.client, input)
  }),
  defineTool({
    name: "get_scene_item_index",
    title: "Get OBS Scene Item Index",
    description: "Return a scene item's index position in its scene.",
    category: CATEGORY,
    requiredObsRequests: [GetSceneItemIndex.requestType],
    inputSchema: GetSceneItemIndexInput,
    outputSchema: GetSceneItemIndexOutput,
    handler: async (input, context) => getSceneItemIndex(context.client, input)
  }),
  defineTool({
    name: "get_scene_item_blend_mode",
    title: "Get OBS Scene Item Blend Mode",
    description: "Return a scene item's OBS blend mode.",
    category: CATEGORY,
    requiredObsRequests: [GetSceneItemBlendMode.requestType],
    inputSchema: GetSceneItemBlendModeInput,
    outputSchema: GetSceneItemBlendModeOutput,
    handler: async (input, context) => getSceneItemBlendMode(context.client, input)
  })
]
