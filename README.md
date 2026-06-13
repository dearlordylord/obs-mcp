# OBS MCP

`@firfi/obs-mcp` is a stdio-only Model Context Protocol server for OBS Studio.

This first slice implements read-only OBS status plus the scenes exemplar vertical. It proves the repo pattern for future OBS areas with strict schemas, a small MCP registry, a scoped obs-websocket protocol client, and fake OBS websocket tests.

## Install

```sh
pnpm install
pnpm build
```

The package binary is `obs-mcp`.

## Configuration

Environment variables:

- `OBS_WEBSOCKET_URL`: OBS websocket URL. Defaults to `ws://localhost:4455`. Bare `host:port` values are normalized to `ws://host:port`.
- `OBS_WEBSOCKET_PASSWORD`: optional OBS websocket password.
- `OBS_WEBSOCKET_CONNECTION_TIMEOUT`: connection and request timeout in milliseconds. Defaults to `30000`.
- `TOOLSETS`: optional comma-separated category filter. Available categories are `canvases`, `config`, `events`, `general`, `inputs`, `outputs`, `record`, `scenes`, `stream`, `transitions`, and `ui`; the default enables `general`, `record`, `scenes`, and `inputs`.
- `OBS_EVENT_BUFFER_CAPACITY`: optional maximum number of recent safe OBS events retained for `get_recent_obs_events`. Defaults to the built-in bounded buffer size.
- `TOOLSETS`: optional comma-separated category filter. Available categories are `admin_raw`, `batch`, `events`, `general`, `inputs`, `outputs`, `record`, `scenes`, `stream`, and `vendor`; the default enables `general`, `record`, `scenes`, and `inputs`.
- `TOOLSETS`: optional comma-separated category filter. Available categories are `events`, `filters`, `general`, `inputs`, `outputs`, `record`, `scenes`, `screenshots`, and `stream`; the default enables `general`, `record`, `scenes`, and `inputs`.
- `OBS_MCP_SCREENSHOT_OUTPUT_DIR`: optional existing directory allowlist for `save_source_screenshot`. Screenshot save tools are disabled unless the `screenshots` toolset is enabled, and saves require a simple filename, not a path. Directories are never created implicitly.
- `OBS_INTEGRATION_TESTS`: set to `1` to run real OBS websocket integration tests.
- `OBS_INTEGRATION_MUTATION_TESTS`: set to `1` to enable integration tests that send state-changing OBS requests.

The server logs diagnostics to stderr. Stdout is reserved for MCP JSON-RPC.

Set `TOOLSETS=events` to expose `get_recent_obs_events`, a bounded recent-event snapshot. It returns typed payloads for safe low-volume OBS events, while vendor/custom and high-volume events remain excluded from the default safe event policy.

Set `TOOLSETS=admin_raw` to expose OBS websocket persistent data tools. This is disabled by default; `set_persistent_data` accepts only JSON-safe slot values and does not echo the value in its response.

Set `TOOLSETS=vendor` to expose OBS websocket vendor/custom event tools. This is disabled by default; plugin-defined vendor requests and custom event broadcasts carry security and provenance risk, accept only JSON-safe object payloads, and remain excluded from `get_recent_obs_events`.

Set `TOOLSETS=batch` to expose `run_obs_request_batch`, a schema-limited OBS request batch tool. `Sleep` is supported only as a batch item with official serial execution semantics; there is no standalone sleep tool or arbitrary raw batch tool.

By default, raw/vendor/custom, persistent-data, high-volume event, and batch surfaces are not exposed. Diagnostics are written to stderr; stdout is reserved for MCP JSON-RPC.
## Payload and Settings Policy

Input settings, filter settings, and screenshots use explicit MCP boundary schemas instead of raw OBS Object passthroughs. Read-only settings tools return stable setting metadata and mark raw settings as deferred. Mutation tools accept only allowlisted setting fields that have a narrow schema. Screenshot reads return bounded base64 data with MIME and byte metadata, while screenshot saves require the `screenshots` toolset plus an existing `OBS_MCP_SCREENSHOT_OUTPUT_DIR` allowlist.

## Tools

Tools in the `config` toolset can read or change global OBS configuration such as profiles, scene collections, video settings, record directories, and stream service settings. They are opt-in via `TOOLSETS=config`.

Tools in the `ui` toolset that open dialogs or projectors are local OBS UI side effects. They are opt-in via `TOOLSETS=ui` and do not capture screenshots, manage OS windows, or perform filesystem actions.

