import {
  DEFAULT_INPUT_AUDIO_STATE,
  DEFAULT_INPUT_AUDIO_TRACKS,
  DEFAULT_INPUT_DEINTERLACE_STATE,
  DEFAULT_INPUT_VOLUME,
  DEFAULT_MEDIA_INPUT_STATUS,
  fakeInputVolumeFromRequest,
  type FakeObsInput,
  type FakeObsInputAudioState,
  type FakeObsInputDeinterlaceState,
  type FakeObsInputVolume,
  type FakeObsMediaInputAction,
  type FakeObsMediaInputStatus
} from "./fake-obs-fixtures.js"

interface FakeObsInputAudioRequestData {
  readonly inputAudioBalance?: number
  readonly monitorType?: FakeObsInputAudioState["monitorType"]
  readonly inputAudioSyncOffset?: number
  readonly inputAudioTracks?: FakeObsInputAudioState["inputAudioTracks"]
}

interface FakeObsInputDeinterlaceRequestData {
  readonly inputDeinterlaceMode?: FakeObsInputDeinterlaceState["inputDeinterlaceMode"]
  readonly inputDeinterlaceFieldOrder?: FakeObsInputDeinterlaceState["inputDeinterlaceFieldOrder"]
}

interface FakeObsMediaCursorRequestData {
  readonly mediaCursor?: number
  readonly mediaCursorOffset?: number
}

export class FakeObsInputState {
  private readonly inputMuteByKey: Map<string, boolean>
  private readonly inputVolumeByKey: Map<string, FakeObsInputVolume> = new Map()
  private readonly inputAudioStateByKey: Map<string, FakeObsInputAudioState> = new Map()
  private readonly inputDeinterlaceStateByKey: Map<string, FakeObsInputDeinterlaceState> = new Map()
  private readonly mediaStatusByKey: Map<string, FakeObsMediaInputStatus> = new Map()

  public constructor(private readonly inputs: ReadonlyArray<FakeObsInput>) {
    this.inputMuteByKey = new Map(inputs.flatMap((input) => {
      const muted = input.inputMuted ?? false
      return [
        [input.inputName, muted],
        ...(input.inputUuid === undefined ? [] : [[input.inputUuid, muted] as const])
      ] as const
    }))
  }

  public getMute(locator: string): boolean {
    return this.inputMuteByKey.get(locator) ?? false
  }

  public setMute(locator: string, inputMuted: boolean): void {
    for (const key of this.keysFor(locator)) {
      this.inputMuteByKey.set(key, inputMuted)
    }
  }

  public toggleMute(locator: string): boolean {
    const inputMuted = !this.getMute(locator)
    this.setMute(locator, inputMuted)
    return inputMuted
  }

  public getVolume(locator: string): FakeObsInputVolume {
    return this.inputVolumeByKey.get(locator) ?? DEFAULT_INPUT_VOLUME
  }

  public setVolume(
    locator: string,
    requestData: { readonly inputVolumeMul?: number; readonly inputVolumeDb?: number }
  ): void {
    const volume = fakeInputVolumeFromRequest(requestData)
    for (const key of this.keysFor(locator)) {
      this.inputVolumeByKey.set(key, volume)
    }
  }

  public getAudioState(locator: string): FakeObsInputAudioState {
    const input = this.inputs.find((entry) => entry.inputName === locator || entry.inputUuid === locator)
    return this.inputAudioStateByKey.get(locator) ?? {
      ...DEFAULT_INPUT_AUDIO_STATE,
      inputAudioBalance: input?.inputAudioBalance ?? DEFAULT_INPUT_AUDIO_STATE.inputAudioBalance,
      monitorType: input?.monitorType ?? DEFAULT_INPUT_AUDIO_STATE.monitorType,
      inputAudioSyncOffset: input?.inputAudioSyncOffset ?? DEFAULT_INPUT_AUDIO_STATE.inputAudioSyncOffset,
      inputAudioTracks: input?.inputAudioTracks ?? DEFAULT_INPUT_AUDIO_TRACKS
    }
  }

  public setAudioState(locator: string, state: FakeObsInputAudioState): void {
    for (const key of this.keysFor(locator)) {
      this.inputAudioStateByKey.set(key, state)
    }
  }

  public audioResponseFor(requestType: string, locator: string): Record<string, unknown> {
    const state = this.getAudioState(locator)
    return requestType === "GetInputAudioBalance"
      ? { inputAudioBalance: state.inputAudioBalance }
      : requestType === "GetInputAudioMonitorType"
      ? { monitorType: state.monitorType }
      : requestType === "GetInputAudioTracks"
      ? { inputAudioTracks: state.inputAudioTracks }
      : { inputAudioSyncOffset: state.inputAudioSyncOffset }
  }

  public setAudioFromRequest(requestType: string, locator: string, requestData: FakeObsInputAudioRequestData): void {
    const state = this.getAudioState(locator)
    this.setAudioState(
      locator,
      requestType === "SetInputAudioBalance"
        ? { ...state, inputAudioBalance: requestData.inputAudioBalance ?? state.inputAudioBalance }
        : requestType === "SetInputAudioMonitorType"
        ? { ...state, monitorType: requestData.monitorType ?? state.monitorType }
        : requestType === "SetInputAudioTracks"
        ? { ...state, inputAudioTracks: requestData.inputAudioTracks ?? state.inputAudioTracks }
        : { ...state, inputAudioSyncOffset: requestData.inputAudioSyncOffset ?? state.inputAudioSyncOffset }
    )
  }

