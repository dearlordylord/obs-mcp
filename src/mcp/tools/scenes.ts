import {
  CurrentSceneOutput,
  GetSceneItemIdInput,
  GetSceneItemIdOutput,
  GetSceneItemSourceInput,
  GetSceneItemSourceOutput,
  ListGroupSceneItemsInput,
  ListGroupSceneItemsOutput,
  ListSceneItemsInput,
  ListSceneItemsOutput,
  ListScenesInput,
  ListScenesOutput,
  SetCurrentSceneInput,
  SetCurrentSceneOutput
} from "../../domain/schemas/index.js"
import { EmptyInput } from "../../domain/schemas/shared.js"
import {
  getCurrentScene,
  getSceneItemId,
  getSceneItemSource,
  listGroupSceneItems,
  listSceneItems,
  listScenes,
  setCurrentScene
} from "../../obs/operations/scenes.js"
import {
  GetCurrentProgramScene,
  GetGroupSceneItemList,
  GetSceneItemId,
  GetSceneItemList,
  GetSceneItemSource,
  GetSceneList,
  SetCurrentProgramScene
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
  })
]
