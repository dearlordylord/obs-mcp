# PRD: OBS Events Slice 3 - Source Filter Workflow Confirmation

Status: draft.

Date: 2026-06-13.

## Problem

The first two OBS event slices established a narrow pattern: events are valuable when they confirm an OBS workflow after a known cursor, not when they expose OBS websocket mechanics as a raw event bus.

The next event slice should cover source filter workflows because the codebase already has task-shaped filter tools for creating, removing, renaming, reordering, enabling, disabling, and updating filter settings. Those tools currently acknowledge request submission. They do not let an agent confirm that OBS emitted the corresponding filter event after the mutation.

This slice should answer questions such as:

- Did the filter get created, removed, or renamed?
- Did the filter list order change after setting a filter index?
- Did the filter become enabled or disabled?
- Did OBS report that filter settings changed, without exposing raw settings objects?

This slice keeps the same MCP posture as the earlier event slices: one outcome-shaped confirmation tool, bounded structured outputs, strict schemas, no custom event notifications, and no resource dependency.

## Goals

- Add source filter workflow confirmation for existing filter mutation workflows.
- Reuse the existing event journal, cursor, timeout, and waiter cleanup semantics.
- Keep public inputs outcome-shaped and discriminated by supported workflow variants.
- Keep raw OBS event names, event intents, regexes, raw settings objects, and arbitrary payloads out of public workflow inputs.
- Include only filter event summaries that can be represented with primitive, typed-safe fields.
- Explicitly sanitize settings-bearing filter events by omitting raw settings payloads.
- Preserve diagnostic visibility through `get_recent_obs_events` without turning diagnostic history into a workflow API.

## Non-Goals

- Do not expose a raw filter event stream.
- Do not add `wait_for_obs_event`, `subscribe_to_obs_event`, `get_source_filter_events`, or a query language over event history.
- Do not add server-initiated `notifications/obs/event` messages.
- Do not expose `filterSettings` or `defaultFilterSettings` from events.
- Do not compare raw settings values to prove that a specific patch took effect.
- Do not support source UUID or canvas UUID filters in this confirmation tool because OBS source filter events carry `sourceName`, not `sourceUuid` or `canvasUuid`.
- Do not add MCP resources or resource subscriptions in this slice.
- Do not change existing filter mutation tools to auto-wait for events in this slice.

## Slice Choice

The recommended source-filter slice is the right next slice based on codebase evidence:

- The filter request surface already exists for create, remove, rename, set index, set enabled, and set settings workflows.
- The catalogue contains exactly six `SourceFilter*` events under the safe `Filters` subscription.
- Existing filter schemas already sanitize settings by exposing setting names/types and allowlisted patches instead of arbitrary raw settings.
- Existing event codecs already omit raw settings fields from `SourceFilterCreated` and `SourceFilterSettingsChanged`.

No stronger next slice is apparent from the current evidence. Source filter events map directly to existing mutation tools and can be exposed without widening MCP protocol posture.

## Included Events

The full event catalogue lives in `plans/obs-event-catalogue.md`. This slice includes exactly these source filter workflow events:

| Event | Subscription | Workflow Outcome | Public Summary Policy |
| --- | --- | --- | --- |
| `SourceFilterCreated` | `Filters` | `created` | Include source name, filter name, filter kind, and non-negative filter index. Omit `filterSettings` and `defaultFilterSettings`. |
| `SourceFilterRemoved` | `Filters` | `removed` | Include source name and filter name. |
| `SourceFilterNameChanged` | `Filters` | `renamed` | Include source name, old filter name, and new filter name. |
| `SourceFilterListReindexed` | `Filters` | `reordered` | Include source name and a sanitized ordering array of filter name plus non-negative filter index. |
| `SourceFilterEnableStateChanged` | `Filters` | `enabled` or `disabled` | Include source name, filter name, and literal boolean enabled state. |
| `SourceFilterSettingsChanged` | `Filters` | `settings_changed` | Include source name and filter name only, plus an explicit raw-settings-omitted marker. |

### Settings-Bearing Decision

`SourceFilterCreated` and `SourceFilterSettingsChanged` carry raw settings objects in OBS. This slice includes those events only after sanitization:

