type SendFakeObsResponse = (responseData?: Record<string, unknown>) => void
type SendFakeObsError = (code: number, comment: string) => void

const RESOURCE_NOT_FOUND_STATUS_CODE = 600

export class FakeObsOutputState {
  private recordActive = false
  private replayBufferActive = false
  private streamActive = false
  private virtualCamActive = false

  public handleRequest(
    requestType: string,
    requestData: { readonly outputName?: string } | undefined,
    send: SendFakeObsResponse,
    sendError: SendFakeObsError
  ): boolean {
    if (requestType === "GetOutputList") {
      send({
        outputs: [
          { outputName: "adv_stream", outputKind: "rtmp_output", outputActive: this.streamActive },
          { outputName: "adv_file_output", outputKind: "ffmpeg_muxer", outputActive: this.recordActive },
          { outputName: "virtualcam_output", outputKind: "virtualcam_output", outputActive: this.virtualCamActive },
          { outputName: "replay_buffer", outputKind: "replay_buffer", outputActive: this.replayBufferActive }
        ]
      })
      return true
    }
    if (requestType === "GetOutputStatus") {
      const status = this.statusForOutput(requestData?.outputName ?? "")
      if (status === undefined) {
        sendError(RESOURCE_NOT_FOUND_STATUS_CODE, "Output not found")
      } else {
        send(status)
      }
      return true
    }
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

  private statusForOutput(outputName: string): Record<string, unknown> | undefined {
    if (outputName === "adv_stream") {
      return {
        outputActive: this.streamActive,
        outputReconnecting: false,
        outputTimecode: this.streamActive ? "00:00:12.345" : "00:00:00.000",
        outputDuration: this.streamActive ? 12345 : 0,
        outputCongestion: 0,
        outputBytes: this.streamActive ? 4096 : 0,
        outputSkippedFrames: 0,
        outputTotalFrames: this.streamActive ? 740 : 0
      }
    }
    if (outputName === "adv_file_output") {
      return {
        outputActive: this.recordActive,
        outputReconnecting: false,
        outputTimecode: this.recordActive ? "00:00:12.345" : "00:00:00.000",
        outputDuration: this.recordActive ? 12345 : 0,
        outputCongestion: 0,
        outputBytes: this.recordActive ? 67890 : 0,
        outputSkippedFrames: 0,
        outputTotalFrames: 0
      }
    }
    if (outputName === "virtualcam_output" || outputName === "replay_buffer") {
      return {
        outputActive: outputName === "virtualcam_output" ? this.virtualCamActive : this.replayBufferActive,
        outputReconnecting: false,
        outputTimecode: "00:00:00.000",
        outputDuration: 0,
        outputCongestion: 0,
        outputBytes: 0,
        outputSkippedFrames: 0,
        outputTotalFrames: 0
      }
    }
    return undefined
  }
}
