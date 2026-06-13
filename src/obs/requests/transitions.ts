import {
  RawCurrentSceneTransitionOutput,
  RawSceneTransitionListOutput,
  SceneTransitionCursorOutput,
  TransitionKindListOutput
} from "../../domain/schemas/transitions.js"
import { EmptyRequestData, type ObsRequestDescriptor } from "./shared.js"

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
