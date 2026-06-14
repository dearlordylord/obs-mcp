# PRD: OBS Events Slice 5 - Input Audio Control Confirmation

Status: draft.

Date: 2026-06-13.

## Problem

The first four OBS event slices established a narrow event posture: events should confirm a specific workflow after a known cursor, not expose obs-websocket as a public event bus.

The next slice should cover input audio controls because the repository already has direct input tools for the same controls:

- `get_input_mute`, `set_input_mute`, and `toggle_input_mute`
- `get_input_volume` and `set_input_volume`
- `get_input_audio_balance` and `set_input_audio_balance`
- `get_input_audio_sync_offset` and `set_input_audio_sync_offset`
- `get_input_audio_tracks` and `set_input_audio_tracks`
- `get_input_audio_monitor_type` and `set_input_audio_monitor_type`

Those tools submit mutations or read current state. They do not let an agent confirm that OBS emitted the corresponding input audio event after the mutation. This slice should answer narrow questions:

- Did OBS report that a specific input became muted or unmuted after my cursor?
- Did OBS report a volume, balance, sync offset, audio track, or monitor type change after my cursor?
- Did the observed change match optional identity and value filters supplied by the caller?

The confirmation remains event-level. It does not replace the existing read tools as the authoritative final state surface.

## Goals

- Add workflow confirmation for existing input audio control tools.
- Reuse the existing event journal, cursor, timeout, and waiter cleanup semantics.
- Include only low-volume, typed-safe `Inputs` events that map directly to audio control workflows.
- Keep public inputs outcome-shaped and discriminated by supported workflow variants.
- Use exact public workflow input and summary decoding with `onExcessProperty: "error"`.
- Keep raw protocol/diagnostic event decoding separate from public workflow summaries.
- Tighten workflow primitive codecs for volume, balance, sync offset, tracks, and monitor type.
- Preserve diagnostic visibility through `get_recent_obs_events` without turning diagnostic history into a workflow API.

## Non-Goals

- Do not expose a raw input event stream.
- Do not add `wait_for_obs_event`, `subscribe_to_obs_event`, `get_input_audio_events`, or a query language over event history.
- Do not add server-initiated `notifications/obs/event` messages.
- Do not expose or wait on `InputVolumeMeters`.
- Do not expose or wait on visual active/show state events.
- Do not include input lifecycle, name, or settings events in this slice.
- Do not expose raw input settings, default settings, input kind caps, vendor payloads, custom payloads, regex predicates, or raw event intent filters.
- Do not add MCP resources or resource subscriptions in this slice.
- Do not change existing input mutation tools to auto-wait for events in this slice.

## Slice Choice

Input audio controls are the recommended next slice after output lifecycle, scene graph, source filters, and media input.

Reasons:

- The request surface already has explicit input audio read and write tools.
- The candidate events are low-volume `Inputs` subscription events, not high-rate meter or visual state streams.
- The payloads can be represented with primitive, typed-safe summaries.
- The events map to existing workflows without needing arbitrary settings sanitization.
- The slice avoids adding events for their own sake: every included event corresponds to an existing audio control tool.

No compelling narrow reason was found to include `InputCreated`, `InputRemoved`, `InputNameChanged`, or `InputSettingsChanged` in this slice. Those are input lifecycle/settings workflows, not audio-control confirmation.

## Included Events

The full event catalogue lives in `plans/obs-event-catalogue.md`. This slice includes exactly these input audio control events:

| Event | Subscription | Workflow Outcome | Public Summary Policy |
| --- | --- | --- | --- |
| `InputMuteStateChanged` | `Inputs` | `muted` or `unmuted` | Include input identity and literal mute state. |
| `InputVolumeChanged` | `Inputs` | `volume_changed` | Include input identity, volume multiplier, and dB level. |
| `InputAudioBalanceChanged` | `Inputs` | `balance_changed` | Include input identity and normalized balance. |
| `InputAudioSyncOffsetChanged` | `Inputs` | `sync_offset_changed` | Include input identity and integer millisecond sync offset. |
| `InputAudioTracksChanged` | `Inputs` | `tracks_changed` | Include input identity and public `track1` through `track6` booleans. |
| `InputAudioMonitorTypeChanged` | `Inputs` | `monitor_type_changed` | Include input identity and official monitor type literal. |

## Explicitly Excluded Events and Data

