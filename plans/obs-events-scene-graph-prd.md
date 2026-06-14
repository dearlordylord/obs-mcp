# PRD: OBS Events Slice 2 - Scene Graph and Scene Item Confirmation

Status: draft.

Date: 2026-06-13.

## Problem

The output lifecycle slice proved that OBS events are most useful when they answer a workflow question instead of exposing an event bus. The next narrow event slice should apply that pattern to scene graph and scene-item workflows because those events directly confirm existing scene and scene-item tools:

- Did a scene get created, removed, renamed, or become the active program/preview scene?
- Did a scene item get created, removed, reordered, enabled, or locked?
- Did one of those specific changes happen after a known event cursor, without requiring agents to poll broad list/read tools?

This slice remains tool-first. It does not introduce MCP resources, custom event notifications, raw event subscriptions, or a general OBS event query language.

## Goals

- Add a production workflow confirmation surface for scene graph and scene-item changes.
- Reuse the event journal, policy, codec, cursor, timeout, and cleanup semantics from the output lifecycle slice.
- Keep inputs outcome-shaped and safe: callers describe the target and outcome they need confirmed, not raw OBS event names.
- Use discriminated output schemas so impossible event type, target, and state combinations are rejected by schema.
- Include only low-volume, typed-safe scene and scene-item events that map to common scene/scene-item workflows.
- Keep MCP resources deferred unless a later slice needs application-selected scene graph context.

## Non-Goals

- Do not expose all scene or scene-item events as user-facing workflow primitives.
- Do not add raw event tools such as `wait_for_obs_event`, `subscribe_to_obs_event`, or `get_scene_item_events`.
- Do not add server-initiated `notifications/obs/event` messages.
- Do not add MCP resources or resource subscriptions in this slice.
- Do not expose `SceneItemTransformChanged`; it is high-volume and requires a separate aggregate design.
- Do not expose `SceneItemSelected` as a workflow input, workflow output, or wait predicate; it reflects UI selection state, not a current existing scene-item mutation workflow.
- Do not expose raw `sceneItems: Array<Object>` payloads without a typed sanitized schema.
- Do not add confirmation behavior to every existing mutating scene tool in this slice; confirmation remains an explicit tool.

## Event Catalogue

The full event catalogue lives in `plans/obs-event-catalogue.md`. This slice includes exactly the workflow events below.

### Included Events

| Event | Category | Subscription | Workflow Outcome |
| --- | --- | --- | --- |
| `SceneCreated` | scenes | `Scenes` | Confirms a scene or group was created. |
| `SceneRemoved` | scenes | `Scenes` | Confirms a scene or group was removed. |
| `SceneNameChanged` | scenes | `Scenes` | Confirms a scene was renamed. |
| `CurrentProgramSceneChanged` | scenes | `Scenes` | Confirms the active program scene changed. |
| `CurrentPreviewSceneChanged` | scenes | `Scenes` | Confirms the active preview scene changed. |
| `SceneItemCreated` | scene items | `SceneItems` | Confirms a source was added to a scene or group. |
| `SceneItemRemoved` | scene items | `SceneItems` | Confirms a source was removed from a scene or group. |
| `SceneItemListReindexed` | scene items | `SceneItems` | Confirms scene-item ordering changed. |
| `SceneItemEnableStateChanged` | scene items | `SceneItems` | Confirms scene-item visibility/enabled state changed. |
| `SceneItemLockStateChanged` | scene items | `SceneItems` | Confirms scene-item lock state changed. |

### Explicitly Excluded Events

| Event | Reason |
| --- | --- |
| `SceneListChanged` | Broad scene-list aggregate with no precise mutating workflow in this slice; create/remove/rename/current-scene events cover the specific scene workflows. Keep diagnostic-only until an explicit scene-list resource or reorder workflow exists. |
| `SceneItemTransformChanged` | High-volume subscription. Existing transform tools can read state directly; future support needs an opt-in aggregate or debounced design. |
| `SceneItemSelected` | UI selection signal with no current mutating scene-item tool workflow; keep diagnostic-only until a selection workflow exists. |
| `CurrentSceneCollectionChanging` | Config/safety lifecycle, not scene graph confirmation. |
| `CurrentSceneCollectionChanged` | Config/safety lifecycle, not scene graph confirmation. |
| `SceneCollectionListChanged` | Config catalogue change, not an in-collection scene graph change. |
| `SourceFilter*`, `Input*`, `MediaInput*`, `Transition*`, `Output*`, `Canvas*`, `VendorEvent`, `CustomEvent` | Outside this slice. |

