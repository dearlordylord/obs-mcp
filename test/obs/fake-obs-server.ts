import { createHash } from "node:crypto"
import { type WebSocket, WebSocketServer } from "ws"

const OP_HELLO = 0
const OP_IDENTIFIED = 2
const OP_REQUEST_RESPONSE = 7
const REQUEST_STATUS_SUCCESS = 100
const AUTH_FAILURE_CLOSE_CODE = 4009
const BINARY_FRAME_HEX = "010203"
const BINARY_FRAME = Buffer.from(BINARY_FRAME_HEX, "hex")

interface FakeObsScene {
  readonly sceneName: string
  readonly sceneUuid?: string
  readonly sceneIndex: number
  readonly isGroup?: boolean
}

interface FakeObsInput {
  readonly inputName: string
  readonly inputUuid?: string
  readonly inputKind: string
  readonly unversionedInputKind: string
}

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
  readonly rpcVersion?: number
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

  private constructor(server: WebSocketServer, url: string, currentSceneName: string) {
    this.server = server
    this.url = url
    this.currentSceneName = currentSceneName
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
    const scenes = options.scenes ?? [
      { sceneName: "Intro", sceneUuid: "scene-intro", sceneIndex: 0 },
      { sceneName: "Main", sceneUuid: "scene-main", sceneIndex: 1 },
      { sceneName: "Group", sceneUuid: "scene-group", sceneIndex: 2, isGroup: true }
    ]
    const inputs = options.inputs ?? [
      {
        inputName: "Desktop Audio",
        inputUuid: "input-desktop-audio",
        inputKind: "wasapi_output_capture",
        unversionedInputKind: "wasapi_output_capture"
      },
      {
        inputName: "Mic/Aux",
        inputUuid: "input-mic-aux",
        inputKind: "wasapi_input_capture",
        unversionedInputKind: "wasapi_input_capture"
      }
    ]
    const fake = new FakeObsServer(server, `ws://127.0.0.1:${address.port}`, scenes[0]?.sceneName ?? "Intro")
    fake.installHandlers(options, scenes, inputs)
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

  private installHandlers(
    options: FakeObsServerOptions,
    scenes: ReadonlyArray<FakeObsScene>,
    inputs: ReadonlyArray<FakeObsInput>
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
        if (
          options.password !== undefined
          && identify.d.authentication !== authString(options.password, salt, challenge)
        ) {
          socket.close(AUTH_FAILURE_CLOSE_CODE, "Authentication failed")
          return
        }
        socket.send(JSON.stringify({ op: options.identifiedOp ?? OP_IDENTIFIED, d: { negotiatedRpcVersion: 1 } }))
        if (options.sendBinaryAfterIdentify === true) {
          socket.send(BINARY_FRAME)
        }
        if (options.sendMalformedAfterIdentify === true) {
          socket.send("{")
        }
        socket.on("message", (message) => this.handleRequest(socket, message.toString("utf8"), options, scenes, inputs))
      })
    })
  }

  private handleRequest(
    socket: WebSocket,
    text: string,
    options: FakeObsServerOptions,
    scenes: ReadonlyArray<FakeObsScene>,
    inputs: ReadonlyArray<FakeObsInput>
  ): void {
    const envelope = JSON.parse(text)
    const requestType = envelope.d.requestType
    const requestId = envelope.d.requestId
    if (options.skipResponsesFor?.includes(requestType) === true) {
      return
    }
    const send = (responseData: Record<string, unknown> = {}): void => {
      const failure = options.failRequests?.[requestType]
      const successData = options.omitResponseDataFor === requestType ? {} : { responseData }
      const frame = failure === undefined
        ? {
          op: OP_REQUEST_RESPONSE,
          d: {
            requestType,
            requestId,
            requestStatus: { result: true, code: REQUEST_STATUS_SUCCESS },
            ...successData
          }
        }
        : {
          op: OP_REQUEST_RESPONSE,
          d: {
            requestType,
            requestId,
            requestStatus: { result: false, code: failure.code, comment: failure.comment }
          }
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
        availableRequests: options.availableRequestsValue ?? [
          "GetVersion",
          "GetSceneList",
          "GetCurrentProgramScene",
          "SetCurrentProgramScene",
          "GetInputList",
          "GetInputKindList",
          "GetSpecialInputs"
        ],
        supportedImageFormats: ["png", "jpg"],
        platform: "ubuntu",
        platformDescription: "Ubuntu 24.04"
      })
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
      send({
        sceneName: current?.sceneName ?? "Intro",
        sceneUuid: current?.sceneUuid
      })
      return
    }
    if (requestType === "SetCurrentProgramScene") {
      this.currentSceneName = envelope.d.requestData.sceneName
      send()
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
      send({
        inputKinds: inputs.map((input) => unversioned ? input.unversionedInputKind : input.inputKind)
      })
      return
    }
    if (requestType === "GetSpecialInputs") {
      send({
        desktop1: "Desktop Audio",
        desktop2: null,
        mic1: "Mic/Aux",
        mic2: null,
        mic3: null,
        mic4: null
      })
      return
    }
    send()
  }
}
