import {
  MonitorListOutput,
  OpenInputFiltersDialogInput,
  OpenInputFiltersDialogOutput,
  OpenInputInteractDialogInput,
  OpenInputInteractDialogOutput,
  OpenInputPropertiesDialogInput,
  OpenInputPropertiesDialogOutput,
  OpenSourceProjectorInput,
  OpenSourceProjectorOutput,
  OpenVideoMixProjectorInput,
  OpenVideoMixProjectorOutput,
  StudioModeEnabledOutput
} from "../../domain/schemas/index.js"
import { EmptyInput } from "../../domain/schemas/shared.js"
import {
  getStudioModeEnabled,
  listMonitors,
  openInputFiltersDialog,
  openInputInteractDialog,
  openInputPropertiesDialog,
  openSourceProjector,
  openVideoMixProjector
} from "../../obs/operations/ui.js"
import {
  GetMonitorList,
  GetStudioModeEnabled,
  OpenInputFiltersDialog,
  OpenInputInteractDialog,
  OpenInputPropertiesDialog,
  OpenSourceProjector,
  OpenVideoMixProjector
} from "../../obs/requests.js"
import { defineTool, type ToolDefinition } from "./mechanics.js"

const CATEGORY = "ui" as const

export const uiTools: ReadonlyArray<ToolDefinition> = [
  defineTool({
    name: "get_studio_mode_enabled",
    title: "Get OBS Studio Mode",
    description: "Return whether OBS studio mode is enabled.",
    category: CATEGORY,
    requiredObsRequests: [GetStudioModeEnabled.requestType],
    inputSchema: EmptyInput,
    outputSchema: StudioModeEnabledOutput,
    handler: async (_input, context) => getStudioModeEnabled(context.client)
  }),
  defineTool({
    name: "open_input_properties_dialog",
    title: "Open OBS Input Properties Dialog",
    description: "Local OBS UI side effect: open the properties dialog for an input by name or UUID.",
    category: CATEGORY,
    requiredObsRequests: [OpenInputPropertiesDialog.requestType],
    inputSchema: OpenInputPropertiesDialogInput,
    outputSchema: OpenInputPropertiesDialogOutput,
    handler: async (input, context) => openInputPropertiesDialog(context.client, input)
  }),
  defineTool({
    name: "open_input_filters_dialog",
    title: "Open OBS Input Filters Dialog",
    description: "Local OBS UI side effect: open the filters dialog for an input by name or UUID.",
    category: CATEGORY,
    requiredObsRequests: [OpenInputFiltersDialog.requestType],
    inputSchema: OpenInputFiltersDialogInput,
    outputSchema: OpenInputFiltersDialogOutput,
    handler: async (input, context) => openInputFiltersDialog(context.client, input)
  }),
  defineTool({
    name: "open_input_interact_dialog",
    title: "Open OBS Input Interact Dialog",
    description: "Local OBS UI side effect: open the interact dialog for an input by name or UUID.",
    category: CATEGORY,
    requiredObsRequests: [OpenInputInteractDialog.requestType],
    inputSchema: OpenInputInteractDialogInput,
    outputSchema: OpenInputInteractDialogOutput,
    handler: async (input, context) => openInputInteractDialog(context.client, input)
  }),
  defineTool({
    name: "list_monitors",
    title: "List OBS Monitors",
    description: "Return OBS monitor summaries for choosing local projector targets.",
    category: CATEGORY,
    requiredObsRequests: [GetMonitorList.requestType],
    inputSchema: EmptyInput,
    outputSchema: MonitorListOutput,
    handler: async (_input, context) => listMonitors(context.client)
  }),
  defineTool({
    name: "open_video_mix_projector",
    title: "Open OBS Video Mix Projector",
    description: "Local OBS UI side effect: open a preview, program, or multiview projector.",
    category: CATEGORY,
    requiredObsRequests: [OpenVideoMixProjector.requestType],
    inputSchema: OpenVideoMixProjectorInput,
    outputSchema: OpenVideoMixProjectorOutput,
    handler: async (input, context) => openVideoMixProjector(context.client, input)
  }),
  defineTool({
    name: "open_source_projector",
    title: "Open OBS Source Projector",
    description: "Local OBS UI side effect: open a projector for a source by name or UUID.",
    category: CATEGORY,
    requiredObsRequests: [OpenSourceProjector.requestType],
    inputSchema: OpenSourceProjectorInput,
    outputSchema: OpenSourceProjectorOutput,
    handler: async (input, context) => openSourceProjector(context.client, input)
  })
]
