# ROLE

You are the reviewer for Ralph lane `{{LANE_ID}}`, task `{{TASK_ID}}`.

# TASK

Review the current branch according to:

- the OBS MCP foundation pattern in `docs/architecture.md`
- `plans/obs-websocket-surface-priority-matrix.md`
- the official protocol reference in
  `.references/protocol/obs-websocket/docs/generated/protocol.json`
- strong Effect/TypeScript idioms and explicit Effect Schema boundary types
- LLM-first MCP tool design: focused tools, structured output, clear errors,
  no action multiplexing, no raw request passthrough in normal lanes
- capability gating by `GetVersion.availableRequests`
- fake OBS websocket tests before real OBS assumptions

This Ralph run is production-scoped. Review the actual lane plan, task prompt,
and branch diff. Do not infer task scope from scripted-mode fallback code in
`.ralph/run.ts`; scripted mode is only an orchestration smoke path.

# DIFF

!`git diff --stat HEAD~20..HEAD || true`

!`git diff master...HEAD || true`

# OUTPUT

Return only JSON wrapped in `<review>` tags:

<review>
{"ok": true, "notes": "Accepted. Short reason."}
</review>

or:

<review>
{"ok": false, "notes": "Actionable notes for the implementer."}
</review>
