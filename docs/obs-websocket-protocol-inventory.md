# OBS WebSocket Protocol Inventory

Generated from the official obs-websocket protocol snapshot at `.references/protocol/obs-websocket/docs/generated/protocol.json`, verified against upstream raw JSON on 2026-06-12.

Primary sources:
- Official protocol reference: https://github.com/obsproject/obs-websocket/blob/master/docs/generated/protocol.md
- Official generated protocol JSON: https://raw.githubusercontent.com/obsproject/obs-websocket/master/docs/generated/protocol.json

This inventory is intentionally protocol-first. Competitor projects are useful for prioritization and UX ideas, but this file is the exhaustive capability baseline for future OBS MCP verticals.

## Totals

- Enums: 7
- Requests: 147
- Events: 60
- Categories: 14

## Category Coverage

| Category | Requests | Events | Notes |
| --- | ---: | ---: | --- |
| canvases | 1 | 3 | initial versions: 5.7.0 |
| config | 17 | 6 | initial versions: 5.0.0, 5.3.0 |
| filters | 10 | 6 | initial versions: 5.0.0, 5.4.0 |
| general | 8 | 3 | initial versions: 5.0.0 |
| inputs | 28 | 13 | initial versions: 5.0.0, 5.4.0, 5.6.0 |
| media inputs | 4 | 3 | initial versions: 5.0.0 |
| outputs | 17 | 6 | initial versions: 5.0.0, 5.5.0 |
| record | 9 | 0 | initial versions: 5.0.0, 5.5.0 |
| scene items | 17 | 7 | initial versions: 5.0.0, 5.4.0 |
| scenes | 11 | 6 | initial versions: 5.0.0 |
| sources | 3 | 0 | initial versions: 5.0.0 |
| stream | 5 | 0 | initial versions: 5.0.0 |
| transitions | 9 | 5 | initial versions: 5.0.0 |
| ui | 8 | 2 | initial versions: 5.0.0, 5.1.0 |

## Enums

### EventSubscription

| Identifier | Value | Version | Deprecated | Description |
| --- | --- | --- | --- | --- |
| None | 0 | 5.0.0 | no | Subcription value used to disable all events. |
| General | (1 << 0) | 5.0.0 | no | Subscription value to receive events in the `General` category. |
| Config | (1 << 1) | 5.0.0 | no | Subscription value to receive events in the `Config` category. |
| Scenes | (1 << 2) | 5.0.0 | no | Subscription value to receive events in the `Scenes` category. |
| Inputs | (1 << 3) | 5.0.0 | no | Subscription value to receive events in the `Inputs` category. |
| Transitions | (1 << 4) | 5.0.0 | no | Subscription value to receive events in the `Transitions` category. |
| Filters | (1 << 5) | 5.0.0 | no | Subscription value to receive events in the `Filters` category. |
| Outputs | (1 << 6) | 5.0.0 | no | Subscription value to receive events in the `Outputs` category. |
| SceneItems | (1 << 7) | 5.0.0 | no | Subscription value to receive events in the `SceneItems` category. |
| MediaInputs | (1 << 8) | 5.0.0 | no | Subscription value to receive events in the `MediaInputs` category. |
| Vendors | (1 << 9) | 5.0.0 | no | Subscription value to receive the `VendorEvent` event. |
| Ui | (1 << 10) | 5.0.0 | no | Subscription value to receive events in the `Ui` category. |
| Canvases | (1 << 11) | 5.7.0 | no | Subscription value to receive events in the `Canvases` category. |
| All | (General \| Config \| Scenes \| Inputs \| Transitions \| Filters \| Outputs \| SceneItems \| MediaInputs \| Vendors \| Ui \| Canvases) | 5.0.0 | no | Helper to receive all non-high-volume events. |
| InputVolumeMeters | (1 << 16) | 5.0.0 | no | Subscription value to receive the `InputVolumeMeters` high-volume event. |
| InputActiveStateChanged | (1 << 17) | 5.0.0 | no | Subscription value to receive the `InputActiveStateChanged` high-volume event. |
| InputShowStateChanged | (1 << 18) | 5.0.0 | no | Subscription value to receive the `InputShowStateChanged` high-volume event. |
| SceneItemTransformChanged | (1 << 19) | 5.0.0 | no | Subscription value to receive the `SceneItemTransformChanged` high-volume event. |

### RequestBatchExecutionType

| Identifier | Value | Version | Deprecated | Description |
| --- | --- | --- | --- | --- |
| None | -1 | 5.0.0 | no | Not a request batch. |
| SerialRealtime | 0 | 5.0.0 | no | A request batch which processes all requests serially, as fast as possible. |
| SerialFrame | 1 | 5.0.0 | no | A request batch type which processes all requests serially, in sync with the graphics thread. Designed to provide high accuracy for animations. |
| Parallel | 2 | 5.0.0 | no | A request batch type which processes all requests using all available threads in the thread pool. |

### RequestStatus

| Identifier | Value | Version | Deprecated | Description |
| --- | --- | --- | --- | --- |
| Unknown | 0 | 5.0.0 | no | Unknown status, should never be used. |
| NoError | 10 | 5.0.0 | no | For internal use to signify a successful field check. |
| Success | 100 | 5.0.0 | no | The request has succeeded. |
| MissingRequestType | 203 | 5.0.0 | no | The `requestType` field is missing from the request data. |
| UnknownRequestType | 204 | 5.0.0 | no | The request type is invalid or does not exist. |
| GenericError | 205 | 5.0.0 | no | Generic error code. |
| UnsupportedRequestBatchExecutionType | 206 | 5.0.0 | no | The request batch execution type is not supported. |
| NotReady | 207 | 5.3.0 | no | The server is not ready to handle the request. |
| MissingRequestField | 300 | 5.0.0 | no | A required request field is missing. |
| MissingRequestData | 301 | 5.0.0 | no | The request does not have a valid requestData object. |
| InvalidRequestField | 400 | 5.0.0 | no | Generic invalid request field message. |
| InvalidRequestFieldType | 401 | 5.0.0 | no | A request field has the wrong data type. |
| RequestFieldOutOfRange | 402 | 5.0.0 | no | A request field (number) is outside of the allowed range. |
| RequestFieldEmpty | 403 | 5.0.0 | no | A request field (string or array) is empty and cannot be. |
| TooManyRequestFields | 404 | 5.0.0 | no | There are too many request fields (eg. a request takes two optionals, where only one is allowed at a time). |
| OutputRunning | 500 | 5.0.0 | no | An output is running and cannot be in order to perform the request. |
| OutputNotRunning | 501 | 5.0.0 | no | An output is not running and should be. |
| OutputPaused | 502 | 5.0.0 | no | An output is paused and should not be. |
| OutputNotPaused | 503 | 5.0.0 | no | An output is not paused and should be. |
| OutputDisabled | 504 | 5.0.0 | no | An output is disabled and should not be. |
| StudioModeActive | 505 | 5.0.0 | no | Studio mode is active and cannot be. |
| StudioModeNotActive | 506 | 5.0.0 | no | Studio mode is not active and should be. |
| ResourceNotFound | 600 | 5.0.0 | no | The resource was not found. |
| ResourceAlreadyExists | 601 | 5.0.0 | no | The resource already exists. |
| InvalidResourceType | 602 | 5.0.0 | no | The type of resource found is invalid. |
| NotEnoughResources | 603 | 5.0.0 | no | There are not enough instances of the resource in order to perform the request. |
| InvalidResourceState | 604 | 5.0.0 | no | The state of the resource is invalid. For example, if the resource is blocked from being accessed. |
| InvalidInputKind | 605 | 5.0.0 | no | The specified input (obs_source_t-OBS_SOURCE_TYPE_INPUT) had the wrong kind. |
| ResourceNotConfigurable | 606 | 5.0.0 | no | The resource does not support being configured. |
| InvalidFilterKind | 607 | 5.0.0 | no | The specified filter (obs_source_t-OBS_SOURCE_TYPE_FILTER) had the wrong kind. |
| ResourceCreationFailed | 700 | 5.0.0 | no | Creating the resource failed. |
| ResourceActionFailed | 701 | 5.0.0 | no | Performing an action on the resource failed. |
| RequestProcessingFailed | 702 | 5.0.0 | no | Processing the request failed unexpectedly. |
| CannotAct | 703 | 5.0.0 | no | The combination of request fields cannot be used to perform an action. |

