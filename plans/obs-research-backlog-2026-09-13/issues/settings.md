## Problem Statement

Users cannot inspect and update nested or kind-specific OBS settings because current interfaces summarize or narrow values, and transition reads omit settings.

## Solution

Expose an explicit, bounded settings representation that preserves supported nested values and makes restrictions visible while keeping existing typed conveniences compatible.

## User Stories

1. As an OBS operator, I want actual filter setting values, so that I can understand an existing filter before changing it.
2. As an OBS operator, I want nested filter settings that retain supported unknown keys, so that plugin configurations can round-trip.
3. As an OBS operator, I want kind-specific output settings, so that encoder or output configuration is not silently lost.
4. As an OBS operator, I want current transition settings on the valid existing read, so that I can inspect the transition OBS actually uses.
5. As an OBS operator, I want nested transition updates, so that valid structured settings are expressible.
6. As an existing client author, I want compatible typed convenience responses, so that my existing configuration automation keeps working.
7. As an OBS operator, I want explicit sensitive-setting exclusions and opt-in boundaries, so that I understand what data a call can reveal.
8. As an automation author, I want documented merge or replacement behavior, so that an update does not accidentally erase unrelated settings.
9. As an OBS operator, I want truthful rejection of unsupported settings, so that I am not told a change succeeded when it was discarded.

## Implementation Decisions

- Use the foundation's recorded settings contract; keep lossless access explicit and retain existing typed convenience behavior.
- Represent supported settings as bounded recursive JSON, including arrays, objects, booleans, strings, finite numbers and null; document limits and exclusions.
- Preserve unknown permitted values within the selected settings contract. Sensitive-value exclusions must be explicit rather than silently implying an exact round-trip.
- Expose transitionSettings from the existing valid current-transition request. Do not add the nonexistent GetCurrentSceneTransitionSettings request.
- Specify OBS overlay/merge/replacement semantics for each write and avoid read-modify-write assumptions that overwrite concurrent changes.
- Keep validation, request capability filtering, toolset policy, and truthful MCP error handling.

## Testing Decisions

- Execute packaged MCP read/update/readback cases with nested objects, arrays, unknown permitted keys and representative plugin/output settings; compare actual fixture state.
- Verify typed convenience compatibility, explicit opt-in behavior, sensitive-field policy, size/depth limits, malformed inputs and OBS rejections.
- Assert current-transition settings are returned using a valid public request name and that excluded/rejected values never appear as successful writes.

Tests assert externally observable behavior, actual OBS state, explicit errors and bounds; they must not mirror implementation structure. Prior art is the existing packed-package smoke, real fake-OBS socket harness, MCP handler/resource tests, HTTP lifecycle tests and opt-in real OBS integration. Reuse these boundaries.

## Out of Scope

Arbitrary code execution, indiscriminate secret exposure, accepting all unbounded input, a universal raw OBS dispatcher, or an exhaustive catalog of plugin-specific controls.

## Further Notes

Evidence: [September comparative study](https://github.com/dearlordylord/obs-mcp/blob/3c555bc090c9dba88d2bbd9e3676794e5338beab/plans/obs-comparative-study-2026-09-13/README.md), [local findings](https://github.com/dearlordylord/obs-mcp/blob/3c555bc090c9dba88d2bbd9e3676794e5338beab/plans/obs-comparative-study-2026-09-13/candidates/local.md), [independent fixture audit](https://github.com/dearlordylord/obs-mcp/blob/3c555bc090c9dba88d2bbd9e3676794e5338beab/plans/obs-comparative-study-2026-09-13/independent-review.md).

Test boundary approved by the user: freshly installed package through MCP against controlled OBS as the main seam, focused existing protocol tests where needed, and a separate isolated real OBS/client visual check before release.

Parent: [#7 — Adopt OBS competitor findings with complete traceability and release acceptance](https://github.com/dearlordylord/obs-mcp/issues/7).

Track: OBS fidelity and visual acceptance.

Depends on: [#8 — Establish OBS adoption contracts, current baseline, and maintained acceptance fixture](https://github.com/dearlordylord/obs-mcp/issues/8).

Do not start dependency-blocked implementation before prerequisite contracts are accepted. The ready-for-agent label records triage, not permission to skip dependencies or execute a future release.

Findings covered: F01, F02, F03, F48.
