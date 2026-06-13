# OBS WebSocket Surface Priority Matrix

This matrix plans how to widen `@firfi/obs-mcp` beyond the current Scenes exemplar without weakening the foundation. The official obs-websocket protocol remains the source of truth; competitor repositories are used only as demand and UX signals.

## Provenance

- Official source JSON: `.references/protocol/obs-websocket/docs/generated/protocol.json`
- Official source Markdown: `.references/protocol/obs-websocket/docs/generated/protocol.md`
- Upstream protocol JSON: https://raw.githubusercontent.com/obsproject/obs-websocket/master/docs/generated/protocol.json
- Research references: `.references/competitors/obs-mcp`, `.references/competitors/agentic-obs`, `.references/competitors/mcp-server-obs`, `.references/competitors/lars-obs-mcp`, `.references/competitors/obs-showrunner-mcp`, `.references/competitors/yshk-obs-mcp`, `.references/competitors/obs_websocket_workspace`, `.references/competitors/Claude-OBS-Plugin`
- Machine-readable companion: `plans/obs-websocket-surface-matrix.json`
- Generated: 2026-06-12

## Official Protocol Facts

- 147 requests, 60 events, 7 enums, 94 enum identifiers, 14 categories.
- Request/event RPC versions: all 1; deprecated requests/events/enum identifiers: 0 / 0 / 0.
- 304 request fields, 152 response fields, 149 event fields.
- 44 requests have no request fields; 75 requests have no response fields.
- 33 requests and 12 events contain Object/Any fields.
- 83 requests are low-difficulty primitive candidates.

## Priority Model

| Priority | Meaning |
| --- | --- |
| P0 | Already implemented or foundation-proving surface. |
| P1 | High-value, flat implementation difficulty; ideal first widening batch. |
| P2 | High/medium value, moderate implementation or mutation semantics. |
| P3 | Important parity but riskier, more stateful, larger schemas, or policy-bound. |
| P4 | Deferred protocol/raw/vendor/events/UI/high-volume/batch work. |

Overall rows: P0 4, P1 27, P2 50, P3 83, P4 43. Requests: P0 4, P1 27, P2 50, P3 55, P4 11. Events: P0 0, P1 0, P2 0, P3 28, P4 32.

## Competitor Signal Summary

| Project | Signal | Value | Caution |
| --- | --- | --- | --- |
| royshil/obs-mcp | 127 repo tools across broad config/general/scenes/sources/scene-items/inputs/outputs/record/stream/transitions/filters/media/UI surface. | Broad low-level parity expectation. | GPL, textified JSON, broad filesystem/raw/vendor exposure. |
| @unngh/obs-mcp / Dart workspace | search/execute code-mode surface backed by 100+ OBS operations including canvases/events/animation. | Full OBS coverage and discoverability. | Code execution is intentionally rejected for this repo; use only for parity discovery. |
| agentic-obs | 81 tools plus resources/prompts/HTTP/TUI/automation/presets/screenshots. | Strong workflow/product layer signals. | Storage, HTTP, automation, and screenshot retention are later product architecture work. |
| sbroenne/mcp-server-obs | 7 action-multiplexed tools covering connection, recording, streaming, scene, source, audio, media. | Window capture, VS Code packaging, screenshots, virtual cam. | Action multiplexing and static singleton connection conflict with this foundation. |
| LarsCanGit/OBS-MCP | 26 compact direct tools. | Good small public surface: status, scenes, record/stream, audio, profiles, screenshots. | Screenshot file writes and global profile/canvas changes need policy. |
| obs-showrunner-mcp | 18 high-level show/director tools plus state resource. | Later workflow value: segments, overlays, highlights, safety modes, snapshots. | Depends on stable low-level core first. |
| yshk-obs-mcp | 23 prototype actions. | Presentation/demo automation ideas around text, media, filters, replay. | Prototype, not parity authority. |

## First High-Value Flat-Difficulty Batch

This is the recommended first widening batch after the current Scenes foundation. It favors full vertical patterns where possible, but it should still be implemented as schema-first operations, registry entries, capability-gated MCP tools, fake-server tests, and optional real-OBS integration checks.

| Slice | Operations | Priority | Difficulty | Why now |
| --- | --- | --- | --- | --- |
| General status | Keep existing get_version and add GetStats as get_obs_stats. | P1 | flat | Read-only status; validates shared capability and telemetry shaping. |
| Record control | GetRecordStatus, StartRecord, StopRecord, ToggleRecord, PauseRecord, ResumeRecord, ToggleRecordPause, SplitRecordFile, CreateRecordChapter. | P1 | flat | Best full-category next slice: compact, valuable, mostly primitive fields. |
| Stream control | GetStreamStatus, StartStream, StopStream, ToggleStream, SendStreamCaption. | P1/P2 | flat | High-value compact category; caption can be included if schema is explicit and user-facing copy is clear. |
| Inputs discovery + audio | GetInputList, GetInputKindList, GetSpecialInputs, GetInputMute, SetInputMute, ToggleInputMute, GetInputVolume, SetInputVolume, GetInputAudioBalance, SetInputAudioBalance, GetInputAudioMonitorType, SetInputAudioMonitorType. | P1/P2 | flat | Broad competitor signal and day-one usefulness; avoids Object-shaped input settings. |
| Scene-item read/toggle | GetSceneItemList, GetGroupSceneItemList, GetSceneItemEnabled, SetSceneItemEnabled, GetSceneItemLocked, SetSceneItemLocked, GetSceneItemId, GetSceneItemSource. | P1/P2 | moderate | Validates identity conventions before transforms. Include sceneName and optional searchOffset where protocol needs it. |
| Media input controls | GetMediaInputStatus, SetMediaInputCursor, OffsetMediaInputCursor, TriggerMediaInputAction. | P2 | flat | Small isolated lane once input identity and operation patterns are stable. |
| Virtual camera + replay buffer | GetVirtualCamStatus, StartVirtualCam, StopVirtualCam, ToggleVirtualCam, GetReplayBufferStatus, StartReplayBuffer, StopReplayBuffer, ToggleReplayBuffer, SaveReplayBuffer, GetLastReplayBufferReplay. | P2 | flat | Strong parity value without generic output Object settings. |

Batch-one acceptance bar: no action multiplexing, no raw Object passthrough unless explicitly wrapped, no default filesystem writes, capability gating through `GetVersion.availableRequests`, structured outputs, OBS error metadata preserved, and tests at schema/operation/protocol/MCP-handler levels.

## Ralph Lane Order

| Order | Lane | Scope |
| --- | --- | --- |
| 0 | Foundation matrix | Keep this matrix current and require every new tool to map to an official request row. |
| 1 | Safe status/control | General, record, stream, virtual camera, replay buffer. |
| 2 | Inputs/media | Input discovery, audio controls, media input controls. |
| 3 | Scene identity | Scene and scene-item identity conventions, optional UUID/canvas arguments where protocol supports them. |
| 4 | Scene items/filters/sources | Transforms, filters, screenshots, source lifecycle after identity and policy are stable. |
| 5 | Events/resources | Low-volume subscriptions first; high-volume events only with explicit buffering/throttling policy. |
| 6 | Batch execution | Only after individual request tools are stable. |
| 7 | Raw/vendor | Opt-in expert/debug lane, never default. |
| 8 | Config/admin | Global mutable OBS state, staged behind clear risk labels. |

Current Ralph implementation files use deeper aggregate lanes. The earlier
small first-task lanes have already landed as foundation and are no longer the
active scheduling shape:

| Ralph plan file | Aggregate lane | Scope |
| --- | --- | --- |
| `.ralph/plans/outputs-lifecycle.md` | Safe status/control | Remaining record lifecycle/file/chapter controls, replay buffer controls, and stream captions; output paths remain opaque OBS metadata only. |
| `.ralph/plans/inputs-media.md` | Inputs/media | Remaining input mute/volume, advanced primitive audio controls, and media input controls; reuses exactly-one input locator semantics. |
| `.ralph/plans/scenes-events.md` | Scene identity + Events/resources | Scene-item enabled/locked controls plus bounded low-volume event capture; excludes high-volume, vendor, and custom events by default. |

## Category Matrix