### ObsOutputState

| Identifier | Value | Version | Deprecated | Description |
| --- | --- | --- | --- | --- |
| OBS_WEBSOCKET_OUTPUT_UNKNOWN | OBS_WEBSOCKET_OUTPUT_UNKNOWN | 5.0.0 | no | Unknown state. |
| OBS_WEBSOCKET_OUTPUT_STARTING | OBS_WEBSOCKET_OUTPUT_STARTING | 5.0.0 | no | The output is starting. |
| OBS_WEBSOCKET_OUTPUT_STARTED | OBS_WEBSOCKET_OUTPUT_STARTED | 5.0.0 | no | The input has started. |
| OBS_WEBSOCKET_OUTPUT_STOPPING | OBS_WEBSOCKET_OUTPUT_STOPPING | 5.0.0 | no | The output is stopping. |
| OBS_WEBSOCKET_OUTPUT_STOPPED | OBS_WEBSOCKET_OUTPUT_STOPPED | 5.0.0 | no | The output has stopped. |
| OBS_WEBSOCKET_OUTPUT_RECONNECTING | OBS_WEBSOCKET_OUTPUT_RECONNECTING | 5.0.0 | no | The output has disconnected and is reconnecting. |
| OBS_WEBSOCKET_OUTPUT_RECONNECTED | OBS_WEBSOCKET_OUTPUT_RECONNECTED | 5.1.0 | no | The output has reconnected successfully. |
| OBS_WEBSOCKET_OUTPUT_PAUSED | OBS_WEBSOCKET_OUTPUT_PAUSED | 5.1.0 | no | The output is now paused. |
| OBS_WEBSOCKET_OUTPUT_RESUMED | OBS_WEBSOCKET_OUTPUT_RESUMED | 5.0.0 | no | The output has been resumed (unpaused). |

### ObsMediaInputAction

| Identifier | Value | Version | Deprecated | Description |
| --- | --- | --- | --- | --- |
| OBS_WEBSOCKET_MEDIA_INPUT_ACTION_NONE | OBS_WEBSOCKET_MEDIA_INPUT_ACTION_NONE | 5.0.0 | no | No action. |
| OBS_WEBSOCKET_MEDIA_INPUT_ACTION_PLAY | OBS_WEBSOCKET_MEDIA_INPUT_ACTION_PLAY | 5.0.0 | no | Play the media input. |
| OBS_WEBSOCKET_MEDIA_INPUT_ACTION_PAUSE | OBS_WEBSOCKET_MEDIA_INPUT_ACTION_PAUSE | 5.0.0 | no | Pause the media input. |
| OBS_WEBSOCKET_MEDIA_INPUT_ACTION_STOP | OBS_WEBSOCKET_MEDIA_INPUT_ACTION_STOP | 5.0.0 | no | Stop the media input. |
| OBS_WEBSOCKET_MEDIA_INPUT_ACTION_RESTART | OBS_WEBSOCKET_MEDIA_INPUT_ACTION_RESTART | 5.0.0 | no | Restart the media input. |
| OBS_WEBSOCKET_MEDIA_INPUT_ACTION_NEXT | OBS_WEBSOCKET_MEDIA_INPUT_ACTION_NEXT | 5.0.0 | no | Go to the next playlist item. |
| OBS_WEBSOCKET_MEDIA_INPUT_ACTION_PREVIOUS | OBS_WEBSOCKET_MEDIA_INPUT_ACTION_PREVIOUS | 5.0.0 | no | Go to the previous playlist item. |

### WebSocketCloseCode

| Identifier | Value | Version | Deprecated | Description |
| --- | --- | --- | --- | --- |
| DontClose | 0 | 5.0.0 | no | For internal use only to tell the request handler not to perform any close action. |
| UnknownReason | 4000 | 5.0.0 | no | Unknown reason, should never be used. |
| MessageDecodeError | 4002 | 5.0.0 | no | The server was unable to decode the incoming websocket message. |
| MissingDataField | 4003 | 5.0.0 | no | A data field is required but missing from the payload. |
| InvalidDataFieldType | 4004 | 5.0.0 | no | A data field's value type is invalid. |
| InvalidDataFieldValue | 4005 | 5.0.0 | no | A data field's value is invalid. |
| UnknownOpCode | 4006 | 5.0.0 | no | The specified `op` was invalid or missing. |
| NotIdentified | 4007 | 5.0.0 | no | The client sent a websocket message without first sending `Identify` message. |
| AlreadyIdentified | 4008 | 5.0.0 | no | The client sent an `Identify` message while already identified. |
| AuthenticationFailed | 4009 | 5.0.0 | no | The authentication attempt (via `Identify`) failed. |
| UnsupportedRpcVersion | 4010 | 5.0.0 | no | The server detected the usage of an old version of the obs-websocket RPC protocol. |
| SessionInvalidated | 4011 | 5.0.0 | no | The websocket session has been invalidated by the obs-websocket server. |
| UnsupportedFeature | 4012 | 5.0.0 | no | A requested feature is not supported due to hardware/software limitations. |

### WebSocketOpCode

| Identifier | Value | Version | Deprecated | Description |
| --- | --- | --- | --- | --- |
| Hello | 0 | 5.0.0 | no | The initial message sent by obs-websocket to newly connected clients. |
| Identify | 1 | 5.0.0 | no | The message sent by a newly connected client to obs-websocket in response to a `Hello`. |
| Identified | 2 | 5.0.0 | no | The response sent by obs-websocket to a client after it has successfully identified with obs-websocket. |
| Reidentify | 3 | 5.0.0 | no | The message sent by an already-identified client to update identification parameters. |
| Event | 5 | 5.0.0 | no | The message sent by obs-websocket containing an event payload. |
| Request | 6 | 5.0.0 | no | The message sent by a client to obs-websocket to perform a request. |
| RequestResponse | 7 | 5.0.0 | no | The message sent by obs-websocket in response to a particular request from a client. |
| RequestBatch | 8 | 5.0.0 | no | The message sent by a client to obs-websocket to perform a batch of requests. |
| RequestBatchResponse | 9 | 5.0.0 | no | The message sent by obs-websocket in response to a particular batch of requests from a client. |

