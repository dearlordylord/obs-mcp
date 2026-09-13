# cdavis-code/obs_websocket_workspace / @unngh/obs-mcp

Observed 2026-09-13. Source snapshot: [`1d95b2933dc1de520cca09414d5d65b2a85466b8`](https://github.com/cdavis-code/obs_websocket_workspace/commit/1d95b2933dc1de520cca09414d5d65b2a85466b8). Declared npm package version 5.7.5; the separate native release evaluated is 5.7.2. Runtime: compiled Dart delivered either as Node.js JavaScript or native executables. License: MIT in the pinned [repository license](https://github.com/cdavis-code/obs_websocket_workspace/blob/1d95b2933dc1de520cca09414d5d65b2a85466b8/LICENSE), copyright Faith of Life Network.

## Artifact and publication identity

The current [package manifest](https://github.com/cdavis-code/obs_websocket_workspace/blob/1d95b2933dc1de520cca09414d5d65b2a85466b8/packages/obs_mcp_js/package.json) attributes `@unngh/obs-mcp` to Chris Davis and the cdavis-code repository. The npm registry independently reports 5.7.5, publisher/maintainer `unngh`, author Chris Davis, publication at 2026-06-16T13:59:42.562Z, and git head [`831a4a2b98ca232b70ce6e5f286417f557be33e9`](https://github.com/cdavis-code/obs_websocket_workspace/commit/831a4a2b98ca232b70ce6e5f286417f557be33e9), whose commit message is the 5.7.5 release ([exact registry document](https://registry.npmjs.org/%40unngh%2Fobs-mcp/5.7.5)). The evaluated npm integrity is recorded in `results/polyglot-publication.json`.

The independently downloadable [v5.7.2 GitHub release](https://github.com/cdavis-code/obs_websocket_workspace/releases/tag/v5.7.2), published by `github-actions[bot]`, supplies `obs-mcp-linux-arm64`; its downloaded SHA-256 exactly matched the release digest. This is a distinct, older attributable artifact, not evidence that npm 5.7.5 and native 5.7.2 are behaviorally identical.

Fresh npm installation succeeded. With the shared authenticated fixture, the published npm 5.7.5 executable connected but never completed initialization within the runner's 30-second initialization watchdog. With an absent endpoint it instead exited before MCP initialization with an uncaught `WebSocketChannelException`. The alternate native arm64 5.7.2 artifact initialized and listed two MCP tools. The current source head has since added a caught bootstrap error path in [`obs_mcp_server_js.dart`](https://github.com/cdavis-code/obs_websocket_workspace/blob/1d95b2933dc1de520cca09414d5d65b2a85466b8/packages/obs_mcp_js/lib/src/obs_mcp_server_js.dart), confirming that repository head and published runtimes must not be conflated.

## Gates

| Gate | Verdict | Rationale |
|---|---|---|
| G1 | **p** | The documented npm 5.7.5 path installed but failed to initialize against the authenticated fixture; the older documented native 5.7.2 artifact did initialize and list `search`/`execute`. This is partial reproducibility across non-equivalent artifacts. |
| G2 | **P** | The native run sent correct `GetVersion`, scene, mute, record, and screenshot request names and forwarded `sceneName`, `inputName`, `inputMuted`, and image arguments. Scene/mute fixture state changed and read back, although the runner's structured-value heuristic did not recognize primitive text readbacks. |
| G3 | **F** | In native 5.7.2, OBS 600 errors for an unknown scene and an injected rejection became successful MCP results containing `{"ok":true}`. An in-flight disconnected mutation also returned success. The generic reduced-capability error text lacked `isError`. These are observed artifact counterexamples; npm 5.7.5 never initialized, and current head's `_dispatchCodeModeToolCall(...).catchError(...)` rejects errors, so the same defect is not attributed to unexecuted head source. |
| G4 | **F** | A missing reply exceeded the ten-second fixture watchdog, while an in-flight disconnect returned false success. The finite timeout does not prove an endless hang, but either observed behavior fails truthful bounded lifecycle handling. |
| G5 | **P** | The alternate native artifact completed discovery, scene/mute mutations, record start/status/stop, and returned a decodable 70-byte PNG. The npm artifact did not reach MCP, so this pass is specifically for the v5.7.2 native artifact. |
| G6 | **F** | Native 5.7.2 initialization identified itself only as `mcp-server` 1.0.0; current head hard-codes 5.7.1 in [`obs_mcp_server_js.mcp.dart`](https://github.com/cdavis-code/obs_websocket_workspace/blob/1d95b2933dc1de520cca09414d5d65b2a85466b8/packages/obs_mcp_js/lib/src/obs_mcp_server_js.mcp.dart), unrelated to package 5.7.5. Native error results were also reported as success; current head's distinct error mapping was not runnable through npm. |

Evidence: `results/cdavis-fixture/cdavis.json`, `results/cdavis-native-fixture/cdavis-native.json`, and `results/polyglot-own-tests.log`. Mocked protocol execution does not establish real rendering, codecs/devices, capture behavior, streaming, or OBS performance.

## Architecture score

| Dimension | Rating | Rationale |
|---|---:|---|
| A Responsibility boundaries | **1** | The tool registry is centralized, but a static global OBS client owns connection state, every operation is dispatched through generated facade code, and MCP `execute` evaluates user JavaScript in the server process. [`obs_mcp_server_js.mcp.dart`](https://github.com/cdavis-code/obs_websocket_workspace/blob/1d95b2933dc1de520cca09414d5d65b2a85466b8/packages/obs_mcp_js/lib/src/obs_mcp_server_js.mcp.dart) explicitly says execution is unsandboxed. Transport, execution, tool dispatch, and process authority are tightly joined. |
| B Protocol and state model | **2** | Current head's internal [registry](https://github.com/cdavis-code/obs_websocket_workspace/blob/1d95b2933dc1de520cca09414d5d65b2a85466b8/packages/obs_mcp_js/lib/src/tool_registry.dart) is broad and includes canvas/UUID-era fields, settings objects, events, and timeouts; current dispatch rejects operation errors. Public MCP schemas expose only arbitrary JavaScript rather than operation-level contracts, and current behavior could not be executed because npm 5.7.5 did not initialize. Native 5.7.2's false success is artifact evidence, not proof about head. |
| C Reference and real-world fitness | **2** | Code mode can compose the full reference job in one call and the native artifact completed it. Broad operation coverage and event helpers are useful. The current npm failure, false-success behavior, and in-process arbitrary code make dependable unattended control materially unsafe. |
| D Test architecture and evidence | **1** | The published package's `test` script says “No tests defined yet.” The workspace has Dart tests for the underlying client and one `obs_mcp` animation helper test, but no current npm MCP contract/failure suite is declared by the [package manifest](https://github.com/cdavis-code/obs_websocket_workspace/blob/1d95b2933dc1de520cca09414d5d65b2a85466b8/packages/obs_mcp_js/package.json). Shared execution exposed false success and artifact divergence. |
| E Changeability | **2** | A generated central registry localizes many request additions, but changes must remain synchronized across Dart APIs, tool registry, generated MCP facade, dart2js output, and package/native publication. Code mode avoids top-level MCP schema churn at the cost of weaker contracts. |
| F Operability and distribution | **2** | npm, Homebrew/native binaries, and multi-platform assets are real strengths. The npm/native versions diverge, initialization behavior differs, server identity is wrong, and the source build needs Dart 3.8 plus Node. |

Weighted score: **40.0/100** under A25/B20/C15/D15/E15/F10.

## Changeability traces

- **One OBS request:** add the underlying Dart request/model API, add a `ToolDef` and dispatcher in `tool_registry.dart`, regenerate the MCP facade/runtime, then publish both JS and native artifacts. The registry is the best-localized part; artifact synchronization remains cross-cutting.
- **One nested settings kind:** current generic object parameters can forward it with little registry work, but typed Dart response/request models and generated JSON serialization change if fidelity is required. Round-trip tests are absent at the npm MCP boundary.
- **An event-confirmed workflow:** the source already has event subscription/wait helpers, so policy can live as a composed `execute` script. Reliable confirmation still crosses global client event state, code-execution timeout, and generated bindings.
- **A second MCP transport:** `MCPServerWithToolsJs` is constructed directly around the Node stdio stream in the JS binding/entry path. A second transport requires restructuring bootstrap and server ownership, plus a new compiled artifact entry.
- **Canvas identity:** canvas operations and several UUID alternatives already exist. Extending canvas-aware identity requires touching individual registry schemas and Dart request models; the public MCP surface remains an opaque code string.

## Independent lessons

Worth adopting: generated protocol-parity tracking; searchable operation metadata; event wait primitives; and genuinely convenient npm/native/Homebrew distribution. Avoid: unsandboxed same-process `eval`, static global connection ownership, public contracts reduced to code strings, hard-coded server versions, and any adapter that converts an OBS rejection into `ok: true`.
