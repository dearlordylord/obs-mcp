# PRD: OBS Events Slice 7 - Config Workflow Confirmation

Status: draft.

Date: 2026-06-13.

## Problem

The first six OBS event slices established a narrow posture: events should confirm a specific workflow after a known cursor, not expose obs-websocket as a public event bus.

The next slice should cover profile and scene-collection configuration workflows because the repository already has direct config tools for the same domain:

- `list_profiles`
- `set_current_profile`
- `create_profile`
- `remove_profile`
- `list_scene_collections`
- `set_current_scene_collection`
- `create_scene_collection`

Those tools submit mutations or read current state. They do not let an agent confirm that OBS emitted the corresponding config event after a mutation or manual OBS/UI action. This slice should answer narrow questions:

- Did OBS report that the current profile began changing or finished changing after my cursor?
- Did OBS report that the profile list changed after my cursor?
- Did OBS report that the current scene collection began changing or finished changing after my cursor?
- Did OBS report that the scene collection list changed after my cursor?
- Did the observed event match optional current-name or full-list filters where the event actually carries those fields?

The confirmation remains event-level. It does not replace profile or scene-collection read tools as authoritative final state surfaces.

## Goals

- Add workflow confirmation for existing profile and scene-collection tools.
- Reuse the existing event journal, cursor, timeout, and waiter cleanup semantics.
- Include only low-volume, typed-safe `Config` events with primitive payloads.
- Keep public inputs outcome-shaped and discriminated by supported workflow variants.
- Use exact public workflow input and summary decoding with `onExcessProperty: "error"`.
- Preserve the important distinction between pre-change and post-change milestones.
- Preserve the important distinction between current-identity events and list-changed events.
- Preserve diagnostic visibility through `get_recent_obs_events` without turning diagnostic history into a workflow API.

## Non-Goals

- Do not expose a raw config event stream.
- Do not add `wait_for_obs_event`, `subscribe_to_obs_event`, `get_config_events`, or a query language over event history.
- Do not add server-initiated `notifications/obs/event` messages.
- Do not include profile parameter changes; the candidate catalogue has no profile-parameter changed event.
- Do not include `ExitStarted`; it is a general OBS lifecycle event, not a profile or scene-collection workflow confirmation.
- Do not add automatic polling pause/resume or request-safety guards around scene collection changes in this slice.
- Do not infer final scene, source, input, transition, or profile-parameter state from config events.
- Do not expose raw event intents, arbitrary event payloads, regex predicates, vendor/custom payloads, or settings objects.
- Do not add MCP resources or resource subscriptions in this slice.
- Do not change existing config mutation tools to auto-wait for events in this slice.

## Slice Choice

Config workflow confirmation is the recommended next slice after output lifecycle, scene graph, source filters, media input, input audio controls, and transitions.

Reasons:

- The request surface already contains profile and scene-collection list, create, remove, and switch tools.
- The candidate events are low-volume `Config` subscription events.
- The payloads are small and typed-safe: a current profile name, a current scene collection name, or an updated string list.
- Profile and scene-collection events share a clean target/outcome vocabulary.
- The slice avoids adding events for their own sake: every included event confirms either a current config milestone or a list mutation.

One combined config workflow tool is preferred over two separate tools because the public surface remains narrow:

- `target: "profile" | "scene_collection"`
- `outcome: "changing" | "changed" | "list_changed"`

This avoids duplicate waiter plumbing while keeping profile-specific and scene-collection-specific fields separated by exact schema variants.

## Included Events

The full event catalogue lives in `plans/obs-event-catalogue.md`. This slice includes exactly these config workflow events:

| Event | Subscription | Workflow Target | Workflow Outcome | Public Summary Policy |
| --- | --- | --- | --- | --- |
| `CurrentProfileChanging` | `Config` | `profile` | `changing` | Include the reported profile name. |
| `CurrentProfileChanged` | `Config` | `profile` | `changed` | Include the reported new profile name. |
| `ProfileListChanged` | `Config` | `profile` | `list_changed` | Include the updated profile list only. |
| `CurrentSceneCollectionChanging` | `Config` | `scene_collection` | `changing` | Include the reported scene collection name. |
| `CurrentSceneCollectionChanged` | `Config` | `scene_collection` | `changed` | Include the reported new scene collection name. |
| `SceneCollectionListChanged` | `Config` | `scene_collection` | `list_changed` | Include the updated scene collection list only. |

## Target and Outcome Vocabulary

The public workflow vocabulary is intentionally smaller than the OBS event catalogue:

- `target: "profile"` covers current-profile and profile-list workflows.
- `target: "scene_collection"` covers current-scene-collection and scene-collection-list workflows.
- `outcome: "changing"` means OBS emitted the pre-change milestone that the current identity has begun changing.
- `outcome: "changed"` means OBS emitted the post-change milestone that the current identity has changed.
- `outcome: "list_changed"` means OBS emitted the list mutation event.

Raw OBS event names are audit metadata in summaries, not user-facing workflow input vocabulary.

## Milestone Semantics

`CurrentProfileChanging` and `CurrentSceneCollectionChanging` are pre-change milestones. They confirm that OBS began changing the current profile or current scene collection after the supplied cursor. They do not prove the change completed, and callers should not treat them as final state.

`CurrentProfileChanged` and `CurrentSceneCollectionChanged` are post-change milestones. They confirm that OBS reported a new current profile or scene collection after the supplied cursor. They are the relevant confirmation after `set_current_profile`, `create_profile`, `set_current_scene_collection`, or `create_scene_collection` when the caller needs the current selection milestone.

`ProfileListChanged` and `SceneCollectionListChanged` are list mutation events. They carry arrays only. They do not carry the current profile or current scene collection identity. They must not be used to infer the current identity; callers should use `list_profiles` or `list_scene_collections` for current identity reads.

The scene-collection changing event is also useful as an internal request-safety signal because the OBS protocol notes that requests during scene collection changes are undefined behavior and may crash OBS. This slice does not implement a global request guard, polling pause, or automatic retry policy. It only exposes typed workflow confirmation.

## Explicitly Excluded Events and Data

| Surface | Reason |
| --- | --- |
| Profile parameter changes | No candidate event exists for profile parameter mutation confirmation. `set_profile_parameter` remains request-acknowledged only in this slice. |
| `ExitStarted` | General OBS lifecycle event. It likely belongs in a separate general lifecycle or shutdown-safety slice. |
| Scene graph events | Scene graph confirmation already owns scene and scene item workflows inside the active scene collection. |
| Output, input, media input, filter, transition, canvas, UI, vendor, and custom events | Outside this config workflow slice. |
| Current identity on list-changed events | OBS list-changed events carry arrays only. The workflow summary must not synthesize current identity. |
| Raw settings, arbitrary payloads, regex predicates, event intent filters, and custom event data | Not part of this workflow surface and must not cross the workflow codec boundary. |

Diagnostic-safe config events may remain visible through `get_recent_obs_events` if the global event policy allows them. This slice must not add excluded events or fields to `confirm_obs_config_workflow`, its output summary union, or any public wait predicate.

## Proposed MCP Tool

### `confirm_obs_config_workflow`

Purpose: wait for a typed profile or scene-collection config event after a known event cursor.

Inputs:

- `target`: `profile | scene_collection`
- `outcome`: `changing | changed | list_changed`
- `afterSequence`: required `EventCursor`
- `timeoutMs?: EventTimeoutMs`, capped by the configured OBS connection/request timeout
- `profileName?: ProfileName`
- `profiles?: Array<ProfileName>`
- `sceneCollectionName?: SceneCollectionName`
- `sceneCollections?: Array<SceneCollectionName>`

Input rules:

- The public input schema must be a discriminated union of exact supported variants.
- `afterSequence` is required for post-action confirmation.
- Raw OBS event names are not accepted as inputs.
- Current profile variants allow `profileName` only.
- Profile list variants allow `profiles` only.
- Current scene-collection variants allow `sceneCollectionName` only.
- Scene-collection list variants allow `sceneCollections` only.
- List filters are complete order-sensitive array filters. There is no contains, subset, set equality, regex, or partial matching.
- Value matching uses exact decoded JSON value equality.
- To verify final current identity after confirmation, callers should use `list_profiles` or `list_scene_collections`.
- `eventType`, `eventIntent`, `eventData`, `payload`, `regex`, `parameterCategory`, `parameterName`, `parameterValue`, scene fields, source fields, input fields, transition fields, and arbitrary object fields are forbidden.
- The MCP executor rejects excess fields, and the exported operation entry point must also decode this public input with `onExcessProperty: "error"`.

Input variants:

- `target: "profile"`, `outcome: "changing"`: allows `afterSequence`, `timeoutMs`, and optional `profileName`; forbids `profiles`, scene-collection fields, profile-parameter fields, and raw event fields.
- `target: "profile"`, `outcome: "changed"`: allows `afterSequence`, `timeoutMs`, and optional `profileName`; forbids `profiles`, scene-collection fields, profile-parameter fields, and raw event fields.
- `target: "profile"`, `outcome: "list_changed"`: allows `afterSequence`, `timeoutMs`, and optional `profiles`; forbids `profileName`, scene-collection fields, profile-parameter fields, and raw event fields.
- `target: "scene_collection"`, `outcome: "changing"`: allows `afterSequence`, `timeoutMs`, and optional `sceneCollectionName`; forbids `sceneCollections`, profile fields, profile-parameter fields, and raw event fields.
- `target: "scene_collection"`, `outcome: "changed"`: allows `afterSequence`, `timeoutMs`, and optional `sceneCollectionName`; forbids `sceneCollections`, profile fields, profile-parameter fields, and raw event fields.
- `target: "scene_collection"`, `outcome: "list_changed"`: allows `afterSequence`, `timeoutMs`, and optional `sceneCollections`; forbids `sceneCollectionName`, profile fields, profile-parameter fields, and raw event fields.

Outputs:

- `confirmed: boolean`
- `timedOut: boolean`
- `baselineSequence: EventCursor`
- `latestSequence: EventCursor`
- `missedEvents: boolean`
- `event?: ConfigWorkflowEventSummary`

Confirmation behavior:

- Return the first matching retained or newly observed event after `afterSequence`.
- If a matching event is already retained after the cursor, return immediately.
- If no match appears before timeout, return `confirmed: false`, `timedOut: true`, current cursor metadata, and no `event`.
- If OBS closes/disconnects or the MCP server closes while waiting, reject immediately and clean up the waiter without leaving timers active.
- Do not infer confirmation from current OBS request state.
- Do not synthesize an event from config request acknowledgements.
- Do not treat a pre-change `changing` event as satisfying a post-change `changed` wait.
- Do not treat a list-changed event as satisfying a current-identity wait.

## Narrow Types and Schemas

Reuse existing event types:

- `EventSequence`: positive safe integer for retained event sequence values.
- `EventCursor`: non-negative safe integer for cursors and metadata; `0` is valid before the first event.
- `EventCount`: non-negative safe integer for counts.
- `EventIntent`: non-negative safe integer for public event intent metadata in summaries.
- `EventTimeoutMs`: positive bounded integer capped by configuration/request timeout.

Add config workflow types:

- `ConfigWorkflowTarget`: `profile | scene_collection`.
- `ConfigWorkflowOutcome`: `changing | changed | list_changed`.
- `ConfigWorkflowEventType`: exactly the six included event names.
- `ConfigProfileNameFilter`: reuse `ProfileName` for user-provided `profileName`.
- `ConfigSceneCollectionNameFilter`: reuse `SceneCollectionName` for user-provided `sceneCollectionName`.
- `ConfigProfileListFilter`: `Array<ProfileName>` for user-provided full-list filters.
- `ConfigSceneCollectionListFilter`: `Array<SceneCollectionName>` for user-provided full-list filters.

