# PRD: OBS Events Slice 10 - Input Identity Change Confirmation

Status: draft.

Date: 2026-06-13.

## Problem

The repository already exposes input mutation and read tools:

- `create_input`
- `remove_input`
- `set_input_name`
- `list_inputs`
- `get_input_settings`
- `set_input_settings`

Not all input events are safe to promote to workflow confirmation. `InputRemoved` and `InputNameChanged` are pure identity events. `InputCreated` and `InputSettingsChanged` carry raw OBS settings objects and remain deferred until a separate sanitized settings/event design exists.

This slice should answer only:

- Did OBS report that an input was removed after my cursor?
- Did OBS report that an input was renamed after my cursor?
- Did the observed event match optional input identity filters carried by the event?

The confirmation remains event-level. It does not replace `list_inputs` as the authoritative current inventory and does not expose raw input settings.

## Goals

- Add workflow confirmation for low-volume input identity changes.
- Reuse the existing event journal, cursor, timeout, and waiter cleanup semantics.
- Include only typed-safe `Inputs` subscription events with primitive identity payloads.
- Keep public input outcome-shaped and exact.
- Use exact public workflow input and summary decoding with `onExcessProperty: "error"`.
- Use non-empty input identity primitives at the public workflow boundary.
- Keep settings-bearing input events deferred.
- Avoid MCP resources, event subscriptions, or custom notifications.

## Non-Goals

- Do not include `InputCreated`.
- Do not include `InputSettingsChanged`.
- Do not expose raw `inputSettings`, `defaultInputSettings`, `inputKindCaps`, or arbitrary settings objects.
- Do not expose input creation as a workflow event until a sanitized creation summary is deliberately designed.
- Do not infer current input inventory from events; use `list_inputs`.
- Do not infer current settings from events; use `get_input_settings`.
- Do not add `confirm_obs_input_event`, `get_input_events`, `wait_for_obs_event`, or any generic input event query.
- Do not add server-initiated OBS event notifications.
- Do not add MCP resource templates or resource subscriptions.

## Slice Choice

Input identity change confirmation is a narrow follow-up to input audio controls and media input workflows.

Reasons:

- `remove_input` and `set_input_name` already exist as public mutation tools.
- `InputRemoved` and `InputNameChanged` are low-volume `Inputs` events with small primitive payloads.
- The events directly confirm identity/inventory changes without raw settings.
- `InputCreated` is lifecycle-adjacent but carries raw settings, default settings, kind fields, and `inputKindCaps`; adding it now would either leak settings or expose event metadata without a strong workflow.
- `InputSettingsChanged` belongs to a separate settings confirmation design because it carries raw settings.

## Included Events

The full event catalogue lives in `plans/obs-event-catalogue.md`. This slice includes exactly these input identity events:

| Event | Subscription | Workflow Target | Workflow Outcome | Public Summary Policy |
| --- | --- | --- | --- | --- |
| `InputRemoved` | `Inputs` | `input` | `removed` | Include input name and UUID. |
| `InputNameChanged` | `Inputs` | `input` | `renamed` | Include old input name, new input name, and UUID. |

## Explicitly Excluded Events

| Event | Reason |
| --- | --- |
| `InputCreated` | Settings-bearing creation event; defer until a sanitized summary with raw settings omitted is designed. |
| `InputSettingsChanged` | Raw settings payload; defer to a separate settings confirmation design. |
| Input audio events | Already covered by `confirm_obs_input_audio_change`. |
| Media input events | Already covered by `confirm_obs_media_input_workflow`. |
| `InputActiveStateChanged`, `InputShowStateChanged`, `InputVolumeMeters` | High-volume or visual/activity signals requiring separate aggregate design. |

Diagnostic-safe input events may remain visible through `get_recent_obs_events` according to the global policy. This slice must not add excluded input events to a public confirm surface.

## Proposed MCP Tool

### `confirm_obs_input_identity_change`

Purpose: wait for a typed input removal or rename event after a known event cursor.

Inputs:

- `target`: `input`
- `outcome`: `removed | renamed`
- `afterSequence`: required `EventCursor`
- `timeoutMs?: EventTimeoutMs`, capped by the configured OBS connection/request timeout
- `inputName?: ObsNonEmptyString`
- `inputUuid?: ObsNonEmptyString`
- `oldInputName?: ObsNonEmptyString`

Input rules:

