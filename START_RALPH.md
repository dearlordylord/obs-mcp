# Start Ralph

1. Pick one lane from `.ralph/plans/`.
2. Run the harness from `.ralph`.
3. Review the lane branch before merging.

Recommended first run:

```bash
cd .ralph
pnpm install
pnpm check
RALPH_LANES=status-record-stream \
RALPH_AGENT_MODE=codex \
RALPH_MAX_TASKS_PER_LANE=1 \
RALPH_MAX_REVIEW_ATTEMPTS=12 \
RALPH_LANE_CONCURRENCY=1 \
pnpm run run
```

Watch progress:

```bash
cat .ralph/progress.md
tail -f .ralph/logs/events.jsonl
```

The first run should stop after one task by default. Inspect the resulting
`ralph/status-record-stream` branch and only then continue the lane or increase
concurrency.
