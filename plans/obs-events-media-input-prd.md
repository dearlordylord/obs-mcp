# PRD: OBS Events Slice 4 - Media Input Workflow Confirmation

Status: draft.

Date: 2026-06-13.

## Problem

The previous OBS event slices established the useful pattern: events should confirm a specific workflow after a known cursor, not expose OBS websocket events as a public event bus.

The next slice should cover media input workflows because the codebase already has media status, cursor, and action controls:

- `get_media_input_status` reports media state, duration, and cursor.
- `set_media_input_cursor` and `offset_media_input_cursor` mutate playback position.
- `trigger_media_input_action` asks OBS to play, pause, stop, restart, advance, or go back.

Those tools acknowledge request submission or read current state. They do not let an agent confirm that OBS emitted a media input event after the action. This slice should answer narrow questions:

- Did OBS report that a media input started playback after my cursor?
- Did OBS report that a media input ended playback after my cursor?
- Did OBS emit an action-triggered event for the media input and action I requested?

The action-triggered event is pertinent, but its meaning is limited. It confirms OBS emitted `MediaInputActionTriggered`; it does not prove the final playback state, cursor position, duration, or successful completion of a play/pause/stop operation. Final media state remains the job of `get_media_input_status`.

## Goals

- Add media input workflow confirmation for existing media playback/action workflows.
- Reuse the existing event journal, cursor, timeout, and waiter cleanup semantics.
- Include only low-volume, typed-safe `MediaInputs` events with primitive payloads.
- Keep public inputs outcome-shaped and discriminated by supported workflow variants.
- Confirm media actions at the event level without overstating final playback state.
- Keep cursor/status workflows separate from event confirmation when OBS provides no cursor event.
- Preserve diagnostic visibility through `get_recent_obs_events` without turning diagnostic history into a workflow API.

## Non-Goals

- Do not expose a raw media input event stream.
- Do not add `wait_for_obs_event`, `subscribe_to_obs_event`, `get_media_input_events`, or a query language over event history.
- Do not add server-initiated `notifications/obs/event` messages.
- Do not infer playback state from `MediaInputActionTriggered`.
- Do not confirm media cursor changes through events; `SetMediaInputCursor` and `OffsetMediaInputCursor` have no corresponding cursor event in this slice.
- Do not expose or wait on high-volume `InputActiveStateChanged`, `InputShowStateChanged`, or `InputVolumeMeters`.
- Do not expose raw input settings, raw vendor/custom payloads, arbitrary event payload objects, regex predicates, or raw event intents.
- Do not add MCP resources or resource subscriptions in this slice.
- Do not change existing media input mutation tools to auto-wait for events in this slice.

## Slice Choice

The recommended media input slice is the right next slice based on codebase evidence:

- The request surface already includes media status, cursor controls, and `TriggerMediaInputAction`.
- The catalogue contains exactly three typed-safe events under the `MediaInputs` subscription.
- The event payloads are small and primitive: `inputName`, `inputUuid`, and optional `mediaAction`.
- The action event maps directly to an existing action tool, as long as the PRD clearly limits it to event-level confirmation.

No stronger next slice is apparent from the current evidence. Media input events map to existing workflows without requiring settings sanitization, resource support, or high-volume subscriptions.

## Included Events

The full event catalogue lives in `plans/obs-event-catalogue.md`. This slice includes exactly these media input workflow events:

| Event | Subscription | Workflow Outcome | Public Summary Policy |
| --- | --- | --- | --- |
| `MediaInputPlaybackStarted` | `MediaInputs` | `playback_started` | Include input name and input UUID only. |
| `MediaInputPlaybackEnded` | `MediaInputs` | `playback_ended` | Include input name and input UUID only. |
| `MediaInputActionTriggered` | `MediaInputs` | `action_triggered` | Include input name, input UUID, and typed official media action. |

## Explicitly Excluded Events and Data

