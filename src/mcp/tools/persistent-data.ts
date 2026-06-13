import {
  GetPersistentDataOutput,
  PersistentDataLocatorInput,
  SetPersistentDataInput,
  SetPersistentDataOutput
} from "../../domain/schemas/index.js"
import { getPersistentData, setPersistentData } from "../../obs/operations/persistent-data.js"
import { defineTool, type ToolDefinition } from "./mechanics.js"

const CATEGORY = "admin_raw" as const

export const persistentDataTools: ReadonlyArray<ToolDefinition> = [
  defineTool({
    name: "get_persistent_data",
    title: "Get OBS Persistent Data",
    description: "Read an OBS websocket persistent data slot. Exposed only by the admin_raw toolset.",
    category: CATEGORY,
    requiredObsRequests: ["GetPersistentData"],
    inputSchema: PersistentDataLocatorInput,
    outputSchema: GetPersistentDataOutput,
    handler: async (input, context) => getPersistentData(context.client, input)
  }),
  defineTool({
    name: "set_persistent_data",
    title: "Set OBS Persistent Data",
    description: "Write a JSON-safe OBS websocket persistent data slot. Exposed only by the admin_raw toolset.",
    category: CATEGORY,
    requiredObsRequests: ["SetPersistentData"],
    inputSchema: SetPersistentDataInput,
    outputSchema: SetPersistentDataOutput,
    handler: async (input, context) => setPersistentData(context.client, input)
  })
]