- `SourceFilterCreated` is useful because it confirms an existing create workflow and carries safe metadata: `sourceName`, `filterName`, `filterKind`, and `filterIndex`.
- `SourceFilterSettingsChanged` is useful because it confirms that OBS emitted a settings-change event for a filter after `set_source_filter_settings`.
- Neither event should expose raw settings values. The summary must omit `filterSettings` and `defaultFilterSettings`.
- The settings-change outcome confirms that a settings-change event occurred. It does not prove that every requested setting value was applied.

This is not event exposure for its own sake: each included event maps to an existing filter workflow, and the settings-bearing payloads are reduced to primitive confirmation metadata.

## Explicitly Excluded Data and Events

| Surface | Reason |
| --- | --- |
| `filterSettings` and `defaultFilterSettings` event fields | Raw settings objects are plugin-shaped arbitrary data. Omit from workflow summaries and wait predicates. |
| Settings value comparisons | The event payload is intentionally sanitized, so the tool cannot confirm exact value application. |
| `sourceUuid` and `canvasUuid` input filters | Source filter events do not carry these identifiers. Accepting them would imply false precision. |
| `Input*`, `SceneItem*`, `Scene*`, `Output*`, `Transition*`, `MediaInput*`, `Canvas*`, `VendorEvent`, `CustomEvent` | Outside this slice. |
| High-volume subscriptions | Not part of filter workflow confirmation and remain outside safe workflow surfaces. |

Diagnostic-safe filter events may remain visible through `get_recent_obs_events` if the global event policy allows them. This slice must not add excluded fields or unrelated events to `confirm_obs_source_filter_change`, its output summary union, or any public wait predicate.

## Proposed MCP Tool

### `confirm_obs_source_filter_change`

Purpose: wait for a typed source filter workflow outcome after a known event cursor.

Inputs:

- `target`: `source_filter`
- `outcome`: `created | removed | renamed | reordered | enabled | disabled | settings_changed`
- `afterSequence`: required `EventCursor`
- `timeoutMs?: EventTimeoutMs`, capped by the configured OBS connection/request timeout
- `sourceName?: ObsNonEmptyString`
- `filterName?: ObsNonEmptyString`
- `oldFilterName?: ObsNonEmptyString`
- `filterKind?: ObsNonEmptyString`
- `filterIndex?: SourceFilterIndex`

Input rules:

- The public input schema must be a discriminated union of exact supported variants.
- `afterSequence` is required for post-action confirmation.
- Raw OBS event names are not accepted.
- `sourceName` and `filterName` are optional identity filters. Callers may intentionally confirm by outcome only after capturing a cursor.
- `filterName` means the current or new filter name for `created`, `removed`, `renamed`, `reordered`, `enabled`, `disabled`, and `settings_changed`.
- `oldFilterName` is valid only for `renamed`.
- `filterKind` is valid only for `created`.
- `filterIndex` is valid only for `created` and `reordered`.
- For `reordered`, `filterName` and `filterIndex` narrow against the sanitized `filters` array. If both are supplied, the same list item must match both.
- `filterEnabled` is not an input field. The outcome encodes the desired enabled state.
- `filterSettings`, `defaultFilterSettings`, `sourceUuid`, `canvasUuid`, `eventType`, `eventIntent`, `eventData`, `payload`, and `regex` are forbidden.
- The MCP executor rejects excess fields, and the exported operation entry point must also decode this public input with `onExcessProperty: "error"`.

Input variants:

- `target: "source_filter"`, `outcome: "created"`: allows `afterSequence`, `timeoutMs`, `sourceName`, `filterName`, `filterKind`, `filterIndex`; forbids `oldFilterName`, `filterEnabled`, settings fields, source UUID fields, and raw event fields.
- `target: "source_filter"`, `outcome: "removed"`: allows `afterSequence`, `timeoutMs`, `sourceName`, `filterName`; forbids `oldFilterName`, `filterKind`, `filterIndex`, `filterEnabled`, settings fields, source UUID fields, and raw event fields.
- `target: "source_filter"`, `outcome: "renamed"`: allows `afterSequence`, `timeoutMs`, `sourceName`, `filterName`, `oldFilterName`; forbids `filterKind`, `filterIndex`, `filterEnabled`, settings fields, source UUID fields, and raw event fields.
- `target: "source_filter"`, `outcome: "reordered"`: allows `afterSequence`, `timeoutMs`, `sourceName`, `filterName`, `filterIndex`; forbids `oldFilterName`, `filterKind`, `filterEnabled`, settings fields, source UUID fields, and raw event fields.
- `target: "source_filter"`, `outcome: "enabled" | "disabled"`: allows `afterSequence`, `timeoutMs`, `sourceName`, `filterName`; forbids `oldFilterName`, `filterKind`, `filterIndex`, `filterEnabled`, settings fields, source UUID fields, and raw event fields.
- `target: "source_filter"`, `outcome: "settings_changed"`: allows `afterSequence`, `timeoutMs`, `sourceName`, `filterName`; forbids `oldFilterName`, `filterKind`, `filterIndex`, `filterEnabled`, settings fields, source UUID fields, and raw event fields.

