# Ralph Lane inputs-audio-media

Branch: `ralph/inputs-audio-media`

## Tasks

- [ ] `task-1` Add input discovery and audio controls
- [ ] `task-2` Add media input controls

## task-1

Status: `todo`

### Load

Add input discovery and primitive audio controls: `list_inputs`, `list_input_kinds`, `get_special_inputs`, `get_input_mute`, `set_input_mute`, `toggle_input_mute`, `get_input_volume`, `set_input_volume`, `get_input_audio_balance`, `set_input_audio_balance`, `get_input_audio_monitor_type`, and `set_input_audio_monitor_type`. First inspect the current schema, operation, registry, request descriptor, fake OBS server, and MCP tests for scenes/general. Use official request fields for `inputName`/`inputUuid` and establish a reusable input locator convention without accepting arbitrary input settings objects. Preserve structured output, capability gating, and OBS error metadata. Add tests for schema validation, name-vs-UUID parameter handling, bounded numeric volume/balance behavior where the protocol documents constraints, OBS request failures, and disabled toolset/capability behavior. Non-goals: no create/remove/set input settings, no properties button/list property items, no screenshots, no event volume meters. Verification: run focused input tests, then `pnpm check-all`; run real OBS integration only for read-only discovery unless the environment explicitly opts into mutations.

## task-2

Status: `todo`

### Load

Add the compact media input controls: `get_media_input_status`, `set_media_input_cursor`, `offset_media_input_cursor`, and `trigger_media_input_action`. First inspect the input locator created in task-1 and reuse it rather than adding a second identity model. Use official enum/string values for media input actions and return normalized status/cursor data. Add fake OBS websocket tests for each request, schema tests for action/cursor arguments, MCP handler tests, and OBS failure mapping coverage. Non-goals: no media source creation, no playlist/file settings, no event subscriptions. Verification: run focused media input tests, then `pnpm check-all`; mutation integration tests should remain opt-in.