Primitive type rules:

- User-provided identity filters use `ProfileName` and `SceneCollectionName`.
- User-provided full-list filters use arrays of `ProfileName` and `SceneCollectionName`.
- Observed raw protocol event data starts as `ObsString` or `Array<ObsString>`.
- Workflow summary construction must exact-decode through the public summary union before matching.
- Public current-identity summaries expose `profileName` or `sceneCollectionName` using the existing non-empty `ProfileName` and `SceneCollectionName` primitives.
- Public list summaries expose arrays of non-empty `ProfileName` or `SceneCollectionName` values.
- Raw diagnostic decode may retain OBS strings before workflow narrowing, but empty names, non-string list members, and malformed arrays must not become matching workflow summaries.
- Config workflow event payload codecs should exact-reject excess fields at ingestion because the six included events have no settings or plugin-shaped fields that require sanitization.
- Event intent and subscription masks are protocol metadata, not user inputs.
- Public event intent in summaries uses `EventIntent`, not bare `ObsNonNegativeInteger`.

## Schema Variants

The public input schema is an exact discriminated union:

- Profile changing variant: `target: "profile"`, `outcome: "changing"`.
- Profile changed variant: `target: "profile"`, `outcome: "changed"`.
- Profile list changed variant: `target: "profile"`, `outcome: "list_changed"`.
- Scene-collection changing variant: `target: "scene_collection"`, `outcome: "changing"`.
- Scene-collection changed variant: `target: "scene_collection"`, `outcome: "changed"`.
- Scene-collection list changed variant: `target: "scene_collection"`, `outcome: "list_changed"`.

The public summary schema mirrors those six variants and must be exact-decoded before matching. A diagnostic event can be retained without becoming a valid workflow summary.

`ConfigWorkflowEventSummary` must be a discriminated union keyed by `eventType`, with `target` and `outcome` constrained by each shape:

- `CurrentProfileChanging`: `sequence`, `eventIntent`, `eventType: "CurrentProfileChanging"`, `category: "config"`, `target: "profile"`, `outcome: "changing"`, `profileName`
- `CurrentProfileChanged`: `sequence`, `eventIntent`, `eventType: "CurrentProfileChanged"`, `category: "config"`, `target: "profile"`, `outcome: "changed"`, `profileName`
- `ProfileListChanged`: `sequence`, `eventIntent`, `eventType: "ProfileListChanged"`, `category: "config"`, `target: "profile"`, `outcome: "list_changed"`, `profiles`
- `CurrentSceneCollectionChanging`: `sequence`, `eventIntent`, `eventType: "CurrentSceneCollectionChanging"`, `category: "config"`, `target: "scene_collection"`, `outcome: "changing"`, `sceneCollectionName`
- `CurrentSceneCollectionChanged`: `sequence`, `eventIntent`, `eventType: "CurrentSceneCollectionChanged"`, `category: "config"`, `target: "scene_collection"`, `outcome: "changed"`, `sceneCollectionName`
- `SceneCollectionListChanged`: `sequence`, `eventIntent`, `eventType: "SceneCollectionListChanged"`, `category: "config"`, `target: "scene_collection"`, `outcome: "list_changed"`, `sceneCollections`

Summary construction must exact-decode this union with `onExcessProperty: "error"` before returning or matching a workflow event. Malformed summaries such as `CurrentProfileChanging` with `outcome: "changed"`, `ProfileListChanged` containing `profileName`, `SceneCollectionListChanged` containing `currentSceneCollectionName`, or any summary containing profile-parameter fields must fail schema decode.

## Event Journal and Cursor Semantics

This slice must reuse the bounded in-memory event journal introduced for output lifecycle confirmation.

Requirements:

- No second config-specific buffer.
- No duplicated cursor, eviction, timeout, or waiter cleanup logic.
- Match predicates are internal typed functions built from `ConfigWorkflowTarget`, `ConfigWorkflowOutcome`, and optional variant-specific filters.
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
- The official subscription is `Config` and matches the received event intent.
- The event decodes through the typed Effect Schema event codec.
- The workflow summary exact-decodes through the public summary union.
- `target` and `outcome` match the summary's constrained variant.
- For current profile events, supplied `profileName` matches exactly when present.
- For profile list events, supplied `profiles` matches the entire decoded array exactly when present.
- For current scene-collection events, supplied `sceneCollectionName` matches exactly when present.
- For scene-collection list events, supplied `sceneCollections` matches the entire decoded array exactly when present.

Rejected or malformed event payloads must not satisfy `confirm_obs_config_workflow`. Rejection behavior should reuse the existing event-buffer posture: unsafe, subscription-mismatched, and decode-failed events are silently dropped from the safe journal rather than surfaced as workflow events.

If raw protocol event codecs are broader than workflow summary codecs, tests must prove that malformed retained or ingested events cannot satisfy confirmation. In particular, retained or newly ingested list-changed events with non-array payloads, non-string array members, empty string members where public config names require non-empty strings, or excess fields must not produce a workflow summary or match a waiter.

Summary construction must follow the newer source-filter, media-input, input-audio, and transition pattern: exact-decode the workflow summary with `onExcessProperty: "error"` before matching. Do not copy the older output-lifecycle direct decode style.

## MCP and Resource Posture

This slice adds one MCP tool result surface. It does not add custom notifications.

The tool returns normal structured MCP content matching its output schema. It does not stream progress, subscribe clients to OBS events, or emit custom OBS event notifications.

Resources remain deferred. Profile and scene-collection list resources could become useful later if the server maintains authoritative cached state and has real resource invalidation semantics. This PRD does not define resource URI conventions and does not require resource support because this confirmation slice only waits for an event after a cursor.

## Safety Policy

Public workflow confirmation requires all of:

- The event is one of the six included events in this PRD.
- The official subscription is `Config` and matches the received event intent.
- The event decodes through the typed Effect Schema event codec.
- The workflow summary exact-decodes through the public summary union.
- Profile-parameter data, raw settings, raw payload objects, vendor/custom payloads, regex predicates, adjacent-domain event fields, and raw event query fields are excluded from workflow inputs and outputs.

Diagnostic event decode and workflow summaries are deliberately different surfaces. Diagnostic history may show safe raw protocol shapes where already supported, but workflow confirmation must expose only the public summary fields defined here.

## Acceptance Criteria

- The slice includes exactly the six config events listed in "Included Events".
- `confirm_obs_config_workflow` accepts only outcome-shaped discriminated input variants.
- Unsupported target/outcome combinations and unrelated optional fields are rejected by input schema.
- Raw `eventType`, `eventIntent`, `eventData`, `payload`, `regex`, profile-parameter fields, adjacent-domain identity fields, and arbitrary object inputs are rejected.
- The exported operation directly decodes public workflow input with `onExcessProperty: "error"`.
- `profileName` is accepted only for profile `changing` and `changed` variants.
- `profiles` is accepted only for profile `list_changed`.
- `sceneCollectionName` is accepted only for scene-collection `changing` and `changed` variants.
- `sceneCollections` is accepted only for scene-collection `list_changed`.
- List filters match full arrays exactly and order-sensitively.
- Output summaries are discriminated by `eventType`, `target`, and `outcome`.
- Malformed target/outcome/value combinations fail schema decode.
- List-changed summaries do not expose current identity fields.
- Current-identity summaries do not expose list fields.
- Profile parameter fields never appear in config workflow inputs or summaries.
- `CurrentProfileChanging` and `CurrentSceneCollectionChanging` do not satisfy `changed` waits.
- `CurrentProfileChanged` and `CurrentSceneCollectionChanged` do not satisfy `changing` waits.
- `ProfileListChanged` and `SceneCollectionListChanged` do not satisfy current-identity waits.
- `afterSequence: 0` is accepted; actual event `sequence: 0` is rejected.
- `EventIntent` accepts safe non-negative event intent metadata; workflow inputs never accept event intent.
- `missedEvents` propagates from the event journal for retained reads and waits.
- Wait success, timeout, OBS close/disconnect, and MCP server close all clean up waiters; close/disconnect reject immediately without post-close timers.
- Profile parameter changes, `ExitStarted`, scene graph events, transition events, output events, input events, media input events, source filter events, canvas events, UI events, vendor/custom events, and unrelated workflow events cannot satisfy the config workflow confirmation tool.
- Existing output lifecycle, scene graph, source filter, media input, input audio, and transition confirmation tools keep working unchanged.
- Existing config request tools continue to work when the `events` toolset is disabled.
- No MCP resources or custom OBS event notifications are added.