  public getDeinterlaceState(locator: string): FakeObsInputDeinterlaceState {
    const input = this.inputs.find((entry) => entry.inputName === locator || entry.inputUuid === locator)
    return this.inputDeinterlaceStateByKey.get(locator) ?? {
      inputDeinterlaceMode: input?.inputDeinterlaceMode ?? DEFAULT_INPUT_DEINTERLACE_STATE.inputDeinterlaceMode,
      inputDeinterlaceFieldOrder: input?.inputDeinterlaceFieldOrder
        ?? DEFAULT_INPUT_DEINTERLACE_STATE.inputDeinterlaceFieldOrder
    }
  }

  public setDeinterlaceState(locator: string, state: FakeObsInputDeinterlaceState): void {
    for (const key of this.keysFor(locator)) {
      this.inputDeinterlaceStateByKey.set(key, state)
    }
  }

  public deinterlaceResponseFor(requestType: string, locator: string): Record<string, unknown> {
    const state = this.getDeinterlaceState(locator)
    return requestType === "GetInputDeinterlaceMode"
      ? { inputDeinterlaceMode: state.inputDeinterlaceMode }
      : { inputDeinterlaceFieldOrder: state.inputDeinterlaceFieldOrder }
  }

  public setDeinterlaceFromRequest(
    requestType: string,
    locator: string,
    requestData: FakeObsInputDeinterlaceRequestData
  ): void {
    const state = this.getDeinterlaceState(locator)
    this.setDeinterlaceState(
      locator,
      requestType === "SetInputDeinterlaceMode"
        ? { ...state, inputDeinterlaceMode: requestData.inputDeinterlaceMode ?? state.inputDeinterlaceMode }
        : {
          ...state,
          inputDeinterlaceFieldOrder: requestData.inputDeinterlaceFieldOrder
            ?? state.inputDeinterlaceFieldOrder
        }
    )
  }

  public getMediaStatus(locator: string): FakeObsMediaInputStatus {
    const input = this.inputs.find((entry) => entry.inputName === locator || entry.inputUuid === locator)
    return this.mediaStatusByKey.get(locator) ?? {
      mediaState: input?.mediaState ?? DEFAULT_MEDIA_INPUT_STATUS.mediaState,
      mediaDuration: input?.mediaDuration ?? DEFAULT_MEDIA_INPUT_STATUS.mediaDuration,
      mediaCursor: input?.mediaCursor ?? DEFAULT_MEDIA_INPUT_STATUS.mediaCursor
    }
  }

  public setMediaCursor(locator: string, mediaCursor: number): void {
    const status = { ...this.getMediaStatus(locator), mediaCursor }
    for (const key of this.keysFor(locator)) {
      this.mediaStatusByKey.set(key, status)
    }
  }

  public offsetMediaCursor(locator: string, mediaCursorOffset: number): void {
    const current = this.getMediaStatus(locator).mediaCursor ?? 0
    this.setMediaCursor(locator, current + mediaCursorOffset)
  }

  public applyMediaCursorRequest(
    requestType: string,
    locator: string,
    requestData: FakeObsMediaCursorRequestData
  ): void {
    if (requestType === "SetMediaInputCursor") {
      this.setMediaCursor(locator, requestData.mediaCursor ?? 0)
      return
    }
    this.offsetMediaCursor(locator, requestData.mediaCursorOffset ?? 0)
  }

  public triggerMediaAction(locator: string, mediaAction: FakeObsMediaInputAction): void {
    const status = this.getMediaStatus(locator)
    if (mediaAction === "OBS_WEBSOCKET_MEDIA_INPUT_ACTION_PLAY") {
      this.setMediaStatus(locator, { ...status, mediaState: "OBS_MEDIA_STATE_PLAYING" })
    }
    if (mediaAction === "OBS_WEBSOCKET_MEDIA_INPUT_ACTION_PAUSE") {
      this.setMediaStatus(locator, { ...status, mediaState: "OBS_MEDIA_STATE_PAUSED" })
    }
    if (mediaAction === "OBS_WEBSOCKET_MEDIA_INPUT_ACTION_STOP") {
      this.setMediaStatus(locator, { ...status, mediaState: "OBS_MEDIA_STATE_STOPPED" })
    }
    if (mediaAction === "OBS_WEBSOCKET_MEDIA_INPUT_ACTION_RESTART") {
      this.setMediaStatus(locator, { ...status, mediaState: "OBS_MEDIA_STATE_PLAYING", mediaCursor: 0 })
    }
  }

  private keysFor(locator: string): ReadonlyArray<string> {
    const input = this.inputs.find((entry) => entry.inputName === locator || entry.inputUuid === locator)
    return input === undefined
      ? [locator]
      : [input.inputName, ...(input.inputUuid === undefined ? [] : [input.inputUuid])]
  }

  private setMediaStatus(locator: string, status: FakeObsMediaInputStatus): void {
    for (const key of this.keysFor(locator)) {
      this.mediaStatusByKey.set(key, status)
    }
  }
}
