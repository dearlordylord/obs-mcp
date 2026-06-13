# Ralph Lane outputs-lifecycle

Branch: `ralph/outputs-lifecycle`

## Completed baseline

The merged foundation already includes `get_obs_stats`, `get_record_status`, record pause/resume/toggle-pause, stream status/start/stop/toggle, and virtual camera status/start/stop/toggle. Treat those as established patterns, not tasks to redo.

## Tasks

- [ ] `task-1` Complete record lifecycle and file/chapter controls
- [ ] `task-2` Add replay buffer controls
- [ ] `task-3` Add stream captions

## task-1

Status: `todo`

### Load

Add the remaining record tools in one coherent record vertical: `start_record`, `stop_record`, `toggle_record`, `split_record_file`, and `create_record_chapter`. Reuse the existing record status and pause-control schemas, request descriptor style, operation module, MCP registry metadata, capability gating through `GetVersion.availableRequests`, fake OBS websocket server, and MCP handler tests. `StopRecord` may return `outputPath`; return it only as opaque OBS metadata and do not read it, write it, normalize it, validate existence, apply path policy, or treat it as permission for filesystem access. Include the official chapter marker caveat that marker support depends on recording format support. Add schema tests, fake websocket tests for success/failure/unavailable capabilities, OBS error metadata coverage, disabled record toolset tests, and MCP handler structured-output tests. Non-goals: no record directory changes, no arbitrary filesystem access, no generic outputs, no screenshots, no stream service settings, no events. Verification: run focused record tests first, then `pnpm check-all`; real OBS mutation tests remain opt-in.

## task-2

Status: `todo`

### Load

Add replay buffer tools in the existing `outputs` category: `get_replay_buffer_status`, `start_replay_buffer`, `stop_replay_buffer`, `toggle_replay_buffer`, `save_replay_buffer`, and `get_last_replay_buffer_replay`. Reuse the virtual camera output patterns and keep `outputs` opt-in by default because these are output mutations. Treat `savedReplayPath` as opaque OBS metadata only: do not read it, write it, normalize it, validate existence, apply path policy, or imply filesystem access. Add explicit Effect Schema input/output types, request descriptors, operations, registry entries, capability-gated tests, fake websocket tests for every request, disabled outputs toolset tests, OBS error metadata coverage, and MCP handler tests for status, toggle, save, and last replay behavior. Non-goals: no generic output APIs, no output settings objects, no record directory changes, no screenshots, no raw requests. Verification: run focused replay buffer tests first, then `pnpm check-all`; real OBS integration should be opt-in.

## task-3

Status: `todo`

### Load

Add `send_stream_caption` from `SendStreamCaption` to the existing `stream` category after core stream controls are stable. Use official request fields and make the user-facing schema explicit about caption text. Validate empty or oversized caption behavior according to official restrictions if present; otherwise document and test the local schema choice. Add request descriptor, Effect Schema input/output types, operation wrapper, registry metadata, capability gating, fake OBS websocket success/failure tests, disabled stream toolset tests, OBS error metadata coverage, and MCP handler validation. Non-goals: no stream service settings, no generic output APIs, no raw vendor calls, no event subscriptions. Verification: run focused stream caption tests first, then `pnpm check-all`; real OBS mutation integration remains opt-in.