## Requests By Category

### canvases

| Request | Version | Deprecated | Complexity | Request fields | Response fields | Description |
| --- | --- | --- | ---: | --- | --- | --- |
| GetCanvasList | 5.7.0 | no | 3 | - | canvases: Array<Object> | Gets an array of canvases in OBS. |

### config

| Request | Version | Deprecated | Complexity | Request fields | Response fields | Description |
| --- | --- | --- | ---: | --- | --- | --- |
| CreateProfile | 5.0.0 | no | 1 | profileName: String | - | Creates a new profile, switching to it in the process |
| CreateSceneCollection | 5.0.0 | no | 1 | sceneCollectionName: String | - | Creates a new scene collection, switching to it in the process. |
| GetPersistentData | 5.0.0 | no | 2 | realm: String<br>slotName: String | slotValue: Any | Gets the value of a "slot" from the selected persistent data realm. |
| GetProfileList | 5.0.0 | no | 1 | - | currentProfileName: String<br>profiles: Array<String> | Gets an array of all profiles |
| GetProfileParameter | 5.0.0 | no | 4 | parameterCategory: String<br>parameterName: String | parameterValue: String<br>defaultParameterValue: String | Gets a parameter from the current profile's configuration. |
| GetRecordDirectory | 5.0.0 | no | 2 | - | recordDirectory: String | Gets the current directory that the record output is set to. |
| GetSceneCollectionList | 5.0.0 | no | 1 | - | currentSceneCollectionName: String<br>sceneCollections: Array<String> | Gets an array of all scene collections |
| GetStreamServiceSettings | 5.0.0 | no | 4 | - | streamServiceType: String<br>streamServiceSettings: Object | Gets the current stream service settings (stream destination). |
| GetVideoSettings | 5.0.0 | no | 2 | - | fpsNumerator: Number<br>fpsDenominator: Number<br>baseWidth: Number<br>baseHeight: Number<br>outputWidth: Number<br>outputHeight: Number | Gets the current video settings. |
| RemoveProfile | 5.0.0 | no | 1 | profileName: String | - | Removes a profile. If the current profile is chosen, it will change to a different profile first. |
| SetCurrentProfile | 5.0.0 | no | 1 | profileName: String | - | Switches to a profile. |
| SetCurrentSceneCollection | 5.0.0 | no | 1 | sceneCollectionName: String | - | Switches to a scene collection. |
| SetPersistentData | 5.0.0 | no | 2 | realm: String<br>slotName: String<br>slotValue: Any | - | Sets the value of a "slot" from the selected persistent data realm. |
| SetProfileParameter | 5.0.0 | no | 4 | parameterCategory: String<br>parameterName: String<br>parameterValue: String | - | Sets the value of a parameter in the current profile's configuration. |
| SetRecordDirectory | 5.3.0 | no | 2 | recordDirectory: String | - | Sets the current directory that the record output writes files to. |
| SetStreamServiceSettings | 5.0.0 | no | 4 | streamServiceType: String<br>streamServiceSettings: Object | - | Sets the current stream service settings (stream destination). |
| SetVideoSettings | 5.0.0 | no | 2 | fpsNumerator: Number<br>fpsDenominator: Number<br>baseWidth: Number<br>baseHeight: Number<br>outputWidth: Number<br>outputHeight: Number | - | Sets the current video settings. |

### filters

| Request | Version | Deprecated | Complexity | Request fields | Response fields | Description |
| --- | --- | --- | ---: | --- | --- | --- |
| CreateSourceFilter | 5.0.0 | no | 3 | canvasUuid: String<br>sourceName: String<br>sourceUuid: String<br>filterName: String<br>filterKind: String<br>filterSettings: Object | - | Creates a new filter, adding it to the specified source. |
| GetSourceFilter | 5.0.0 | no | 2 | canvasUuid: String<br>sourceName: String<br>sourceUuid: String<br>filterName: String | filterEnabled: Boolean<br>filterIndex: Number<br>filterKind: String<br>filterSettings: Object | Gets the info for a specific source filter. |
| GetSourceFilterDefaultSettings | 5.0.0 | no | 3 | filterKind: String | defaultFilterSettings: Object | Gets the default settings for a filter kind. |
| GetSourceFilterKindList | 5.4.0 | no | 2 | - | sourceFilterKinds: Array<String> | Gets an array of all available source filter kinds. |
| GetSourceFilterList | 5.0.0 | no | 2 | canvasUuid: String<br>sourceName: String<br>sourceUuid: String | filters: Array<Object> | Gets an array of all of a source's filters. |
| RemoveSourceFilter | 5.0.0 | no | 2 | canvasUuid: String<br>sourceName: String<br>sourceUuid: String<br>filterName: String | - | Removes a filter from a source. |
| SetSourceFilterEnabled | 5.0.0 | no | 3 | canvasUuid: String<br>sourceName: String<br>sourceUuid: String<br>filterName: String<br>filterEnabled: Boolean | - | Sets the enable state of a source filter. |
| SetSourceFilterIndex | 5.0.0 | no | 3 | canvasUuid: String<br>sourceName: String<br>sourceUuid: String<br>filterName: String<br>filterIndex: Number | - | Sets the index position of a filter on a source. |
| SetSourceFilterName | 5.0.0 | no | 2 | canvasUuid: String<br>sourceName: String<br>sourceUuid: String<br>filterName: String<br>newFilterName: String | - | Sets the name of a source filter (rename). |
| SetSourceFilterSettings | 5.0.0 | no | 3 | canvasUuid: String<br>sourceName: String<br>sourceUuid: String<br>filterName: String<br>filterSettings: Object<br>overlay: Boolean | - | Sets the settings of a source filter. |

### general

| Request | Version | Deprecated | Complexity | Request fields | Response fields | Description |
| --- | --- | --- | ---: | --- | --- | --- |
| BroadcastCustomEvent | 5.0.0 | no | 1 | eventData: Object | - | Broadcasts a `CustomEvent` to all WebSocket clients. Receivers are clients which are identified and subscribed. |
| CallVendorRequest | 5.0.0 | no | 3 | vendorName: String<br>requestType: String<br>requestData: Object | vendorName: String<br>requestType: String<br>responseData: Object | Call a request registered to a vendor. |
| GetHotkeyList | 5.0.0 | no | 4 | - | hotkeys: Array<String> | Gets an array of all hotkey names in OBS. |
| GetStats | 5.0.0 | no | 2 | - | cpuUsage: Number<br>memoryUsage: Number<br>availableDiskSpace: Number<br>activeFps: Number<br>averageFrameRenderTime: Number<br>renderSkippedFrames: Number<br>renderTotalFrames: Number<br>outputSkippedFrames: Number<br>outputTotalFrames: Number<br>webSocketSessionIncomingMessages: Number<br>webSocketSessionOutgoingMessages: Number | Gets statistics about OBS, obs-websocket, and the current session. |
| GetVersion | 5.0.0 | no | 1 | - | obsVersion: String<br>obsWebSocketVersion: String<br>rpcVersion: Number<br>availableRequests: Array<String><br>supportedImageFormats: Array<String><br>platform: String<br>platformDescription: String | Gets data about the current plugin and RPC version. |
| Sleep | 5.0.0 | no | 2 | sleepMillis: Number<br>sleepFrames: Number | - | Sleeps for a time duration or number of frames. Only available in request batches with types `SERIAL_REALTIME` or `SERIAL_FRAME`. |
| TriggerHotkeyByKeySequence | 5.0.0 | no | 4 | keyId: String<br>keyModifiers: Object<br>keyModifiers.shift: Boolean<br>keyModifiers.control: Boolean<br>keyModifiers.alt: Boolean<br>keyModifiers.command: Boolean | - | Triggers a hotkey using a sequence of keys. |
| TriggerHotkeyByName | 5.0.0 | no | 4 | hotkeyName: String<br>contextName: String | - | Triggers a hotkey using its name. See `GetHotkeyList`. |