Outputs:

- `confirmed: boolean`
- `timedOut: boolean`
- `baselineSequence: EventCursor`
- `latestSequence: EventCursor`
- `missedEvents: boolean`
- `event?: SourceFilterChangeEventSummary`

Confirmation behavior:

- Return the first matching retained or newly observed event after `afterSequence`.
- If a matching event is already retained after the cursor, return immediately.
- If no match appears before timeout, return `confirmed: false`, `timedOut: true`, current cursor metadata, and no `event`.
- If OBS closes/disconnects or the MCP server closes while waiting, reject immediately and clean up the waiter without leaving timers active.
- Do not infer confirmation from current OBS request state. This tool confirms observed events only.

## Narrow Types and Schemas

Reuse existing event types:

- `EventSequence`: positive safe integer for retained event sequence values.
- `EventCursor`: non-negative safe integer for cursors and metadata; `0` is valid before the first event.
- `EventCount`: non-negative safe integer for counts.
- `EventTimeoutMs`: positive bounded integer capped by configuration/request timeout.

Add source filter workflow types:

- `SourceFilterChangeTarget`: literal `source_filter`.
- `SourceFilterChangeOutcome`: `created | removed | renamed | reordered | enabled | disabled | settings_changed`.
- `SourceFilterChangeEventType`: exactly the six included event names.
- `SourceFilterIndex`: non-negative safe integer for OBS filter indexes. Do not use generic signed `ObsInteger`.
- `SourceFilterOrderingItem`: `filterName: ObsString`, `filterIndex: SourceFilterIndex`.
- `SourceFilterSettingsOmission`: literal `true` marker fields that make raw settings omission explicit.

Primitive type rules:

- User-provided identity filters use `ObsNonEmptyString`.
- Observed event output text uses `ObsString`, matching existing protocol-boundary conventions.
- `filterIndex` uses a non-negative safe integer in inputs, event codec outputs, and workflow summaries.
- Do not reuse bare `ObsNonNegativeInteger` for `SourceFilterIndex`; it lacks the safe-integer upper bound required for JavaScript-visible identity and ordering fields.
- `SourceFilterListReindexed.filters` must be decoded as an array of sanitized items with `filterName` and `filterIndex` only.
- Settings-bearing event codecs must pick only safe primitive fields before public summary construction.
- Event intent and subscription masks are protocol metadata, not user inputs.

`SourceFilterChangeEventSummary` must be a discriminated union keyed by `eventType`, with `target` and `outcome` constrained by each shape:

Summary construction must exact-decode this union with `onExcessProperty: "error"` before returning a workflow event. This is required for settings-bearing events so accidental `filterSettings`, `defaultFilterSettings`, or other raw payload fields fail instead of being silently stripped by default schema decoding.

- `SourceFilterCreated`: `target: "source_filter"`, `outcome: "created"`, `category: "filters"`, `sourceName`, `filterName`, `filterKind`, `filterIndex`, `rawSettingsOmitted: true`, `defaultSettingsOmitted: true`
- `SourceFilterRemoved`: `target: "source_filter"`, `outcome: "removed"`, `category: "filters"`, `sourceName`, `filterName`
- `SourceFilterNameChanged`: `target: "source_filter"`, `outcome: "renamed"`, `category: "filters"`, `sourceName`, `oldFilterName`, `filterName`
- `SourceFilterListReindexed`: `target: "source_filter"`, `outcome: "reordered"`, `category: "filters"`, `sourceName`, `filters: SourceFilterOrderingItem[]`
- `SourceFilterEnableStateChanged`: `target: "source_filter"`, `outcome: "enabled"`, `category: "filters"`, `sourceName`, `filterName`, `filterEnabled: true`
- `SourceFilterEnableStateChanged`: `target: "source_filter"`, `outcome: "disabled"`, `category: "filters"`, `sourceName`, `filterName`, `filterEnabled: false`
- `SourceFilterSettingsChanged`: `target: "source_filter"`, `outcome: "settings_changed"`, `category: "filters"`, `sourceName`, `filterName`, `rawSettingsOmitted: true`