| Surface | Reason |
| --- | --- |
| `InputVolumeMeters` | High-volume meter stream. Not a workflow confirmation event. |
| `InputActiveStateChanged` | High-volume visual/activity signal. Requires a separate opt-in aggregate design. |
| `InputShowStateChanged` | High-volume visual/showing signal. Requires a separate opt-in aggregate design. |
| `InputCreated` | Settings-bearing input lifecycle event. Deferred until a sanitized input lifecycle summary is deliberately designed. |
| `InputRemoved` | Input lifecycle event. It does not confirm an audio control workflow. |
| `InputNameChanged` | Input identity lifecycle event. It does not confirm an audio control workflow. |
| `InputSettingsChanged` | Settings-bearing payload. Deferred until a sanitized settings-change design exists. |
| Raw `inputSettings`, `defaultInputSettings`, `inputKindCaps`, and plugin-shaped payload objects | Arbitrary OBS/plugin data must not cross the workflow codec boundary. |
| `MediaInput*`, `SourceFilter*`, `Scene*`, `SceneItem*`, `Output*`, `Transition*`, `Canvas*`, `VendorEvent`, `CustomEvent` | Outside this slice. |

Diagnostic-safe input events may remain visible through `get_recent_obs_events` if the global event policy allows them. This slice must not add excluded events or fields to `confirm_obs_input_audio_change`, its output summary union, or any public wait predicate.

## Proposed MCP Tool

### `confirm_obs_input_audio_change`

Purpose: wait for a typed input audio control event after a known event cursor.

Inputs:

- `target`: `input_audio`
- `outcome`: `muted | unmuted | volume_changed | balance_changed | sync_offset_changed | tracks_changed | monitor_type_changed`
- `afterSequence`: required `EventCursor`
- `timeoutMs?: EventTimeoutMs`, capped by the configured OBS connection/request timeout
- `inputName?: ObsNonEmptyString`
- `inputUuid?: ObsNonEmptyString`
- Outcome-specific optional value filters, described below.

Input rules:

- The public input schema must be a discriminated union of exact supported variants.
- `afterSequence` is required for post-action confirmation.
- Raw OBS event names are not accepted as inputs.
- `inputName` and `inputUuid` are optional identity filters. Callers may intentionally confirm by outcome only after capturing a cursor.
- `inputName` and `inputUuid` may both be supplied because input events report both fields. This differs from request locators, where exactly one locator is sent to OBS.
- Value filters are optional. If supplied, they narrow the match to an event whose decoded workflow summary has the same value.
- Value matching uses exact decoded JSON value equality. There is no tolerance, rounding, range query, regex, subset matching, or "any changed field" query language.
- To verify final state after confirmation, callers should use the matching `get_input_*` read tool.
- `eventType`, `eventIntent`, `eventData`, `payload`, `regex`, `inputSettings`, `defaultInputSettings`, `inputKind`, `inputKindCaps`, `mediaState`, `mediaCursor`, `sourceName`, `filterName`, `sceneItemId`, and arbitrary object fields are forbidden.
- The MCP executor rejects excess fields, and the exported operation entry point must also decode this public input with `onExcessProperty: "error"`.

Input variants:

- `target: "input_audio"`, `outcome: "muted"`: allows `afterSequence`, `timeoutMs`, `inputName`, `inputUuid`; forbids `inputMuted` and all other value fields because the outcome encodes `inputMuted: true`.
- `target: "input_audio"`, `outcome: "unmuted"`: allows `afterSequence`, `timeoutMs`, `inputName`, `inputUuid`; forbids `inputMuted` and all other value fields because the outcome encodes `inputMuted: false`.
- `target: "input_audio"`, `outcome: "volume_changed"`: allows `afterSequence`, `timeoutMs`, `inputName`, `inputUuid`, optional `inputVolumeMul`, and optional `inputVolumeDb`; forbids unrelated audio fields and raw event fields. If both volume filters are supplied, the same event must match both.
- `target: "input_audio"`, `outcome: "balance_changed"`: allows `afterSequence`, `timeoutMs`, `inputName`, `inputUuid`, optional `inputAudioBalance`; forbids unrelated audio fields and raw event fields.
- `target: "input_audio"`, `outcome: "sync_offset_changed"`: allows `afterSequence`, `timeoutMs`, `inputName`, `inputUuid`, optional `inputAudioSyncOffset`; forbids unrelated audio fields and raw event fields.
- `target: "input_audio"`, `outcome: "tracks_changed"`: allows `afterSequence`, `timeoutMs`, `inputName`, `inputUuid`, optional `inputAudioTracks`; forbids unrelated audio fields and raw event fields. If supplied, `inputAudioTracks` is a complete six-track shape, not a partial patch.
- `target: "input_audio"`, `outcome: "monitor_type_changed"`: allows `afterSequence`, `timeoutMs`, `inputName`, `inputUuid`, optional `monitorType`; forbids unrelated audio fields and raw event fields.