Excluded diagnostic-safe events such as `SceneListChanged` and `SceneItemSelected` may remain visible through existing diagnostic history if the global public event policy allows them. This slice must not add them to `confirm_obs_scene_graph_change`, its output summary union, or any public wait predicate.

## Proposed MCP Tool

### `confirm_obs_scene_graph_change`

Purpose: wait for a typed scene graph or scene-item outcome after a known event cursor.

Inputs:

- `target`: `scene | current_program_scene | current_preview_scene | scene_item`
- `outcome`: `created | removed | renamed | changed | reordered | enabled | disabled | locked | unlocked`
- `afterSequence`: required `EventCursor`
- `timeoutMs?: EventTimeoutMs`, capped by configured OBS connection/request timeout
- `sceneName?: ObsNonEmptyString`
- `sceneUuid?: ObsNonEmptyString`
- `oldSceneName?: ObsNonEmptyString`
- `sourceName?: ObsNonEmptyString`
- `sourceUuid?: ObsNonEmptyString`
- `sceneItemId?: SceneGraphSceneItemId`

Input rules:

- Raw OBS event names are not accepted.
- `afterSequence` is required for post-action confirmation.
- The input schema must be a discriminated union with forbidden fields for invalid target/outcome combinations; unrelated optional fields must be rejected before operations code runs.
- `scene` supports `created`, `removed`, and `renamed`.
- `current_program_scene` supports `changed`.
- `current_preview_scene` supports `changed`.
- `scene_item` supports `created`, `removed`, `reordered`, `enabled`, `disabled`, `locked`, and `unlocked`.
- Optional identity fields narrow the match when provided. For example, a caller can confirm `scene_item/enabled` for a specific `sceneName` and `sceneItemId`.
- `oldSceneName` is valid only with `target: "scene"` and `outcome: "renamed"`.
- `sourceName` and `sourceUuid` are valid only for `scene_item` creation/removal matches.
- `sceneItemId` is valid only for `scene_item` outcomes. For `reordered`, it narrows to reindex events whose `sceneItems` array contains that item.
- `sceneName` and `sceneUuid` are valid scene identity filters for scene, current scene, and scene-item targets. They remain optional because callers may intentionally confirm by outcome only after a captured cursor.
- `sceneItemId`, source identity fields, and `oldSceneName` are forbidden on `current_program_scene` and `current_preview_scene`.

Input variants:

- `target: "scene"`, `outcome: "created" | "removed"`: allows `afterSequence`, `timeoutMs`, `sceneName`, `sceneUuid`; forbids `oldSceneName`, source fields, and `sceneItemId`.
- `target: "scene"`, `outcome: "renamed"`: allows `afterSequence`, `timeoutMs`, `sceneName`, `sceneUuid`, `oldSceneName`; forbids source fields and `sceneItemId`.
- `target: "current_program_scene"`, `outcome: "changed"`: allows `afterSequence`, `timeoutMs`, `sceneName`, `sceneUuid`; forbids `oldSceneName`, source fields, and `sceneItemId`.
- `target: "current_preview_scene"`, `outcome: "changed"`: allows `afterSequence`, `timeoutMs`, `sceneName`, `sceneUuid`; forbids `oldSceneName`, source fields, and `sceneItemId`.
- `target: "scene_item"`, `outcome: "created" | "removed"`: allows `afterSequence`, `timeoutMs`, `sceneName`, `sceneUuid`, `sourceName`, `sourceUuid`, `sceneItemId`; forbids `oldSceneName`.
- `target: "scene_item"`, `outcome: "reordered" | "enabled" | "disabled" | "locked" | "unlocked"`: allows `afterSequence`, `timeoutMs`, `sceneName`, `sceneUuid`, `sceneItemId`; forbids `oldSceneName` and source fields.