<!-- tools:start -->
- `run_obs_request_batch`
- `get_obs_context`
- `get_version`
- `get_obs_stats`
- `list_hotkeys`
- `trigger_hotkey_by_name`
- `trigger_hotkey_by_key_sequence`
- `get_recent_obs_events`
- `list_canvases`
- `list_profiles`
- `list_scene_collections`
- `get_profile_parameter`
- `get_record_directory`
- `set_record_directory`
- `get_video_settings`
- `set_video_settings`
- `get_stream_service_settings`
- `set_stream_service_settings`
- `set_current_profile`
- `create_profile`
- `remove_profile`
- `set_current_scene_collection`
- `create_scene_collection`
- `set_profile_parameter`
- `list_scenes`
- `list_groups`
- `get_current_scene`
- `get_current_preview_scene`
- `set_current_scene`
- `set_current_preview_scene`
- `create_scene`
- `remove_scene`
- `set_scene_name`
- `get_scene_transition_override`
- `set_scene_transition_override`
- `list_scene_items`
- `list_group_scene_items`
- `create_scene_item`
- `remove_scene_item`
- `duplicate_scene_item`
- `get_scene_item_id`
- `get_scene_item_source`
- `get_scene_item_transform`
- `set_scene_item_transform`
- `get_scene_item_enabled`
- `set_scene_item_enabled`
- `get_scene_item_locked`
- `set_scene_item_locked`
- `get_scene_item_index`
- `get_scene_item_blend_mode`
- `set_scene_item_index`
- `set_scene_item_blend_mode`
- `get_source_active`
- `get_source_screenshot`
- `save_source_screenshot`
- `list_source_filter_kinds`
- `list_source_filters`
- `get_source_filter_default_settings`
- `get_source_filter`
- `create_source_filter`
- `remove_source_filter`
- `set_source_filter_settings`
- `set_source_filter_enabled`
- `set_source_filter_index`
- `set_source_filter_name`
- `list_inputs`
- `list_input_kinds`
- `get_special_inputs`
- `get_input_mute`
- `set_input_mute`
- `toggle_input_mute`
- `get_input_volume`
- `set_input_volume`
- `get_input_audio_balance`
- `set_input_audio_balance`
- `get_input_audio_monitor_type`
- `set_input_audio_monitor_type`
- `get_input_audio_sync_offset`
- `set_input_audio_sync_offset`
- `get_input_audio_tracks`
- `set_input_audio_tracks`
- `get_input_deinterlace_mode`
- `set_input_deinterlace_mode`
- `get_input_deinterlace_field_order`
- `set_input_deinterlace_field_order`
- `get_input_default_settings`
- `get_input_settings`
- `get_input_properties_list_property_items`
- `set_input_settings`
- `press_input_properties_button`
- `create_input`
- `remove_input`
- `set_input_name`
- `get_media_input_status`
- `set_media_input_cursor`
- `offset_media_input_cursor`
- `trigger_media_input_action`
- `list_outputs`
- `get_output_status`
- `get_output_settings`
- `set_output_settings`
- `start_output`
- `stop_output`
- `toggle_output`
- `get_virtual_cam_status`
- `start_virtual_cam`
- `stop_virtual_cam`
- `toggle_virtual_cam`
- `get_replay_buffer_status`
- `start_replay_buffer`
- `stop_replay_buffer`
- `toggle_replay_buffer`
- `save_replay_buffer`
- `get_last_replay_buffer_replay`
- `get_record_status`
- `start_record`
- `stop_record`
- `toggle_record`
- `split_record_file`
- `create_record_chapter`
- `pause_record`
- `resume_record`
- `toggle_record_pause`
- `get_stream_status`
- `start_stream`
- `stop_stream`
- `toggle_stream`
- `send_stream_caption`
- `list_transition_kinds`
- `list_scene_transitions`
- `get_current_scene_transition`
- `get_current_scene_transition_cursor`
- `set_current_scene_transition`
- `set_current_scene_transition_duration`
- `set_current_scene_transition_settings`
- `trigger_studio_mode_transition`
- `set_tbar_position`
- `get_studio_mode_enabled`
- `open_input_properties_dialog`
- `open_input_filters_dialog`
- `open_input_interact_dialog`
- `list_monitors`
- `open_video_mix_projector`
- `open_source_projector`
- `get_persistent_data`
- `set_persistent_data`
- `call_vendor_request`
- `broadcast_custom_event`
<!-- tools:end -->

Tool results use MCP structured content rather than textified JSON.

## Manual Stdio Smoke Test

Start OBS Studio with obs-websocket enabled, then run:

```sh
OBS_WEBSOCKET_URL=ws://localhost:4455 pnpm start
```

Send MCP JSON-RPC on stdin from an MCP client. For local development without real OBS, the automated test harness starts a fake OBS websocket server.

## Verify

```sh
pnpm check-all
```

## Real OBS Integration

Local `.env` is supported for integration tests and is ignored by git. The checked-in development template uses `host.docker.internal`, which resolves from this workspace.
Use `.env.example` as the non-secret template; keep real passwords only in local `.env`.

Read-only integration tests:

```sh
pnpm test:integration
```

Mutation tests are separate because they send state-changing OBS requests. They require both
`OBS_INTEGRATION_TESTS=1` and `OBS_INTEGRATION_MUTATION_TESTS=1`; `pnpm test:integration` sets
`OBS_INTEGRATION_TESTS=1` for you. Lifecycle mutation smoke checks do not start recording or streaming.

```sh
OBS_INTEGRATION_MUTATION_TESTS=1 pnpm test:integration
```

Default `pnpm test` remains fake-harness only and does not require OBS.