## Test Plan

Schema tests:

- `ConfirmObsConfigWorkflowInput` accepts all supported target/outcome variants.
- `ConfirmObsConfigWorkflowInput` rejects unsupported target/outcome combinations.
- `ConfirmObsConfigWorkflowInput` rejects raw event fields, regex, arbitrary payload fields, profile-parameter fields, scene fields, source fields, input fields, transition fields, output fields, and adjacent-domain identity fields.
- `ConfirmObsConfigWorkflowInput` rejects `profileName` on profile `list_changed`.
- `ConfirmObsConfigWorkflowInput` rejects `profiles` on profile `changing` and `changed`.
- `ConfirmObsConfigWorkflowInput` rejects `sceneCollectionName` on scene-collection `list_changed`.
- `ConfirmObsConfigWorkflowInput` rejects `sceneCollections` on scene-collection `changing` and `changed`.
- `ConfirmObsConfigWorkflowInput` rejects empty string identity filters.
- `ConfirmObsConfigWorkflowInput` rejects list filters containing non-string, empty string, or malformed members.
- `ConfirmObsConfigWorkflowInput` accepts `afterSequence: 0`.
- `ConfigWorkflowEventSummary` accepts valid summaries for all six included event types.
- `ConfigWorkflowEventSummary` rejects malformed target/outcome combinations.
- `ConfigWorkflowEventSummary` rejects list summaries containing current identity fields.
- `ConfigWorkflowEventSummary` rejects current-identity summaries containing list fields.
- `ConfigWorkflowEventSummary` rejects profile-parameter fields, raw event payload fields, and arbitrary extra fields.
- `ConfigWorkflowEventSummary` rejects malformed arrays, including non-array list payloads, non-string members, and empty string members where public config names require non-empty strings.
- Actual event `sequence: 0` is rejected as `EventSequence`.

Operation tests:

- Each included event type can satisfy `confirm_obs_config_workflow` with the correct target/outcome.
- Direct operation calls reject excess public input fields with `onExcessProperty: "error"`, independent of MCP executor validation.
- Optional `profileName` filters narrow `CurrentProfileChanging` and `CurrentProfileChanged` exactly.
- Optional `sceneCollectionName` filters narrow `CurrentSceneCollectionChanging` and `CurrentSceneCollectionChanged` exactly.
- Optional `profiles` filters narrow `ProfileListChanged` by full ordered array equality.
- Optional `sceneCollections` filters narrow `SceneCollectionListChanged` by full ordered array equality.
- `CurrentProfileChanging` does not satisfy profile `changed` or `list_changed`.
- `CurrentProfileChanged` does not satisfy profile `changing` or `list_changed`.
- `ProfileListChanged` does not satisfy profile `changing` or `changed`.
- `CurrentSceneCollectionChanging` does not satisfy scene-collection `changed` or `list_changed`.
- `CurrentSceneCollectionChanged` does not satisfy scene-collection `changing` or `list_changed`.
- `SceneCollectionListChanged` does not satisfy scene-collection `changing` or `changed`.
- Profile events do not satisfy scene-collection waits, and scene-collection events do not satisfy profile waits.
- Events outside the six included config events cannot satisfy the tool.
- Malformed retained config summaries with wrong outcome, wrong target, current identity on list events, list fields on current events, malformed arrays, or excess fields cannot satisfy the tool.
- Malformed ingested config event payloads with non-array list payloads, non-string array members, empty string members where rejected by the public summary codec, or excess fields are rejected or retained only diagnostically and do not satisfy waiters.
- `missedEvents` is propagated when the requested cursor predates the retained journal window.
- Timeout returns `confirmed: false`, `timedOut: true`, and no event.
- OBS close/disconnect rejects a pending wait immediately and leaves no active waiter/timer.
- Existing output lifecycle, scene graph, source filter, media input, input audio, and transition operation tests remain unchanged.

