# PRD: OBS Events Slice 6 - Transition Workflow Confirmation

Status: draft.

Date: 2026-06-13.

## Problem

The first five OBS event slices established a narrow posture: events should confirm a specific workflow after a known cursor, not expose obs-websocket as a public event bus.

The next slice should cover transition workflows because the repository already has transition tools that map to low-volume, typed-safe transition events:

- `set_current_scene_transition`
- `set_current_scene_transition_duration`
- `trigger_studio_mode_transition`
- `set_tbar_position`
- `get_current_scene_transition`
- `get_current_scene_transition_cursor`
- `list_scene_transitions`

The mutation tools acknowledge request submission. They do not let an agent confirm that OBS emitted a transition event after the mutation or UI action. This slice should answer narrow questions:

- Did OBS report that the current scene transition changed after my cursor?
- Did OBS report that the current scene transition duration changed after my cursor?
- Did OBS report that a scene transition started, reached its ended/cut-point event, or reached its video-ended event after my cursor?
- Did the observed event match optional transition identity or duration filters where the event actually carries those fields?

The confirmation remains event-level. It does not replace transition read tools, scene read tools, or studio-mode state tools as authoritative final state surfaces.

## Goals

- Add workflow confirmation for existing transition tools.
- Reuse the existing event journal, cursor, timeout, and waiter cleanup semantics.
- Include only low-volume, typed-safe `Transitions` events with primitive payloads.
- Keep public inputs outcome-shaped and discriminated by supported workflow variants.
- Use exact public workflow input and summary decoding with `onExcessProperty: "error"`.
- Distinguish current-transition configuration events from temporal transition playback events.
- Preserve diagnostic visibility through `get_recent_obs_events` without turning diagnostic history into a workflow API.

## Non-Goals

- Do not expose a raw transition event stream.
- Do not add `wait_for_obs_event`, `subscribe_to_obs_event`, `get_transition_events`, or a query language over event history.
- Do not add server-initiated `notifications/obs/event` messages.
- Do not infer final program/preview scene state from transition events.
- Do not confirm transition settings changes; the candidate catalogue has no settings-changed transition event.
- Do not confirm transition cursor or T-bar position directly; OBS exposes `GetCurrentSceneTransitionCursor` but no cursor-changed event in this slice.
- Do not add a multi-event workflow that waits for started and ended/video-ended in one tool call.
- Do not expose raw event intents, arbitrary event payloads, regex predicates, vendor/custom payloads, or settings objects.
- Do not add MCP resources or resource subscriptions in this slice.
- Do not change existing transition mutation tools to auto-wait for events in this slice.

## Slice Choice

Transition workflow confirmation is the recommended next slice after output lifecycle, scene graph, source filters, media input, and input audio controls.

Reasons:

- The request surface already contains transition selection, duration, trigger, and T-bar controls.
- The candidate events are low-volume `Transitions` subscription events.
- The payloads are small and primitive: transition identity and transition duration.
- The events map to existing workflows without requiring settings sanitization or resource support.
- The slice avoids adding events for their own sake: every included event confirms either current-transition configuration or transition playback lifecycle.

No compelling narrow reason was found to include UI/studio-mode events here. Studio mode is adjacent to transition triggering, but `StudioModeStateChanged` is a UI-state event, not a transition workflow event.

## Included Events

The full event catalogue lives in `plans/obs-event-catalogue.md`. This slice includes exactly these transition workflow events:

| Event | Subscription | Workflow Target | Workflow Outcome | Public Summary Policy |
| --- | --- | --- | --- | --- |
| `CurrentSceneTransitionChanged` | `Transitions` | `current_scene_transition` | `changed` | Include transition name and UUID. |
| `CurrentSceneTransitionDurationChanged` | `Transitions` | `current_scene_transition` | `duration_changed` | Include bounded integer millisecond duration. |
| `SceneTransitionStarted` | `Transitions` | `scene_transition` | `started` | Include transition name and UUID. |
| `SceneTransitionEnded` | `Transitions` | `scene_transition` | `ended` | Include transition name and UUID. |
| `SceneTransitionVideoEnded` | `Transitions` | `scene_transition` | `video_ended` | Include transition name and UUID. |

