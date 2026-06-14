import { Schema } from "effect"

import {
  MonitorListOutput,
  OpenInputFiltersDialogInput,
  OpenInputInteractDialogInput,
  OpenInputPropertiesDialogInput,
  OpenSourceProjectorInput,
  OpenVideoMixProjectorInput,
  RawMonitorListOutput,
  SetStudioModeEnabledInput,
  StudioModeEnabledOutput
} from "../../domain/schemas/ui.js"
import type {
  OpenInputFiltersDialogOutput,
  OpenInputInteractDialogOutput,
  OpenInputPropertiesDialogOutput,
  OpenSourceProjectorOutput,
  OpenVideoMixProjectorOutput,
  SetStudioModeEnabledOutput
} from "../../domain/schemas/ui.js"
import type { ObsClient } from "../client.js"
import {
  GetMonitorList,
  GetStudioModeEnabled,
  OpenInputFiltersDialog,
  OpenInputInteractDialog,
  OpenInputPropertiesDialog,
  OpenSourceProjector,
  OpenVideoMixProjector,
  SetStudioModeEnabled
} from "../requests.js"

export const getStudioModeEnabled = async (client: ObsClient): Promise<StudioModeEnabledOutput> =>
  Schema.decodeUnknownSync(StudioModeEnabledOutput)(await client.request(GetStudioModeEnabled))

export const setStudioModeEnabled = async (
  client: ObsClient,
  input: SetStudioModeEnabledInput
): Promise<SetStudioModeEnabledOutput> => {
  const decodedInput = Schema.decodeUnknownSync(SetStudioModeEnabledInput)(input)
  await client.request(SetStudioModeEnabled, decodedInput)
  return { requestType: "SetStudioModeEnabled", acknowledged: true }
}

export const openInputPropertiesDialog = async (
  client: ObsClient,
  input: OpenInputPropertiesDialogInput
): Promise<OpenInputPropertiesDialogOutput> => {
  const decodedInput = Schema.decodeUnknownSync(OpenInputPropertiesDialogInput)(input)
  await client.request(OpenInputPropertiesDialog, decodedInput)
  return { requestType: "OpenInputPropertiesDialog", acknowledged: true }
}

export const openInputFiltersDialog = async (
  client: ObsClient,
  input: OpenInputFiltersDialogInput
): Promise<OpenInputFiltersDialogOutput> => {
  const decodedInput = Schema.decodeUnknownSync(OpenInputFiltersDialogInput)(input)
  await client.request(OpenInputFiltersDialog, decodedInput)
  return { requestType: "OpenInputFiltersDialog", acknowledged: true }
}

export const openInputInteractDialog = async (
  client: ObsClient,
  input: OpenInputInteractDialogInput
): Promise<OpenInputInteractDialogOutput> => {
  const decodedInput = Schema.decodeUnknownSync(OpenInputInteractDialogInput)(input)
  await client.request(OpenInputInteractDialog, decodedInput)
  return { requestType: "OpenInputInteractDialog", acknowledged: true }
}

export const listMonitors = async (client: ObsClient): Promise<MonitorListOutput> => {
  const response = Schema.decodeUnknownSync(RawMonitorListOutput)(await client.request(GetMonitorList))
  return Schema.decodeUnknownSync(MonitorListOutput)({
    monitors: response.monitors.flatMap(summarizeMonitor)
  })
}

export const openVideoMixProjector = async (
  client: ObsClient,
  input: OpenVideoMixProjectorInput
): Promise<OpenVideoMixProjectorOutput> => {
  const decodedInput = Schema.decodeUnknownSync(OpenVideoMixProjectorInput)(input)
  await client.request(OpenVideoMixProjector, decodedInput)
  return { requestType: "OpenVideoMixProjector", acknowledged: true }
}

export const openSourceProjector = async (
  client: ObsClient,
  input: OpenSourceProjectorInput
): Promise<OpenSourceProjectorOutput> => {
  const decodedInput = Schema.decodeUnknownSync(OpenSourceProjectorInput)(input)
  await client.request(OpenSourceProjector, decodedInput)
  return { requestType: "OpenSourceProjector", acknowledged: true }
}

const summarizeMonitor = (monitor: Record<string, unknown>): Array<MonitorListOutput["monitors"][number]> => {
  const monitorIndex = numberField(monitor, "monitorIndex")
  if (monitorIndex === undefined) {
    return []
  }
  return [{
    monitorIndex,
    ...optionalStringField(monitor, "monitorName"),
    ...optionalNumberField(monitor, "monitorWidth"),
    ...optionalNumberField(monitor, "monitorHeight"),
    ...optionalNumberField(monitor, "monitorPositionX"),
    ...optionalNumberField(monitor, "monitorPositionY")
  }]
}

const numberField = (record: Record<string, unknown>, field: string): number | undefined => {
  const value = record[field]
  return typeof value === "number" ? value : undefined
}

const optionalNumberField = (record: Record<string, unknown>, field: string): Record<string, number> => {
  const value = numberField(record, field)
  return value === undefined ? {} : { [field]: value }
}

const optionalStringField = (record: Record<string, unknown>, field: string): Record<string, string> => {
  const value = record[field]
  return typeof value === "string" ? { [field]: value } : {}
}