Outputs:

- `confirmed: boolean`
- `timedOut: boolean`
- `baselineSequence: EventCursor`
- `latestSequence: EventCursor`
- `missedEvents: boolean`
- `event?: SceneGraphChangeEventSummary`

Confirmation behavior:

- Return the first matching retained or newly observed event after `afterSequence`.
- If a matching event is already retained after the cursor, return immediately.
- If no match appears before timeout, return `confirmed: false`, `timedOut: true`, current cursor metadata, and no `event`.
- If OBS closes/disconnects or the MCP server closes while waiting, reject immediately and clean up the waiter without leaving timers active.
- Do not infer confirmation from current OBS request state. This tool confirms observed events only.

## Narrow Types and Schemas

Reuse existing slice-1 narrow types:

- `EventSequence`: positive safe integer for retained event sequence values.
- `EventCursor`: non-negative safe integer for cursors and metadata; `0` is valid before the first event.
- `EventCount`: non-negative safe integer for counts.
- `EventTimeoutMs`: positive bounded integer capped by config/request timeout.

Add scene graph workflow types:

- `SceneGraphChangeTarget`: `scene | current_program_scene | current_preview_scene | scene_item`
- `SceneGraphChangeOutcome`: `created | removed | renamed | changed | reordered | enabled | disabled | locked | unlocked`
- `SceneGraphChangeEventType`: exactly the 10 included event names.
- `SceneGraphSceneItemId`: non-negative safe integer for OBS scene item IDs. Do not use bare `ObsInteger` for scene item identity.
- `SceneGraphIndex`: non-negative safe integer for scene-item ordering positions.
- `SceneGraphChangeSceneSummary`: typed scene identity fields, plus `isGroup` where OBS reports it.
- `SceneGraphChangeSceneItemSummary`: typed scene identity, item identity, and source identity when OBS reports it.
- `ReindexedSceneItemSummary`: `sceneItemId` and `sceneItemIndex`.

Primitive type rules:

- Scene and source names/UUIDs should follow existing request/response conventions: non-empty for user-provided identity filters, protocol `ObsString` for observed event output fields.
- Scene item IDs are never generic signed integers in this slice. Inputs, event summaries, and ordering arrays use `SceneGraphSceneItemId`, backed by the same non-negative integer shape used by existing scene-item request tools.
- Scene item indexes and reindex arrays use `SceneGraphIndex`; negative, fractional, and larger-than-safe-integer values are rejected.
- Scene-item event codec fields must be tightened or re-decoded for this slice so `sceneItemId` in scene-item events and reindex arrays cannot pass through as generic signed `ObsInteger`.
- Event intent and subscription masks are protocol metadata, not user inputs. They must not be accepted by `confirm_obs_scene_graph_change`.

`SceneGraphChangeEventSummary` must be a discriminated union keyed by `eventType`, with target/outcome constrained by each event shape:

- `SceneCreated`: `target: "scene"`, `outcome: "created"`, `sceneName`, `sceneUuid`, `isGroup`
- `SceneRemoved`: `target: "scene"`, `outcome: "removed"`, `sceneName`, `sceneUuid`, `isGroup`
- `SceneNameChanged`: `target: "scene"`, `outcome: "renamed"`, `oldSceneName`, `sceneName`, `sceneUuid`
- `CurrentProgramSceneChanged`: `target: "current_program_scene"`, `outcome: "changed"`, `sceneName`, `sceneUuid`
- `CurrentPreviewSceneChanged`: `target: "current_preview_scene"`, `outcome: "changed"`, `sceneName`, `sceneUuid`
- `SceneItemCreated`: `target: "scene_item"`, `outcome: "created"`, `sceneName`, `sceneUuid`, `sourceName`, `sourceUuid`, `sceneItemId`, `sceneItemIndex`
- `SceneItemRemoved`: `target: "scene_item"`, `outcome: "removed"`, `sceneName`, `sceneUuid`, `sourceName`, `sourceUuid`, `sceneItemId`
- `SceneItemListReindexed`: `target: "scene_item"`, `outcome: "reordered"`, `sceneName`, `sceneUuid`, `sceneItems`
- `SceneItemEnableStateChanged`: `target: "scene_item"`, `outcome: "enabled" | "disabled"`, `sceneName`, `sceneUuid`, `sceneItemId`, `sceneItemEnabled`
- `SceneItemLockStateChanged`: `target: "scene_item"`, `outcome: "locked" | "unlocked"`, `sceneName`, `sceneUuid`, `sceneItemId`, `sceneItemLocked`

