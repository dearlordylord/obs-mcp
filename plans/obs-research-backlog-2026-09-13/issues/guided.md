## Problem Statement

Operators lack a task-level preview/apply path for useful audio setup and cannot safely reason about partial changes across multiple operations.

## Solution

Deliver one focused audio-setup workflow with an inspectable preview, explicit apply, postcondition evidence and conflict-aware partial-failure handling.

## User Stories

1. As an OBS operator, I want a preview of planned audio changes, so that I can understand the effect before applying it.
2. As an OBS operator, I want an explicit apply action, so that inspection does not mutate OBS.
3. As an OBS operator, I want target identity revalidated before apply, so that a stale preview does not change another input.
4. As an OBS operator, I want postconditions checked after each change, so that acceptance is not mistaken for completion.
5. As an OBS operator, I want partial progress and uncertain outcomes reported, so that I know which state may need attention.
6. As an OBS operator, I want restoration that detects intervening changes, so that recovery does not overwrite another operator's work.
7. As an automation author, I want bounded deadlines and cancellation, so that a multi-step job cannot run indefinitely.
8. As an OBS operator, I want supported settings and prerequisites stated, so that the workflow does not promise unavailable plugins.
9. As a maintainer, I want one complete useful workflow before a generic engine, so that its behavior can be tested and maintained.

## Implementation Decisions

- Build on existing operations and the lifecycle investigation's verified contract; choose one documented audio setup profile and supported prerequisites.
- Define preview lifetime, target identity, explicit apply, step results, terminal success/failure/unknown states and bounded execution.
- Preserve the existing non-retry policy for uncertain in-flight mutations; do not silently repeat a possibly applied action.
- Record affected state and compensate only where safe. Conflicts, disconnects or uncertain restoration remain explicit outcomes.
- Keep preview/apply extensible for later tasks without building an arbitrary workflow interpreter.

## Testing Decisions

- At packaged MCP level prove preview sends no mutations, stale previews are rejected or safely revalidated, successful apply matches state, and each injected step failure reports actual progress.
- Cover applied-but-reply-lost, cancellation, reconnect, missing prerequisites and intervening external changes before restoration.
- Verify the chosen audio profile and partial-apply cases through the controlled OBS fixture. Any physical audio-quality or platform-specific claim requires a separately scoped manual validation, beyond this issue's automated acceptance.

Tests assert externally observable behavior, actual OBS state, explicit errors and bounds; they must not mirror implementation structure. Prior art is the existing packed-package smoke, real fake-OBS socket harness, MCP handler/resource tests, HTTP lifecycle tests and opt-in real OBS integration. Reuse these boundaries.

## Out of Scope

General scripting, automatic changes during diagnosis, broad scene/recording workflow families, or blind snapshot restoration.

## Further Notes

Evidence: [September comparative study](https://github.com/dearlordylord/obs-mcp/blob/3c555bc090c9dba88d2bbd9e3676794e5338beab/plans/obs-comparative-study-2026-09-13/README.md), [local findings](https://github.com/dearlordylord/obs-mcp/blob/3c555bc090c9dba88d2bbd9e3676794e5338beab/plans/obs-comparative-study-2026-09-13/candidates/local.md), [independent fixture audit](https://github.com/dearlordylord/obs-mcp/blob/3c555bc090c9dba88d2bbd9e3676794e5338beab/plans/obs-comparative-study-2026-09-13/independent-review.md).

Test boundary approved by the user: freshly installed package through MCP against controlled OBS as the main seam, focused existing protocol tests where needed, and a separate isolated real OBS/client visual check before release.

Parent: [#7 — Adopt OBS competitor findings with complete traceability and release acceptance](https://github.com/dearlordylord/obs-mcp/issues/7).

Track: OBS guided workflows and diagnostics.

Depends on: [#13 — Add read-only AV-health diagnosis with explicit evidence and unknowns](https://github.com/dearlordylord/obs-mcp/issues/13), [#10 — Provide explicit full-fidelity filter, output, and transition settings contracts](https://github.com/dearlordylord/obs-mcp/issues/10), [#9 — Preserve scene UUID and canvas identity across public tools and batches](https://github.com/dearlordylord/obs-mcp/issues/9), [#19 — Audit transferable deadline, postcondition and OBS identity guarantees](https://github.com/dearlordylord/obs-mcp/issues/19).

Do not start dependency-blocked implementation before prerequisite contracts are accepted. The ready-for-agent label records triage, not permission to skip dependencies or execute a future release.

Findings covered: F17, F18.
