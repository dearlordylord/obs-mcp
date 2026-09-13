## Problem Statement

Operators cannot reliably distinguish shipped behavior from stale architecture descriptions, and the comparative fixture contains known parsing limitations that cannot serve unchanged as a CI verdict.

## Solution

Establish current, explicit product contracts and a maintained package-level acceptance runner that reports actual MCP results and OBS state.

## User Stories

1. As a maintainer, I want a baseline at the implementation commit and installed dependency lock, so that I can distinguish new regressions from the historical study.
2. As an OBS operator, I want documentation that accurately describes available transports and controls, so that I can configure capabilities without relying on obsolete deferrals.
3. As an MCP client author, I want documented settings and image compatibility contracts, so that existing integrations continue to work as fidelity improves.
4. As a maintainer, I want acceptance assertions that compare intended and observed OBS state, so that success-shaped failures cannot pass CI.
5. As a maintainer, I want equivalent valid response forms to be interpreted correctly, so that a parser limitation does not become an invented server defect.
6. As a maintainer, I want unsupported fixture behavior to remain distinct from product failures, so that test infrastructure does not distort acceptance.
7. As a maintainer, I want every research finding linked to a work item or reasoned disposition, so that later work remains discoverable.
8. As an OBS operator, I want existing resource subscriptions and retention semantics verified, so that already implemented capabilities are preserved.

## Implementation Decisions

- Retain TypeScript/Effect, schema-first request descriptors and operations, explicit toolsets, capability filtering, and existing stdio/stateful/stateless HTTP boundaries.
- Record settings compatibility, opt-in full-fidelity access and sensitive-value policy, and native-image result compatibility before implementation lanes begin. Choose exact public names within existing conventions and record the choice in this issue.
- Use current source and lockfile for new acceptance; keep the pinned September research evidence immutable. Maintain production acceptance infrastructure separately from historical benchmark snapshots.
- Use a freshly installed package through MCP with a controlled OBS endpoint as the primary seam. Reuse existing protocol and HTTP tests for properties impractical at that seam.
- Correct semantic extraction, PNG validity, timeout observation margins, and false-success adjudication before turning research probes into CI assertions.
- Reconcile existing issue #2 against implemented stateful subscriptions and documented screenshot retention. Close or narrow it only with acceptance evidence, not from a title match.
- Track known fidelity gaps as explicit pending contracts; completing this foundation does not falsely mark those implementation gaps fixed.
- Add field-aware protocol/schema comparison that inspects actual descriptor/tool fields, reports deliberate restrictions separately, and detects newly omitted required or supported locator fields. Correct 147 request-name versus 146 exported-descriptor wording and preserve batch-only Sleep.
- Preserve static registration and existing quality/registry checks. Do not adopt a fail-safe loader that silently skips malformed local modules; these are required product modules, not optional third-party plugins.

## Testing Decisions

- Exercise real packaged entry initialization/listing, baseline scene/audio/record/image behavior, truthful errors, capability reduction, timeout and disconnect with deterministic fixture state.
- Distinguish accepted mutation state, unknown outcome, valid alternative output shape, unavailable capability, and fixture-unimplemented requests.
- Review documentation against actual tool/resource/transport contracts and confirm stateful/stateless subscription differences through existing HTTP tests.
- Prove the runner detects representative known false-success and invalid-image cases without depending on implementation module layout.
- Demonstrate that the field-aware audit detects representative missing/stripped fields and distinguishes explicit product restrictions from unsupported protocol requests.

Tests assert externally observable behavior, actual OBS state, explicit errors and bounds; they must not mirror implementation structure. Prior art is the existing packed-package smoke, real fake-OBS socket harness, MCP handler/resource tests, HTTP lifecycle tests and opt-in real OBS integration. Reuse these boundaries.

## Out of Scope

Implementing all fidelity features, changing the framework/language, native OBS integration, publishing a package, and rerunning the entire competitor census.

## Further Notes

Evidence: [September comparative study](https://github.com/dearlordylord/obs-mcp/blob/3c555bc090c9dba88d2bbd9e3676794e5338beab/plans/obs-comparative-study-2026-09-13/README.md), [local findings](https://github.com/dearlordylord/obs-mcp/blob/3c555bc090c9dba88d2bbd9e3676794e5338beab/plans/obs-comparative-study-2026-09-13/candidates/local.md), [independent fixture audit](https://github.com/dearlordylord/obs-mcp/blob/3c555bc090c9dba88d2bbd9e3676794e5338beab/plans/obs-comparative-study-2026-09-13/independent-review.md).

Test boundary approved by the user: freshly installed package through MCP against controlled OBS as the main seam, focused existing protocol tests where needed, and a separate isolated real OBS/client visual check before release.

Parent: [#7 — Adopt OBS competitor findings with complete traceability and release acceptance](https://github.com/dearlordylord/obs-mcp/issues/7).

Track: OBS fidelity and visual acceptance.

Depends on: No child prerequisite; remain within the parent scope.

Do not start dependency-blocked implementation before prerequisite contracts are accepted. The ready-for-agent label records triage, not permission to skip dependencies or execute a future release.

Findings covered: F07, F08, F14, F15, F41, F45, F58.
