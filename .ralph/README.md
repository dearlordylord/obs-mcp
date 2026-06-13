# OBS MCP Ralph Harness

This is the local Ralph/Sandcastle harness for widening the OBS MCP surface in
fresh-context implementation lanes.

The invariant is the Huly MCP Ralph pattern: persistent state lives in files and
git, not in one long agent conversation. Each lane runs as planner, implementer,
reviewer, and cleanup roles. Implementers take exactly one task from a lane plan,
reviewers inspect that task's branch diff, and cleanup commits or acknowledges
intentional commits before the task is marked done.

## Run

```bash
cd .ralph
pnpm install
pnpm check
RALPH_AGENT_MODE=codex \
RALPH_MAX_TASKS_PER_LANE=1 \
RALPH_MAX_REVIEW_ATTEMPTS=12 \
RALPH_LANE_CONCURRENCY=2 \
RALPH_PLANNER_EFFORT=low \
RALPH_IMPLEMENTER_EFFORT=medium \
RALPH_REVIEWER_EFFORT=xhigh \
RALPH_CLEANUP_EFFORT=low \
pnpm run run
```

Run a subset:

```bash
RALPH_LANES=status-record-core,inputs-discovery-audio-core pnpm run run
```

## Live Concurrency

`RALPH_LANE_CONCURRENCY` sets the initial lane concurrency and initializes
`.ralph/control.json` when it does not exist. While Ralph is running, edit that
runtime file to change concurrency without restarting:

```json
{
  "laneConcurrency": 3
}
```

Increasing the value starts more queued lanes on the next scheduler poll.
Decreasing the value does not cancel active work; Ralph lets current lane tasks
finish and only starts replacements when active lanes drop below the new target.

The scheduler polls every 5000 ms by default. Set
`RALPH_LANE_CONCURRENCY_POLL_MS=0` to disable polling and only apply control-file
changes when a lane finishes.

## Current Lanes

Lane specs live in `run.ts`. Tracked task plans live in `plans/` so future
Ralph runs resume from explicit product intent instead of replanning from
scratch.

- `status-record-core`: stats, record status, and core record lifecycle.
- `record-advanced`: record pause, split-file, and chapter-marker controls.
- `stream-control`: stream status, lifecycle, and captions.
- `inputs-discovery-audio-core`: input discovery, locator schema, mute, and
  volume.
- `inputs-audio-advanced-media`: input balance/monitor controls and media input
  controls.
- `scene-items-identity`: scene-item discovery and bounded toggles.
- `outputs-replay-virtualcam`: replay buffer and virtual camera controls.
- `events-foundation`: typed event infrastructure and policy, not broad event
  streaming.

## Source Of Truth

- Official protocol provenance:
  `.references/protocol/obs-websocket/docs/generated/protocol.json`
- Prioritized surface matrix:
  `plans/obs-websocket-surface-priority-matrix.md`
- Machine-readable matrix:
  `plans/obs-websocket-surface-matrix.json`
- Architecture rules:
  `docs/architecture.md`

Competitor references are planning signals only. They are not implementation
sources.

## Observe

```bash
cat .ralph/progress.md
cat .ralph/status.json
tail -f .ralph/logs/events.jsonl
```

Runtime worktrees are stored under `.ralph/sandcastle/worktrees` through the
root `.sandcastle` symlink created by `run.ts`.
