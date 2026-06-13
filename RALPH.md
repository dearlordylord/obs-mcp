# Ralph For OBS MCP

Ralph here means fresh-context implementation lanes. State persists through
tracked plan files and git commits; failed attempts do not stay in one long
agent context.

Use Ralph for implementation work after the foundation decision is clear. Do not
use it to decide policy-heavy areas such as screenshots, raw/vendor requests,
high-volume events, or HTTP transport before a human-readable plan exists.

## Current Lane Map

- `status-record-stream`: `GetStats`, record tools, stream tools.
- `inputs-audio-media`: input discovery, primitive audio controls, media input
  controls.
- `scene-items-identity`: scene-item discovery plus enabled/locked toggles.
- `outputs-replay-virtualcam`: virtual camera and replay buffer controls.
- `events-foundation`: typed event infrastructure and bounded event policy.

The tracked lane plans are under `.ralph/plans/`.

## Run

```bash
cd .ralph
pnpm install
pnpm check
RALPH_AGENT_MODE=codex \
RALPH_MAX_TASKS_PER_LANE=1 \
RALPH_LANE_CONCURRENCY=2 \
pnpm run run
```

Run only one lane:

```bash
cd .ralph
RALPH_LANES=status-record-stream RALPH_AGENT_MODE=codex pnpm run run
```

## Guardrails

- Official obs-websocket protocol is the implementation source of truth.
- Competitor references and the surface matrix are priority signals only.
- Every new tool needs explicit Effect Schema input/output types.
- Preserve capability gating through `GetVersion.availableRequests`.
- Use fake OBS websocket tests for CI; real OBS integration remains optional or
  mutation-opt-in.
- Keep stdout as MCP JSON-RPC only in stdio mode.
- Do not add action multiplexing, raw request passthrough, screenshots,
  filesystem writes, event streaming, batches, or HTTP transport from a lane
  that does not explicitly ask for them.