| Surface | Reason |
| --- | --- |
| `InputActiveStateChanged` | High-volume input visibility/activity signal. Requires a separate opt-in aggregate design. |
| `InputShowStateChanged` | High-volume input visibility signal. Requires a separate opt-in aggregate design. |
| `InputVolumeMeters` | High-volume meter stream. Not a workflow confirmation event. |
| `InputCreated` and `InputSettingsChanged` | Settings-bearing input payloads remain deferred until a sanitized summary is deliberately designed. |
| `InputMuteStateChanged`, `InputVolumeChanged`, `InputAudio*` | Audio/input state workflows are outside this media playback slice. |
| Media status fields such as `mediaState`, `mediaDuration`, and `mediaCursor` | These are request response fields from `GetMediaInputStatus`, not fields in the included media input events. |
| Cursor mutation confirmation | OBS exposes cursor requests but no cursor-changed event in this event set. Use status reads for cursor verification. |
| `Scene*`, `SceneItem*`, `SourceFilter*`, `Output*`, `Transition*`, `Canvas*`, `VendorEvent`, `CustomEvent` | Outside this slice. |

Diagnostic-safe events may remain visible through `get_recent_obs_events` if the global event policy allows them. This slice must not add excluded events or fields to `confirm_obs_media_input_workflow`, its output summary union, or any public wait predicate.

## Proposed MCP Tool

### `confirm_obs_media_input_workflow`

Purpose: wait for a typed media input playback or action event after a known event cursor.

Inputs:

- `target`: `media_input`
- `outcome`: `playback_started | playback_ended | action_triggered`
- `afterSequence`: required `EventCursor`
- `timeoutMs?: EventTimeoutMs`, capped by the configured OBS connection/request timeout
- `inputName?: ObsNonEmptyString`
- `inputUuid?: ObsNonEmptyString`
- `mediaAction?: MediaInputWorkflowAction`

Input rules:

- The public input schema must be a discriminated union of exact supported variants.
- `afterSequence` is required for post-action confirmation.
- Raw OBS event names are not accepted.
- `inputName` and `inputUuid` are optional identity filters. Callers may intentionally confirm by outcome only after capturing a cursor.
- `inputName` and `inputUuid` may both be supplied as event filters because media input events report both fields. This differs from request locators, where exactly one locator is sent to OBS.
- `mediaAction` is required for `action_triggered` and forbidden for playback outcomes.
- `mediaAction` uses the actionable subset of the official `ObsMediaInputAction` literal set, not a free string.
- `OBS_WEBSOCKET_MEDIA_INPUT_ACTION_NONE` is forbidden for workflow confirmation. It remains valid for protocol decoding and diagnostic history, but it is not a meaningful action confirmation target.
- `mediaState`, `mediaCursor`, and `mediaDuration` are forbidden because the included events do not carry them.
- `eventType`, `eventIntent`, `eventData`, `payload`, `regex`, `inputSettings`, `defaultInputSettings`, `inputKind`, `mediaCursorOffset`, `sceneItemId`, `filterName`, `sourceName`, and arbitrary object fields are forbidden.
- The MCP executor rejects excess fields, and the exported operation entry point must also decode this public input with `onExcessProperty: "error"`.

Input variants:

- `target: "media_input"`, `outcome: "playback_started"`: allows `afterSequence`, `timeoutMs`, `inputName`, `inputUuid`; forbids `mediaAction`, media status fields, cursor offset fields, settings fields, adjacent-domain identity fields, and raw event fields.
- `target: "media_input"`, `outcome: "playback_ended"`: allows `afterSequence`, `timeoutMs`, `inputName`, `inputUuid`; forbids `mediaAction`, media status fields, cursor offset fields, settings fields, adjacent-domain identity fields, and raw event fields.
- `target: "media_input"`, `outcome: "action_triggered"`: allows `afterSequence`, `timeoutMs`, `inputName`, `inputUuid`, and required actionable `mediaAction`; forbids media status fields, cursor offset fields, settings fields, adjacent-domain identity fields, and raw event fields.

Outputs:

- `confirmed: boolean`
- `timedOut: boolean`
- `baselineSequence: EventCursor`
- `latestSequence: EventCursor`
- `missedEvents: boolean`
- `event?: MediaInputWorkflowEventSummary`

Confirmation behavior:

- Return the first matching retained or newly observed event after `afterSequence`.
- If a matching event is already retained after the cursor, return immediately.
- If no match appears before timeout, return `confirmed: false`, `timedOut: true`, current cursor metadata, and no `event`.
- If OBS closes/disconnects or the MCP server closes while waiting, reject immediately and clean up the waiter without leaving timers active.
- Do not infer confirmation from current OBS request state.
- Do not infer final playback state from `MediaInputActionTriggered`. To verify final state, callers should follow with `get_media_input_status`.

