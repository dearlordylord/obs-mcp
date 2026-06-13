import {
  DEFAULT_INPUT_AUDIO_STATE,
  DEFAULT_INPUT_VOLUME,
  fakeInputVolumeFromRequest,
  type FakeObsInput,
  type FakeObsInputAudioState,
  type FakeObsInputVolume
} from "./fake-obs-fixtures.js"

export class FakeObsInputState {
  private readonly inputMuteByKey: Map<string, boolean>
  private readonly inputVolumeByKey: Map<string, FakeObsInputVolume> = new Map()
  private readonly inputAudioStateByKey: Map<string, FakeObsInputAudioState> = new Map()

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
    return this.inputAudioStateByKey.get(locator) ?? DEFAULT_INPUT_AUDIO_STATE
  }

  public setAudioState(locator: string, state: FakeObsInputAudioState): void {
    for (const key of this.keysFor(locator)) {
      this.inputAudioStateByKey.set(key, state)
    }
  }

  private keysFor(locator: string): ReadonlyArray<string> {
    const input = this.inputs.find((entry) => entry.inputName === locator || entry.inputUuid === locator)
    return input === undefined
      ? [locator]
      : [input.inputName, ...(input.inputUuid === undefined ? [] : [input.inputUuid])]
  }
}