## Target and Outcome Vocabulary

The public workflow vocabulary is intentionally smaller than the OBS event catalogue:

- `target: "current_scene_transition"` covers current transition configuration events.
- `target: "scene_transition"` covers temporal transition playback lifecycle events.
- `outcome: "changed"` means the current transition selection changed.
- `outcome: "duration_changed"` means OBS emitted a current-transition duration change.
- `outcome: "started"` means OBS emitted the start of transition playback.
- `outcome: "ended"` means OBS emitted the transition-ended/cut-point event.
- `outcome: "video_ended"` means OBS emitted the transition video-ended event.

Raw OBS event names are audit metadata in summaries, not user-facing workflow input vocabulary.

## Explicitly Excluded Events and Data

| Surface | Reason |
| --- | --- |
| Transition settings confirmation | No candidate transition settings-changed event exists. `set_current_scene_transition_settings` remains request-acknowledged only in this slice. |
| Transition cursor or T-bar position confirmation | No cursor-changed or T-bar-position event exists in this event set. Use `get_current_scene_transition_cursor` for cursor reads. |
| `StudioModeStateChanged` | UI state, not transition workflow confirmation. It belongs to a future UI/studio-mode slice if needed. |
| Scene current-program/current-preview events | Scene graph confirmation already owns scene target changes. Transition playback does not prove final scene identity. |
| Raw transition settings objects | Arbitrary/plugin-shaped settings must not cross the workflow codec boundary. |
| `Output*`, `Input*`, `MediaInput*`, `SourceFilter*`, `Scene*`, `SceneItem*`, `Canvas*`, `VendorEvent`, `CustomEvent` | Outside this slice. |

Diagnostic-safe transition events may remain visible through `get_recent_obs_events` if the global event policy allows them. This slice must not add excluded events or fields to `confirm_obs_transition_workflow`, its output summary union, or any public wait predicate.

## Proposed MCP Tool

### `confirm_obs_transition_workflow`

Purpose: wait for a typed current-transition configuration or scene-transition lifecycle event after a known event cursor.

Inputs:

- `target`: `current_scene_transition | scene_transition`
- `outcome`: `changed | duration_changed | started | ended | video_ended`
- `afterSequence`: required `EventCursor`
- `timeoutMs?: EventTimeoutMs`, capped by the configured OBS connection/request timeout
- `transitionName?: ObsNonEmptyString`
- `transitionUuid?: ObsNonEmptyString`
- `transitionDuration?: TransitionDuration`

Input rules:

- The public input schema must be a discriminated union of exact supported variants.
- `afterSequence` is required for post-action confirmation.
- Raw OBS event names are not accepted as inputs.
- `transitionName` and `transitionUuid` are optional identity filters only on variants whose events carry transition identity.
- `transitionName` and `transitionUuid` may both be supplied because transition events report both fields. This differs from `set_current_scene_transition`, which sends only a transition name to OBS.
- `transitionUuid` is the preferred identity filter when the caller knows it. Transition names are useful but OBS transition name uniqueness is weaker than UUID identity.
- `transitionDuration` is allowed only on `duration_changed`.
- Value matching uses exact decoded JSON value equality. There is no tolerance, rounding, range query, regex, subset matching, or "any changed field" query language.
- `eventType`, `eventIntent`, `eventData`, `payload`, `regex`, `transitionSettings`, `overlay`, `position`, `release`, `sceneName`, `sceneUuid`, `inputName`, `sourceName`, `filterName`, and arbitrary object fields are forbidden.
- The MCP executor rejects excess fields, and the exported operation entry point must also decode this public input with `onExcessProperty: "error"`.

