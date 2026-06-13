# Ralph Lane outputs-replay-virtualcam

Branch: `ralph/outputs-replay-virtualcam`

## Tasks

- [ ] `task-1` Add virtual camera controls
- [ ] `task-2` Add replay buffer controls

## task-1

Status: `todo`

### Load

Add virtual camera tools: `get_virtual_cam_status`, `start_virtual_cam`, `stop_virtual_cam`, and `toggle_virtual_cam`. First inspect the status/control patterns from scenes/general and any record/stream implementation if already landed. Use official response fields and return a compact structured status/switch result. Add request descriptors, Effect Schema types, operations, registry metadata, fake websocket tests, MCP handler tests, and OBS error mapping coverage. Non-goals: no generic output tools, no output settings objects, no screenshots, no events. Verification: run focused virtual camera tests, then `pnpm check-all`; real OBS mutation integration remains opt-in.

## task-2

Status: `todo`

### Load

Add replay buffer tools: `get_replay_buffer_status`, `start_replay_buffer`, `stop_replay_buffer`, `toggle_replay_buffer`, `save_replay_buffer`, and `get_last_replay_buffer_replay`. First inspect official response fields and avoid inventing filesystem semantics beyond OBS returning the last replay path. Add explicit structured outputs, capability gating, OBS failure metadata, fake websocket coverage for every request, and MCP handler tests for status and save behavior. Non-goals: no generic output APIs, no record directory changes, no arbitrary file writes, no screenshots. Verification: run focused replay buffer tests, then `pnpm check-all`; real OBS integration should be opt-in because these are output mutations.
