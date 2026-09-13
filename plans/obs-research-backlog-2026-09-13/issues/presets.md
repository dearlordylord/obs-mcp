## Problem Statement

Operators cannot save and compare a supported known-good setup with clear version, secret and restoration behavior.

## Solution

Provide bounded, versioned presets with preview/diff and explicit apply for a deliberately chosen supported setup scope.

## User Stories

1. As an OBS operator, I want save a supported setup as a named preset, so that I can repeat it later.
2. As an OBS operator, I want diff a preset against current state, so that I can inspect proposed changes.
3. As an OBS operator, I want explicit apply and target revalidation, so that a preset does not unexpectedly change OBS.
4. As an OBS operator, I want list, rename and delete presets, so that I can maintain my saved setups.
5. As an OBS operator, I want credentials excluded from stored presets, so that sharing or retaining them does not expose secrets.
6. As an OBS operator, I want clear schema-version and unsupported-field handling, so that old presets do not silently change meaning.
7. As an OBS operator, I want bounded storage and explicit location, so that preset persistence remains manageable.
8. As an OBS operator, I want conflict-aware partial apply results, so that recovery does not overwrite intervening work.

## Implementation Decisions

- Choose and document one persistence boundary (server state, OBS persistent data or explicitly scoped files) before implementation; do not silently use all three.
- Start with the verified workflow's supported setup scope; record scope before broad scene/source/recording families are added.
- Version schemas from the first release, define migration/rejection policy, storage limits, identity handling and sensitive-value exclusions.
- Reuse preview/apply and restoration contracts rather than implementing a second mutation engine.

## Testing Decisions

- Test save/read/diff/apply through MCP with deterministic state, no-op diffs, invalid/old versions, secret exclusions, target changes and partial failure.
- Test persistence boundary and size/path limits using the existing filesystem/configuration seams where applicable.
- Prove rejected or unsupported preset content cannot become a silently successful partial application.

Tests assert externally observable behavior, actual OBS state, explicit errors and bounds; they must not mirror implementation structure. Prior art is the existing packed-package smoke, real fake-OBS socket harness, MCP handler/resource tests, HTTP lifecycle tests and opt-in real OBS integration. Reuse these boundaries.

## Out of Scope

Arbitrary OBS configuration backup, unrestricted files, full scene graph cloning, or storing stream credentials.

## Further Notes

Evidence: [September comparative study](https://github.com/dearlordylord/obs-mcp/blob/3c555bc090c9dba88d2bbd9e3676794e5338beab/plans/obs-comparative-study-2026-09-13/README.md), [local findings](https://github.com/dearlordylord/obs-mcp/blob/3c555bc090c9dba88d2bbd9e3676794e5338beab/plans/obs-comparative-study-2026-09-13/candidates/local.md), [independent fixture audit](https://github.com/dearlordylord/obs-mcp/blob/3c555bc090c9dba88d2bbd9e3676794e5338beab/plans/obs-comparative-study-2026-09-13/independent-review.md).

Test boundary approved by the user: freshly installed package through MCP against controlled OBS as the main seam, focused existing protocol tests where needed, and a separate isolated real OBS/client visual check before release.

Parent: [#7 — Adopt OBS competitor findings with complete traceability and release acceptance](https://github.com/dearlordylord/obs-mcp/issues/7).

Track: OBS guided workflows and diagnostics.

Depends on: [#14 — Add preview/apply audio setup with bounded failure and restoration semantics](https://github.com/dearlordylord/obs-mcp/issues/14).

Do not start dependency-blocked implementation before prerequisite contracts are accepted. The ready-for-agent label records triage, not permission to skip dependencies or execute a future release.

Findings covered: F22, F23.
