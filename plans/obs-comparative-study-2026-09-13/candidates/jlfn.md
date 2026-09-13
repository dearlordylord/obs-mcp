# JLFN/obs-mcp

Observed 2026-09-13. Source snapshot: [`f9dccf0f8903b225615ba3b80a8a63287b92716a`](https://github.com/JLFN/obs-mcp/commit/f9dccf0f8903b225615ba3b80a8a63287b92716a). Declared version: 0.2.0 in pinned [`Cargo.toml`](https://github.com/JLFN/obs-mcp/blob/f9dccf0f8903b225615ba3b80a8a63287b92716a/Cargo.toml). Runtime: Rust 1.88+ native binary. License provenance: `MIT OR Apache-2.0` in the manifest, with pinned [MIT](https://github.com/JLFN/obs-mcp/blob/f9dccf0f8903b225615ba3b80a8a63287b92716a/LICENSE-MIT) and [Apache-2.0](https://github.com/JLFN/obs-mcp/blob/f9dccf0f8903b225615ba3b80a8a63287b92716a/LICENSE-APACHE) texts.

## Artifact and publication identity

The crates.io API independently records `obs-mcp` 0.2.0 as published 2026-08-08T10:18:19.737588Z by `JLFN`, with a verified matching GitHub username and the declared dual license ([exact version API](https://crates.io/api/v1/crates/obs-mcp/0.2.0)). GitHub tag `v0.2.0` points to [`de5bdb05b70446dde21657d96a952be9c582077f`](https://github.com/JLFN/obs-mcp/commit/de5bdb05b70446dde21657d96a952be9c582077f); the evaluated head is two documentation/source commits later and keeps version 0.2.0.

`cargo test --all-targets --locked` built cleanly under Rust 1.94.0. Four unit tests passed, followed by the project's live MCP test. That test launches the real process against its in-process mock, checks authentication and scene state, invokes all 157 generated tools, and rejects non-JSON stdout; see pinned [`tests/live.rs`](https://github.com/JLFN/obs-mcp/blob/f9dccf0f8903b225615ba3b80a8a63287b92716a/tests/live.rs). Its mock is optimistic for most request types, so this is strong breadth evidence rather than failure-semantics evidence.

## Gates

| Gate | Verdict | Rationale |
|---|---|---|
| G1 | **P** | Fresh locked build and own tests passed. The built executable initialized over stdio and advertised 157 tools in the shared fixture. |
| G2 | **F** | Shared probes observed correct version, scene, mute, recording, and screenshot requests with preserved arguments. However, a focused probe called the advertised `obs-get-source-private-settings`; it emitted `GetSourcePrivateSettings`, which is absent from the study's pinned current official protocol and the fixture rejected as `candidate_invalid_request`/OBS 204. The generated table also advertises three related private-setting request names. This is the same demonstrated invalid-request class as any other advertised typo, despite otherwise useful name/UUID/canvas alternatives and generic nested settings ([table](https://github.com/JLFN/obs-mcp/blob/f9dccf0f8903b225615ba3b80a8a63287b92716a/src/tools_table.rs)). |
| G3 | **P** | Scene and mute mutations changed fixture state and read back correctly; record status reflected active state and stop returned a path; the screenshot decoded as a valid PNG. Missing parameters, unknown scene, injected OBS error, and unavailable screenshot request all returned MCP `isError: true` with OBS codes/comments. |
| G4 | **P** | Invalid input, OBS rejection, unavailable capability, and in-flight disconnect were truthful. With the runner watchdog set one second beyond the implementation's documented ten-second `REQUEST_TIMEOUT`, a deliberately missing response returned a bounded MCP error. Source also flushes pending requests on disconnect in [`obs.rs`](https://github.com/JLFN/obs-mcp/blob/f9dccf0f8903b225615ba3b80a8a63287b92716a/src/obs.rs). |
| G5 | **P** | The shared sequence completed inspection, scene/audio changes, recording lifecycle, and a complete decodable screenshot. |
| G6 | **F** | The advertised contract includes four private-setting tools absent from the pinned public protocol; a focused call proved one unusable with OBS 204. Initialization additionally reported SDK identity `rmcp` 3.1.2 rather than `obs-mcp` 0.2.0. The invalid advertised tool is the disqualifying contract failure; the default SDK identity is an additional metadata inconsistency and would be partial by itself. |

Evidence: `results/jlfn-fixture/jlfn.json`, `results/jlfn-private-fixture/jlfn-private.json`, `results/polyglot-own-tests.log`. Mocked execution does not establish real rendering, devices/codecs, platform capture, live streaming, or performance.

## Architecture score

| Dimension | Rating | Rationale |
|---|---:|---|
| A Responsibility boundaries | **3** | [`obs.rs`](https://github.com/JLFN/obs-mcp/blob/f9dccf0f8903b225615ba3b80a8a63287b92716a/src/obs.rs) owns a background socket task and correlation; [`tools.rs`](https://github.com/JLFN/obs-mcp/blob/f9dccf0f8903b225615ba3b80a8a63287b92716a/src/tools.rs) owns schemas/mapping; the generated table owns catalog data; [`server.rs`](https://github.com/JLFN/obs-mcp/blob/f9dccf0f8903b225615ba3b80a8a63287b92716a/src/server.rs) owns MCP. The main limitation is that generic table dispatch carries most domain semantics without a separate policy layer. |
| B Protocol and state model | **2** | Correlated requests, authentication, bounded request/handshake timeouts, reconnect, OBS error codes, UUID/canvas fields, and generic object preservation are concrete strengths. Four advertised private-setting request names are absent from the pinned official protocol and one was observed rejected; events are discarded, schemas use `additionalProperties: true`, and alternative identity fields are not expressed as JSON Schema alternatives. |
| C Reference and real-world fitness | **3** | It completes the reference job, covers the pinned official request-name set broadly, supports closed-OBS launch, and yields stable JSON text. Four invalid private-setting tools, event-driven workflows, TLS, and capability-pruned listing remain gaps. It also advertises `Sleep` as a standalone tool even though the pinned protocol permits it only inside `SERIAL_REALTIME` or `SERIAL_FRAME` request batches. |
| D Test architecture and evidence | **3** | The own test is a real process/MCP/wire integration and calls every advertised tool; unit tests cover schema/auth/table invariants. The in-repo mock returns plausible success broadly and has little injected-failure coverage, while the external fixture exposed a nonstandard advertised request that the optimistic mock accepted. |
| E Changeability | **3** | Table generation makes ordinary request additions localized and auditable. Event-confirmed workflows and a second transport need new abstractions, keeping this below 4. |
| F Operability and distribution | **3** | crates.io, a standard locked Cargo build, clear environment configuration, automatic reconnect, and optional OBS startup are solid. There are no GitHub binary releases, `wss://` is unsupported, and MCP identity is wrong. |

Weighted score: **70.0/100**.

## Changeability traces

- **One OBS request:** add or regenerate one `ToolDef` row in `tools_table.rs`, with parameters/renames; generic dispatch in `tools.rs` usually needs no change. Extend table/schema tests and mock response only when response-specific state matters.
- **One nested settings kind:** `ParamKind::Obj` already forwards arbitrary JSON without flattening. Strong typing or replace/overlay policy would require new parameter/schema machinery and round-trip fixtures.
- **An event-confirmed workflow:** the socket loop currently ignores op 5 events. This change crosses subscription negotiation, connection-task routing/buffering, a workflow/domain layer that does not yet exist, MCP exposure, shutdown, and bounded tests.
- **A second MCP transport:** transport is selected in the binary/server startup while OBS/tool layers are independent. Refactor entry/server construction and add lifecycle tests; request mapping stays unchanged.
- **Canvas identity:** many generated rows already accept `canvasUuid`, `sceneUuid`, and `inputUuid`. Extending another request is mostly table metadata, though schema alternatives should eventually state exactly-one/at-least-one identity rules.

## Independent lessons

Worth adopting: single socket ownership, pending-request flush on loss, table-driven mapping, all-advertised-tool end-to-end coverage, and an optional closed-OBS lifecycle hook. Avoid: SDK-default MCP identity and treating optimistic all-tool mock success as correctness proof. The focused external probe demonstrates that the advertised private-setting surface is invalid against the pinned public protocol.