| Category | Requests | Events | First Priority | Breakdown | Lane | Value | Planning note |
| --- | ---: | ---: | --- | --- | --- | --- | --- |
| canvases | 1 | 3 | P1 | P1:1, P4:3 | canvases | medium | Newer OBS 5.7 identity layer. Keep read-only until scene and scene-item identity handling can accept canvasUuid where supported. |
| config | 17 | 6 | P3 | P3:15, P4:8 | config-profiles | medium | Split harmless reads from global/admin writes. Profile, scene collection, stream service, and persistent data are stateful. |
| filters | 10 | 6 | P3 | P3:10, P4:6 | filters | medium | Useful parity layer, but filter settings are Object-shaped and need per-filter schema policy before broad writes. |
| general | 8 | 3 | P0 | P0:1, P1:1, P3:4, P4:5 | foundation-general | high | Foundation status and capability discovery. Low risk and useful for every later vertical. |
| inputs | 28 | 13 | P1 | P1:8, P2:17, P3:13, P4:3 | inputs-audio | high | High-value user surface. Start with discovery and primitive audio/control operations; defer Object settings and creation/removal. |
| media inputs | 4 | 3 | P1 | P1:1, P3:3, P4:3 | media-controls | medium | Compact, useful, and mostly flat. Good after input discovery because it depends on input identity. |
| outputs | 17 | 6 | P1 | P1:2, P3:21 | outputs-virtualcam-replay | medium | Use a safe subset for virtual camera and replay buffer first. Generic output settings are broader and riskier. |
| record | 9 | 0 | P1 | P1:1, P2:8 | record-control | high | Best next full-category candidate: compact, high value, mostly primitive request/response fields. |
| scene items | 17 | 7 | P1 | P1:4, P2:10, P3:9, P4:1 | scene-items | high | High value but identity-heavy. Start with list and enable/disable before transforms and creation. |
| scenes | 11 | 6 | P0 | P0:3, P1:3, P2:5, P3:6 | scenes-core | high | Foundation-adjacent. Existing exemplar covers core scene switching; next additions should preserve naming/identity conventions. |
| sources | 3 | 0 | P1 | P1:1, P3:2 | sources-screenshots | high | Screenshots are valuable but need payload and filesystem policy. Do not default-enable writes. |
| stream | 5 | 0 | P1 | P1:1, P2:4 | stream-control | high | Compact high-value control surface. Good companion to record. |
| transitions | 9 | 5 | P1 | P1:3, P2:6, P4:5 | transitions | medium | Useful after scene/studio-mode basics; current-transition reads and duration writes are low risk. |
| ui | 8 | 2 | P1 | P1:1, P4:9 | ui-dialogs-projectors | low | Studio mode is useful and relatively flat. Dialogs/projectors have UI side effects and should be deliberate. |

## Deferral Policies

| Area | Policy |
| --- | --- |
| Screenshots | High value, but require explicit payload/file policy, output path allowlist, size limits, and disabled-by-default source toolset. |
| Raw/vendor/custom events | Keep behind explicit raw/vendor toolsets. Never expose as default LLM-facing tools. |
| Batches | Separate batch lane after individual operation schemas are stable. Respect official execution-type semantics and Sleep restrictions. |
| Events | Add after request/response tools. Start with low-volume subscriptions and bounded resources; high-volume events only with explicit opt-in throttling/coalescing. |
| Config/admin | Treat as global mutable OBS state. Split read-only profile/config inventory from writes and require clear risk labels. |
| Object-shaped settings | Use typed wrappers for common paths; avoid arbitrary Object passthrough as the default surface. |

## Full Request Matrix

### canvases

| Request | Priority | Difficulty | Risk | Lane | Request fields | Response fields | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| GetCanvasList | P1 | flat | read-only | canvases | - | canvases: Array<Object> | Gets an array of canvases in OBS. Competitor signal: 10. |

### config

| Request | Priority | Difficulty | Risk | Lane | Request fields | Response fields | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| CreateProfile | P3 | moderate | global-config-state-change | config-profiles | profileName: String | - | Creates a new profile, switching to it in the process Competitor signal: 13. |
| CreateSceneCollection | P3 | moderate | global-config-state-change | config-profiles | sceneCollectionName: String | - | Creates a new scene collection, switching to it in the process.  Note: This will block until the collection has finished changing. Competitor signal: 16. |
| GetProfileList | P3 | moderate | read-only | config-profiles | - | currentProfileName: String<br>profiles: Array<String> | Gets an array of all profiles Competitor signal: 15. |
| GetProfileParameter | P3 | moderate | read-only | config-profiles | parameterCategory: String<br>parameterName: String | parameterValue: String<br>defaultParameterValue: String | Gets a parameter from the current profile's configuration. Competitor signal: 16. |
| GetRecordDirectory | P3 | moderate | filesystem-or-large-payload | config-profiles | - | recordDirectory: String | Gets the current directory that the record output is set to. Competitor signal: 17. |
| GetSceneCollectionList | P3 | moderate | read-only | config-profiles | - | currentSceneCollectionName: String<br>sceneCollections: Array<String> | Gets an array of all scene collections Competitor signal: 17. |
| GetStreamServiceSettings | P3 | moderate | read-only | config-profiles | - | streamServiceType: String<br>streamServiceSettings: Object | Gets the current stream service settings (stream destination). Competitor signal: 12. |
| GetVideoSettings | P3 | moderate | read-only | config-profiles | - | fpsNumerator: Number<br>fpsDenominator: Number<br>baseWidth: Number<br>baseHeight: Number<br>outputWidth: Number<br>outputHeight: Number | Gets the current video settings.  Note: To get the true FPS value, divide the FPS numerator by the FPS denominator. Example: `60000/1001` Competitor signal: 21. |
| RemoveProfile | P3 | moderate | global-config-state-change | config-profiles | profileName: String | - | Removes a profile. If the current profile is chosen, it will change to a different profile first. Competitor signal: 13. |
| SetCurrentProfile | P3 | moderate | global-config-state-change | config-profiles | profileName: String | - | Switches to a profile. Competitor signal: 17. |
| SetCurrentSceneCollection | P3 | moderate | global-config-state-change | config-profiles | sceneCollectionName: String | - | Switches to a scene collection.  Note: This will block until the collection has finished changing. Competitor signal: 16. |
| SetProfileParameter | P3 | moderate | global-config-state-change | config-profiles | parameterCategory: String<br>parameterName: String<br>parameterValue: String | - | Sets the value of a parameter in the current profile's configuration. Competitor signal: 16. |
| SetRecordDirectory | P3 | moderate | filesystem-or-large-payload | config-profiles | recordDirectory: String | - | Sets the current directory that the record output writes files to. Competitor signal: 10. |
| SetStreamServiceSettings | P3 | moderate | global-config-state-change | config-profiles | streamServiceType: String<br>streamServiceSettings: Object | - | Sets the current stream service settings (stream destination).  Note: Simple RTMP settings can be set with type `rtmp_custom` and the settings fields `server` and `key`. Competitor signal: 14. |
| SetVideoSettings | P3 | moderate | global-config-state-change | config-profiles | fpsNumerator?: Number<br>fpsDenominator?: Number<br>baseWidth?: Number<br>baseHeight?: Number<br>outputWidth?: Number<br>outputHeight?: Number | - | Sets the current video settings.  Note: Fields must be specified in pairs. For example, you cannot set only `baseWidth` without needing to specify `baseHeight`. Competitor signal: 19. |
| GetPersistentData | P4 | moderate | raw-or-vendor-extension | raw-vendor-deferred | realm: String<br>slotName: String | slotValue: Any | Gets the value of a "slot" from the selected persistent data realm. Competitor signal: 13. |
| SetPersistentData | P4 | moderate | raw-or-vendor-extension | raw-vendor-deferred | realm: String<br>slotName: String<br>slotValue: Any | - | Sets the value of a "slot" from the selected persistent data realm. Competitor signal: 16. |

### filters

