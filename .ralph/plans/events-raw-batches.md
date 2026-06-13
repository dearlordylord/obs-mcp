# Ralph Lane events-raw-batches

Branch: `ralph/events-raw-batches`

## Tasks

- [x] `task-1` Add event matrix ledger and subscription policy tests
- [x] `task-2` Add typed config and general events
- [x] `task-3` Add typed scene and scene-item events
- [x] `task-4` Add typed input and media-input events
- [x] `task-5` Add typed output, transition, UI, canvas, and filter events
- [x] `task-6` Add event resources and subscription controls
- [x] `task-7` Add high-volume event throttling or coalescing
- [x] `task-8` Add gated persistent data tools
- [x] `task-9` Add gated vendor/custom event tools
- [x] `task-10` Add request batch and Sleep support
- [x] `task-11` Harden raw/event/batch safety docs and tests

## task-1

Status: `done`

### Load

Create an event ledger test that maps every official event row from `plans/obs-websocket-surface-matrix.json` to one of: typed safe event, buffered/coalesced high-volume event, vendor/custom/raw-only event, or intentionally deferred event. Reuse `src/obs/events.ts`, `src/obs/protocol.ts`, `src/domain/schemas/events.ts`, and existing fake OBS event tests. Do not expose new public tools yet unless needed for test helpers. Verification: focused event/protocol tests and `pnpm check-all`.

## task-2

Status: `done`

### Load

Add typed event schemas and buffer decoding for config/general events that are safe and low-volume. Preserve event category, event type, sequence, event intent, and typed event data. Ensure malformed event data is sanitized or dropped according to the safe-event policy instead of surfacing raw arbitrary objects. Add schema tests, fake OBS tests, MCP `get_recent_obs_events` handler tests, and docs. Non-goals: no custom/vendor events.

## task-3

Status: `done`

### Load

Add typed scene and scene-item event schemas for all safe non-high-volume scene rows. Keep high-volume transform events out of default results unless task 7 has established coalescing. Add tests for current scene changes, preview scene changes, scene list changes, scene item created/removed/enable/lock/index/blend events where protocol supports them. Verify `get_recent_obs_events` preserves specific payload fields and does not degrade to generic branches.

## task-4

Status: `done`

### Load

Add typed input and media-input event schemas. Keep high-volume input active/show state and volume meter events out of default results unless task 7 has established explicit coalescing. Add typed schemas for mute, volume, audio balance, sync offset, media play/pause/stop/action/cursor state where official events provide fields. Add malformed-intent/data tests and MCP handler tests. Non-goals: no raw input settings Object event passthrough.

## task-5

Status: `done`

### Load

Add typed output, transition, UI, canvas, and filter event schemas for safe event rows. Cover output started/stopped/state/path events, transition begin/end/video-end, studio mode enabled changes, canvas create/remove/update, and filter list/enable/name/settings events as permitted by the safe-event policy. Add fake OBS event burst tests and regression tests proving vendor/custom/high-volume events are still filtered unless explicitly enabled.

## task-6

Status: `done`

### Load

Add event resource/subscription controls if needed beyond the existing `get_recent_obs_events` tool. Resource outputs must be bounded, structured, and stderr-only for diagnostics. Do not write to stdout outside MCP JSON-RPC. Add tests for event buffer capacity, dropped event counts, subscription masks sent in Identify, disabled events toolset behavior, and README docs for `TOOLSETS=events`.

## task-7

Status: `done`

### Load

Design and implement explicit high-volume event policy for `InputVolumeMeters`, `InputActiveStateChanged`, `InputShowStateChanged`, and `SceneItemTransformChanged`. Either keep them deferred with ledger tests or add opt-in coalescing/throttling behind a separate toolset/config flag. Default tools must not stream high-volume events. Add burst tests proving bounded memory, deterministic ordering, no stdout pollution, and no raw payload leakage.

## task-8

Status: `done`

### Load

Add `get_persistent_data` and `set_persistent_data` behind an explicit `raw` or `admin_raw` toolset that is disabled by default. Model realm and slot name explicitly and restrict slot values through Effect Schema to JSON-safe values if supported; otherwise keep set disabled and document why. Add fake OBS tests, capability gating, MCP handler tests, secret/redaction tests, and docs. Non-goals: no default exposure, no vendor requests.

## task-9

Status: `done`

### Load

Add gated raw/vendor tools for `call_vendor_request` and `broadcast_custom_event`. They must be disabled by default behind an explicit `raw` or `vendor` toolset, preserve structured JSON-safe inputs/outputs, reject non-JSON values, and clearly label security/provenance risk. Vendor/custom events must remain excluded from default `get_recent_obs_events`. Add fake OBS tests, schema tests, disabled/default toolset tests, and README docs.

## task-10

Status: `done`

### Load

Add request batch support only if it can preserve schema-first boundaries. Include `Sleep` only inside official batch execution semantics and reject public standalone `sleep` unless there is a deliberate batch tool. Use official execution type restrictions, response correlation, timeout behavior, and OBS error metadata. Add fake OBS batch tests, schema tests for batch item limits, and MCP handler tests. Non-goals: no arbitrary raw OBS request batch unless behind explicit raw/batch toolset.

## task-11

Status: `done`

### Load

Consolidate raw/event/batch docs and tests after tasks 1-10. Update the matrix or an event ledger with final status for all 60 event rows plus raw/vendor/persistent/batch rows. Add table-driven tests proving default toolsets do not expose raw/vendor/custom/high-volume/batch tools, `TOOLSETS` opt-ins work, stdout remains MCP-only, and `pnpm check-all` passes. Non-goals: no new normal request-category features.
