/* eslint-disable max-lines -- fake OBS websocket protocol harness covers many request handlers in one place. */

import { createHash } from "node:crypto"
import { type WebSocket, WebSocketServer } from "ws"

import { FakeObsConfigState } from "./fake-obs-config-requests.js"
import {
  DEFAULT_CANVASES,
  DEFAULT_HOTKEYS,
  DEFAULT_INPUTS,
  DEFAULT_PROFILE_PARAMETERS,
  DEFAULT_PROFILES,
  DEFAULT_RECORD_DIRECTORY,
  DEFAULT_SCENE_COLLECTIONS,
  DEFAULT_SCENES,
  DEFAULT_TRANSITIONS,
  type FakeObsCanvas,
  type FakeObsInput,
  type FakeObsProfileParameter,
  type FakeObsReceivedRequest,
  type FakeObsScene,
  type FakeObsTransition,
  sceneItemsFor
} from "./fake-obs-fixtures.js"
import { handleFakeObsFoundationRequest } from "./fake-obs-foundation-requests.js"
import { handleFakeObsHotkeyRequest } from "./fake-obs-hotkey-requests.js"
import { handleFakeObsInputRequest } from "./fake-obs-input-requests.js"
import { FakeObsInputState } from "./fake-obs-input-state.js"
import { FakeObsOutputState } from "./fake-obs-output-state.js"
import {
  type FakeObsSceneItems,
  type FakeObsSceneItemTransforms,
  handleFakeObsSceneItemReadRequest
} from "./fake-obs-scene-item-requests.js"
import { type FakeObsSceneTransitionOverrides, handleFakeObsSceneRequest } from "./fake-obs-scene-requests.js"
import { FakeObsTransitionState } from "./fake-obs-transition-requests.js"

const OP_HELLO = 0
const OP_IDENTIFIED = 2
const OP_EVENT = 5
const OP_REQUEST_RESPONSE = 7
const OP_REQUEST_BATCH = 8
const OP_REQUEST_BATCH_RESPONSE = 9
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
  readonly profiles?: ReadonlyArray<string>
  readonly currentProfileName?: string
  readonly sceneCollections?: ReadonlyArray<string>
  readonly currentSceneCollectionName?: string
  readonly profileParameters?: ReadonlyArray<FakeObsProfileParameter>
  readonly recordDirectory?: string
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
  readonly reverseBatchResults?: boolean
  readonly mismatchFirstBatchResultType?: boolean
  readonly sendUnrelatedBatchResponseBeforeReal?: boolean
}

interface FakeObsSourceFilter {
  readonly filterName: string
  readonly filterEnabled: boolean
  readonly filterIndex: number
  readonly filterKind: string
  readonly filterSettings: Readonly<Record<string, unknown>>
}

const defaultSourceFilters = (): Array<FakeObsSourceFilter> => [
  {
    filterName: "Color Correction",
    filterEnabled: true,
    filterIndex: 0,
    filterKind: "color_filter_v2",
    filterSettings: {
      brightness: 0.1,
      color_multiply: 4_294_967_295,
      secret_path: "/tmp/private",
      nested_policy: { omitted: true }
    }
  },
  {
    filterName: "Gain",
    filterEnabled: false,
    filterIndex: 1,
    filterKind: "gain_filter",
    filterSettings: {
      db: 3,
      enabled_by_default: false,
      labels: ["left", "right"]
    }
  }
]

const sha256Base64 = (input: string): string => createHash("sha256").update(input).digest("base64")

const authString = (password: string, salt: string, challenge: string): string => {
  const secret = sha256Base64(`${password}${salt}`)
  return sha256Base64(`${secret}${challenge}`)
}

const asRecord = (value: unknown): Record<string, unknown> | undefined =>
  typeof value === "object" && value !== null && !Array.isArray(value)
    ? Object.fromEntries(Object.entries(value))
    : undefined

export class FakeObsServer {
  public readonly url: string
  private readonly server: WebSocketServer
  private currentSceneName: string
  private currentPreviewSceneName: string
  private receivedRequests: ReadonlyArray<FakeObsReceivedRequest> = []
  private configState: FakeObsConfigState = new FakeObsConfigState({
    profiles: DEFAULT_PROFILES,
    currentProfileName: DEFAULT_PROFILES[0] ?? "Untitled",
    sceneCollections: DEFAULT_SCENE_COLLECTIONS,
    currentSceneCollectionName: DEFAULT_SCENE_COLLECTIONS[0] ?? "Main Scenes",
    profileParameters: DEFAULT_PROFILE_PARAMETERS,
    recordDirectory: DEFAULT_RECORD_DIRECTORY
  })
  private readonly persistentData = new Map<string, unknown>()
  private inputState: FakeObsInputState = new FakeObsInputState([])
  private sourceFilters: Array<FakeObsSourceFilter> = defaultSourceFilters()
  private readonly outputState = new FakeObsOutputState()
  private readonly sceneItems: FakeObsSceneItems = new Map()
  private readonly sceneItemTransforms: FakeObsSceneItemTransforms = new Map()
  private transitionState: FakeObsTransitionState = new FakeObsTransitionState([], 1)
  public lastIdentifyEventSubscriptions: unknown