| Request | Priority | Difficulty | Risk | Lane | Request fields | Response fields | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| CreateSourceFilter | P3 | moderate | filter-state-change | filters | canvasUuid?: String<br>sourceName?: String<br>sourceUuid?: String<br>filterName: String<br>filterKind: String<br>filterSettings?: Object | - | Creates a new filter, adding it to the specified source. Competitor signal: 15. |
| GetSourceFilter | P3 | moderate | read-only | filters | canvasUuid?: String<br>sourceName?: String<br>sourceUuid?: String<br>filterName: String | filterEnabled: Boolean<br>filterIndex: Number<br>filterKind: String<br>filterSettings: Object | Gets the info for a specific source filter. Competitor signal: 16. |
| GetSourceFilterDefaultSettings | P3 | moderate | read-only | filters | filterKind: String | defaultFilterSettings: Object | Gets the default settings for a filter kind. Competitor signal: 11. |
| GetSourceFilterKindList | P3 | moderate | read-only | filters | - | sourceFilterKinds: Array<String> | Gets an array of all available source filter kinds.  Similar to `GetInputKindList` Competitor signal: 14. |
| GetSourceFilterList | P3 | moderate | read-only | filters | canvasUuid?: String<br>sourceName?: String<br>sourceUuid?: String | filters: Array<Object> | Gets an array of all of a source's filters. Competitor signal: 15. |
| RemoveSourceFilter | P3 | moderate | filter-state-change | filters | canvasUuid?: String<br>sourceName?: String<br>sourceUuid?: String<br>filterName: String | - | Removes a filter from a source. Competitor signal: 17. |
| SetSourceFilterEnabled | P3 | moderate | filter-state-change | filters | canvasUuid?: String<br>sourceName?: String<br>sourceUuid?: String<br>filterName: String<br>filterEnabled: Boolean | - | Sets the enable state of a source filter. Competitor signal: 17. |
| SetSourceFilterIndex | P3 | moderate | filter-state-change | filters | canvasUuid?: String<br>sourceName?: String<br>sourceUuid?: String<br>filterName: String<br>filterIndex: Number | - | Sets the index position of a filter on a source. Competitor signal: 13. |
| SetSourceFilterName | P3 | moderate | filter-state-change | filters | canvasUuid?: String<br>sourceName?: String<br>sourceUuid?: String<br>filterName: String<br>newFilterName: String | - | Sets the name of a source filter (rename). Competitor signal: 13. |
| SetSourceFilterSettings | P3 | moderate | filter-state-change | filters | canvasUuid?: String<br>sourceName?: String<br>sourceUuid?: String<br>filterName: String<br>filterSettings: Object<br>overlay?: Boolean | - | Sets the settings of a source filter. Competitor signal: 16. |

### general

| Request | Priority | Difficulty | Risk | Lane | Request fields | Response fields | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| GetVersion | P0 | done | read-only | implemented-scenes-foundation | - | obsVersion: String<br>obsWebSocketVersion: String<br>rpcVersion: Number<br>availableRequests: Array<String><br>supportedImageFormats: Array<String><br>platform: String<br>platformDescription: String | Gets data about the current plugin and RPC version. Competitor signal: 45. |
| GetStats | P1 | flat | read-only | foundation-general | - | cpuUsage: Number<br>memoryUsage: Number<br>availableDiskSpace: Number<br>activeFps: Number<br>averageFrameRenderTime: Number<br>renderSkippedFrames: Number<br>renderTotalFrames: Number<br>outputSkippedFrames: Number<br>outputTotalFrames: Number<br>webSocketSessionIncomingMessages: Number<br>webSocketSessionOutgoingMessages: Number | Gets statistics about OBS, obs-websocket, and the current session. Competitor signal: 29. |
| GetHotkeyList | P3 | moderate | read-only | foundation-general | - | hotkeys: Array<String> | Gets an array of all hotkey names in OBS.  Note: Hotkey functionality in obs-websocket comes as-is, and we do not guarantee support if things are broken. In 9/10 usages of hotkey requests, there exists a better, more reliable method via other requests. Competitor signal: 26. |
| Sleep | P3 | moderate | state-changing | foundation-general | sleepMillis?: Number<br>sleepFrames?: Number | - | Sleeps for a time duration or number of frames. Only available in request batches with types `SERIAL_REALTIME` or `SERIAL_FRAME`. Competitor signal: 28. |
| TriggerHotkeyByKeySequence | P3 | moderate | state-changing | foundation-general | keyId?: String<br>keyModifiers?: Object<br>keyModifiers.shift?: Boolean<br>keyModifiers.control?: Boolean<br>keyModifiers.alt?: Boolean<br>keyModifiers.command?: Boolean | - | Triggers a hotkey using a sequence of keys.  Note: Hotkey functionality in obs-websocket comes as-is, and we do not guarantee support if things are broken. In 9/10 usages of hotkey requests, there exists a better, more reliable method via other requests. Competitor signal: 17. |
| TriggerHotkeyByName | P3 | moderate | state-changing | foundation-general | hotkeyName: String<br>contextName?: String | - | Triggers a hotkey using its name. See `GetHotkeyList`.  Note: Hotkey functionality in obs-websocket comes as-is, and we do not guarantee support if things are broken. In 9/10 usages of hotkey requests, there exists a better, more reliable method via other requests. Competitor signal: 24. |
| BroadcastCustomEvent | P4 | moderate | raw-or-vendor-extension | raw-vendor-deferred | eventData: Object | - | Broadcasts a `CustomEvent` to all WebSocket clients. Receivers are clients which are identified and subscribed. Competitor signal: 22. |
| CallVendorRequest | P4 | moderate | raw-or-vendor-extension | raw-vendor-deferred | vendorName: String<br>requestType: String<br>requestData?: Object | vendorName: String<br>requestType: String<br>responseData: Object | Call a request registered to a vendor.  A vendor is a unique name registered by a third-party plugin or script, which allows for custom requests and events to be added to obs-websocket. If a plugin or script implements vendor requests or events, documentation is expected to be provided with them. Competitor signal: 25. |

### inputs

