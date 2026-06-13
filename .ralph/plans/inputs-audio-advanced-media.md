# Ralph Lane inputs-audio-advanced-media

Branch: `ralph/inputs-audio-advanced-media`

## Tasks

- [ ] `task-1` Add advanced input audio controls
- [ ] `task-2` Add media input controls

## task-1

Status: `todo`

### Load

Add advanced primitive input audio controls after `inputs-discovery-audio-core` lands: `get_input_audio_balance`, `set_input_audio_balance`, `get_input_audio_monitor_type`, and `set_input_audio_monitor_type`. Reuse the core input locator schema and require exactly one of `inputName` or `inputUuid` for every targeted input tool. Use official monitor type values and numeric restrictions for balance where documented. Add schema tests for locator reuse and monitor-type validation, fake OBS websocket tests for every request, OBS failure mapping coverage, capability-gated unavailable tests, disabled toolset tests where applicable, and MCP handler tests. Non-goals: no sync offset, audio tracks, deinterlace, Object-shaped settings, properties buttons, input lifecycle mutations, media controls, screenshots, or events. Verification: run focused advanced input audio tests first, then `pnpm check-all`; real OBS mutations remain opt-in.

## task-2

Status: `todo`

### Load

Add compact media input controls: `get_media_input_status`, `set_media_input_cursor`, `offset_media_input_cursor`, and `trigger_media_input_action`. Reuse the core input locator schema and require exactly one of `inputName` or `inputUuid`. Use official media input action values and return normalized status/cursor data. The media status output schema must allow `mediaDuration` and `mediaCursor` to be nullable because OBS documents `null` for those fields when media is not playing. Add fake OBS websocket tests for every request, schema tests for action and cursor arguments, nullable status fields, MCP handler tests, OBS failure mapping coverage, capability-gated unavailable tests, and disabled media/input toolset tests where applicable. Non-goals: no media source creation, no playlist/file settings, no input settings objects, no event subscriptions. Verification: run focused media input tests first, then `pnpm check-all`; mutation integration tests remain opt-in.
