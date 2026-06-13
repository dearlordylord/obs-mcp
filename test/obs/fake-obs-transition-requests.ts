import type { FakeObsTransition } from "./fake-obs-fixtures.js"

type SendResponse = (responseData?: Record<string, unknown>) => void

const defaultCurrentTransition = {
  transitionName: "Cut",
  transitionUuid: "transition-cut",
  transitionKind: "cut_transition",
  transitionFixed: true,
  transitionDuration: null,
  transitionConfigurable: false,
  transitionSettings: null
} satisfies FakeObsTransition

export const handleFakeObsTransitionRequest = (
  transitions: ReadonlyArray<FakeObsTransition>,
  transitionCursor: number,
  requestType: string,
  send: SendResponse
): boolean => {
  if (requestType === "GetTransitionKindList") {
    send({ transitionKinds: transitions.map((transition) => transition.transitionKind) })
    return true
  }
  if (requestType === "GetSceneTransitionList") {
    const current = transitions[0]
    send({
      currentSceneTransitionName: current?.transitionName ?? null,
      currentSceneTransitionUuid: current?.transitionUuid ?? null,
      currentSceneTransitionKind: current?.transitionKind ?? null,
      transitions
    })
    return true
  }
  if (requestType === "GetCurrentSceneTransition") {
    const current = transitions[0] ?? defaultCurrentTransition
    send({
      transitionName: current.transitionName,
      transitionUuid: current.transitionUuid ?? "transition-current",
      transitionKind: current.transitionKind,
      transitionFixed: current.transitionFixed ?? false,
      transitionDuration: current.transitionDuration ?? null,
      transitionConfigurable: current.transitionConfigurable ?? false,
      transitionSettings: current.transitionSettings ?? null
    })
    return true
  }
  if (requestType === "GetCurrentSceneTransitionCursor") {
    send({ transitionCursor })
    return true
  }
  return false
}
