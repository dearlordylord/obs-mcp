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
  private profiles: Array<string>
  private currentProfileName: string
  private sceneCollections: Array<string>
  private currentSceneCollectionName: string
  private profileParameters: Array<FakeObsProfileParameter>

  public constructor(private readonly options: FakeObsConfigStateOptions) {
    this.profiles = [...options.profiles]
    this.currentProfileName = options.currentProfileName
    this.sceneCollections = [...options.sceneCollections]
    this.currentSceneCollectionName = options.currentSceneCollectionName
    this.profileParameters = [...options.profileParameters]
  }

  public handleRequest(requestType: string, requestData: unknown, send: SendResponse): boolean {
    if (requestType === "GetProfileList") {
      send({
        currentProfileName: this.currentProfileName,
        profiles: this.profiles
      })
      return true
    }
    if (requestType === "GetSceneCollectionList") {
      send({
        currentSceneCollectionName: this.currentSceneCollectionName,
        sceneCollections: this.sceneCollections
      })
      return true
    }
    if (requestType === "GetProfileParameter") {
      const parameter = this.profileParameters.find((entry) =>
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
    if (requestType === "SetCurrentProfile") {
      this.currentProfileName = stringField(requestData, "profileName") ?? this.currentProfileName
      send({})
      return true
    }
    if (requestType === "CreateProfile") {
      const profileName = stringField(requestData, "profileName")
      if (profileName !== undefined && !this.profiles.includes(profileName)) {
        this.profiles = [...this.profiles, profileName]
      }
      this.currentProfileName = profileName ?? this.currentProfileName
      send({})
      return true
    }
    if (requestType === "RemoveProfile") {
      const profileName = stringField(requestData, "profileName")
      this.profiles = this.profiles.filter((entry) => entry !== profileName)
      if (this.currentProfileName === profileName) {
        this.currentProfileName = this.profiles[0] ?? ""
      }
      send({})
      return true
    }
    if (requestType === "SetCurrentSceneCollection") {
      this.currentSceneCollectionName = stringField(requestData, "sceneCollectionName")
        ?? this.currentSceneCollectionName
      send({})
      return true
    }
    if (requestType === "CreateSceneCollection") {
      const sceneCollectionName = stringField(requestData, "sceneCollectionName")
      if (sceneCollectionName !== undefined && !this.sceneCollections.includes(sceneCollectionName)) {
        this.sceneCollections = [...this.sceneCollections, sceneCollectionName]
      }
      this.currentSceneCollectionName = sceneCollectionName ?? this.currentSceneCollectionName
      send({})
      return true
    }
    if (requestType === "SetProfileParameter") {
      this.setProfileParameter(requestData)
      send({})
      return true
    }
    return false
  }

  private setProfileParameter(requestData: unknown): void {
    const parameterCategory = stringField(requestData, "parameterCategory")
    const parameterName = stringField(requestData, "parameterName")
    if (parameterCategory === undefined || parameterName === undefined) {
      return
    }
    const parameterValue = nullableStringField(requestData, "parameterValue") ?? null
    const existingParameter = this.profileParameters.find((entry) =>
      entry.parameterCategory === parameterCategory && entry.parameterName === parameterName
    )
    if (existingParameter !== undefined) {
      this.profileParameters = this.profileParameters.map((entry) =>
        entry === existingParameter ? { ...entry, parameterValue } : entry
      )
      return
    }
    this.profileParameters = [
      ...this.profileParameters,
      { parameterCategory, parameterName, parameterValue, defaultParameterValue: null }
    ]
  }
}

const stringField = (requestData: unknown, field: string): string | undefined => {
  const value = typeof requestData === "object" && requestData !== null
    ? Object.entries(requestData).find(([key]) => key === field)?.[1]
    : undefined
  return typeof value === "string" ? value : undefined
}

const nullableStringField = (requestData: unknown, field: string): string | null | undefined => {
  const value = typeof requestData === "object" && requestData !== null
    ? Object.entries(requestData).find(([key]) => key === field)?.[1]
    : undefined
  return typeof value === "string" || value === null ? value : undefined
}