Outputs:

- `confirmed: boolean`
- `timedOut: boolean`
- `baselineSequence: EventCursor`
- `latestSequence: EventCursor`
- `missedEvents: boolean`
- `event?: InputAudioChangeEventSummary`

Confirmation behavior:

- Return the first matching retained or newly observed event after `afterSequence`.
- If a matching event is already retained after the cursor, return immediately.
- If no match appears before timeout, return `confirmed: false`, `timedOut: true`, current cursor metadata, and no `event`.
- If OBS closes/disconnects or the MCP server closes while waiting, reject immediately and clean up the waiter without leaving timers active.
- Do not infer confirmation from current OBS request state.
- Do not synthesize an event from `set_input_*` request acknowledgements.

## Narrow Types and Schemas

Reuse existing event types:

- `EventSequence`: positive safe integer for retained event sequence values.
- `EventCursor`: non-negative safe integer for cursors and metadata; `0` is valid before the first event.
- `EventCount`: non-negative safe integer for counts.
- `EventIntent`: non-negative safe integer for public event intent metadata in summaries.
- `EventTimeoutMs`: positive bounded integer capped by configuration/request timeout.

Add input audio workflow types:

- `InputAudioChangeTarget`: literal `input_audio`.
- `InputAudioChangeOutcome`: `muted | unmuted | volume_changed | balance_changed | sync_offset_changed | tracks_changed | monitor_type_changed`.
- `InputAudioChangeEventType`: exactly the six included event names.
- `InputAudioVolumeMul`: reuse the existing `InputVolumeMul` shape, `0 <= value <= 20`; floats and zero are valid.
- `InputAudioVolumeDb`: reuse the existing `InputVolumeDb` shape, `-100 <= value <= 26`; floats and negative values are valid.
- `InputAudioBalance`: reuse the existing unit interval shape, `0 <= value <= 1`; floats and endpoints are valid.
- `InputAudioSyncOffset`: reuse the existing integer millisecond shape, `-950 <= value <= 20000`; negative, zero, and positive values are valid.
- `InputAudioTracks`: public complete track shape with `track1` through `track6` boolean fields.
- `ObsInputAudioTracks`: raw protocol track shape with `"1"` through `"6"` boolean fields, allowed only at protocol/diagnostic decode boundaries.
- `InputAudioMonitorType`: literal `OBS_MONITORING_TYPE_NONE | OBS_MONITORING_TYPE_MONITOR_ONLY | OBS_MONITORING_TYPE_MONITOR_AND_OUTPUT`.

Primitive type rules:

- User-provided identity filters use `ObsNonEmptyString`.
- Observed event output text uses `ObsString`, matching existing protocol-boundary conventions.
- Volume multiplier and dB are structural numeric levels, not branded identities. They should still be bounded for workflow inputs and summaries.
- Balance is a normalized structural scalar, not a branded identity.
- Sync offset is an integer millisecond delta. It is not a generic `ObsNumber`.
- Public workflow summaries expose `InputAudioTracks` with `track1` through `track6`, matching the existing MCP input tools.
- Raw protocol event decoding may retain `ObsInputAudioTracks` with numeric string keys for diagnostic history. Workflow summary construction must convert and exact-decode the public shape.
- Event intent and subscription masks are protocol metadata, not user inputs.
- Public event intent in summaries uses `EventIntent`, not bare `ObsNonNegativeInteger`.

`InputAudioChangeEventSummary` must be a discriminated union keyed by `eventType`, with `target` and `outcome` constrained by each shape:

- `InputMuteStateChanged`: `sequence`, `eventIntent`, `eventType: "InputMuteStateChanged"`, `category: "inputs"`, `target: "input_audio"`, `outcome: "muted"`, `inputName`, `inputUuid`, `inputMuted: true`
- `InputMuteStateChanged`: `sequence`, `eventIntent`, `eventType: "InputMuteStateChanged"`, `category: "inputs"`, `target: "input_audio"`, `outcome: "unmuted"`, `inputName`, `inputUuid`, `inputMuted: false`
- `InputVolumeChanged`: `sequence`, `eventIntent`, `eventType: "InputVolumeChanged"`, `category: "inputs"`, `target: "input_audio"`, `outcome: "volume_changed"`, `inputName`, `inputUuid`, `inputVolumeMul`, `inputVolumeDb`
- `InputAudioBalanceChanged`: `sequence`, `eventIntent`, `eventType: "InputAudioBalanceChanged"`, `category: "inputs"`, `target: "input_audio"`, `outcome: "balance_changed"`, `inputName`, `inputUuid`, `inputAudioBalance`
- `InputAudioSyncOffsetChanged`: `sequence`, `eventIntent`, `eventType: "InputAudioSyncOffsetChanged"`, `category: "inputs"`, `target: "input_audio"`, `outcome: "sync_offset_changed"`, `inputName`, `inputUuid`, `inputAudioSyncOffset`
- `InputAudioTracksChanged`: `sequence`, `eventIntent`, `eventType: "InputAudioTracksChanged"`, `category: "inputs"`, `target: "input_audio"`, `outcome: "tracks_changed"`, `inputName`, `inputUuid`, `inputAudioTracks`
- `InputAudioMonitorTypeChanged`: `sequence`, `eventIntent`, `eventType: "InputAudioMonitorTypeChanged"`, `category: "inputs"`, `target: "input_audio"`, `outcome: "monitor_type_changed"`, `inputName`, `inputUuid`, `monitorType`

Summary construction must exact-decode this union with `onExcessProperty: "error"` before returning a workflow event. Malformed summaries such as `InputMuteStateChanged` with `outcome: "volume_changed"`, `InputAudioTracksChanged` with raw `"1"` through `"6"` keys, or `InputVolumeChanged` containing `inputSettings` must fail schema decode.

## Event Journal and Cursor Semantics

This slice must reuse the bounded in-memory event journal introduced for output lifecycle confirmation.

Requirements:

- No second input-audio-specific buffer.
- No duplicated cursor, eviction, timeout, or waiter cleanup logic.
- Match predicates are internal typed functions built from `InputAudioChangeTarget`, `InputAudioChangeOutcome`, optional input identity filters, and optional outcome-specific value filters.
- `missedEvents` propagation matches earlier event slices exactly.
- `afterSequence: 0` is valid and means "after server start before any observed event."
- Actual retained event `sequence` values remain positive `EventSequence`.
- `baselineSequence` echoes the cursor used for the wait.
- `latestSequence` reports the journal latest sequence when the tool returns.
- `missedEvents` is `true` when `afterSequence` is older than the retained journal window, such as `afterSequence < oldestSequence - 1`.
- The tool may still find a retained matching event when `missedEvents` is true, but clients must treat the result as incomplete history.

## Matching Semantics

Public workflow confirmation requires all of:

- The event is one of the six included events in this PRD.
- The official subscription is `Inputs` and matches the received event intent.
- The event decodes through the typed Effect Schema event codec.
- The workflow summary decodes through a discriminated schema keyed by event type, target, and outcome.
- `inputName` matches exactly when supplied.
- `inputUuid` matches exactly when supplied.
- For `muted`, the event summary has `inputMuted: true`.
- For `unmuted`, the event summary has `inputMuted: false`.
- For `volume_changed`, supplied `inputVolumeMul` and `inputVolumeDb` filters match exactly against the decoded summary. If neither is supplied, any volume change for the matched input identity satisfies the wait.
- For `balance_changed`, supplied `inputAudioBalance` matches exactly. If omitted, any balance change for the matched input identity satisfies the wait.
- For `sync_offset_changed`, supplied `inputAudioSyncOffset` matches exactly. If omitted, any sync offset change for the matched input identity satisfies the wait.
- For `tracks_changed`, supplied `inputAudioTracks` must match all six booleans exactly. Partial track filters are intentionally not supported.
- For `monitor_type_changed`, supplied `monitorType` matches exactly. If omitted, any monitor type change for the matched input identity satisfies the wait.

Rejected or malformed event payloads must not satisfy `confirm_obs_input_audio_change`. Rejection behavior should reuse the existing event-buffer posture: unsafe, subscription-mismatched, and decode-failed events are silently dropped from the safe journal rather than surfaced as workflow events.

## MCP and Resource Posture

This slice adds one MCP tool result surface. It does not add custom notifications.

The tool returns normal structured MCP content matching its output schema. It does not stream progress, subscribe clients to OBS events, or emit custom OBS event notifications.