Malformed summaries such as `SceneItemEnableStateChanged` with `outcome: "locked"` or `CurrentProgramSceneChanged` with `target: "scene"` must be rejected by the output schema, not just by construction code.

## Event Journal Reuse

This slice must reuse the bounded in-memory event journal introduced for output lifecycle confirmation.

Requirements:

- No second scene-specific buffer.
- No duplicated cursor, eviction, timeout, or waiter cleanup logic.
- Match predicates are internal typed functions built from `SceneGraphChangeTarget`, `SceneGraphChangeOutcome`, and optional identity filters.
- `missedEvents` propagation matches slice 1 exactly.
- `SceneItemTransformChanged` remains outside the safe subscription mask and must not be recorded for public workflow confirmation.

## Cursor Semantics

- `EventCursor` is non-negative; `0` means "after server start before any observed event."
- Actual retained event `sequence` values remain `EventSequence` and are positive.
- `afterSequence` is required so stale events cannot accidentally confirm a later scene mutation.
- `baselineSequence` echoes the cursor used for the wait.
- `latestSequence` reports the journal latest sequence when the tool returns.
- `missedEvents` is `true` when `afterSequence` is older than the retained journal window, such as `afterSequence < oldestSequence - 1`.
- The tool may still find a retained matching event when `missedEvents` is true, but clients must treat the result as incomplete history.

## Safety Policy

Public workflow confirmation requires all of:

- The event is one of the 10 included events in this PRD.
- The official subscription matches the received event intent.
- The event is decoded through the typed Effect Schema event codec.
- The event is not high-volume, raw vendor/custom, or settings-bearing deferred payload.
- The event summary omits arbitrary object payloads and includes only typed scene, scene-item, and ordering fields.

Rejected event payloads are not retained for public workflow confirmation. Rejection accounting should reuse the slice-1 diagnostic reasons where applicable:

- `unsafe_policy`
- `subscription_mismatch`
- `decode_failed`

## MCP Protocol Posture

This slice adds one MCP tool result surface. It does not add custom notifications.

Resources remain deferred. A future scene graph resource could expose application-selected scene context, and scene graph events could invalidate those resources through standard `notifications/resources/updated`. That architecture is not required for this slice, and this PRD does not define resource URI conventions.

## Acceptance Criteria

- The slice includes exactly the 10 events listed in "Included Events".
- `SceneListChanged` and `SceneItemSelected` are not workflow inputs, workflow outputs, or public wait predicates.
- `SceneItemTransformChanged` is explicitly excluded from workflow inputs, workflow outputs, public wait predicates, and safe event subscription policy.
- `confirm_obs_scene_graph_change` accepts outcome-shaped inputs and rejects raw event names, raw event intents, regexes, and arbitrary payload objects.
- Unsupported target/outcome combinations and unrelated optional identity fields are rejected by input schema.
- Negative, fractional, or larger-than-safe-integer `sceneItemId` and `sceneItemIndex` values are rejected wherever those fields appear.
- Workflow output uses discriminated schemas keyed by event type, target, and outcome.
- Malformed event summaries are rejected by schema, including wrong target/outcome combinations and missing event-specific fields.
- `afterSequence: 0` is accepted and means "after server start."
- `missedEvents` propagates from the event journal for retained reads and waits.
- Wait success, timeout, OBS close/disconnect, and MCP server close all clean up waiters; close/disconnect reject immediately without post-close timers.
- Existing output lifecycle tools keep working unchanged.
- Existing scene and scene-item request tools continue to work when the `events` toolset is disabled.
- No MCP resources or custom OBS event notifications are added.

