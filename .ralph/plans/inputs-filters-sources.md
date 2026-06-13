# Ralph Lane inputs-filters-sources

Branch: `ralph/inputs-filters-sources`

## Scope

Remaining matrix rows covered by this lane:

- inputs: `CreateInput`, `RemoveInput`, `SetInputName`, `GetInputDefaultSettings`, `GetInputSettings`, `SetInputSettings`, `GetInputAudioTracks`, `SetInputAudioTracks`, `GetInputDeinterlaceMode`, `SetInputDeinterlaceMode`, `GetInputDeinterlaceFieldOrder`, `SetInputDeinterlaceFieldOrder`, `GetInputPropertiesListPropertyItems`, `PressInputPropertiesButton`
- filters: `GetSourceFilterKindList`, `GetSourceFilterList`, `GetSourceFilterDefaultSettings`, `CreateSourceFilter`, `RemoveSourceFilter`, `SetSourceFilterName`, `GetSourceFilter`, `SetSourceFilterIndex`, `SetSourceFilterSettings`, `SetSourceFilterEnabled`
- sources: `GetSourceScreenshot`, `SaveSourceScreenshot`

## Tasks

- [ ] `task-1` Add input audio track controls
- [ ] `task-2` Add input deinterlace controls
- [ ] `task-3` Add input settings read tools
- [ ] `task-4` Add guarded input settings mutations and property buttons
- [ ] `task-5` Add input lifecycle and rename tools
- [ ] `task-6` Add filter discovery and read tools
- [ ] `task-7` Add filter enable/index/name mutations
- [ ] `task-8` Add filter create/remove/settings tools
- [ ] `task-9` Add screenshot payload and save policies
- [ ] `task-10` Harden settings/filter/source fixtures and docs

## task-1

Status: `todo`

### Load

Add `get_input_audio_tracks` and `set_input_audio_tracks`. Reuse the established exactly-one input locator schema. Model the OBS audio tracks object as explicit track booleans where possible (`track1` through official supported count) rather than raw Object passthrough. Add schema, operation, request descriptor, MCP tool, fake OBS, capability gating, and handler tests. Non-goals: no settings Object, no deinterlace, no input lifecycle, no filters.

## task-2

Status: `todo`

### Load

Add deinterlace tools: `get_input_deinterlace_mode`, `set_input_deinterlace_mode`, `get_input_deinterlace_field_order`, and `set_input_deinterlace_field_order`. Use official enum values and document OBS async-input restriction without trying to infer input kind locally. Add fake OBS success/failure tests, invalid enum tests, capability gating, disabled toolset tests, and MCP handler tests. Non-goals: no input settings, no audio tracks, no create/remove input.

## task-3

Status: `todo`

### Load

Add read-only input settings tools: `get_input_default_settings`, `get_input_settings`, and `get_input_properties_list_property_items`. Use typed/narrow settings wrappers and sanitized structured output. If full arbitrary settings cannot be modeled safely in this task, expose only known stable metadata and add explicit deferred notes for broad Object passthrough. Add schema tests for property names and input kinds, fake OBS tests with Object-shaped protocol responses, MCP handler tests, and capability gating. Non-goals: no settings mutation, no input lifecycle, no filters.

## task-4

Status: `todo`

### Load

Add guarded input mutation tools: `set_input_settings` and `press_input_properties_button`. `set_input_settings` must require an intentionally narrow validated settings record and optional `overlay`; do not accept arbitrary raw JSON by default. `press_input_properties_button` must require a non-empty property name and be described as an OBS-side effect. Add OBS failure mapping, capability gating, fake OBS tests, MCP handler tests, and docs. Non-goals: no create/remove input, no filters, no screenshots.

## task-5

Status: `todo`

### Load

Add input lifecycle/name tools: `create_input`, `remove_input`, and `set_input_name`. Reuse scene locator conventions for `create_input` and input locator conventions for target input mutations. Object-shaped `inputSettings` must follow the same validated/narrow settings policy from tasks 3-4. Add fake OBS state tests proving created inputs appear in `list_inputs`, removed inputs disappear, names update, and scene item IDs/UUIDs are returned where OBS provides them. Non-goals: no scene item transform, no source filters, no filesystem.

## task-6

Status: `todo`

### Load

Add filter discovery/read tools: `list_source_filter_kinds`, `list_source_filters`, `get_source_filter_default_settings`, and `get_source_filter`. Reuse source locators (`sourceName`/`sourceUuid`, optional `canvasUuid` where official protocol supports it). Sanitize Object filter settings through typed/narrow schemas or stable summaries. Add schema tests, fake OBS handlers, MCP registry/handler tests, capability gating, and OBS error metadata. Non-goals: no filter mutations.

## task-7

Status: `todo`

### Load

Add simple filter mutation tools: `set_source_filter_enabled`, `set_source_filter_index`, and `set_source_filter_name`. Require non-empty filter names, non-negative filter indices, and source locator exactly-one behavior. Add fake OBS state tests, capability gating, disabled filters toolset tests, OBS failure mapping, and MCP handler tests. Non-goals: no filter settings mutation, no create/remove.

## task-8

Status: `todo`

### Load

Add advanced filter mutation tools: `create_source_filter`, `remove_source_filter`, and `set_source_filter_settings`. Keep filter settings behind the lane's typed/narrow settings policy; reject arbitrary raw Object values unless there is an explicit schema boundary and tests. Add fake OBS tests covering create/list/get/remove and settings overlay behavior, capability gating, MCP handler tests, and README notes. Non-goals: no vendor filter extensions, no screenshots.

## task-9

Status: `todo`

### Load

Add source screenshot tools from `GetSourceScreenshot` and `SaveSourceScreenshot` only after defining payload/file policy. `get_source_screenshot` should return bounded image data metadata and data only if size/MIME constraints are explicit. `save_source_screenshot` must be disabled by default, require an allowlisted output path policy, and never create directories implicitly unless the policy already exists. Add fake OBS tests for image format/quality/size validation, no stdout pollution, MCP handler tests, and docs. Non-goals: no browser/OS screenshots, no arbitrary filesystem writes.

## task-10

Status: `todo`

### Load

Consolidate lane fixtures and docs after tasks 1-9. Ensure input settings, filter settings, and screenshots share policy language instead of duplicating ad hoc Object rules. Add table-driven registry tests proving every lane-owned request is either implemented or explicitly deferred by policy, every tool is capability-gated, and broad raw passthrough remains absent. Run focused tests, `pnpm lint`, `pnpm typecheck`, and `pnpm check-all`.
