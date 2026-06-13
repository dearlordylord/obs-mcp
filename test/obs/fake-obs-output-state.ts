type SendFakeObsResponse = (responseData?: Record<string, unknown>) => void

export class FakeObsOutputState {
  private recordActive = false
  private replayBufferActive = false
  private streamActive = false
  private virtualCamActive = false

  public handleRequest(requestType: string, send: SendFakeObsResponse): boolean {
    if (requestType === "GetVirtualCamStatus") {
      send({ outputActive: this.virtualCamActive })
      return true
    }
    if (requestType === "StartVirtualCam" || requestType === "StopVirtualCam") {
      this.virtualCamActive = requestType === "StartVirtualCam"
      send()
      return true
    }
    if (requestType === "ToggleVirtualCam") {
      this.virtualCamActive = !this.virtualCamActive
      send({ outputActive: this.virtualCamActive })
      return true
    }
    if (requestType === "GetReplayBufferStatus") {
      send({ outputActive: this.replayBufferActive })
      return true
    }
    if (requestType === "StartReplayBuffer" || requestType === "StopReplayBuffer") {
      this.replayBufferActive = requestType === "StartReplayBuffer"
      send()
      return true
    }
    if (requestType === "ToggleReplayBuffer") {
      this.replayBufferActive = !this.replayBufferActive
      send({ outputActive: this.replayBufferActive })
      return true
    }
    if (
      requestType === "SaveReplayBuffer" || requestType === "SplitRecordFile" || requestType === "CreateRecordChapter"
      || requestType === "PauseRecord" || requestType === "ResumeRecord" || requestType === "ToggleRecordPause"
      || requestType === "SendStreamCaption"
    ) {
      send()
      return true
    }
    if (requestType === "GetLastReplayBufferReplay") {
      send({ savedReplayPath: "/opaque/replay-buffer.mp4" })
      return true
    }
    if (requestType === "GetRecordStatus") {
      send({
        outputActive: this.recordActive,
        outputPaused: false,
        outputTimecode: this.recordActive ? "00:00:12.345" : "00:00:00.000",
        outputDuration: this.recordActive ? 12345 : 0,
        outputBytes: this.recordActive ? 67890 : 0
      })
      return true
    }
    if (requestType === "StartRecord") {
      this.recordActive = true
      send()
      return true
    }
    if (requestType === "StopRecord") {
      this.recordActive = false
      send({ outputPath: "/opaque/obs-recording.mkv" })
      return true
    }
    if (requestType === "ToggleRecord") {
      this.recordActive = !this.recordActive
      send({ outputActive: this.recordActive })
      return true
    }
    if (requestType === "GetStreamStatus") {
      send({
        outputActive: this.streamActive,
        outputReconnecting: false,
        outputTimecode: this.streamActive ? "00:00:12.345" : "00:00:00.000",
        outputDuration: this.streamActive ? 12345 : 0,
        outputCongestion: 0,
        outputBytes: this.streamActive ? 4096 : 0,
        outputSkippedFrames: 0,
        outputTotalFrames: this.streamActive ? 740 : 0
      })
      return true
    }
    if (requestType === "StartStream" || requestType === "StopStream") {
      this.streamActive = requestType === "StartStream"
      send()
      return true
    }
    if (requestType === "ToggleStream") {
      this.streamActive = !this.streamActive
      send({ outputActive: this.streamActive })
      return true
    }
    return false
  }
}
