## Problem Statement

Published npm entry works, but startup diagnostics, client setup and platform-specific installation paths may still impose avoidable friction.

## Solution

Produce an evidence-backed distribution/onboarding decision and implementation-ready follow-up contracts for any selected improvement.

## User Stories

1. As a new user, I want clear connection and configuration diagnostics, so that I can distinguish OBS startup, credentials and MCP setup problems.
2. As a new user, I want accurate client examples and defaults, so that I can enable the intended tools.
3. As a desktop user, I want an evaluated desktop bundle path, so that installation choices match supported clients.
4. As a platform user, I want explicit support for OBS startup and capture prerequisites, so that a platform claim is backed by execution.
5. As a maintainer, I want MCPB, native, container and editor packaging compared against user friction, so that maintenance cost is justified.
6. As a user, I want backup and credential behavior stated before setup actions, so that onboarding does not silently alter my environment.
7. As a maintainer, I want a recorded adopt/defer/reject decision for each packaging direction, so that unselected ideas remain tracked.

## Implementation Decisions

- Audit existing npm, registry metadata, Docker/container support and client examples before proposing additions; preserve what is already working.
- Evaluate MCPB first as a bounded desktop packaging candidate, and compare native binaries/Homebrew, Docker, VS Code/editor packaging and platform auto-start only for defined user jobs.
- Separate connection diagnostics from starting OBS, changing obs-websocket settings, backup/restore or plugin installation.
- Deliver a decision matrix with evidence, supported environments, costs, explicit dispositions and linked follow-up specs for any selected implementation.
- Do not execute system/plugin installs or publish artifacts merely because this investigation is ready for an agent.

## Testing Decisions

- Reproduce selected installation friction from an isolated clean consumer and compare the proposed path using exact attributable artifacts.
- Verify existing lazy discovery versus ordinary OBS-connected startup in relevant client examples.
- Acceptance for this issue is a bounded decision plus evidence; any selected code change must have a follow-up behavioral acceptance contract.

Tests assert externally observable behavior, actual OBS state, explicit errors and bounds; they must not mirror implementation structure. Prior art is the existing packed-package smoke, real fake-OBS socket harness, MCP handler/resource tests, HTTP lifecycle tests and opt-in real OBS integration. Reuse these boundaries.

## Out of Scope

Automatic system configuration changes, a commitment to every packaging format, native-platform expansion without demand, or copying competitors' installers.

## Further Notes

Evidence: [September comparative study](https://github.com/dearlordylord/obs-mcp/blob/3c555bc090c9dba88d2bbd9e3676794e5338beab/plans/obs-comparative-study-2026-09-13/README.md), [local findings](https://github.com/dearlordylord/obs-mcp/blob/3c555bc090c9dba88d2bbd9e3676794e5338beab/plans/obs-comparative-study-2026-09-13/candidates/local.md), [independent fixture audit](https://github.com/dearlordylord/obs-mcp/blob/3c555bc090c9dba88d2bbd9e3676794e5338beab/plans/obs-comparative-study-2026-09-13/independent-review.md).

Test boundary approved by the user: freshly installed package through MCP against controlled OBS as the main seam, focused existing protocol tests where needed, and a separate isolated real OBS/client visual check before release.

Parent: [#7 — Adopt OBS competitor findings with complete traceability and release acceptance](https://github.com/dearlordylord/obs-mcp/issues/7).

Track: Bounded investigation / continuation decision; no release commitment.

Depends on: [#12 — Prepare and gate publication of the exact OBS package that passes acceptance](https://github.com/dearlordylord/obs-mcp/issues/12).

Do not start dependency-blocked implementation before prerequisite contracts are accepted. The ready-for-agent label records triage, not permission to skip dependencies or execute a future release.

Findings covered: F28, F29, F30, F31.
