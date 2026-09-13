## Problem Statement

Existing bounded events and confirmations do not yet provide a complete user-facing explanation of recent changes or aggregated audio-meter evidence.

## Solution

Extend the existing event infrastructure only where it supports a concrete recent-history or AV diagnostic query.

## User Stories

1. As an OBS operator, I want a derived explanation or media-liveness summary over the existing bounded recent-event API, so that I can understand why my session changed.
2. As an OBS operator, I want summarized meter evidence rather than thousands of samples, so that I can assess levels without a data flood.
3. As an OBS operator, I want gaps, overflow and stale intervals identified, so that absence of events is not mistaken for absence of change.
4. As an OBS operator, I want explicit opt-in for high-volume measurements, so that diagnostics do not silently increase data collection.
5. As an automation author, I want bounded reads and cancellation, so that history queries remain predictable.
6. As an MCP client author, I want events correlated with relevant targets and operations, so that the history is useful for diagnosis.
7. As a maintainer, I want existing event and confirmation semantics preserved, so that new diagnostics do not duplicate or destabilize the event layer.

## Implementation Decisions

- Reuse existing bounded event buffers, resources and named confirmations; do not replace them with a second client/event store.
- Define opt-in meter subscription groups, aggregation windows, memory bounds, overflow/gap markers, freshness and supported event families.
- Keep screenshots, credentials and sensitive settings out of ordinary event summaries according to existing policy.
- Distinguish diagnostic history from a durable audit log or proof that every external action was observed.

## Testing Decisions

- Drive real MCP queries with controlled events, meter samples, overflow, reconnect and cancellation; assert bounded memory-visible behavior and truthful gaps.
- Use focused existing event tests for scheduling/overflow boundaries and package-level tests for user-visible results.
- Verify aggregation against controlled OBS meter samples. Do not claim actual audible quality or clipping diagnosis beyond what the measured values establish; physical-signal validation is a separately scoped follow-up.
- Verify the diagnostic delta over the existing recent-event API and preserve its public behavior and bounded store; do not test a duplicate history implementation.

Tests assert externally observable behavior, actual OBS state, explicit errors and bounds; they must not mirror implementation structure. Prior art is the existing packed-package smoke, real fake-OBS socket harness, MCP handler/resource tests, HTTP lifecycle tests and opt-in real OBS integration. Reuse these boundaries.

## Out of Scope

An unbounded event firehose, permanent audit database, generic arbitrary-event automation, or recreating already implemented confirmations.

## Further Notes

Evidence: [September comparative study](https://github.com/dearlordylord/obs-mcp/blob/3c555bc090c9dba88d2bbd9e3676794e5338beab/plans/obs-comparative-study-2026-09-13/README.md), [local findings](https://github.com/dearlordylord/obs-mcp/blob/3c555bc090c9dba88d2bbd9e3676794e5338beab/plans/obs-comparative-study-2026-09-13/candidates/local.md), [independent fixture audit](https://github.com/dearlordylord/obs-mcp/blob/3c555bc090c9dba88d2bbd9e3676794e5338beab/plans/obs-comparative-study-2026-09-13/independent-review.md).

Test boundary approved by the user: freshly installed package through MCP against controlled OBS as the main seam, focused existing protocol tests where needed, and a separate isolated real OBS/client visual check before release.

Parent: [#7 — Adopt OBS competitor findings with complete traceability and release acceptance](https://github.com/dearlordylord/obs-mcp/issues/7).

Track: OBS guided workflows and diagnostics.

Depends on: [#13 — Add read-only AV-health diagnosis with explicit evidence and unknowns](https://github.com/dearlordylord/obs-mcp/issues/13).

Do not start dependency-blocked implementation before prerequisite contracts are accepted. The ready-for-agent label records triage, not permission to skip dependencies or execute a future release.

Findings covered: F24, F25, F42.