  private constructor(server: WebSocketServer, url: string, currentSceneName: string) {
    this.server = server
    this.url = url
    this.currentSceneName = currentSceneName
    this.currentPreviewSceneName = currentSceneName
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
    const profiles = options.profiles ?? DEFAULT_PROFILES
    const sceneCollections = options.sceneCollections ?? DEFAULT_SCENE_COLLECTIONS
    const transitions = options.transitions ?? DEFAULT_TRANSITIONS
    const fake = new FakeObsServer(server, `ws://127.0.0.1:${address.port}`, scenes[0]?.sceneName ?? "Intro")
    fake.configState = new FakeObsConfigState({
      profiles,
      currentProfileName: options.currentProfileName ?? profiles[0] ?? "Untitled",
      sceneCollections,
      currentSceneCollectionName: options.currentSceneCollectionName ?? sceneCollections[0] ?? "Main Scenes",
      profileParameters: options.profileParameters ?? DEFAULT_PROFILE_PARAMETERS,
      recordDirectory: options.recordDirectory ?? DEFAULT_RECORD_DIRECTORY
    })
    fake.transitionState = new FakeObsTransitionState(transitions, options.transitionCursor ?? 1)
    fake.inputState = new FakeObsInputState([...inputs])
    fake.sourceFilters = defaultSourceFilters()
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

  private persistentDataKey(realm: unknown, slotName: unknown): string {
    return `${String(realm)}\u0000${String(slotName)}`
  }

  private installHandlers(
    options: FakeObsServerOptions,
    initialScenes: ReadonlyArray<FakeObsScene>,
    inputs: ReadonlyArray<FakeObsInput>,
    canvases: ReadonlyArray<FakeObsCanvas>,
    hotkeys: ReadonlyArray<string>
  ): void {
    const scenes = [...initialScenes]
    const sceneTransitionOverrides: FakeObsSceneTransitionOverrides = new Map()
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
          (message) =>
            this.handleRequest(
              socket,
              message.toString("utf8"),
              options,
              scenes,
              inputs,
              canvases,
              hotkeys,
              sceneTransitionOverrides
            )
        )
      })
    })
  }

  private handleRequest(
    socket: WebSocket,
    text: string,
    options: FakeObsServerOptions,
    scenes: Array<FakeObsScene>,
    inputs: ReadonlyArray<FakeObsInput>,
    canvases: ReadonlyArray<FakeObsCanvas>,
    hotkeys: ReadonlyArray<string>,
    sceneTransitionOverrides: FakeObsSceneTransitionOverrides
  ): void {
    const envelope = JSON.parse(text)
    if (envelope.op === OP_REQUEST_BATCH) {
      this.handleBatchRequest(socket, envelope, options, scenes)
      return
    }
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
    const sendError = (code: number, comment: string): void => {
      socket.send(JSON.stringify({
        op: OP_REQUEST_RESPONSE,
        d: { requestType, requestId, requestStatus: { result: false, code, comment } }
      }))
    }

    if (handleFakeObsFoundationRequest(canvases, options, requestType, send)) {
      return
    }
    if (handleFakeObsHotkeyRequest(hotkeys, requestType, send)) {
      return
    }
    if (this.configState.handleRequest(requestType, envelope.d.requestData, send)) {
      return
    }
    if (this.transitionState.handleRequest(requestType, envelope.d.requestData, send)) {
      return
    }
    if (requestType === "GetSceneList") {
      const current = scenes.find((scene) => scene.sceneName === this.currentSceneName) ?? scenes[0]
      const preview = scenes.find((scene) => scene.sceneName === this.currentPreviewSceneName) ?? scenes[0]
      send({
        currentProgramSceneName: current?.sceneName ?? null,
        currentProgramSceneUuid: current?.sceneUuid ?? null,
        currentPreviewSceneName: preview?.sceneName ?? null,
        currentPreviewSceneUuid: preview?.sceneUuid ?? null,
        scenes
      })
      return
    }
    if (requestType === "GetGroupList") {
      send({ groups: scenes.filter((scene) => scene.isGroup === true).map((scene) => scene.sceneName) })
      return
    }
    if (requestType === "GetCurrentProgramScene") {
      const current = scenes.find((scene) => scene.sceneName === this.currentSceneName) ?? scenes[0]
      send({ sceneName: current?.sceneName ?? "Intro", sceneUuid: current?.sceneUuid })
      return
    }
    if (requestType === "GetCurrentPreviewScene") {
      const preview = scenes.find((scene) => scene.sceneName === this.currentPreviewSceneName) ?? scenes[0]
      send({ sceneName: preview?.sceneName ?? "Intro", sceneUuid: preview?.sceneUuid })
      return
    }
    if (requestType === "SetCurrentProgramScene") {
      this.currentSceneName = envelope.d.requestData.sceneName
      send()
      return
    }
    if (requestType === "SetCurrentPreviewScene") {
      const next = scenes.find((scene) =>
        scene.sceneName === envelope.d.requestData.sceneName || scene.sceneUuid === envelope.d.requestData.sceneUuid
      )
      this.currentPreviewSceneName = next?.sceneName ?? envelope.d.requestData.sceneName
      send()
      return
    }
    const sceneRequest = handleFakeObsSceneRequest(
      requestType,
      envelope.d.requestData ?? {},
      scenes,
      this.currentSceneName,
      this.currentPreviewSceneName,
      sceneTransitionOverrides
    )
    if (sceneRequest.handled) {
      this.currentSceneName = sceneRequest.currentSceneName ?? this.currentSceneName
      this.currentPreviewSceneName = sceneRequest.currentPreviewSceneName ?? this.currentPreviewSceneName
      if (sceneRequest.error === undefined) {
        send(sceneRequest.responseData)
      } else {
        sendError(sceneRequest.error.code, sceneRequest.error.comment)
      }
      return
    }
    if (
      handleFakeObsSceneItemReadRequest(
        requestType,
        envelope.d.requestData,
        send,
        this.sceneItemTransforms,
        sendError,
        this.sceneItems
      )
    ) {
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
    if (requestType === "GetSourceScreenshot") {
      const mimeType = envelope.d.requestData.imageFormat === "jpg" || envelope.d.requestData.imageFormat === "jpeg"
        ? "image/jpeg"
        : envelope.d.requestData.imageFormat === "webp"
        ? "image/webp"
        : envelope.d.requestData.imageFormat === "bmp"
        ? "image/bmp"
        : "image/png"
      send({ imageData: `data:${mimeType};base64,aW1hZ2U=` })
      return
    }
    if (requestType === "SaveSourceScreenshot") {
      send()
      return
    }
    if (requestType === "GetSourceFilterKindList") {
      send({ sourceFilterKinds: ["color_filter_v2", "gain_filter", "mask_filter_v2"] })
      return
    }
    if (requestType === "GetSourceFilterList") {
      send({ filters: this.sourceFilters })
      return
    }
    if (requestType === "GetSourceFilterDefaultSettings") {
      send({
        defaultFilterSettings: {
          brightness: 0,
          color_multiply: 4_294_967_295,
          nested_policy: { omitted: true }
        }
      })
      return
    }
    if (requestType === "GetSourceFilter") {
      const filter = this.sourceFilters.find((entry) => entry.filterName === envelope.d.requestData.filterName)
        ?? this.sourceFilters[0]
      send({
        filterEnabled: filter?.filterEnabled ?? true,
        filterIndex: filter?.filterIndex ?? 0,
        filterKind: filter?.filterKind ?? "color_filter_v2",
        filterSettings: filter?.filterSettings ?? {}
      })
      return
    }
    if (requestType === "CreateSourceFilter") {
      this.sourceFilters = [
        ...this.sourceFilters,
        {
          filterName: envelope.d.requestData.filterName,
          filterEnabled: true,
          filterIndex: this.sourceFilters.length,
          filterKind: envelope.d.requestData.filterKind,
          filterSettings: envelope.d.requestData.filterSettings ?? {}
        }
      ]
      send()
      return
    }
    if (requestType === "RemoveSourceFilter") {
      this.sourceFilters = this.sourceFilters
        .filter((filter) => filter.filterName !== envelope.d.requestData.filterName)
        .map((filter, filterIndex) => ({ ...filter, filterIndex }))
      send()
      return
    }
    if (requestType === "SetSourceFilterSettings") {
      this.sourceFilters = this.sourceFilters.map((filter) =>
        filter.filterName === envelope.d.requestData.filterName
          ? {
            ...filter,
            filterSettings: envelope.d.requestData.overlay === false
              ? envelope.d.requestData.filterSettings
              : { ...filter.filterSettings, ...envelope.d.requestData.filterSettings }
          }
          : filter
      )
      send()
      return
    }
    if (requestType === "SetSourceFilterEnabled") {
      this.sourceFilters = this.sourceFilters.map((filter) =>
        filter.filterName === envelope.d.requestData.filterName
          ? { ...filter, filterEnabled: envelope.d.requestData.filterEnabled === true }
          : filter
      )
      send()
      return
    }
    if (requestType === "SetSourceFilterIndex") {
      const currentIndex = this.sourceFilters.findIndex((filter) =>
        filter.filterName === envelope.d.requestData.filterName
      )
      if (currentIndex >= 0) {
        const reordered = [...this.sourceFilters]
        const [filter] = reordered.splice(currentIndex, 1)
        if (filter !== undefined) {
          reordered.splice(envelope.d.requestData.filterIndex, 0, filter)
          this.sourceFilters = reordered.map((entry, filterIndex) => ({ ...entry, filterIndex }))
        }
      }
      send()
      return
    }
    if (requestType === "SetSourceFilterName") {
      this.sourceFilters = this.sourceFilters.map((filter) =>
        filter.filterName === envelope.d.requestData.filterName
          ? { ...filter, filterName: envelope.d.requestData.newFilterName ?? filter.filterName }
          : filter
      )
      send()
      return
    }
    if (requestType === "GetInputList") {
      const inputKind = envelope.d.requestData?.inputKind
      send({
        inputs: this.inputState.listInputs(typeof inputKind === "string" ? inputKind : undefined)
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
    if (this.outputState.handleRequest(requestType, envelope.d.requestData, send, sendError)) {
      return
    }
    if (requestType === "GetPersistentData") {
      const requestData = envelope.d.requestData
      const key = this.persistentDataKey(requestData.realm, requestData.slotName)
      send({ slotValue: this.persistentData.has(key) ? this.persistentData.get(key) : null })
      return
    }
    if (requestType === "SetPersistentData") {
      const requestData = envelope.d.requestData
      this.persistentData.set(this.persistentDataKey(requestData.realm, requestData.slotName), requestData.slotValue)
      send()
      return
    }
    if (requestType === "CallVendorRequest") {
      const requestData = envelope.d.requestData
      send({
        vendorName: requestData.vendorName,
        requestType: requestData.requestType,
        responseData: {
          accepted: true,
          echo: requestData.requestData
        }
      })
      return
    }
    if (requestType === "BroadcastCustomEvent") {
      send()
      return
    }
    send()
  }

  private handleBatchRequest(
    socket: WebSocket,
    envelope: {
      readonly d: {
        readonly requestId: string
        readonly requests: ReadonlyArray<Record<string, unknown>>
        readonly haltOnFailure?: boolean
      }
    },
    options: FakeObsServerOptions,
    scenes: ReadonlyArray<FakeObsScene>
  ): void {
    if (options.skipResponsesFor?.includes("RequestBatch") === true) {
      return
    }
    const results: Array<Record<string, unknown>> = []
    for (const request of envelope.d.requests) {
      const requestType = String(request["requestType"])
      const requestData = asRecord(request["requestData"])
      this.receivedRequests = [
        ...this.receivedRequests,
        { requestType, ...(requestData === undefined ? {} : { requestData }) }
      ]
      const failure = options.failRequests?.[requestType]
      if (failure !== undefined) {
        results.push({
          requestType,
          requestId: request["requestId"],
          requestStatus: { result: false, code: failure.code, comment: failure.comment }
        })
        if (envelope.d.haltOnFailure === true) {
          break
        }
        continue
      }
      if (requestType === "SetCurrentProgramScene") {
        this.currentSceneName = String(requestData?.["sceneName"])
      }
      const current = scenes.find((scene) => scene.sceneName === this.currentSceneName) ?? scenes[0]
      const responseData = requestType === "GetCurrentProgramScene"
        ? { sceneName: current?.sceneName ?? "Intro", sceneUuid: current?.sceneUuid }
        : {}
      results.push({
        requestType,
        requestId: request["requestId"],
        requestStatus: { result: true, code: REQUEST_STATUS_SUCCESS },
        responseData
      })
    }
    const orderedResults = options.reverseBatchResults === true ? [...results].reverse() : results
    const responseResults = options.mismatchFirstBatchResultType === true && orderedResults[0] !== undefined
      ? [{ ...orderedResults[0], requestType: "Sleep" }, ...orderedResults.slice(1)]
      : orderedResults
    if (options.sendUnrelatedBatchResponseBeforeReal === true) {
      socket.send(JSON.stringify({
        op: OP_REQUEST_BATCH_RESPONSE,
        d: { requestId: "unrelated", results: [] }
      }))
    }
    socket.send(JSON.stringify({
      op: OP_REQUEST_BATCH_RESPONSE,
      d: { requestId: envelope.d.requestId, results: responseResults }
    }))
  }
}
