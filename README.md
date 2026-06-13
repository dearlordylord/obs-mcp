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
- `OBS_EVENT_BUFFER_CAPACITY`: optional maximum number of recent safe OBS events retained for `get_recent_obs_events`. Defaults to the built-in bounded buffer size.
- `TOOLSETS`: optional comma-separated category filter. Available categories are `events`, `general`, `inputs`, `outputs`, `record`, `scenes`, and `stream`; the default enables `general`, `record`, `scenes`, and `inputs`.
- `OBS_INTEGRATION_TESTS`: set to `1` to run real OBS websocket integration tests.
- `OBS_INTEGRATION_MUTATION_TESTS`: set to `1` to enable integration tests that send state-changing OBS requests.

The server logs diagnostics to stderr. Stdout is reserved for MCP JSON-RPC.

Set `TOOLSETS=events` to expose `get_recent_obs_events`, a bounded recent-event snapshot. It returns typed payloads for safe low-volume OBS events, while vendor/custom and high-volume events remain excluded from the default safe event policy.

## Tools

<!-- tools:start -->
- `get_obs_context`
- `get_version`
- `get_obs_stats`
- `get_recent_obs_events`
- `list_scenes`
- `get_current_scene`
- `set_current_scene`
- `list_scene_items`
- `list_group_scene_items`
- `get_scene_item_id`
- `get_scene_item_source`
- `get_scene_item_enabled`
- `set_scene_item_enabled`
- `get_scene_item_locked`
- `set_scene_item_locked`
- `get_scene_item_index`
- `get_scene_item_blend_mode`
- `set_scene_item_index`
- `set_scene_item_blend_mode`
- `get_source_active`
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
- `get_media_input_status`
- `set_media_input_cursor`
- `offset_media_input_cursor`
- `trigger_media_input_action`
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
