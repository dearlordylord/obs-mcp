## Problem Statement

Users must manually combine low-level status calls and can confuse unavailable measurements with healthy audio/video.

## Solution

Provide one bounded read-only diagnostic workflow that reports observations, evidence-backed warnings, unknowns and supported next actions.

## User Stories

1. As an OBS operator, I want one AV-health report, so that I can locate likely recording or streaming problems.
2. As an OBS operator, I want measured facts separated from inferred warnings, so that I understand how confident the diagnosis is.
3. As an OBS operator, I want unknown or unsupported checks marked clearly, so that missing measurements are not called healthy.
4. As an OBS operator, I want no OBS mutations during diagnosis, so that I can inspect a live session without changing it.
5. As an OBS operator, I want bounded sampling and cancellation, so that diagnosis does not hang or accumulate data indefinitely.
6. As an OBS operator, I want actionable recommendations tied to supported tools, so that I can address the reported problem.
7. As an MCP client author, I want stable structured results with timestamps or freshness evidence, so that I can present the diagnosis accurately.
8. As a maintainer, I want controlled healthy and degraded scenarios, so that warning rules are verifiable.

## Implementation Decisions

- Compose existing status, statistics, audio/output and resource operations; do not duplicate their connection or error policy.
- Define observation windows, freshness, threshold provenance, unsupported measurements and cancellation before exposing results.
- Do not infer successful live streaming, audible signal or actual rendered correctness merely from an active flag.
- Keep the first workflow read-only. Use task-level vocabulary rather than exposing protocol implementation details.

## Testing Decisions

- Execute the packaged MCP diagnostic against controlled healthy, degraded, unavailable, stale and disconnected fixture states; assert zero mutation requests.
- Verify each warning points to observed evidence and that unknown measurements cannot become healthy defaults.
- Validate modeled AV warning semantics with controlled OBS observations. Any later physical audio/device claim needs explicitly scoped real-environment evidence; such a manual follow-up is not silently added to the approved visual release gate.

Tests assert externally observable behavior, actual OBS state, explicit errors and bounds; they must not mirror implementation structure. Prior art is the existing packed-package smoke, real fake-OBS socket harness, MCP handler/resource tests, HTTP lifecycle tests and opt-in real OBS integration. Reuse these boundaries.

## Out of Scope

Automatic repair, audio-chain mutation, continuous monitoring service, AI visual judgment, or guarantees about codecs/devices not actually measured.

## Further Notes

Evidence: [September comparative study](https://github.com/dearlordylord/obs-mcp/blob/3c555bc090c9dba88d2bbd9e3676794e5338beab/plans/obs-comparative-study-2026-09-13/README.md), [local findings](https://github.com/dearlordylord/obs-mcp/blob/3c555bc090c9dba88d2bbd9e3676794e5338beab/plans/obs-comparative-study-2026-09-13/candidates/local.md), [independent fixture audit](https://github.com/dearlordylord/obs-mcp/blob/3c555bc090c9dba88d2bbd9e3676794e5338beab/plans/obs-comparative-study-2026-09-13/independent-review.md).

Test boundary approved by the user: freshly installed package through MCP against controlled OBS as the main seam, focused existing protocol tests where needed, and a separate isolated real OBS/client visual check before release.

Parent: [#7 — Adopt OBS competitor findings with complete traceability and release acceptance](https://github.com/dearlordylord/obs-mcp/issues/7).

Track: OBS guided workflows and diagnostics.

Depends on: [#12 — Prepare and gate publication of the exact OBS package that passes acceptance](https://github.com/dearlordylord/obs-mcp/issues/12).

Do not start dependency-blocked implementation before prerequisite contracts are accepted. The ready-for-agent label records triage, not permission to skip dependencies or execute a future release.

Findings covered: F16.