Input variants:

- `target: "current_scene_transition"`, `outcome: "changed"`: allows `afterSequence`, `timeoutMs`, `transitionName`, and `transitionUuid`; forbids `transitionDuration`, transition settings, T-bar fields, scene fields, and raw event fields.
- `target: "current_scene_transition"`, `outcome: "duration_changed"`: allows `afterSequence`, `timeoutMs`, and optional `transitionDuration`; forbids `transitionName` and `transitionUuid` because `CurrentSceneTransitionDurationChanged` does not carry transition identity.
- `target: "scene_transition"`, `outcome: "started"`: allows `afterSequence`, `timeoutMs`, `transitionName`, and `transitionUuid`; forbids `transitionDuration`, transition settings, T-bar fields, scene fields, and raw event fields.
- `target: "scene_transition"`, `outcome: "ended"`: allows `afterSequence`, `timeoutMs`, `transitionName`, and `transitionUuid`; forbids `transitionDuration`, transition settings, T-bar fields, scene fields, and raw event fields.
- `target: "scene_transition"`, `outcome: "video_ended"`: allows `afterSequence`, `timeoutMs`, `transitionName`, and `transitionUuid`; forbids `transitionDuration`, transition settings, T-bar fields, scene fields, and raw event fields.

Outputs:

- `confirmed: boolean`
- `timedOut: boolean`
- `baselineSequence: EventCursor`
- `latestSequence: EventCursor`
- `missedEvents: boolean`
- `event?: TransitionWorkflowEventSummary`

Confirmation behavior:

- Return the first matching retained or newly observed event after `afterSequence`.
- If a matching event is already retained after the cursor, return immediately.
- If no match appears before timeout, return `confirmed: false`, `timedOut: true`, current cursor metadata, and no `event`.
- If OBS closes/disconnects or the MCP server closes while waiting, reject immediately and clean up the waiter without leaving timers active.
- Do not infer confirmation from current OBS request state.
- Do not synthesize an event from transition request acknowledgements.
- To verify current transition state after confirmation, callers should use `get_current_scene_transition`.
- To verify cursor position after a transition interaction, callers should use `get_current_scene_transition_cursor`.
- To verify final program/preview scene identity, callers should use the scene read or scene graph confirmation tools.

## Workflow Semantics

`CurrentSceneTransitionChanged` confirms that OBS emitted a current-transition selection event after the cursor. It is pertinent after `set_current_scene_transition` or after manual UI changes. It does not prove duration, settings, scene state, or transition playback.

`CurrentSceneTransitionDurationChanged` confirms that OBS emitted a current-transition duration event after the cursor. It is pertinent after `set_current_scene_transition_duration`. It does not identify which transition was current at the time because OBS does not include transition identity in this event.

`SceneTransitionStarted` confirms that OBS emitted a transition-start event after the cursor. It is pertinent after `trigger_studio_mode_transition`, after T-bar interactions that cause playback, or after manual OBS/UI transition actions. It does not prove the transition completed, which scene became program, or that the event was caused by the agent's prior request rather than another actor.

`SceneTransitionEnded` confirms OBS emitted the transition-ended event after the cursor. Per catalogue notes, this event may not fire when a transition is interrupted. It should be treated as the OBS ended/cut-point signal, not proof that any transition video playback has fully completed.

`SceneTransitionVideoEnded` confirms OBS emitted the transition-video-ended event after the cursor. It is useful for stinger-like workflows where the video completion matters. Catalogue notes indicate this event may be called by every transition regardless of relevance, so it does not prove that the transition is a stinger or that video playback was visible to the audience.

This tool confirms one event at a time. If a caller needs an ordered lifecycle such as started then ended then video-ended, it should call the tool multiple times, passing the previous matched event sequence as the next `afterSequence`.

## Narrow Types and Schemas

Reuse existing event types:

- `EventSequence`: positive safe integer for retained event sequence values.
- `EventCursor`: non-negative safe integer for cursors and metadata; `0` is valid before the first event.
- `EventCount`: non-negative safe integer for counts.
- `EventIntent`: non-negative safe integer for public event intent metadata in summaries.
- `EventTimeoutMs`: positive bounded integer capped by configuration/request timeout.

Add transition workflow types:

- `TransitionWorkflowTarget`: `current_scene_transition | scene_transition`.
- `TransitionWorkflowOutcome`: `changed | duration_changed | started | ended | video_ended`.
- `TransitionWorkflowEventType`: exactly the five included event names.
- `TransitionDuration`: reuse the existing public transition duration primitive from transition tools: integer milliseconds, `50 <= value <= 20000`.
- `TransitionWorkflowDuration`: explicit alias that imports or reuses `TransitionDuration`; do not copy the broader scene transition-override duration shape.
- `TransitionIdentityName`: public input filter using `ObsNonEmptyString`.
- `TransitionIdentityUuid`: public input filter using `ObsNonEmptyString`.

Primitive type rules:

- User-provided identity filters use `ObsNonEmptyString`.
- Observed event output text uses `ObsString`, matching existing protocol-boundary conventions.
- `transitionDuration` is an integer millisecond duration with explicit bounds, not a generic `ObsNumber`.
- Raw protocol event decoding may be broader where necessary for diagnostic history, such as accepting non-negative integer duration before workflow narrowing. Workflow summaries must exact-decode through the public `TransitionDuration` primitive before satisfying confirmation.
- Event intent and subscription masks are protocol metadata, not user inputs.
- Public event intent in summaries uses `EventIntent`, not bare `ObsNonNegativeInteger`.

## Schema Variants

The public input schema is an exact discriminated union:

- Current transition selection variant: `target: "current_scene_transition"`, `outcome: "changed"`.
- Current transition duration variant: `target: "current_scene_transition"`, `outcome: "duration_changed"`.
- Transition started variant: `target: "scene_transition"`, `outcome: "started"`.
- Transition ended variant: `target: "scene_transition"`, `outcome: "ended"`.
- Transition video-ended variant: `target: "scene_transition"`, `outcome: "video_ended"`.

The public summary schema mirrors those five variants and must be exact-decoded before matching. A diagnostic event can be retained without becoming a valid workflow summary.

`TransitionWorkflowEventSummary` must be a discriminated union keyed by `eventType`, with `target` and `outcome` constrained by each shape:

- `CurrentSceneTransitionChanged`: `sequence`, `eventIntent`, `eventType: "CurrentSceneTransitionChanged"`, `category: "transitions"`, `target: "current_scene_transition"`, `outcome: "changed"`, `transitionName`, `transitionUuid`
- `CurrentSceneTransitionDurationChanged`: `sequence`, `eventIntent`, `eventType: "CurrentSceneTransitionDurationChanged"`, `category: "transitions"`, `target: "current_scene_transition"`, `outcome: "duration_changed"`, `transitionDuration`
- `SceneTransitionStarted`: `sequence`, `eventIntent`, `eventType: "SceneTransitionStarted"`, `category: "transitions"`, `target: "scene_transition"`, `outcome: "started"`, `transitionName`, `transitionUuid`
- `SceneTransitionEnded`: `sequence`, `eventIntent`, `eventType: "SceneTransitionEnded"`, `category: "transitions"`, `target: "scene_transition"`, `outcome: "ended"`, `transitionName`, `transitionUuid`
- `SceneTransitionVideoEnded`: `sequence`, `eventIntent`, `eventType: "SceneTransitionVideoEnded"`, `category: "transitions"`, `target: "scene_transition"`, `outcome: "video_ended"`, `transitionName`, `transitionUuid`

Summary construction must exact-decode this union with `onExcessProperty: "error"` before returning a workflow event. Malformed summaries such as `SceneTransitionStarted` with `outcome: "ended"`, `CurrentSceneTransitionDurationChanged` containing `transitionName`, or a duration summary containing `transitionDuration: 0` must fail schema decode.