| Request | Priority | Difficulty | Risk | Lane | Request fields | Response fields | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| GetInputKindList | P1 | flat | read-only | inputs-audio | unversioned?: Boolean | inputKinds: Array<String> | Gets an array of all available input kinds in OBS. Competitor signal: 27. |
| GetInputList | P1 | flat | read-only | inputs-audio | inputKind?: String | inputs: Array<Object> | Gets an array of all inputs in OBS. Competitor signal: 23. |
| GetInputMute | P1 | flat | read-only | inputs-audio | inputName?: String<br>inputUuid?: String | inputMuted: Boolean | Gets the audio mute state of an input. Competitor signal: 31. |
| GetInputVolume | P1 | flat | read-only | inputs-audio | inputName?: String<br>inputUuid?: String | inputVolumeMul: Number<br>inputVolumeDb: Number | Gets the current volume setting of an input. Competitor signal: 28. |
| GetSpecialInputs | P1 | flat | read-only | inputs-audio | - | desktop1: String<br>desktop2: String<br>mic1: String<br>mic2: String<br>mic3: String<br>mic4: String | Gets the names of all special inputs. Competitor signal: 21. |
| SetInputMute | P1 | flat | bounded-state-change | inputs-audio | inputName?: String<br>inputUuid?: String<br>inputMuted: Boolean | - | Sets the audio mute state of an input. Competitor signal: 31. |
| SetInputVolume | P1 | flat | bounded-state-change | inputs-audio | inputName?: String<br>inputUuid?: String<br>inputVolumeMul?: Number<br>inputVolumeDb?: Number | - | Sets the volume setting of an input. Competitor signal: 32. |
| ToggleInputMute | P1 | flat | bounded-state-change | inputs-audio | inputName?: String<br>inputUuid?: String | inputMuted: Boolean | Toggles the audio mute state of an input. Competitor signal: 31. |
| GetInputAudioBalance | P2 | moderate | read-only | inputs-audio-advanced | inputName?: String<br>inputUuid?: String | inputAudioBalance: Number | Gets the audio balance of an input. Competitor signal: 14. |
| GetInputAudioMonitorType | P2 | moderate | read-only | inputs-audio-advanced | inputName?: String<br>inputUuid?: String | monitorType: String | Gets the audio monitor type of an input.  The available audio monitor types are:  - `OBS_MONITORING_TYPE_NONE` - `OBS_MONITORING_TYPE_MONITOR_ONLY` - `OBS_MONITORING_TYPE_MONITOR_AND_OUTPUT` Competitor signal: 14. |
| GetInputAudioSyncOffset | P2 | moderate | read-only | inputs-audio-advanced | inputName?: String<br>inputUuid?: String | inputAudioSyncOffset: Number | Gets the audio sync offset of an input.  Note: The audio sync offset can be negative too! Competitor signal: 14. |
| GetInputAudioTracks | P2 | moderate | read-only | inputs-audio-advanced | inputName?: String<br>inputUuid?: String | inputAudioTracks: Object | Gets the enable state of all audio tracks of an input. Competitor signal: 12. |
| GetInputDefaultSettings | P2 | moderate | read-only | inputs-settings | inputKind: String | defaultInputSettings: Object | Gets the default settings for an input kind. Competitor signal: 18. |
| GetInputDeinterlaceFieldOrder | P2 | moderate | read-only | inputs-settings | inputName?: String<br>inputUuid?: String | inputDeinterlaceFieldOrder: String | Gets the deinterlace field order of an input.  Deinterlace Field Orders:  - `OBS_DEINTERLACE_FIELD_ORDER_TOP` - `OBS_DEINTERLACE_FIELD_ORDER_BOTTOM`  Note: Deinterlacing functionality is restricted to async inputs only. Competitor signal: 9. |
| GetInputDeinterlaceMode | P2 | moderate | read-only | inputs-settings | inputName?: String<br>inputUuid?: String | inputDeinterlaceMode: String | Gets the deinterlace mode of an input.  Deinterlace Modes:  - `OBS_DEINTERLACE_MODE_DISABLE` - `OBS_DEINTERLACE_MODE_DISCARD` - `OBS_DEINTERLACE_MODE_RETRO` - `OBS_DEINTERLACE_MODE_BLEND` - `OBS_DEINTERLACE_MODE_BLEND_2X` - `OBS_DEINTERLACE_MODE_LINEAR` - `OBS_DEINTERLACE_MODE_LINEAR_2X` - `OBS_DEINTERLACE_MODE_YADIF` - `OBS_DEINTERLACE_MODE_YADIF_2X`  Note: Deinterlacing functionality is restricted to async inputs only. Competitor signal: 9. |
| GetInputPropertiesListPropertyItems | P2 | moderate | read-only | inputs-settings | inputName?: String<br>inputUuid?: String<br>propertyName: String | propertyItems: Array<Object> | Gets the items of a list property from an input's properties.  Note: Use this in cases where an input provides a dynamic, selectable list of items. For example, display capture, where it provides a list of available displays. Competitor signal: 13. |
| GetInputSettings | P2 | moderate | read-only | inputs-settings | inputName?: String<br>inputUuid?: String | inputSettings: Object<br>inputKind: String | Gets the settings of an input.  Note: Does not include defaults. To create the entire settings object, overlay `inputSettings` over the `defaultInputSettings` provided by `GetInputDefaultSettings`. Competitor signal: 19. |
| PressInputPropertiesButton | P2 | moderate | input-state-change | inputs-settings | inputName?: String<br>inputUuid?: String<br>propertyName: String | - | Presses a button in the properties of an input.  Some known `propertyName` values are:  - `refreshnocache` - Browser source reload button  Note: Use this in cases where there is a button in the properties of an input that cannot be accessed in any other way. For example, browser sources, where there is a refresh button. Competitor signal: 13. |
| SetInputAudioBalance | P2 | moderate | input-state-change | inputs-audio-advanced | inputName?: String<br>inputUuid?: String<br>inputAudioBalance: Number | - | Sets the audio balance of an input. Competitor signal: 14. |
| SetInputAudioMonitorType | P2 | moderate | input-state-change | inputs-audio-advanced | inputName?: String<br>inputUuid?: String<br>monitorType: String | - | Sets the audio monitor type of an input. Competitor signal: 15. |
| SetInputAudioSyncOffset | P2 | moderate | input-state-change | inputs-audio-advanced | inputName?: String<br>inputUuid?: String<br>inputAudioSyncOffset: Number | - | Sets the audio sync offset of an input. Competitor signal: 14. |
| SetInputAudioTracks | P2 | moderate | input-state-change | inputs-audio-advanced | inputName?: String<br>inputUuid?: String<br>inputAudioTracks: Object | - | Sets the enable state of audio tracks of an input. Competitor signal: 12. |
| SetInputDeinterlaceFieldOrder | P2 | moderate | input-state-change | inputs-settings | inputName?: String<br>inputUuid?: String<br>inputDeinterlaceFieldOrder: String | - | Sets the deinterlace field order of an input.  Note: Deinterlacing functionality is restricted to async inputs only. Competitor signal: 11. |
| SetInputDeinterlaceMode | P2 | moderate | input-state-change | inputs-settings | inputName?: String<br>inputUuid?: String<br>inputDeinterlaceMode: String | - | Sets the deinterlace mode of an input.  Note: Deinterlacing functionality is restricted to async inputs only. Competitor signal: 12. |
| SetInputSettings | P2 | moderate | input-state-change | inputs-settings | inputName?: String<br>inputUuid?: String<br>inputSettings: Object<br>overlay?: Boolean | - | Sets the settings of an input. Competitor signal: 23. |
| CreateInput | P3 | moderate | state-changing | inputs-audio | canvasUuid?: String<br>sceneName?: String<br>sceneUuid?: String<br>inputName: String<br>inputKind: String<br>inputSettings?: Object<br>sceneItemEnabled?: Boolean | inputUuid: String<br>sceneItemId: Number | Creates a new input, adding it as a scene item to the specified scene. Competitor signal: 26. |
| RemoveInput | P3 | moderate | state-changing | inputs-audio | inputName?: String<br>inputUuid?: String | - | Removes an existing input.  Note: Will immediately remove all associated scene items. Competitor signal: 18. |
| SetInputName | P3 | moderate | input-state-change | inputs-audio | inputName?: String<br>inputUuid?: String<br>newInputName: String | - | Sets the name of an input (rename). Competitor signal: 18. |

### media inputs

| Request | Priority | Difficulty | Risk | Lane | Request fields | Response fields | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| GetMediaInputStatus | P1 | flat | read-only | media-controls | inputName?: String<br>inputUuid?: String | mediaState: String<br>mediaDuration: Number<br>mediaCursor: Number | Gets the status of a media input.  Media States:  - `OBS_MEDIA_STATE_NONE` - `OBS_MEDIA_STATE_PLAYING` - `OBS_MEDIA_STATE_OPENING` - `OBS_MEDIA_STATE_BUFFERING` - `OBS_MEDIA_STATE_PAUSED` - `OBS_MEDIA_STATE_STOPPED` - `OBS_MEDIA_STATE_ENDED` - `OBS_MEDIA_STATE_ERROR` Competitor signal: 17. |
| OffsetMediaInputCursor | P3 | moderate | bounded-state-change | media-controls | inputName?: String<br>inputUuid?: String<br>mediaCursorOffset: Number | - | Offsets the current cursor position of a media input by the specified value.  This request does not perform bounds checking of the cursor position. Competitor signal: 17. |
| SetMediaInputCursor | P3 | moderate | bounded-state-change | media-controls | inputName?: String<br>inputUuid?: String<br>mediaCursor: Number | - | Sets the cursor position of a media input.  This request does not perform bounds checking of the cursor position. Competitor signal: 19. |
| TriggerMediaInputAction | P3 | moderate | state-changing | media-controls | inputName?: String<br>inputUuid?: String<br>mediaAction: String | - | Triggers an action on a media input. Competitor signal: 18. |

### outputs

| Request | Priority | Difficulty | Risk | Lane | Request fields | Response fields | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| GetReplayBufferStatus | P1 | flat | bounded-state-change | outputs-virtualcam-replay | - | outputActive: Boolean | Gets the status of the replay buffer output. Competitor signal: 18. |
| GetVirtualCamStatus | P1 | flat | bounded-state-change | outputs-virtualcam-replay | - | outputActive: Boolean | Gets the status of the virtualcam output. Competitor signal: 17. |
| GetLastReplayBufferReplay | P3 | moderate | filesystem-or-large-payload | outputs-virtualcam-replay | - | savedReplayPath: String | Gets the filename of the last replay buffer save file. Competitor signal: 10. |
| GetOutputList | P3 | moderate | output-state-change | outputs-virtualcam-replay | - | outputs: Array<Object> | Gets the list of available outputs. Competitor signal: 11. |
| GetOutputSettings | P3 | moderate | output-state-change | outputs-virtualcam-replay | outputName: String | outputSettings: Object | Gets the settings of an output. Competitor signal: 11. |
| GetOutputStatus | P3 | moderate | output-state-change | outputs-virtualcam-replay | outputName: String | outputActive: Boolean<br>outputReconnecting: Boolean<br>outputTimecode: String<br>outputDuration: Number<br>outputCongestion: Number<br>outputBytes: Number<br>outputSkippedFrames: Number<br>outputTotalFrames: Number | Gets the status of an output. Competitor signal: 11. |
| SaveReplayBuffer | P3 | moderate | output-state-change | outputs-virtualcam-replay | - | - | Saves the contents of the replay buffer output. Competitor signal: 25. |
| SetOutputSettings | P3 | moderate | output-state-change | outputs-virtualcam-replay | outputName: String<br>outputSettings: Object | - | Sets the settings of an output. Competitor signal: 11. |
| StartOutput | P3 | moderate | output-state-change | outputs-virtualcam-replay | outputName: String | - | Starts an output. Competitor signal: 12. |
| StartReplayBuffer | P3 | moderate | output-state-change | outputs-virtualcam-replay | - | - | Starts the replay buffer output. Competitor signal: 18. |
| StartVirtualCam | P3 | moderate | output-state-change | outputs-virtualcam-replay | - | - | Starts the virtualcam output. Competitor signal: 29. |
| StopOutput | P3 | moderate | output-state-change | outputs-virtualcam-replay | outputName: String | - | Stops an output. Competitor signal: 13. |
| StopReplayBuffer | P3 | moderate | output-state-change | outputs-virtualcam-replay | - | - | Stops the replay buffer output. Competitor signal: 19. |
| StopVirtualCam | P3 | moderate | output-state-change | outputs-virtualcam-replay | - | - | Stops the virtualcam output. Competitor signal: 30. |
| ToggleOutput | P3 | moderate | output-state-change | outputs-virtualcam-replay | outputName: String | outputActive: Boolean | Toggles the status of an output. Competitor signal: 14. |
| ToggleReplayBuffer | P3 | moderate | output-state-change | outputs-virtualcam-replay | - | outputActive: Boolean | Toggles the state of the replay buffer output. Competitor signal: 25. |
| ToggleVirtualCam | P3 | moderate | output-state-change | outputs-virtualcam-replay | - | outputActive: Boolean | Toggles the state of the virtualcam output. Competitor signal: 21. |

