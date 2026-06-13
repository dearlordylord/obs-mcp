import { createHash } from "node:crypto"
import { type WebSocket, WebSocketServer } from "ws"

import {
  DEFAULT_AVAILABLE_REQUESTS,
  DEFAULT_CANVASES,
  DEFAULT_HOTKEYS,
  DEFAULT_INPUTS,
  DEFAULT_SCENES,
  DEFAULT_TRANSITIONS,
  type FakeObsCanvas,
  type FakeObsInput,
  type FakeObsReceivedRequest,
  type FakeObsScene,
  type FakeObsTransition,
  sceneItemsFor
} from "./fake-obs-fixtures.js"
import { handleFakeObsHotkeyRequest } from "./fake-obs-hotkey-requests.js"
import { handleFakeObsInputRequest } from "./fake-obs-input-requests.js"
import { FakeObsInputState } from "./fake-obs-input-state.js"
import { FakeObsOutputState } from "./fake-obs-output-state.js"
import { FakeObsTransitionState } from "./fake-obs-transition-requests.js"

const OP_HELLO = 0
const OP_IDENTIFIED = 2
const OP_EVENT = 5
const OP_REQUEST_RESPONSE = 7
const REQUEST_STATUS_SUCCESS = 100
const AUTH_FAILURE_CLOSE_CODE = 4009
const BINARY_FRAME_HEX = "010203"
const BINARY_FRAME = Buffer.from(BINARY_FRAME_HEX, "hex")

interface FakeObsServerOptions {
  readonly password?: string
  readonly malformedHello?: boolean
  readonly binaryHello?: boolean
  readonly helloOp?: number
  readonly identifiedOp?: number
  readonly closeOnIdentify?: boolean
  readonly delayResponsesMs?: number
  readonly skipResponsesFor?: ReadonlyArray<string>
  readonly sendUnrelatedResponseBeforeReal?: boolean
  readonly sendBinaryAfterIdentify?: boolean
  readonly sendMalformedAfterIdentify?: boolean
  readonly sendBinaryBeforeResponse?: boolean
  readonly sendMalformedBeforeResponse?: boolean
  readonly badFrameBeforeResponseFor?: string
  readonly availableRequestsValue?: unknown
  readonly omitResponseDataFor?: string
  readonly failRequests?: Readonly<Record<string, { readonly code: number; readonly comment?: string }>>
  readonly scenes?: ReadonlyArray<FakeObsScene>
  readonly inputs?: ReadonlyArray<FakeObsInput>
  readonly canvases?: ReadonlyArray<FakeObsCanvas>
  readonly hotkeys?: ReadonlyArray<string>
  readonly transitions?: ReadonlyArray<FakeObsTransition>
  readonly transitionCursor?: number
  readonly studioModeEnabled?: boolean
  readonly rpcVersion?: number
  readonly eventAfterIdentify?: Record<string, unknown>
  readonly eventBeforeResponse?: Record<string, unknown>
  readonly eventBurstBeforeResponse?: ReadonlyArray<Record<string, unknown>>
  readonly eventBeforeResponseFor?: string
  readonly envelopeBeforeResponse?: Record<string, unknown>
  readonly envelopeBeforeResponseFor?: string
}

const sha256Base64 = (input: string): string => createHash("sha256").update(input).digest("base64")

const authString = (password: string, salt: string, challenge: string): string => {
  const secret = sha256Base64(`${password}${salt}`)
  return sha256Base64(`${secret}${challenge}`)
}

export class FakeObsServer {
  public readonly url: string
  private readonly server: WebSocketServer
  private currentSceneName: string
  private receivedRequests: ReadonlyArray<FakeObsReceivedRequest> = []
  private inputState: FakeObsInputState = new FakeObsInputState([])
  private readonly outputState = new FakeObsOutputState()
  private transitionState: FakeObsTransitionState = new FakeObsTransitionState([], 1)
  public lastIdentifyEventSubscriptions: unknown

  private constructor(server: WebSocketServer, url: string, currentSceneName: string) {
    this.server = server
    this.url = url
    this.currentSceneName = currentSceneName
    this.lastIdentifyEventSubscriptions = undefined
  }

