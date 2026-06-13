# Ralph Lane events-foundation

Branch: `ralph/events-foundation`

## Tasks

- [ ] `task-1` Design typed event subscription foundation
- [ ] `task-2` Implement bounded low-volume event capture

## task-1

Status: `todo`

### Load

Design the smallest event foundation needed for later OBS MCP lanes without exposing broad event streaming. First inspect `src/obs/protocol.ts`, `src/obs/client.ts`, current websocket handshake tests, and the event sections in `plans/obs-websocket-surface-priority-matrix.md`. Add typed protocol/domain definitions for event subscription categories, low-volume versus high-volume policy, and event envelope decoding from official protocol JSON examples. Tests should cover valid event envelopes, malformed events, ignored high-volume categories by default, and preservation of stdout purity in stdio mode if any logging paths are touched. Non-goals: no MCP event tools/resources yet unless required to validate the foundation, no raw vendor events, no high-volume `InputVolumeMeters`, no unbounded buffers. Verification: run focused protocol/event tests, then `pnpm check-all`.

## task-2

Status: `todo`

### Load

Implement bounded low-volume event capture only if task-1 creates stable typed event primitives. Prefer a small internal service with configurable bounded capacity and tests before public MCP exposure. If a public surface is added, it must be read-only and LLM-first, such as `get_recent_obs_events` gated behind an `events` toolset with explicit category filters and bounded limits. Add fake websocket tests for event receipt, unrelated event ignore, buffer overflow/coalescing behavior, malformed event handling, reconnect/close behavior if applicable, and disabled toolset behavior. Non-goals: no high-volume subscriptions by default, no streaming transport, no raw vendor/custom events, no persistent storage. Verification: run focused event tests, then `pnpm check-all`.
