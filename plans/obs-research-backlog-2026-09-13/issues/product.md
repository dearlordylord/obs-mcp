## Problem Statement

The study identifies valuable broader workflows whose dependencies and product costs exceed the next server milestone; without explicit dispositions they can disappear or become accidental scope.

## Solution

Maintain and resolve a bounded decision backlog for broader product directions, with evidence and follow-up contracts for selected work.

## User Stories

1. As a product maintainer, I want every broader opportunity given an explicit disposition, so that the research remains actionable.
2. As a recording user, I want window capture and private recording evaluated by platform, so that support claims reflect OBS and OS constraints.
3. As a show operator, I want media/showrunner and visual verification workflows evaluated, so that the server can grow around useful jobs.
4. As a multi-PC operator, I want readiness, confirmation and restoration considered together, so that coordination does not confuse local state with end-to-end signal.
5. As a live producer, I want overlay, Stream Deck and transcription-assist options evaluated, so that a larger product is chosen deliberately.
6. As a creator, I want dashboard and AI-streamer directions considered with their dependencies, so that UI, chat, TTS and avatar work does not appear as hidden server scope.
7. As a maintainer, I want native OBS plugin and device-management costs recorded, so that architecture scores do not dictate an unnecessary platform change.
8. As a maintainer, I want each deferral has a revisit trigger and linked follow-up destination, so that continuation is preserved.

## Implementation Decisions

- Assess separately: recording/window capture helpers; status/showrunner/media sequencing and visual diff; multi-PC production; dashboards/TUI/embedded creator UI; overlays/Stream Deck/live transcription; AI streaming/chat/TTS/avatar; native OBS plugin and device/plugin/system management.
- Use user jobs, platform/runtime evidence, maintenance burden and boundaries as decision criteria; scores and tool counts alone do not justify adoption.
- Distinguish source-supported designs from verified runtime behavior, especially DCC native and BEA hosted workflows.
- For every direction record adopt/defer/reject, rationale, prerequisites, revisit trigger, and a linked implementation spec if adopted.
- Keep named event-confirmed workflow extensions separate from an unbounded generic scripting/event engine.

## Testing Decisions

- Decision acceptance requires a traceable source finding and explicit disposition for every listed direction.
- Use bounded prototypes or environment checks only when needed to resolve a specific decision; specify their observable success criteria first.
- Do not claim production, platform or real-OBS verification from a source-only comparison.

Tests assert externally observable behavior, actual OBS state, explicit errors and bounds; they must not mirror implementation structure. Prior art is the existing packed-package smoke, real fake-OBS socket harness, MCP handler/resource tests, HTTP lifecycle tests and opt-in real OBS integration. Reuse these boundaries.

## Out of Scope

Building all listed products, operating hosted accounts, installing plugins/services, or approving a rewrite solely from competitor rankings.

## Further Notes

Evidence: [September comparative study](https://github.com/dearlordylord/obs-mcp/blob/3c555bc090c9dba88d2bbd9e3676794e5338beab/plans/obs-comparative-study-2026-09-13/README.md), [local findings](https://github.com/dearlordylord/obs-mcp/blob/3c555bc090c9dba88d2bbd9e3676794e5338beab/plans/obs-comparative-study-2026-09-13/candidates/local.md), [independent fixture audit](https://github.com/dearlordylord/obs-mcp/blob/3c555bc090c9dba88d2bbd9e3676794e5338beab/plans/obs-comparative-study-2026-09-13/independent-review.md).

Test boundary approved by the user: freshly installed package through MCP against controlled OBS as the main seam, focused existing protocol tests where needed, and a separate isolated real OBS/client visual check before release.

Parent: [#7 — Adopt OBS competitor findings with complete traceability and release acceptance](https://github.com/dearlordylord/obs-mcp/issues/7).

Track: Bounded investigation / continuation decision; no release commitment.

Depends on: No child prerequisite; remain within the parent scope.

Do not start dependency-blocked implementation before prerequisite contracts are accepted. The ready-for-agent label records triage, not permission to skip dependencies or execute a future release.

Findings covered: F32, F33, F34, F35, F36, F37, F38, F39, F40, F57.
