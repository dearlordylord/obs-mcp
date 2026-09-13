# Tom-R-Main/OBS-MCP: architecture and executed behavior

Observed 2026-09-13. Source pinned to [`df584ddbcf117ed82ac5c232d82f128baec8292a`](https://github.com/Tom-R-Main/OBS-MCP/tree/df584ddbcf117ed82ac5c232d82f128baec8292a); declared package version **1.1.1**. License provenance: GPL-2.0-only (LICENSE, SPDX headers, package, NOTICE); [license](https://github.com/Tom-R-Main/OBS-MCP/blob/df584ddbcf117ed82ac5c232d82f128baec8292a/LICENSE), [package](https://github.com/Tom-R-Main/OBS-MCP/blob/df584ddbcf117ed82ac5c232d82f128baec8292a/package.json). Fresh isolated checkout `/tmp/obs-study-ts/tom`. Runtime Node **24.20.0**, npm **11.19.0**, Linux arm64. Source review, maintainer claims, observed execution, and inferences are distinguished below.

All process runs use the shared loopback OBS v5 fixture, synthetic credentials, an allowlisted environment, isolated HOME, and the pinned source/build. No real OBS rendering, device behavior, codecs, live streams, platform capture, or latency was tested. No candidate code was repaired. Adapters map only public launch/tool arguments. Harness-obsolete initial traces are retained explicitly and excluded from final verdicts.

This independent continuation of Royshil has stronger connection ownership, protocol discovery, capability negotiation, and publication clarity. The generic request tool provides useful identity and screenshot escape routes. However, many inherited named wrappers still repeat mappings and the screenshot wrapper still truncates its payload. Full request inventory coverage is not equivalent to complete semantic coverage.

## Distribution and own tests

**Observed:** `npm ci --ignore-scripts`, `npm run build`, `npm run test`, and `npm run validate:manifest` all exit0, constituting the stages of the documented `npm run check`. Nine tests cover CLI existence/mode, pinned request inventory, annotations and public MCP inventory/protocol negotiation, single-flight connection/identification, response correlation, and capability refusal. These are useful boundaries, but there is no own screenshot fidelity test and only two own wire-client tests. [Build](../results/tom-build.log), [tests](../results/tom-test.log), [manifest](../results/tom-manifest.log), [client tests](https://github.com/Tom-R-Main/OBS-MCP/blob/df584ddbcf117ed82ac5c232d82f128baec8292a/src/client.test.ts), [tool tests](https://github.com/Tom-R-Main/OBS-MCP/blob/df584ddbcf117ed82ac5c232d82f128baec8292a/src/tools/tools.test.ts).

**Verified identity:** source package1.1.1 and matching runtime version module; README explicitly says it has **no independent npm release**. `obs-mcp@latest` belongs to the separate historical artifact and must not be used as Tom's entry. Source entry is `node /tmp/obs-study-ts/tom/build/index.js`. The MCPB pack script rebuilds, derives tool inventory via public MCP, stages source/license and production dependencies, and packs locally; manifest validation was executed, complete packaging was not. [README](https://github.com/Tom-R-Main/OBS-MCP/blob/df584ddbcf117ed82ac5c232d82f128baec8292a/README.md), [version](https://github.com/Tom-R-Main/OBS-MCP/blob/df584ddbcf117ed82ac5c232d82f128baec8292a/src/version.ts), [pack script](https://github.com/Tom-R-Main/OBS-MCP/blob/df584ddbcf117ed82ac5c232d82f128baec8292a/scripts/pack.mjs), [NOTICE](https://github.com/Tom-R-Main/OBS-MCP/blob/df584ddbcf117ed82ac5c232d82f128baec8292a/NOTICE.md). Primary GitHub releases HTML yielded no tagged releases; API403 prevented independent API enumeration.

## Architecture and changeability

**Static evidence:** `server.ts` has a `createServer` factory, a single OBS client, one in-flight connection promise, one reconnect timer with bounded backoff, and explicit shutdown. `client.ts` correlates requests, waits for identification, discovers availableRequests using GetVersion, rejects unavailable calls, and clears pending requests on disconnect. `obs-protocol.ts` reads bundled official request metadata. `tools/request-tool.ts` centralizes generic registration/results; `protocol-extensions.ts` uses it with reusable scene/input selectors. Most older category wrappers still have their own schemas, destructuring and error formatting. [Server](https://github.com/Tom-R-Main/OBS-MCP/blob/df584ddbcf117ed82ac5c232d82f128baec8292a/src/server.ts), [client](https://github.com/Tom-R-Main/OBS-MCP/blob/df584ddbcf117ed82ac5c232d82f128baec8292a/src/client.ts), [protocol](https://github.com/Tom-R-Main/OBS-MCP/blob/df584ddbcf117ed82ac5c232d82f128baec8292a/src/obs-protocol.ts), [request registration](https://github.com/Tom-R-Main/OBS-MCP/blob/df584ddbcf117ed82ac5c232d82f128baec8292a/src/tools/request-tool.ts), [extensions](https://github.com/Tom-R-Main/OBS-MCP/blob/df584ddbcf117ed82ac5c232d82f128baec8292a/src/tools/protocol-extensions.ts).

**Concrete change traces (inference):**

- One OBS request: update bundled `docs/protocol.json` and associated coverage expectation; the generic `obs-call-request` works once the request is in that inventory and advertised by OBS. An ergonomic wrapper adds one registration in a category or `protocol-extensions.ts`. It is not dynamically unconstrained protocol execution.
- One nested settings kind: opaque `z.record(z.string(), z.any()/z.unknown())` preserves nested unknown data; existing category wrappers need no edit for a new opaque setting. Adding semantic defaults requires a localized wrapper and behavioral tests.
- Event-confirmed workflow: client event emission exists; add an orchestration responsibility above it for event identity, timeout/cancellation and disconnect policy. Raw request success alone is still acknowledgement.
- Second MCP transport: reuse `createServer` and shared OBS client; edit transport startup/shutdown in `server.ts`. Lifecycle is less coupled than Roy's, but process-global state and process.exit still need attention for embedding.
- Canvas identity: newer `sceneSelector` includes canvasUuid/sceneUuid and generic forwarding preserves them. Older named scene/input wrappers retain name-only destructuring, so complete ergonomic support requires edits in those category modules rather than just the common selector. Extended calls demonstrate both limitation and generic escape route.

## Independent strengths and avoidances

Adopt public-protocol metadata discovery, runtime capability checking, single-flight connection ownership, testable wire client, reproducible manifest inventory, and explicit independent fork/release provenance. Avoid using request-count assertions as a substitute for argument/output contracts; a complete registry coexists here with a broken named screenshot wrapper. The broad protocol interface does not establish high-level production workflows.

## Executed gates and weighted ratings

Final evidence: [named-tool run](../results/tom.json), [generic-image workflow](../results/tom-generic.json), [extended settings/UUID/canvas/file-image execution](../results/tom-extended.json), [unavailable supplement](../results/tom-unavailable.json). The generic-image variant changes only public `getSourceScreenshot` mapping to `obs-call-request` with `requestType:GetSourceScreenshot`; it does not repair the server. Core readbacks include ordinary prose as well as JSON and were checked for actual state values. No stdout protocol noise was observed.

The named stream-service settings tool returns the synthetic stream-key field unredacted, while the connection password was not observed in ordinary logs/results. Treat this as an explicit raw-settings inspection surface with a sensitive output, not proof it leaks every credential spontaneously. The documented generic tool also explicitly declares unrestricted/destructive request semantics. Neither observation erases the independent screenshot contract defect.

| Gate | Verdict | Observed basis |
|---|---|---|
| G1 | P | Locked install/build/check stages and actual MCP initialization/listing pass. |
| G2 | P | Core mappings, nested input/filter/output/transition settings, generic UUID/canvas forwarding and canvas inspection work in the tested surface. Name-only older wrappers are a documented schema limitation; generic forwarding supplies the alternative. |
| G3 | F | Scene/mute/record/settings readbacks are truthful, but the named screenshot deliberately returns only100 characters of the data URL as successful output. |
| G4 | P | Invalid args/entity, injected OBS error,10s missing-response error, in-flight disconnect and capability-rejected unavailable request all terminate truthfully. |
| G5 | P | Full core workflow succeeds using the public generic screenshot request, which returns complete decodable PNG bytes; file-save alternative also verified. |
| G6 | F | Normal advertised screenshot tool is unusable despite a valid generic alternative. Runtime version, annotations, registration and stdio otherwise agree with observations. |

The generic-image run passes the common probes; this is not a blanket pass for every advertised named tool. G3/G6 prevent a complete interface winner designation under the frozen rules.

| Dimension | Rating | Evidence-backed rationale |
|---|---:|---|
| A (25) | 3 | Clearer server factory/client/protocol/registration boundaries and single connection ownership; inherited repetitive category handlers remain. |
| B (20) | 2 | Strong capability negotiation, correlation, generic identity/settings fidelity, but named image corruption and uneven selector support keep the state/contract model below consistently strong. |
| C (15) | 3 | Full reference job via explicit generic/file alternatives; broad settings and canvas support. Normal image wrapper and absence of event-confirmed workflows limit fitness. |
| D (15) | 3 | Useful authored loopback client, public MCP negotiation/inventory and protocol tests all execute; shared adverse and fidelity probes expose gaps absent from those tests. |
| E (15) | 3 | Protocol inventory and generic registration localize additions; common selectors help newer tools. Legacy wrappers, event workflows and embedding still require coordinated changes. |
| F (10) | 3 | Exact dependencies, correct fork/release guidance, source entry, version centralization and validated manifest. Full desktop package build/install and real OBS deployment remain unverified. |

Weighted total **70/100**. Scope-relative result: a stronger broad protocol-oriented architecture with usable escape hatches, but inventory completeness does not guarantee each normal tool's correctness. Confidence medium.

Evaluation boundary: this review executes the README/package-documented TypeScript/Node entry. Repository `py_src` is a secondary implementation and was not separately built or scored.
