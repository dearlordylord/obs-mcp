# ITchrisDEB/obs-studio-mcp

Observed 2026-09-13 under the frozen study methodology. The reduced MCP-only Rust build completes the general reference workflow and has the strongest owned test body, but a missing OBS reply leaves the MCP call unanswered beyond the study's ten-second watchdog. This excludes it as a complete direct-server winner. Its Linux dashboard/service/plugin product is assessed separately below as adjacent scope.

## Identity and evidence boundary

- **Source:** [`ITchrisDEB/obs-studio-mcp`](https://github.com/ITchrisDEB/obs-studio-mcp/tree/05f00bafa93725b16b17733d09a561dfd464741c), pinned at the repository's single commit `05f00bafa93725b16b17733d09a561dfd464741c`. The Cargo workspace declares version 0.1.0, Rust 2021, and MIT ([Cargo workspace](https://github.com/ITchrisDEB/obs-studio-mcp/blob/05f00bafa93725b16b17733d09a561dfd464741c/Cargo.toml)); the repository license is MIT ([license](https://github.com/ITchrisDEB/obs-studio-mcp/blob/05f00bafa93725b16b17733d09a561dfd464741c/LICENSE)).
- **Released artifact:** no Git tag or GitHub release exists in the obtained repository. The documented distribution deliberately compiles from source and installs binaries, dashboard, configuration, and user services ([installer](https://github.com/ITchrisDEB/obs-studio-mcp/blob/05f00bafa93725b16b17733d09a561dfd464741c/install.sh)). This study did not run that system-mutating installer.
- **Maintainer claims:** the README declares Linux-only full OBS v5 one-to-one mappings, domain/Linux/plugin/meta tools, stdio MCP, a daemon REST API, web dashboard, and service lifecycle ([README](https://github.com/ITchrisDEB/obs-studio-mcp/blob/05f00bafa93725b16b17733d09a561dfd464741c/README.md)). Checked-in registries and architecture documents are source evidence, not runtime proof.
- **Observed execution:** `cargo build --locked -p obs-studio-mcp-server` succeeded in 2m34s without code changes. A study-local HOME and documented TOML configuration launched only `target/debug/obs-studio-mcp`; it initialized, listed 192 currently active tools, completed scene/mute/record/screenshot behavior, and produced clean stdout. Mocked protocol execution does not establish Linux devices, OBS rendering, plugins, dashboard, system services, live streaming, or performance.
- **Runtime:** rustc 1.94.0 and cargo 1.94.0 on Linux/aarch64; the lockfile resolved rmcp 0.16.0 and obws 0.15.0.

Commands:

```text
git clone https://github.com/ITchrisDEB/obs-studio-mcp.git <temporary>/repo
cargo build --locked -p obs-studio-mcp-server
cargo test --locked
cargo test --locked -p obs-studio-mcp-core -p obs-studio-mcp-obs
node fixture/runner.mjs --adapter adapters/itchris.json --output results/itchris
```

Default-member tests passed 48 cases; core and OBS-client tests passed another 84, for 132 observed tests. Evidence: [`itchris.json`](../results/itchris/itchris.json), [`itchris-build.log`](../results/itchris-build.log), [`itchris-own-tests.log`](../results/itchris-own-tests.log), and [`itchris-core-obs-tests.log`](../results/itchris-core-obs-tests.log).

## General-job gates

| Gate | Verdict | Evidence and rationale |
|---|---|---|
| G1 Reproducible entry | **P** | The reduced, attributable MCP package built unchanged, initialized over stdio, and listed tools. Full installer/dashboard/services remain NT rather than being inferred from this result. |
| G2 Protocol and identity correctness | **p** | One-to-one tools forwarded exact `request_data`, preserved scene/input names and booleans, and returned current state. MCP initialization identifies `rmcp` 0.16.0 instead of `obs-studio-mcp` 0.1.0. Domain and one-to-one schemas are mostly generic objects whose exact fields are deferred to bundled documentation. |
| G3 State and result fidelity | **P** | Fake OBS recorded scene and mute state changes, record start/status/stop, a complete 70-byte PNG, and exact codes/comments for invalid, missing, and injected-error requests. Screenshot data is promoted to MCP image content by the handler ([handler](https://github.com/ITchrisDEB/obs-studio-mcp/blob/05f00bafa93725b16b17733d09a561dfd464741c/mcp-server/src/handler.rs)). |
| G4 Failure and lifecycle behavior | **F** | Invalid arguments, unknown entities, injected errors, reduced capabilities, and disconnect terminate truthfully. When the fixture accepted `GetSceneList` but omitted the reply, the MCP call exceeded the external ten-second watchdog. The client has reconnect logic but no shorter per-request bound for this path ([OBS client](https://github.com/ITchrisDEB/obs-studio-mcp/blob/05f00bafa93725b16b17733d09a561dfd464741c/obs-client/src/client.rs)). |
| G5 Complete reference workflow | **P** | Inspection, scene/audio mutation, recording lifecycle, and usable image all compose through the reduced MCP server. |
| G6 Honest usable MCP contract | **p** | Stdio remained parseable, errors were explicit, and the unavailable screenshot request did not invent success. Product identity is wrong, one-to-one schemas expose only generic `request_data`, and the full documented install/service path was intentionally NT. These prevent a fully observed pass without demonstrating a direct contradiction as broad as G6 F. |

## Architecture scores

| Dimension | Rating | Rationale |
|---|---:|---|
| A Responsibility boundaries | **3/4** | Separate core, OBS client, plugin adapters, MCP server, daemon, tray, and web components establish clear major ownership ([architecture](https://github.com/ITchrisDEB/obs-studio-mcp/blob/05f00bafa93725b16b17733d09a561dfd464741c/ARCHITECTURE.md)). Runtime-generated documentation, duplicated MCP/daemon invocation paths, and a wide install surface add coupling. |
| B Protocol and state model | **3/4** | Raw JSON preserves nested settings; OBS errors retain code/comment; event buffers, reconnect, request batches, security policy, and runtime capability/plugin presence exist. Missing request timeout, generic discovery schemas, and framework identity limit the score. |
| C Reference and real-world fitness | **4/4** | The MCP subset completes the reference job. Domain workflows, event/resource support, Linux device helpers, documentation search, and explicit plugin-presence behavior address real production needs within its declared Linux scope. |
| D Test architecture and evidence | **3/4** | The 132 executed tests cover config, security, registry, domain mappings, batch behavior, errors, events, images, plugin presence, docs, daemon routes, and MCP handler behavior. Shared black-box execution adds stateful protocol evidence and found the unbounded missing-reply case. No real OBS/Linux-device/dashboard execution was performed. |
| E Changeability | **2/4** | Generated dynamic one-to-one routes make protocol additions cheap, but the product's domain, registry/documentation, daemon, web, plugin, and distribution surfaces make user-level additions and transport work materially broader. |
| F Operability and distribution | **1/4** | There is no released binary/package identity. The supported installer compiles a multi-component product, installs system dependencies and user services, and was out of safe study scope. The reduced build works but takes materially more setup than direct package entries. |

Weighted score: **70.00/100**.

## Changeability traces

- **One OBS request:** update/regenerate the pinned request registry; `dynamic_tools` creates the one-to-one MCP route without a handwritten handler. Domain exposure, generated docs, and coverage checks change only when a higher-level action is also wanted.
- **One nested settings kind:** `serde_json::Value` flows through raw requests and most domain settings, so protocol fidelity is localized. A typed domain helper needs handler validation plus integration tests.
- **One event-confirmed workflow:** the event connection, ring buffer, database logger, resources, and event domain already exist. Add correlation policy, a bounded wait, domain action, and tests rather than a new event subsystem.
- **Second MCP transport:** configuration mentions transport and the daemon exposes separate HTTP routes, but the MCP binary calls `rmcp::transport::stdio()` directly. A real second MCP transport needs handler reuse, transport selection, authentication/bind policy, shutdown, and parity tests.
- **Canvas identity:** one-to-one `GetCanvasList` is already generated and raw identifiers remain lossless. Rich domain tools need canvas/UUID fields propagated through action validation, entity selection, outputs, docs, and tests.

## Adjacent Linux product assessment

Static source supports the claimed breadth: Linux source helpers live in the OBS domain layer; plugin presence and package validation are in core; plugin install/update commands, dashboard routes, SQLite history, systemd user units, and a tray crate are separate components. This is a credible adjacent product architecture, not execution evidence. Its independent strengths are explicit plugin availability, provenance-rich bundled documentation, Linux device vocabulary, event/history resources, and dashboard/MCP parity checks.

The maintenance and security cost is correspondingly high: distro package matrices, `pkexec`, background services, Python web dependencies, Rust binaries, a mutable documentation catalog, and native device/plugin behavior all become release obligations. Those features should inform a separate Linux-product roadmap and should not inflate the direct-server score.