### inputs

| Request | Version | Deprecated | Complexity | Request fields | Response fields | Description |
| --- | --- | --- | ---: | --- | --- | --- |
| CreateInput | 5.0.0 | no | 3 | canvasUuid: String<br>sceneName: String<br>sceneUuid: String<br>inputName: String<br>inputKind: String<br>inputSettings: Object<br>sceneItemEnabled: Boolean | inputUuid: String<br>sceneItemId: Number | Creates a new input, adding it as a scene item to the specified scene. |
| GetInputAudioBalance | 5.0.0 | no | 2 | inputName: String<br>inputUuid: String | inputAudioBalance: Number | Gets the audio balance of an input. |
| GetInputAudioMonitorType | 5.0.0 | no | 2 | inputName: String<br>inputUuid: String | monitorType: String | Gets the audio monitor type of an input. |
| GetInputAudioSyncOffset | 5.0.0 | no | 3 | inputName: String<br>inputUuid: String | inputAudioSyncOffset: Number | Gets the audio sync offset of an input. |
| GetInputAudioTracks | 5.0.0 | no | 2 | inputName: String<br>inputUuid: String | inputAudioTracks: Object | Gets the enable state of all audio tracks of an input. |
| GetInputDefaultSettings | 5.0.0 | no | 3 | inputKind: String | defaultInputSettings: Object | Gets the default settings for an input kind. |
| GetInputDeinterlaceFieldOrder | 5.6.0 | no | 2 | inputName: String<br>inputUuid: String | inputDeinterlaceFieldOrder: String | Gets the deinterlace field order of an input. |
| GetInputDeinterlaceMode | 5.6.0 | no | 2 | inputName: String<br>inputUuid: String | inputDeinterlaceMode: String | Gets the deinterlace mode of an input. |
| GetInputKindList | 5.0.0 | no | 2 | unversioned: Boolean | inputKinds: Array<String> | Gets an array of all available input kinds in OBS. |
| GetInputList | 5.0.0 | no | 2 | inputKind: String | inputs: Array<Object> | Gets an array of all inputs in OBS. |
| GetInputMute | 5.0.0 | no | 2 | inputName: String<br>inputUuid: String | inputMuted: Boolean | Gets the audio mute state of an input. |
| GetInputPropertiesListPropertyItems | 5.0.0 | no | 4 | inputName: String<br>inputUuid: String<br>propertyName: String | propertyItems: Array<Object> | Gets the items of a list property from an input's properties. |
| GetInputSettings | 5.0.0 | no | 3 | inputName: String<br>inputUuid: String | inputSettings: Object<br>inputKind: String | Gets the settings of an input. |
| GetInputVolume | 5.0.0 | no | 3 | inputName: String<br>inputUuid: String | inputVolumeMul: Number<br>inputVolumeDb: Number | Gets the current volume setting of an input. |
| GetSpecialInputs | 5.0.0 | no | 2 | - | desktop1: String<br>desktop2: String<br>mic1: String<br>mic2: String<br>mic3: String<br>mic4: String | Gets the names of all special inputs. |
| PressInputPropertiesButton | 5.0.0 | no | 4 | inputName: String<br>inputUuid: String<br>propertyName: String | - | Presses a button in the properties of an input. |
| RemoveInput | 5.0.0 | no | 2 | inputName: String<br>inputUuid: String | - | Removes an existing input. |
| SetInputAudioBalance | 5.0.0 | no | 2 | inputName: String<br>inputUuid: String<br>inputAudioBalance: Number | - | Sets the audio balance of an input. |
| SetInputAudioMonitorType | 5.0.0 | no | 2 | inputName: String<br>inputUuid: String<br>monitorType: String | - | Sets the audio monitor type of an input. |
| SetInputAudioSyncOffset | 5.0.0 | no | 3 | inputName: String<br>inputUuid: String<br>inputAudioSyncOffset: Number | - | Sets the audio sync offset of an input. |
| SetInputAudioTracks | 5.0.0 | no | 2 | inputName: String<br>inputUuid: String<br>inputAudioTracks: Object | - | Sets the enable state of audio tracks of an input. |
| SetInputDeinterlaceFieldOrder | 5.6.0 | no | 2 | inputName: String<br>inputUuid: String<br>inputDeinterlaceFieldOrder: String | - | Sets the deinterlace field order of an input. |
| SetInputDeinterlaceMode | 5.6.0 | no | 2 | inputName: String<br>inputUuid: String<br>inputDeinterlaceMode: String | - | Sets the deinterlace mode of an input. |
| SetInputMute | 5.0.0 | no | 2 | inputName: String<br>inputUuid: String<br>inputMuted: Boolean | - | Sets the audio mute state of an input. |
| SetInputName | 5.0.0 | no | 2 | inputName: String<br>inputUuid: String<br>newInputName: String | - | Sets the name of an input (rename). |
| SetInputSettings | 5.0.0 | no | 3 | inputName: String<br>inputUuid: String<br>inputSettings: Object<br>overlay: Boolean | - | Sets the settings of an input. |
| SetInputVolume | 5.0.0 | no | 3 | inputName: String<br>inputUuid: String<br>inputVolumeMul: Number<br>inputVolumeDb: Number | - | Sets the volume setting of an input. |
| ToggleInputMute | 5.0.0 | no | 2 | inputName: String<br>inputUuid: String | inputMuted: Boolean | Toggles the audio mute state of an input. |

### media inputs

| Request | Version | Deprecated | Complexity | Request fields | Response fields | Description |
| --- | --- | --- | ---: | --- | --- | --- |
| GetMediaInputStatus | 5.0.0 | no | 2 | inputName: String<br>inputUuid: String | mediaState: String<br>mediaDuration: Number<br>mediaCursor: Number | Gets the status of a media input. |
| OffsetMediaInputCursor | 5.0.0 | no | 2 | inputName: String<br>inputUuid: String<br>mediaCursorOffset: Number | - | Offsets the current cursor position of a media input by the specified value. |
| SetMediaInputCursor | 5.0.0 | no | 2 | inputName: String<br>inputUuid: String<br>mediaCursor: Number | - | Sets the cursor position of a media input. |
| TriggerMediaInputAction | 5.0.0 | no | 2 | inputName: String<br>inputUuid: String<br>mediaAction: String | - | Triggers an action on a media input. |

