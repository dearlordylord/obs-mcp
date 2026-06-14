# PRD: OBS Events Slice 8 - Canvas Inventory Change Confirmation

Status: draft.

Date: 2026-06-13.

## Problem

The first seven OBS event slices established a narrow posture: events confirm specific workflows after a known cursor; they are not a public OBS event bus.

The next slice should cover canvas inventory-change workflows because the repository already exposes a canvas read surface:

- `list_canvases`

That tool returns sanitized canvas summaries. It does not let an agent confirm that OBS emitted a canvas creation, removal, or rename event after a mutation done outside this MCP server or after a caller captured an event cursor. This slice should answer only narrow questions:

- Did OBS report that a canvas was created after my cursor?
- Did OBS report that a canvas was removed after my cursor?
- Did OBS report that a canvas was renamed after my cursor?
- Did the observed event match optional canvas identity filters carried by the event?

The confirmation remains event-level. It does not replace `list_canvases` as the authoritative current canvas list.

## Goals

- Add workflow confirmation for low-volume canvas inventory-change events.
- Reuse the existing event journal, cursor, timeout, and waiter cleanup semantics.
- Include only typed-safe `Canvases` subscription events with primitive payloads.
- Keep public inputs outcome-shaped and discriminated by supported workflow variants.
- Use exact public workflow input and summary decoding with `onExcessProperty: "error"`.
- Require non-empty public canvas identity primitives for workflow inputs and summaries.
- Preserve diagnostic visibility through `get_recent_obs_events` without turning diagnostic history into a workflow API.
- Keep the canvas event surface connected to the existing `list_canvases` domain surface without inventing MCP resources.

## Non-Goals

- Do not expose a raw canvas event stream.
- Do not add `wait_for_obs_event`, `subscribe_to_obs_event`, `get_canvas_events`, or a query language over event history.
- Do not add server-initiated `notifications/obs/event` messages.
- Do not add MCP resource templates or resource subscriptions in this slice.
- Do not add canvas mutation tools; this slice confirms observed events only.
- Do not infer current canvas list state from events.
- Do not auto-call `list_canvases` after confirmation.
- Do not include UI, screenshot, scene, input, output, transition, filter, config, vendor, or custom events.
- Do not expose raw event intents, arbitrary event payloads, regex predicates, vendor/custom payloads, or object-shaped settings.

## Slice Choice

Canvas inventory-change confirmation is the recommended next slice after config workflow.

Reasons:

- The repository already has a `canvases` toolset and a `list_canvases` read model.
- The candidate events are low-volume `Canvases` subscription events.
- The payloads are small and primitive: canvas name and UUID, plus old name on rename.
- The slice maps to a coherent OBS inventory change: created, removed, renamed.
- The slice avoids adding events for their own sake because each included event confirms a lifecycle change for the same object family exposed by `list_canvases`.

No new MCP resource abstraction is needed. HulyMCP-style resources are useful when the server has a stable, independently readable resource URI that clients can subscribe to or refresh. This codebase currently exposes canvas state through the `list_canvases` tool, not through MCP resources. Adding resources only for events would create a second state architecture before we have a real resource model. The right boundary for this slice is: event summaries carry canvas identity fields that can be reconciled with a later `list_canvases` call.

## Included Events

The full event catalogue lives in `plans/obs-event-catalogue.md`. This slice includes exactly these canvas lifecycle events:

| Event | Subscription | Workflow Target | Workflow Outcome | Public Summary Policy |
| --- | --- | --- | --- | --- |
| `CanvasCreated` | `Canvases` | `canvas` | `created` | Include canvas name and UUID. |
| `CanvasRemoved` | `Canvases` | `canvas` | `removed` | Include canvas name and UUID. |
| `CanvasNameChanged` | `Canvases` | `canvas` | `renamed` | Include old canvas name, new canvas name, and UUID. |

## Target and Outcome Vocabulary

The public workflow vocabulary is intentionally smaller than the OBS event catalogue:

- `target: "canvas"` covers all canvas lifecycle events in this slice.
- `outcome: "created"` means OBS emitted `CanvasCreated`.
- `outcome: "removed"` means OBS emitted `CanvasRemoved`.
- `outcome: "renamed"` means OBS emitted `CanvasNameChanged`.

