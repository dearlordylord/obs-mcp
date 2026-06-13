# Ralph Lane inputs-media

Branch: `ralph/inputs-media`

## Tasks

- [x] `task-1` Add core input mute and volume controls
- [x] `task-2` Add input volume controls
- [x] `task-3` Add input balance and monitor controls
- [x] `task-4` Add input audio sync offset controls
- [x] `task-5` Add compact media input status
- [x] `task-6` Add media cursor controls
- [x] `task-7` Add media action trigger controls
- [x] `task-8` Harden input/media validation and fixtures

## task-1

Status: `done`

### Load

Add core input mute controls: `get_input_mute`, `set_input_mute`, and `toggle_input_mute` from the corresponding official requests. Reuse the existing input discovery module boundaries and input locator schema; require exactly one of `inputName` or `inputUuid` for every targeted input tool. Add schema tests for locator reuse, fake OBS websocket tests for every request, OBS failure mapping coverage, capability-gated unavailable tests, disabled inputs toolset tests, and MCP handler tests. Non-goals: no volume, balance, sync offset, audio tracks, monitor type, deinterlace, Object-shaped settings, media input controls, screenshots, or events. Verification: run focused input mute tests first, then `pnpm check-all`; real OBS mutations remain opt-in.

## task-2

Status: `done`

### Load

Add `get_input_volume` and `set_input_volume`. For `set_input_volume`, require exactly one of `inputVolumeMul` or `inputVolumeDb`; reject both and reject neither. Use official numeric restrictions where documented and keep outputs structured. Add schema tests for volume one-of rules, fake OBS websocket tests, OBS failure mapping coverage, capability-gated unavailable tests, disabled inputs toolset tests, and MCP handler tests. Non-goals: no balance, sync offset, audio tracks, monitor type, deinterlace, Object-shaped settings, media input controls, screenshots, or events.

## task-3

Status: `done`

### Load

Add advanced primitive input audio controls: `get_input_audio_balance`, `set_input_audio_balance`, `get_input_audio_monitor_type`, and `set_input_audio_monitor_type`. Reuse the input locator schema and existing input operation/test patterns. Use official monitor type values and numeric restrictions for balance where documented. Add schema tests for locator reuse, monitor-type validation, and balance bounds; fake OBS websocket tests for every request; OBS failure mapping coverage; capability-gated unavailable tests; disabled inputs toolset tests; and MCP handler tests. Non-goals: no sync offset, audio tracks, deinterlace, Object-shaped settings, properties buttons, input lifecycle mutations, media controls, screenshots, or events.

## task-4

Status: `done`

### Load

Add `get_input_audio_sync_offset` and `set_input_audio_sync_offset`. Reuse the input locator schema and model sync offset as a signed integer because OBS explicitly allows negative offsets. Add schema tests for negative, zero, and positive offsets, fake OBS websocket tests, capability-gated unavailable tests, disabled inputs toolset tests, and OBS error metadata coverage. Non-goals: no audio tracks Object surface, no settings Object surface, no media controls.

## task-5

Status: `done`

### Load

Add `get_media_input_status`. Reuse the input locator schema and require exactly one of `inputName` or `inputUuid`. Use official media state enum values and return normalized status/cursor data. The media status output schema must allow `mediaDuration` and `mediaCursor` to be nullable because OBS documents `null` for those fields when media is not playing. Add fake OBS websocket tests, schema tests for nullable status fields, MCP handler tests, OBS failure mapping coverage, capability-gated unavailable tests, and disabled inputs/media behavior where applicable.

## task-6

Status: `done`

### Load

Add media cursor mutations: `set_media_input_cursor` and `offset_media_input_cursor`. Reuse the input locator schema and official request fields. Document that OBS does not perform cursor bounds checking; the MCP layer should validate numeric shape but must not invent duration-based bounds unless a previous status response is explicitly available in the same operation. Add schema tests for cursor arguments, fake OBS websocket tests, capability-gated unavailable tests, and MCP handler structured-output tests. Non-goals: no playlist/file-setting behavior, no media source creation, no local file access.

## task-7

Status: `done`

### Load

Add `trigger_media_input_action`. Use the official `ObsMediaInputAction` enum values and expose an LLM-readable enum schema. Add schema tests for valid and invalid actions, fake OBS websocket success/failure tests, capability gating, disabled inputs toolset behavior, and OBS error metadata coverage. Non-goals: no media source creation, no input settings objects, no events.

## task-8

Status: `done`

### Load

After tasks 1-7 land, consolidate input/media test fixtures and table-driven validation. Shared fixtures should cover input locator one-of behavior, available-request capability gating, fake clients, and disabled toolset assertions. Keep audio tracks and Object-shaped input settings explicitly deferred in docs/tests so Ralph does not accidentally widen the surface through an untyped Object passthrough. Verification: run focused input/media tests, `pnpm lint`, `pnpm typecheck`, then `pnpm check-all`.

### Deferred

- Input audio tracks and Object-shaped input settings remain out of scope for this lane until they have typed Effect Schema boundaries and dedicated operation/test coverage. They must not be exposed as raw OBS passthrough tools.