  public static async start(options: FakeObsServerOptions = {}): Promise<FakeObsServer> {
    const server = new WebSocketServer({ port: 0 })
    const address = await new Promise<{ port: number }>((resolve) => {
      server.once("listening", () => {
        const addressInfo = server.address()
        if (typeof addressInfo === "object" && addressInfo !== null) {
          resolve({ port: addressInfo.port })
        }
      })
    })
    const scenes = options.scenes ?? DEFAULT_SCENES
    const inputs = options.inputs ?? DEFAULT_INPUTS
    const canvases = options.canvases ?? DEFAULT_CANVASES
    const hotkeys = options.hotkeys ?? DEFAULT_HOTKEYS
    const transitions = options.transitions ?? DEFAULT_TRANSITIONS
    const fake = new FakeObsServer(server, `ws://127.0.0.1:${address.port}`, scenes[0]?.sceneName ?? "Intro")
    fake.inputState = new FakeObsInputState(inputs)
    fake.transitionState = new FakeObsTransitionState(transitions, options.transitionCursor ?? 1)
    fake.installHandlers(options, scenes, inputs, canvases, hotkeys)
    return fake
  }

  public async stop(): Promise<void> {
    for (const client of this.server.clients) {
      client.close()
    }
    await new Promise<void>((resolve, reject) => {
      this.server.close((error) => error === undefined ? resolve() : reject(error))
    })
  }

  public get connectedClientCount(): number {
    return this.server.clients.size
  }

  public get requests(): ReadonlyArray<FakeObsReceivedRequest> {
    return this.receivedRequests
  }

  private installHandlers(
    options: FakeObsServerOptions,
    scenes: ReadonlyArray<FakeObsScene>,
    inputs: ReadonlyArray<FakeObsInput>,
    canvases: ReadonlyArray<FakeObsCanvas>,
    hotkeys: ReadonlyArray<string>
  ): void {
    this.server.on("connection", (socket) => {
      const salt = "salt"
      const challenge = "challenge"
      if (options.malformedHello === true) {
        socket.send(JSON.stringify({ op: OP_HELLO, d: { rpcVersion: "bad" } }))
        return
      }
      if (options.binaryHello === true) {
        socket.send(BINARY_FRAME)
        return
      }
      socket.send(JSON.stringify({
        op: options.helloOp ?? OP_HELLO,
        d: {
          obsStudioVersion: "31.0.0",
          obsWebSocketVersion: "5.6.0",
          rpcVersion: options.rpcVersion ?? 1,
          ...(options.password === undefined ? {} : { authentication: { salt, challenge } })
        }
      }))
      socket.once("message", (data) => {
        if (options.closeOnIdentify === true) {
          socket.close()
          return
        }
        const identify = JSON.parse(data.toString("utf8"))
        this.lastIdentifyEventSubscriptions = identify.d.eventSubscriptions
        if (
          options.password !== undefined
          && identify.d.authentication !== authString(options.password, salt, challenge)
        ) {
          socket.close(AUTH_FAILURE_CLOSE_CODE, "Authentication failed")
          return
        }
        socket.send(JSON.stringify({ op: options.identifiedOp ?? OP_IDENTIFIED, d: { negotiatedRpcVersion: 1 } }))
        if (options.eventAfterIdentify !== undefined) {
          socket.send(JSON.stringify({ op: OP_EVENT, d: options.eventAfterIdentify }))
        }
        if (options.sendBinaryAfterIdentify === true) {
          socket.send(BINARY_FRAME)
        }
        if (options.sendMalformedAfterIdentify === true) {
          socket.send("{")
        }
        socket.on(
          "message",
          (message) => this.handleRequest(socket, message.toString("utf8"), options, scenes, inputs, canvases, hotkeys)
        )
      })
    })
  }

