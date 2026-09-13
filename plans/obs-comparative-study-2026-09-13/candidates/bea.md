# BEA-BOLD-EVOLUTION/obs-studio-bridge

Observed 2026-09-13 at source commit [`d1909bd397c390fb7a644ca24ff53c088e401fa3`](https://github.com/BEA-BOLD-EVOLUTION/obs-studio-bridge/tree/d1909bd397c390fb7a644ca24ff53c088e401fa3). This is an independent direct MCP entry in addition to the repository's native OBS plugin and desktop companion. The pinned root package declares version **1.6.0**, Node.js **>=20**, and MIT licensing ([`package.json`](https://github.com/BEA-BOLD-EVOLUTION/obs-studio-bridge/blob/d1909bd397c390fb7a644ca24ff53c088e401fa3/package.json), [`LICENSE`](https://github.com/BEA-BOLD-EVOLUTION/obs-studio-bridge/blob/d1909bd397c390fb7a644ca24ff53c088e401fa3/LICENSE)). The package is private and an exact npm lookup returned 404, so no published 1.6.0 package exists. Tags `v1.0.0` and `v1.3.0` exist, but no current approved installer was verified. The README says the unsigned v1.3.0 Windows installer was withdrawn after antivirus warnings ([`README.md`](https://github.com/BEA-BOLD-EVOLUTION/obs-studio-bridge/blob/d1909bd397c390fb7a644ca24ff53c088e401fa3/README.md)). Source commit attribution is BEA / `BEA-BOLD-EVOLUTION`; the MIT text names TPC Global.

## Direct MCP entry and execution boundary

[`src/server.ts`](https://github.com/BEA-BOLD-EVOLUTION/obs-studio-bridge/blob/d1909bd397c390fb7a644ca24ff53c088e401fa3/src/server.ts) creates an MCP `McpServer`, registers a `StreamableHTTPServerTransport`, and calls OBS through `obs-websocket-js`. It binds the local bridge to `127.0.0.1`, requires a bearer token of at least 32 characters, and creates a fresh stateless MCP server/transport for each HTTP request. The native plugin is not required to establish this MCP entry; the server's OBS WebSocket client is the direct bridge.

The source registers 25 tools: 21 named tools plus start/stop streaming and start/stop recording output controls. The surface includes status, scenes, sources, audio, video/performance diagnostics, virtual camera, scene/source/audio mutations, replay save, screen-share, custom workflows, and media transitions ([`src/server.ts`](https://github.com/BEA-BOLD-EVOLUTION/obs-studio-bridge/blob/d1909bd397c390fb7a644ca24ff53c088e401fa3/src/server.ts), [`src/workflows.ts`](https://github.com/BEA-BOLD-EVOLUTION/obs-studio-bridge/blob/d1909bd397c390fb7a644ca24ff53c088e401fa3/src/workflows.ts)). It does not expose a screenshot-return tool; screen sharing prepares an existing capture source and reports the prior scene.

The implementation has useful state-aware helpers. Scene switching, source visibility, mute, and volume read state before a change and verify the postcondition ([`src/scene-controls.ts`](https://github.com/BEA-BOLD-EVOLUTION/obs-studio-bridge/blob/d1909bd397c390fb7a644ca24ff53c088e401fa3/src/scene-controls.ts), [`src/audio-controls.ts`](https://github.com/BEA-BOLD-EVOLUTION/obs-studio-bridge/blob/d1909bd397c390fb7a644ca24ff53c088e401fa3/src/audio-controls.ts)). Virtual-camera controls poll after start/stop. Workflows capture scene/mute state and attempt restoration after failure. The connection is a module-global `OBSWebSocket` with a shared `connecting` promise, but the source does not add an application-level request deadline, cancellation path, event history, or UUID/canvas identity model.

## Build and safe runtime evidence

In the isolated checkout `/tmp/obs-bea.J2utm3/repo`, with no real OBS, external credentials, plugin installation, or system setup:

```text
pnpm install --frozen-lockfile --ignore-scripts
pnpm test
env -i PATH="$PATH" HOME=<study-temp-home> BRIDGE_AUTH_TOKEN=<synthetic-32-byte-token> OBS_WEBSOCKET_URL=ws://127.0.0.1:45998 BRIDGE_PORT=18787 node dist/server.js
```

The frozen install passed. `pnpm test` rebuilt TypeScript and passed all 36 Node tests. The source-built MCP entry was started with a synthetic bearer token and an unused loopback OBS URL. An authenticated HTTP initialize returned status 200 and server identity `obs-studio-bridge` version `1.1.0`; authenticated `tools/list` returned status 200 and 25 tools. Initialize/list do not call OBS, so this check did not claim an OBS mutation or fixture result. The durable summary is [`results/bea-http.json`](../results/bea-http.json). Source-build SHA-256 digests are `dist/server.js` **20d46a1c992961fcbac98e972ccd21cdcd42a3e1df39f664afde3d5d2415e277** and `dist/bootstrap.js` **2d30fec73f8de8634d29f24b1229a60883f246a8a99d539ff7371be99be51a9f**; these are not published release digests.

The package root says 1.6.0, the MCP server identity says 1.1.0, the [Codex plugin manifest](https://github.com/BEA-BOLD-EVOLUTION/obs-studio-bridge/blob/d1909bd397c390fb7a644ca24ff53c088e401fa3/.codex-plugin/plugin.json) says 1.2.0, and the native OBS manifest says 1.4.0. This version drift and the absent approved installer are release limitations. The source build and HTTP listing are observed; OBS interaction remains NT.

## Gates

| Gate | Result | Evidence and rationale |
|---|---:|---|
| G1 Reproducible entry | **P** | The pinned source installed, built, passed its own tests, started the documented HTTP MCP entry, and served authenticated initialize/tools-list responses. |
| G2 Protocol and identity correctness | **NT** | Source uses typed Zod schemas and valid OBS request names, but no shared fixture call verified argument forwarding or entity identity. |
| G3 State and result fidelity | **NT** | Source contains postcondition checks, but no scene/audio/output mutation was run against the study fixture or a real OBS instance. |
| G4 Failure and lifecycle behavior | **NT** | Source returns errors and reconnects when the WebSocket closes, but timeout, missing reply, disconnect, and recovery probes were not executed through the candidate. |
| G5 Complete reference workflow | **F** | The observed 25-tool listing and pinned source contain no screenshot-return capability. High-level screen sharing only arranges an existing capture source, so the required visual-verification step is demonstrably absent even though the rest of the job was not executed. |
| G6 Honest usable MCP contract | **p** | Authenticated initialization/listing and bearer-token enforcement were observed, but MCP identified itself as 1.1.0 while the root package declares 1.6.0, the Codex manifest 1.2.0, and native manifest 1.4.0. Error, secret, and reduced-capability probes remain NT, so the observed metadata mismatch is partial rather than a broader contract failure. |

The NT results are an HTTP-versus-stdio execution boundary rather than failures. G5 is a source/listing-proven missing reference capability. The candidate therefore cannot be a complete verified winner. No stdio adapter was prepared because the actual local MCP entry uses authenticated Streamable HTTP.

## Static architecture score

| Dimension | Rating | Rationale |
|---|---:|---|
| A Responsibility boundaries (25) | **3** | HTTP/MCP transport, OBS connection, scene/audio/output helpers, workflows, remote relay, and setup state are separate modules. The root server still owns connection state and most tool registration, and the wider native/desktop/relay product adds several deployment boundaries. |
| B Protocol and state model (20) | **3** | Zod schemas, explicit local auth, state-aware mutation/readback, output idempotence, and workflow restoration are strong. Names rather than UUID/canvas identity are used, there is no event/state history, and no application-level request deadline. |
| C Reference and real-world fitness (15) | **3** | Creator workflows cover scene/source/audio controls, recording/streaming, virtual camera, replay, performance diagnostics, and restoration. Screenshot retrieval, arbitrary source settings, and verified real-OBS behavior are absent. |
| D Test architecture and evidence (15) | **2** | The 36 own tests exercise helpers, postconditions, setup, security metadata, and workflow contracts with fakes. No shared black-box fixture, live OBS test, or failure/lifecycle run was executed. |
| E Changeability (15) | **3** | Focused helpers make scene/audio/output changes local, and workflow schemas are typed. A new request still crosses root registration, OBS mapping, remote allowlists, workflow policy, and native/desktop packaging where applicable. |
| F Operability and distribution (10) | **2** | Localhost binding, bearer authentication, setup persistence, tests, and a source build are concrete. The root/package/MCP versions disagree, the package is private, and an approved Windows installer is unavailable after the unsigned v1.3.0 installer was withdrawn. |

Static weighted total: **68.75/100**. This is an architecture indication with medium confidence, not a gate-eligible ranking; all dimensions that depend on shared OBS execution remain bounded by the NT gate record.

## Changeability traces and lessons

* **One OBS request:** add the typed handler and mapping in `src/server.ts` or a focused helper, then update remote allowlists, tests, and any workflow policy. The shared `obsCall` keeps connection ownership centralized but also concentrates coupling.
* **One nested settings kind:** add a Zod schema plus explicit OBS mapping/readback; there is no generic arbitrary-settings escape hatch. Tests should cover unknown fields and postconditions.
* **An event-confirmed workflow:** add event subscriptions and bounded correlation to the current request-only connection model, then expose the workflow and recovery policy. The current workflow loops poll media state instead of consuming an event history.
* **A second MCP transport:** the HTTP transport is created per request and the repository also has a relay/client boundary; a new transport needs authentication and lifecycle policy at the server boundary.
* **Canvas identity:** introduce UUID/canvas fields through scene/source selectors and every postcondition; current helpers accept names and scene-item IDs only.

Worth carrying forward are state-before/state-after mutation helpers, bounded schemas, local bearer authentication, explicit creator confirmation boundaries, and reverse-order workflow restoration. The hosted layer adds a smaller remote allowlist than the local bridge, account-owned device routing, read-only dual-PC readiness before mutation, persistent sessions that record completed steps, immediate compensation, and reverse-order restoration. It distinguishes OBS readiness, readiness to start Virtual Camera, and readiness for an external app preview ([coordinator](https://github.com/BEA-BOLD-EVOLUTION/obs-studio-bridge/blob/d1909bd397c390fb7a644ca24ff53c088e401fa3/relay/src/production-coordinator.js), [readiness model](https://github.com/BEA-BOLD-EVOLUTION/obs-studio-bridge/blob/d1909bd397c390fb7a644ca24ff53c088e401fa3/relay/src/dual-pc.js)). It also avoids claiming that transport-independent OBS snapshots prove the inter-PC signal or that Virtual Camera means a platform is live. The study should avoid treating a source-built private package as a release, treating a high-level screen-share workflow as screenshot evidence, or equating an MCP listing with verified OBS behavior.
