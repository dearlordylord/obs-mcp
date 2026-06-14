# PRD: OBS Events Slice 1 - Output Lifecycle Confirmation

Status: draft.

Date: 2026-06-13.

## Problem

OBS websocket events are useful only when they improve an agent workflow. A broad public event feed would expose OBS mechanics for their own sake, force clients to understand event taxonomy, and create pressure to push raw/high-volume data over MCP.

The first production event slice should instead answer a narrow set of user-relevant questions:

- Did recording actually start, stop, pause, resume, or move to a new file?
- Did streaming actually start or stop?
- Did virtual camera or replay buffer state change?
- Did OBS save the replay buffer, and what path did it report?
- What output transition happened after an agent invoked an output-related tool?

This slice uses OBS events to confirm output lifecycle changes. It keeps MCP protocol usage request/response and structured; it does not introduce an OBS event bus.

## Goals

- Define a reusable event architecture that future slices can copy.
- Make output lifecycle events useful through task-shaped MCP tools, not a generic raw stream.
- Add cursor semantics so agents can ask what changed since a known point.
- Preserve the existing safe posture: no raw vendor/custom events, no high-volume events, no arbitrary settings passthrough.
- Keep the MCP server protocol-conformant: tools return structured content matching output schemas; no custom event notifications.
- Keep event support opt-in through the `events` toolset.

## Non-Goals

- Do not expose all OBS events as a stream.
- Do not add server-initiated `notifications/obs/event` messages.
- Do not expose `VendorEvent`, `CustomEvent`, `InputVolumeMeters`, `InputActiveStateChanged`, `InputShowStateChanged`, or `SceneItemTransformChanged`.
- Do not expose raw input settings from `InputCreated` or `InputSettingsChanged`.
- Do not add MCP resources or resource subscriptions in this slice.
- Do not require event support for the existing request tools to keep working.

## Event Catalogue

The full event catalogue for this design lives in `plans/obs-event-catalogue.md`.

The first slice is limited to these output events:

| Event | Why It Is Pertinent |
| --- | --- |
| `StreamStateChanged` | Confirms stream lifecycle changes after stream tools or external OBS/UI changes. |
| `RecordStateChanged` | Confirms record lifecycle changes and reports stopped-file path when OBS provides one. |
| `RecordFileChanged` | Confirms split/new file activity. |
| `ReplayBufferStateChanged` | Confirms replay buffer lifecycle changes. |
| `ReplayBufferSaved` | Confirms a replay save and returns the saved path. |
| `VirtualcamStateChanged` | Confirms virtual camera lifecycle changes. |

These events are already typed-safe, low-volume, and linked to existing tool verticals.

## Design Principles

Use Huly-style strictness for schemas, registry wiring, and test harness. Do not copy Huly event architecture because Huly had no equivalent event stream. OBS events need their own modules.

MCP-facing surfaces should be task-shaped. A model should not need to know OBS websocket event subscriptions or intent bitmasks to answer a user. Raw event names may appear in structured results as audit metadata, but they should not be the primary input language for production tools.

Events are an internal signal first. Public exposure is allowed only after a policy decision and a typed codec.

## Narrow Types

Do not model event workflow values as loose `string` or `number` primitives when the domain has a narrower meaning.

Required branded or literal schemas:

- `EventSequence`: positive safe integer. Used only for actual retained event `sequence` values.
- `EventCursor`: non-negative safe integer. Used for `sinceSequence`, `afterSequence`, `baselineSequence`, `oldestSequence`, and `latestSequence`; `0` means no event has been observed yet or the caller wants changes after server start.
- `EventBufferCapacity`: positive safe integer.
- `EventCount`: non-negative safe integer. Used for `droppedEvents`, `returnedEvents`, and rejection counters.
- `EventTimeoutMs`: positive bounded integer, capped by the configured OBS request/connection timeout.
- `EventSubscriptionMask`: branded non-negative safe integer used only by protocol/policy modules for OBS subscription bitmasks.
- `EventIntent`: branded non-negative safe integer used only at the OBS protocol envelope seam.
- `OutputLifecycleTarget`: literal `stream | record | replay_buffer | virtualcam`.
- `OutputLifecycleOutcome`: literal `started | stopped | paused | resumed | file_changed | replay_saved`.
- `OutputLifecycleEventType`: literal `StreamStateChanged | RecordStateChanged | RecordFileChanged | ReplayBufferStateChanged | VirtualcamStateChanged | ReplayBufferSaved`.
- `ObsOutputState`: literal OBS output states already represented by the event schema, not a free string.
- `ObsOutputPath`: non-empty OBS-reported path string.
- `OptionalObsOutputPath`: `ObsOutputPath | null`, required for `RecordStateChanged.outputPath`.

