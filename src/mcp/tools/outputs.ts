import { VirtualCamStatusOutput, VirtualCamSwitchOutput } from "../../domain/schemas/index.js"
import { EmptyInput } from "../../domain/schemas/shared.js"
import { getVirtualCamStatus, startVirtualCam, stopVirtualCam, toggleVirtualCam } from "../../obs/operations/outputs.js"
import { GetVirtualCamStatus, StartVirtualCam, StopVirtualCam, ToggleVirtualCam } from "../../obs/requests.js"
import { defineTool, type ToolDefinition } from "./mechanics.js"

const CATEGORY = "outputs" as const

export const outputTools: ReadonlyArray<ToolDefinition> = [
  defineTool({
    name: "get_virtual_cam_status",
    title: "Get OBS Virtual Camera Status",
    description: "Return whether OBS virtual camera output is active.",
    category: CATEGORY,
    requiredObsRequests: [GetVirtualCamStatus.requestType],
    inputSchema: EmptyInput,
    outputSchema: VirtualCamStatusOutput,
    handler: async (_input, context) => getVirtualCamStatus(context.client)
  }),
  defineTool({
    name: "start_virtual_cam",
    title: "Start OBS Virtual Camera",
    description: "Start the OBS virtual camera output.",
    category: CATEGORY,
    requiredObsRequests: [StartVirtualCam.requestType],
    inputSchema: EmptyInput,
    outputSchema: VirtualCamSwitchOutput,
    handler: async (_input, context) => startVirtualCam(context.client)
  }),
  defineTool({
    name: "stop_virtual_cam",
    title: "Stop OBS Virtual Camera",
    description: "Stop the OBS virtual camera output.",
    category: CATEGORY,
    requiredObsRequests: [StopVirtualCam.requestType],
    inputSchema: EmptyInput,
    outputSchema: VirtualCamSwitchOutput,
    handler: async (_input, context) => stopVirtualCam(context.client)
  }),
  defineTool({
    name: "toggle_virtual_cam",
    title: "Toggle OBS Virtual Camera",
    description: "Toggle the OBS virtual camera output and return the resulting activity state.",
    category: CATEGORY,
    requiredObsRequests: [ToggleVirtualCam.requestType],
    inputSchema: EmptyInput,
    outputSchema: VirtualCamSwitchOutput,
    handler: async (_input, context) => toggleVirtualCam(context.client)
  })
]