  private handleRequest(
    socket: WebSocket,
    text: string,
    options: FakeObsServerOptions,
    scenes: ReadonlyArray<FakeObsScene>,
    inputs: ReadonlyArray<FakeObsInput>,
    canvases: ReadonlyArray<FakeObsCanvas>,
    hotkeys: ReadonlyArray<string>
  ): void {
    const envelope = JSON.parse(text)
    const requestType = envelope.d.requestType
    const requestId = envelope.d.requestId
    this.receivedRequests = [
      ...this.receivedRequests,
      { requestType, ...(envelope.d.requestData === undefined ? {} : { requestData: envelope.d.requestData }) }
    ]
    if (options.skipResponsesFor?.includes(requestType) === true) {
      return
    }
    const send = (responseData: Record<string, unknown> = {}): void => {
      const failure = options.failRequests?.[requestType]
      const successData = options.omitResponseDataFor === requestType ? {} : { responseData }
      const frame = failure === undefined
        ? {
          op: OP_REQUEST_RESPONSE,
          d: { requestType, requestId, requestStatus: { result: true, code: REQUEST_STATUS_SUCCESS }, ...successData }
        }
        : {
          op: OP_REQUEST_RESPONSE,
          d: { requestType, requestId, requestStatus: { result: false, code: failure.code, comment: failure.comment } }
        }
      if (options.sendUnrelatedResponseBeforeReal === true) {
        socket.send(JSON.stringify({
          op: OP_REQUEST_RESPONSE,
          d: {
            requestType,
            requestId: "unrelated",
            requestStatus: { result: true, code: REQUEST_STATUS_SUCCESS },
            responseData: { ignored: true }
          }
        }))
      }
      const shouldSendBadFrame = options.badFrameBeforeResponseFor === undefined
        || options.badFrameBeforeResponseFor === requestType
      if (options.sendBinaryBeforeResponse === true && shouldSendBadFrame) {
        socket.send(BINARY_FRAME)
      }
      if (options.sendMalformedBeforeResponse === true && shouldSendBadFrame) {
        socket.send("{")
      }
      if (
        options.eventBeforeResponse !== undefined
        && (options.eventBeforeResponseFor === undefined || options.eventBeforeResponseFor === requestType)
      ) {
        socket.send(JSON.stringify({ op: OP_EVENT, d: options.eventBeforeResponse }))
      }
      if (
        options.eventBurstBeforeResponse !== undefined
        && (options.eventBeforeResponseFor === undefined || options.eventBeforeResponseFor === requestType)
      ) {
        for (const event of options.eventBurstBeforeResponse) socket.send(JSON.stringify({ op: OP_EVENT, d: event }))
      }
      if (
        options.envelopeBeforeResponse !== undefined
        && (options.envelopeBeforeResponseFor === undefined || options.envelopeBeforeResponseFor === requestType)
      ) {
        socket.send(JSON.stringify(options.envelopeBeforeResponse))
      }
      const write = (): void => {
        socket.send(JSON.stringify(frame))
      }
      if (options.delayResponsesMs === undefined) {
        write()
      } else {
        setTimeout(write, options.delayResponsesMs)
      }
    }

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
      return
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
      return
    }
    if (handleFakeObsHotkeyRequest(hotkeys, requestType, send)) {
      return
    }
    if (requestType === "GetCanvasList") {
      send({ canvases })
      return
    }
    if (this.transitionState.handleRequest(requestType, envelope.d.requestData, send)) {
      return
    }
    if (requestType === "GetStudioModeEnabled") {
      send({ studioModeEnabled: options.studioModeEnabled ?? false })
      return
    }
    if (requestType === "GetSceneList") {
      const current = scenes.find((scene) => scene.sceneName === this.currentSceneName) ?? scenes[0]
      send({
        currentProgramSceneName: current?.sceneName ?? null,
        currentProgramSceneUuid: current?.sceneUuid ?? null,
        currentPreviewSceneName: null,
        currentPreviewSceneUuid: null,
        scenes
      })
      return
    }
    if (requestType === "GetCurrentProgramScene") {
      const current = scenes.find((scene) => scene.sceneName === this.currentSceneName) ?? scenes[0]
      send({ sceneName: current?.sceneName ?? "Intro", sceneUuid: current?.sceneUuid })
      return
    }
    if (requestType === "SetCurrentProgramScene") {
      this.currentSceneName = envelope.d.requestData.sceneName
      send()
      return
    }
    if (requestType === "GetSceneItemList" || requestType === "GetGroupSceneItemList") {
      send({ sceneItems: sceneItemsFor(envelope.d.requestData, requestType === "GetGroupSceneItemList") })
      return
    }
    if (requestType === "GetSceneItemId") {
      const sceneItem = sceneItemsFor(envelope.d.requestData, false)
        .find((item) => item.sourceName === envelope.d.requestData.sourceName)
      send({ sceneItemId: sceneItem?.sceneItemId ?? 0 })
      return
    }
    if (requestType === "GetSceneItemSource") {
      const sceneItem = sceneItemsFor(envelope.d.requestData, false)
        .find((item) => item.sceneItemId === envelope.d.requestData.sceneItemId)
      send({ sourceName: sceneItem?.sourceName ?? "Camera", sourceUuid: sceneItem?.sourceUuid ?? "source-camera" })
      return
    }
    if (requestType === "GetSceneItemEnabled") {
      const sceneItem = sceneItemsFor(envelope.d.requestData, false)
        .find((item) => item.sceneItemId === envelope.d.requestData.sceneItemId)
      send({ sceneItemEnabled: sceneItem?.sceneItemEnabled ?? true })
      return
    }
    if (requestType === "SetSceneItemEnabled") {
      send()
      return
    }
    if (requestType === "GetSceneItemLocked") {
      const sceneItem = sceneItemsFor(envelope.d.requestData, false)
        .find((item) => item.sceneItemId === envelope.d.requestData.sceneItemId)
      send({ sceneItemLocked: sceneItem?.sceneItemLocked ?? false })
      return
    }
    if (requestType === "SetSceneItemLocked") {
      send()
      return
    }
    if (requestType === "GetSceneItemIndex") {
      const sceneItem = sceneItemsFor(envelope.d.requestData, false)
        .find((item) => item.sceneItemId === envelope.d.requestData.sceneItemId)
      send({ sceneItemIndex: sceneItem?.sceneItemIndex ?? 0 })
      return
    }
    if (requestType === "GetSceneItemBlendMode") {
      const sceneItem = sceneItemsFor(envelope.d.requestData, false)
        .find((item) => item.sceneItemId === envelope.d.requestData.sceneItemId)
      send({ sceneItemBlendMode: sceneItem?.sceneItemBlendMode ?? "OBS_BLEND_NORMAL" })
      return
    }
    if (requestType === "SetSceneItemIndex" || requestType === "SetSceneItemBlendMode") {
      send()
      return
    }
    if (requestType === "GetSourceActive") {
      const sceneItem = sceneItemsFor(envelope.d.requestData, false)
        .find((item) =>
          item.sourceName === envelope.d.requestData.sourceName
          || item.sourceUuid === envelope.d.requestData.sourceUuid
        )
      send({
        videoActive: sceneItem?.sceneItemEnabled ?? false,
        videoShowing: sceneItem !== undefined
      })
      return
    }
    if (requestType === "GetInputList") {
      const inputKind = envelope.d.requestData?.inputKind
      send({
        inputs: typeof inputKind === "string"
          ? inputs.filter((input) => input.inputKind === inputKind || input.unversionedInputKind === inputKind)
          : inputs
      })
      return
    }
    if (requestType === "GetInputKindList") {
      const unversioned = envelope.d.requestData?.unversioned === true
      send({ inputKinds: inputs.map((input) => unversioned ? input.unversionedInputKind : input.inputKind) })
      return
    }
    if (requestType === "GetSpecialInputs") {
      send({ desktop1: "Desktop Audio", desktop2: null, mic1: "Mic/Aux", mic2: null, mic3: null, mic4: null })
      return
    }
    if (handleFakeObsInputRequest(this.inputState, requestType, envelope.d.requestData, send)) {
      return
    }
    if (this.outputState.handleRequest(requestType, send)) {
      return
    }
    send()
  }
}
