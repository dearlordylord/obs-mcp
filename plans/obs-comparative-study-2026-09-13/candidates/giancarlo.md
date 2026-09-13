# Giancarlo26/obs-action-history

Observed 2026-09-13 at commit [`882c3c1c0e490bb8aa6e2f3487f6aa817a1521bb`](https://github.com/Giancarlo26/obs-action-history/tree/882c3c1c0e490bb8aa6e2f3487f6aa817a1521bb), authored 2026-08-19. Although event history and audio meters are its differentiators, its 67-tool surface directly covers the general OBS reference job. Source metadata declares version 0.1.0, Node >=22, zero runtime dependencies, and an [MIT license](https://github.com/Giancarlo26/obs-action-history/blob/882c3c1c0e490bb8aa6e2f3487f6aa817a1521bb/LICENSE). No npm publication, source tag, or GitHub release was verified; this is a source-only assessment.

## Entry and runtime evidence

The census source review ran `npm run preflight` and observed 44 well-formed module tools. I repeated it with Node 24.20.0; credential/personal-data/license/module checks passed. There is no authored behavioral test suite. The live [`server.js`](https://github.com/Giancarlo26/obs-action-history/blob/882c3c1c0e490bb8aa6e2f3487f6aa817a1521bb/server.js) adds 23 core tools to the 44 loaded by the fault-tolerant [`mcp/tools` registry](https://github.com/Giancarlo26/obs-action-history/blob/882c3c1c0e490bb8aa6e2f3487f6aa817a1521bb/mcp/tools/index.js). It initialized and listed all 67 over clean newline-delimited JSON-RPC stdio.

Commands:

```text
git clone --no-checkout https://github.com/Giancarlo26/obs-action-history.git /tmp/obs-giancarlo-1vWyaM/repo
git -C /tmp/obs-giancarlo-1vWyaM/repo checkout --detach 882c3c1c0e490bb8aa6e2f3487f6aa817a1521bb
npm run preflight
node fixture/runner.mjs --adapter adapters/giancarlo.json --output results/giancarlo
node results/giancarlo-timeout-probe.mjs
```

Frozen fixture 2026-09-13.5 observed version, scenes, mute/readback, recording start/status/stop, a complete 70-byte PNG, truthful invalid/unknown/OBS errors, capability rejection, and in-flight disconnect handling. `SetCurrentProgramScene` changed the fixture to `Main`, and `obs_list_scenes` returned `currentProgramScene: "Main"`; the runner's sole `fail` label is only its extractor not recognizing that key and is manually adjudicated P. The adapter declares the source's 15-second request timeout, giving the shared watchdog 16 seconds; the deliberately missing response returned MCP `isError:true` after about 15 seconds. A separate 17-second probe independently observed the same bounded response.

The raw escape hatch successfully requested stream-service settings and returned the synthetic stream key. This is expected behavior for its explicitly generic raw contract, which makes no redaction promise, and is not rated as accidental secret disclosure. Machine evidence: [shared result](../results/giancarlo/giancarlo.json), [runner log](../results/giancarlo-runner.log), [timeout probe](../results/giancarlo-timeout-probe.json), and [preflight](../results/giancarlo-source-check.log). Mock execution cannot establish real rendering, devices, codecs, streaming, OBS performance, or long-running event rates.

## Gates

| Gate | Result | Evidence and rationale |
|---|---:|---|
| G1 | **P** | Zero-dependency source starts, initializes with product identity/version, and lists 67 tools; preflight passes. |
| G2 | **P** | Observed requests use valid OBS v5 names and preserve scene/input identity and relevant arguments. Version, scene, invalid target, and capability probes return usable data/errors. |
| G3 | **P** | Scene and mute mutations match fixture state and readback; record lifecycle is truthful; screenshot is a valid PNG; OBS errors are MCP errors. |
| G4 | **P** | Invalid input, unknown entity, OBS rejection, unavailable request, 15-second missing reply, and in-flight disconnect all terminate truthfully. Close rejects pending requests. |
| G5 | **P** | Inspection, scene/audio mutation, recording lifecycle, and usable screenshot compose through the public MCP surface. |
| G6 | **p** | Product identity, errors, stdio, and capability behavior agree with observations. Static source review shows that the custom initializer echoes the client's requested protocol version instead of negotiating supported versions, and schemas are descriptive rather than completely enforced before OBS requests. Unsupported-version behavior was not independently executed. |

All reference-job gates except the contract caveat pass, making this a provisional rather than fully verified complete winner.

## Architecture scores

| Dimension | Rating | Rationale |
|---|---:|---|
| A Responsibility boundaries (25) | **2** | Additive domain modules and a defensive registry localize 44 tools, but active connection/event history, 23 core tools, and custom MCP transport share `server.js`. A second richer [`lib/obs.js`](https://github.com/Giancarlo26/obs-action-history/blob/882c3c1c0e490bb8aa6e2f3487f6aa817a1521bb/lib/obs.js) duplicates the active client and can drift. |
| B Protocol and state model (20) | **3** | Persistent correlation, authentication, 15-second requests, close cleanup, batches, event subscriptions, bounded meter/history reduction, scene-item identity, truthful errors, and nested settings are strong. Protocol negotiation, capability pruning, and UUID/canvas selectors remain limited. |
| C Reference and real-world fitness (15) | **4** | It completes every reference step and adds studio preview safety, output/media/filter/audio-routing controls, bounded event history, meter diagnosis, screenshots, and generic raw access with unusually concrete operational guidance. |
| D Test architecture and evidence (15) | **2** | Preflight checks packaging/security/module shape and the shared fixture provides broad success/failure execution. No authored unit, contract, or event-workflow tests exist. |
| E Changeability (15) | **3** | Registry modules, shared schema helpers, event listeners, batching, and raw fallback ease additions. Core-client duplication and the custom monolithic transport constrain deeper protocol/transport change. |
| F Operability and distribution (10) | **2** | Node >=22 with no dependencies, direct entry, explicit configuration, clean stdio, timeouts, and diagnostics are simple. It is source-only, requires manual secret setup, has no release artifact, and carries duplicated-client maintenance burden. |

Weighted architecture score: **66.25/100**. Confidence: **high** for the source and mocked protocol behavior; real OBS/event endurance remains untested.

## Changeability traces

| Change | Concrete impact trace |
|---|---|
| Add one OBS request | Prefer a new `mcp/tools/*.js` descriptor and registry load; reuse active `obs.request`; core additions otherwise enlarge `server.js`. |
| Add one nested settings kind | Add a module schema and pass the nested object unchanged through `obs.request`; validate/read back the relevant response shape. |
| Add an event-confirmed workflow | Subscribe through the active client's event path, retain only bounded derived state, and expose it from a module; avoid creating a third client. |
| Add a second MCP transport | Extract `handle`, `send`, queue, and lifecycle from `server.js` behind a transport boundary; share the tool map. |
| Add canvas identity | Add canvas/UUID selectors to schemas and request mappings, plus discovery; raw access works temporarily but is not a coherent identity model. |

Strengths worth adopting are bounded event/meter history, pending-request cleanup, module-load isolation, studio preview guidance, image content results, and explicit readback/error semantics. Avoid duplicated connection implementations, protocol-version echoing, and incomplete local enforcement of advertised schemas.
