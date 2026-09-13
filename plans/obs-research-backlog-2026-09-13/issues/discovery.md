## Problem Statement

Users and clients cannot easily discover supported task workflows or valid current identifiers, and behavior hints are absent.

## Solution

Expose capability-grounded prompts, supported MCP completion domains and accurate behavior annotations over existing operations.

## User Stories

1. As an OBS operator, I want prompts for supported tasks, so that I can start a recording or diagnosis workflow without knowing tool names.
2. As an MCP client user, I want current valid identifier suggestions, so that I avoid stale or misspelled names.
3. As an MCP client author, I want accurate read-only and destructive behavior hints, so that I can present calls appropriately.
4. As an OBS operator, I want prompts that respect enabled toolsets, so that guidance does not refer to unavailable actions.
5. As an OBS operator, I want unsupported client completion behavior documented, so that I understand why suggestions may not appear.
6. As an OBS operator, I want fresh bounded suggestions with identity context, so that duplicate names do not mislead me.
7. As an automation author, I want annotations treated as hints rather than authorization, so that security does not depend on client interpretation.

## Implementation Decisions

- Use implemented workflows/tools/resources as the sole authority for prompt content and capability availability.
- Support completion only at MCP-defined references supported by the client and protocol; do not promise universal tool-argument autocomplete.
- Define bounded, fresh scene/source/input/filter/profile/collection suggestions consistent with locator identity and enabled capabilities.
- Derive accurate read-only, destructive and idempotence behavior annotations from each public operation's actual semantics; hints do not grant permissions or replace validation.
- Start with a small documented prompt set for existing recording, visual verification and health jobs.

## Testing Decisions

- Use actual MCP handlers/clients to inspect prompts, supported completion requests and annotations under multiple toolsets/capability profiles.
- Verify suggestions after rename/removal, duplicate names, unavailable OBS, cancellation and bounded result limits.
- Test prompts against registered capabilities and expected task outcomes, not exact prose snapshots.

Tests assert externally observable behavior, actual OBS state, explicit errors and bounds; they must not mirror implementation structure. Prior art is the existing packed-package smoke, real fake-OBS socket harness, MCP handler/resource tests, HTTP lifecycle tests and opt-in real OBS integration. Reuse these boundaries.

## Out of Scope

Inventing functionality through prompt text, undocumented tool-call autocomplete, or using behavior hints as security controls.

## Further Notes

Evidence: [September comparative study](https://github.com/dearlordylord/obs-mcp/blob/3c555bc090c9dba88d2bbd9e3676794e5338beab/plans/obs-comparative-study-2026-09-13/README.md), [local findings](https://github.com/dearlordylord/obs-mcp/blob/3c555bc090c9dba88d2bbd9e3676794e5338beab/plans/obs-comparative-study-2026-09-13/candidates/local.md), [independent fixture audit](https://github.com/dearlordylord/obs-mcp/blob/3c555bc090c9dba88d2bbd9e3676794e5338beab/plans/obs-comparative-study-2026-09-13/independent-review.md).

Test boundary approved by the user: freshly installed package through MCP against controlled OBS as the main seam, focused existing protocol tests where needed, and a separate isolated real OBS/client visual check before release.

Parent: [#7 — Adopt OBS competitor findings with complete traceability and release acceptance](https://github.com/dearlordylord/obs-mcp/issues/7).

Track: OBS guided workflows and diagnostics.

Depends on: [#13 — Add read-only AV-health diagnosis with explicit evidence and unknowns](https://github.com/dearlordylord/obs-mcp/issues/13), [#11 — Return native MCP images and define remote screenshot save semantics](https://github.com/dearlordylord/obs-mcp/issues/11).

Do not start dependency-blocked implementation before prerequisite contracts are accepted. The ready-for-agent label records triage, not permission to skip dependencies or execute a future release.

Findings covered: F19, F20, F21.
