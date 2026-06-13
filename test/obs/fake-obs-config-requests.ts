import type { FakeObsProfileParameter } from "./fake-obs-fixtures.js"

type SendResponse = (responseData?: Record<string, unknown>) => void

interface FakeObsVideoSettings {
  readonly baseWidth: number
  readonly baseHeight: number
  readonly outputWidth: number
  readonly outputHeight: number
  readonly fpsNumerator: number
  readonly fpsDenominator: number
}

type FakeObsStreamServiceSettingValue = string | number | boolean | null

interface FakeObsStreamServiceSettings {
  readonly streamServiceType: string
  readonly streamServiceSettings: Record<string, FakeObsStreamServiceSettingValue>
}

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
  private recordDirectory: string
  private videoSettings: FakeObsVideoSettings
  private streamServiceSettings: FakeObsStreamServiceSettings

  public constructor(options: FakeObsConfigStateOptions) {
    this.profiles = [...options.profiles]
    this.currentProfileName = options.currentProfileName
    this.sceneCollections = [...options.sceneCollections]
    this.currentSceneCollectionName = options.currentSceneCollectionName
    this.profileParameters = [...options.profileParameters]
    this.recordDirectory = options.recordDirectory
    this.videoSettings = {
      baseWidth: 1920,
      baseHeight: 1080,
      outputWidth: 1280,
      outputHeight: 720,
      fpsNumerator: 30000,
      fpsDenominator: 1001
    }
    this.streamServiceSettings = {
      streamServiceType: "rtmp_custom",
      streamServiceSettings: {
        server: "rtmp://example.invalid/live",
        key: "configured-stream-key"
      }
    }
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
      send({ recordDirectory: this.recordDirectory })
      return true
    }
    if (requestType === "SetRecordDirectory") {
      this.recordDirectory = stringField(requestData, "recordDirectory") ?? this.recordDirectory
      send({})
      return true
    }
    if (requestType === "GetVideoSettings") {
      send({ ...this.videoSettings })
      return true
    }
    if (requestType === "SetVideoSettings") {
      this.setVideoSettings(requestData)
      send({})
      return true
    }
    if (requestType === "GetStreamServiceSettings") {
      send({ ...this.streamServiceSettings })
      return true
    }
    if (requestType === "SetStreamServiceSettings") {
      this.setStreamServiceSettings(requestData)
      send({})
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

  private setVideoSettings(requestData: unknown): void {
    this.videoSettings = {
      baseWidth: numberField(requestData, "baseWidth") ?? this.videoSettings.baseWidth,
      baseHeight: numberField(requestData, "baseHeight") ?? this.videoSettings.baseHeight,
      outputWidth: numberField(requestData, "outputWidth") ?? this.videoSettings.outputWidth,
      outputHeight: numberField(requestData, "outputHeight") ?? this.videoSettings.outputHeight,
      fpsNumerator: numberField(requestData, "fpsNumerator") ?? this.videoSettings.fpsNumerator,
      fpsDenominator: numberField(requestData, "fpsDenominator") ?? this.videoSettings.fpsDenominator
    }
  }

  private setStreamServiceSettings(requestData: unknown): void {
    const streamServiceType = stringField(requestData, "streamServiceType")
    const streamServiceSettings = recordField(requestData, "streamServiceSettings")
    if (streamServiceType === undefined || streamServiceSettings === undefined) {
      return
    }
    this.streamServiceSettings = { streamServiceType, streamServiceSettings }
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

const numberField = (requestData: unknown, field: string): number | undefined => {
  const value = typeof requestData === "object" && requestData !== null
    ? Object.entries(requestData).find(([key]) => key === field)?.[1]
    : undefined
  return typeof value === "number" ? value : undefined
}

const recordField = (
  requestData: unknown,
  field: string
): Record<string, FakeObsStreamServiceSettingValue> | undefined => {
  const value = typeof requestData === "object" && requestData !== null
    ? Object.entries(requestData).find(([key]) => key === field)?.[1]
    : undefined
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return undefined
  }
  return Object.fromEntries(
    Object.entries(value).filter((entry): entry is [string, FakeObsStreamServiceSettingValue] =>
      isStreamServiceSettingValue(entry[1])
    )
  )
}

const isStreamServiceSettingValue = (value: unknown): value is FakeObsStreamServiceSettingValue =>
  typeof value === "string" || typeof value === "number" || typeof value === "boolean" || value === null
