# Ralph Lane scene-items-identity

Branch: `ralph/scene-items-identity`

## Tasks

- [ ] `task-1` Add scene-item discovery
- [ ] `task-2` Add scene-item enabled and locked toggles

## task-1

Status: `todo`

### Load

Add scene-item discovery tools: `list_scene_items`, `list_group_scene_items`, `get_scene_item_id`, and `get_scene_item_source`. First inspect existing scene schemas/operations/tools and the official protocol fields for scene item requests, especially `sceneName`, `sceneUuid`, `canvasUuid`, `sourceName`, `sourceUuid`, and `searchOffset`. Establish reusable scene and scene-item locator schemas that do not break the existing scene-name-first exemplar. Return ordered item summaries with stable identity fields and enough source metadata for later transforms. Add tests for schema validation, scene name lookup, optional UUID/canvas fields where supported, group item listing, OBS missing-item errors, and capability gating. Non-goals: no transforms, no create/remove/duplicate, no filters, no screenshots, no event subscriptions. Verification: run focused scene-item discovery tests, then `pnpm check-all`.

## task-2

Status: `todo`

### Load

Add bounded scene-item mutation/read tools: `get_scene_item_enabled`, `set_scene_item_enabled`, `get_scene_item_locked`, and `set_scene_item_locked`. Reuse the locator schemas from task-1 and keep mutations narrow, idempotent where OBS semantics permit, and clearly named. Add fake OBS websocket coverage for read, set, OBS failure, and capability-gated unavailable requests; add MCP handler tests for invalid scene item IDs and structured success output. Non-goals: no scene-item transform, blend mode, index, create/remove/duplicate, or source screenshot behavior. Verification: run focused scene-item toggle tests, then `pnpm check-all`; real OBS mutation tests remain opt-in.