## Event Journal and Cursor Semantics

This slice must reuse the bounded in-memory event journal introduced for output lifecycle confirmation.

Requirements:

- No second transition-specific buffer.
- No duplicated cursor, eviction, timeout, or waiter cleanup logic.
- Match predicates are internal typed functions built from `TransitionWorkflowTarget`, `TransitionWorkflowOutcome`, optional transition identity filters, and optional duration filter.
- `missedEvents` propagation matches earlier event slices exactly.
- `afterSequence: 0` is valid and means "after server start before any observed event."
- Actual retained event `sequence` values remain positive `EventSequence`.
- `baselineSequence` echoes the cursor used for the wait.
- `latestSequence` reports the journal latest sequence when the tool returns.
- `missedEvents` is `true` when `afterSequence` is older than the retained journal window, such as `afterSequence < oldestSequence - 1`.
- The tool may still find a retained matching event when `missedEvents` is true, but clients must treat the result as incomplete history.

## Matching Semantics

Public workflow confirmation requires all of:

- The event is one of the five included events in this PRD.
- The official subscription is `Transitions` and matches the received event intent.
- The event decodes through the typed Effect Schema event codec.
- The workflow summary exact-decodes through the public summary union.
- `target` and `outcome` match the summary's constrained variant.
- For identity-bearing events, supplied `transitionName` matches exactly when present.
- For identity-bearing events, supplied `transitionUuid` matches exactly when present.
- For `duration_changed`, supplied `transitionDuration` matches exactly when present. If omitted, any valid duration-changed event satisfies the wait.
- `transitionName` and `transitionUuid` filters are rejected on `duration_changed` because the event does not carry identity.
- `transitionDuration` filters are rejected on non-duration variants because those events do not carry duration.

Rejected or malformed event payloads must not satisfy `confirm_obs_transition_workflow`. Rejection behavior should reuse the existing event-buffer posture: unsafe, subscription-mismatched, and decode-failed events are silently dropped from the safe journal rather than surfaced as workflow events.

If raw protocol event codecs are broader than workflow summary codecs, tests must prove that malformed retained or ingested events cannot satisfy confirmation. In particular, a retained `CurrentSceneTransitionDurationChanged` diagnostic event with a negative, fractional, zero, or out-of-range duration must not produce a workflow summary or match a waiter.

Summary construction must follow the newer source-filter, media-input, and input-audio pattern: exact-decode the workflow summary with `onExcessProperty: "error"` before matching. Do not copy the older output-lifecycle direct decode style.

## MCP and Resource Posture

This slice adds one MCP tool result surface. It does not add custom notifications.

The tool returns normal structured MCP content matching its output schema. It does not stream progress, subscribe clients to OBS events, or emit custom OBS event notifications.

Resources remain deferred. A future transition state resource could expose application-selected current transition context, and transition events could later invalidate that state through standard resource update notifications. This PRD does not define resource URI conventions and does not require resource support because there is no real resource invalidation need in this confirmation slice.

## Safety Policy

Public workflow confirmation requires all of:

- The event is one of the five included events in this PRD.
- The official subscription is `Transitions` and matches the received event intent.
- The event decodes through the typed Effect Schema event codec.
- The workflow summary exact-decodes through the public summary union.
- Raw settings and raw payload objects are rejected or sanitized at the codec boundary.
- Raw objects, arbitrary settings, vendor/custom payloads, regex predicates, adjacent-domain event fields, and raw event query fields are excluded from workflow inputs and outputs.

Diagnostic event decode and workflow summaries are deliberately different surfaces. Diagnostic history may show safe raw protocol shapes where already supported, but workflow confirmation must expose only the public summary fields defined here.

## Acceptance Criteria