### record

| Request | Priority | Difficulty | Risk | Lane | Request fields | Response fields | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| GetRecordStatus | P1 | flat | bounded-state-change | record-control | - | outputActive: Boolean<br>outputPaused: Boolean<br>outputTimecode: String<br>outputDuration: Number<br>outputBytes: Number | Gets the status of the record output. Competitor signal: 18. |
| CreateRecordChapter | P2 | flat | record-stream-state-change | record-control | chapterName?: String | - | Adds a new chapter marker to the file currently being recorded.  Note: As of OBS 30.2.0, the only file format supporting this feature is Hybrid MP4. Competitor signal: 8. |
| PauseRecord | P2 | flat | record-stream-state-change | record-control | - | - | Pauses the record output. Competitor signal: 25. |
| ResumeRecord | P2 | flat | record-stream-state-change | record-control | - | - | Resumes the record output. Competitor signal: 25. |
| SplitRecordFile | P2 | flat | record-stream-state-change | record-control | - | - | Splits the current file being recorded into a new file. Competitor signal: 8. |
| StartRecord | P2 | flat | record-stream-state-change | record-control | - | - | Starts the record output. Competitor signal: 36. |
| StopRecord | P2 | flat | record-stream-state-change | record-control | - | outputPath: String | Stops the record output. Competitor signal: 38. |
| ToggleRecord | P2 | flat | record-stream-state-change | record-control | - | outputActive: Boolean | Toggles the status of the record output. Competitor signal: 15. |
| ToggleRecordPause | P2 | flat | record-stream-state-change | record-control | - | - | Toggles pause on the record output. Competitor signal: 14. |

### scene items

| Request | Priority | Difficulty | Risk | Lane | Request fields | Response fields | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| GetGroupSceneItemList | P1 | flat | read-only | scene-items | canvasUuid?: String<br>sceneName?: String<br>sceneUuid?: String | sceneItems: Array<Object> | Basically GetSceneItemList, but for groups.  Using groups at all in OBS is discouraged, as they are very broken under the hood. Please use nested scenes instead.  Groups only Competitor signal: 11. |
| GetSceneItemEnabled | P1 | flat | read-only | scene-items | canvasUuid?: String<br>sceneName?: String<br>sceneUuid?: String<br>sceneItemId: Number | sceneItemEnabled: Boolean | Gets the enable state of a scene item.  Scenes and Groups Competitor signal: 14. |
| GetSceneItemList | P1 | flat | read-only | scene-items | canvasUuid?: String<br>sceneName?: String<br>sceneUuid?: String | sceneItems: Array<Object> | Gets a list of all scene items in a scene.  Scenes only Competitor signal: 25. |
| SetSceneItemEnabled | P1 | flat | bounded-state-change | scene-items | canvasUuid?: String<br>sceneName?: String<br>sceneUuid?: String<br>sceneItemId: Number<br>sceneItemEnabled: Boolean | - | Sets the enable state of a scene item.  Scenes and Groups Competitor signal: 21. |
| GetSceneItemBlendMode | P2 | moderate | read-only | scene-items-transform | canvasUuid?: String<br>sceneName?: String<br>sceneUuid?: String<br>sceneItemId: Number | sceneItemBlendMode: String | Gets the blend mode of a scene item.  Blend modes:  - `OBS_BLEND_NORMAL` - `OBS_BLEND_ADDITIVE` - `OBS_BLEND_SUBTRACT` - `OBS_BLEND_SCREEN` - `OBS_BLEND_MULTIPLY` - `OBS_BLEND_LIGHTEN` - `OBS_BLEND_DARKEN`  Scenes and Groups Competitor signal: 7. |
| GetSceneItemId | P2 | moderate | read-only | scene-items-transform | canvasUuid?: String<br>sceneName?: String<br>sceneUuid?: String<br>sourceName: String<br>searchOffset?: Number | sceneItemId: Number | Searches a scene for a source, and returns its id.  Scenes and Groups Competitor signal: 17. |
| GetSceneItemIndex | P2 | moderate | read-only | scene-items-transform | canvasUuid?: String<br>sceneName?: String<br>sceneUuid?: String<br>sceneItemId: Number | sceneItemIndex: Number | Gets the index position of a scene item in a scene.  An index of 0 is at the bottom of the source list in the UI.  Scenes and Groups Competitor signal: 13. |
| GetSceneItemLocked | P2 | moderate | read-only | scene-items-transform | canvasUuid?: String<br>sceneName?: String<br>sceneUuid?: String<br>sceneItemId: Number | sceneItemLocked: Boolean | Gets the lock state of a scene item.  Scenes and Groups Competitor signal: 21. |
| GetSceneItemSource | P2 | moderate | read-only | scene-items-transform | canvasUuid?: String<br>sceneName?: String<br>sceneUuid?: String<br>sceneItemId: Number | sourceName: String<br>sourceUuid: String | Gets the source associated with a scene item. Competitor signal: 8. |
| GetSceneItemTransform | P2 | moderate | read-only | scene-items-transform | canvasUuid?: String<br>sceneName?: String<br>sceneUuid?: String<br>sceneItemId: Number | sceneItemTransform: Object | Gets the transform and crop info of a scene item.  Scenes and Groups Competitor signal: 13. |
| SetSceneItemBlendMode | P2 | moderate | layout-state-change | scene-items-transform | canvasUuid?: String<br>sceneName?: String<br>sceneUuid?: String<br>sceneItemId: Number<br>sceneItemBlendMode: String | - | Sets the blend mode of a scene item.  Scenes and Groups Competitor signal: 8. |
| SetSceneItemIndex | P2 | moderate | layout-state-change | scene-items-transform | canvasUuid?: String<br>sceneName?: String<br>sceneUuid?: String<br>sceneItemId: Number<br>sceneItemIndex: Number | - | Sets the index position of a scene item in a scene.  Scenes and Groups Competitor signal: 19. |
| SetSceneItemLocked | P2 | moderate | layout-state-change | scene-items-transform | canvasUuid?: String<br>sceneName?: String<br>sceneUuid?: String<br>sceneItemId: Number<br>sceneItemLocked: Boolean | - | Sets the lock state of a scene item.  Scenes and Group Competitor signal: 24. |
| SetSceneItemTransform | P2 | moderate | layout-state-change | scene-items-transform | canvasUuid?: String<br>sceneName?: String<br>sceneUuid?: String<br>sceneItemId: Number<br>sceneItemTransform: Object | - | Sets the transform and crop info of a scene item. Competitor signal: 18. |
| CreateSceneItem | P3 | moderate | state-changing | scene-items | canvasUuid?: String<br>sceneName?: String<br>sceneUuid?: String<br>sourceName?: String<br>sourceUuid?: String<br>sceneItemEnabled?: Boolean | sceneItemId: Number | Creates a new scene item using a source.  Scenes only Competitor signal: 9. |
| DuplicateSceneItem | P3 | moderate | scene-item-state-change | scene-items | canvasUuid?: String<br>sceneName?: String<br>sceneUuid?: String<br>sceneItemId: Number<br>destinationSceneName?: String<br>destinationSceneUuid?: String | sceneItemId: Number | Duplicates a scene item, copying all transform and crop info.  Scenes only Competitor signal: 12. |
| RemoveSceneItem | P3 | moderate | state-changing | scene-items | canvasUuid?: String<br>sceneName?: String<br>sceneUuid?: String<br>sceneItemId: Number | - | Removes a scene item from a scene.  Scenes only Competitor signal: 14. |

### scenes