### outputs

| Request | Version | Deprecated | Complexity | Request fields | Response fields | Description |
| --- | --- | --- | ---: | --- | --- | --- |
| GetLastReplayBufferReplay | 5.0.0 | no | 2 | - | savedReplayPath: String | Gets the filename of the last replay buffer save file. |
| GetOutputList | 5.0.0 | no | 4 | - | outputs: Array<Object> | Gets the list of available outputs. |
| GetOutputSettings | 5.0.0 | no | 4 | outputName: String | outputSettings: Object | Gets the settings of an output. |
| GetOutputStatus | 5.0.0 | no | 4 | outputName: String | outputActive: Boolean<br>outputReconnecting: Boolean<br>outputTimecode: String<br>outputDuration: Number<br>outputCongestion: Number<br>outputBytes: Number<br>outputSkippedFrames: Number<br>outputTotalFrames: Number | Gets the status of an output. |
| GetReplayBufferStatus | 5.0.0 | no | 1 | - | outputActive: Boolean | Gets the status of the replay buffer output. |
| GetVirtualCamStatus | 5.0.0 | no | 1 | - | outputActive: Boolean | Gets the status of the virtualcam output. |
| SaveReplayBuffer | 5.0.0 | no | 1 | - | - | Saves the contents of the replay buffer output. |
| SetOutputSettings | 5.0.0 | no | 4 | outputName: String<br>outputSettings: Object | - | Sets the settings of an output. |
| StartOutput | 5.0.0 | no | 4 | outputName: String | - | Starts an output. |
| StartReplayBuffer | 5.0.0 | no | 1 | - | - | Starts the replay buffer output. |
| StartVirtualCam | 5.0.0 | no | 1 | - | - | Starts the virtualcam output. |
| StopOutput | 5.0.0 | no | 4 | outputName: String | - | Stops an output. |
| StopReplayBuffer | 5.0.0 | no | 1 | - | - | Stops the replay buffer output. |
| StopVirtualCam | 5.0.0 | no | 1 | - | - | Stops the virtualcam output. |
| ToggleOutput | 5.0.0 | no | 4 | outputName: String | outputActive: Boolean | Toggles the status of an output. |
| ToggleReplayBuffer | 5.0.0 | no | 1 | - | outputActive: Boolean | Toggles the state of the replay buffer output. |
| ToggleVirtualCam | 5.0.0 | no | 1 | - | outputActive: Boolean | Toggles the state of the virtualcam output. |

### record

| Request | Version | Deprecated | Complexity | Request fields | Response fields | Description |
| --- | --- | --- | ---: | --- | --- | --- |
| CreateRecordChapter | 5.5.0 | no | 2 | chapterName: String | - | Adds a new chapter marker to the file currently being recorded. |
| GetRecordStatus | 5.0.0 | no | 2 | - | outputActive: Boolean<br>outputPaused: Boolean<br>outputTimecode: String<br>outputDuration: Number<br>outputBytes: Number | Gets the status of the record output. |
| PauseRecord | 5.0.0 | no | 1 | - | - | Pauses the record output. |
| ResumeRecord | 5.0.0 | no | 1 | - | - | Resumes the record output. |
| SplitRecordFile | 5.5.0 | no | 2 | - | - | Splits the current file being recorded into a new file. |
| StartRecord | 5.0.0 | no | 1 | - | - | Starts the record output. |
| StopRecord | 5.0.0 | no | 1 | - | outputPath: String | Stops the record output. |
| ToggleRecord | 5.0.0 | no | 1 | - | outputActive: Boolean | Toggles the status of the record output. |
| ToggleRecordPause | 5.0.0 | no | 1 | - | - | Toggles pause on the record output. |

### scene items

| Request | Version | Deprecated | Complexity | Request fields | Response fields | Description |
| --- | --- | --- | ---: | --- | --- | --- |
| CreateSceneItem | 5.0.0 | no | 3 | canvasUuid: String<br>sceneName: String<br>sceneUuid: String<br>sourceName: String<br>sourceUuid: String<br>sceneItemEnabled: Boolean | sceneItemId: Number | Creates a new scene item using a source. |
| DuplicateSceneItem | 5.0.0 | no | 3 | canvasUuid: String<br>sceneName: String<br>sceneUuid: String<br>sceneItemId: Number<br>destinationSceneName: String<br>destinationSceneUuid: String | sceneItemId: Number | Duplicates a scene item, copying all transform and crop info. |
| GetGroupSceneItemList | 5.0.0 | no | 3 | canvasUuid: String<br>sceneName: String<br>sceneUuid: String | sceneItems: Array<Object> | Basically GetSceneItemList, but for groups. |
| GetSceneItemBlendMode | 5.0.0 | no | 2 | canvasUuid: String<br>sceneName: String<br>sceneUuid: String<br>sceneItemId: Number | sceneItemBlendMode: String | Gets the blend mode of a scene item. |
| GetSceneItemEnabled | 5.0.0 | no | 3 | canvasUuid: String<br>sceneName: String<br>sceneUuid: String<br>sceneItemId: Number | sceneItemEnabled: Boolean | Gets the enable state of a scene item. |
| GetSceneItemId | 5.0.0 | no | 3 | canvasUuid: String<br>sceneName: String<br>sceneUuid: String<br>sourceName: String<br>searchOffset: Number | sceneItemId: Number | Searches a scene for a source, and returns its id. |
| GetSceneItemIndex | 5.0.0 | no | 3 | canvasUuid: String<br>sceneName: String<br>sceneUuid: String<br>sceneItemId: Number | sceneItemIndex: Number | Gets the index position of a scene item in a scene. |
| GetSceneItemList | 5.0.0 | no | 3 | canvasUuid: String<br>sceneName: String<br>sceneUuid: String | sceneItems: Array<Object> | Gets a list of all scene items in a scene. |
| GetSceneItemLocked | 5.0.0 | no | 3 | canvasUuid: String<br>sceneName: String<br>sceneUuid: String<br>sceneItemId: Number | sceneItemLocked: Boolean | Gets the lock state of a scene item. |
| GetSceneItemSource | 5.4.0 | no | 3 | canvasUuid: String<br>sceneName: String<br>sceneUuid: String<br>sceneItemId: Number | sourceName: String<br>sourceUuid: String | Gets the source associated with a scene item. |
| GetSceneItemTransform | 5.0.0 | no | 3 | canvasUuid: String<br>sceneName: String<br>sceneUuid: String<br>sceneItemId: Number | sceneItemTransform: Object | Gets the transform and crop info of a scene item. |
| RemoveSceneItem | 5.0.0 | no | 3 | canvasUuid: String<br>sceneName: String<br>sceneUuid: String<br>sceneItemId: Number | - | Removes a scene item from a scene. |
| SetSceneItemBlendMode | 5.0.0 | no | 2 | canvasUuid: String<br>sceneName: String<br>sceneUuid: String<br>sceneItemId: Number<br>sceneItemBlendMode: String | - | Sets the blend mode of a scene item. |
| SetSceneItemEnabled | 5.0.0 | no | 3 | canvasUuid: String<br>sceneName: String<br>sceneUuid: String<br>sceneItemId: Number<br>sceneItemEnabled: Boolean | - | Sets the enable state of a scene item. |
| SetSceneItemIndex | 5.0.0 | no | 3 | canvasUuid: String<br>sceneName: String<br>sceneUuid: String<br>sceneItemId: Number<br>sceneItemIndex: Number | - | Sets the index position of a scene item in a scene. |
| SetSceneItemLocked | 5.0.0 | no | 3 | canvasUuid: String<br>sceneName: String<br>sceneUuid: String<br>sceneItemId: Number<br>sceneItemLocked: Boolean | - | Sets the lock state of a scene item. |
| SetSceneItemTransform | 5.0.0 | no | 3 | canvasUuid: String<br>sceneName: String<br>sceneUuid: String<br>sceneItemId: Number<br>sceneItemTransform: Object | - | Sets the transform and crop info of a scene item. |

