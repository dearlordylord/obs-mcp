import { eventTools } from "./events.js"
import { filterTools } from "./filters.js"
import { generalTools } from "./general.js"
import { inputTools } from "./inputs.js"
import { filterEnabledTools, type ToolDefinition } from "./mechanics.js"
import { outputTools } from "./outputs.js"
import { recordTools } from "./record.js"
import { sceneTools } from "./scenes.js"
import { screenshotTools } from "./screenshots.js"
import { streamTools } from "./stream.js"

export const allTools: ReadonlyArray<ToolDefinition> = [
  ...generalTools,
  ...eventTools,
  ...sceneTools,
  ...screenshotTools,
  ...filterTools,
  ...inputTools,
  ...outputTools,
  ...recordTools,
  ...streamTools
]

export const getEnabledTools = (
  enabledToolsets: ReadonlyArray<string>,
  availableRequests?: ReadonlyArray<string>
): ReadonlyArray<ToolDefinition> => filterEnabledTools(allTools, enabledToolsets, availableRequests)

export { executeTool } from "./mechanics.js"
