import { Schema } from "effect"
import {
  RawCurrentSceneTransitionOutput,
  RawSceneTransitionListOutput,
  SceneTransitionCursorOutput,
  SetCurrentSceneTransitionDurationInput,
  SetCurrentSceneTransitionInput,
  SetCurrentSceneTransitionSettingsInput,
  SetTBarPositionInput,
  TransitionKindListOutput
} from "../../domain/schemas/transitions.js"
import { EmptyRequestData, type ObsRequestDescriptor } from "./shared.js"

const EmptyResponseData = Schema.Struct({})

export const GetTransitionKindList = {
  requestType: "GetTransitionKindList",
  requestDataSchema: EmptyRequestData,
  responseSchema: TransitionKindListOutput
} satisfies ObsRequestDescriptor<TransitionKindListOutput>

export const GetSceneTransitionList = {
  requestType: "GetSceneTransitionList",
  requestDataSchema: EmptyRequestData,
  responseSchema: RawSceneTransitionListOutput
} satisfies ObsRequestDescriptor<RawSceneTransitionListOutput>

export const GetCurrentSceneTransition = {
  requestType: "GetCurrentSceneTransition",
  requestDataSchema: EmptyRequestData,
  responseSchema: RawCurrentSceneTransitionOutput
} satisfies ObsRequestDescriptor<RawCurrentSceneTransitionOutput>

export const GetCurrentSceneTransitionCursor = {
  requestType: "GetCurrentSceneTransitionCursor",
  requestDataSchema: EmptyRequestData,
  responseSchema: SceneTransitionCursorOutput
} satisfies ObsRequestDescriptor<SceneTransitionCursorOutput>

export const SetCurrentSceneTransition = {
  requestType: "SetCurrentSceneTransition",
  requestDataSchema: SetCurrentSceneTransitionInput,
  responseSchema: EmptyResponseData
} satisfies ObsRequestDescriptor<typeof EmptyResponseData.Type>

export const SetCurrentSceneTransitionDuration = {
  requestType: "SetCurrentSceneTransitionDuration",
  requestDataSchema: SetCurrentSceneTransitionDurationInput,
  responseSchema: EmptyResponseData
} satisfies ObsRequestDescriptor<typeof EmptyResponseData.Type>

export const SetCurrentSceneTransitionSettings = {
  requestType: "SetCurrentSceneTransitionSettings",
  requestDataSchema: SetCurrentSceneTransitionSettingsInput,
  responseSchema: EmptyResponseData
} satisfies ObsRequestDescriptor<typeof EmptyResponseData.Type>

export const TriggerStudioModeTransition = {
  requestType: "TriggerStudioModeTransition",
  requestDataSchema: EmptyRequestData,
  responseSchema: EmptyResponseData
} satisfies ObsRequestDescriptor<typeof EmptyResponseData.Type>

export const SetTBarPosition = {
  requestType: "SetTBarPosition",
  requestDataSchema: SetTBarPositionInput,
  responseSchema: EmptyResponseData
} satisfies ObsRequestDescriptor<typeof EmptyResponseData.Type>
