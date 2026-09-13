# muhammadumarakram1/mcp-obs-websocket

Observed 2026-09-13 under the dated methodology amendment that adds this late discovery candidate to the census. Source is pinned to [`37f3e7ae8031f034cc8282429c75703a11bd6737`](https://github.com/muhammadumarakram1/mcp-obs-websocket/tree/37f3e7ae8031f034cc8282429c75703a11bd6737). The package declares version **1.0.0**, Node.js **>=18**, `obs-websocket-js` `^5.0.5`, the MCP SDK `^1.0.0`, Zod, and MIT licensing ([`package.json`](https://github.com/muhammadumarakram1/mcp-obs-websocket/blob/37f3e7ae8031f034cc8282429c75703a11bd6737/package.json), [`LICENSE`](https://github.com/muhammadumarakram1/mcp-obs-websocket/blob/37f3e7ae8031f034cc8282429c75703a11bd6737/LICENSE)). No npm, GitHub release, or other package publication was independently verified; the npm name check is recorded in [`study/releases.json`](../study/releases.json).

This is a direct, small general-purpose OBS WebSocket v5 server. It is source-runnable and covers scene selection, recording, streaming, mute, volume, and stats, but it does not expose a screenshot tool or OBS version/capability tool. It also has no internal request timeout. The shared fixture therefore demonstrates useful protocol and state behavior while exposing lifecycle gaps; fixture-unimplemented requests are kept separate from candidate failures.

## Evidence boundary and execution

The source review distinguishes observed execution from static source evidence and maintainer claims. The README claims ten tools, a persistent WebSocket connection, reconnect on the next call after OBS restarts, and support for OBS Studio 28+ ([`README.md`](https://github.com/muhammadumarakram1/mcp-obs-websocket/blob/37f3e7ae8031f034cc8282429c75703a11bd6737/README.md)). The source confirms ten listed tools and the stated request mappings in [`src/index.ts`](https://github.com/muhammadumarakram1/mcp-obs-websocket/blob/37f3e7ae8031f034cc8282429c75703a11bd6737/src/index.ts).

From an isolated temporary clone, with no workspace `.env`, external credentials, real OBS, or system setup:

```text
git clone --depth 1 https://github.com/muhammadumarakram1/mcp-obs-websocket.git <temporary>/repo
git -C <temporary>/repo rev-parse HEAD
npm install --ignore-scripts --no-audit --no-fund
npm run build
node fixture/runner.mjs --adapter plans/obs-comparative-study-2026-09-13/adapters/umar.json --output <temporary>/fixture-output
```

The source install added 107 packages and `npm run build` exited 0 under Node 24.20.0/npm 11.19.0. The resulting `dist/index.js` SHA-256 is `8d2f92b662fc7b7922bcc6bf7529855453f65bf67b283c64a1164c86448d26a8`; it is an unpublished source-build artifact, not a release digest. The durable adapter mapping is [`umar.json`](../adapters/umar.json), and the final fixture trace is [`umar.json`](../results/umar-fixture/umar.json); it used the pinned compiled source and the study's MessagePack OBS v5 fixture. It recorded 8 passes, 3 failures, 4 unsupported probes, and no environment blocker. The machine `mute_mutation_readback` label is an adapter limitation: this candidate exposes `toggle_mute`, not a separate explicit set-mute and get-mute pair, so the durable adapter makes one toggle call and leaves the candidate's own readback inside that call. The trace records exactly one `ToggleInputMute`, the candidate's internal `GetInputMute`, a returned `muted:true`, and fixture state `true`. The common runner cannot independently grade that internal readback and labels the composite probe fail; the gate below manually adjudicates the source and raw trace as truthful.

The fixture's `GetStats` was not implemented by the study fixture and was not used to charge the candidate. Screenshot and version probes were unsupported because the candidate advertises neither operation. `GetSceneList`, `SetCurrentProgramScene`, `ToggleInputMute`/`GetInputMute`, `StartRecord`, `GetRecordStatus`, and `StopRecord` reached implemented fixture requests with correct request names and arguments. Invalid parameters, an unknown scene, and an injected OBS rejection returned MCP errors. The missing `GetSceneList` response and in-flight scene disconnect each exceeded the 11-second runner watchdog: no candidate-level request timeout or bounded error was observed.

## Architecture

`src/index.ts` owns MCP server creation, the tool inventory, Zod schemas for three mutating operations, OBS connection state, request mapping, output shaping, and process startup. `getOBS()` keeps one module-global `OBSWebSocket` instance while `connected` is true. `ConnectionClosed` and `ConnectionError` clear that flag, so a later tool call can create a fresh client. The connection library handles the OBS WebSocket v5 Hello/Identify/authentication exchange. The implementation does not own a request deadline, pending-request map, cancellation path, event subscription model, or serialized first-connect promise; concurrent calls while disconnected could each initiate their own connection.

The tool surface is readable and maps to valid v5 request names:

* Scene list returns the current scene plus names and indices; it discards UUID/entity identity.
* Scene switch validates a non-empty name and reports the requested name after the request succeeds. It does not perform a separate readback.
* `toggle_mute` validates a non-empty source name, toggles it, then reads the resulting mute state. There is no explicit `set_mute` operation, so a client cannot request a target state idempotently.
* `set_volume` validates a dB range and forwards `SetInputVolume`, but returns the requested value without a `GetInputVolume` readback.
* Recording start/stop and status map to the expected v5 requests. Start returns a local status string without confirming `GetRecordStatus`; stop includes OBS's output path.
* Streaming start/stop and stats are direct wrappers. No screenshot, source discovery, source settings, input enumeration, transitions, filters, or version/capability operation is exposed.

The handler catches Zod errors as `InvalidParams` and other errors as `InternalError` with an `OBS error:` prefix. Stdio output stayed clean in the fixture; the startup diagnostic was on stderr. These are good narrow-server conventions. The absence of a timeout is material: a lost in-flight request can leave an MCP call pending until the client or study watchdog ends it, even though the next call can reconnect after the connection-closed event.

## Gates

| Gate | Verdict | Evidence and rationale |
|---|---|---|
| G1 Reproducible entry | **P** | Isolated `npm install` and `npm run build` passed; the compiled entry initialized MCP and listed ten tools with clean JSON-RPC stdout. No separately published artifact was available to compare. |
| G2 Protocol and identity correctness | **p** | The fixture observed valid scene, recording, and mute request names, exact scene/source arguments, and usable scene data. The server does not expose version/capability discovery, drops scene UUID identity, and offers toggle-only mute semantics. |
| G3 State and result fidelity | **P** | Scene state, the one-call mute toggle/readback, and recording lifecycle matched fixture state. The runner's composite mute label is a documented adapter limitation; the raw trace shows the candidate's `ToggleInputMute` followed by `GetInputMute`, with returned and fixture state both true. Volume and start/stop operations do not independently read back state, which limits broader confidence but does not invalidate the observed reference mutations. |
| G4 Failure and lifecycle behavior | **F** | Invalid arguments, unknown scenes, and injected OBS errors were bounded and truthful. Missing response and in-flight disconnect both exceeded the 11-second watchdog because the candidate has no request timeout or cancellation path. |
| G5 Complete reference workflow | **F** | Scene inspection/mutation, audio toggle, and recording lifecycle compose. Screenshot, source/input discovery, and version/capability inspection are absent, so the complete reference workflow cannot be performed. |
| G6 Honest usable MCP contract | **P** | The ten advertised tools matched the source and observed behavior, unsupported screenshot/version surfaces were not claimed, errors preserved useful text, synthetic credentials did not appear, and stdout remained parseable. The README's claim that a later call can reconnect after OBS restarts is static source/documentation evidence and was not independently exercised; the separate in-flight request timeout is charged to G4. |

Any F disqualifies this candidate as a complete reference-job winner under the methodology. The F verdicts here are observed scope/lifecycle limitations, not fixture implementation failures.

## Architecture scores

| Dimension | Rating | Evidence-backed rationale |
|---|---:|---|
| A Responsibility boundaries | **1/4** | The underlying library owns protocol framing, but connection lifecycle, schemas, mappings, policy, response formatting, and stdio startup are all in one `src/index.ts` module. This is readable at ten tools, yet adding stateful workflows or another transport has no existing application boundary to extend. |
| B Protocol and state model | **2/4** | The v5 client maps core requests correctly, handles connection state, validates selected arguments, and performs mute readback. It lacks request deadlines, event/state modeling, capability/version identity, UUID preservation, and explicit mutation confirmation for several calls. |
| C Reference and real-world fitness | **2/4** | Core scene, record, stream, mute, volume, and stats jobs are useful and easy to compose. Missing screenshot/source discovery, toggle-only mute, name-only identity, and unbounded disconnect behavior materially limit the general job. |
| D Test architecture and evidence | **1/4** | No authored tests or test script exist in the repository. The shared fixture gives concrete source-entry and failure evidence, but it is external to the candidate and cannot substitute for candidate-owned coverage. |
| E Changeability | **1/4** | One new request requires another inventory entry and switch arm in the monolithic entry. Nested settings, event-confirmed workflows, a second transport, and canvas identity would require new cross-cutting state and boundaries. |
| F Operability and distribution | **2/4** | Node 18+ and a short source build provide a simple entry, with explicit environment variables and MIT license. There is no lockfile or published artifact in the checked-out source, dependency ranges float, and lifecycle failures are not bounded. |

Weighted total: **36.25/100** under A25/B20/C15/D15/E15/F10. Confidence **high** for the pinned source and fixture observations; confidence is lower for real OBS rendering, devices, codecs, streaming, and performance because no real OBS instance was used.

## Changeability traces

* **One OBS request:** add one tool inventory entry and one switch arm in `src/index.ts`, plus a schema if arguments need validation. This is simple to locate but easy to drift because inventory and implementation are manually paired.
* **One nested settings kind:** add a new Zod schema and direct call arm; there is no generic request mapping or lossless settings boundary to extend.
* **One event-confirmed workflow:** introduce listener ownership, event correlation, request deadlines, cancellation, and a lifecycle state machine around the module-global client. No existing event store or correlation layer can be reused.
* **Second MCP transport:** extract server construction/registration from the top-level stdio entry and define shared connection shutdown; the current module assumes one process-global transport.
* **Canvas identity:** add UUID/canvas fields to tool schemas and preserve them in scene/source results; current name/index-only responses require changes across mappings and workflows.

The useful ideas to retain are a small explicit tool contract, standard v5 request names, Zod validation at mutation boundaries, connection-state reset after transport closure, and readback inside the toggle operation. The study should avoid treating a persistent socket as a lifecycle policy, returning success before state confirmation, and omitting request deadlines for an agent-facing server.
