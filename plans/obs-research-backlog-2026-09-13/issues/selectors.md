## Problem Statement

Users cannot select some intended scenes or canvases because three official selector fields are absent from the public interface.

## Solution

Support the missing selectors consistently from listed schema through request dispatch and observable result.

## User Stories

1. As an OBS operator, I want scene listing scoped by canvas UUID, so that I inspect the intended canvas.
2. As an OBS operator, I want input creation on a canvas selected with a scene name, so that the input is created in the intended place.
3. As an OBS operator, I want program-scene selection by scene UUID, so that renamed or ambiguous names do not select the wrong entity.
4. As an automation author, I want batch and ordinary scene selection to follow the same locator contract, so that composition does not lose identity.
5. As an MCP client author, I want listed schemas to describe valid selector combinations, so that I can construct valid calls.
6. As an OBS operator, I want invalid or unsupported selectors to fail explicitly, so that the server does not silently fall back to another scene.
7. As an existing client author, I want valid name-based requests to remain compatible, so that upgrading does not break established workflows.

## Implementation Decisions

- Add canvasUuid to list_scenes and name-based create_input, and sceneUuid to set_current_scene.
- Propagate supported locators through domain schemas, descriptors, operations, tools, relevant resources, and batch setters.
- Follow the pinned official request's locator rules; do not invent uniform name/UUID precedence where request semantics differ.
- Retain capability filtering and existing name-based contracts. Report unsupported behavior truthfully without dropping supplied identity.

## Testing Decisions

- Through packaged MCP, assert exact outgoing fields and independently verify the selected/created entity in a multi-canvas, duplicate-name fixture.
- Cover UUID-only, supported name/canvas combinations, name compatibility, invalid combinations, and corresponding batch behavior.
- Use focused batch/protocol tests when necessary; do not pretend the historical fixture already implements complete batch semantics.

Tests assert externally observable behavior, actual OBS state, explicit errors and bounds; they must not mirror implementation structure. Prior art is the existing packed-package smoke, real fake-OBS socket harness, MCP handler/resource tests, HTTP lifecycle tests and opt-in real OBS integration. Reuse these boundaries.

## Out of Scope

New canvas-management families, native process identity, broad scene editing, or a generic raw request escape hatch.

## Further Notes

Evidence: [September comparative study](https://github.com/dearlordylord/obs-mcp/blob/3c555bc090c9dba88d2bbd9e3676794e5338beab/plans/obs-comparative-study-2026-09-13/README.md), [local findings](https://github.com/dearlordylord/obs-mcp/blob/3c555bc090c9dba88d2bbd9e3676794e5338beab/plans/obs-comparative-study-2026-09-13/candidates/local.md), [independent fixture audit](https://github.com/dearlordylord/obs-mcp/blob/3c555bc090c9dba88d2bbd9e3676794e5338beab/plans/obs-comparative-study-2026-09-13/independent-review.md).

Test boundary approved by the user: freshly installed package through MCP against controlled OBS as the main seam, focused existing protocol tests where needed, and a separate isolated real OBS/client visual check before release.

Parent: [#7 — Adopt OBS competitor findings with complete traceability and release acceptance](https://github.com/dearlordylord/obs-mcp/issues/7).

Track: OBS fidelity and visual acceptance.

Depends on: [#8 — Establish OBS adoption contracts, current baseline, and maintained acceptance fixture](https://github.com/dearlordylord/obs-mcp/issues/8).

Do not start dependency-blocked implementation before prerequisite contracts are accepted. The ready-for-agent label records triage, not permission to skip dependencies or execute a future release.

Findings covered: F04, F05, F06, F44.
