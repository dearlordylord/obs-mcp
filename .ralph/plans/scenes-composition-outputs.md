# Ralph Lane scenes-composition-outputs

Branch: `ralph/scenes-composition-outputs`

## Tasks

- [x] `task-1` Add group and preview scene tools
- [x] `task-2` Add scene lifecycle and rename tools
- [x] `task-3` Add scene transition override tools
- [x] `task-4` Add scene item transform read tools
- [x] `task-5` Add scene item transform mutation tools
- [x] `task-6` Add scene item create/remove/duplicate tools
- [x] `task-7` Add generic output inventory and status tools
- [x] `task-8` Add generic output lifecycle tools
- [x] `task-9` Add generic output settings tools
- [x] `task-10` Harden scene/output identity fixtures and docs

## task-1

Status: `done`

### Load

Add `list_groups`, `get_current_preview_scene`, and `set_current_preview_scene`. Reuse existing scene locator schemas and scene output normalization. `set_current_preview_scene` must be clearly tied to OBS studio mode/preview behavior and preserve OBS errors when preview is unavailable. Add request descriptors, operations, MCP tools, fake OBS tests, capability gating, and handler tests. Non-goals: no scene creation/removal, no transitions, no UI studio-mode toggle.

## task-2

Status: `done`

### Load

Add scene lifecycle tools: `create_scene`, `remove_scene`, and `set_scene_name`. Require non-empty scene names and return scene UUID where OBS provides it. Fake OBS tests must update scene list state and prove duplicate/missing scene errors surface with OBS metadata. Capability gating and disabled scenes toolset tests are required. Non-goals: no source/input creation, no scene item creation, no scene collection switching.

## task-3

Status: `done`

### Load

Add per-scene transition override tools: `get_scene_transition_override` and `set_scene_transition_override`. Use explicit schemas for scene locator, transition name, and duration where the official protocol allows optional fields. Add fake OBS tests for no override, set override, clear/replace semantics if supported by OBS, capability gating, and MCP handler tests. Non-goals: no global transition tools, owned by `studio-admin-transitions`.

## task-4

Status: `done`

### Load

Add `get_scene_item_transform`. Model transform fields explicitly: position, scale, rotation, crop, alignment, bounds, width/height where OBS returns them. Reuse scene-item locator conventions and avoid raw transform Object passthrough. Add schema tests for numeric fields, fake OBS tests, MCP handler tests, capability gating, and OBS failure mapping. Non-goals: no transform mutation.

## task-5

Status: `done`

### Load

Add `set_scene_item_transform`. Use the explicit transform schema from task 4 with partial update semantics only where OBS supports them. Validate numeric shapes without inventing layout constraints OBS does not enforce. Add fake OBS state tests proving `get_scene_item_transform` reflects mutations, MCP handler tests, OBS error metadata, and capability gating. Non-goals: no scene item create/remove/duplicate.

## task-6

Status: `done`

### Load

Add scene item lifecycle tools: `create_scene_item`, `remove_scene_item`, and `duplicate_scene_item`. Reuse scene locator and source/input locator conventions; return scene item ID and duplicate destination metadata where OBS provides it. Fake OBS tests must update list state, preserve item ordering, and prove group scene item behavior is not accidentally broken. Non-goals: no source/input creation, no screenshots, no filters.

## task-7

Status: `done`

### Load

Add generic output read tools: `list_outputs`, `get_output_status`, and possibly `get_output_settings` only if settings policy is ready; otherwise keep settings for task 9. Do not duplicate existing record/stream/virtualcam/replay-specific tools. Return output names, kinds, and active/reconnecting/timecode/byte/frame status fields as structured data. Add fake OBS tests, MCP handler tests, capability gating, and docs. Non-goals: no generic output mutations.

## task-8

Status: `done`

### Load

Add generic output lifecycle tools: `start_output`, `stop_output`, and `toggle_output`. Require non-empty output names and preserve OBS status metadata for missing output, already active, or not active states. Make descriptions clear that specialized record/stream/virtualcam/replay tools should be preferred where applicable. Add fake OBS state tests, capability gating, disabled outputs toolset tests, and MCP handler tests.

## task-9

Status: `done`

### Load

Add generic output settings tools: `get_output_settings` and `set_output_settings`. Use typed/narrow validated settings records; do not expose arbitrary raw Object passthrough in default tools. Redact any obvious secret-like fields in docs/log fixtures. Add fake OBS tests for settings read/update, schema validation, capability gating, and OBS error mapping. Non-goals: no stream service settings, owned by `studio-admin-transitions`.

## task-10

Status: `done`

### Load

Consolidate scene composition/output fixtures and docs after tasks 1-9. Add table-driven coverage proving every lane-owned request is represented and that generic output tools do not duplicate existing specialized tools. Verify scene locator rules, canvasUuid handling, capability gating, disabled categories, and no broad raw Object passthrough. Run focused tests, `pnpm lint`, `pnpm typecheck`, and `pnpm check-all`.
