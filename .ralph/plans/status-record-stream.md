# Ralph Lane status-record-stream

Branch: `ralph/status-record-stream`

## Tasks

- [ ] `task-1` Add OBS stats and record controls
- [ ] `task-2` Add stream controls

## task-1

Status: `todo`

### Load

Add the first safe status/control expansion: `get_obs_stats`, `get_record_status`, `start_record`, `stop_record`, `toggle_record`, `pause_record`, `resume_record`, `toggle_record_pause`, `split_record_file`, and `create_record_chapter`. First inspect `src/obs/requests.ts`, `src/domain/schemas/general.ts`, `src/domain/schemas/scenes.ts`, `src/obs/operations/general.ts`, `src/obs/operations/scenes.ts`, `src/mcp/tools/registry.ts`, `src/mcp/error-mapping.ts`, and nearby tests under `test/`. Use the official protocol JSON for exact OBS request/response fields. Keep the pattern copyable: request descriptor, explicit Effect Schema input/output types, operation wrapper, registry tool metadata, capability gating through `GetVersion.availableRequests`, README metadata generation if needed, fake OBS websocket coverage, and MCP handler tests. Use structured outputs; do not textify JSON. Non-goals: no stream tools, no generic outputs, no raw requests, no events, no screenshots, no HTTP transport. Verification: run focused tests for the new schemas/operations/MCP handlers first, then `pnpm check-all`; run `pnpm test:integration` only if a real OBS connection is available and the task touches integration behavior.

## task-2

Status: `todo`

### Load

Add compact stream controls after task-1's status/control pattern exists: `get_stream_status`, `start_stream`, `stop_stream`, `toggle_stream`, and `send_stream_caption`. First inspect the record/status implementation from task-1 and reuse the same module boundary and error/capability patterns. Use official request fields for `SendStreamCaption` and make the user-facing schema explicit about caption text. Add fake OBS websocket tests for success, OBS request failure, and capability-gated unavailability; add MCP handler tests for parameter validation and structured outputs. Non-goals: no stream service settings, no generic output APIs, no raw vendor calls, no event subscriptions. Verification: run focused stream tests, then `pnpm check-all`; optionally run real OBS integration if available and safe.