| Request | Priority | Difficulty | Risk | Lane | Request fields | Response fields | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| GetCurrentProgramScene | P0 | done | read-only | implemented-scenes-foundation | - | sceneName: String<br>sceneUuid: String<br>currentProgramSceneName: String<br>currentProgramSceneUuid: String | Gets the current program scene.  Note 1: This request is slated to have the `currentProgram`-prefixed fields removed from in an upcoming RPC version.  Note 2: Canvases do not have any concept of a program or preview scene, so this request does not support canvases. Competitor signal: 14. |
| GetSceneList | P0 | done | read-only | implemented-scenes-foundation | canvasUuid?: String | currentProgramSceneName: String<br>currentProgramSceneUuid: String<br>currentPreviewSceneName: String<br>currentPreviewSceneUuid: String<br>scenes: Array<Object> | Gets an array of scenes in OBS. Competitor signal: 35. |
| SetCurrentProgramScene | P0 | done | state-changing | implemented-scenes-foundation | sceneName?: String<br>sceneUuid?: String | - | Sets the current program scene. Competitor signal: 21. |
| GetCurrentPreviewScene | P1 | flat | read-only | scenes-core | - | sceneName: String<br>sceneUuid: String<br>currentPreviewSceneName: String<br>currentPreviewSceneUuid: String | Gets the current preview scene.  Only available when studio mode is enabled.  Note: This request is slated to have the `currentPreview`-prefixed fields removed from in an upcoming RPC version. Competitor signal: 15. |
| GetGroupList | P1 | flat | read-only | scenes-core | - | groups: Array<String> | Gets an array of all groups in OBS.  Groups in OBS are actually scenes, but renamed and modified. In obs-websocket, we treat them as scenes where we can. Competitor signal: 13. |
| SetCurrentPreviewScene | P1 | flat | bounded-state-change | scenes-core | sceneName?: String<br>sceneUuid?: String | - | Sets the current preview scene.  Only available when studio mode is enabled. Competitor signal: 17. |
| CreateScene | P2 | moderate | scene-state-change | scenes-expanded | canvasUuid?: String<br>sceneName: String | sceneUuid: String | Creates a new scene in OBS. Competitor signal: 35. |
| GetSceneSceneTransitionOverride | P2 | moderate | read-only | scenes-expanded | canvasUuid?: String<br>sceneName?: String<br>sceneUuid?: String | transitionName: String<br>transitionDuration: Number | Gets the scene transition overridden for a scene.  Note: A transition UUID response field is not currently able to be implemented as of 2024-1-18. Competitor signal: 12. |
| RemoveScene | P2 | moderate | scene-state-change | scenes-expanded | canvasUuid?: String<br>sceneName?: String<br>sceneUuid?: String | - | Removes a scene from OBS. Competitor signal: 24. |
| SetSceneName | P2 | moderate | scene-state-change | scenes-expanded | canvasUuid?: String<br>sceneName?: String<br>sceneUuid?: String<br>newSceneName: String | - | Sets the name of a scene (rename). Competitor signal: 13. |
| SetSceneSceneTransitionOverride | P2 | moderate | scene-state-change | scenes-expanded | canvasUuid?: String<br>sceneName?: String<br>sceneUuid?: String<br>transitionName?: String<br>transitionDuration?: Number | - | Sets the scene transition overridden for a scene. Competitor signal: 14. |

### sources

| Request | Priority | Difficulty | Risk | Lane | Request fields | Response fields | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| GetSourceActive | P1 | flat | read-only | sources-screenshots | canvasUuid?: String<br>sourceName?: String<br>sourceUuid?: String | videoActive: Boolean<br>videoShowing: Boolean | Gets the active and show state of a source.  **Compatible with inputs and scenes.** Competitor signal: 15. |
| GetSourceScreenshot | P3 | moderate | filesystem-or-large-payload | sources-screenshots | canvasUuid?: String<br>sourceName?: String<br>sourceUuid?: String<br>imageFormat: String<br>imageWidth?: Number<br>imageHeight?: Number<br>imageCompressionQuality?: Number | imageData: String | Gets a Base64-encoded screenshot of a source.  The `imageWidth` and `imageHeight` parameters are treated as "scale to inner", meaning the smallest ratio will be used and the aspect ratio of the original resolution is kept. If `imageWidth` and `imageHeight` are not specified, the compressed image will use the full resolution of the source.  **Compatible with inputs and scenes.** Competitor signal: 19. |
| SaveSourceScreenshot | P3 | moderate | filesystem-or-large-payload | sources-screenshots | canvasUuid?: String<br>sourceName?: String<br>sourceUuid?: String<br>imageFormat: String<br>imageFilePath: String<br>imageWidth?: Number<br>imageHeight?: Number<br>imageCompressionQuality?: Number | - | Saves a screenshot of a source to the filesystem.  The `imageWidth` and `imageHeight` parameters are treated as "scale to inner", meaning the smallest ratio will be used and the aspect ratio of the original resolution is kept. If `imageWidth` and `imageHeight` are not specified, the compressed image will use the full resolution of the source.  **Compatible with inputs and scenes.** Competitor signal: 19. |

### stream

| Request | Priority | Difficulty | Risk | Lane | Request fields | Response fields | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| GetStreamStatus | P1 | flat | bounded-state-change | stream-control | - | outputActive: Boolean<br>outputReconnecting: Boolean<br>outputTimecode: String<br>outputDuration: Number<br>outputCongestion: Number<br>outputBytes: Number<br>outputSkippedFrames: Number<br>outputTotalFrames: Number | Gets the status of the stream output. Competitor signal: 30. |
| SendStreamCaption | P2 | flat | record-stream-state-change | stream-control | captionText: String | - | Sends CEA-608 caption text over the stream output. Competitor signal: 17. |
| StartStream | P2 | flat | record-stream-state-change | stream-control | - | - | Starts the stream output. Competitor signal: 33. |
| StopStream | P2 | flat | record-stream-state-change | stream-control | - | - | Stops the stream output. Competitor signal: 39. |
| ToggleStream | P2 | flat | record-stream-state-change | stream-control | - | outputActive: Boolean | Toggles the status of the stream output. Competitor signal: 15. |

### transitions

| Request | Priority | Difficulty | Risk | Lane | Request fields | Response fields | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| GetCurrentSceneTransition | P1 | flat | read-only | transitions | - | transitionName: String<br>transitionUuid: String<br>transitionKind: String<br>transitionFixed: Boolean<br>transitionDuration: Number<br>transitionConfigurable: Boolean<br>transitionSettings: Object | Gets information about the current scene transition. Competitor signal: 15. |
| GetSceneTransitionList | P1 | flat | read-only | transitions | - | currentSceneTransitionName: String<br>currentSceneTransitionUuid: String<br>currentSceneTransitionKind: String<br>transitions: Array<Object> | Gets an array of all scene transitions in OBS. Competitor signal: 14. |
| GetTransitionKindList | P1 | flat | read-only | transitions | - | transitionKinds: Array<String> | Gets an array of all available transition kinds.  Similar to `GetInputKindList` Competitor signal: 10. |
| GetCurrentSceneTransitionCursor | P2 | flat | read-only | transitions | - | transitionCursor: Number | Gets the cursor position of the current scene transition.  Note: `transitionCursor` will return 1.0 when the transition is inactive. Competitor signal: 10. |
| SetCurrentSceneTransition | P2 | flat | transition-state-change | transitions | transitionName: String | - | Sets the current scene transition.  Small note: While the namespace of scene transitions is generally unique, that uniqueness is not a guarantee as it is with other resources like inputs. Competitor signal: 18. |
| SetCurrentSceneTransitionDuration | P2 | flat | transition-state-change | transitions | transitionDuration: Number | - | Sets the duration of the current scene transition, if it is not fixed. Competitor signal: 17. |
| SetCurrentSceneTransitionSettings | P2 | flat | transition-state-change | transitions | transitionSettings: Object<br>overlay?: Boolean | - | Sets the settings of the current scene transition. Competitor signal: 11. |
| SetTBarPosition | P2 | flat | transition-state-change | transitions | position: Number<br>release?: Boolean | - | Sets the position of the TBar.  **Very important note**: This will be deprecated and replaced in a future version of obs-websocket. Competitor signal: 10. |
| TriggerStudioModeTransition | P2 | flat | transition-state-change | transitions | - | - | Triggers the current scene transition. Same functionality as the `Transition` button in studio mode. Competitor signal: 21. |

### ui