Raw OBS event names, subscription names, event intent numbers, arbitrary state strings, regexes, and untyped object payloads must not appear in workflow tool inputs. They may appear only behind internal catalogue/policy modules or as audit metadata in typed outputs.

## Proposed Modules

### Event Catalogue Module

Files:

- `src/obs/event-catalogue.ts`
- `test/obs/event-catalogue.test.ts`

Interface:

- Exposes all known official event descriptors.
- Carries event name, category, official subscription, policy status, and first-slice role.
- Provides lookup by event name and by category.

Implementation:

- Moves the current event policy ledger out of `test/obs/protocol.test.ts`.
- Keeps tests that prove the catalogue covers all 60 matrix events.

Depth:

- Callers learn one catalogue lookup interface instead of duplicating event maps, policy sets, and category logic.
- The catalogue becomes the test surface for parity with the matrix.

### Event Policy Module

Files:

- `src/obs/event-policy.ts`
- `test/obs/event-policy.test.ts`

Interface:

- `subscriptionMaskForPolicy(policy): EventSubscriptionMask`
- `classifyIncomingEvent(envelope): EventPolicyDecision`
- `EventPolicyDecision` includes `status`, `rejectionReason`, `allowedSurfaces`, and `subscription`.

Implementation:

- Owns safe subscription masks.
- Owns high-volume exclusions.
- Owns raw/vendor/custom exclusions.
- Owns the distinction between public journal, first-slice workflow, deferred, aggregate-only, and private raw events.
- Derives journal and output-lifecycle decisions from one classification result instead of spreading boolean helpers across call sites.

Depth:

- The deletion test is clear: deleting this module would push duplicated safety logic back into protocol intake, operations, MCP tools, and tests.
- This gives locality for policy changes. A future high-volume aggregate design updates one module, not every call site.

### Event Codec Module

Files:

- `src/obs/event-codecs.ts`
- `src/domain/schemas/events.ts`
- `test/obs/event-codecs.test.ts`

Interface:

- `decodeEventPayload(eventType, eventData): DecodedEventPayload`
- `decodeOutputLifecyclePayload(eventType, eventData): OutputLifecyclePayload`

Implementation:

- Keeps Effect Schema at the external data seam.
- Splits the large current `decodeTypedObsEventData` switch into small codec groups as needed.
- Sanitizes official raw settings fields before public exposure.

Depth:

- Callers do not know per-event schema details.
- Tests assert each public event either decodes safely or is intentionally rejected.

### Event Journal Module

Files:

- `src/obs/event-journal.ts`
- `test/obs/event-journal.test.ts`

Interface:

- `record(envelope): void`
- `snapshot(input): EventJournalSnapshot`
- `waitFor(match, options): Promise<EventJournalMatch>`

Implementation:

- Bounded in-memory append-only journal.
- Monotonic sequence numbers.
- `capacity`, `droppedEvents`, `latestSequence`, `oldestSequence`, and `missedEvents` metadata.
- Cursor filter: `sinceSequence`.
- `missedEvents` is true when the requested cursor is older than the retained journal window, such as `sinceSequence < oldestSequence - 1`.
- Match predicates are internal typed functions, not raw arbitrary JavaScript or raw regex.

Depth:

- MCP tools and OBS client code do not each implement ordering, buffer loss, cursor handling, or timeout behavior.
- Tests use the same interface production uses.

### MCP Event Tools Module

Files:

- `src/mcp/tools/events.ts`
- `src/obs/operations/events.ts`
- `test/mcp/registry.test.ts`
- `test/mcp/create-mcp-server.test.ts`

Interface:

- Keep `get_recent_obs_events` as the diagnostic journal reader.
- Add `confirm_obs_output_lifecycle` as the production first-slice tool; OBS event names remain audit metadata, not input language.

Tool: `get_recent_obs_events`

- Inputs: `limit`, `order`, `categories`, `sinceSequence`.
- Primitive constraints:
  - `limit`: bounded positive safe integer.
  - `sinceSequence`: optional `EventCursor`.
  - `categories`: literal event category values.
- Outputs: `capacity`, `droppedEvents`, `oldestSequence`, `latestSequence`, `missedEvents`, `returnedEvents`, `events`.
- Output primitive constraints:
  - event `sequence` fields are `EventSequence`; cursor metadata fields are `EventCursor`.
  - count fields are `EventCount`.
- Purpose: diagnostic/admin context, not primary workflow interface.

Tool: `confirm_obs_output_lifecycle`

- Inputs:
  - `target`: `stream | record | replay_buffer | virtualcam`
  - `outcome`: `started | stopped | paused | resumed | file_changed | replay_saved`
  - `afterSequence`: required `EventCursor` from the event journal
  - `timeoutMs?: EventTimeoutMs`, capped by config/request timeout
- Outputs:
  - `confirmed: boolean`
  - `timedOut: boolean`
  - `baselineSequence`
  - `latestSequence`
  - `missedEvents`
  - `event?: OutputLifecycleEventSummary`