## Narrow Types and Schemas

Reuse existing event types:

- `EventSequence`: positive safe integer for retained event sequence values.
- `EventCursor`: non-negative safe integer for cursors and metadata; `0` is valid before the first event.
- `EventCount`: non-negative safe integer for counts.
- `EventIntent`: non-negative safe integer for public event intent metadata in summaries.
- `EventTimeoutMs`: positive bounded integer capped by configuration/request timeout.

Add media input workflow types:

- `MediaInputWorkflowTarget`: literal `media_input`.
- `MediaInputWorkflowOutcome`: `playback_started | playback_ended | action_triggered`.
- `MediaInputWorkflowEventType`: exactly `MediaInputPlaybackStarted | MediaInputPlaybackEnded | MediaInputActionTriggered`.
- `MediaInputWorkflowAction`: the actionable subset of the official `ObsMediaInputAction` literal set:
  - `OBS_WEBSOCKET_MEDIA_INPUT_ACTION_PLAY`
  - `OBS_WEBSOCKET_MEDIA_INPUT_ACTION_PAUSE`
  - `OBS_WEBSOCKET_MEDIA_INPUT_ACTION_STOP`
  - `OBS_WEBSOCKET_MEDIA_INPUT_ACTION_RESTART`
  - `OBS_WEBSOCKET_MEDIA_INPUT_ACTION_NEXT`
  - `OBS_WEBSOCKET_MEDIA_INPUT_ACTION_PREVIOUS`

Primitive type rules:

- User-provided identity filters use `ObsNonEmptyString`.
- Observed event output text uses `ObsString`, matching existing protocol-boundary conventions.
- `mediaAction` is a literal enum value, never an arbitrary string. The workflow action enum intentionally excludes `OBS_WEBSOCKET_MEDIA_INPUT_ACTION_NONE`.
- No media cursor, duration, or state fields appear in workflow summaries because the included events do not carry those fields.
- Event intent and subscription masks are protocol metadata, not user inputs.
- Public event intent in summaries uses `EventIntent`, not bare `ObsNonNegativeInteger`.

`MediaInputWorkflowEventSummary` must be a discriminated union keyed by `eventType`, with `target` and `outcome` constrained by each shape:

- `MediaInputPlaybackStarted`: `sequence`, `eventIntent`, `eventType: "MediaInputPlaybackStarted"`, `category: "media_inputs"`, `target: "media_input"`, `outcome: "playback_started"`, `inputName`, `inputUuid`
- `MediaInputPlaybackEnded`: `sequence`, `eventIntent`, `eventType: "MediaInputPlaybackEnded"`, `category: "media_inputs"`, `target: "media_input"`, `outcome: "playback_ended"`, `inputName`, `inputUuid`
- `MediaInputActionTriggered`: `sequence`, `eventIntent`, `eventType: "MediaInputActionTriggered"`, `category: "media_inputs"`, `target: "media_input"`, `outcome: "action_triggered"`, `inputName`, `inputUuid`, `mediaAction`

Summary construction must exact-decode this union with `onExcessProperty: "error"` before returning a workflow event. Malformed summaries such as `MediaInputPlaybackStarted` with `outcome: "action_triggered"`, `MediaInputActionTriggered` without `mediaAction`, or a summary containing `mediaCursor` must fail schema decode.

## Event Journal and Cursor Semantics

This slice must reuse the bounded in-memory event journal introduced for output lifecycle confirmation.

Requirements:

- No second media-input-specific buffer.
- No duplicated cursor, eviction, timeout, or waiter cleanup logic.
- Match predicates are internal typed functions built from `MediaInputWorkflowTarget`, `MediaInputWorkflowOutcome`, optional input identity filters, and required `mediaAction` for action confirmation.
- `missedEvents` propagation matches earlier event slices exactly.
- `afterSequence: 0` is valid and means "after server start before any observed event."
- Actual retained event `sequence` values remain positive `EventSequence`.
- `baselineSequence` echoes the cursor used for the wait.
- `latestSequence` reports the journal latest sequence when the tool returns.
- `missedEvents` is `true` when `afterSequence` is older than the retained journal window, such as `afterSequence < oldestSequence - 1`.
- The tool may still find a retained matching event when `missedEvents` is true, but clients must treat the result as incomplete history.

