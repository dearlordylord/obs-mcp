# royshil/obs-mcp: architecture and executed behavior

Observed 2026-09-13. Source pinned to [`314e7c065ef8c5e2656757b35b24ea7fa81489b0`](https://github.com/royshil/obs-mcp/tree/314e7c065ef8c5e2656757b35b24ea7fa81489b0); declared package version **1.0.1**. License provenance: GPL-2.0 (LICENSE; package omits license field); [license](https://github.com/royshil/obs-mcp/blob/314e7c065ef8c5e2656757b35b24ea7fa81489b0/LICENSE), [package](https://github.com/royshil/obs-mcp/blob/314e7c065ef8c5e2656757b35b24ea7fa81489b0/package.json). Fresh isolated checkout `/tmp/obs-study-ts/royshil`. Runtime Node **24.20.0**, npm **11.19.0**, Linux arm64. Source review, maintainer claims, observed execution, and inferences are distinguished below.

All process runs use the shared loopback OBS v5 fixture, synthetic credentials, an allowlisted environment, isolated HOME, and the pinned source/build. No real OBS rendering, device behavior, codecs, live streams, platform capture, or latency was tested. No candidate code was repaired. Adapters map only public launch/tool arguments. Harness-obsolete initial traces are retained explicitly and excluded from final verdicts.

The documented broad OBS-control server has useful category boundaries but inherits repetitive manually mapped handlers. Its most important weakness is output correctness: the screenshot tool deliberately truncates the data URL, and its transition-settings getter calls a nonexistent OBS request. These are failures in advertised capabilities, not penalties for a narrower product scope.

## Distribution and own tests

**Observed:** `npm ci --ignore-scripts`, `npm run build`, and `npm run test` exit 0. Its two tests establish only that `build/index.js` exists and is executable; they do not exercise OBS or MCP behavior. See [install](../results/royshil-install.log), [build](../results/royshil-build.log), [tests](../results/royshil-test.log), and [test source](https://github.com/royshil/obs-mcp/blob/314e7c065ef8c5e2656757b35b24ea7fa81489b0/src/index.test.ts).

The README recommends `npx -y obs-mcp@latest`. Independently fetched npm metadata identifies **obs-mcp@1.1.0**, published 2025-08-26, tarball SHA1 `04bc7b4fb43cfacc6ecc84f9969b23e322c8a6dd`; package metadata has no repository field. Attribution comes from the pinned README's explicit install name and the package README/source correspondence, not a repository field. Registry latest is not the source's 1.0.1. We downloaded/extracted the registry artifact, verified SHA1, inspected entry/scripts, installed production dependencies with `npm install --omit=dev --ignore-scripts`, and executed it separately. [Registry](https://registry.npmjs.org/obs-mcp), [observed metadata](../results/royshil-publication.json), [artifact install](../results/royshil-published-install.log).

**Observed artifact comparison:** 14 generated category/index/entry modules are byte-identical; client/server/general/test output differ. The published client lacks source connection status helpers and the published server lacks the source's reconnect machinery. Neither artifact should receive credit for the other's lifecycle design. MCP identity is also hardcoded 1.0.0 rather than the package version. [Comparison hashes](../results/royshil-source-package-diff.json), [source server](https://github.com/royshil/obs-mcp/blob/314e7c065ef8c5e2656757b35b24ea7fa81489b0/src/server.ts), [README](https://github.com/royshil/obs-mcp/blob/314e7c065ef8c5e2656757b35b24ea7fa81489b0/README.md). GitHub release-page extraction found no tagged release; the API returned rate-limit403, so this is not proof no release ever existed.

## Architecture and changeability

**Static evidence:** `index.ts` installs process handlers; `server.ts` owns singleton OBS/MCP instances and reconnect/shutdown; `client.ts` owns wire framing/authentication/correlation and events; category `tools/*.ts` files register schemas and translate results/errors. Dependencies point from server into client/tools, and tools accept a client argument, which is useful. However, every handler repeats try/catch/text formatting and mappings, and the server maintains overlapping periodic connection/reconnect timers plus another timeout around client.connect. Each successful reconnect adds a disconnected listener. This raises lifecycle change risk beyond the small number of files. [Server](https://github.com/royshil/obs-mcp/blob/314e7c065ef8c5e2656757b35b24ea7fa81489b0/src/server.ts), [client](https://github.com/royshil/obs-mcp/blob/314e7c065ef8c5e2656757b35b24ea7fa81489b0/src/client.ts), [registration](https://github.com/royshil/obs-mcp/blob/314e7c065ef8c5e2656757b35b24ea7fa81489b0/src/tools/index.ts).

**Concrete change traces (inference from code):**

- One OBS request: edit the appropriate category file with schema, OBS name, forwarding, response and error formatting. A new category additionally changes `tools/index.ts`. There is no protocol-derived check to catch a misspelled name.
- One nested settings kind: existing `z.record(z.any())` input/filter/output/transition surfaces already pass arbitrary nested data. No new schema is required for a new opaque OBS kind; user-facing specialization would belong in the relevant category. Extended execution confirms preservation rather than assuming it from types.
- Event-confirmed workflow: client already emits named OBS events, but a new orchestration layer must own listener subscription/unsubscription, timeout, competing-event identity and disconnect cancellation. Current success means request acknowledgement, not event confirmation.
- Second MCP transport: split singleton creation/registration out of `server.ts`; avoid creating another OBS connection per transport, and centralize lifecycle. CLI shutdown currently exits the process directly.
- Canvas identity: update schemas and explicit destructuring/forwarding in scenes, inputs, scene-items, sources and related categories. Adding one optional field centrally is insufficient because existing callbacks reconstruct request objects. The extended named scene probe drops extra canvas/UUID arguments, while a UUID-only input lookup fails its name-required schema.

## Independent strengths and avoidances

Adopt the straightforward client/category separation and opaque nested settings preservation. Avoid hand-maintained protocol names without contract tests, success-shaped truncated image strings, duplicate lifecycle timers, and inferring release behavior from the source checkout. No special streaming platform, event-confirmed workflow, resources, or alternate transport advantage was established.

## Executed gates and weighted ratings

Final evidence: [source MCP/OBS trace](../results/royshil.json), [published artifact trace](../results/royshil-published.json), [extended settings/identity/file-image trace](../results/royshil-extended.json), [unavailable-request supplement](../results/royshil-unavailable.json). The supplement establishes a successful scene read before requesting a removed screenshot operation, avoiding confusion between an offline error and unsupported-request handling. Ordinary stdout was valid JSON-RPC; diagnostics went to stderr. The named stream-service settings getter returned the synthetic stream-key field verbatim. This is a raw settings exposure, distinct from the WebSocket login password; its risk depends on the requested raw-settings contract and is not the sole G6 failure.

| Gate | Verdict | Observed basis |
|---|---|---|
| G1 | P | Fresh locked source build initializes/lists, and separately obtained npm1.1.0 initializes/lists. |
| G2 | F | Core OBS mappings work, but advertised transition getter sends nonexistent `GetCurrentSceneTransitionSettings` and receives204. |
| G3 | F | Scene, mute and record readbacks agree with fixture state; nested input/filter/output settings preserve data. Named screenshot returns truncated bytes as a successful text result. |
| G4 | P | Invalid args, unknown scene, injected scene rejection, missing response at10s, disconnect and authenticated unavailable-request supplement return bounded errors. Reconnect convergence and malformed handshake races were not exhaustively tested. |
| G5 | P | Inspection/mutations/record lifecycle plus **alternative** `obs-save-source-screenshot` returns a path containing the exact complete fixture PNG. This requires same-host file access; the named image-returning tool cannot supply usable bytes. |
| G6 | F | Advertised screenshot content is unusable, transition getter is invalid, runtime/package version identity differs. Stdio integrity itself passes. |

The source and published artifact both fail the named screenshot probe. Published-package timeout/disconnect/unavailable behavior was independently exercised; source-only reconnection machinery is not credited to it. No complete reference-job winner eligibility because G2/G3/G6 fail.

| Dimension | Rating | Evidence-backed rationale |
|---|---:|---|
| A (25) | 2 | Distinct CLI/server/client/category modules and injected client, but repetitive handlers and overlapping lifecycle timers. |
| B (20) | 2 | Correlation, request errors/timeouts and opaque settings are workable; invalid request, image truncation, name-only selectors and no capability negotiation are material gaps. |
| C (15) | 2 | Core job works with an explicit file-image alternative; normal visual verification and transition inspection are unreliable. |
| D (15) | 1 | Authored tests only assert packaging. Shared external success/failure/settings traces add evidence but do not create an internal testing architecture. |
| E (15) | 2 | Requests/settings changes localize to category modules; event workflows, transport embedding and canvas support cut across existing boundaries. |
| F (10) | 2 | Fresh build/package work and basic configuration is simple; source/package version and lifecycle divergence complicate attribution and support. |

Weighted total **46.25/100**. Scope-relative result: broad controller with useful primitives, not dependable as a complete advertised interface. Confidence medium: direct finite black-box evidence and pinned source; no real OBS.

Evaluation boundary: this review executes the README/package-documented TypeScript/Node entry. Repository `py_src` is a secondary implementation and was not separately built or scored.
