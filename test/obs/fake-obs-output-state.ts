type SendFakeObsResponse = (responseData?: Record<string, unknown>) => void
type SendFakeObsError = (code: number, comment: string) => void

const RESOURCE_NOT_FOUND_STATUS_CODE = 600
const RESOURCE_STATE_STATUS_CODE = 500

export class FakeObsOutputState {
  private readonly outputSettings = new Map<string, Record<string, unknown>>()
  private recordActive = false
  private replayBufferActive = false
  private streamActive = false
  private virtualCamActive = false

  public handleRequest(
    requestType: string,
    requestData: { readonly outputName?: string; readonly outputSettings?: Record<string, unknown> } | undefined,
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
    if (requestType === "GetOutputSettings") {
      const outputSettings = this.settingsForOutput(requestData?.outputName ?? "")
      if (outputSettings === undefined) {
        sendError(RESOURCE_NOT_FOUND_STATUS_CODE, "Output not found")
      } else {
        send({ outputSettings })
      }
      return true
    }
    if (requestType === "SetOutputSettings") {
      const outputName = requestData?.outputName ?? ""
      const previousSettings = this.settingsForOutput(outputName)
      if (previousSettings === undefined) {
        sendError(RESOURCE_NOT_FOUND_STATUS_CODE, "Output not found")
      } else {
        this.outputSettings.set(outputName, {
          ...previousSettings,
          ...requestData?.outputSettings
        })
        send()
      }
      return true
    }
    if (requestType === "StartOutput") {
      const active = this.outputActive(requestData?.outputName ?? "")
      if (active === undefined) {
        sendError(RESOURCE_NOT_FOUND_STATUS_CODE, "Output not found")
      } else if (active) {
        sendError(RESOURCE_STATE_STATUS_CODE, "Output already active")
      } else {
        this.setOutputActive(requestData?.outputName ?? "", true)
        send()
      }
      return true
    }
    if (requestType === "StopOutput") {
      const active = this.outputActive(requestData?.outputName ?? "")
      if (active === undefined) {
        sendError(RESOURCE_NOT_FOUND_STATUS_CODE, "Output not found")
      } else if (!active) {
        sendError(RESOURCE_STATE_STATUS_CODE, "Output not active")
      } else {
        this.setOutputActive(requestData?.outputName ?? "", false)
        send()
      }
      return true
    }
    if (requestType === "ToggleOutput") {
      const active = this.outputActive(requestData?.outputName ?? "")
      if (active === undefined) {
        sendError(RESOURCE_NOT_FOUND_STATUS_CODE, "Output not found")
      } else {
        const outputActive = !active
        this.setOutputActive(requestData?.outputName ?? "", outputActive)
        send({ outputActive })
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

  private settingsForOutput(outputName: string): Record<string, unknown> | undefined {
    const existingSettings = this.outputSettings.get(outputName)
    if (existingSettings !== undefined) return existingSettings
    if (outputName === "adv_stream") {
      return {
        server: "rtmp://live.example.invalid/app",
        key: "<redacted>",
        reconnect: true,
        retryDelaySec: 5,
        maxRetries: 10,
        bindIp: "default",
        ipFamily: "IPv4+IPv6"
      }
    }
    if (outputName === "adv_file_output") {
      return {
        path: "/opaque/recordings",
        formatName: "mkv",
        videoEncoder: "obs_x264",
        audioEncoder: "ffmpeg_aac",
        muxerSettings: "",
        trackIndex: 1
      }
    }
    if (outputName === "virtualcam_output" || outputName === "replay_buffer") {
      return { path: "/opaque/output" }
    }
    return undefined
  }

  private outputActive(outputName: string): boolean | undefined {
    if (outputName === "adv_stream") return this.streamActive
    if (outputName === "adv_file_output") return this.recordActive
    if (outputName === "virtualcam_output") return this.virtualCamActive
    if (outputName === "replay_buffer") return this.replayBufferActive
    return undefined
  }

  private setOutputActive(outputName: string, outputActive: boolean): void {
    if (outputName === "adv_stream") this.streamActive = outputActive
    if (outputName === "adv_file_output") this.recordActive = outputActive
    if (outputName === "virtualcam_output") this.virtualCamActive = outputActive
    if (outputName === "replay_buffer") this.replayBufferActive = outputActive
  }
}