Raw OBS event names are audit metadata in summaries, not user-facing workflow input vocabulary.

## Resource and State Semantics

Canvas events are pertinent to resources in the broad architectural sense because they describe changes to OBS canvas objects. They are not enough to define a full MCP resource architecture in this codebase today.

Current repository facts:

- `list_canvases` is the authoritative current-state surface for canvases.
- `ListCanvasesOutput` sanitizes raw OBS canvas list entries.
- There is no canvas MCP resource URI, resource template, resource read handler, or `notifications/resources/updated` path.

Design implications:

- This slice should not add a resource architecture.
- Confirmation output should include enough identity to correlate an event with `list_canvases`: `canvasName`, `canvasUuid`, and `oldCanvasName` on rename.
- A confirmed removal event does not prove the canvas is still absent at response time; callers should use `list_canvases` for current state.
- A confirmed creation or rename event does not prove final ordering or full canvas inventory.
- Future MCP resource support could introduce `obs://canvases` or a similar URI, with canvas events as invalidation signals. That is a separate slice.

## Proposed MCP Tool

### `confirm_obs_canvas_inventory_change`

Purpose: wait for a typed canvas inventory-change event after a known event cursor.

Inputs:

- `target`: `canvas`
- `outcome`: `created | removed | renamed`
- `afterSequence`: required `EventCursor`
- `timeoutMs?: EventTimeoutMs`, capped by the configured OBS connection/request timeout
- `canvasName?: CanvasName`
- `canvasUuid?: CanvasUuid`
- `oldCanvasName?: CanvasName`

Input rules:

- The public input schema must be a discriminated union of exact supported variants.
- `afterSequence` is required for post-action confirmation.
- Raw OBS event names are not accepted as inputs.
- `canvasName` and `canvasUuid` are optional identity filters on every variant because all included events carry them.
- `oldCanvasName` is allowed only on `renamed`.
- Value matching uses exact decoded JSON value equality.
- `eventType`, `eventIntent`, `eventData`, `payload`, `regex`, scene fields, source fields, input fields, transition fields, config fields, screenshot fields, and arbitrary object fields are forbidden.
- The MCP executor rejects excess fields, and the exported operation entry point must also decode this public input with `onExcessProperty: "error"`.

Input variants:

- `target: "canvas"`, `outcome: "created"`: allows `afterSequence`, `timeoutMs`, `canvasName`, and `canvasUuid`; forbids `oldCanvasName` and raw event fields.
- `target: "canvas"`, `outcome: "removed"`: allows `afterSequence`, `timeoutMs`, `canvasName`, and `canvasUuid`; forbids `oldCanvasName` and raw event fields.
- `target: "canvas"`, `outcome: "renamed"`: allows `afterSequence`, `timeoutMs`, `canvasName`, `canvasUuid`, and `oldCanvasName`; forbids raw event fields.

Outputs:

- `confirmed: boolean`
- `timedOut: boolean`
- `baselineSequence: EventCursor`
- `latestSequence: EventCursor`
- `missedEvents: boolean`
- `event?: CanvasInventoryChangeEventSummary`

Confirmation behavior:

- Return the first matching retained or newly observed event after `afterSequence`.
- If a matching event is already retained after the cursor, return immediately.
- If no match appears before timeout, return `confirmed: false`, `timedOut: true`, current cursor metadata, and no `event`.
- If OBS closes/disconnects or the MCP server closes while waiting, reject immediately and clean up the waiter without leaving timers active.
- Do not infer confirmation from current OBS request state.
- Do not synthesize an event from `list_canvases`.
- Do not treat a rename as satisfying created or removed.

## Narrow Types and Schemas

Reuse existing event types:

- `EventSequence`: positive safe integer for retained event sequence values.
- `EventCursor`: non-negative safe integer for cursors and metadata; `0` is valid before the first event.
- `EventCount`: non-negative safe integer for counts.
- `EventTimeoutMs`: positive bounded integer capped by configuration/request timeout.

Add canvas inventory-change workflow types:

- `CanvasInventoryChangeTarget`: `canvas`.
- `CanvasInventoryChangeOutcome`: `created | removed | renamed`.
- `CanvasInventoryChangeEventType`: exactly `CanvasCreated | CanvasRemoved | CanvasNameChanged`.
- `CanvasName`: non-empty OBS string used by public workflow inputs and summaries.
- `CanvasUuid`: non-empty OBS string used by public workflow inputs and summaries.
- `CanvasEventIntent`: the exact `Canvases` subscription intent, not arbitrary `EventIntent`.

Primitive type rules:

- User-provided identity filters use `CanvasName` and `CanvasUuid`.
- Public workflow summaries expose `canvasName`, `canvasUuid`, and `oldCanvasName` as non-empty primitives.
- Raw protocol event data may start as `ObsString` for diagnostic decode, but empty canvas names or UUIDs must not become matching workflow summaries.
- Canvas event payload codecs should exact-reject excess fields at ingestion because these events have no settings or plugin-shaped fields requiring sanitization.
- `eventIntent` in workflow summaries must be the exact canvases subscription intent, not a generic safe integer.
- Event intent and subscription masks are protocol metadata, not user inputs.

## Schema Variants

The public input schema is an exact discriminated union:

- Canvas created variant: `target: "canvas"`, `outcome: "created"`.
- Canvas removed variant: `target: "canvas"`, `outcome: "removed"`.
- Canvas renamed variant: `target: "canvas"`, `outcome: "renamed"`.

`CanvasInventoryChangeEventSummary` must be a discriminated union keyed by `eventType`, with `target` and `outcome` constrained by each shape:

- `CanvasCreated`: `sequence`, `eventIntent`, `eventType: "CanvasCreated"`, `category: "canvases"`, `target: "canvas"`, `outcome: "created"`, `canvasName`, `canvasUuid`.
- `CanvasRemoved`: `sequence`, `eventIntent`, `eventType: "CanvasRemoved"`, `category: "canvases"`, `target: "canvas"`, `outcome: "removed"`, `canvasName`, `canvasUuid`.
- `CanvasNameChanged`: `sequence`, `eventIntent`, `eventType: "CanvasNameChanged"`, `category: "canvases"`, `target: "canvas"`, `outcome: "renamed"`, `oldCanvasName`, `canvasName`, `canvasUuid`.

Summary construction must exact-decode this union with `onExcessProperty: "error"` before returning or matching a workflow event. Malformed summaries such as `CanvasCreated` with `outcome: "removed"`, `CanvasNameChanged` without `oldCanvasName`, empty `canvasUuid`, wrong `eventIntent`, or unrelated fields must fail schema decode.

## Event Journal and Cursor Semantics

This slice must reuse the bounded in-memory event journal introduced for output lifecycle confirmation.

Requirements:

- No second canvas-specific buffer.
- No duplicated cursor, eviction, timeout, or waiter cleanup logic.
- Match predicates are internal typed functions built from `CanvasLifecycleTarget`, `CanvasLifecycleOutcome`, and optional identity filters.
- `missedEvents` propagation matches earlier event slices exactly.
- `afterSequence: 0` is valid and means "after server start before any observed event."
- Actual retained event `sequence` values remain positive `EventSequence`.
- `baselineSequence` echoes the cursor used for the wait.
- `latestSequence` reports the journal latest sequence when the tool returns.
- `missedEvents` is `true` when `afterSequence` is older than the retained journal window, such as `afterSequence < oldestSequence - 1`.
- The tool may still find a retained matching event when `missedEvents` is true, but clients must treat the result as incomplete history.

## Matching Semantics

Public workflow confirmation requires all of:

- The event type is one of the three included canvas inventory-change events.
- The event intent exactly equals the official `Canvases` subscription.
- The event decodes through the typed event codec.
- The workflow summary exact-decodes through `CanvasLifecycleEventSummary`.
- `target` equals `"canvas"`.
- `outcome` equals the requested outcome.
- If `canvasName` is provided, it equals the summary `canvasName`.
- If `canvasUuid` is provided, it equals the summary `canvasUuid`.
- If `oldCanvasName` is provided, the event is `CanvasNameChanged` and it equals the summary `oldCanvasName`.

