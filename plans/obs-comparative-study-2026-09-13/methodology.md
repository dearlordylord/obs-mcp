# OBS MCP comparative evaluation: fixed methodology

Frozen before candidate scoring on 2026-09-13. This study extends the earlier update scan using the approach recorded in `../crap4ts/research/2026-08-25-alternative-implementations.md`. Amendments must be dated and explained; do not silently change gates after observing a candidate.

## Question and reference job

Which available implementation is a dependable MCP interface for OBS Studio, which has the strongest internal architecture, and which independent strengths should inform this project's next work?

The reference job is an agent-assisted recording/streaming setup and control session:

1. Install or build the attributable artifact and initialize an MCP session.
2. Discover OBS capabilities and inspect scenes, inputs, and output state.
3. Select the correct scene/source, change scene visibility or audio state, and observe the actual result.
4. Start and stop recording with truthful state and failure reporting.
5. Obtain a usable screenshot for visual verification.
6. Handle invalid arguments, unavailable requests, OBS errors, and connection loss without inventing success or hanging indefinitely.
7. Compose these operations with reproducible schemas and outputs appropriate to an MCP client.

This is a general OBS-control reference job, not a requirement that every niche product implement it. Direct implementations receive both general-job gate results and an assessment against their declared scope. Adjacent live-production products and distribution wrappers are assessed separately and cannot win the direct-server ranking merely by having more features.

Official OBS protocol and MCP specifications define protocol semantics. Competitor source is evidence of behavior and architecture, not an implementation source. No points for stars, repository size, implementation language, recency, tool count alone, or visual polish.

## Candidate census

The bounded initial census is the established June index plus the September discovery pass: Royshil, cdavis/@unngh, Sbroenne, Agentic OBS, Lars, Takurot, YSHK, Aaron, Tom-R-Main, JLFN, xDarkzx, and ITchrisDEB. The local project is evaluated by the same rules as a thirteenth implementation. ITchrisDEB's Linux-specific product is additionally assessed as adjacent. OBS Live Suite and MoltStream are adjacent products; the Claude plugin is a wrapper. Registry mirrors, observability name collisions, and unavailable Stream Pilot are documented exclusions. A final search checks for significant omissions and records inclusion/exclusion reasons.

Every candidate record must include full commit SHA, source URL, observed date, declared version, independently verified publication identity/version, license provenance, runtime, and commands attempted. Repository source and published package can differ; do not silently treat them as equivalent.

### Census amendment, 2026-09-13

The final omission search found additional direct implementations: `dcc-mcp/dcc-mcp-obs`, `LHenri88/obs-mcp`, `sid-fou/obs-stream-mcp`, `muhammadumarakram1/mcp-obs-websocket`, `Giancarlo26/obs-action-history`, and `BEA-BOLD-EVOLUTION/obs-studio-bridge`. These receive the same candidate review and fixed gates/weights, bringing the review set to 18 external implementations plus local. Their platform/native-plugin dependencies may limit executable evidence; NT remains distinct from failure. Giancarlo initially appeared specialist-only, but source review established a general MCP control surface as well; it therefore receives both direct scoring and deeper event-history analysis. BEA also has an independent local MCP bridge alongside its broader hosted creator product; it receives direct scoring despite the unavailable Windows installer. Its HTTP/native/hosted execution boundaries remain explicit. This expands coverage only; no gate, rating anchor, fixture assertion, or weighting changes in response to results. Search limits and exclusions remain explicit in [the census](study/census.md).

## Viability gates

Record **P** (observed pass), **p** (partial), **F** (demonstrated failure or absent required reference-job capability), or **NT** (not testable with the obtained environment/evidence). An unsupported capability may fail the general job without contradicting the candidate's narrower documented purpose. An environmental build blocker is NT unless attributable to the documented product entry itself. Claims and static evidence alone cannot earn an observed runtime pass.

| Gate | Requirement | Shared execution evidence |
|---|---|---|
| G1 Reproducible entry | Documented artifact/build starts and serves a valid MCP initialization and tool listing. | Exact install/build/launch commands, exit status, initialize/tools-list exchange. |
| G2 Protocol and identity correctness | Calls map to valid OBS requests, preserve relevant arguments and entity identity, and return usable data. | Version/scenes, scene switch, argument forwarding, invalid/unknown targets; identity probes where advertised. |
| G3 State and result fidelity | A successful mutation corresponds to observed OBS state; errors and unknown/unavailable information do not become success. | Scene, mute, record start/status/stop, injected OBS errors. Settings and image payload probes provide additional fidelity evidence. |
| G4 Failure and lifecycle behavior | Invalid input, unsupported requests, timeouts, and disconnects terminate or recover truthfully with bounded behavior. | Invalid args, an OBS error, an unavailable request, delayed/missing reply, and disconnection. Automatic reconnect is a scored enhancement; a prompt truthful disconnected error can pass. |
| G5 Complete reference workflow | Inspection, scene/audio mutation, recording lifecycle, and usable screenshot can be composed through MCP. | Shared job sequence and complete decodable screenshot. A wrapper/code-mode tool is acceptable if it completes the same job. |
| G6 Honest usable MCP contract | Advertised capabilities, schemas, output/error semantics, and install claims agree with observations; ordinary use does not disclose fixture credentials or corrupt stdio. | Listing/schema checks, stdout parsing, synthetic-secret probe, source-versus-runtime discrepancies. An explicit opt-in secret/raw surface is evaluated according to its stated contract. |

