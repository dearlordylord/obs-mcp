## Problem Statement

Complete screenshot bytes are currently embedded in JSON, and save validation assumes compatible MCP/OBS filesystems, limiting reliable visual verification.

## Solution

Let supported clients consume bounded native MCP image results while preserving the agreed metadata contract and making save-location semantics explicit.

## User Stories

1. As an OBS operator, I want a screenshot directly consumable by my MCP client, so that I can verify what OBS is showing.
2. As an MCP client author, I want complete image content and MIME metadata, so that I do not need custom JSON-base64 extraction.
3. As an existing client author, I want compatible documented screenshot metadata, so that upgrading does not break resource consumers.
4. As a remote OBS operator, I want clear destination-host semantics for saved images, so that a path check on one machine is not mistaken for a write on another.
5. As an OBS operator, I want bounded image sizes and retention, so that visual checks do not create unbounded memory or files.
6. As an OBS operator, I want truthful unsupported-format and capture failures, so that I can choose a supported alternative.
7. As an MCP client author, I want consistent tool and latest-screenshot resource behavior, so that I can correlate visual evidence with its capture.
8. As a maintainer, I want a recorded real OBS/client acceptance result, so that mock image validity is not mistaken for rendering proof.

## Implementation Decisions

- Use native MCP image tool content as the selected first-milestone path, with existing metadata retained compatibly. Preserve the existing latest-screenshot metadata resource and retention ownership; do not create a second image-retention surface.
- Preserve complete bounded content, MIME metadata, configured toolsets and capability gating. Keep existing latest-screenshot resource lifetime explicit.
- Define local/shared/remote filesystem behavior and truthful unsupported cases. Do not treat a local path check as proof of a remote OBS save.
- Keep currently supported formats explicit; investigate capability-based format expansion only against a demonstrated supported format.
- Retain path boundaries and bounded retention; document any opt-in filesystem assumptions.

## Testing Decisions

- Through packaged MCP verify full image decoding, dimensions/content where applicable, payload bounds, malformed image rejection, tool/resource consistency and unsupported capabilities.
- Reuse existing HTTP/resource tests for lifetime and transport semantics instead of creating parallel retention test infrastructure.
- Before release, run an isolated real OBS capture with an actual supported MCP client and record that the image is consumable. Test the claimed save topology separately.

Tests assert externally observable behavior, actual OBS state, explicit errors and bounds; they must not mirror implementation structure. Prior art is the existing packed-package smoke, real fake-OBS socket harness, MCP handler/resource tests, HTTP lifecycle tests and opt-in real OBS integration. Reuse these boundaries.

## Out of Scope

Visual AI judgments, automatic image-diff policy, unbounded screenshot history, OS-wide capture, or cross-platform window-management promises.

## Further Notes

Evidence: [September comparative study](https://github.com/dearlordylord/obs-mcp/blob/3c555bc090c9dba88d2bbd9e3676794e5338beab/plans/obs-comparative-study-2026-09-13/README.md), [local findings](https://github.com/dearlordylord/obs-mcp/blob/3c555bc090c9dba88d2bbd9e3676794e5338beab/plans/obs-comparative-study-2026-09-13/candidates/local.md), [independent fixture audit](https://github.com/dearlordylord/obs-mcp/blob/3c555bc090c9dba88d2bbd9e3676794e5338beab/plans/obs-comparative-study-2026-09-13/independent-review.md).

Test boundary approved by the user: freshly installed package through MCP against controlled OBS as the main seam, focused existing protocol tests where needed, and a separate isolated real OBS/client visual check before release.

Parent: [#7 — Adopt OBS competitor findings with complete traceability and release acceptance](https://github.com/dearlordylord/obs-mcp/issues/7).

Track: OBS fidelity and visual acceptance.

Depends on: [#8 — Establish OBS adoption contracts, current baseline, and maintained acceptance fixture](https://github.com/dearlordylord/obs-mcp/issues/8).

Do not start dependency-blocked implementation before prerequisite contracts are accepted. The ready-for-agent label records triage, not permission to skip dependencies or execute a future release.

Findings covered: F09, F10, F11, F43.