## MCP and Resource Posture

This slice adds one MCP tool result surface. It does not add custom notifications.

The tool returns normal structured MCP content matching its output schema. It does not stream progress, subscribe clients to OBS events, or emit custom OBS event notifications.

Resources remain deferred. A future media-input status resource could expose application-selected current playback context, and media input events could later invalidate that state through standard resource update notifications. This PRD does not define resource URI conventions and does not require resource support.

## Safety Policy

Public workflow confirmation requires all of:

- The event is one of the three included events in this PRD.
- The official subscription is `MediaInputs` and matches the received event intent.
- The event decodes through the typed Effect Schema event codec.
- The workflow summary decodes through a discriminated schema keyed by event type, target, and outcome.
- The event payload contains only primitive input identity fields and, for action events, a literal media action.
- Raw objects, arbitrary settings, vendor/custom payloads, high-volume signals, regex predicates, and raw event query fields are excluded from workflow inputs and outputs.

Rejected or malformed event payloads must not satisfy `confirm_obs_media_input_workflow`. Rejection accounting should reuse existing diagnostic reasons where applicable, such as `unsafe_policy`, `subscription_mismatch`, and `decode_failed`.

## Acceptance Criteria

- The slice includes exactly the three `MediaInput*` events listed in "Included Events".
- `confirm_obs_media_input_workflow` accepts only outcome-shaped discriminated input variants.
- Unsupported outcomes and unrelated optional fields are rejected by input schema.
- Raw `eventType`, `eventIntent`, `eventData`, `payload`, `regex`, `mediaState`, `mediaCursor`, `mediaDuration`, `inputSettings`, and arbitrary object inputs are rejected.
- Raw `defaultInputSettings`, `inputKind`, `mediaCursorOffset`, `sceneItemId`, `filterName`, and `sourceName` inputs are rejected.
- The exported operation directly decodes public workflow input with `onExcessProperty: "error"`.
- `mediaAction` is required for `action_triggered`, forbidden for playback outcomes, and decoded as the actionable media action enum.
- `OBS_WEBSOCKET_MEDIA_INPUT_ACTION_NONE` is rejected by workflow input, but remains accepted by diagnostic protocol event decoding.
- `MediaInputActionTriggered` confirms only that OBS emitted the action event; it does not claim final playback state.
- `MediaInputPlaybackStarted` and `MediaInputPlaybackEnded` summaries contain only input identity fields plus event metadata.
- Output summaries are discriminated by `eventType`, `target`, and `outcome`.
- Malformed target/outcome/action combinations fail schema decode.
- `afterSequence: 0` is accepted; actual event `sequence: 0` is rejected.
- `missedEvents` propagates from the event journal for retained reads and waits.
- Wait success, timeout, OBS close/disconnect, and MCP server close all clean up waiters; close/disconnect reject immediately without post-close timers.
- `InputActiveStateChanged`, `InputShowStateChanged`, `InputVolumeMeters`, settings-bearing input events, vendor/custom events, and unrelated workflow events cannot satisfy the media input workflow confirmation tool.
- Existing output lifecycle, scene graph, and source filter confirmation tools keep working unchanged.
- Existing media input request tools continue to work when the `events` toolset is disabled.
- No MCP resources or custom OBS event notifications are added.

## Test Plan

Schema tests:

