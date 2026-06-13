import { canvasTools } from "./canvases.js"
import { eventTools } from "./events.js"
import { generalTools } from "./general.js"
import { inputTools } from "./inputs.js"
import { filterEnabledTools, type ToolDefinition } from "./mechanics.js"
import { outputTools } from "./outputs.js"
import { recordTools } from "./record.js"
import { sceneTools } from "./scenes.js"
import { streamTools } from "./stream.js"
import { transitionTools } from "./transitions.js"
import { uiTools } from "./ui.js"

export const allTools: ReadonlyArray<ToolDefinition> = [
  ...generalTools,
  ...eventTools,
  ...canvasTools,
  ...sceneTools,
  ...inputTools,
  ...outputTools,
  ...recordTools,
  ...streamTools,
  ...transitionTools,
  ...uiTools
]

export const getEnabledTools = (
  enabledToolsets: ReadonlyArray<string>,
  availableRequests?: ReadonlyArray<string>
): ReadonlyArray<ToolDefinition> => filterEnabledTools(allTools, enabledToolsets, availableRequests)

export { executeTool } from "./mechanics.js"
