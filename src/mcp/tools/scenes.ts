import * as SceneSchemas from "../../domain/schemas/index.js"
import { EmptyInput } from "../../domain/schemas/shared.js"
import {
  createScene,
  getCurrentPreviewScene,
  getCurrentScene,
  getSceneItemBlendMode,
  getSceneItemEnabled,
  getSceneItemId,
  getSceneItemIndex,
  getSceneItemLocked,
  getSceneItemSource,
  getSceneTransitionOverride,
  getSourceActive,
  listGroups,
  listGroupSceneItems,
  listSceneItems,
  listScenes,
  removeScene,
  setCurrentPreviewScene,
  setCurrentScene,
  setSceneItemBlendMode,
  setSceneItemEnabled,
  setSceneItemIndex,
  setSceneItemLocked,
  setSceneName,
  setSceneTransitionOverride
} from "../../obs/operations/scenes.js"
import {
  CreateScene,
  GetCurrentPreviewScene,
  GetCurrentProgramScene,
  GetGroupList,
  GetGroupSceneItemList,
  GetSceneItemBlendMode,
  GetSceneItemEnabled,
  GetSceneItemId,
  GetSceneItemIndex,
  GetSceneItemList,
  GetSceneItemLocked,
  GetSceneItemSource,
  GetSceneList,
  GetSceneSceneTransitionOverride,
  GetSourceActive,
  RemoveScene,
  SetCurrentPreviewScene,
  SetCurrentProgramScene,
  SetSceneItemBlendMode,
  SetSceneItemEnabled,
  SetSceneItemIndex,
  SetSceneItemLocked,
  SetSceneName,
  SetSceneSceneTransitionOverride
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
    inputSchema: SceneSchemas.ListScenesInput,
    outputSchema: SceneSchemas.ListScenesOutput,
    handler: async (input, context) => listScenes(context.client, input)
  }),
  defineTool({
    name: "list_groups",
    title: "List OBS Groups",
    description: "Return OBS group names. OBS groups are represented as specialized scenes.",
    category: CATEGORY,
    requiredObsRequests: [GetGroupList.requestType],
    inputSchema: EmptyInput,
    outputSchema: SceneSchemas.ListGroupsOutput,
    handler: async (_input, context) => listGroups(context.client)
  }),
  defineTool({
    name: "get_current_scene",
    title: "Get Current OBS Scene",
    description: "Return the current OBS program scene name and UUID when OBS provides one.",
    category: CATEGORY,
    requiredObsRequests: [GetCurrentProgramScene.requestType],
    inputSchema: EmptyInput,
    outputSchema: SceneSchemas.CurrentSceneOutput,
    handler: async (_input, context) => getCurrentScene(context.client)
  }),
  defineTool({
    name: "get_current_preview_scene",
    title: "Get Current OBS Preview Scene",
    description: "Return the current OBS Studio Mode preview scene name and UUID when preview is available.",
    category: CATEGORY,
    requiredObsRequests: [GetCurrentPreviewScene.requestType],
    inputSchema: EmptyInput,
    outputSchema: SceneSchemas.CurrentSceneOutput,
    handler: async (_input, context) => getCurrentPreviewScene(context.client)
  }),
  defineTool({
    name: "set_current_scene",
    title: "Set Current OBS Scene",
    description: "Switch the current OBS program scene by scene name.",
    category: CATEGORY,
    requiredObsRequests: [SetCurrentProgramScene.requestType],
    inputSchema: SceneSchemas.SetCurrentSceneInput,
    outputSchema: SceneSchemas.SetCurrentSceneOutput,
    handler: async (input, context) => setCurrentScene(context.client, input)
  }),
  defineTool({
    name: "set_current_preview_scene",
    title: "Set Current OBS Preview Scene",
    description:
      "Set the OBS Studio Mode preview scene by scene name or UUID. OBS returns an error when preview is unavailable.",
    category: CATEGORY,
    requiredObsRequests: [SetCurrentPreviewScene.requestType],
    inputSchema: SceneSchemas.SetCurrentPreviewSceneInput,
    outputSchema: SceneSchemas.SetCurrentPreviewSceneOutput,
    handler: async (input, context) => setCurrentPreviewScene(context.client, input)
  }),
  defineTool({
    name: "create_scene",
    title: "Create OBS Scene",
    description: "Create an empty OBS scene by name and return its UUID when OBS provides one.",
    category: CATEGORY,
    requiredObsRequests: [CreateScene.requestType],
    inputSchema: SceneSchemas.CreateSceneInput,
    outputSchema: SceneSchemas.CreateSceneOutput,
    handler: async (input, context) => createScene(context.client, input)
  }),
  defineTool({
    name: "remove_scene",
    title: "Remove OBS Scene",
    description: "Remove an OBS scene selected by name or UUID.",
    category: CATEGORY,
    requiredObsRequests: [RemoveScene.requestType],
    inputSchema: SceneSchemas.RemoveSceneInput,
    outputSchema: SceneSchemas.RemoveSceneOutput,
    handler: async (input, context) => removeScene(context.client, input)
  }),
  defineTool({
    name: "set_scene_name",
    title: "Rename OBS Scene",
    description: "Rename an OBS scene selected by name or UUID.",
    category: CATEGORY,
    requiredObsRequests: [SetSceneName.requestType],
    inputSchema: SceneSchemas.SetSceneNameInput,
    outputSchema: SceneSchemas.SetSceneNameOutput,
    handler: async (input, context) => setSceneName(context.client, input)
  }),
  defineTool({
    name: "get_scene_transition_override",
    title: "Get OBS Scene Transition Override",
    description: "Return the per-scene transition override name and duration, or nulls when no override is set.",
    category: CATEGORY,
    requiredObsRequests: [GetSceneSceneTransitionOverride.requestType],
    inputSchema: SceneSchemas.GetSceneTransitionOverrideInput,
    outputSchema: SceneSchemas.SceneTransitionOverrideOutput,
    handler: async (input, context) => getSceneTransitionOverride(context.client, input)
  }),
  defineTool({
    name: "set_scene_transition_override",
    title: "Set OBS Scene Transition Override",
    description: "Set, update, or clear a per-scene transition override name and duration.",
    category: CATEGORY,
    requiredObsRequests: [SetSceneSceneTransitionOverride.requestType],
    inputSchema: SceneSchemas.SetSceneTransitionOverrideInput,
    outputSchema: SceneSchemas.SetSceneTransitionOverrideOutput,
    handler: async (input, context) => setSceneTransitionOverride(context.client, input)
  }),
  defineTool({
    name: "list_scene_items",
    title: "List OBS Scene Items",
    description: "Return ordered scene item summaries for a scene selected by name or UUID.",
    category: CATEGORY,
    requiredObsRequests: [GetSceneItemList.requestType],
    inputSchema: SceneSchemas.ListSceneItemsInput,
    outputSchema: SceneSchemas.ListSceneItemsOutput,
    handler: async (input, context) => listSceneItems(context.client, input)
  }),
  defineTool({
    name: "list_group_scene_items",
    title: "List OBS Group Scene Items",
    description: "Return ordered scene item summaries for a group selected by name or UUID.",
    category: CATEGORY,
    requiredObsRequests: [GetGroupSceneItemList.requestType],
    inputSchema: SceneSchemas.ListGroupSceneItemsInput,
    outputSchema: SceneSchemas.ListGroupSceneItemsOutput,
    handler: async (input, context) => listGroupSceneItems(context.client, input)
  }),
  defineTool({
    name: "get_scene_item_id",
    title: "Get OBS Scene Item ID",
    description: "Find a source by name in a scene or group and return its numeric scene item ID.",
    category: CATEGORY,
    requiredObsRequests: [GetSceneItemId.requestType],
    inputSchema: SceneSchemas.GetSceneItemIdInput,
    outputSchema: SceneSchemas.GetSceneItemIdOutput,
    handler: async (input, context) => getSceneItemId(context.client, input)
  }),
  defineTool({
    name: "get_scene_item_source",
    title: "Get OBS Scene Item Source",
    description: "Return the source name and UUID associated with a scene item ID.",
    category: CATEGORY,
    requiredObsRequests: [GetSceneItemSource.requestType],
    inputSchema: SceneSchemas.GetSceneItemSourceInput,
    outputSchema: SceneSchemas.GetSceneItemSourceOutput,
    handler: async (input, context) => getSceneItemSource(context.client, input)
  }),
  defineTool({
    name: "get_scene_item_enabled",
    title: "Get OBS Scene Item Enabled",
    description: "Return whether a scene item is enabled.",
    category: CATEGORY,
    requiredObsRequests: [GetSceneItemEnabled.requestType],
    inputSchema: SceneSchemas.GetSceneItemEnabledInput,
    outputSchema: SceneSchemas.GetSceneItemEnabledOutput,
    handler: async (input, context) => getSceneItemEnabled(context.client, input)
  }),
  defineTool({
    name: "set_scene_item_enabled",
    title: "Set OBS Scene Item Enabled",
    description: "Set whether a scene item is enabled.",
    category: CATEGORY,
    requiredObsRequests: [SetSceneItemEnabled.requestType],
    inputSchema: SceneSchemas.SetSceneItemEnabledInput,
    outputSchema: SceneSchemas.SetSceneItemEnabledOutput,
    handler: async (input, context) => setSceneItemEnabled(context.client, input)
  }),
  defineTool({
    name: "get_scene_item_locked",
    title: "Get OBS Scene Item Locked",
    description: "Return whether a scene item is locked.",
    category: CATEGORY,
    requiredObsRequests: [GetSceneItemLocked.requestType],
    inputSchema: SceneSchemas.GetSceneItemLockedInput,
    outputSchema: SceneSchemas.GetSceneItemLockedOutput,
    handler: async (input, context) => getSceneItemLocked(context.client, input)
  }),
  defineTool({
    name: "set_scene_item_locked",
    title: "Set OBS Scene Item Locked",
    description: "Set whether a scene item is locked.",
    category: CATEGORY,
    requiredObsRequests: [SetSceneItemLocked.requestType],
    inputSchema: SceneSchemas.SetSceneItemLockedInput,
    outputSchema: SceneSchemas.SetSceneItemLockedOutput,
    handler: async (input, context) => setSceneItemLocked(context.client, input)
  }),
  defineTool({
    name: "get_scene_item_index",
    title: "Get OBS Scene Item Index",
    description: "Return a scene item's index position in its scene.",
    category: CATEGORY,
    requiredObsRequests: [GetSceneItemIndex.requestType],
    inputSchema: SceneSchemas.GetSceneItemIndexInput,
    outputSchema: SceneSchemas.GetSceneItemIndexOutput,
    handler: async (input, context) => getSceneItemIndex(context.client, input)
  }),
  defineTool({
    name: "get_scene_item_blend_mode",
    title: "Get OBS Scene Item Blend Mode",
    description: "Return a scene item's OBS blend mode.",
    category: CATEGORY,
    requiredObsRequests: [GetSceneItemBlendMode.requestType],
    inputSchema: SceneSchemas.GetSceneItemBlendModeInput,
    outputSchema: SceneSchemas.GetSceneItemBlendModeOutput,
    handler: async (input, context) => getSceneItemBlendMode(context.client, input)
  }),
  defineTool({
    name: "set_scene_item_index",
    title: "Set OBS Scene Item Index",
    description: "Set a scene item's index position in its scene.",
    category: CATEGORY,
    requiredObsRequests: [SetSceneItemIndex.requestType],
    inputSchema: SceneSchemas.SetSceneItemIndexInput,
    outputSchema: SceneSchemas.SetSceneItemIndexOutput,
    handler: async (input, context) => setSceneItemIndex(context.client, input)
  }),
  defineTool({
    name: "set_scene_item_blend_mode",
    title: "Set OBS Scene Item Blend Mode",
    description: "Set a scene item's OBS blend mode.",
    category: CATEGORY,
    requiredObsRequests: [SetSceneItemBlendMode.requestType],
    inputSchema: SceneSchemas.SetSceneItemBlendModeInput,
    outputSchema: SceneSchemas.SetSceneItemBlendModeOutput,
    handler: async (input, context) => setSceneItemBlendMode(context.client, input)
  }),
  defineTool({
    name: "get_source_active",
    title: "Get OBS Source Active State",
    description: "Return whether a source is active in program and showing in OBS UI.",
    category: CATEGORY,
    requiredObsRequests: [GetSourceActive.requestType],
    inputSchema: SceneSchemas.GetSourceActiveInput,
    outputSchema: SceneSchemas.GetSourceActiveOutput,
    handler: async (input, context) => getSourceActive(context.client, input)
  })
]