- The public input schema must be an exact discriminated union of supported variants.
- `afterSequence` is required for post-action confirmation.
- Raw OBS event names are not accepted as inputs.
- `inputName` and `inputUuid` are optional identity filters on both variants because both included events carry them.
- `oldInputName` is allowed only on `renamed`.
- Value matching uses exact decoded JSON value equality.
- `eventType`, `eventIntent`, `eventData`, `payload`, `regex`, `inputSettings`, `defaultInputSettings`, `inputKind`, `unversionedInputKind`, `inputKindCaps`, `sceneItemId`, scene fields, source fields, filter fields, transition fields, config fields, canvas fields, screenshot fields, and arbitrary object fields are forbidden.
- The MCP executor rejects excess fields, and the exported operation entry point must also decode this public input with `onExcessProperty: "error"`.

Input variants:

- `target: "input"`, `outcome: "removed"`: allows `afterSequence`, `timeoutMs`, `inputName`, and `inputUuid`; forbids `oldInputName` and settings/kind fields.
- `target: "input"`, `outcome: "renamed"`: allows `afterSequence`, `timeoutMs`, `inputName`, `inputUuid`, and `oldInputName`; forbids settings/kind fields.

Outputs:

- `confirmed: boolean`
- `timedOut: boolean`
- `baselineSequence: EventCursor`
- `latestSequence: EventCursor`
- `missedEvents: boolean`
- `event?: InputIdentityChangeEventSummary`

Confirmation behavior:

- Return the first matching retained or newly observed event after `afterSequence`.
- If a matching event is already retained after the cursor, return immediately.
- If no match appears before timeout, return `confirmed: false`, `timedOut: true`, current cursor metadata, and no `event`.
- If OBS closes/disconnects or the MCP server closes while waiting, reject immediately and clean up the waiter without leaving timers active.
- Do not infer confirmation from `list_inputs` or request acknowledgements.
- Do not treat `InputCreated` or `InputSettingsChanged` as satisfying this workflow.

## Narrow Types and Schemas

Reuse existing event types:

- `EventSequence`: positive safe integer for retained event sequence values.
- `EventCursor`: non-negative safe integer for cursors and metadata; `0` is valid before the first event.
- `EventCount`: non-negative safe integer for counts.
- `EventTimeoutMs`: positive bounded integer capped by configuration/request timeout.

Add input identity workflow types:

- `InputIdentityChangeTarget`: `input`.
- `InputIdentityChangeOutcome`: `removed | renamed`.
- `InputIdentityChangeEventType`: exactly `InputRemoved | InputNameChanged`.
- `InputIdentityName`: non-empty string for public input names in filters and summaries.
- `InputIdentityUuid`: non-empty string for public input UUIDs in filters and summaries.
- `InputsEventIntent`: the exact `Inputs` subscription intent, not arbitrary `EventIntent`.

Primitive type rules:

- User-provided identity filters use non-empty input name/UUID primitives.
- Public workflow summaries expose `inputName`, `inputUuid`, and `oldInputName` as non-empty primitives.
- Raw protocol event data may start as `ObsString` for diagnostic decode, but empty input identity values must not become matching workflow summaries.
- `eventIntent` in workflow summaries must be the exact `Inputs` subscription intent, not a generic safe integer.
- Event intent and subscription masks are protocol metadata, not user inputs.

## Schema Variants

The public input schema is an exact discriminated union:

- Input removed variant: `target: "input"`, `outcome: "removed"`.
- Input renamed variant: `target: "input"`, `outcome: "renamed"`.

`InputIdentityChangeEventSummary` must be a discriminated union keyed by `eventType`:

- `InputRemoved`: `sequence`, `eventIntent`, `eventType: "InputRemoved"`, `category: "inputs"`, `target: "input"`, `outcome: "removed"`, `inputName`, `inputUuid`.
- `InputNameChanged`: `sequence`, `eventIntent`, `eventType: "InputNameChanged"`, `category: "inputs"`, `target: "input"`, `outcome: "renamed"`, `oldInputName`, `inputName`, `inputUuid`.

Summary construction must exact-decode this union with `onExcessProperty: "error"` before returning or matching. Malformed summaries such as `InputRemoved` with `oldInputName`, `InputNameChanged` without `oldInputName`, empty input identity, wrong event intent, settings fields, or excess fields must fail schema decode.

## Event Journal and Cursor Semantics

This slice must reuse the bounded in-memory event journal introduced for output lifecycle confirmation.

Requirements:

