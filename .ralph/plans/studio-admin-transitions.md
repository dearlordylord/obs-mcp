# Ralph Lane studio-admin-transitions

Branch: `ralph/studio-admin-transitions`

## Tasks

- [x] `task-1` Add canvas and studio-mode read foundations
- [x] `task-2` Add transition inventory read tools
- [x] `task-3` Add transition mutation tools
- [x] `task-4` Add hotkey inventory and bounded trigger tools
- [x] `task-5` Add profile and scene collection read tools
- [x] `task-6` Add profile and scene collection mutation tools
- [x] `task-7` Add video settings and record-directory tools
- [x] `task-8` Add stream service settings tools
- [x] `task-9` Add gated UI dialog and projector tools
- [x] `task-10` Harden admin/studio verification and docs

## task-1

Status: `done`

### Load

Add `list_canvases` from `GetCanvasList` and `get_studio_mode_enabled` from `GetStudioModeEnabled`. Inspect `plans/obs-websocket-surface-matrix.json`, `.references/protocol/obs-websocket/docs/generated/protocol.md`, `src/domain/schemas`, `src/obs/requests`, `src/obs/operations`, `src/mcp/tools`, and fake OBS tests first. Use new or existing `canvases` and `ui` toolsets as appropriate, with capability gating through `GetVersion.availableRequests`. Schema outputs must be structured and sanitize Object-shaped canvas rows into stable summaries without raw passthrough unless the schema is intentionally narrow. Add schema, operation, fake websocket, MCP registry/handler, and disabled-toolset tests. Verification: focused tests, `pnpm lint`, `pnpm typecheck`, then `pnpm check-all`.

## task-2

Status: `done`

### Load

Add read-only transition inventory tools: `list_transition_kinds`, `list_scene_transitions`, `get_current_scene_transition`, and `get_current_scene_transition_cursor`. Keep transition settings Object fields out of public output unless represented by a typed/narrow schema; otherwise return only stable names/kinds/duration/cursor fields. Add request descriptors, domain schemas, operations, MCP tools under a `transitions` toolset, fake OBS handlers/fixtures, capability gating, and MCP handler tests. Non-goals: no transition mutation, no studio-mode trigger, no Object settings passthrough, no events.

## task-3

Status: `done`

### Load

Add transition mutation tools: `set_current_scene_transition`, `set_current_scene_transition_duration`, `set_current_scene_transition_settings`, `trigger_studio_mode_transition`, and `set_tbar_position`. Use explicit numeric bounds for duration and T-bar position, require non-empty transition names, and treat settings as a typed/narrow validated record with `overlay` semantics documented. Add OBS failure mapping and capability-gated unavailable tests. Non-goals: no batch `Sleep`, no UI projector/dialog tools, no raw settings passthrough beyond the approved schema.

## task-4

Status: `done`

### Load

Add hotkey tools: `list_hotkeys`, `trigger_hotkey_by_name`, and `trigger_hotkey_by_key_sequence`. Model key modifiers as an explicit object with optional boolean `shift`, `control`, `alt`, and `command`; require either key sequence or hotkey name according to the official request. Add clear tool descriptions warning that OBS hotkey functionality is best-effort and often has better request alternatives. Include fake OBS success/failure tests, schema validation tests, capability gating, and MCP handler tests. Non-goals: no raw key event passthrough, no persistent user keybinding storage, no UI automation outside official requests.

## task-5

Status: `done`

### Load

Add read-only config inventory tools: `list_profiles`, `list_scene_collections`, `get_profile_parameter`, and `get_record_directory`. Use dedicated `config` or `profiles` toolset naming consistent with existing registry style. Keep profile/scene collection names as non-empty strings and return nullable/default values exactly where OBS allows them. Add fake OBS handlers, schema tests, MCP handler tests, disabled-toolset tests, and OBS error metadata tests. Non-goals: no profile or scene collection mutations, no stream service settings, no video settings.

## task-6

Status: `done`

### Load

Add global config mutation tools: `set_current_profile`, `create_profile`, `remove_profile`, `set_current_scene_collection`, `create_scene_collection`, and `set_profile_parameter`. Gate them behind an explicit admin/config toolset and mark the tool descriptions as global OBS state changes. Require non-empty names and preserve OBS status metadata for missing/active/current profile errors. Fake OBS tests must prove state changes are represented and capability gating hides unavailable mutations. Non-goals: no persistent data, no stream service, no video settings, no filesystem writes.

## task-7

Status: `done`

### Load

Add video settings and record-directory tools: `get_video_settings`, `set_video_settings`, `get_record_directory`, and `set_record_directory` if `get_record_directory` did not land in task 5. Enforce official paired field semantics for base/output dimensions and FPS numerator/denominator. Treat record directories as opaque OBS strings: no local filesystem reads, writes, normalization, mkdir, or existence checks. Add schema tests for paired fields, fake OBS tests, MCP handler tests, OBS failure mapping, and docs. Non-goals: no screenshot file paths, no stream service settings.

## task-8

Status: `done`

### Load

Add stream service settings tools: `get_stream_service_settings` and `set_stream_service_settings`. Use a narrow schema for known `rtmp_custom` fields (`server`, `key`) and a deliberate typed record strategy for any other settings; never expose arbitrary raw object passthrough in the default toolset. Redact stream keys in logs/tests/docs where appropriate. Add fake OBS tests proving settings round trip without leaking secrets, MCP handler tests, capability gating, and OBS error metadata. Non-goals: no start/stop stream lifecycle, already implemented.

## task-9

Status: `done`

### Load

Add gated UI side-effect tools: `open_input_properties_dialog`, `open_input_filters_dialog`, `open_input_interact_dialog`, `list_monitors`, `open_video_mix_projector`, and `open_source_projector`. Put UI/dialog/projector tools behind a disabled-by-default `ui` toolset or another explicit opt-in category; the default toolsets must not include them. Use existing input/source locator schemas where possible and explicit monitor/projector mode enums from the protocol. Add fake OBS tests, capability gating, MCP handler tests, and README docs that label these as local OBS UI side effects. Non-goals: no screenshots, no arbitrary window management, no OS integration.

## task-10

Status: `done`

### Load

Consolidate this lane after tasks 1-9: remove duplicated config/studio/transition fixtures, update `README.md`, `docs/architecture.md` if new toolsets or policies were introduced, and add table-driven tests that every lane-owned request is represented by exactly one public tool or intentionally deferred note. Verify all new tools are capability-gated, disabled categories are hidden, `send_raw_obs_request` remains absent, and `pnpm check-all` passes with no new warnings promoted to errors. Non-goals: no feature additions beyond closing coverage/docs gaps from this lane.
