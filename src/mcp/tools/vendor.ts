import {
  BroadcastCustomEventInput,
  BroadcastCustomEventOutput,
  CallVendorRequestInput,
  CallVendorRequestOutput
} from "../../domain/schemas/index.js"
import { broadcastCustomEvent, callVendorRequest } from "../../obs/operations/vendor.js"
import { defineTool, type ToolDefinition } from "./mechanics.js"

const CATEGORY = "vendor" as const

export const vendorTools: ReadonlyArray<ToolDefinition> = [
  defineTool({
    name: "call_vendor_request",
    title: "Call OBS Vendor Request",
    description:
      "Call a vendor/plugin OBS websocket request with JSON-safe data. Exposed only by the vendor toolset; plugin-defined behavior and provenance are security-sensitive.",
    category: CATEGORY,
    requiredObsRequests: ["CallVendorRequest"],
    inputSchema: CallVendorRequestInput,
    outputSchema: CallVendorRequestOutput,
    handler: async (input, context) => callVendorRequest(context.client, input)
  }),
  defineTool({
    name: "broadcast_custom_event",
    title: "Broadcast OBS Custom Event",
    description:
      "Broadcast a JSON-safe custom OBS websocket event. Exposed only by the vendor toolset; downstream consumers and provenance are security-sensitive.",
    category: CATEGORY,
    requiredObsRequests: ["BroadcastCustomEvent"],
    inputSchema: BroadcastCustomEventInput,
    outputSchema: BroadcastCustomEventOutput,
    handler: async (input, context) => broadcastCustomEvent(context.client, input)
  })
]
