import { DEFAULT_AVAILABLE_REQUESTS, type FakeObsCanvas } from "./fake-obs-fixtures.js"

type SendResponse = (responseData?: Record<string, unknown>) => void

export interface FakeObsFoundationRequestOptions {
  readonly availableRequestsValue?: unknown
  readonly studioModeEnabled?: boolean
}

export const handleFakeObsFoundationRequest = (
  canvases: ReadonlyArray<FakeObsCanvas>,
  options: FakeObsFoundationRequestOptions,
  requestType: string,
  send: SendResponse
): boolean => {
  if (requestType === "GetVersion") {
    send({
      obsVersion: "31.0.0",
      obsWebSocketVersion: "5.6.0",
      rpcVersion: 1,
      availableRequests: options.availableRequestsValue ?? DEFAULT_AVAILABLE_REQUESTS,
      supportedImageFormats: ["png", "jpg"],
      platform: "ubuntu",
      platformDescription: "Ubuntu 24.04"
    })
    return true
  }
  if (requestType === "GetStats") {
    send({
      cpuUsage: 3.5,
      memoryUsage: 512.25,
      availableDiskSpace: 1024.5,
      activeFps: 60,
      averageFrameRenderTime: 1.75,
      renderSkippedFrames: 2,
      renderTotalFrames: 1000,
      outputSkippedFrames: 3,
      outputTotalFrames: 900,
      webSocketSessionIncomingMessages: 10,
      webSocketSessionOutgoingMessages: 11
    })
    return true
  }
  if (requestType === "GetCanvasList") {
    send({ canvases })
    return true
  }
  if (requestType === "GetStudioModeEnabled") {
    send({ studioModeEnabled: options.studioModeEnabled ?? false })
    return true
  }
  if (requestType === "GetMonitorList") {
    send({
      monitors: [{
        monitorIndex: 0,
        monitorName: "Primary",
        monitorWidth: 1920,
        monitorHeight: 1080,
        monitorPositionX: 0,
        monitorPositionY: 0,
        ignoredOpaqueField: { nested: true }
      }]
    })
    return true
  }
  if (
    requestType === "OpenInputPropertiesDialog"
    || requestType === "OpenInputFiltersDialog"
    || requestType === "OpenInputInteractDialog"
    || requestType === "OpenVideoMixProjector"
    || requestType === "OpenSourceProjector"
  ) {
    send({})
    return true
  }
  return false
}
