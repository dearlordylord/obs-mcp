# PRD: OBS Events Slice 9 - Studio Mode State Confirmation

Status: draft.

Date: 2026-06-13.

## Problem

The previous OBS event slices add confirmation only when an event answers a narrow workflow question after a known cursor. The remaining `Ui` subscription events are not equally useful:

- `StudioModeStateChanged` reports a simple boolean UI state change.
- `ScreenshotSaved` reports OBS's hotkey screenshot-output feature, not this server's `save_source_screenshot` tool.

This slice should add a narrow studio-mode state confirmation tool only if we keep its semantics honest: it confirms that OBS emitted a studio-mode enabled/disabled event after a cursor. It does not imply that the MCP server changed studio mode, because this repository intentionally does not expose `SetStudioModeEnabled` as a public tool today.

## Goals

- Add confirmation for observed `StudioModeStateChanged` events.
- Reuse the existing event journal, cursor, timeout, and waiter cleanup semantics.
- Include only the low-volume typed-safe `Ui` event that carries a primitive boolean state.
- Keep public input outcome-shaped and exact.
- Use exact public workflow input and summary decoding with `onExcessProperty: "error"`.
- Keep `ScreenshotSaved` diagnostic-only.
- Avoid adding MCP resources, event subscriptions, or custom notifications.

## Non-Goals

- Do not add `SetStudioModeEnabled` or any studio-mode mutation tool in this slice.
- Do not claim to confirm `trigger_studio_mode_transition`; that transition request does not enable or disable studio mode.
- Do not include `ScreenshotSaved`.
- Do not add `confirm_obs_ui_event`, `get_ui_events`, `wait_for_obs_event`, or a generic UI event query.
- Do not add server-initiated OBS event notifications.
- Do not add MCP resource templates or resource subscriptions.
- Do not infer current studio-mode state from the event after the response; use `get_studio_mode_enabled` for authoritative current state.
- Do not expose raw event intents, raw event data, arbitrary payloads, regex predicates, or filesystem paths.

## Slice Choice

Studio-mode state confirmation is a small, lower-value slice than the earlier workflow confirmations because the repo has no public `set_studio_mode_enabled` tool. It is still defensible because:

- The repo already exposes `get_studio_mode_enabled`.
- Manual or external OBS UI state changes can affect workflows that use preview/program behavior.
- The event payload is a single safe boolean.
- The tool can remain explicitly named and scoped.

`ScreenshotSaved` is excluded. The priority matrix says it is triggered only by OBS's hotkey screenshot-output feature, not by `GetSourceScreenshot` or `SaveSourceScreenshot`. It also carries an arbitrary OBS-reported path, while this server's screenshot save tool intentionally constrains output paths to `OBS_MCP_SCREENSHOT_OUTPUT_DIR` plus a safe filename. Public confirmation would imply a false relationship and weaken the path-policy boundary.

## Included Events

The full event catalogue lives in `plans/obs-event-catalogue.md`. This slice includes exactly one event:

| Event | Subscription | Workflow Target | Workflow Outcome | Public Summary Policy |
| --- | --- | --- | --- | --- |
| `StudioModeStateChanged` | `Ui` | `studio_mode` | `enabled` or `disabled` | Include the reported boolean state. |

## Explicitly Excluded Events

| Event | Reason |
| --- | --- |
| `ScreenshotSaved` | OBS hotkey screenshot-output event only; not confirmation for this server's screenshot tools; carries arbitrary OBS path. |
| Transition events | Already covered by transition workflow confirmation. |
| `trigger_studio_mode_transition` request acknowledgement | Transition trigger, not studio-mode enabled-state mutation. |
| UI dialog/projector requests | Local side effects with no matching included state event. |

Diagnostic-safe `ScreenshotSaved` events may remain visible through `get_recent_obs_events` if the global event policy allows them. This slice must not add them to a public confirm surface.

## Proposed MCP Tool

