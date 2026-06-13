import {
  CreateProfileOutput,
  CreateSceneCollectionOutput,
  ProfileListOutput,
  ProfileNameInput,
  ProfileParameterInput,
  ProfileParameterOutput,
  RecordDirectoryOutput,
  RemoveProfileOutput,
  SceneCollectionListOutput,
  SceneCollectionNameInput,
  SetCurrentProfileOutput,
  SetCurrentSceneCollectionOutput,
  SetProfileParameterInput,
  SetProfileParameterOutput,
  SetRecordDirectoryInput,
  SetRecordDirectoryOutput,
  SetVideoSettingsInput,
  SetVideoSettingsOutput,
  VideoSettingsOutput
} from "../../domain/schemas/index.js"
import { EmptyInput } from "../../domain/schemas/shared.js"
import {
  createProfile,
  createSceneCollection,
  getProfileParameter,
  getRecordDirectory,
  getVideoSettings,
  listProfiles,
  listSceneCollections,
  removeProfile,
  setCurrentProfile,
  setCurrentSceneCollection,
  setProfileParameter,
  setRecordDirectory,
  setVideoSettings
} from "../../obs/operations/config.js"
import {
  CreateProfile,
  CreateSceneCollection,
  GetProfileList,
  GetProfileParameter,
  GetRecordDirectory,
  GetSceneCollectionList,
  GetVideoSettings,
  RemoveProfile,
  SetCurrentProfile,
  SetCurrentSceneCollection,
  SetProfileParameter,
  SetRecordDirectory,
  SetVideoSettings
} from "../../obs/requests.js"
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
  }),
  defineTool({
    name: "set_record_directory",
    title: "Set OBS Record Directory",
    description:
      "Global OBS state change: set OBS' recording directory as an opaque string without local filesystem checks.",
    category: CATEGORY,
    requiredObsRequests: [SetRecordDirectory.requestType],
    inputSchema: SetRecordDirectoryInput,
    outputSchema: SetRecordDirectoryOutput,
    handler: async (input, context) => setRecordDirectory(context.client, input)
  }),
  defineTool({
    name: "get_video_settings",
    title: "Get OBS Video Settings",
    description: "Return OBS base/output canvas dimensions and FPS numerator/denominator.",
    category: CATEGORY,
    requiredObsRequests: [GetVideoSettings.requestType],
    inputSchema: EmptyInput,
    outputSchema: VideoSettingsOutput,
    handler: async (_input, context) => getVideoSettings(context.client)
  }),
  defineTool({
    name: "set_video_settings",
    title: "Set OBS Video Settings",
    description:
      "Global OBS state change: set OBS video dimensions and FPS; base, output, and FPS fields must be paired.",
    category: CATEGORY,
    requiredObsRequests: [SetVideoSettings.requestType],
    inputSchema: SetVideoSettingsInput,
    outputSchema: SetVideoSettingsOutput,
    handler: async (input, context) => setVideoSettings(context.client, input)
  }),
  defineTool({
    name: "set_current_profile",
    title: "Set Current OBS Profile",
    description: "Global OBS state change: switch the current OBS profile to a non-empty existing profile name.",
    category: CATEGORY,
    requiredObsRequests: [SetCurrentProfile.requestType],
    inputSchema: ProfileNameInput,
    outputSchema: SetCurrentProfileOutput,
    handler: async (input, context) => setCurrentProfile(context.client, input)
  }),
  defineTool({
    name: "create_profile",
    title: "Create OBS Profile",
    description: "Global OBS state change: create a non-empty OBS profile name and switch OBS to that profile.",
    category: CATEGORY,
    requiredObsRequests: [CreateProfile.requestType],
    inputSchema: ProfileNameInput,
    outputSchema: CreateProfileOutput,
    handler: async (input, context) => createProfile(context.client, input)
  }),
  defineTool({
    name: "remove_profile",
    title: "Remove OBS Profile",
    description: "Global OBS state change: remove a non-empty OBS profile name; OBS may switch profiles first.",
    category: CATEGORY,
    requiredObsRequests: [RemoveProfile.requestType],
    inputSchema: ProfileNameInput,
    outputSchema: RemoveProfileOutput,
    handler: async (input, context) => removeProfile(context.client, input)
  }),
  defineTool({
    name: "set_current_scene_collection",
    title: "Set Current OBS Scene Collection",
    description: "Global OBS state change: switch the current OBS scene collection to a non-empty existing name.",
    category: CATEGORY,
    requiredObsRequests: [SetCurrentSceneCollection.requestType],
    inputSchema: SceneCollectionNameInput,
    outputSchema: SetCurrentSceneCollectionOutput,
    handler: async (input, context) => setCurrentSceneCollection(context.client, input)
  }),
  defineTool({
    name: "create_scene_collection",
    title: "Create OBS Scene Collection",
    description: "Global OBS state change: create a non-empty OBS scene collection name and switch OBS to it.",
    category: CATEGORY,
    requiredObsRequests: [CreateSceneCollection.requestType],
    inputSchema: SceneCollectionNameInput,
    outputSchema: CreateSceneCollectionOutput,
    handler: async (input, context) => createSceneCollection(context.client, input)
  }),
  defineTool({
    name: "set_profile_parameter",
    title: "Set OBS Profile Parameter",
    description: "Global OBS state change: set or delete a current profile parameter by category and name.",
    category: CATEGORY,
    requiredObsRequests: [SetProfileParameter.requestType],
    inputSchema: SetProfileParameterInput,
    outputSchema: SetProfileParameterOutput,
    handler: async (input, context) => setProfileParameter(context.client, input)
  })
]
