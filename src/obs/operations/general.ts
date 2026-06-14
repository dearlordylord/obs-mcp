import { Schema } from "effect"

import {
  HotkeyListOutput,
  ObsStatsOutput,
  RecordStatusOutput,
  TriggerHotkeyByKeySequenceInput,
  TriggerHotkeyByKeySequenceOutput,
  TriggerHotkeyByNameInput,
  TriggerHotkeyByNameOutput,
  VersionOutput
} from "../../domain/schemas/general.js"
import type { ObsClient } from "../client.js"
import {
  GetHotkeyList,
  GetRecordStatus,
  GetStats,
  GetVersion,
  TriggerHotkeyByKeySequence,
  TriggerHotkeyByName
} from "../requests.js"
import { withDefinedFields } from "./shared.js"

export const getVersion = async (client: ObsClient): Promise<VersionOutput> => {
  const response = await client.request(GetVersion)
  return Schema.decodeUnknownSync(VersionOutput)({
    ...response,
    negotiatedRpcVersion: client.negotiatedRpcVersion
  })
}

export const getObsStats = async (client: ObsClient): Promise<ObsStatsOutput> => {
  const response = await client.request(GetStats)
  return Schema.decodeUnknownSync(ObsStatsOutput)(response)
}

export const getRecordStatus = async (client: ObsClient): Promise<RecordStatusOutput> => {
  const response = await client.request(GetRecordStatus)
  return Schema.decodeUnknownSync(RecordStatusOutput)(response)
}

export const listHotkeys = async (client: ObsClient): Promise<HotkeyListOutput> =>
  Schema.decodeUnknownSync(HotkeyListOutput)(await client.request(GetHotkeyList))

export const triggerHotkeyByName = async (
  client: ObsClient,
  input: TriggerHotkeyByNameInput
): Promise<TriggerHotkeyByNameOutput> => {
  const decodedInput = Schema.decodeUnknownSync(TriggerHotkeyByNameInput)(input)
  await client.request(TriggerHotkeyByName, decodedInput)
  return Schema.decodeUnknownSync(TriggerHotkeyByNameOutput)({
    hotkeyName: decodedInput.hotkeyName,
    ...withDefinedFields({ contextName: decodedInput.contextName }),
    triggered: true
  })
}

export const triggerHotkeyByKeySequence = async (
  client: ObsClient,
  input: TriggerHotkeyByKeySequenceInput
): Promise<TriggerHotkeyByKeySequenceOutput> => {
  const decodedInput = Schema.decodeUnknownSync(TriggerHotkeyByKeySequenceInput)(input)
  await client.request(TriggerHotkeyByKeySequence, decodedInput)
  return Schema.decodeUnknownSync(TriggerHotkeyByKeySequenceOutput)({
    ...withDefinedFields({
      keyId: decodedInput.keyId,
      keyModifiers: decodedInput.keyModifiers
    }),
    triggered: true
  })
}
