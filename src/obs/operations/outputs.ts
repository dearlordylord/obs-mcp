import { Schema } from "effect"

import { VirtualCamStatusOutput, VirtualCamSwitchOutput } from "../../domain/schemas/outputs.js"
import type { ObsClient } from "../client.js"
import { GetVirtualCamStatus, StartVirtualCam, StopVirtualCam, ToggleVirtualCam } from "../requests.js"
import { requestAndDecode, requestAndReturn } from "./shared.js"

export const getVirtualCamStatus = async (client: ObsClient): Promise<VirtualCamStatusOutput> => {
  return requestAndDecode(client, GetVirtualCamStatus, VirtualCamStatusOutput)
}

export const startVirtualCam = async (client: ObsClient): Promise<VirtualCamSwitchOutput> => {
  return requestAndReturn(client, StartVirtualCam, { outputActive: true, switched: true }, VirtualCamSwitchOutput)
}

export const stopVirtualCam = async (client: ObsClient): Promise<VirtualCamSwitchOutput> => {
  return requestAndReturn(client, StopVirtualCam, { outputActive: false, switched: true }, VirtualCamSwitchOutput)
}

export const toggleVirtualCam = async (client: ObsClient): Promise<VirtualCamSwitchOutput> => {
  const response = await client.request(ToggleVirtualCam)
  return Schema.decodeUnknownSync(VirtualCamSwitchOutput)({ ...response, switched: true })
}
