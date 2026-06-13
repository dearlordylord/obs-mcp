# Ralph Lane outputs-lifecycle

Branch: `ralph/outputs-lifecycle`

## Tasks

- [x] `task-1` Complete record lifecycle and file/chapter controls
- [x] `task-2` Add record file split and chapter marker controls
- [x] `task-3` Add replay buffer lifecycle controls
- [x] `task-4` Add replay buffer save and last-replay metadata
- [x] `task-5` Add stream captions
- [x] `task-6` Harden lifecycle capability and disabled-toolset coverage
- [x] `task-7` Add lifecycle operation/test fixture consolidation
- [x] `task-8` Add opt-in real OBS lifecycle smoke coverage

## task-1

Status: `done`

### Load

Add the core remaining record lifecycle tools: `start_record`, `stop_record`, and `toggle_record`. Reuse the existing record status and pause-control schemas, request descriptor style, operation module, MCP registry metadata, capability gating through `GetVersion.availableRequests`, fake OBS websocket server, and MCP handler tests. `StopRecord` may return `outputPath`; return it only as opaque OBS metadata and do not read it, write it, normalize it, validate existence, apply path policy, or treat it as permission for filesystem access. Add schema tests, fake websocket tests for success/failure/unavailable capabilities, OBS error metadata coverage, disabled record toolset tests, and MCP handler structured-output tests. Non-goals: no record directory changes, no arbitrary filesystem access, no generic outputs, no screenshots, no stream service settings, no events. Verification: run focused record lifecycle tests first, then `pnpm check-all`; real OBS mutation tests remain opt-in.

## task-2

Status: `done`

### Load

Add `split_record_file` and `create_record_chapter`. Use the official `SplitRecordFile` and `CreateRecordChapter` request fields, including optional `chapterName` and the official caveat that chapter marker support depends on the recording format, with Hybrid MP4 support called out in tool docs. Use an acknowledgement output shape that is shared with other empty OBS mutations. Add validation for empty chapter names if the local schema rejects them, fake websocket success/failure tests, capability gating, MCP handler tests, README tool sync, and OBS error metadata coverage. Non-goals: no record directory changes, no file inspection, no filesystem policy, no recording format mutation.

## task-3

Status: `done`

### Load

Add replay buffer lifecycle tools in the existing `outputs` category: `get_replay_buffer_status`, `start_replay_buffer`, `stop_replay_buffer`, and `toggle_replay_buffer`. Reuse the virtual camera and stream lifecycle patterns, shared output-active schemas, request descriptors, operations, MCP registry metadata, capability gating, fake websocket coverage, disabled outputs toolset tests, and structured MCP handler outputs. Keep `outputs` opt-in because these are output mutations. Non-goals: no generic output APIs, no output settings objects, no record directory changes, no screenshots, no raw requests. Verification: run focused replay buffer lifecycle tests first, then `pnpm check-all`.

## task-4

Status: `done`

### Load

Add `save_replay_buffer` and `get_last_replay_buffer_replay`. Treat `savedReplayPath` as opaque OBS metadata only: do not read it, write it, normalize it, validate existence, apply path policy, or imply filesystem access. Add explicit Effect Schema input/output types, request descriptors, operations, registry entries, capability-gated tests, fake websocket success/failure tests, disabled outputs toolset tests, OBS error metadata coverage, and MCP handler tests for save and last replay behavior. Non-goals: no replay file management, no screenshot policy, no path allowlist work in this lane.

## task-5

Status: `done`

### Load

Add `send_stream_caption` from `SendStreamCaption` to the existing `stream` category after core stream controls are stable. Use official request fields and make the user-facing schema explicit about caption text. Validate empty or oversized caption behavior according to official restrictions if present; otherwise document and test the local schema choice. Add request descriptor, Effect Schema input/output types, operation wrapper, registry metadata, capability gating, fake OBS websocket success/failure tests, disabled stream toolset tests, OBS error metadata coverage, and MCP handler validation. Non-goals: no stream service settings, no generic output APIs, no raw vendor calls, no event subscriptions.

## task-6

Status: `done`

### Load

After tasks 1-5 land, add table-driven coverage proving every lifecycle tool is filtered by both `TOOLSETS` category and `GetVersion.availableRequests`. The tests should cover partial availability for record, stream, virtual camera, and replay buffer tools without duplicating full request lists in each test. Prefer shared test fixtures for available requests and fake clients. Non-goals: no new OBS functionality; this is a foundation hardening task.

## task-7

Status: `done`

### Load

Consolidate lifecycle operation and fake-server test helpers introduced by this lane. Reuse shared acknowledgement/output-active builders, shared request fixture helpers, and grouped fake OBS request handlers where they reduce repeated code without hiding domain-specific schemas. Keep public operation names unchanged. Verification must include focused lifecycle tests, `pnpm lint`, and `pnpm typecheck` before any final cleanup.

## task-8

Status: `done`

### Load

Add opt-in real OBS smoke coverage for read-only lifecycle status plus mutation tests guarded by `OBS_INTEGRATION_MUTATION_TESTS=1`. Use `.env` through the existing integration-test loader only when `OBS_INTEGRATION_TESTS=1`; never load `.env` in unit tests. The smoke test should be skipped by default, avoid assuming recording/streaming can safely start, and document exactly which env flags are required for mutation checks.
