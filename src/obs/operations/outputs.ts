import { Schema } from "effect"

import { VirtualCamStatusOutput, VirtualCamSwitchOutput } from "../../domain/schemas/outputs.js"
import type { ObsClient } from "../client.js"
import { GetVirtualCamStatus, StartVirtualCam, StopVirtualCam, ToggleVirtualCam } from "../requests.js"

export const getVirtualCamStatus = async (client: ObsClient): Promise<VirtualCamStatusOutput> => {
  const response = await client.request(GetVirtualCamStatus)
  return Schema.decodeUnknownSync(VirtualCamStatusOutput)(response)
}

export const startVirtualCam = async (client: ObsClient): Promise<VirtualCamSwitchOutput> => {
  await client.request(StartVirtualCam)
  return Schema.decodeUnknownSync(VirtualCamSwitchOutput)({ outputActive: true, switched: true })
}

export const stopVirtualCam = async (client: ObsClient): Promise<VirtualCamSwitchOutput> => {
  await client.request(StopVirtualCam)
  return Schema.decodeUnknownSync(VirtualCamSwitchOutput)({ outputActive: false, switched: true })
}

export const toggleVirtualCam = async (client: ObsClient): Promise<VirtualCamSwitchOutput> => {
  const response = await client.request(ToggleVirtualCam)
  return Schema.decodeUnknownSync(VirtualCamSwitchOutput)({ ...response, switched: true })
}
