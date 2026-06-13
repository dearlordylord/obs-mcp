# Ralph Lane stream-control

Branch: `ralph/stream-control`

## Tasks

- [x] `task-1` Add core stream lifecycle controls
- [ ] `task-2` Add stream captions

## task-1

Status: `done`

### Load

Add compact stream status/lifecycle controls: `get_stream_status`, `start_stream`, `stop_stream`, and `toggle_stream` from `GetStreamStatus`, `StartStream`, `StopStream`, and `ToggleStream`. First inspect the status/record-control implementation if present and reuse the same request descriptor, schema, operation, registry, capability-gating, OBS error mapping, fake websocket, and MCP handler test patterns. Keep outputs structured and focused on OBS stream status/control results. Add fake OBS websocket tests for success, OBS request failure, capability-gated unavailability, and disabled stream toolset behavior if a stream toolset is introduced. Non-goals: no stream captions, no stream service settings, no generic output APIs, no raw vendor calls, no event subscriptions. Verification: run focused stream lifecycle tests first, then `pnpm check-all`; real OBS mutation integration remains opt-in.

## task-2

Status: `todo`

### Load

Add `send_stream_caption` from `SendStreamCaption` after core stream controls land. Use official request fields and make the user-facing schema explicit about caption text. Validate empty or oversized caption behavior according to official restrictions if present; otherwise document and test the local schema choice. Add fake OBS websocket tests for success, OBS request failure, capability-gated unavailability, disabled stream toolset behavior where applicable, and MCP handler validation. Non-goals: no stream service settings, no generic output APIs, no raw vendor calls, no event subscriptions. Verification: run focused stream caption tests first, then `pnpm check-all`; real OBS mutation integration remains opt-in.