- Output primitive constraints:
  - `baselineSequence` and `latestSequence` are `EventCursor`.
  - `event.eventType` is `OutputLifecycleEventType`, not arbitrary string.
  - `event.outputState`, when present, is `ObsOutputState`.
  - `event.outputPath`, `event.newOutputPath`, and `event.savedReplayPath`, when present, use `ObsOutputPath`; `RecordStateChanged.outputPath` may be `null`.
- Purpose: let an agent confirm an output action without polling unrelated state tools or subscribing to a raw stream.

The confirmation tool must not accept raw OBS event names, subscription names, event intents, regexes, or arbitrary state strings as input. Its output may include the matched OBS event name as audit metadata.

For post-action confirmation, callers must capture `latestSequence` before invoking the output mutation and pass it as `afterSequence`. This prevents a stale event from satisfying a later confirmation. A later implementation may fold that cursor into mutating output tools, but this first slice keeps the cursor explicit.

The confirmation tool returns a normal MCP tool result. It does not send progress events or custom notifications.

## MCP Protocol Posture

This slice uses only MCP tools. The MCP specification treats tools as model-controlled calls with input schemas and structured results. This fits output lifecycle confirmation because the agent asks a bounded question and receives a bounded answer.

MCP resources are deferred. A future `obs://events/recent` resource may be useful as application-selected context, but resources would require declaring the `resources` capability and implementing `resources/read`. Resource subscriptions should only send standard `notifications/resources/updated` notifications and should require clients to reread the resource.

Custom OBS event notifications are explicitly rejected for this slice. They would be less portable across MCP hosts and would blur OBS websocket semantics with MCP semantics.

## Safety Policy

Public event exposure requires all of:

- The event is in the catalogue.
- The official subscription matches the received event intent.
- The event is not high-volume.
- The event is not vendor/custom/raw-only.
- The event payload decodes through an Effect Schema codec.
- The event payload omits or sanitizes raw settings and arbitrary object fields.

If any condition fails, the event is not exposed publicly.

Path-bearing output event fields follow the existing record/output tool path policy: full OBS-reported paths may be returned only by explicit output-related tool calls. They are not emitted through push notifications, resources, logs, or broad default context. This keeps `RecordStateChanged.outputPath`, `RecordFileChanged.newOutputPath`, and `ReplayBufferSaved.savedReplayPath` consistent with the existing record/output tools while avoiding unsolicited path disclosure.

Rejected events should be counted by reason for diagnostics:

- `unsafe_policy`
- `subscription_mismatch`
- `decode_failed`

Rejected event payloads should not be retained. Journal eviction is tracked separately as retention metadata, not as an event rejection reason.

## Acceptance Criteria

- The event catalogue covers all 60 events in `plans/obs-websocket-surface-matrix.json`.
- The first-slice output event list contains exactly the six output lifecycle events above.
- Workflow schemas use the narrow types from this PRD; no workflow input accepts raw event names, raw OBS output-state strings, event intent numbers, regexes, or untyped object payloads.
- `SAFE_EVENT_SUBSCRIPTION_MASK` remains free of vendor and high-volume subscriptions.
- `get_recent_obs_events` supports `sinceSequence` and reports whether the caller missed evicted events.
- `confirm_obs_output_lifecycle` waits only for output lifecycle outcomes and rejects raw event names as input.
- `confirm_obs_output_lifecycle.afterSequence` is required for post-action confirmation.
- Long-running wait tools clean up waiters on timeout, match, client cancellation, OBS disconnect, and MCP server close.
- All event tool outputs have Effect Schema output schemas and MCP structured content.
- No stdout diagnostics are added.
- No custom MCP notifications are added.
- Existing request tools still work when `TOOLSETS` does not include `events`.
- Fake OBS websocket tests cover subscription negotiation, event ingestion, cursor reads, buffer eviction, wait success, wait timeout, and unsafe event rejection.

## Open Questions

- Should output lifecycle waits be integrated into existing mutating tools later, or remain separate explicit tools?
- Should event support become a prerequisite for richer record/stream tools, or remain an optional diagnostic companion?

## Subagent Review Notes

Two subagent reviews were incorporated into this draft.

Architecture review:

- Current modules are deep enough for a first production slice only if events stay behind an internal intake/policy/codec foundation plus one narrow user outcome.
- Policy is currently duplicated between intake and operation filtering; the PRD therefore introduces an Event Policy Module.
- `get_recent_obs_events` is useful as diagnostics but shallow as a production workflow. The first production slice should be output lifecycle confirmation.

MCP review:

- Keep the first event surface pull-based and tool-shaped.
- Add cursor semantics before adding more event types.
- Do not forward raw OBS websocket events over MCP.
- Defer resources and use standard resource update notifications only if a later slice adds resources.