- No second input-specific buffer.
- No duplicated cursor, eviction, timeout, or waiter cleanup logic.
- Match predicates are internal typed functions built from the requested outcome and optional identity filters.
- `missedEvents` propagation matches earlier event slices exactly.
- `afterSequence: 0` is valid and means "after server start before any observed event."
- Actual retained event `sequence` values remain positive `EventSequence`.
- `baselineSequence` echoes the cursor used for the wait.
- `latestSequence` reports the journal latest sequence when the tool returns.
- `missedEvents` is `true` when `afterSequence` is older than the retained journal window, such as `afterSequence < oldestSequence - 1`.

## Matching Semantics

Public workflow confirmation requires all of:

- The event type is `InputRemoved` or `InputNameChanged`.
- The event intent exactly equals the official `Inputs` subscription.
- The event decodes through the typed event codec.
- The workflow summary exact-decodes through `InputIdentityChangeEventSummary`.
- `target` equals `input`.
- `outcome` equals the requested outcome.
- If `inputName` is provided, it equals summary `inputName`.
- If `inputUuid` is provided, it equals summary `inputUuid`.
- If `oldInputName` is provided, the event is `InputNameChanged` and it equals summary `oldInputName`.

No regex, substring, case-insensitive, contains, prefix, settings, kind, or scene-item matching is allowed.

## Safety Policy

Public workflow confirmation requires all of:

- The event is one of the two included events in this PRD.
- The official subscription matches the received event intent.
- The event is decoded through the typed Effect Schema event codec.
- The event is not high-volume, raw vendor/custom, settings-bearing, or object-payload based.
- The event summary includes only typed input identity fields.

Rejected event payloads are not retained for public workflow confirmation. Rejection accounting should reuse existing diagnostic reasons where applicable:

- `unsafe_policy`
- `subscription_mismatch`
- `decode_failed`

## Implementation Notes

Expected code changes:

- `src/domain/schemas/events.ts`
  - Add input identity target/outcome/event type schemas.
  - Add exact public input/output/summary schemas.
  - Tighten `decodeTypedObsEventData` for `InputRemoved` and `InputNameChanged` with `onExcessProperty: "error"`.
  - Leave `InputCreated` and `InputSettingsChanged` out of workflow summaries.
- `src/obs/operations/events.ts`
  - Add exact summary decoder.
  - Add `inputIdentityChangeSummaryFor`.
  - Add `inputIdentityChangeMatches`.
  - Add `confirmObsInputIdentityChange`.
- `src/mcp/tools/events.ts`
  - Register `confirm_obs_input_identity_change` under the events toolset with no required OBS requests.
- Tests:
  - Extend protocol schema tests.
  - Extend client ingestion tests for malformed/excess input identity payloads.
  - Extend operation confirmation tests.
  - Extend MCP registry and server structured-content tests.

## Acceptance Criteria

- `confirm_obs_input_identity_change` is registered only in the `events` toolset.
- The slice includes exactly `InputRemoved` and `InputNameChanged`.
- `InputCreated` and `InputSettingsChanged` remain deferred/diagnostic and cannot satisfy the confirm tool.
- Direct operation input decode rejects excess fields with `onExcessProperty: "error"`.
- Removed variant rejects `oldInputName`.
- Renamed variant allows `oldInputName`.
- Public input filters reject empty `inputName`, empty `oldInputName`, and empty `inputUuid`.
- Public summaries reject empty identity values, wrong event intent, unsafe event intent, wrong target/outcome, sequence `0`, settings/kind/caps fields, raw event fields, and excess fields.
- Typed event ingestion exact-rejects excess fields for `InputRemoved` and `InputNameChanged`.
- Malformed retained diagnostic input events cannot satisfy workflow confirmation.
- Optional identity filters narrow matches exactly.
- `get_recent_obs_events` can still return safe input diagnostic events according to existing policy.
- `list_inputs` remains the current-state read surface.
- `pnpm -s typecheck` passes.
- Focused event/MCP tests pass.
- `pnpm -s lint` passes with 0 clones.

## Open Questions

- Should `InputCreated` be added later with raw settings omitted? Recommendation: only if a real workflow needs creation-event confirmation beyond `create_input` response plus `list_inputs`; that future slice must explicitly omit raw settings and default settings.
- Should `InputSettingsChanged` be added later? Recommendation: yes only as a separate settings-confirmation PRD that reuses the existing allowlisted/sanitized settings model and never exposes raw settings objects.
