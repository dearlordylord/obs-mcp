# Ralph Lane status-record-core

Branch: `ralph/status-record-core`

## Tasks

- [x] `task-1` Add OBS stats and record status
- [ ] `task-2` Add core record lifecycle controls

## task-1

Status: `done`

### Load

Add the read-only status foundation for the first widening batch: `get_obs_stats` from `GetStats` and `get_record_status` from `GetRecordStatus`. First inspect `src/obs/requests.ts`, `src/domain/schemas/general.ts`, `src/obs/operations/general.ts`, `src/mcp/tools/registry.ts`, `src/mcp/error-mapping.ts`, and nearby tests under `test/`. Use the official protocol JSON for exact response fields and keep all output structured. Add request descriptors, explicit Effect Schema output types, operation wrappers, registry metadata, capability gating through `GetVersion.availableRequests`, README metadata updates if generated, fake OBS websocket tests, and MCP handler tests. Non-goals: no record mutations, no stream tools, no generic outputs, no raw requests, no events, no screenshots, no HTTP transport. Verification: run focused status/record-status tests first, then `pnpm check-all`; optional real OBS integration may be read-only only.

## task-2

Status: `todo`

### Load

Add only core record lifecycle controls after task-1 lands: `start_record`, `stop_record`, and `toggle_record` from `StartRecord`, `StopRecord`, and `ToggleRecord`. Reuse the status foundation's module boundary, request descriptor style, OBS error mapping, capability gating, and structured success output conventions. `StopRecord` may return `outputPath`; return it only as opaque OBS metadata and do not read it, write it, normalize it, validate existence, apply path policy, or treat it as permission for filesystem access. Add fake OBS websocket tests for success, OBS request failure, out-of-capability unavailable behavior, and disabled record toolset behavior if a record toolset is introduced; add MCP handler tests for no-arg validation and structured success output. Non-goals: no pause/resume/toggle-pause, no split file, no chapter markers, no stream tools, no generic outputs, no filesystem reads/writes, no events. Verification: run focused record lifecycle tests first, then `pnpm check-all`; real OBS mutation tests remain opt-in.
