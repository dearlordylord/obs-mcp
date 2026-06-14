# OBS Event Catalogue

Status: design source.

This catalogue is derived from `plans/obs-websocket-surface-matrix.json` and reconciled with the event policy ledger in `test/obs/protocol.test.ts`. The JSON matrix remains the protocol source of truth; this file is the human-readable catalogue for event architecture decisions.

Policy status counts: `typed-safe` 52, `high-volume` 4, `raw-only` 2, `deferred` 2.

Policy status meanings:

- `typed-safe`: low-volume event with a typed payload codec that is eligible for internal use and diagnostic journal exposure after policy checks.
- `deferred`: official event subscription is safe, but the payload contains raw settings data that needs a sanitized codec before public exposure.
- `high-volume`: event is intentionally outside the safe event subscription mask and requires an opt-in aggregate design before any MCP exposure.
- `raw-only`: event carries raw vendor/custom payloads and is not public through the safe event journal.

| Event | Category | Subscription | Status | MCP surface policy | Official data fields |
| --- | --- | --- | --- | --- | --- |
| `CanvasCreated` | canvases | `Canvases` | `typed-safe` | Diagnostic journal eligible | canvasName: String; canvasUuid: String |
| `CanvasRemoved` | canvases | `Canvases` | `typed-safe` | Diagnostic journal eligible | canvasName: String; canvasUuid: String |
| `CanvasNameChanged` | canvases | `Canvases` | `typed-safe` | Diagnostic journal eligible | canvasUuid: String; oldCanvasName: String; canvasName: String |
| `CurrentSceneCollectionChanging` | config | `Config` | `typed-safe` | Diagnostic journal eligible and internal request-safety guard candidate | sceneCollectionName: String |
| `CurrentSceneCollectionChanged` | config | `Config` | `typed-safe` | Diagnostic journal eligible and internal request-safety guard candidate | sceneCollectionName: String |
| `SceneCollectionListChanged` | config | `Config` | `typed-safe` | Diagnostic journal eligible | sceneCollections: Array<String> |
| `CurrentProfileChanging` | config | `Config` | `typed-safe` | Diagnostic journal eligible | profileName: String |
| `CurrentProfileChanged` | config | `Config` | `typed-safe` | Diagnostic journal eligible | profileName: String |
| `ProfileListChanged` | config | `Config` | `typed-safe` | Diagnostic journal eligible | profiles: Array<String> |
| `SourceFilterListReindexed` | filters | `Filters` | `typed-safe` | Diagnostic journal eligible | sourceName: String; filters: Array<Object> |
| `SourceFilterCreated` | filters | `Filters` | `typed-safe` | Diagnostic journal eligible with raw settings omitted | sourceName: String; filterName: String; filterKind: String; filterIndex: Number; filterSettings: Object; defaultFilterSettings: Object |
| `SourceFilterRemoved` | filters | `Filters` | `typed-safe` | Diagnostic journal eligible | sourceName: String; filterName: String |
| `SourceFilterNameChanged` | filters | `Filters` | `typed-safe` | Diagnostic journal eligible | sourceName: String; oldFilterName: String; filterName: String |
| `SourceFilterSettingsChanged` | filters | `Filters` | `typed-safe` | Diagnostic journal eligible with raw settings omitted | sourceName: String; filterName: String; filterSettings: Object |
| `SourceFilterEnableStateChanged` | filters | `Filters` | `typed-safe` | Diagnostic journal eligible | sourceName: String; filterName: String; filterEnabled: Boolean |
| `ExitStarted` | general | `General` | `typed-safe` | Diagnostic journal eligible | none |
| `InputCreated` | inputs | `Inputs` | `deferred` | Not public until sanitized codec exists | inputName: String; inputUuid: String; inputKind: String; unversionedInputKind: String; inputKindCaps: Number; inputSettings: Object; defaultInputSettings: Object |
| `InputRemoved` | inputs | `Inputs` | `typed-safe` | Diagnostic journal eligible | inputName: String; inputUuid: String |
| `InputNameChanged` | inputs | `Inputs` | `typed-safe` | Diagnostic journal eligible | inputUuid: String; oldInputName: String; inputName: String |
| `InputSettingsChanged` | inputs | `Inputs` | `deferred` | Not public until sanitized codec exists | inputName: String; inputUuid: String; inputSettings: Object |
| `InputActiveStateChanged` | inputs | `InputActiveStateChanged` | `high-volume` | Not public; requires separate opt-in aggregate design | inputName: String; inputUuid: String; videoActive: Boolean |
| `InputShowStateChanged` | inputs | `InputShowStateChanged` | `high-volume` | Not public; requires separate opt-in aggregate design | inputName: String; inputUuid: String; videoShowing: Boolean |
| `InputMuteStateChanged` | inputs | `Inputs` | `typed-safe` | Diagnostic journal eligible | inputName: String; inputUuid: String; inputMuted: Boolean |
| `InputVolumeChanged` | inputs | `Inputs` | `typed-safe` | Diagnostic journal eligible | inputName: String; inputUuid: String; inputVolumeMul: Number; inputVolumeDb: Number |
| `InputAudioBalanceChanged` | inputs | `Inputs` | `typed-safe` | Diagnostic journal eligible | inputName: String; inputUuid: String; inputAudioBalance: Number |
| `InputAudioSyncOffsetChanged` | inputs | `Inputs` | `typed-safe` | Diagnostic journal eligible | inputName: String; inputUuid: String; inputAudioSyncOffset: Number |
| `InputAudioTracksChanged` | inputs | `Inputs` | `typed-safe` | Diagnostic journal eligible | inputName: String; inputUuid: String; inputAudioTracks: Object |
| `InputAudioMonitorTypeChanged` | inputs | `Inputs` | `typed-safe` | Diagnostic journal eligible | inputName: String; inputUuid: String; monitorType: String |
| `InputVolumeMeters` | inputs | `InputVolumeMeters` | `high-volume` | Not public; requires separate opt-in aggregate design | inputs: Array<Object> |
| `MediaInputPlaybackStarted` | media inputs | `MediaInputs` | `typed-safe` | Diagnostic journal eligible | inputName: String; inputUuid: String |
| `MediaInputPlaybackEnded` | media inputs | `MediaInputs` | `typed-safe` | Diagnostic journal eligible | inputName: String; inputUuid: String |
| `MediaInputActionTriggered` | media inputs | `MediaInputs` | `typed-safe` | Diagnostic journal eligible | inputName: String; inputUuid: String; mediaAction: String |
| `StreamStateChanged` | outputs | `Outputs` | `typed-safe` | First-slice workflow event | outputActive: Boolean; outputState: String |
| `RecordStateChanged` | outputs | `Outputs` | `typed-safe` | First-slice workflow event | outputActive: Boolean; outputState: String; outputPath: String or null |
| `RecordFileChanged` | outputs | `Outputs` | `typed-safe` | First-slice workflow event | newOutputPath: String |
| `ReplayBufferStateChanged` | outputs | `Outputs` | `typed-safe` | First-slice workflow event | outputActive: Boolean; outputState: String |
| `VirtualcamStateChanged` | outputs | `Outputs` | `typed-safe` | First-slice workflow event | outputActive: Boolean; outputState: String |
| `ReplayBufferSaved` | outputs | `Outputs` | `typed-safe` | First-slice workflow event | savedReplayPath: String |
| `SceneItemCreated` | scene items | `SceneItems` | `typed-safe` | Diagnostic journal eligible | sceneName: String; sceneUuid: String; sourceName: String; sourceUuid: String; sceneItemId: Number; sceneItemIndex: Number |
| `SceneItemRemoved` | scene items | `SceneItems` | `typed-safe` | Diagnostic journal eligible | sceneName: String; sceneUuid: String; sourceName: String; sourceUuid: String; sceneItemId: Number |
| `SceneItemListReindexed` | scene items | `SceneItems` | `typed-safe` | Diagnostic journal eligible | sceneName: String; sceneUuid: String; sceneItems: Array<Object> |
| `SceneItemEnableStateChanged` | scene items | `SceneItems` | `typed-safe` | Diagnostic journal eligible | sceneName: String; sceneUuid: String; sceneItemId: Number; sceneItemEnabled: Boolean |
| `SceneItemLockStateChanged` | scene items | `SceneItems` | `typed-safe` | Diagnostic journal eligible | sceneName: String; sceneUuid: String; sceneItemId: Number; sceneItemLocked: Boolean |
| `SceneItemSelected` | scene items | `SceneItems` | `typed-safe` | Diagnostic journal eligible | sceneName: String; sceneUuid: String; sceneItemId: Number |
| `SceneItemTransformChanged` | scene items | `SceneItemTransformChanged` | `high-volume` | Not public; requires separate opt-in aggregate design | sceneName: String; sceneUuid: String; sceneItemId: Number; sceneItemTransform: Object |
| `SceneCreated` | scenes | `Scenes` | `typed-safe` | Diagnostic journal eligible | sceneName: String; sceneUuid: String; isGroup: Boolean |
| `SceneRemoved` | scenes | `Scenes` | `typed-safe` | Diagnostic journal eligible | sceneName: String; sceneUuid: String; isGroup: Boolean |
| `SceneNameChanged` | scenes | `Scenes` | `typed-safe` | Diagnostic journal eligible | sceneUuid: String; oldSceneName: String; sceneName: String |
| `CurrentProgramSceneChanged` | scenes | `Scenes` | `typed-safe` | Diagnostic journal eligible | sceneName: String; sceneUuid: String |
| `CurrentPreviewSceneChanged` | scenes | `Scenes` | `typed-safe` | Diagnostic journal eligible | sceneName: String; sceneUuid: String |
| `SceneListChanged` | scenes | `Scenes` | `typed-safe` | Diagnostic journal eligible | scenes: Array<Object> |
| `CurrentSceneTransitionChanged` | transitions | `Transitions` | `typed-safe` | Diagnostic journal eligible | transitionName: String; transitionUuid: String |
| `CurrentSceneTransitionDurationChanged` | transitions | `Transitions` | `typed-safe` | Diagnostic journal eligible | transitionDuration: Number |
| `SceneTransitionStarted` | transitions | `Transitions` | `typed-safe` | Diagnostic journal eligible | transitionName: String; transitionUuid: String |
| `SceneTransitionEnded` | transitions | `Transitions` | `typed-safe` | Diagnostic journal eligible | transitionName: String; transitionUuid: String |
| `SceneTransitionVideoEnded` | transitions | `Transitions` | `typed-safe` | Diagnostic journal eligible | transitionName: String; transitionUuid: String |
| `StudioModeStateChanged` | ui | `Ui` | `typed-safe` | Diagnostic journal eligible | studioModeEnabled: Boolean |
| `ScreenshotSaved` | ui | `Ui` | `typed-safe` | Diagnostic journal eligible | savedScreenshotPath: String |
| `VendorEvent` | general | `Vendors` | `raw-only` | Not public; raw/vendor/custom payload | vendorName: String; eventType: String; eventData: Object |
| `CustomEvent` | general | `General` | `raw-only` | Not public; raw/vendor/custom payload | eventData: Object |