| Request | Priority | Difficulty | Risk | Lane | Request fields | Response fields | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| GetStudioModeEnabled | P1 | flat | read-only | ui-dialogs-projectors | - | studioModeEnabled: Boolean | Gets whether studio is enabled. Competitor signal: 19. |
| GetMonitorList | P4 | flat | local-ui-side-effect | ui-dialogs-projectors | - | monitors: Array<Object> | Gets a list of connected monitors and information about them. Competitor signal: 17. |
| OpenInputFiltersDialog | P4 | flat | local-ui-side-effect | ui-dialogs-projectors | inputName?: String<br>inputUuid?: String | - | Opens the filters dialog of an input. Competitor signal: 12. |
| OpenInputInteractDialog | P4 | flat | local-ui-side-effect | ui-dialogs-projectors | inputName?: String<br>inputUuid?: String | - | Opens the interact dialog of an input. Competitor signal: 12. |
| OpenInputPropertiesDialog | P4 | flat | local-ui-side-effect | ui-dialogs-projectors | inputName?: String<br>inputUuid?: String | - | Opens the properties dialog of an input. Competitor signal: 12. |
| OpenSourceProjector | P4 | flat | local-ui-side-effect | ui-dialogs-projectors | canvasUuid?: String<br>sourceName?: String<br>sourceUuid?: String<br>monitorIndex?: Number<br>projectorGeometry?: String | - | Opens a projector for a source.  Note: This request serves to provide feature parity with 4.x. It is very likely to be changed/deprecated in a future release. Competitor signal: 14. |
| OpenVideoMixProjector | P4 | flat | local-ui-side-effect | ui-dialogs-projectors | videoMixType: String<br>monitorIndex?: Number<br>projectorGeometry?: String | - | Opens a projector for a specific output video mix.  Mix types:  - `OBS_WEBSOCKET_VIDEO_MIX_TYPE_PREVIEW` - `OBS_WEBSOCKET_VIDEO_MIX_TYPE_PROGRAM` - `OBS_WEBSOCKET_VIDEO_MIX_TYPE_MULTIVIEW`  Note: This request serves to provide feature parity with 4.x. It is very likely to be changed/deprecated in a future release. Competitor signal: 14. |
| SetStudioModeEnabled | P4 | flat | local-ui-side-effect | ui-dialogs-projectors | studioModeEnabled: Boolean | - | Enables or disables studio mode Competitor signal: 21. |

## Full Event Matrix

### canvases

| Event | Priority | Difficulty | Risk | Lane | Subscription | Data fields | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| CanvasCreated | P4 | moderate | event-subscription-state | events-canvases | Canvases | canvasName: String<br>canvasUuid: String | A new canvas has been created. Competitor signal: 8. |
| CanvasNameChanged | P4 | moderate | event-subscription-state | events-canvases | Canvases | canvasUuid: String<br>oldCanvasName: String<br>canvasName: String | The name of a canvas has changed. Competitor signal: 7. |
| CanvasRemoved | P4 | moderate | event-subscription-state | events-canvases | Canvases | canvasName: String<br>canvasUuid: String | A canvas has been removed. Competitor signal: 8. |

### config

| Event | Priority | Difficulty | Risk | Lane | Subscription | Data fields | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| CurrentProfileChanged | P4 | moderate | event-subscription-state | events-config | Config | profileName: String | The current profile has changed. Competitor signal: 10. |
| CurrentProfileChanging | P4 | moderate | event-subscription-state | events-config | Config | profileName: String | The current profile has begun changing. Competitor signal: 10. |
| CurrentSceneCollectionChanged | P4 | moderate | event-subscription-state | events-config | Config | sceneCollectionName: String | The current scene collection has changed.  Note: If polling has been paused during `CurrentSceneCollectionChanging`, this is the que to restart polling. Competitor signal: 9. |
| CurrentSceneCollectionChanging | P4 | moderate | event-subscription-state | events-config | Config | sceneCollectionName: String | The current scene collection has begun changing.  Note: We recommend using this event to trigger a pause of all polling requests, as performing any requests during a scene collection change is considered undefined behavior and can cause crashes! Competitor signal: 10. |
| ProfileListChanged | P4 | moderate | event-subscription-state | events-config | Config | profiles: Array<String> | The profile list has changed. Competitor signal: 9. |
| SceneCollectionListChanged | P4 | moderate | event-subscription-state | events-config | Config | sceneCollections: Array<String> | The scene collection list has changed. Competitor signal: 9. |

### filters

| Event | Priority | Difficulty | Risk | Lane | Subscription | Data fields | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| SourceFilterCreated | P4 | moderate | event-subscription-state | events-filters | Filters | sourceName: String<br>filterName: String<br>filterKind: String<br>filterIndex: Number<br>filterSettings: Object<br>defaultFilterSettings: Object | A filter has been added to a source. Competitor signal: 8. |
| SourceFilterEnableStateChanged | P4 | moderate | event-subscription-state | events-filters | Filters | sourceName: String<br>filterName: String<br>filterEnabled: Boolean | A source filter's enable state has changed. Competitor signal: 8. |
| SourceFilterListReindexed | P4 | moderate | event-subscription-state | events-filters | Filters | sourceName: String<br>filters: Array<Object> | A source's filter list has been reindexed. Competitor signal: 8. |
| SourceFilterNameChanged | P4 | moderate | event-subscription-state | events-filters | Filters | sourceName: String<br>oldFilterName: String<br>filterName: String | The name of a source filter has changed. Competitor signal: 8. |
| SourceFilterRemoved | P4 | moderate | event-subscription-state | events-filters | Filters | sourceName: String<br>filterName: String | A filter has been removed from a source. Competitor signal: 8. |
| SourceFilterSettingsChanged | P4 | moderate | event-subscription-state | events-filters | Filters | sourceName: String<br>filterName: String<br>filterSettings: Object | An source filter's settings have changed (been updated). Competitor signal: 9. |

### general

| Event | Priority | Difficulty | Risk | Lane | Subscription | Data fields | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| CustomEvent | P4 | moderate | event-subscription-state | events-general | General | eventData: Object | Custom event emitted by `BroadcastCustomEvent`. Competitor signal: 32. |
| ExitStarted | P4 | moderate | event-subscription-state | events-general | General | - | OBS has begun the shutdown process. Competitor signal: 13. |
| VendorEvent | P4 | moderate | event-subscription-state | events-general | Vendors | vendorName: String<br>eventType: String<br>eventData: Object | An event has been emitted from a vendor.  A vendor is a unique name registered by a third-party plugin or script, which allows for custom requests and events to be added to obs-websocket. If a plugin or script implements vendor requests or events, documentation is expected to be provided with them. Competitor signal: 12. |

### inputs

| Event | Priority | Difficulty | Risk | Lane | Subscription | Data fields | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| InputAudioBalanceChanged | P3 | moderate | event-subscription-state | events-inputs | Inputs | inputName: String<br>inputUuid: String<br>inputAudioBalance: Number | The audio balance value of an input has changed. Competitor signal: 11. |
| InputAudioMonitorTypeChanged | P3 | moderate | event-subscription-state | events-inputs | Inputs | inputName: String<br>inputUuid: String<br>monitorType: String | The monitor type of an input has changed.  Available types are:  - `OBS_MONITORING_TYPE_NONE` - `OBS_MONITORING_TYPE_MONITOR_ONLY` - `OBS_MONITORING_TYPE_MONITOR_AND_OUTPUT` Competitor signal: 11. |
| InputAudioSyncOffsetChanged | P3 | moderate | event-subscription-state | events-inputs | Inputs | inputName: String<br>inputUuid: String<br>inputAudioSyncOffset: Number | The sync offset of an input has changed. Competitor signal: 10. |
| InputAudioTracksChanged | P3 | moderate | event-subscription-state | events-inputs | Inputs | inputName: String<br>inputUuid: String<br>inputAudioTracks: Object | The audio tracks of an input have changed. Competitor signal: 10. |
| InputCreated | P3 | moderate | event-subscription-state | events-inputs | Inputs | inputName: String<br>inputUuid: String<br>inputKind: String<br>unversionedInputKind: String<br>inputKindCaps: Number<br>inputSettings: Object<br>defaultInputSettings: Object | An input has been created. Competitor signal: 10. |
| InputMuteStateChanged | P3 | moderate | event-subscription-state | events-inputs | Inputs | inputName: String<br>inputUuid: String<br>inputMuted: Boolean | An input's mute state has changed. Competitor signal: 14. |
| InputNameChanged | P3 | moderate | event-subscription-state | events-inputs | Inputs | inputUuid: String<br>oldInputName: String<br>inputName: String | The name of an input has changed. Competitor signal: 10. |
| InputRemoved | P3 | moderate | event-subscription-state | events-inputs | Inputs | inputName: String<br>inputUuid: String | An input has been removed. Competitor signal: 10. |
| InputSettingsChanged | P3 | moderate | event-subscription-state | events-inputs | Inputs | inputName: String<br>inputUuid: String<br>inputSettings: Object | An input's settings have changed (been updated).  Note: On some inputs, changing values in the properties dialog will cause an immediate update. Pressing the "Cancel" button will revert the settings, resulting in another event being fired. Competitor signal: 10. |
| InputVolumeChanged | P3 | moderate | event-subscription-state | events-inputs | Inputs | inputName: String<br>inputUuid: String<br>inputVolumeMul: Number<br>inputVolumeDb: Number | An input's volume level has changed. Competitor signal: 16. |
| InputActiveStateChanged | P4 | high | high-volume-event-stream | events-inputs | InputActiveStateChanged | inputName: String<br>inputUuid: String<br>videoActive: Boolean | An input's active state has changed.  When an input is active, it means it's being shown by the program feed. Competitor signal: 14. |
| InputShowStateChanged | P4 | high | high-volume-event-stream | events-inputs | InputShowStateChanged | inputName: String<br>inputUuid: String<br>videoShowing: Boolean | An input's show state has changed.  When an input is showing, it means it's being shown by the preview or a dialog. Competitor signal: 14. |
| InputVolumeMeters | P4 | high | high-volume-event-stream | events-inputs | InputVolumeMeters | inputs: Array<Object> | A high-volume event providing volume levels of all active inputs every 50 milliseconds. Competitor signal: 23. |

