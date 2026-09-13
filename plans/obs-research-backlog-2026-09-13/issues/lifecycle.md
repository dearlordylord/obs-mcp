## Problem Statement

DCC exposes stronger explicit identity/deadline semantics, but the current server already has substantial cancellation and non-retry behavior, so the actual transferable gaps need precise evidence.

## Solution

Record an evidence-backed lifecycle contract that preserves existing guarantees and identifies only demonstrated or workflow-required additions.

## User Stories

1. As an OBS operator, I want a truthful uncertain-outcome result, so that a lost response is not reported as successful completion.
2. As an automation author, I want no unsafe replay of an in-flight mutation, so that a reconnect cannot duplicate side effects.
3. As an OBS operator, I want bounded multi-step execution, so that deadlines remain meaningful across composed operations.
4. As an OBS operator, I want postcondition evidence where a workflow promises confirmation, so that accepted requests are not confused with verified outcomes.
5. As a maintainer, I want existing cancellation/non-retry tests inventoried, so that working guarantees are not unnecessarily reimplemented.
6. As an OBS operator, I want identity claims limited to what ordinary OBS WebSocket exposes, so that the server does not invent process identity.
7. As a maintainer, I want a clear decision on native instance binding, so that DCC's native-only contract is not mistaken for a simple configuration option.

## Implementation Decisions

- Inspect existing request correlation, cancellation, reconnect, event continuity, in-flight request and batch non-retry guarantees.
- Compare pre-send failure, post-send uncertain outcome, readback/reconciliation, composed deadlines and intervening changes at the public contract.
- Separate ordinary WebSocket connection/session evidence from exact OBS PID/plugin-instance/event-sequence guarantees that require a native extension.
- Produce a gap/guarantee matrix, preserve-existing dispositions and bounded follow-up acceptance cases for needed improvements; no blanket client rewrite.
- Provide the verified lifecycle assumptions required by the guided preview/apply work.

## Testing Decisions

- Reuse actual protocol and packaged-process seams; extend only uncovered applied-but-reply-lost, deadline propagation or identity-change cases.
- Inspect actual OBS state and returned errors, not generic bounded-response success predicates.
- Do not assign observed passes to a missing native environment; label source reasoning and execution separately.

Tests assert externally observable behavior, actual OBS state, explicit errors and bounds; they must not mirror implementation structure. Prior art is the existing packed-package smoke, real fake-OBS socket harness, MCP handler/resource tests, HTTP lifecycle tests and opt-in real OBS integration. Reuse these boundaries.

## Out of Scope

Implementing a native plugin, changing language/framework, adding automatic retries for uncertain mutations, or promising PID identity from standard requests.

## Further Notes

Evidence: [September comparative study](https://github.com/dearlordylord/obs-mcp/blob/3c555bc090c9dba88d2bbd9e3676794e5338beab/plans/obs-comparative-study-2026-09-13/README.md), [local findings](https://github.com/dearlordylord/obs-mcp/blob/3c555bc090c9dba88d2bbd9e3676794e5338beab/plans/obs-comparative-study-2026-09-13/candidates/local.md), [independent fixture audit](https://github.com/dearlordylord/obs-mcp/blob/3c555bc090c9dba88d2bbd9e3676794e5338beab/plans/obs-comparative-study-2026-09-13/independent-review.md).

Test boundary approved by the user: freshly installed package through MCP against controlled OBS as the main seam, focused existing protocol tests where needed, and a separate isolated real OBS/client visual check before release.

Parent: [#7 — Adopt OBS competitor findings with complete traceability and release acceptance](https://github.com/dearlordylord/obs-mcp/issues/7).

Track: Bounded investigation / continuation decision; no release commitment.

Depends on: [#8 — Establish OBS adoption contracts, current baseline, and maintained acceptance fixture](https://github.com/dearlordylord/obs-mcp/issues/8).

Do not start dependency-blocked implementation before prerequisite contracts are accepted. The ready-for-agent label records triage, not permission to skip dependencies or execute a future release.

Findings covered: F26, F27, F46.
