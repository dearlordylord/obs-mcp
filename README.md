# @firfi/obs-mcp

[![npm](https://img.shields.io/npm/v/@firfi/obs-mcp)](https://www.npmjs.com/package/@firfi/obs-mcp)
[![npm downloads](https://img.shields.io/npm/dm/@firfi/obs-mcp)](https://www.npmjs.com/package/@firfi/obs-mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![MCP](https://img.shields.io/badge/MCP-compatible-blue)](https://modelcontextprotocol.io)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue.svg)](https://www.typescriptlang.org/)
[![MCP Server](https://badge.mcpx.dev?type=server&features=tools)](https://github.com/dearlordylord/obs-mcp)

MCP server for OBS Studio automation and read-only resources through obs-websocket.

## Installation

The standard configuration works with most MCP clients:

```json
{
  "mcpServers": {
    "obs": {
      "command": "npx",
      "args": ["-y", "@firfi/obs-mcp@latest"],
      "env": {
        "OBS_WEBSOCKET_URL": "ws://localhost:4455"
      }
    }
  }
}
```

`OBS_WEBSOCKET_URL` can be omitted when OBS is available at `ws://localhost:4455`. Add `OBS_WEBSOCKET_PASSWORD` only when obs-websocket authentication is enabled.

<details>
<summary>Codex</summary>

Use Codex's MCP manager:

```bash
codex mcp add obs \
  --env OBS_WEBSOCKET_URL=ws://localhost:4455 \
  -- npx -y @firfi/obs-mcp@latest
```

With obs-websocket authentication enabled:

```bash
codex mcp add obs \
  --env OBS_WEBSOCKET_URL=ws://localhost:4455 \
  --env OBS_WEBSOCKET_PASSWORD=yourpassword \
  -- npx -y @firfi/obs-mcp@latest
```

Or add it directly to `~/.codex/config.toml`:

```toml
[mcp_servers.obs]
command = "npx"
args = ["-y", "@firfi/obs-mcp@latest"]

[mcp_servers.obs.env]
OBS_WEBSOCKET_URL = "ws://localhost:4455"
```

</details>

<details>
<summary>Claude Code</summary>

```bash
claude mcp add obs \
  -e OBS_WEBSOCKET_URL=ws://localhost:4455 \
  -- npx -y @firfi/obs-mcp@latest
```

If OBS requires a websocket password, add `-e OBS_WEBSOCKET_PASSWORD=yourpassword`.

</details>

<details>
<summary>Claude Desktop</summary>

Add the standard config to your `claude_desktop_config.json`:

- macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Windows: `%APPDATA%\Claude\claude_desktop_config.json`

</details>

<details>
<summary>VS Code</summary>

Add with Command Palette -> "MCP: Add Server", or put this in a VS Code MCP config such as `.vscode/mcp.json`. Do not commit workspace config files that contain credentials.

```json
{
  "servers": {
    "obs": {
      "command": "npx",
      "args": ["-y", "@firfi/obs-mcp@latest"],
      "env": {
        "OBS_WEBSOCKET_URL": "ws://localhost:4455"
      }
    }
  }
}
```

</details>

<details>
<summary>Cursor</summary>

Add the standard config to `~/.cursor/mcp.json`, or via Settings -> Tools & Integrations -> New MCP Server.

</details>

<details>
<summary>Windsurf</summary>

Add the standard config to your Windsurf MCP configuration file.

</details>

<details>
<summary>OpenCode</summary>

Open the global configuration file (`~/.config/opencode/opencode.json`) and merge this entry into your config:

```json
{
  "mcp": {
    "obs": {
      "type": "local",
      "command": ["npx", "-y", "@firfi/obs-mcp@latest"],
      "environment": {
        "OBS_WEBSOCKET_URL": "ws://localhost:4455"
      }
    }
  }
}
```

</details>

## OBS Setup

OBS must have its websocket server enabled:

1. Open OBS Studio.
2. Go to Tools -> WebSocket Server Settings.
3. Enable the websocket server.
4. Keep the default port `4455`, or set `OBS_WEBSOCKET_URL` to the port you choose.
5. If you enable authentication, set `OBS_WEBSOCKET_PASSWORD` in your MCP client config.

## Updating

The `@latest` tag asks the package runner for the newest version. Some MCP clients keep server processes or resolved installs alive, so restart or re-add the server when updating:

| Client | How to update |
|--------|---------------|
| **Codex** | `codex mcp remove obs` then re-add with the install command above. If your password has shell-sensitive characters, edit `~/.codex/config.toml` directly instead. |
| **Claude Code** | `claude mcp remove obs` then re-add with the install command above. |
| **Claude Desktop** | Restart the app. It runs `npx` on startup. |
| **VS Code / Cursor** | Restart the MCP server from the command palette/configured client or reload the window. |
| **OpenCode** | Restart OpenCode or start a new session after config changes. |
| **npx manual run** | `npx -y @firfi/obs-mcp@latest`; the `-y` flag auto-confirms install prompts. |

## HTTP Transport

By default, the server uses stdio transport. For Streamable HTTP:

```bash
OBS_WEBSOCKET_URL=ws://localhost:4455 \
MCP_TRANSPORT=http \
npx -y @firfi/obs-mcp@latest
```

Server listens on `http://127.0.0.1:3000/mcp` by default.

Configure host and port with `MCP_HTTP_HOST` and `MCP_HTTP_PORT`:

```bash
MCP_TRANSPORT=http MCP_HTTP_PORT=8080 MCP_HTTP_HOST=127.0.0.1 npx -y @firfi/obs-mcp@latest
```

For exposed HTTP deployments, require a bearer token:

```bash
MCP_TRANSPORT=http \
MCP_HTTP_AUTH_TOKEN="$(openssl rand -hex 32)" \
npx -y @firfi/obs-mcp@latest
```

HTTP clients must then send:

```http
Authorization: Bearer <MCP_HTTP_AUTH_TOKEN>
```

`MCP_HTTP_AUTH_TOKEN` protects only the MCP HTTP `/mcp` endpoint. It is unrelated to `OBS_WEBSOCKET_PASSWORD`, does not authenticate to OBS, and is not used by stdio deployments.

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `OBS_WEBSOCKET_URL` | No | OBS websocket URL. Defaults to `ws://localhost:4455`. Bare `host:port` values are normalized to `ws://host:port`. |
| `OBS_WEBSOCKET_PASSWORD` | Auth* | obs-websocket password. |
| `OBS_WEBSOCKET_CONNECTION_TIMEOUT` | No | OBS connection and request timeout in milliseconds. Defaults to `30000`. |
| `MCP_TRANSPORT` | No | Transport type: `stdio` (default) or `http`. |
| `MCP_HTTP_HOST` | No | HTTP bind host. Defaults to `127.0.0.1`. |
| `MCP_HTTP_PORT` | No | HTTP bind port. Defaults to `3000`. |
| `MCP_HTTP_AUTH_TOKEN` | No | Optional bearer token required by HTTP clients for `/mcp`. |
| `TOOLSETS` | No | Comma-separated tool categories to expose. Defaults to `general,record,scenes,inputs`. Use `all` to expose every supported category. |
| `OBS_EVENT_BUFFER_CAPACITY` | No | Maximum number of recent safe OBS events retained for `get_recent_obs_events`. |
| `OBS_MCP_SCREENSHOT_OUTPUT_DIR` | Screenshots* | Existing directory allowlist for `save_source_screenshot`. |

*Auth: Required only when obs-websocket authentication is enabled in OBS.

*Screenshots: Required only for screenshot save tools. Screenshot reads do not require a directory.

## Built-in Diagnostic Tools

`get_version` returns the current server version and latest npm version.

`get_obs_context` returns sanitized runtime/configuration context without connecting to OBS. It reports package version, transport, sanitized OBS websocket URL origin/host/protocol, timeout, enabled toolsets, and screenshot/event settings. Passwords, URL credentials, and other secret values are never returned.

## Toolsets and Safety Policy

By default, the server exposes `general`, `record`, `scenes`, and `inputs`. Additional OBS areas are available through `TOOLSETS`.

Use `TOOLSETS=all` when you want the full supported OBS surface. Use a comma-separated allowlist such as `TOOLSETS=general,scenes,inputs,events` when an MCP client should only see a narrower tool surface.

MCP resources are always enabled when the underlying OBS websocket requests are available. `TOOLSETS` controls tools only; it does not hide read-only resources.

Some categories are intentionally opt-in:

| Toolset | Why it is opt-in |
|---------|------------------|
| `admin_raw` | Reads and writes OBS websocket persistent data slots. Values are JSON-safe and write responses do not echo written values. |
| `batch` | Runs schema-limited OBS request batches. `Sleep` is supported only as an official batch item; there is no standalone sleep tool or arbitrary raw batch tool. |
| `config` | Reads and changes global OBS profile, scene collection, video, recording directory, and stream service settings. |
| `events` | Exposes bounded recent-event snapshots and typed confirmation tools for OBS workflows. Vendor/custom and high-volume events are excluded from the safe event policy. |
| `screenshots` | Allows source screenshot reads, and optionally saves screenshots under an explicit output directory allowlist. |
| `ui` | Opens local OBS dialogs/projectors and changes Studio Mode state. |
| `vendor` | Calls plugin-defined vendor requests and broadcasts custom events. Payloads must be JSON-safe objects. |

Diagnostics are written to stderr. Stdout is reserved for MCP JSON-RPC.

## Payload and Settings Policy

Input settings, filter settings, output settings, and screenshots use explicit MCP boundary schemas instead of raw OBS object passthroughs. Read-only settings tools return stable setting metadata and mark raw settings as deferred. Mutation tools accept only allowlisted setting fields that have narrow schemas. Screenshot reads return bounded base64 data with MIME and byte metadata, while screenshot saves require the `screenshots` toolset plus an existing `OBS_MCP_SCREENSHOT_OUTPUT_DIR` allowlist.

Tool results use MCP structured content rather than textified JSON. Relevant tool calls also include MCP resource links so clients can reread current state through the matching resource.

## Resources

Resources expose read-only OBS state as JSON. They are filtered by the request types OBS advertises during the websocket handshake, and can be subscribed to with standard MCP `resources/subscribe` update notifications. Update notifications are reread signals; they do not push OBS payloads.

Static resources:

| URI | Description |
|-----|-------------|
| `obs://state/current` | Aggregate OBS version, client capability, scene, output, recording, streaming, and transition state when available. |
| `obs://scenes` | Current program/preview scenes and ordered scene summaries. |
| `obs://inputs` | Current OBS input/source summaries. |
| `obs://recording` | Current recording output status. |
| `obs://streaming` | Current stream output status. |
| `obs://outputs` | Current OBS output summaries. |
| `obs://config` | Sanitized video, recording directory, stream service, profile, and scene collection configuration when available. |
| `obs://profiles` | Current profile and profile names. |
| `obs://scene-collections` | Current scene collection and scene collection names. |
| `obs://canvases` | OBS canvas inventory when supported by OBS. |
| `obs://transitions` | Transition inventory, current transition, cursor, and kinds when available. |
| `obs://hotkeys` | OBS hotkey names. |
| `obs://events/recent` | Recent safe OBS events retained by this server process. |
| `obs://screenshots/latest` | Latest screenshot metadata captured by this server process, or `null` before one is captured. |

Resource templates:

| Template | Description |
|----------|-------------|
| `obs://scenes/by-name/{sceneName}` | Scene summary, scene items, and transition override for a URL-encoded scene name. |
| `obs://inputs/by-name/{inputName}` | Input summary plus optional audio, settings, mute, and volume details for a URL-encoded input name. |
| `obs://outputs/by-name/{outputName}` | Output summary plus optional status and sanitized settings for a URL-encoded output name. |
| `obs://filters/{sourceName}` | Source filter list for a URL-encoded source name. |
| `obs://media/by-name/{inputName}` | Media input status and sanitized settings for a URL-encoded input name. |

<!-- tools:start -->
## Available Tools

<!-- AUTO-GENERATED from src/mcp/tools/ descriptions. Do not edit manually. Run `pnpm update-readme` to regenerate. -->

**`TOOLSETS` categories:** `batch`, `general`, `events`, `canvases`, `config`, `scenes`, `screenshots`, `filters`, `inputs`, `outputs`, `record`, `stream`, `transitions`, `ui`, `admin_raw`, `vendor`

### Batch

| Tool | Description |
|------|-------------|
| `run_obs_request_batch` | Run a schema-limited OBS request batch with optional batch-only Sleep items. Exposed only by the batch toolset; arbitrary raw request batches and standalone sleep are not exposed. |

### General

| Tool | Description |
|------|-------------|
| `get_obs_context` | Return sanitized OBS MCP runtime context without secrets. |
| `get_version` | Return OBS Studio, obs-websocket, negotiated RPC, request, image, and platform capability information. |
| `get_obs_stats` | Return current OBS, obs-websocket, render, output, CPU, memory, and disk statistics. |
| `list_hotkeys` | Return OBS hotkey names. OBS hotkeys are best-effort; dedicated OBS requests are usually more reliable when available. |
| `trigger_hotkey_by_name` | Trigger an OBS hotkey by name. OBS hotkeys are best-effort; prefer dedicated OBS requests for reliable actions when available. |
| `trigger_hotkey_by_key_sequence` | Trigger an OBS hotkey by bounded key sequence. OBS hotkeys are best-effort; prefer dedicated OBS requests for reliable actions when available. |

### Events

| Tool | Description |
|------|-------------|
| `get_recent_obs_events` | Return recent buffered safe OBS events with optional category filters and explicit ordering. |
| `confirm_obs_output_lifecycle` | Wait for a typed OBS output lifecycle outcome after a known event sequence cursor. |
| `confirm_obs_scene_graph_change` | Wait for a typed OBS scene graph or scene-item outcome after a known event sequence cursor. |
| `confirm_obs_source_filter_change` | Wait for a typed OBS source-filter workflow outcome after a known event sequence cursor. |
| `confirm_obs_media_input_workflow` | Wait for a typed OBS media input playback or action outcome after a known event sequence cursor. |
| `confirm_obs_transition_workflow` | Wait for a typed OBS transition configuration or lifecycle outcome after a known event sequence cursor. |
| `confirm_obs_input_audio_change` | Wait for a typed OBS input audio control outcome after a known event sequence cursor. |
| `confirm_obs_input_identity_change` | Wait for a typed OBS input removal or rename event after a known event sequence cursor. |
| `confirm_obs_canvas_inventory_change` | Wait for a typed OBS canvas creation, removal, or rename event after a known event sequence cursor. |
| `confirm_obs_studio_mode_state_change` | Wait for a typed OBS studio-mode enabled or disabled event after a known event sequence cursor. |
| `confirm_obs_config_workflow` | Wait for a typed OBS profile or scene-collection config outcome after a known event sequence cursor. |

### Canvases

| Tool | Description |
|------|-------------|
| `list_canvases` | Return stable OBS canvas summaries without exposing raw canvas objects. |

### Configuration

| Tool | Description |
|------|-------------|
| `list_profiles` | Return current OBS profile name and all available profile names. |
| `list_scene_collections` | Return current OBS scene collection name and all available scene collection names. |
| `get_profile_parameter` | Return a current OBS profile parameter value and default value by category and name. |
| `get_record_directory` | Return OBS' configured recording directory as an opaque string without filesystem access. |
| `set_record_directory` | Global OBS state change: set OBS' recording directory as an opaque string without local filesystem checks. |
| `get_video_settings` | Return OBS base/output canvas dimensions and FPS numerator/denominator. |
| `set_video_settings` | Global OBS state change: set OBS video dimensions and FPS; base, output, and FPS fields must be paired. |
| `get_stream_service_settings` | Return OBS stream destination settings with stream keys redacted; rtmp_custom reports keyConfigured only. |
| `set_stream_service_settings` | Global OBS state change: set stream destination settings; rtmp_custom accepts server/key but responses redact keys. |
| `set_current_profile` | Global OBS state change: switch the current OBS profile to a non-empty existing profile name. |
| `create_profile` | Global OBS state change: create a non-empty OBS profile name and switch OBS to that profile. |
| `remove_profile` | Global OBS state change: remove a non-empty OBS profile name; OBS may switch profiles first. |
| `set_current_scene_collection` | Global OBS state change: switch the current OBS scene collection to a non-empty existing name. |
| `create_scene_collection` | Global OBS state change: create a non-empty OBS scene collection name and switch OBS to it. |
| `set_profile_parameter` | Global OBS state change: set or delete a current profile parameter by category and name. |

### Scenes

| Tool | Description |
|------|-------------|
| `list_scenes` | Return current program and preview scenes plus ordered scene summaries. |
| `list_groups` | Return OBS group names. OBS groups are represented as specialized scenes. |
| `get_current_scene` | Return the current OBS program scene name and UUID when OBS provides one. |
| `get_current_preview_scene` | Return the current OBS Studio Mode preview scene name and UUID when preview is available. |
| `set_current_scene` | Switch the current OBS program scene by scene name. |
| `set_current_preview_scene` | Set the OBS Studio Mode preview scene by scene name or UUID. OBS returns an error when preview is unavailable. |
| `create_scene` | Create an empty OBS scene by name and return its UUID when OBS provides one. |
| `remove_scene` | Remove an OBS scene selected by name or UUID. |
| `set_scene_name` | Rename an OBS scene selected by name or UUID. |
| `get_scene_transition_override` | Return the per-scene transition override name and duration, or nulls when no override is set. |
| `set_scene_transition_override` | Set, update, or clear a per-scene transition override name and duration. |
| `list_scene_items` | Return ordered scene item summaries for a scene selected by name or UUID. |
| `list_group_scene_items` | Return ordered scene item summaries for a group selected by name or UUID. |
| `create_scene_item` | Add an existing source to a scene and return the new scene item ID when OBS provides one. |
| `remove_scene_item` | Remove a scene item from a scene by scene item ID. |
| `duplicate_scene_item` | Duplicate a scene item into the same scene or a destination scene. |
| `get_scene_item_id` | Find a source by name in a scene or group and return its numeric scene item ID. |
| `get_scene_item_source` | Return the source name and UUID associated with a scene item ID. |
| `get_scene_item_transform` | Return explicit OBS transform and crop fields for a scene item. |
| `set_scene_item_transform` | Partially update explicit OBS transform and crop fields for a scene item. |
| `get_scene_item_enabled` | Return whether a scene item is enabled. |
| `set_scene_item_enabled` | Set whether a scene item is enabled. |
| `get_scene_item_locked` | Return whether a scene item is locked. |
| `set_scene_item_locked` | Set whether a scene item is locked. |
| `get_scene_item_index` | Return a scene item's index position in its scene. |
| `get_scene_item_blend_mode` | Return a scene item's OBS blend mode. |
| `set_scene_item_index` | Set a scene item's index position in its scene. |
| `set_scene_item_blend_mode` | Set a scene item's OBS blend mode. |
| `get_source_active` | Return whether a source is active in program and showing in OBS UI. |

### Screenshots

| Tool | Description |
|------|-------------|
| `get_source_screenshot` | Return bounded base64 image data for an OBS source screenshot. |
| `save_source_screenshot` | Save an OBS source screenshot under OBS_MCP_SCREENSHOT_OUTPUT_DIR using a safe filename. |

### Filters

| Tool | Description |
|------|-------------|
| `list_source_filter_kinds` | Return OBS source filter kinds available for creation in OBS. |
| `list_source_filters` | Return sanitized filter summaries for a source selected by name or UUID. |
| `get_source_filter_default_settings` | Return key/type summaries for default settings of an OBS source filter kind. |
| `get_source_filter` | Return sanitized metadata and setting summaries for one OBS source filter. |
| `create_source_filter` | Create an OBS source filter. Optional filterSettings uses the narrow allowlisted settings patch. |
| `remove_source_filter` | Remove an OBS source filter by non-empty filter name. |
| `set_source_filter_settings` | Apply a narrow allowlisted OBS source filter settings patch. Arbitrary raw settings are not accepted. |
| `set_source_filter_enabled` | Set whether an OBS source filter is enabled. |
| `set_source_filter_index` | Set a source filter's non-negative index position. |
| `set_source_filter_name` | Rename an OBS source filter. |

### Inputs

| Tool | Description |
|------|-------------|
| `list_inputs` | Return OBS inputs, optionally restricted to one input kind. |
| `list_input_kinds` | Return OBS input kinds, with optional unversioned kind names. |
| `get_special_inputs` | Return OBS desktop and microphone special input names. |
| `get_input_mute` | Return whether an OBS input is muted. |
| `set_input_mute` | Set whether an OBS input is muted. |
| `toggle_input_mute` | Toggle whether an OBS input is muted. |
| `get_input_volume` | Return an OBS input volume in multiplier and dB units. |
| `set_input_volume` | Set an OBS input volume using either multiplier or dB units. |
| `get_input_audio_balance` | Return an OBS input audio balance. |
| `set_input_audio_balance` | Set an OBS input audio balance. |
| `get_input_audio_monitor_type` | Return an OBS input audio monitor type. |
| `set_input_audio_monitor_type` | Set an OBS input audio monitor type. |
| `get_input_audio_sync_offset` | Return an OBS input audio sync offset in milliseconds. |
| `set_input_audio_sync_offset` | Set an OBS input audio sync offset in milliseconds. |
| `get_input_audio_tracks` | Return enabled OBS audio tracks for an input. |
| `set_input_audio_tracks` | Set enabled OBS audio tracks for an input. |
| `get_input_deinterlace_mode` | Return an OBS input deinterlace mode. OBS restricts deinterlacing to async inputs. |
| `set_input_deinterlace_mode` | Set an OBS input deinterlace mode. OBS restricts deinterlacing to async inputs. |
| `get_input_deinterlace_field_order` | Return an OBS input deinterlace field order. OBS restricts deinterlacing to async inputs. |
| `set_input_deinterlace_field_order` | Set an OBS input deinterlace field order. OBS restricts deinterlacing to async inputs. |
| `get_input_default_settings` | Return sanitized default setting names and value types for an OBS input kind. |
| `get_input_settings` | Return sanitized setting names and value types for an OBS input. |
| `get_input_properties_list_property_items` | Return sanitized list-property item fields for an OBS input property. |
| `set_input_settings` | Apply a narrow allowlisted OBS input settings patch. Arbitrary raw settings are not accepted. |
| `press_input_properties_button` | Press a named OBS input properties button. This is an OBS-side effect. |
| `create_input` | Create an OBS input in a scene. Optional inputSettings uses the narrow allowlisted settings patch. |
| `remove_input` | Remove an OBS input by name or UUID. |
| `set_input_name` | Rename an OBS input by name or UUID. |
| `get_media_input_status` | Return an OBS media input status with duration and cursor data. |
| `set_media_input_cursor` | Set a media input cursor in milliseconds. OBS does not perform duration bounds checking. |
| `offset_media_input_cursor` | Offset a media input cursor in milliseconds. OBS does not perform duration bounds checking. |
| `trigger_media_input_action` | Trigger an official OBS media input action. |

### Outputs

| Tool | Description |
|------|-------------|
| `list_outputs` | Return OBS output names, kinds, and activity state. |
| `get_output_status` | Return generic OBS status fields for an output by name. |
| `get_output_settings` | Return sanitized, typed settings for a generic OBS output by name. |
| `set_output_settings` | Update sanitized, typed settings for a generic OBS output by name. |
| `start_output` | Start a generic OBS output by name. Prefer specialized record, stream, virtual camera, or replay tools when applicable. |
| `stop_output` | Stop a generic OBS output by name. Prefer specialized record, stream, virtual camera, or replay tools when applicable. |
| `toggle_output` | Toggle a generic OBS output by name. Prefer specialized record, stream, virtual camera, or replay tools when applicable. |
| `get_virtual_cam_status` | Return whether OBS virtual camera output is active. |
| `start_virtual_cam` | Start the OBS virtual camera output. |
| `stop_virtual_cam` | Stop the OBS virtual camera output. |
| `toggle_virtual_cam` | Toggle the OBS virtual camera output and return the resulting activity state. |
| `get_replay_buffer_status` | Return whether the OBS replay buffer output is active. |
| `start_replay_buffer` | Start the OBS replay buffer output. |
| `stop_replay_buffer` | Stop the OBS replay buffer output. |
| `toggle_replay_buffer` | Toggle the OBS replay buffer output and return the resulting activity state. |
| `save_replay_buffer` | Save the current OBS replay buffer contents. |
| `get_last_replay_buffer_replay` | Return the OBS-provided saved replay path for the last replay buffer save. |

### Recording

| Tool | Description |
|------|-------------|
| `get_record_status` | Return the active, paused, timecode, duration, and byte count status for the OBS record output. |
| `start_record` | Start the OBS record output. |
| `stop_record` | Stop the OBS record output and return OBS-provided output metadata. |
| `toggle_record` | Toggle the active state of the OBS record output. |
| `split_record_file` | Split the current OBS recording into a new file. |
| `create_record_chapter` | Add a chapter marker to the current OBS recording. Chapter marker support depends on the recording format; as of OBS 30.2.0, Hybrid MP4 is the supported format. |
| `pause_record` | Pause the active OBS record output. |
| `resume_record` | Resume a paused OBS record output. |
| `toggle_record_pause` | Toggle the pause state of the OBS record output. |

### Streaming

| Tool | Description |
|------|-------------|
| `get_stream_status` | Return OBS stream output activity, reconnecting state, timing, congestion, byte, and frame counts. |
| `start_stream` | Start the OBS stream output. |
| `stop_stream` | Stop the OBS stream output. |
| `toggle_stream` | Toggle the OBS stream output and return the resulting activity state. |
| `send_stream_caption` | Send non-empty CEA-608 caption text over the OBS stream output. The OBS protocol does not publish a maximum caption length. |

### Transitions

| Tool | Description |
|------|-------------|
| `list_transition_kinds` | Return OBS transition kind identifiers. |
| `list_scene_transitions` | Return current scene transition identity and stable transition summaries. |
| `get_current_scene_transition` | Return current scene transition identity, kind, fixed-duration state, and configured duration. |
| `get_current_scene_transition_cursor` | Return the current scene transition cursor position between 0 and 1. |
| `set_current_scene_transition` | Set the current OBS scene transition by non-empty transition name. |
| `set_current_scene_transition_duration` | Set the current OBS scene transition duration in milliseconds, bounded from 50 to 20000. |
| `set_current_scene_transition_settings` | Set current OBS scene transition settings using a flat primitive settings record; overlay defaults to true and merges over existing settings, while false replaces them. |
| `trigger_studio_mode_transition` | Trigger the current OBS studio mode transition. |
| `set_tbar_position` | Set the OBS T-Bar position between 0 and 1; release defaults to true. |

### OBS UI

| Tool | Description |
|------|-------------|
| `get_studio_mode_enabled` | Return whether OBS studio mode is enabled. |
| `set_studio_mode_enabled` | Local OBS UI side effect: enable or disable OBS studio mode. |
| `open_input_properties_dialog` | Local OBS UI side effect: open the properties dialog for an input by name or UUID. |
| `open_input_filters_dialog` | Local OBS UI side effect: open the filters dialog for an input by name or UUID. |
| `open_input_interact_dialog` | Local OBS UI side effect: open the interact dialog for an input by name or UUID. |
| `list_monitors` | Return OBS monitor summaries for choosing local projector targets. |
| `open_video_mix_projector` | Local OBS UI side effect: open a preview, program, or multiview projector. |
| `open_source_projector` | Local OBS UI side effect: open a projector for a source by name or UUID. |

### Administrative Raw

| Tool | Description |
|------|-------------|
| `get_persistent_data` | Read an OBS websocket persistent data slot. Exposed only by the admin_raw toolset. |
| `set_persistent_data` | Write a JSON-safe OBS websocket persistent data slot. Exposed only by the admin_raw toolset. |

### Vendor and Custom Events

| Tool | Description |
|------|-------------|
| `call_vendor_request` | Call a vendor/plugin OBS websocket request with JSON-safe data. Exposed only by the vendor toolset; plugin-defined behavior and provenance are security-sensitive. |
| `broadcast_custom_event` | Broadcast a JSON-safe custom OBS websocket event. Exposed only by the vendor toolset; downstream consumers and provenance are security-sensitive. |
<!-- tools:end -->

## Development

Package development uses pnpm:

```bash
pnpm install
pnpm build
pnpm check-all
```

Useful focused checks:

```bash
pnpm verify-readme
pnpm verify-registry-metadata
pnpm verify-protocol-parity
pnpm package-smoke
```

`pnpm update-readme` regenerates the tool tables from the local MCP tool registry.

## OBS Integration Testing

See [INTEGRATION_TESTING.md](INTEGRATION_TESTING.md) for OBS integration test setup, environment variables, and safety notes.

## Manual Stdio Smoke Test

Build the package and send MCP JSON-RPC over stdio:

```bash
pnpm build
printf '%s\n' \
  '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-06-18","capabilities":{},"clientInfo":{"name":"smoke","version":"0.0.0"}}}' \
  '{"jsonrpc":"2.0","method":"notifications/initialized","params":{}}' \
  '{"jsonrpc":"2.0","id":2,"method":"tools/list","params":{}}' \
  | node dist/index.cjs
```
