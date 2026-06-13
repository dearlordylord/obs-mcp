# Ralph Lane inputs-media

Branch: `ralph/inputs-media`

## Completed baseline

The merged foundation already includes input discovery (`list_inputs`, `list_input_kinds`, `get_special_inputs`) and a reusable input locator schema requiring exactly one of `inputName` or `inputUuid`. Treat those as established patterns, not tasks to redo.

## Tasks

- [ ] `task-1` Add core input mute and volume controls
- [ ] `task-2` Add advanced input audio controls
- [ ] `task-3` Add media input controls

## task-1

Status: `todo`

### Load

Add core input audio controls: `get_input_mute`, `set_input_mute`, `toggle_input_mute`, `get_input_volume`, and `set_input_volume` from the corresponding official requests. Reuse the existing input discovery module boundaries and input locator schema; require exactly one of `inputName` or `inputUuid` for every targeted input tool. For `set_input_volume`, require exactly one of `inputVolumeMul` or `inputVolumeDb`; reject both and reject neither. Use official numeric restrictions where documented and keep outputs structured. Add schema tests for locator reuse and volume one-of rules, fake OBS websocket tests for every request, OBS failure mapping coverage, capability-gated unavailable tests, disabled inputs toolset tests, and MCP handler tests. Non-goals: no balance, sync offset, audio tracks, monitor type, deinterlace, Object-shaped settings, media input controls, screenshots, or events. Verification: run focused input audio core tests first, then `pnpm check-all`; real OBS mutations remain opt-in.

## task-2

Status: `todo`

### Load

Add advanced primitive input audio controls: `get_input_audio_balance`, `set_input_audio_balance`, `get_input_audio_monitor_type`, and `set_input_audio_monitor_type`. Reuse the input locator schema and existing input operation/test patterns. Use official monitor type values and numeric restrictions for balance where documented. Add schema tests for locator reuse, monitor-type validation, and balance bounds; fake OBS websocket tests for every request; OBS failure mapping coverage; capability-gated unavailable tests; disabled inputs toolset tests; and MCP handler tests. Non-goals: no sync offset, audio tracks, deinterlace, Object-shaped settings, properties buttons, input lifecycle mutations, media controls, screenshots, or events. Verification: run focused advanced input audio tests first, then `pnpm check-all`; real OBS mutations remain opt-in.

## task-3

Status: `todo`

### Load

Add compact media input controls: `get_media_input_status`, `set_media_input_cursor`, `offset_media_input_cursor`, and `trigger_media_input_action`. Reuse the input locator schema and require exactly one of `inputName` or `inputUuid`. Use official media input action values and return normalized status/cursor data. The media status output schema must allow `mediaDuration` and `mediaCursor` to be nullable because OBS documents `null` for those fields when media is not playing. Add fake OBS websocket tests for every request, schema tests for action and cursor arguments, nullable status fields, MCP handler tests, OBS failure mapping coverage, capability-gated unavailable tests, and disabled inputs/media behavior where applicable. Non-goals: no media source creation, no playlist/file settings, no input settings objects, no event subscriptions. Verification: run focused media input tests first, then `pnpm check-all`; mutation integration tests remain opt-in.