Resources remain deferred. A future input-audio state resource could expose application-selected current audio state, and input audio events could later invalidate that state through standard resource update notifications. This PRD does not define resource URI conventions and does not require resource support because there is no real resource invalidation need in this confirmation slice.

## Safety Policy

Public workflow confirmation requires all of:

- The event is one of the six included events in this PRD.
- The official subscription is `Inputs` and matches the received event intent.
- The event decodes through the typed Effect Schema event codec.
- The workflow summary exact-decodes through the public summary union.
- Raw settings and raw payload objects are rejected or sanitized at the codec boundary.
- Raw objects, arbitrary settings, vendor/custom payloads, high-volume signals, visual active/show state, regex predicates, and raw event query fields are excluded from workflow inputs and outputs.

Diagnostic event decode and workflow summaries are deliberately different surfaces. Diagnostic history may show safe raw protocol shapes where already supported, but workflow confirmation must expose only the public summary fields defined here.

Implementation note: do not reuse broad raw response/event codecs such as `InputVolumeOutput` or the current raw `InputVolumeChangedEventData` shape for workflow summaries. The workflow summary union must apply the bounded workflow codecs described above, and malformed retained events must not satisfy confirmation.

## Acceptance Criteria

- The slice includes exactly the six input audio control events listed in "Included Events".
- `confirm_obs_input_audio_change` accepts only outcome-shaped discriminated input variants.
- Unsupported outcomes and unrelated optional fields are rejected by input schema.
- Raw `eventType`, `eventIntent`, `eventData`, `payload`, `regex`, `inputSettings`, `defaultInputSettings`, `inputKind`, `inputKindCaps`, media fields, source/filter/scene fields, and arbitrary object inputs are rejected.
- The exported operation directly decodes public workflow input with `onExcessProperty: "error"`.
- `muted` and `unmuted` outcomes encode the boolean mute state; `inputMuted` is not accepted as an input field.
- `inputVolumeMul` accepts only bounded structural volume multipliers.
- `inputVolumeDb` accepts only bounded structural dB levels.
- `inputAudioBalance` accepts only unit interval values.
- `inputAudioSyncOffset` accepts only bounded integer millisecond offsets.
- `inputAudioTracks` accepts only a complete public six-track boolean object.
- `monitorType` accepts only official monitor type literals.
- Output summaries are discriminated by `eventType`, `target`, and `outcome`.
- Malformed target/outcome/value combinations fail schema decode.
- `InputAudioTracksChanged` summaries expose `track1` through `track6`, not raw `"1"` through `"6"` keys.
- `afterSequence: 0` is accepted; actual event `sequence: 0` is rejected.
- `missedEvents` propagates from the event journal for retained reads and waits.
- Wait success, timeout, OBS close/disconnect, and MCP server close all clean up waiters; close/disconnect reject immediately without post-close timers.
- `InputVolumeMeters`, `InputActiveStateChanged`, `InputShowStateChanged`, input lifecycle/name/settings events, vendor/custom events, and unrelated workflow events cannot satisfy the input audio confirmation tool.
- Existing output lifecycle, scene graph, source filter, and media input confirmation tools keep working unchanged.
- Existing input request tools continue to work when the `events` toolset is disabled.
- No MCP resources or custom OBS event notifications are added.

## Test Plan

Schema tests:

- `ConfirmObsInputAudioChangeInput` accepts all supported outcome variants.
- `ConfirmObsInputAudioChangeInput` rejects unsupported outcomes, raw event fields, regex, arbitrary payload fields, settings fields, lifecycle fields, visual state fields, and adjacent-domain identity fields.
- `ConfirmObsInputAudioChangeInput` rejects `inputMuted` on mute variants.
- `ConfirmObsInputAudioChangeInput` rejects volume filters on non-volume variants.
- `ConfirmObsInputAudioChangeInput` rejects balance, sync offset, tracks, and monitor type filters on unrelated variants.
- `ConfirmObsInputAudioChangeInput` rejects empty string identity filters.
- `ConfirmObsInputAudioChangeInput` accepts `afterSequence: 0`.
- `ConfirmObsInputAudioChangeInput` rejects negative multiplier, multiplier above 20, dB below -100, dB above 26, balance outside `0..1`, fractional sync offsets, sync offsets outside `-950..20000`, partial track objects, numeric-string track keys, and unknown monitor types.
- `InputAudioChangeEventSummary` accepts valid summaries for all six included event types, including both muted and unmuted variants.
- `InputAudioChangeEventSummary` rejects malformed target/outcome combinations.
- `InputAudioChangeEventSummary` rejects raw settings fields, raw event payload fields, raw numeric-string track keys, partial track summaries, and arbitrary extra fields.
- Actual event `sequence: 0` is rejected as `EventSequence`.