## Test Plan

Schema tests:

- `ConfirmObsSceneGraphChangeInput` accepts every supported target/outcome combination.
- `ConfirmObsSceneGraphChangeInput` rejects unsupported combinations, raw `eventType`, raw `eventIntent`, regex, and arbitrary payload fields.
- `ConfirmObsSceneGraphChangeInput` rejects identity fields that are unrelated to the selected target/outcome, including `sceneItemId` on scene/current-scene targets and source fields outside scene-item create/remove.
- `ConfirmObsSceneGraphChangeInput` rejects negative and fractional `sceneItemId` filters.
- `ConfirmObsSceneGraphChangeInput` rejects empty string identity filters.
- `SceneGraphChangeEventSummary` accepts valid summaries for all 10 included event types.
- `SceneGraphChangeEventSummary` rejects malformed target/outcome combinations and missing event-specific fields.
- `SceneGraphChangeEventSummary` rejects negative, fractional, and larger-than-safe-integer `sceneItemId` and `sceneItemIndex` fields.
- `afterSequence: 0` is accepted as `EventCursor`; actual event `sequence: 0` is rejected as `EventSequence`.

Operation tests:

- Each included event type can satisfy `confirm_obs_scene_graph_change` with the correct target/outcome.
- Optional identity filters narrow matches by scene name, scene UUID, source name, source UUID, and scene item ID where applicable.
- `SceneItemEnableStateChanged` maps `true` to `enabled` and `false` to `disabled`.
- `SceneItemLockStateChanged` maps `true` to `locked` and `false` to `unlocked`.
- `SceneItemListReindexed` exposes only typed ordering summaries.
- `missedEvents` is propagated when the requested cursor predates the retained journal window.
- Timeout returns `confirmed: false`, `timedOut: true`, and no event.
- OBS close/disconnect rejects a pending wait immediately and leaves no active waiter/timer.
- `SceneItemTransformChanged`, `SceneItemSelected`, `VendorEvent`, `CustomEvent`, and deferred settings-bearing input events cannot satisfy the workflow confirmation tool.

MCP tests:

- Tool registry includes `confirm_obs_scene_graph_change` only when the `events` toolset is enabled.
- MCP structured content matches the output schema for every included event type.
- Invalid input is rejected before reaching OBS operations.
- Existing `get_recent_obs_events` cursor behavior remains unchanged.

Protocol/fake OBS tests:

- Safe event subscription negotiation includes `Scenes` and `SceneItems` but not `SceneItemTransformChanged`.
- Fake OBS event ingestion covers all 10 included event types.
- Subscription mismatch and decode failure do not produce public confirmation events.

## Learnings Carried Forward

1. Use outcome-shaped workflow tools, not raw event tools. Raw OBS event names may appear only as audit metadata in typed outputs.
2. Preserve the distinction between `EventSequence` and `EventCursor`: retained event sequences are positive; cursors are non-negative and `0` is valid before the first event.
3. Use discriminated output schemas keyed by event type, target, and outcome so malformed combinations are rejected by schema.
4. Waiters must clean up and reject immediately after close/disconnect; no post-close timers.
5. Keep high-volume, raw vendor/custom, broad diagnostic aggregates, and deferred settings-bearing events out of workflow inputs and outputs. `SceneItemTransformChanged`, `SceneListChanged`, and `SceneItemSelected` remain excluded from this workflow surface.
6. Resources remain deferred. This slice may mention future scene graph resource invalidation hooks, but it must not require MCP resources now.
7. Tests must cover all event types in the slice, `missedEvents` propagation, zero cursor behavior, post-close behavior for waits, and schema rejection of malformed summaries.

## Open Questions

- Should future scene mutation tools optionally return a pre-action cursor to reduce caller friction, or should cursor capture remain a separate explicit `get_recent_obs_events` step?
