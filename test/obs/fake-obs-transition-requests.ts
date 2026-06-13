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

export class FakeObsTransitionState {
  private currentTransitionName: string
  private currentDuration: number | null | undefined
  private transitionCursor: number

  public constructor(
    private readonly transitions: ReadonlyArray<FakeObsTransition>,
    transitionCursor: number
  ) {
    this.currentTransitionName = transitions[0]?.transitionName ?? defaultCurrentTransition.transitionName
    this.currentDuration = transitions[0]?.transitionDuration
    this.transitionCursor = transitionCursor
  }

  public handleRequest(requestType: string, requestData: unknown, send: SendResponse): boolean {
    if (requestType === "GetTransitionKindList") {
      send({ transitionKinds: this.transitions.map((transition) => transition.transitionKind) })
      return true
    }
    if (requestType === "GetSceneTransitionList") {
      const current = this.currentTransition
      send({
        currentSceneTransitionName: current.transitionName,
        currentSceneTransitionUuid: current.transitionUuid ?? null,
        currentSceneTransitionKind: current.transitionKind,
        transitions: this.transitions
      })
      return true
    }
    if (requestType === "GetCurrentSceneTransition") {
      const current = this.currentTransition
      send({
        transitionName: current.transitionName,
        transitionUuid: current.transitionUuid ?? "transition-current",
        transitionKind: current.transitionKind,
        transitionFixed: current.transitionFixed ?? false,
        transitionDuration: this.currentDuration ?? current.transitionDuration ?? null,
        transitionConfigurable: current.transitionConfigurable ?? false,
        transitionSettings: current.transitionSettings ?? null
      })
      return true
    }
    if (requestType === "GetCurrentSceneTransitionCursor") {
      send({ transitionCursor: this.transitionCursor })
      return true
    }
    if (requestType === "SetCurrentSceneTransition") {
      this.currentTransitionName = requestDataField(
        requestData,
        "transitionName",
        defaultCurrentTransition.transitionName
      )
      this.currentDuration = this.currentTransition.transitionDuration
      send()
      return true
    }
    if (requestType === "SetCurrentSceneTransitionDuration") {
      this.currentDuration = numberRequestDataField(requestData, "transitionDuration")
      send()
      return true
    }
    if (requestType === "SetCurrentSceneTransitionSettings" || requestType === "TriggerStudioModeTransition") {
      send()
      return true
    }
    if (requestType === "SetTBarPosition") {
      this.transitionCursor = numberRequestDataField(requestData, "position")
      send()
      return true
    }
    return false
  }

  private get currentTransition(): FakeObsTransition {
    return this.transitions.find((transition) => transition.transitionName === this.currentTransitionName)
      ?? defaultCurrentTransition
  }
}

const requestDataField = (requestData: unknown, field: string, fallback: string): string => {
  const value = fieldValue(requestData, field)
  return typeof value === "string" ? value : fallback
}

const numberRequestDataField = (requestData: unknown, field: string): number => {
  const value = fieldValue(requestData, field)
  return typeof value === "number" ? value : 0
}

const fieldValue = (requestData: unknown, field: string): unknown =>
  typeof requestData === "object" && requestData !== null
    ? Object.entries(requestData).find(([key]) => key === field)?.[1]
    : undefined