- `ConfirmObsMediaInputWorkflowInput` accepts `playback_started`, `playback_ended`, and `action_triggered` variants.
- `ConfirmObsMediaInputWorkflowInput` rejects unsupported outcomes, raw event fields, regex, arbitrary payload fields, settings fields, and media status fields.
- `ConfirmObsMediaInputWorkflowInput` rejects `mediaAction` on playback variants.
- `ConfirmObsMediaInputWorkflowInput` requires `mediaAction` on `action_triggered`.
- `ConfirmObsMediaInputWorkflowInput` rejects invalid media action strings and `OBS_WEBSOCKET_MEDIA_INPUT_ACTION_NONE`.
- `ConfirmObsMediaInputWorkflowInput` rejects empty string identity filters.
- `ConfirmObsMediaInputWorkflowInput` accepts `afterSequence: 0`.
- `MediaInputWorkflowEventSummary` accepts valid summaries for all three included event types.
- `MediaInputWorkflowEventSummary` rejects malformed target/outcome combinations.
- `MediaInputWorkflowEventSummary` rejects `MediaInputActionTriggered` summaries without `mediaAction`.
- `MediaInputWorkflowEventSummary` rejects playback summaries containing `mediaAction`, `mediaState`, `mediaCursor`, or `mediaDuration`.
- `MediaInputWorkflowEventSummary` rejects action summaries containing `mediaState`, `mediaCursor`, `mediaDuration`, payload, `inputSettings`, or arbitrary extra fields.
- Actual event `sequence: 0` is rejected as `EventSequence`.

Operation tests:

- Each included event type can satisfy `confirm_obs_media_input_workflow` with the correct outcome.
- Optional identity filters narrow matches by `inputName`, `inputUuid`, and both fields together.
- `MediaInputActionTriggered` matches only when the event `mediaAction` equals the requested action.
- `MediaInputActionTriggered` does not satisfy `playback_started` or `playback_ended`.
- `MediaInputPlaybackStarted` and `MediaInputPlaybackEnded` do not satisfy `action_triggered`.
- `missedEvents` is propagated when the requested cursor predates the retained journal window.
- Timeout returns `confirmed: false`, `timedOut: true`, and no event.
- OBS close/disconnect rejects a pending wait immediately and leaves no active waiter/timer.
- Events outside the three included media input events cannot satisfy the workflow confirmation tool.

MCP tests:

- Tool registry includes `confirm_obs_media_input_workflow` only when the `events` toolset is enabled.
- MCP structured content matches the output schema for every included event type.
- Invalid input is rejected before reaching OBS operations.
- Existing `get_recent_obs_events` cursor behavior remains unchanged.
- Existing output lifecycle, scene graph, and source filter MCP tests remain unchanged.

Protocol/fake OBS tests:

- Safe event subscription negotiation includes `MediaInputs`.
- Fake OBS event ingestion covers all three included media input event types.
- Subscription mismatch and decode failure do not produce public confirmation events.
- Unknown `mediaAction` values in `MediaInputActionTriggered` are rejected.
- `OBS_WEBSOCKET_MEDIA_INPUT_ACTION_NONE` is accepted by diagnostic event decoding but rejected by workflow confirmation input and summaries.
- Diagnostic history may contain safe media input events, but workflow confirmation never exposes raw or high-volume input signals.

## Learnings Carried Forward

1. Use outcome-shaped workflow tools only; do not add raw event bus, raw event query language, custom event notification, or event subscription tools.
2. Keep `EventSequence` and `EventCursor` distinct: retained event sequences are positive; cursors and metadata are non-negative; `afterSequence: 0` is valid.
3. Public event intent in summaries uses safe `EventIntent`, not bare `ObsNonNegativeInteger`.
4. Public tool inputs must be discriminated variants with forbidden unrelated fields.
5. MCP executor excess-field rejection is not enough; exported public operations must decode workflow inputs with `onExcessProperty: "error"`.
6. Output summaries must be discriminated by `eventType`, `target`, and `outcome`, and malformed combinations must fail schema decode.
7. Primitive fields used by workflow summaries need specific safe codecs where relevant; media action is an actionable literal enum, not a generic string or the non-action `NONE` enum value.
8. Diagnostic-only events and fields must not become workflow inputs, outputs, or wait predicates.
9. High-volume, vendor/custom, raw-object, and settings-bearing payloads remain out unless a sanitized summary is explicitly designed.
10. Resources remain deferred. Future resource invalidation can be mentioned conceptually, but this slice must not define resource URI conventions.
11. Tests must cover all included event types, unsupported variants, unrelated/excess fields, primitive bounds, zero cursor, `missedEvents`, timeout, excluded events/fields, and strict direct operation decode.

## Open Questions

- Should a later media action helper combine `trigger_media_input_action`, event-level confirmation, and `get_media_input_status` into one higher-level workflow, or should these remain explicit steps?
- Should future media status resources expose current playback state for application-selected context, separate from event confirmation?
