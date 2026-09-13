## Problem Statement

Initialization and tool-count smoke checks do not establish usable OBS behavior, and the publication path does not explicitly bind publication to the tested tarball.

## Solution

Extend existing package verification to the full reference workflow and prepare publication of the exact verified artifact, with attributable registry evidence required when the maintainer authorizes release.

## User Stories

1. As an installer, I want a package that completes the advertised OBS workflow, so that successful installation means useful operation.
2. As an automation author, I want truthful failures from the installed package, so that my agent does not act on fabricated success.
3. As a maintainer, I want the tested tarball to be the published tarball, so that release rebuilding cannot bypass acceptance.
4. As an installer, I want verified published identity, version and integrity, so that I can attribute the installed artifact.
5. As a maintainer, I want supported Node versions exercised, so that dependency updates cannot silently break entry.
6. As an MCP user, I want defaults and opt-in capabilities tested separately, so that the all-toolsets test does not misrepresent defaults.
7. As a maintainer, I want clear publication failure and retry behavior, so that an interrupted attempt does not justify overwriting conflicting artifacts.
8. As a maintainer, I want visual acceptance evidence linked to a release candidate, so that real-client checks refer to the intended build.

## Implementation Decisions

- Extend the existing package smoke, Node compatibility matrix and release flow; do not introduce a parallel packaging architecture.
- Install the packed tarball in a clean consumer and execute MCP inspection, mutation/readback, recording, native image, capability/error and lifecycle assertions against controlled OBS.
- Publish the same verified tarball and compare registry integrity, identity and version afterward. Preserve exact candidate/source/dependency provenance.
- Exercise documented defaults as well as the explicit all-toolsets acceptance configuration; disclose configured timeout values.
- Use existing authenticated publication policy. Never overwrite conflicting versions or move release references to conceal failures.
- Implementation may prepare and verify artifacts; actual npm publication requires the maintainer's release authorization. Creating this planning issue is not publication authorization.

## Testing Decisions

- Run meaningful packed-process acceptance on supported Node versions; verify resulting OBS state and MCP error semantics rather than only tool counts.
- Test wrong/missing artifact identity and digest mismatches, registry lookup failures and conflicting publication states with controlled boundaries.
- Require a green existing quality gate and recorded isolated real OBS/client visual acceptance for the selected artifact; do not put real OBS into deterministic default CI.

Tests assert externally observable behavior, actual OBS state, explicit errors and bounds; they must not mirror implementation structure. Prior art is the existing packed-package smoke, real fake-OBS socket harness, MCP handler/resource tests, HTTP lifecycle tests and opt-in real OBS integration. Reuse these boundaries.

## Out of Scope

Publishing during spec creation, a native five-platform release matrix, unrelated package-manager migration, or rewriting existing authentication policy.

## Further Notes

Evidence: [September comparative study](https://github.com/dearlordylord/obs-mcp/blob/3c555bc090c9dba88d2bbd9e3676794e5338beab/plans/obs-comparative-study-2026-09-13/README.md), [local findings](https://github.com/dearlordylord/obs-mcp/blob/3c555bc090c9dba88d2bbd9e3676794e5338beab/plans/obs-comparative-study-2026-09-13/candidates/local.md), [independent fixture audit](https://github.com/dearlordylord/obs-mcp/blob/3c555bc090c9dba88d2bbd9e3676794e5338beab/plans/obs-comparative-study-2026-09-13/independent-review.md).

Test boundary approved by the user: freshly installed package through MCP against controlled OBS as the main seam, focused existing protocol tests where needed, and a separate isolated real OBS/client visual check before release.

Parent: [#7 — Adopt OBS competitor findings with complete traceability and release acceptance](https://github.com/dearlordylord/obs-mcp/issues/7).

Track: OBS fidelity and visual acceptance.

Depends on: [#8 — Establish OBS adoption contracts, current baseline, and maintained acceptance fixture](https://github.com/dearlordylord/obs-mcp/issues/8), [#9 — Preserve scene UUID and canvas identity across public tools and batches](https://github.com/dearlordylord/obs-mcp/issues/9), [#10 — Provide explicit full-fidelity filter, output, and transition settings contracts](https://github.com/dearlordylord/obs-mcp/issues/10), [#11 — Return native MCP images and define remote screenshot save semantics](https://github.com/dearlordylord/obs-mcp/issues/11).

Do not start dependency-blocked implementation before prerequisite contracts are accepted. The ready-for-agent label records triage, not permission to skip dependencies or execute a future release.

Findings covered: F12, F13, F47.