Malformed summaries such as `SourceFilterEnableStateChanged` with `outcome: "settings_changed"`, `SourceFilterSettingsChanged` with `filterSettings`, or `SourceFilterCreated` with a negative `filterIndex` must fail schema decode.

## Event Journal and Cursor Semantics

This slice must reuse the bounded in-memory event journal introduced for output lifecycle confirmation.

Requirements:

- No second filter-specific buffer.
- No duplicated cursor, eviction, timeout, or waiter cleanup logic.
- Match predicates are internal typed functions built from `SourceFilterChangeTarget`, `SourceFilterChangeOutcome`, and optional identity filters.
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

Resources remain deferred. A future source/filter resource could expose application-selected filter state, and source filter events could later invalidate that state through standard resource update notifications. This PRD does not define resource URI conventions and does not require resource support.

## Safety Policy

Public workflow confirmation requires all of:

- The event is one of the six included events in this PRD.
- The official subscription is `Filters` and matches the received event intent.
- The event decodes through the typed Effect Schema event codec.
- The workflow summary decodes through a discriminated schema keyed by event type, target, and outcome.
- Settings-bearing payloads are sanitized before public exposure.
- Raw objects, arbitrary settings, vendor/custom payloads, high-volume signals, regex predicates, and raw event query fields are excluded from workflow inputs and outputs.

Rejected or malformed event payloads must not satisfy `confirm_obs_source_filter_change`. Rejection accounting should reuse existing diagnostic reasons where applicable, such as `unsafe_policy`, `subscription_mismatch`, and `decode_failed`.

## Acceptance Criteria

- The slice includes exactly the six `SourceFilter*` events listed in "Included Events".
- `confirm_obs_source_filter_change` accepts only outcome-shaped discriminated input variants.
- Unsupported outcomes and unrelated optional fields are rejected by input schema.
- Raw `eventType`, `eventIntent`, `eventData`, `payload`, `regex`, `sourceUuid`, `canvasUuid`, `filterSettings`, and `defaultFilterSettings` inputs are rejected.
- The exported operation directly decodes public workflow input with `onExcessProperty: "error"`.
- `SourceFilterCreated` and `SourceFilterSettingsChanged` summaries omit raw settings fields and include explicit omission markers.
- Workflow summary construction exact-decodes the output summary with `onExcessProperty: "error"` so raw settings fields fail schema decode instead of being stripped.
- `SourceFilterListReindexed` exposes only sanitized ordering items with `filterName` and non-negative safe integer `filterIndex`.
- Negative, fractional, or larger-than-safe-integer `filterIndex` values are rejected in inputs, event summaries, and reindexed arrays.
- Output summaries are discriminated by `eventType`, `target`, and `outcome`.
- Malformed target/outcome/primitive combinations fail schema decode.
- `afterSequence: 0` is accepted; actual event `sequence: 0` is rejected.
- `missedEvents` propagates from the event journal for retained reads and waits.
- Wait success, timeout, OBS close/disconnect, and MCP server close all clean up waiters; close/disconnect reject immediately without post-close timers.
- Existing output lifecycle and scene graph confirmation tools keep working unchanged.
- Existing filter request tools continue to work when the `events` toolset is disabled.
- No MCP resources or custom OBS event notifications are added.

## Test Plan

Schema tests:

- `ConfirmObsSourceFilterChangeInput` accepts every supported outcome variant.
- `ConfirmObsSourceFilterChangeInput` rejects unsupported outcomes, raw event fields, regex, arbitrary payload fields, source UUID fields, and settings fields.
- `ConfirmObsSourceFilterChangeInput` rejects fields unrelated to the selected outcome, including `oldFilterName` outside rename and `filterKind` outside create.
- `ConfirmObsSourceFilterChangeInput` rejects empty string identity filters.
- `ConfirmObsSourceFilterChangeInput` accepts `afterSequence: 0`.
- `ConfirmObsSourceFilterChangeInput` rejects negative, fractional, and larger-than-safe-integer `filterIndex`.
- `SourceFilterChangeEventSummary` accepts valid summaries for all six included event types, including both enabled and disabled variants.
- `SourceFilterChangeEventSummary` rejects malformed target/outcome combinations.
- `SourceFilterChangeEventSummary` rejects summaries containing `filterSettings` or `defaultFilterSettings`.
- `SourceFilterChangeEventSummary` rejects invalid `filterIndex` values in created and reindexed summaries.
- Actual event `sequence: 0` is rejected as `EventSequence`.

Operation tests:

- Each included event type can satisfy `confirm_obs_source_filter_change` with the correct outcome.
- Optional identity filters narrow matches by `sourceName`, `filterName`, `oldFilterName`, `filterKind`, and `filterIndex` where applicable.
- `SourceFilterEnableStateChanged` maps `filterEnabled: true` to `enabled` and `filterEnabled: false` to `disabled`.
- `SourceFilterListReindexed` matches by a sanitized ordering item when `filterName` and/or `filterIndex` are provided.
- `SourceFilterCreated` omits raw settings and default settings from the workflow summary.
- `SourceFilterSettingsChanged` omits raw settings from the workflow summary and does not attempt value-level confirmation.
- `missedEvents` is propagated when the requested cursor predates the retained journal window.
- Timeout returns `confirmed: false`, `timedOut: true`, and no event.
- OBS close/disconnect rejects a pending wait immediately and leaves no active waiter/timer.
- Events outside the six included filter events cannot satisfy the workflow confirmation tool.

MCP tests:

- Tool registry includes `confirm_obs_source_filter_change` only when the `events` toolset is enabled.
- MCP structured content matches the output schema for every included event type.
- Invalid input is rejected before reaching OBS operations.
- Existing `get_recent_obs_events` cursor behavior remains unchanged.
- Existing output lifecycle and scene graph MCP tests remain unchanged.

Protocol/fake OBS tests:

- Safe event subscription negotiation includes `Filters`.
- Fake OBS event ingestion covers all six included source filter event types.
- Subscription mismatch and decode failure do not produce public confirmation events.
- Settings-bearing fake events with raw object payloads are sanitized before they reach workflow summary construction.
- Diagnostic history may contain sanitized filter event data, but workflow confirmation never exposes raw settings.

## Learnings Carried Forward

1. Use outcome-shaped workflow tools only; do not add raw event bus, raw event query language, custom event notification, or event subscription tools.
2. Keep `EventSequence` and `EventCursor` distinct: retained event sequences are positive; cursors and metadata are non-negative; `afterSequence: 0` is valid.
3. Public tool inputs must be discriminated variants with forbidden unrelated fields.
4. MCP executor excess-field rejection is not enough; exported public operations must decode workflow inputs with `onExcessProperty: "error"`.
5. Output summaries must be discriminated by `eventType`, `target`, and `outcome`, and malformed combinations must fail schema decode.
6. Typed event codecs must tighten primitive fields used by workflow summaries, especially non-negative safe integer filter indexes.
7. Diagnostic-only events and fields must not become workflow inputs, outputs, or wait predicates.
8. High-volume, vendor/custom, raw-object, and settings-bearing payloads remain out unless a sanitized summary is explicitly designed.
9. Resources remain deferred. Future resource invalidation can be mentioned conceptually, but this slice must not define resource URI conventions.
10. Tests must cover all included event types, unsupported variants, unrelated/excess fields, primitive bounds, zero cursor, `missedEvents`, timeout, excluded events/fields, and strict direct operation decode.

## Open Questions

- Should future filter mutation tools optionally return a pre-action cursor to reduce caller friction, or should cursor capture remain an explicit `get_recent_obs_events` step?
- Should a later resource slice expose current sanitized filter state for application-selected context, separate from event confirmation?
- Should a future settings-specific design support allowlisted value confirmation for known filter kinds, or is event-level settings-change confirmation sufficient?