No regex, substring, case-insensitive, contains, prefix, or historical-state matching is allowed.

## Safety Policy

Public workflow confirmation requires all of:

- The event is one of the three included events in this PRD.
- The official subscription matches the received event intent.
- The event is decoded through the typed Effect Schema event codec.
- The event is not high-volume, raw vendor/custom, settings-bearing, or object-payload based.
- The event summary includes only typed canvas identity fields.

Rejected event payloads are not retained for public workflow confirmation. Rejection accounting should reuse existing diagnostic reasons where applicable:

- `unsafe_policy`
- `subscription_mismatch`
- `decode_failed`

Diagnostic-safe canvas events may remain visible through `get_recent_obs_events` if the global event policy allows them. This slice must not add unrelated canvas query or stream behavior.

## Implementation Notes

Expected code changes:

- `src/domain/schemas/canvases.ts`
  - Add reusable `CanvasName` and `CanvasUuid` non-empty primitives if no existing primitives are available.
  - Do not make `list_canvases` less tolerant unless a separate canvas read-model PRD requires it.
- `src/domain/schemas/events.ts`
  - Add canvas inventory-change target/outcome/event type schemas.
  - Add exact public input/output/summary schemas.
  - Tighten `decodeTypedObsEventData` for `CanvasCreated`, `CanvasRemoved`, and `CanvasNameChanged` with `onExcessProperty: "error"`.
- `src/obs/operations/events.ts`
  - Add exact summary decoder.
  - Add `canvasInventoryChangeSummaryFor`.
  - Add `canvasInventoryChangeMatches`.
  - Add `confirmObsCanvasInventoryChange`.
- `src/mcp/tools/events.ts`
  - Register `confirm_obs_canvas_inventory_change` under the events toolset with no required OBS requests.
- Tests:
  - Extend protocol schema tests.
  - Extend client ingestion tests for malformed/excess canvas event payloads.
  - Extend operation confirmation tests.
  - Extend MCP registry and server structured-content tests.

## Acceptance Criteria

- `confirm_obs_canvas_inventory_change` is registered only in the `events` toolset.
- The slice includes exactly `CanvasCreated`, `CanvasRemoved`, and `CanvasNameChanged`.
- Direct operation input decode rejects excess fields with `onExcessProperty: "error"`.
- Created/removed variants reject `oldCanvasName`.
- Renamed variant allows `oldCanvasName`.
- Public input filters reject empty `canvasName`, empty `oldCanvasName`, and empty `canvasUuid`.
- Public summaries reject empty `canvasName`, empty `oldCanvasName`, empty `canvasUuid`, wrong target/outcome combinations, wrong event intent, unsafe event intent, sequence `0`, and excess fields.
- Typed event ingestion exact-rejects excess fields for the three canvas event payloads.
- Malformed retained diagnostic canvas events cannot satisfy workflow confirmation.
- `CanvasNameChanged` does not satisfy created/removed confirmations, and created/removed events do not satisfy rename confirmations.
- Optional identity filters narrow matches exactly.
- `get_recent_obs_events` can still return safe canvas diagnostic events according to existing policy.
- `list_canvases` remains the current-state read surface.
- `pnpm -s typecheck` passes.
- Focused event/MCP tests pass.
- `pnpm -s lint` passes with 0 clones.

## Open Questions

- Should `CanvasName` and `CanvasUuid` live in `src/domain/schemas/canvases.ts` even if `ListCanvasesOutput` remains tolerant? Recommendation: yes. They are reusable workflow identity primitives and do not force a breaking change in the list output.
- Should public summaries allow empty canvas identity values because raw OBS event data is typed as strings? Recommendation: no. Raw diagnostic decode may accept OBS strings, but workflow confirmation should require non-empty public canvas identity primitives before an event can satisfy the confirm tool.
- Should this slice add MCP resources for canvases? Recommendation: no. There is no existing resource read path; adding one only for events would be premature.
- Should `eventIntent` literal schemas be applied retroactively to all earlier workflow summaries? Recommendation: do that as a later cross-slice hardening pass. This slice should require exact `Canvases` intent from the start.
