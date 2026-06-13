import { batchTools } from "./batch.js"
import { eventTools } from "./events.js"
import { generalTools } from "./general.js"
import { inputTools } from "./inputs.js"
import { filterEnabledTools, type ToolDefinition } from "./mechanics.js"
import { outputTools } from "./outputs.js"
import { persistentDataTools } from "./persistent-data.js"
import { recordTools } from "./record.js"
import { sceneTools } from "./scenes.js"
import { streamTools } from "./stream.js"
import { vendorTools } from "./vendor.js"

export const allTools: ReadonlyArray<ToolDefinition> = [
  ...batchTools,
  ...generalTools,
  ...eventTools,
  ...sceneTools,
  ...inputTools,
  ...outputTools,
  ...recordTools,
  ...streamTools,
  ...persistentDataTools,
  ...vendorTools
]

export const getEnabledTools = (
  enabledToolsets: ReadonlyArray<string>,
  availableRequests?: ReadonlyArray<string>
): ReadonlyArray<ToolDefinition> => filterEnabledTools(allTools, enabledToolsets, availableRequests)

export { executeTool } from "./mechanics.js"
