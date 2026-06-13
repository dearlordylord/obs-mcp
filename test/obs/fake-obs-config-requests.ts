import type { FakeObsProfileParameter } from "./fake-obs-fixtures.js"

type SendResponse = (responseData?: Record<string, unknown>) => void

export interface FakeObsConfigStateOptions {
  readonly profiles: ReadonlyArray<string>
  readonly currentProfileName: string
  readonly sceneCollections: ReadonlyArray<string>
  readonly currentSceneCollectionName: string
  readonly profileParameters: ReadonlyArray<FakeObsProfileParameter>
  readonly recordDirectory: string
}

export class FakeObsConfigState {
  public constructor(private readonly options: FakeObsConfigStateOptions) {}

  public handleRequest(requestType: string, requestData: unknown, send: SendResponse): boolean {
    if (requestType === "GetProfileList") {
      send({
        currentProfileName: this.options.currentProfileName,
        profiles: this.options.profiles
      })
      return true
    }
    if (requestType === "GetSceneCollectionList") {
      send({
        currentSceneCollectionName: this.options.currentSceneCollectionName,
        sceneCollections: this.options.sceneCollections
      })
      return true
    }
    if (requestType === "GetProfileParameter") {
      const parameter = this.options.profileParameters.find((entry) =>
        entry.parameterCategory === stringField(requestData, "parameterCategory")
        && entry.parameterName === stringField(requestData, "parameterName")
      )
      send({
        parameterValue: parameter?.parameterValue ?? null,
        defaultParameterValue: parameter?.defaultParameterValue ?? null
      })
      return true
    }
    if (requestType === "GetRecordDirectory") {
      send({ recordDirectory: this.options.recordDirectory })
      return true
    }
    return false
  }
}

const stringField = (requestData: unknown, field: string): string | undefined => {
  const value = typeof requestData === "object" && requestData !== null
    ? Object.entries(requestData).find(([key]) => key === field)?.[1]
    : undefined
  return typeof value === "string" ? value : undefined
}