### scenes

| Request | Version | Deprecated | Complexity | Request fields | Response fields | Description |
| --- | --- | --- | ---: | --- | --- | --- |
| CreateScene | 5.0.0 | no | 2 | canvasUuid: String<br>sceneName: String | sceneUuid: String | Creates a new scene in OBS. |
| GetCurrentPreviewScene | 5.0.0 | no | 1 | - | sceneName: String<br>sceneUuid: String<br>currentPreviewSceneName: String<br>currentPreviewSceneUuid: String | Gets the current preview scene. |
| GetCurrentProgramScene | 5.0.0 | no | 1 | - | sceneName: String<br>sceneUuid: String<br>currentProgramSceneName: String<br>currentProgramSceneUuid: String | Gets the current program scene. |
| GetGroupList | 5.0.0 | no | 2 | - | groups: Array<String> | Gets an array of all groups in OBS. |
| GetSceneList | 5.0.0 | no | 2 | canvasUuid: String | currentProgramSceneName: String<br>currentProgramSceneUuid: String<br>currentPreviewSceneName: String<br>currentPreviewSceneUuid: String<br>scenes: Array<Object> | Gets an array of scenes in OBS. |
| GetSceneSceneTransitionOverride | 5.0.0 | no | 2 | canvasUuid: String<br>sceneName: String<br>sceneUuid: String | transitionName: String<br>transitionDuration: Number | Gets the scene transition overridden for a scene. |
| RemoveScene | 5.0.0 | no | 2 | canvasUuid: String<br>sceneName: String<br>sceneUuid: String | - | Removes a scene from OBS. |
| SetCurrentPreviewScene | 5.0.0 | no | 1 | sceneName: String<br>sceneUuid: String | - | Sets the current preview scene. |
| SetCurrentProgramScene | 5.0.0 | no | 1 | sceneName: String<br>sceneUuid: String | - | Sets the current program scene. |
| SetSceneName | 5.0.0 | no | 2 | canvasUuid: String<br>sceneName: String<br>sceneUuid: String<br>newSceneName: String | - | Sets the name of a scene (rename). |
| SetSceneSceneTransitionOverride | 5.0.0 | no | 2 | canvasUuid: String<br>sceneName: String<br>sceneUuid: String<br>transitionName: String<br>transitionDuration: Number | - | Sets the scene transition overridden for a scene. |

### sources

| Request | Version | Deprecated | Complexity | Request fields | Response fields | Description |
| --- | --- | --- | ---: | --- | --- | --- |
| GetSourceActive | 5.0.0 | no | 2 | canvasUuid: String<br>sourceName: String<br>sourceUuid: String | videoActive: Boolean<br>videoShowing: Boolean | Gets the active and show state of a source. |
| GetSourceScreenshot | 5.0.0 | no | 4 | canvasUuid: String<br>sourceName: String<br>sourceUuid: String<br>imageFormat: String<br>imageWidth: Number<br>imageHeight: Number<br>imageCompressionQuality: Number | imageData: String | Gets a Base64-encoded screenshot of a source. |
| SaveSourceScreenshot | 5.0.0 | no | 3 | canvasUuid: String<br>sourceName: String<br>sourceUuid: String<br>imageFormat: String<br>imageFilePath: String<br>imageWidth: Number<br>imageHeight: Number<br>imageCompressionQuality: Number | - | Saves a screenshot of a source to the filesystem. |

### stream

| Request | Version | Deprecated | Complexity | Request fields | Response fields | Description |
| --- | --- | --- | ---: | --- | --- | --- |
| GetStreamStatus | 5.0.0 | no | 2 | - | outputActive: Boolean<br>outputReconnecting: Boolean<br>outputTimecode: String<br>outputDuration: Number<br>outputCongestion: Number<br>outputBytes: Number<br>outputSkippedFrames: Number<br>outputTotalFrames: Number | Gets the status of the stream output. |
| SendStreamCaption | 5.0.0 | no | 2 | captionText: String | - | Sends CEA-608 caption text over the stream output. |
| StartStream | 5.0.0 | no | 1 | - | - | Starts the stream output. |
| StopStream | 5.0.0 | no | 1 | - | - | Stops the stream output. |
| ToggleStream | 5.0.0 | no | 1 | - | outputActive: Boolean | Toggles the status of the stream output. |

### transitions

| Request | Version | Deprecated | Complexity | Request fields | Response fields | Description |
| --- | --- | --- | ---: | --- | --- | --- |
| GetCurrentSceneTransition | 5.0.0 | no | 2 | - | transitionName: String<br>transitionUuid: String<br>transitionKind: String<br>transitionFixed: Boolean<br>transitionDuration: Number<br>transitionConfigurable: Boolean<br>transitionSettings: Object | Gets information about the current scene transition. |
| GetCurrentSceneTransitionCursor | 5.0.0 | no | 2 | - | transitionCursor: Number | Gets the cursor position of the current scene transition. |
| GetSceneTransitionList | 5.0.0 | no | 3 | - | currentSceneTransitionName: String<br>currentSceneTransitionUuid: String<br>currentSceneTransitionKind: String<br>transitions: Array<Object> | Gets an array of all scene transitions in OBS. |
| GetTransitionKindList | 5.0.0 | no | 2 | - | transitionKinds: Array<String> | Gets an array of all available transition kinds. |
| SetCurrentSceneTransition | 5.0.0 | no | 2 | transitionName: String | - | Sets the current scene transition. |
| SetCurrentSceneTransitionDuration | 5.0.0 | no | 2 | transitionDuration: Number | - | Sets the duration of the current scene transition, if it is not fixed. |
| SetCurrentSceneTransitionSettings | 5.0.0 | no | 3 | transitionSettings: Object<br>overlay: Boolean | - | Sets the settings of the current scene transition. |
| SetTBarPosition | 5.0.0 | no | 3 | position: Number<br>release: Boolean | - | Sets the position of the TBar. |
| TriggerStudioModeTransition | 5.0.0 | no | 1 | - | - | Triggers the current scene transition. Same functionality as the `Transition` button in studio mode. |