Any F disqualifies a candidate as a complete reference-job winner. Any NT or p prevents calling it a fully verified complete winner; provisional candidates may still be ranked for architecture. Passing these finite probes does not establish complete OBS/MCP conformance or real OBS integration.

## Weighted architecture rubric

Each dimension is rated 0–4. Weighted total = sum(weight × rating / 4), maximum 100. Scores require a short evidence-backed rationale per dimension.

| Dimension | Weight | Evaluation |
|---|---:|---|
| A Responsibility boundaries | 25 | CLI/transport, OBS connection, request mapping, domain policy, resources/workflows, filesystem/process concerns; dependency direction and connection ownership. |
| B Protocol and state model | 20 | Entity identity, capability negotiation, settings fidelity, truthful errors/unknowns, schemas, event/state semantics and boundedness. |
| C Reference and real-world fitness | 15 | User-job completeness, OBS/platform differences, stream/record semantics, workflow composition, stable outputs, explicit defaults/policy. |
| D Test architecture and evidence | 15 | Unit/contract/application/failure test quality, meaningful fake-versus-real distinction, executed own tests and shared black-box fixture; counts alone earn no points. |
| E Changeability | 15 | Reasoned impact of adding one OBS request, one nested settings kind, an event-confirmed workflow, a second MCP transport, and canvas identity. Trace affected modules; do not implement changes. |
| F Operability and distribution | 10 | Documented fresh entry, artifact attribution, client setup, configuration/diagnostics, release reproducibility, platform assumptions, shutdown and maintenance burden. |

Rating anchors: 0 absent/fundamentally unsound; 1 substantial coupled/incorrect gaps; 2 workable with material limitations; 3 strong with localized limitations; 4 consistently strong supported by concrete evidence. Missing execution evidence limits confidence and D's execution component, not unrelated dimensions by fiat.

Report architecture ranking separately from gate eligibility. Identify the raw-score Pareto frontier and test ranking sensitivity to equal weights and a correctness-heavy alternative (A20/B30/C20/D15/E10/F5). Do not declare a unique universal winner if weights or unresolved evidence change the result.

## Shared external fixture

Build one standalone fixture owned by the study, not candidate code. It speaks OBS WebSocket v5 over loopback with a deterministic state model, validates request names against the pinned official generated protocol, and drives the real candidate MCP process over stdio. Candidate adapters only translate public tool names/argument conventions and launch configuration. They must not repair implementation defects or inject candidate-specific success responses.

Fixture state includes two scenes, at least two inputs, per-scene items, record/stream status, transition settings, nested/unknown filter and output settings, complete small PNG data, and synthetic credentials. Record each MCP exchange, corresponding OBS requests, state changes, elapsed time, and assertion result. Keep raw traces free of host credentials. Distinguish unsupported tools, harness-unimplemented requests, invocation mapping errors, candidate failures, and environment blockers. A harness-unimplemented request is never automatically a candidate failure.

Minimum common probes: initialize/list; version; scenes; switch/readback; mute/readback; record start/status/stop; screenshot validity; invalid parameters/unknown entity; OBS error propagation; reduced capabilities; missing response with bounded watchdog; disconnect. Extended probes cover UUID/canvas forwarding, nested filter/output/transition settings, batch semantics, resources/prompts, secret handling, dry-run promises, and high-level workflows where supported. Publish which probes were actually implemented/executed rather than implying the whole list ran.

Run candidates from isolated temporary checkouts/artifacts after inspecting entry/build scripts. Use an allowlisted environment, study-local HOME/config/cache directories, synthetic OBS settings, and loopback fixture ports. Never inherit the workspace `.env`, use real OBS endpoints, launch OBS/streams, install system services/plugins, or run destructive setup. Do not copy competitor implementation into production code. Installed runtimes/build dependencies are research infrastructure; record versions and setup deviations. Bound processes with timeouts and terminate child processes after runs.

A real OBS instance is not assumed available. State explicitly that mocked protocol execution cannot establish rendering, real codecs/devices, platform capture behavior, live streaming, or true OBS performance. If a candidate cannot be run, preserve source assessment and exact blocker; make a reasonable alternate artifact/runtime attempt before stopping.

## Evidence and outputs

- This frozen methodology and any explicit amendments.
- Candidate reviews with pinned source citations, six gate verdicts, six ratings/rationales, changeability traces, own-test results, install/release evidence, and strengths worth adopting/avoiding.
- Reusable fixture code, candidate launch/tool mappings, sanitized machine-readable run results, and a reproduction guide.
- Main synthesis: census, separate gate/score matrix, Pareto/sensitivity analysis, observed counterexamples, local gaps, complementary strengths, and prioritized recommendations.
- A dated append-only index; preserve the earlier update-only research as historical evidence.

Reviewers must distinguish **observed execution**, **static source evidence**, **maintainer claim**, and **inference**. All important externally sourced facts cite primary sources. Conclusions must survive independent review of the strongest claims and failed probes. No production implementation or publishing is part of this task.
