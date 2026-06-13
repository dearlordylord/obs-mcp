# Ralph Lane scenes-events

Branch: `ralph/scenes-events`

## Completed baseline

The merged foundation already includes core scenes, scene-item discovery/identity, event subscription masks, safe-event filtering policy, and protocol event envelope decoding. Treat those as established patterns, not tasks to redo.

## Tasks

- [ ] `task-1` Add scene-item enabled and locked controls
- [ ] `task-2` Add scene-item index and blend mode read controls
- [ ] `task-3` Add scene-item index and blend mode mutation controls
- [ ] `task-4` Add source active read tools
- [ ] `task-5` Build bounded OBS event buffer service
- [ ] `task-6` Expose recent safe OBS events behind an events toolset
- [ ] `task-7` Add typed low-volume scene/input/output/media events
- [ ] `task-8` Harden event subscription and stdout-purity coverage

## task-1

Status: `todo`

### Load

Add bounded scene-item read/mutation tools: `get_scene_item_enabled`, `set_scene_item_enabled`, `get_scene_item_locked`, and `set_scene_item_locked`. Reuse the existing scene and scene-item locator schemas: exactly one of `sceneName` or `sceneUuid`, `canvasUuid` only with `sceneName`, and numeric `sceneItemId` for item identity. Keep mutations narrow, idempotent where OBS semantics permit, and clearly named. Add request descriptors, Effect Schema input/output types, operation wrappers, registry entries, fake OBS websocket coverage for read/set/failure/capability-gated unavailable behavior, disabled scenes toolset behavior if applicable, MCP handler tests for invalid scene item IDs and structured success output, and OBS error metadata tests. Non-goals: no scene-item transform, blend mode, index changes, create/remove/duplicate, source screenshots, filters, or broad source lifecycle. Verification: run focused scene-item toggle tests, then `pnpm check-all`; real OBS mutation tests remain opt-in.

## task-2

Status: `todo`

### Load

Add read-only scene-item position/state tools: `get_scene_item_index` and `get_scene_item_blend_mode`. Reuse the existing scene locator and numeric scene item ID conventions. Use official blend mode enum values for output where available; if OBS returns strings, model them explicitly. Add request descriptors, schemas, operations, registry entries, fake websocket coverage, capability gating, disabled scenes toolset tests, and MCP handler structured-output tests. Non-goals: no transforms, create/remove/duplicate, screenshots, filters, or source lifecycle.

## task-3

Status: `todo`

### Load

Add bounded scene-item mutation tools: `set_scene_item_index` and `set_scene_item_blend_mode`. Reuse the same locator and enum schemas from task 2. Validate non-negative scene item index locally and preserve OBS error metadata for out-of-range or invalid blend modes. Add fake websocket success/failure tests, capability-gated unavailable tests, disabled scenes toolset tests, and MCP handler validation. Non-goals: no transforms, create/remove/duplicate, source screenshots, filters, or broad source lifecycle.

## task-4

Status: `todo`

### Load

Add source activity read tools from `GetSourceActive` using the same source identity conventions established by scene-item source lookups. Keep the tool read-only and structured: active/showing values should be booleans with source name/UUID echoed only if OBS provides them or the input schema supplied them. Add schemas, request descriptors, operations, registry entries, fake websocket tests, capability gating, disabled toolset behavior, and MCP handler tests. Non-goals: no screenshots, no source lifecycle, no source settings Object passthrough.

## task-5

Status: `todo`

### Load

Implement bounded low-volume event capture using the existing typed event primitives. Start with a small internal service with configurable bounded capacity and tests before public MCP exposure. It must preserve stdio stdout purity and send diagnostics to stderr only. Add fake websocket tests for event receipt, unrelated event ignore, buffer overflow/coalescing behavior, malformed event handling, reconnect/close behavior if applicable, and filtering of `VendorEvent`/`CustomEvent` even when a broad subscription mask receives them. High-volume subscriptions remain disabled by default: `InputVolumeMeters`, `InputActiveStateChanged`, `InputShowStateChanged`, and `SceneItemTransformChanged`; local safe-all semantics must also exclude `Vendors`, `VendorEvent`, and `CustomEvent`.

## task-6

Status: `todo`

### Load

Expose `get_recent_obs_events` behind a new `events` toolset only after task 5 is stable. The public surface must be read-only and LLM-first: explicit category filters, bounded limits, newest-first or oldest-first documented ordering, and structured event summaries. Add disabled toolset tests, limit validation tests, malformed-event behavior, safe event filtering tests, and MCP handler structured-output tests. Non-goals: no streaming transport, no raw vendor/custom events, no persistent storage, no high-volume events by default.

## task-7

Status: `todo`

### Load

Add typed low-volume event schemas for the first useful categories: scene current-program changes, scene list changes, input mute/volume/balance/monitor changes, stream/record output state changes, replay buffer saved/state changes, and media playback/action events. Keep payloads schema-first and avoid `UnknownRecord` except at the internal protocol boundary. Add envelope decoding tests and fake websocket event tests. Non-goals: no `InputVolumeMeters`, no `SceneItemTransformChanged`, no vendor/custom event payloads.

## task-8

Status: `todo`

### Load

Harden event subscription policy and stdout-purity coverage. Add tests proving the Identify payload never subscribes to high-volume categories by default, `events` toolset opt-in does not imply raw vendor/custom events, logs remain on stderr in stdio mode, and event buffer capacity is bounded under burst input. Verification: run focused event tests, then `pnpm check-all`.
