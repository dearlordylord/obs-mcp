import { Schema } from "effect"

import {
  CurrentSceneTransitionOutput,
  SceneTransitionCursorOutput,
  SceneTransitionListOutput,
  TransitionKindListOutput
} from "../../domain/schemas/transitions.js"
import type { ObsClient } from "../client.js"
import {
  GetCurrentSceneTransition,
  GetCurrentSceneTransitionCursor,
  GetSceneTransitionList,
  GetTransitionKindList
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