### media inputs

| Event | Priority | Difficulty | Risk | Lane | Subscription | Data fields | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| MediaInputActionTriggered | P4 | moderate | event-subscription-state | events-media-inputs | MediaInputs | inputName: String<br>inputUuid: String<br>mediaAction: String | An action has been performed on an input. Competitor signal: 8. |
| MediaInputPlaybackEnded | P4 | moderate | event-subscription-state | events-media-inputs | MediaInputs | inputName: String<br>inputUuid: String | A media input has finished playing. Competitor signal: 8. |
| MediaInputPlaybackStarted | P4 | moderate | event-subscription-state | events-media-inputs | MediaInputs | inputName: String<br>inputUuid: String | A media input has started playing. Competitor signal: 8. |

### outputs

| Event | Priority | Difficulty | Risk | Lane | Subscription | Data fields | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| RecordFileChanged | P3 | moderate | event-subscription-state | events-outputs | Outputs | newOutputPath: String | The record output has started writing to a new file. For example, when a file split happens. Competitor signal: 10. |
| RecordStateChanged | P3 | moderate | event-subscription-state | events-outputs | Outputs | outputActive: Boolean<br>outputState: String<br>outputPath: String | The state of the record output has changed. Competitor signal: 15. |
| ReplayBufferSaved | P3 | moderate | event-subscription-state | events-outputs | Outputs | savedReplayPath: String | The replay buffer has been saved. Competitor signal: 12. |
| ReplayBufferStateChanged | P3 | moderate | event-subscription-state | events-outputs | Outputs | outputActive: Boolean<br>outputState: String | The state of the replay buffer output has changed. Competitor signal: 9. |
| StreamStateChanged | P3 | moderate | event-subscription-state | events-outputs | Outputs | outputActive: Boolean<br>outputState: String | The state of the stream output has changed. Competitor signal: 12. |
| VirtualcamStateChanged | P3 | moderate | event-subscription-state | events-outputs | Outputs | outputActive: Boolean<br>outputState: String | The state of the virtualcam output has changed. Competitor signal: 11. |

### scene items

| Event | Priority | Difficulty | Risk | Lane | Subscription | Data fields | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| SceneItemCreated | P3 | moderate | event-subscription-state | events-scene-items | SceneItems | sceneName: String<br>sceneUuid: String<br>sourceName: String<br>sourceUuid: String<br>sceneItemId: Number<br>sceneItemIndex: Number | A scene item has been created. Competitor signal: 9. |
| SceneItemEnableStateChanged | P3 | moderate | event-subscription-state | events-scene-items | SceneItems | sceneName: String<br>sceneUuid: String<br>sceneItemId: Number<br>sceneItemEnabled: Boolean | A scene item's enable state has changed. Competitor signal: 19. |
| SceneItemListReindexed | P3 | moderate | event-subscription-state | events-scene-items | SceneItems | sceneName: String<br>sceneUuid: String<br>sceneItems: Array<Object> | A scene's item list has been reindexed. Competitor signal: 8. |
| SceneItemLockStateChanged | P3 | moderate | event-subscription-state | events-scene-items | SceneItems | sceneName: String<br>sceneUuid: String<br>sceneItemId: Number<br>sceneItemLocked: Boolean | A scene item's lock state has changed. Competitor signal: 8. |
| SceneItemRemoved | P3 | moderate | event-subscription-state | events-scene-items | SceneItems | sceneName: String<br>sceneUuid: String<br>sourceName: String<br>sourceUuid: String<br>sceneItemId: Number | A scene item has been removed.  This event is not emitted when the scene the item is in is removed. Competitor signal: 8. |
| SceneItemSelected | P3 | moderate | event-subscription-state | events-scene-items | SceneItems | sceneName: String<br>sceneUuid: String<br>sceneItemId: Number | A scene item has been selected in the Ui. Competitor signal: 8. |
| SceneItemTransformChanged | P4 | high | high-volume-event-stream | events-scene-items | SceneItemTransformChanged | sceneName: String<br>sceneUuid: String<br>sceneItemId: Number<br>sceneItemTransform: Object | The transform/crop of a scene item has changed. Competitor signal: 15. |

### scenes

| Event | Priority | Difficulty | Risk | Lane | Subscription | Data fields | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| CurrentPreviewSceneChanged | P3 | moderate | event-subscription-state | events-scenes | Scenes | sceneName: String<br>sceneUuid: String | The current preview scene has changed. Competitor signal: 10. |
| CurrentProgramSceneChanged | P3 | moderate | event-subscription-state | events-scenes | Scenes | sceneName: String<br>sceneUuid: String | The current program scene has changed. Competitor signal: 18. |
| SceneCreated | P3 | moderate | event-subscription-state | events-scenes | Scenes | sceneName: String<br>sceneUuid: String<br>isGroup: Boolean | A new scene has been created. Competitor signal: 18. |
| SceneListChanged | P3 | moderate | event-subscription-state | events-scenes | Scenes | scenes: Array<Object> | The list of scenes has changed.  TODO: Make OBS fire this event when scenes are reordered. Competitor signal: 11. |
| SceneNameChanged | P3 | moderate | event-subscription-state | events-scenes | Scenes | sceneUuid: String<br>oldSceneName: String<br>sceneName: String | The name of a scene has changed. Competitor signal: 17. |
| SceneRemoved | P3 | moderate | event-subscription-state | events-scenes | Scenes | sceneName: String<br>sceneUuid: String<br>isGroup: Boolean | A scene has been removed. Competitor signal: 16. |

### transitions

| Event | Priority | Difficulty | Risk | Lane | Subscription | Data fields | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| CurrentSceneTransitionChanged | P4 | moderate | event-subscription-state | events-transitions | Transitions | transitionName: String<br>transitionUuid: String | The current scene transition has changed. Competitor signal: 8. |
| CurrentSceneTransitionDurationChanged | P4 | moderate | event-subscription-state | events-transitions | Transitions | transitionDuration: Number | The current scene transition duration has changed. Competitor signal: 8. |
| SceneTransitionEnded | P4 | moderate | event-subscription-state | events-transitions | Transitions | transitionName: String<br>transitionUuid: String | A scene transition has completed fully.  Note: Does not appear to trigger when the transition is interrupted by the user. Competitor signal: 9. |
| SceneTransitionStarted | P4 | moderate | event-subscription-state | events-transitions | Transitions | transitionName: String<br>transitionUuid: String | A scene transition has started. Competitor signal: 9. |
| SceneTransitionVideoEnded | P4 | moderate | event-subscription-state | events-transitions | Transitions | transitionName: String<br>transitionUuid: String | A scene transition's video has completed fully.  Useful for stinger transitions to tell when the video *actually* ends. `SceneTransitionEnded` only signifies the cut point, not the completion of transition playback.  Note: Appears to be called by every transition, regardless of relevance. Competitor signal: 8. |

### ui

| Event | Priority | Difficulty | Risk | Lane | Subscription | Data fields | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| ScreenshotSaved | P4 | moderate | event-subscription-state | events-ui | Ui | savedScreenshotPath: String | A screenshot has been saved.  Note: Triggered for the screenshot feature available in `Settings -> Hotkeys -> Screenshot Output` ONLY. Applications using `Get/SaveSourceScreenshot` should implement a `CustomEvent` if this kind of inter-client communication is desired. Competitor signal: 10. |
| StudioModeStateChanged | P4 | moderate | event-subscription-state | events-ui | Ui | studioModeEnabled: Boolean | Studio mode has been enabled or disabled. Competitor signal: 9. |

## Verification

- The JSON companion must contain every official protocol request and event exactly once.
- Priority and lane assignments are planning metadata only; implementation must continue to derive request shapes from the official protocol reference and local explicit schemas.
- Competitor references are not implementation sources and do not override official protocol behavior.