### ui

| Request | Version | Deprecated | Complexity | Request fields | Response fields | Description |
| --- | --- | --- | ---: | --- | --- | --- |
| GetMonitorList | 5.0.0 | no | 2 | - | monitors: Array<Object> | Gets a list of connected monitors and information about them. |
| GetStudioModeEnabled | 5.0.0 | no | 1 | - | studioModeEnabled: Boolean | Gets whether studio is enabled. |
| OpenInputFiltersDialog | 5.0.0 | no | 1 | inputName: String<br>inputUuid: String | - | Opens the filters dialog of an input. |
| OpenInputInteractDialog | 5.0.0 | no | 1 | inputName: String<br>inputUuid: String | - | Opens the interact dialog of an input. |
| OpenInputPropertiesDialog | 5.0.0 | no | 1 | inputName: String<br>inputUuid: String | - | Opens the properties dialog of an input. |
| OpenSourceProjector | 5.0.0 | no | 3 | canvasUuid: String<br>sourceName: String<br>sourceUuid: String<br>monitorIndex: Number<br>projectorGeometry: String | - | Opens a projector for a source. |
| OpenVideoMixProjector | 5.0.0 | no | 3 | videoMixType: String<br>monitorIndex: Number<br>projectorGeometry: String | - | Opens a projector for a specific output video mix. |
| SetStudioModeEnabled | 5.0.0 | no | 1 | studioModeEnabled: Boolean | - | Enables or disables studio mode |

## Events By Category

### canvases

| Event | Subscription | Version | Deprecated | Complexity | Data fields | Description |
| --- | --- | --- | --- | ---: | --- | --- |
| CanvasCreated | Canvases | 5.7.0 | no | 2 | canvasName: String<br>canvasUuid: String | A new canvas has been created. |
| CanvasNameChanged | Canvases | 5.7.0 | no | 2 | canvasUuid: String<br>oldCanvasName: String<br>canvasName: String | The name of a canvas has changed. |
| CanvasRemoved | Canvases | 5.7.0 | no | 2 | canvasName: String<br>canvasUuid: String | A canvas has been removed. |

### config

| Event | Subscription | Version | Deprecated | Complexity | Data fields | Description |
| --- | --- | --- | --- | ---: | --- | --- |
| CurrentProfileChanged | Config | 5.0.0 | no | 1 | profileName: String | The current profile has changed. |
| CurrentProfileChanging | Config | 5.0.0 | no | 1 | profileName: String | The current profile has begun changing. |
| CurrentSceneCollectionChanged | Config | 5.0.0 | no | 1 | sceneCollectionName: String | The current scene collection has changed. |
| CurrentSceneCollectionChanging | Config | 5.0.0 | no | 1 | sceneCollectionName: String | The current scene collection has begun changing. |
| ProfileListChanged | Config | 5.0.0 | no | 1 | profiles: Array<String> | The profile list has changed. |
| SceneCollectionListChanged | Config | 5.0.0 | no | 1 | sceneCollections: Array<String> | The scene collection list has changed. |

### filters

| Event | Subscription | Version | Deprecated | Complexity | Data fields | Description |
| --- | --- | --- | --- | ---: | --- | --- |
| SourceFilterCreated | Filters | 5.0.0 | no | 2 | sourceName: String<br>filterName: String<br>filterKind: String<br>filterIndex: Number<br>filterSettings: Object<br>defaultFilterSettings: Object | A filter has been added to a source. |
| SourceFilterEnableStateChanged | Filters | 5.0.0 | no | 3 | sourceName: String<br>filterName: String<br>filterEnabled: Boolean | A source filter's enable state has changed. |
| SourceFilterListReindexed | Filters | 5.0.0 | no | 3 | sourceName: String<br>filters: Array<Object> | A source's filter list has been reindexed. |
| SourceFilterNameChanged | Filters | 5.0.0 | no | 2 | sourceName: String<br>oldFilterName: String<br>filterName: String | The name of a source filter has changed. |
| SourceFilterRemoved | Filters | 5.0.0 | no | 2 | sourceName: String<br>filterName: String | A filter has been removed from a source. |
| SourceFilterSettingsChanged | Filters | 5.4.0 | no | 3 | sourceName: String<br>filterName: String<br>filterSettings: Object | An source filter's settings have changed (been updated). |

### general

| Event | Subscription | Version | Deprecated | Complexity | Data fields | Description |
| --- | --- | --- | --- | ---: | --- | --- |
| CustomEvent | General | 5.0.0 | no | 1 | eventData: Object | Custom event emitted by `BroadcastCustomEvent`. |
| ExitStarted | General | 5.0.0 | no | 1 | - | OBS has begun the shutdown process. |
| VendorEvent | Vendors | 5.0.0 | no | 3 | vendorName: String<br>eventType: String<br>eventData: Object | An event has been emitted from a vendor. |

### inputs

| Event | Subscription | Version | Deprecated | Complexity | Data fields | Description |
| --- | --- | --- | --- | ---: | --- | --- |
| InputActiveStateChanged | InputActiveStateChanged | 5.0.0 | no | 3 | inputName: String<br>inputUuid: String<br>videoActive: Boolean | An input's active state has changed. |
| InputAudioBalanceChanged | Inputs | 5.0.0 | no | 2 | inputName: String<br>inputUuid: String<br>inputAudioBalance: Number | The audio balance value of an input has changed. |
| InputAudioMonitorTypeChanged | Inputs | 5.0.0 | no | 2 | inputName: String<br>inputUuid: String<br>monitorType: String | The monitor type of an input has changed. |
| InputAudioSyncOffsetChanged | Inputs | 5.0.0 | no | 3 | inputName: String<br>inputUuid: String<br>inputAudioSyncOffset: Number | The sync offset of an input has changed. |
| InputAudioTracksChanged | Inputs | 5.0.0 | no | 3 | inputName: String<br>inputUuid: String<br>inputAudioTracks: Object | The audio tracks of an input have changed. |
| InputCreated | Inputs | 5.0.0 | no | 2 | inputName: String<br>inputUuid: String<br>inputKind: String<br>unversionedInputKind: String<br>inputKindCaps: Number<br>inputSettings: Object<br>defaultInputSettings: Object | An input has been created. |
| InputMuteStateChanged | Inputs | 5.0.0 | no | 2 | inputName: String<br>inputUuid: String<br>inputMuted: Boolean | An input's mute state has changed. |
| InputNameChanged | Inputs | 5.0.0 | no | 2 | inputUuid: String<br>oldInputName: String<br>inputName: String | The name of an input has changed. |
| InputRemoved | Inputs | 5.0.0 | no | 2 | inputName: String<br>inputUuid: String | An input has been removed. |
| InputSettingsChanged | Inputs | 5.4.0 | no | 3 | inputName: String<br>inputUuid: String<br>inputSettings: Object | An input's settings have changed (been updated). |
| InputShowStateChanged | InputShowStateChanged | 5.0.0 | no | 3 | inputName: String<br>inputUuid: String<br>videoShowing: Boolean | An input's show state has changed. |
| InputVolumeChanged | Inputs | 5.0.0 | no | 3 | inputName: String<br>inputUuid: String<br>inputVolumeMul: Number<br>inputVolumeDb: Number | An input's volume level has changed. |
| InputVolumeMeters | InputVolumeMeters | 5.0.0 | no | 4 | inputs: Array<Object> | A high-volume event providing volume levels of all active inputs every 50 milliseconds. |

