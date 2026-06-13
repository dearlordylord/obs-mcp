import {
  ProfileListOutput,
  ProfileParameterInput,
  ProfileParameterOutput,
  RecordDirectoryOutput,
  SceneCollectionListOutput
} from "../../domain/schemas/index.js"
import { EmptyInput } from "../../domain/schemas/shared.js"
import {
  getProfileParameter,
  getRecordDirectory,
  listProfiles,
  listSceneCollections
} from "../../obs/operations/config.js"
import { GetProfileList, GetProfileParameter, GetRecordDirectory, GetSceneCollectionList } from "../../obs/requests.js"
import { defineTool, type ToolDefinition } from "./mechanics.js"

const CATEGORY = "config" as const

export const configTools: ReadonlyArray<ToolDefinition> = [
  defineTool({
    name: "list_profiles",
    title: "List OBS Profiles",
    description: "Return current OBS profile name and all available profile names.",
    category: CATEGORY,
    requiredObsRequests: [GetProfileList.requestType],
    inputSchema: EmptyInput,
    outputSchema: ProfileListOutput,
    handler: async (_input, context) => listProfiles(context.client)
  }),
  defineTool({
    name: "list_scene_collections",
    title: "List OBS Scene Collections",
    description: "Return current OBS scene collection name and all available scene collection names.",
    category: CATEGORY,
    requiredObsRequests: [GetSceneCollectionList.requestType],
    inputSchema: EmptyInput,
    outputSchema: SceneCollectionListOutput,
    handler: async (_input, context) => listSceneCollections(context.client)
  }),
  defineTool({
    name: "get_profile_parameter",
    title: "Get OBS Profile Parameter",
    description: "Return a current OBS profile parameter value and default value by category and name.",
    category: CATEGORY,
    requiredObsRequests: [GetProfileParameter.requestType],
    inputSchema: ProfileParameterInput,
    outputSchema: ProfileParameterOutput,
    handler: async (input, context) => getProfileParameter(context.client, input)
  }),
  defineTool({
    name: "get_record_directory",
    title: "Get OBS Record Directory",
    description: "Return OBS' configured recording directory as an opaque string without filesystem access.",
    category: CATEGORY,
    requiredObsRequests: [GetRecordDirectory.requestType],
    inputSchema: EmptyInput,
    outputSchema: RecordDirectoryOutput,
    handler: async (_input, context) => getRecordDirectory(context.client)
  })
]