Operation tests:

- Each included event type can satisfy `confirm_obs_input_audio_change` with the correct outcome.
- Optional identity filters narrow matches by `inputName`, `inputUuid`, and both fields together.
- `InputMuteStateChanged` with `inputMuted: true` satisfies `muted` and not `unmuted`.
- `InputMuteStateChanged` with `inputMuted: false` satisfies `unmuted` and not `muted`.
- `InputVolumeChanged` matches `inputVolumeMul`, `inputVolumeDb`, or both when supplied.
- `InputAudioBalanceChanged`, `InputAudioSyncOffsetChanged`, `InputAudioTracksChanged`, and `InputAudioMonitorTypeChanged` match their optional value filters exactly.
- Partial track filters are rejected before operation matching.
- `InputAudioTracksChanged` confirmation returns public `track1` through `track6` keys and never raw `"1"` through `"6"` keys.
- Events outside the six included input audio events cannot satisfy the tool.
- `missedEvents` is propagated when the requested cursor predates the retained journal window.
- Timeout returns `confirmed: false`, `timedOut: true`, and no event.
- OBS close/disconnect rejects a pending wait immediately and leaves no active waiter/timer.
- Existing output lifecycle, scene graph, source filter, and media input operation tests remain unchanged.

MCP tests:

- Tool registry includes `confirm_obs_input_audio_change` only when the `events` toolset is enabled.
- MCP structured content matches the output schema for every included event type.
- MCP structured content for `InputAudioTracksChanged` exposes public `track1` through `track6` keys and omits raw `"1"` through `"6"` keys.
- Invalid input is rejected before reaching OBS operations.
- Existing `get_recent_obs_events` cursor behavior remains unchanged.
- Existing input request tools remain available independently of the `events` toolset.

Protocol/fake OBS tests:

- Safe event subscription negotiation includes `Inputs` but continues to exclude high-volume input subscriptions.
- Fake OBS event ingestion covers all six included input audio event types.
- Subscription mismatch and decode failure do not produce public confirmation events.
- Raw diagnostic decode remains separate from public workflow summary decode.
- `InputAudioTracksChanged` protocol payloads with `"1"` through `"6"` keys convert to public `track1` through `track6` workflow summaries.
- Malformed audio primitive values are rejected for workflow confirmation and do not satisfy waiters.
- `InputVolumeMeters`, visual active/show events, input lifecycle/name/settings events, vendor/custom events, and unrelated events are rejected for workflow confirmation.

## Learnings Carried Forward

1. Use outcome-shaped workflow tools only; do not add raw event bus, raw event query language, custom event notification, or event subscription tools.
2. Keep `EventSequence` and `EventCursor` distinct: retained event sequences are positive; cursors and metadata are non-negative; `afterSequence: 0` is valid.
3. Public event intent in summaries uses safe `EventIntent`, not bare `ObsNonNegativeInteger`.
4. Public tool inputs must be discriminated variants with forbidden unrelated fields.
5. MCP executor excess-field rejection is not enough; exported public operations must decode workflow inputs with `onExcessProperty: "error"`.
6. Output summaries must be discriminated by `eventType`, `target`, and `outcome`, and malformed combinations must fail schema decode.
7. Primitive fields used by workflow summaries need specific safe codecs where relevant; volume, balance, sync offset, tracks, and monitor type must not remain generic raw `ObsNumber` or raw object fields at the workflow boundary.
8. Diagnostic-only events and fields must not become workflow inputs, outputs, or wait predicates.
9. High-volume, visual state, vendor/custom, raw-object, and settings-bearing payloads remain out unless a sanitized summary is explicitly designed.
10. Resources remain deferred. Future resource invalidation can be mentioned conceptually, but this slice must not define resource URI conventions.
11. Tests must cover all included event types, unsupported variants, unrelated/excess fields, primitive bounds, zero cursor, `missedEvents`, timeout, excluded events/fields, and strict direct operation decode.

## Open Questions

- Should a later convenience workflow combine an input audio mutation, event confirmation, and final `get_input_*` state read, or should those steps remain explicit?
- Should a future input-audio resource expose selected input audio state for applications that need cached state and resource invalidation?