### `confirm_obs_studio_mode_state_change`

Purpose: wait for a typed studio-mode enabled/disabled event after a known event cursor.

Inputs:

- `target`: `studio_mode`
- `outcome`: `enabled | disabled`
- `afterSequence`: required `EventCursor`
- `timeoutMs?: EventTimeoutMs`, capped by the configured OBS connection/request timeout

Input rules:

- The public input schema must be exact.
- `afterSequence` is required for post-observation confirmation.
- Raw OBS event names are not accepted as inputs.
- `studioModeEnabled` is not accepted as an input; callers use `outcome`.
- `eventType`, `eventIntent`, `eventData`, `payload`, `regex`, `savedScreenshotPath`, scene fields, input fields, transition fields, config fields, canvas fields, screenshot fields, and arbitrary object fields are forbidden.
- The MCP executor rejects excess fields, and the exported operation entry point must also decode this public input with `onExcessProperty: "error"`.

Outputs:

- `confirmed: boolean`
- `timedOut: boolean`
- `baselineSequence: EventCursor`
- `latestSequence: EventCursor`
- `missedEvents: boolean`
- `event?: StudioModeStateChangeEventSummary`

Confirmation behavior:

- Return the first matching retained or newly observed event after `afterSequence`.
- If a matching event is already retained after the cursor, return immediately.
- If no match appears before timeout, return `confirmed: false`, `timedOut: true`, current cursor metadata, and no `event`.
- If OBS closes/disconnects or the MCP server closes while waiting, reject immediately and clean up the waiter without leaving timers active.
- Do not infer confirmation from `get_studio_mode_enabled`.
- Do not treat `ScreenshotSaved` or transition events as satisfying this workflow.

## Narrow Types and Schemas

Reuse existing event types:

- `EventSequence`: positive safe integer for retained event sequence values.
- `EventCursor`: non-negative safe integer for cursors and metadata; `0` is valid before the first event.
- `EventCount`: non-negative safe integer for counts.
- `EventTimeoutMs`: positive bounded integer capped by configuration/request timeout.

Add studio-mode workflow types:

- `StudioModeStateChangeTarget`: `studio_mode`.
- `StudioModeStateChangeOutcome`: `enabled | disabled`.
- `StudioModeStateChangeEventType`: exactly `StudioModeStateChanged`.
- `UiEventIntent`: the exact `Ui` subscription intent, not arbitrary `EventIntent`.

Primitive type rules:

- `studioModeEnabled` is a boolean in raw protocol data and public summary data.
- Public input uses outcome literals rather than duplicating the boolean field.
- `eventIntent` in workflow summaries must be the exact UI subscription intent, not a generic safe integer.
- Event intent and subscription masks are protocol metadata, not user inputs.

## Schema Variants

The public input schema has one exact shape:

- `target: "studio_mode"`, `outcome: "enabled" | "disabled"`, `afterSequence`, optional `timeoutMs`.

`StudioModeStateChangeEventSummary` must be a discriminated summary:

- `StudioModeStateChanged`: `sequence`, `eventIntent`, `eventType: "StudioModeStateChanged"`, `category: "ui"`, `target: "studio_mode"`, `outcome: "enabled" | "disabled"`, `studioModeEnabled`.

Summary construction must exact-decode this shape with `onExcessProperty: "error"` before returning or matching. Malformed summaries such as `outcome: "enabled"` with `studioModeEnabled: false`, wrong event intent, `savedScreenshotPath`, or excess fields must fail schema decode.

## Event Journal and Cursor Semantics

This slice must reuse the bounded in-memory event journal introduced for output lifecycle confirmation.

Requirements:

- No second UI-specific buffer.
- No duplicated cursor, eviction, timeout, or waiter cleanup logic.
- Match predicates are internal typed functions built from the requested outcome.
- `missedEvents` propagation matches earlier event slices exactly.
- `afterSequence: 0` is valid and means "after server start before any observed event."
- Actual retained event `sequence` values remain positive `EventSequence`.
- `baselineSequence` echoes the cursor used for the wait.
- `latestSequence` reports the journal latest sequence when the tool returns.
- `missedEvents` is `true` when `afterSequence` is older than the retained journal window, such as `afterSequence < oldestSequence - 1`.

## Matching Semantics

Public workflow confirmation requires all of:

- The event type is `StudioModeStateChanged`.
- The event intent exactly equals the official `Ui` subscription.
- The event decodes through the typed event codec.
- The workflow summary exact-decodes through `StudioModeStateChangeEventSummary`.
- `target` equals `studio_mode`.
- `outcome` equals `enabled` when `studioModeEnabled` is `true`.
- `outcome` equals `disabled` when `studioModeEnabled` is `false`.

## Safety Policy

Public workflow confirmation requires all of:

- The event is `StudioModeStateChanged`.
- The official subscription matches the received event intent.
- The event is decoded through the typed Effect Schema event codec.
- The event is not a screenshot, high-volume, raw vendor/custom, settings-bearing, or object-payload event.
- The event summary includes only typed state fields.

Rejected event payloads are not retained for public workflow confirmation. Rejection accounting should reuse existing diagnostic reasons where applicable:

- `unsafe_policy`
- `subscription_mismatch`
- `decode_failed`

## Implementation Notes

Expected code changes:

- `src/domain/schemas/events.ts`
  - Add studio-mode target/outcome/event type schemas.
  - Add exact public input/output/summary schemas.
  - Tighten `decodeTypedObsEventData` for `StudioModeStateChanged` with `onExcessProperty: "error"`.
  - Leave `ScreenshotSaved` diagnostic-only.
- `src/obs/operations/events.ts`
  - Add exact summary decoder.
  - Add `studioModeStateChangeSummaryFor`.
  - Add `studioModeStateChangeMatches`.
  - Add `confirmObsStudioModeStateChange`.
- `src/mcp/tools/events.ts`
  - Register `confirm_obs_studio_mode_state_change` under the events toolset with no required OBS requests.
- Tests:
  - Extend protocol schema tests.
  - Extend client ingestion tests for malformed/excess studio-mode payloads.
  - Extend operation confirmation tests.
  - Extend MCP registry and server structured-content tests.

## Acceptance Criteria

- `confirm_obs_studio_mode_state_change` is registered only in the `events` toolset.
- The slice includes exactly `StudioModeStateChanged`.
- `ScreenshotSaved` remains diagnostic-only and cannot satisfy the confirm tool.
- Direct operation input decode rejects excess fields with `onExcessProperty: "error"`.
- Input rejects `studioModeEnabled`, `eventType`, `eventIntent`, `eventData`, `payload`, `regex`, `savedScreenshotPath`, and unrelated workflow fields.
- Public summaries reject wrong event intent, unsafe event intent, wrong target/outcome, boolean/outcome mismatch, sequence `0`, `savedScreenshotPath`, and excess fields.
- Typed event ingestion exact-rejects excess fields for `StudioModeStateChanged`.
- Malformed retained diagnostic UI events cannot satisfy workflow confirmation.
- Enabled and disabled outcomes match exactly.
- `get_recent_obs_events` can still return safe UI diagnostic events according to existing policy.
- `get_studio_mode_enabled` remains the current-state read surface.
- `pnpm -s typecheck` passes.
- Focused event/MCP tests pass.
- `pnpm -s lint` passes with 0 clones.

## Open Questions

- Should this slice also add `SetStudioModeEnabled`? Recommendation: no. That is a separate UI mutation design and has been deferred by the existing request ledger.
- Should `ScreenshotSaved` ever become public confirmation? Recommendation: only if a future screenshot design explicitly models OBS hotkey screenshot output and its arbitrary path policy. It should not confirm this server's source screenshot save tool.
