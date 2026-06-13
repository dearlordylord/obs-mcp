# Ralph Lane record-advanced

Branch: `ralph/record-advanced`

## Tasks

- [ ] `task-1` Add record pause controls
- [ ] `task-2` Add record split and chapter controls

## task-1

Status: `todo`

### Load

Add only pause-related record controls after `status-record-core` lands: `pause_record`, `resume_record`, and `toggle_record_pause` from `PauseRecord`, `ResumeRecord`, and `ToggleRecordPause`. First inspect the record status/lifecycle implementation and reuse its schemas, operations, registry metadata, capability gating, OBS error mapping, fake server helpers, and MCP handler test style. Return structured outputs that clearly distinguish the requested action from OBS status fields where available. Add fake OBS websocket tests for success, failure, unavailable capabilities, and disabled record toolset behavior if a record toolset exists. Non-goals: no stats/status changes, no start/stop/toggle lifecycle, no split file, no chapter markers, no stream tools, no filesystem behavior. Verification: run focused record pause tests first, then `pnpm check-all`; real OBS mutation tests remain opt-in.

## task-2

Status: `todo`

### Load

Add file/chapter record controls only after pause controls are stable: `split_record_file` from `SplitRecordFile` and `create_record_chapter` from `CreateRecordChapter`. Use the official protocol caveats as user-facing schema/description constraints, including OBS version/capability gating and the limitation that chapter markers depend on recording format support. Treat any returned path or file-related value as opaque OBS metadata; do not read, write, normalize, validate existence, or impose filesystem policy in this lane. Add schema tests, fake OBS websocket tests for success/failure/unavailable capabilities, OBS error metadata coverage, and MCP handler tests. Non-goals: no record directory changes, no arbitrary filesystem access, no generic outputs, no screenshots, no stream tools. Verification: run focused record file/chapter tests first, then `pnpm check-all`; real OBS mutation tests remain opt-in.