- The slice includes exactly the five transition events listed in "Included Events".
- `confirm_obs_transition_workflow` accepts only outcome-shaped discriminated input variants.
- Unsupported target/outcome combinations and unrelated optional fields are rejected by input schema.
- Raw `eventType`, `eventIntent`, `eventData`, `payload`, `regex`, `transitionSettings`, T-bar fields, scene fields, input fields, source/filter fields, and arbitrary object inputs are rejected.
- The exported operation directly decodes public workflow input with `onExcessProperty: "error"`.
- `transitionName` and `transitionUuid` are accepted only for identity-bearing variants.
- `transitionUuid` and `transitionName` filters match exactly; no regex or partial matching is supported.
- `transitionDuration` is accepted only for `duration_changed`.
- `transitionDuration` accepts only bounded integer milliseconds using the public transition duration primitive.
- Output summaries are discriminated by `eventType`, `target`, and `outcome`.
- Malformed target/outcome/value combinations fail schema decode.
- `CurrentSceneTransitionDurationChanged` summaries do not expose transition identity fields.
- Scene-transition lifecycle summaries do not expose `transitionDuration`.
- `afterSequence: 0` is accepted; actual event `sequence: 0` is rejected.
- `EventIntent` accepts safe non-negative event intent metadata; workflow inputs never accept event intent.
- `missedEvents` propagates from the event journal for retained reads and waits.
- Wait success, timeout, OBS close/disconnect, and MCP server close all clean up waiters; close/disconnect reject immediately without post-close timers.
- Transition settings, transition cursor/T-bar position, UI studio-mode events, scene graph events, vendor/custom events, and unrelated workflow events cannot satisfy the transition workflow confirmation tool.
- Existing output lifecycle, scene graph, source filter, media input, and input audio confirmation tools keep working unchanged.
- Existing transition request tools continue to work when the `events` toolset is disabled.
- No MCP resources or custom OBS event notifications are added.

## Test Plan

Schema tests:

- `ConfirmObsTransitionWorkflowInput` accepts all supported target/outcome variants.
- `ConfirmObsTransitionWorkflowInput` rejects unsupported target/outcome combinations.
- `ConfirmObsTransitionWorkflowInput` rejects raw event fields, regex, arbitrary payload fields, settings fields, T-bar fields, scene fields, input fields, source/filter fields, and adjacent-domain identity fields.
- `ConfirmObsTransitionWorkflowInput` rejects `transitionName` and `transitionUuid` on `duration_changed`.
- `ConfirmObsTransitionWorkflowInput` rejects `transitionDuration` on non-duration variants.
- `ConfirmObsTransitionWorkflowInput` rejects empty string identity filters.
- `ConfirmObsTransitionWorkflowInput` accepts `afterSequence: 0`.
- `ConfirmObsTransitionWorkflowInput` rejects fractional, zero, negative, below-minimum, and above-maximum `transitionDuration` values.
- `TransitionWorkflowEventSummary` accepts valid summaries for all five included event types.
- `TransitionWorkflowEventSummary` rejects malformed target/outcome combinations.
- `TransitionWorkflowEventSummary` rejects duration summaries containing transition identity.
- `TransitionWorkflowEventSummary` rejects lifecycle summaries containing `transitionDuration`.
- `TransitionWorkflowEventSummary` rejects raw settings fields, raw event payload fields, and arbitrary extra fields.
- Actual event `sequence: 0` is rejected as `EventSequence`.

Operation tests:

