# Resource Hardening Plan

Status: preplanned follow-up after `0.2.0`.

## Goal

Harden the new OBS MCP resource surface against real OBS behavior, client diversity, and operational edge cases. This is a validation and polish phase, not a rewrite.

## Workstream 1: Real OBS Payload Validation

Run resources against a live OBS websocket and capture mismatches between fake fixtures and actual OBS responses.

Priority resources:

- `obs://state/current`
- `obs://scenes`
- `obs://inputs`
- `obs://recording`
- `obs://streaming`
- `obs://outputs`
- `obs://transitions`
- `obs://profiles`
- `obs://scene-collections`
- `obs://canvases`
- `obs://hotkeys`
- `obs://events/recent`
- `obs://screenshots/latest`

Add env-gated integration assertions for:

- `resources/list`
- `resources/templates/list`
- `obs://state/current`
- one scene template read
- one input template read when an input exists
- no write requests during resource reads

## Workstream 2: Screenshot Resource Coverage

Validate both screenshot paths:

- `get_source_screenshot` records base64 metadata.
- `save_source_screenshot` records file path metadata.

Tests should verify:

- latest screenshot updates after both tools
- latest screenshot resource invalidates subscribers
- file paths stay constrained to the configured screenshot output policy
- missing latest screenshot returns a clear `InvalidParams` error

## Workstream 3: Optional Request Degradation

Add more explicit tests for partial aggregate payloads when optional OBS requests fail or are unavailable.

Targets:

- current state aggregate
- config
- canvases
- transitions
- hotkeys
- profiles and scene collections

Expected behavior:

- required request missing hides the resource
- optional request missing omits that field or records a partial diagnostic
- optional request failure does not fail the whole resource read

## Workstream 4: Resource Cache and Invalidation Tuning

Review cache behavior under high-volume OBS events.

Tests:

- repeated reads hit the cache inside TTL
- relevant OBS event invalidates the correct group
- unrelated OBS event does not invalidate
- high-volume events are debounced
- subscription update notifications are reread signals only

Decisions:

- Keep TTL short.
- Prefer correctness over cache hit rate.
- Consider centralizing OBS event invalidation if stateful HTTP sessions multiply listeners.

## Workstream 5: Resource Links from Tools

Audit tool outputs that should include resource links.

Candidates:

- scene reads and mutations link to scene resources
- input reads and mutations link to input resources
- output operations link to output resources
- screenshot tools link to `obs://screenshots/latest`
- recording and streaming tools link to status resources

Rule:

- Preserve existing structured tool outputs.
- Add MCP `ResourceLink` content as a convenience, not a replacement.

## Workstream 6: Client Compatibility

Smoke resource behavior in clients that support different resource subsets.

Client cases:

- list/read only
- list/read/templates
- subscriptions over stdio
- stateful subscriptions over HTTP after issue #2

Assertions:

- clients that ignore `ResourceLink` still see text and structured outputs
- clients that do not subscribe still get useful resources by rereading
- clients that subscribe receive standard update notifications only

## Workstream 7: Name Ambiguity and URI Design

Current templates are name-based. Keep UUID templates deferred until actual ambiguity matters.

Add UUID templates only if real-world testing shows name collisions or renamed entities make name URIs unreliable:

- `obs://scenes/by-uuid/{sceneUuid}`
- `obs://inputs/by-uuid/{inputUuid}`
- `obs://outputs/by-uuid/{outputUuid}`

Do not list every scene or input as a top-level dynamic resource unless list membership notifications become necessary and useful.

## Verification Gate

Before releasing hardening changes:

```sh
pnpm typecheck
pnpm lint
pnpm test:coverage
pnpm build
pnpm verify-readme
pnpm verify-registry-metadata
pnpm verify-version
pnpm circular
pnpm verify-protocol-parity
pnpm package-smoke
```

With real OBS available:

```sh
OBS_INTEGRATION_TESTS=1 OBS_WEBSOCKET_CONNECTION_TIMEOUT=1000 \
  pnpm exec vitest run --config vitest.integration.config.ts test/obs/real-obs.integration.test.ts
```