### media inputs

| Event | Subscription | Version | Deprecated | Complexity | Data fields | Description |
| --- | --- | --- | --- | ---: | --- | --- |
| MediaInputActionTriggered | MediaInputs | 5.0.0 | no | 2 | inputName: String<br>inputUuid: String<br>mediaAction: String | An action has been performed on an input. |
| MediaInputPlaybackEnded | MediaInputs | 5.0.0 | no | 2 | inputName: String<br>inputUuid: String | A media input has finished playing. |
| MediaInputPlaybackStarted | MediaInputs | 5.0.0 | no | 2 | inputName: String<br>inputUuid: String | A media input has started playing. |

### outputs

| Event | Subscription | Version | Deprecated | Complexity | Data fields | Description |
| --- | --- | --- | --- | ---: | --- | --- |
| RecordFileChanged | Outputs | 5.5.0 | no | 2 | newOutputPath: String | The record output has started writing to a new file. For example, when a file split happens. |
| RecordStateChanged | Outputs | 5.0.0 | no | 2 | outputActive: Boolean<br>outputState: String<br>outputPath: String | The state of the record output has changed. |
| ReplayBufferSaved | Outputs | 5.0.0 | no | 2 | savedReplayPath: String | The replay buffer has been saved. |
| ReplayBufferStateChanged | Outputs | 5.0.0 | no | 2 | outputActive: Boolean<br>outputState: String | The state of the replay buffer output has changed. |
| StreamStateChanged | Outputs | 5.0.0 | no | 2 | outputActive: Boolean<br>outputState: String | The state of the stream output has changed. |
| VirtualcamStateChanged | Outputs | 5.0.0 | no | 2 | outputActive: Boolean<br>outputState: String | The state of the virtualcam output has changed. |

### scene items

| Event | Subscription | Version | Deprecated | Complexity | Data fields | Description |
| --- | --- | --- | --- | ---: | --- | --- |
| SceneItemCreated | SceneItems | 5.0.0 | no | 3 | sceneName: String<br>sceneUuid: String<br>sourceName: String<br>sourceUuid: String<br>sceneItemId: Number<br>sceneItemIndex: Number | A scene item has been created. |
| SceneItemEnableStateChanged | SceneItems | 5.0.0 | no | 3 | sceneName: String<br>sceneUuid: String<br>sceneItemId: Number<br>sceneItemEnabled: Boolean | A scene item's enable state has changed. |
| SceneItemListReindexed | SceneItems | 5.0.0 | no | 3 | sceneName: String<br>sceneUuid: String<br>sceneItems: Array<Object> | A scene's item list has been reindexed. |
| SceneItemLockStateChanged | SceneItems | 5.0.0 | no | 3 | sceneName: String<br>sceneUuid: String<br>sceneItemId: Number<br>sceneItemLocked: Boolean | A scene item's lock state has changed. |
| SceneItemRemoved | SceneItems | 5.0.0 | no | 3 | sceneName: String<br>sceneUuid: String<br>sourceName: String<br>sourceUuid: String<br>sceneItemId: Number | A scene item has been removed. |
| SceneItemSelected | SceneItems | 5.0.0 | no | 2 | sceneName: String<br>sceneUuid: String<br>sceneItemId: Number | A scene item has been selected in the Ui. |
| SceneItemTransformChanged | SceneItemTransformChanged | 5.0.0 | no | 4 | sceneName: String<br>sceneUuid: String<br>sceneItemId: Number<br>sceneItemTransform: Object | The transform/crop of a scene item has changed. |

### scenes

| Event | Subscription | Version | Deprecated | Complexity | Data fields | Description |
| --- | --- | --- | --- | ---: | --- | --- |
| CurrentPreviewSceneChanged | Scenes | 5.0.0 | no | 1 | sceneName: String<br>sceneUuid: String | The current preview scene has changed. |
| CurrentProgramSceneChanged | Scenes | 5.0.0 | no | 1 | sceneName: String<br>sceneUuid: String | The current program scene has changed. |
| SceneCreated | Scenes | 5.0.0 | no | 2 | sceneName: String<br>sceneUuid: String<br>isGroup: Boolean | A new scene has been created. |
| SceneListChanged | Scenes | 5.0.0 | no | 2 | scenes: Array<Object> | The list of scenes has changed. |
| SceneNameChanged | Scenes | 5.0.0 | no | 2 | sceneUuid: String<br>oldSceneName: String<br>sceneName: String | The name of a scene has changed. |
| SceneRemoved | Scenes | 5.0.0 | no | 2 | sceneName: String<br>sceneUuid: String<br>isGroup: Boolean | A scene has been removed. |

### transitions

| Event | Subscription | Version | Deprecated | Complexity | Data fields | Description |
| --- | --- | --- | --- | ---: | --- | --- |
| CurrentSceneTransitionChanged | Transitions | 5.0.0 | no | 2 | transitionName: String<br>transitionUuid: String | The current scene transition has changed. |
| CurrentSceneTransitionDurationChanged | Transitions | 5.0.0 | no | 2 | transitionDuration: Number | The current scene transition duration has changed. |
| SceneTransitionEnded | Transitions | 5.0.0 | no | 2 | transitionName: String<br>transitionUuid: String | A scene transition has completed fully. |
| SceneTransitionStarted | Transitions | 5.0.0 | no | 2 | transitionName: String<br>transitionUuid: String | A scene transition has started. |
| SceneTransitionVideoEnded | Transitions | 5.0.0 | no | 2 | transitionName: String<br>transitionUuid: String | A scene transition's video has completed fully. |

### ui

| Event | Subscription | Version | Deprecated | Complexity | Data fields | Description |
| --- | --- | --- | --- | ---: | --- | --- |
| ScreenshotSaved | Ui | 5.1.0 | no | 2 | savedScreenshotPath: String | A screenshot has been saved. |
| StudioModeStateChanged | Ui | 5.0.0 | no | 1 | studioModeEnabled: Boolean | Studio mode has been enabled or disabled. |

## Foundation Implications

- Future verticals should start by adding request descriptors in `src/obs/requests.ts`; the descriptor should name the official request, decode request data, decode response data, and supply capability gating for MCP tool exposure.
- Event support needs an explicit event subscription model before adding tools or resources that depend on events. The protocol has normal categories and high-volume event subscriptions; high-volume streams should be opt-in.
- Batch support is a separate protocol vertical, not a shortcut for raw request execution. `RequestBatchExecutionType` has realtime, frame-synchronized, and parallel semantics that must be modeled explicitly.
- Canvases are now first-class in the official protocol snapshot. Any future Scenes/SceneItems expansion should account for canvas-aware identity rather than assuming one global canvas.
- Vendor requests/events are official extension points. They should remain behind an explicit `vendor` or `raw` toolset, not enabled in the default LLM tool surface.