MCP tests:

- Tool registry includes `confirm_obs_config_workflow` only when the `events` toolset is enabled.
- MCP structured content matches the output schema for every included event type.
- Invalid input is rejected before reaching OBS operations.
- Existing `get_recent_obs_events` cursor behavior remains unchanged.
- Existing config request tools remain available independently of the `events` toolset.

Protocol/fake OBS tests:

- Safe event subscription negotiation includes `Config`.
- Fake OBS event ingestion covers all six included config event types.
- Subscription mismatch and decode failure do not produce public confirmation events.
- Raw diagnostic decode remains separate from public workflow summary decode.
- `get_recent_obs_events` can continue to show safe config/general diagnostic events, including `ExitStarted`, while `confirm_obs_config_workflow` excludes `ExitStarted`.
- List-changed events missing required arrays do not produce list workflow summaries.
- List-changed events with malformed retained or ingested array payloads cannot satisfy workflow confirmation.
- Current-identity events missing required name fields do not produce current workflow summaries.
- `ExitStarted`, profile parameter data, scene graph events, transition events, output events, input events, media input events, source filter events, canvas events, UI events, vendor/custom events, and unrelated events are rejected for workflow confirmation.

## Learnings Carried Forward

1. Use outcome-shaped workflow tools only; do not add raw event bus, raw event query language, custom event notification, or event subscription tools.
2. Keep `EventSequence` and `EventCursor` distinct: retained event sequences are positive; cursors and metadata are non-negative; `afterSequence: 0` is valid.
3. `EventIntent` is a safe non-negative protocol metadata primitive in summaries, never a workflow input.
4. Public tool inputs must be discriminated variants with forbidden unrelated fields.
5. MCP executor excess-field rejection is not enough; exported public operations must decode workflow inputs with `onExcessProperty: "error"`.
6. Output summaries must be discriminated by `eventType`, `target`, and `outcome`, and malformed combinations must fail schema decode.
7. Diagnostic history and workflow summaries are separate surfaces. Diagnostic-safe events do not automatically become workflow inputs, outputs, or wait predicates.
8. Pre-change and post-change config milestones are distinct. `changing` confirms that a change began; `changed` confirms OBS reported the new current identity.
9. List-changed events carry arrays only and no current identity. Do not synthesize current profile or current scene collection from those events.
10. Exclusions in this PRD are scoped to `confirm_obs_config_workflow` unless explicitly described as global policy.
11. High-volume, vendor/custom, raw-object, and settings-bearing payloads remain out unless a sanitized summary is explicitly designed.
12. Resources remain deferred. Future resource invalidation can be mentioned conceptually, but this slice must not define resource URI conventions.
13. If raw protocol event codecs are broader than workflow summary codecs, tests must prove malformed retained or ingested events cannot satisfy confirmations.
14. Tests must cover all included event types, unsupported variants, unrelated/excess fields, primitive/list shape validation, zero cursor, `missedEvents`, timeout, excluded events/fields, current-vs-list cross-matching, pre-vs-post milestone cross-matching, and strict direct operation decode.

## Open Questions

- Should a later general lifecycle slice expose `ExitStarted` for shutdown-aware clients?
- Should a later safety slice use `CurrentSceneCollectionChanging` and `CurrentSceneCollectionChanged` internally to pause or reject OBS requests during scene collection changes?
- Should future profile or scene-collection resources expose cached list/current state once there is a real resource invalidation design?