- Each included event type can satisfy `confirm_obs_transition_workflow` with the correct target/outcome.
- Optional identity filters narrow `CurrentSceneTransitionChanged`, `SceneTransitionStarted`, `SceneTransitionEnded`, and `SceneTransitionVideoEnded` by `transitionName`, `transitionUuid`, and both fields together.
- `CurrentSceneTransitionDurationChanged` matches `transitionDuration` exactly when supplied.
- `CurrentSceneTransitionDurationChanged` does not satisfy `changed`, `started`, `ended`, or `video_ended`.
- `SceneTransitionStarted`, `SceneTransitionEnded`, and `SceneTransitionVideoEnded` do not cross-match each other's outcomes.
- Identity-bearing transition events do not satisfy `duration_changed`.
- Events outside the five included transition events cannot satisfy the tool.
- Malformed retained transition summaries with `transitionDuration: 0`, `49`, `20001`, fractional values, and excess fields cannot satisfy the tool.
- Malformed ingested transition event payloads with `transitionDuration: 0`, `49`, `20001`, fractional values, and excess fields are rejected or retained only diagnostically and do not satisfy waiters.
- `missedEvents` is propagated when the requested cursor predates the retained journal window.
- Timeout returns `confirmed: false`, `timedOut: true`, and no event.
- OBS close/disconnect rejects a pending wait immediately and leaves no active waiter/timer.
- Existing output lifecycle, scene graph, source filter, media input, and input audio operation tests remain unchanged.

MCP tests:

- Tool registry includes `confirm_obs_transition_workflow` only when the `events` toolset is enabled.
- MCP structured content matches the output schema for every included event type.
- Invalid input is rejected before reaching OBS operations.
- Existing `get_recent_obs_events` cursor behavior remains unchanged.
- Existing transition request tools remain available independently of the `events` toolset.

Protocol/fake OBS tests:

- Safe event subscription negotiation includes `Transitions`.
- Fake OBS event ingestion covers all five included transition event types.
- Subscription mismatch and decode failure do not produce public confirmation events.
- Raw diagnostic decode remains separate from public workflow summary decode.
- If the raw protocol codec accepts broader transition duration values for diagnostic retention, workflow summary decode rejects values outside the public `TransitionDuration` primitive.
- Transition events missing required identity fields do not produce identity-bearing workflow summaries.
- Transition settings, cursor/T-bar data, UI studio-mode events, scene graph events, vendor/custom events, and unrelated events are rejected for workflow confirmation.

## Learnings Carried Forward

1. Use outcome-shaped workflow tools only; do not add raw event bus, raw event query language, custom event notification, or event subscription tools.
2. Keep `EventSequence` and `EventCursor` distinct: retained event sequences are positive; cursors and metadata are non-negative; `afterSequence: 0` is valid.
3. `EventIntent` is a safe non-negative protocol metadata primitive in summaries, never a workflow input.
4. Public tool inputs must be discriminated variants with forbidden unrelated fields.
5. MCP executor excess-field rejection is not enough; exported public operations must decode workflow inputs with `onExcessProperty: "error"`.
6. Output summaries must be discriminated by `eventType`, `target`, and `outcome`, and malformed combinations must fail schema decode.
7. Primitive fields used by workflow summaries need specific safe codecs where relevant; `transitionDuration` is bounded integer milliseconds, not a broad `ObsNumber`.
8. Diagnostic history and workflow summaries are separate surfaces. Diagnostic-safe events do not automatically become workflow inputs, outputs, or wait predicates.
9. Exclusions in this PRD are scoped to `confirm_obs_transition_workflow` unless explicitly described as global policy.
10. High-volume, vendor/custom, raw-object, and settings-bearing payloads remain out unless a sanitized summary is explicitly designed.
11. Resources remain deferred. Future resource invalidation can be mentioned conceptually, but this slice must not define resource URI conventions.
12. If raw protocol event codecs are broader than workflow summary codecs, tests must prove malformed retained or ingested events cannot satisfy confirmations.
13. Tests must cover all included event types, unsupported variants, unrelated/excess fields, primitive bounds, zero cursor, `missedEvents`, timeout, excluded events/fields, temporal lifecycle cross-matching, and strict direct operation decode.

## Open Questions

- Should a later convenience workflow combine `trigger_studio_mode_transition`, transition lifecycle confirmation, and a final scene-state read, or should those steps remain explicit?
- Should a future transition state resource expose selected current transition context for applications that need cached state and resource invalidation?
