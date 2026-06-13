# Ralph Lane scenes-events

Branch: `ralph/scenes-events`

## Completed baseline

The merged foundation already includes core scenes, scene-item discovery/identity, event subscription masks, safe-event filtering policy, and protocol event envelope decoding. Treat those as established patterns, not tasks to redo.

## Tasks

- [ ] `task-1` Add scene-item enabled and locked controls
- [ ] `task-2` Add bounded low-volume event capture

## task-1

Status: `todo`

### Load

Add bounded scene-item read/mutation tools: `get_scene_item_enabled`, `set_scene_item_enabled`, `get_scene_item_locked`, and `set_scene_item_locked`. Reuse the existing scene and scene-item locator schemas: exactly one of `sceneName` or `sceneUuid`, `canvasUuid` only with `sceneName`, and numeric `sceneItemId` for item identity. Keep mutations narrow, idempotent where OBS semantics permit, and clearly named. Add request descriptors, Effect Schema input/output types, operation wrappers, registry entries, fake OBS websocket coverage for read/set/failure/capability-gated unavailable behavior, disabled scenes toolset behavior if applicable, MCP handler tests for invalid scene item IDs and structured success output, and OBS error metadata tests. Non-goals: no scene-item transform, blend mode, index changes, create/remove/duplicate, source screenshots, filters, or broad source lifecycle. Verification: run focused scene-item toggle tests, then `pnpm check-all`; real OBS mutation tests remain opt-in.

## task-2

Status: `todo`

### Load

Implement bounded low-volume event capture using the existing typed event primitives. Prefer a small internal service with configurable bounded capacity and tests before public MCP exposure. If a public surface is added, it must be read-only and LLM-first, such as `get_recent_obs_events` gated behind an `events` toolset with explicit category filters and bounded limits. Add fake websocket tests for event receipt, unrelated event ignore, buffer overflow/coalescing behavior, malformed event handling, reconnect/close behavior if applicable, disabled toolset behavior, rejection or non-subscription of high-volume categories, and filtering of `VendorEvent`/`CustomEvent` even when a broad subscription mask receives them. High-volume subscriptions remain disabled by default: `InputVolumeMeters`, `InputActiveStateChanged`, `InputShowStateChanged`, and `SceneItemTransformChanged`; local safe-all semantics must also exclude `Vendors`, `VendorEvent`, and `CustomEvent`. Non-goals: no high-volume subscriptions by default, no streaming transport, no raw vendor/custom events, no persistent storage. Verification: run focused event tests, then `pnpm check-all`.
