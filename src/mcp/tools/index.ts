import { batchTools } from "./batch.js"
import { canvasTools } from "./canvases.js"
import { configTools } from "./config.js"
import { eventTools } from "./events.js"
import { filterTools } from "./filters.js"
import { generalTools } from "./general.js"
import { inputTools } from "./inputs.js"
import { filterEnabledTools, type ToolDefinition } from "./mechanics.js"
import { outputTools } from "./outputs.js"
import { persistentDataTools } from "./persistent-data.js"
import { recordTools } from "./record.js"
import { sceneTools } from "./scenes.js"
import { screenshotTools } from "./screenshots.js"
import { streamTools } from "./stream.js"
import { transitionTools } from "./transitions.js"
import { uiTools } from "./ui.js"
import { vendorTools } from "./vendor.js"

export const allTools: ReadonlyArray<ToolDefinition> = [
  ...batchTools,
  ...generalTools,
  ...eventTools,
  ...canvasTools,
  ...configTools,
  ...sceneTools,
  ...screenshotTools,
  ...filterTools,
  ...inputTools,
  ...outputTools,
  ...recordTools,
  ...streamTools,
  ...transitionTools,
  ...uiTools,
  ...persistentDataTools,
  ...vendorTools
]

export const getEnabledTools = (
  enabledToolsets: ReadonlyArray<string>,
  availableRequests?: ReadonlyArray<string>
): ReadonlyArray<ToolDefinition> => filterEnabledTools(allTools, enabledToolsets, availableRequests)

export { executeTool } from "./mechanics.js"
