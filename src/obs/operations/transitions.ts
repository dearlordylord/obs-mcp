import { Schema } from "effect"

import type { TriggerStudioModeTransitionOutput } from "../../domain/schemas/transitions.js"
import {
  CurrentSceneTransitionOutput,
  SceneTransitionCursorOutput,
  SceneTransitionListOutput,
  SetCurrentSceneTransitionDurationInput,
  SetCurrentSceneTransitionDurationOutput,
  SetCurrentSceneTransitionInput,
  SetCurrentSceneTransitionOutput,
  SetCurrentSceneTransitionSettingsInput,
  SetCurrentSceneTransitionSettingsOutput,
  SetTBarPositionInput,
  SetTBarPositionOutput,
  TransitionKindListOutput
} from "../../domain/schemas/transitions.js"
import type { ObsClient } from "../client.js"
import {
  GetCurrentSceneTransition,
  GetCurrentSceneTransitionCursor,
  GetSceneTransitionList,
  GetTransitionKindList,
  SetCurrentSceneTransition,
  SetCurrentSceneTransitionDuration,
  SetCurrentSceneTransitionSettings,
  SetTBarPosition,
  TriggerStudioModeTransition
} from "../requests.js"

const stringField = (transition: Readonly<Record<string, unknown>>, field: string): string | undefined =>
  typeof transition[field] === "string" ? transition[field] : undefined

const booleanField = (transition: Readonly<Record<string, unknown>>, field: string): boolean | undefined =>
  typeof transition[field] === "boolean" ? transition[field] : undefined

const durationField = (transition: Readonly<Record<string, unknown>>): number | null | undefined =>
  transition["transitionDuration"] === null
    ? null
    : typeof transition["transitionDuration"] === "number"
    ? transition["transitionDuration"]
    : undefined

export const listTransitionKinds = async (client: ObsClient): Promise<TransitionKindListOutput> =>
  Schema.decodeUnknownSync(TransitionKindListOutput)(await client.request(GetTransitionKindList))

export const listSceneTransitions = async (client: ObsClient): Promise<SceneTransitionListOutput> => {
  const response = await client.request(GetSceneTransitionList)
  return Schema.decodeUnknownSync(SceneTransitionListOutput)({
    currentSceneTransitionName: response.currentSceneTransitionName,
    currentSceneTransitionUuid: response.currentSceneTransitionUuid,
    currentSceneTransitionKind: response.currentSceneTransitionKind,
    transitions: response.transitions.map((transition) => ({
      ...(stringField(transition, "transitionName") === undefined
        ? {}
        : { transitionName: stringField(transition, "transitionName") }),
      ...(stringField(transition, "transitionUuid") === undefined
        ? {}
        : { transitionUuid: stringField(transition, "transitionUuid") }),
      ...(stringField(transition, "transitionKind") === undefined
        ? {}
        : { transitionKind: stringField(transition, "transitionKind") }),
      ...(booleanField(transition, "transitionFixed") === undefined
        ? {}
        : { transitionFixed: booleanField(transition, "transitionFixed") }),
      ...(durationField(transition) === undefined ? {} : { transitionDuration: durationField(transition) })
    }))
  })
}

export const getCurrentSceneTransition = async (client: ObsClient): Promise<CurrentSceneTransitionOutput> => {
  const response = await client.request(GetCurrentSceneTransition)
  return Schema.decodeUnknownSync(CurrentSceneTransitionOutput)({
    transitionName: response.transitionName,
    transitionUuid: response.transitionUuid,
    transitionKind: response.transitionKind,
    transitionFixed: response.transitionFixed,
    transitionDuration: response.transitionDuration,
    transitionConfigurable: response.transitionConfigurable
  })
}

export const getCurrentSceneTransitionCursor = async (client: ObsClient): Promise<SceneTransitionCursorOutput> =>
  Schema.decodeUnknownSync(SceneTransitionCursorOutput)(await client.request(GetCurrentSceneTransitionCursor))

export const setCurrentSceneTransition = async (
  client: ObsClient,
  input: SetCurrentSceneTransitionInput
): Promise<SetCurrentSceneTransitionOutput> => {
  const decodedInput = Schema.decodeUnknownSync(SetCurrentSceneTransitionInput)(input)
  await client.request(SetCurrentSceneTransition, decodedInput)
  return Schema.decodeUnknownSync(SetCurrentSceneTransitionOutput)({
    transitionName: decodedInput.transitionName,
    switched: true
  })
}

export const setCurrentSceneTransitionDuration = async (
  client: ObsClient,
  input: SetCurrentSceneTransitionDurationInput
): Promise<SetCurrentSceneTransitionDurationOutput> => {
  const decodedInput = Schema.decodeUnknownSync(SetCurrentSceneTransitionDurationInput)(input)
  await client.request(SetCurrentSceneTransitionDuration, decodedInput)
  return Schema.decodeUnknownSync(SetCurrentSceneTransitionDurationOutput)({
    transitionDuration: decodedInput.transitionDuration,
    acknowledged: true
  })
}

export const setCurrentSceneTransitionSettings = async (
  client: ObsClient,
  input: SetCurrentSceneTransitionSettingsInput
): Promise<SetCurrentSceneTransitionSettingsOutput> => {
  const decodedInput = Schema.decodeUnknownSync(SetCurrentSceneTransitionSettingsInput)(input)
  await client.request(SetCurrentSceneTransitionSettings, decodedInput)
  return Schema.decodeUnknownSync(SetCurrentSceneTransitionSettingsOutput)({
    overlay: decodedInput.overlay,
    settingsFieldCount: Object.keys(decodedInput.transitionSettings).length,
    acknowledged: true
  })
}

export const triggerStudioModeTransition = async (
  client: ObsClient
): Promise<TriggerStudioModeTransitionOutput> => {
  await client.request(TriggerStudioModeTransition)
  return { requestType: "TriggerStudioModeTransition", acknowledged: true }
}

export const setTBarPosition = async (
  client: ObsClient,
  input: SetTBarPositionInput
): Promise<SetTBarPositionOutput> => {
  const decodedInput = Schema.decodeUnknownSync(SetTBarPositionInput)(input)
  await client.request(SetTBarPosition, decodedInput)
  return Schema.decodeUnknownSync(SetTBarPositionOutput)({
    position: decodedInput.position,
    release: decodedInput.release,
    acknowledged: true
  })
}
