# takurot/obs-showrunner-mcp

Observed 2026-09-13 under the frozen study methodology. This is a higher-level show automation server rather than protocol-parity server. Its vocabulary and internal separation are useful design references, but both source and npm entries omit the call that connects the OBS adapter, so the shipped server cannot execute its declared OBS workflows.

## Identity and evidence boundary

- **Source:** [`takurot/obs-showrunner-mcp`](https://github.com/takurot/obs-showrunner-mcp/tree/3682378f0bcc886ee1c8340b0f4fbba3e1088876), pinned at `3682378f0bcc886ee1c8340b0f4fbba3e1088876` and tag `v0.1.0`. `package.json` declares Node 18+, MIT, and version 0.1.0 ([metadata](https://github.com/takurot/obs-showrunner-mcp/blob/3682378f0bcc886ee1c8340b0f4fbba3e1088876/package.json)); the repository license text is MIT ([license](https://github.com/takurot/obs-showrunner-mcp/blob/3682378f0bcc886ee1c8340b0f4fbba3e1088876/LICENSE)).
- **Released artifact:** the [npm registry record](https://registry.npmjs.org/obs-showrunner-mcp/0.1.0) reports `obs-showrunner-mcp@0.1.0` with SHA-512 integrity `ISvLt4YFedXrv2GmRvlEOQUFRc76mRVJdldOkYci7bmSjDFP16LL2N1VhMQkdM1aCkvCu6uRJZnwOkrPFR0UdQ==`. A fresh npm install exposed the declared executable and reproduced source behavior. The tag is current HEAD; no source changes exist after the tag.
- **Maintainer claims:** the README says the server connects an LLM to show flow, audio moods, effects, snapshots, content, and safety modes and documents `npx obs-showrunner-mcp` ([README](https://github.com/takurot/obs-showrunner-mcp/blob/3682378f0bcc886ee1c8340b0f4fbba3e1088876/README.md)).
- **Observed execution:** source and npm artifact each initialized, listed 18 tools, and handled invalid MCP arguments, but opened zero OBS connections and issued zero OBS requests. The entry calls only `start()`; `createServer` exposes a separate `connect()` method that is never invoked ([entry](https://github.com/takurot/obs-showrunner-mcp/blob/3682378f0bcc886ee1c8340b0f4fbba3e1088876/src/index.ts), [server factory](https://github.com/takurot/obs-showrunner-mcp/blob/3682378f0bcc886ee1c8340b0f4fbba3e1088876/src/server.ts)).
- **Runtime:** Node 24.20.0, npm 11.19.0, and TypeScript 5.9.3 (the project declares Node 18+).

Commands:

```text
git clone https://github.com/takurot/obs-showrunner-mcp.git <temporary>/repo
npm ci --ignore-scripts
npm test
npm run build
node fixture/runner.mjs --adapter adapters/takurot.json --output results/takurot
npm install --prefix <temporary> --ignore-scripts obs-showrunner-mcp@0.1.0
node fixture/runner.mjs --adapter adapters/takurot-npm.json --output results/takurot-npm
```

All 87 own tests and TypeScript compilation passed. Evidence: [`takurot.json`](../results/takurot/takurot.json), [`takurot-npm.json`](../results/takurot-npm/takurot-npm.json), [`takurot-own-tests.log`](../results/takurot-own-tests.log), and [`takurot-build.log`](../results/takurot-build.log).

## Gates

| Gate | Verdict | Evidence and rationale |
|---|---|---|
| G1 Reproducible entry | **P** | Both source and npm executable initialize as `obs-showrunner-mcp` 0.1.0 and list 18 tools plus one resource. |
| G2 Protocol and identity correctness | **F** | Identity is correct, but version, scene list, scene mutation, and screenshot calls make no OBS request and return `Not connected to OBS`. The documented entry never invokes its available connection method. |
| G3 State and result fidelity | **F** | No shared mutation changed OBS state. Tool methods often return `{success:false,error:...}` as normal text content; only the server's outer exception handler sets MCP `isError`. |
| G4 Failure and lifecycle behavior | **p** | Invalid arguments produce `isError:true`, and ordinary calls terminate with a readable disconnected result. Missing-reply, injected-error, reduced-capability, and in-flight-disconnect probes never reached OBS, so their raw runner labels are not executed fault evidence. They are NT within this gate. |
| G5 Complete reference workflow | **F** | Audio mute and recording lifecycle are unsupported in the public tool list, and the implemented scene/snapshot operations do not connect. This also fails the narrower declared showrunner job. |
| G6 Honest usable MCP contract | **F** | The documented source/npm configuration does not result in an OBS connection. `debug` is described as dry-run, but `SafetyGuard` blocks only its small dangerous-operation set; ordinary scene, audio, content, and effect calls are still allowed to reach the adapter ([safety source](https://github.com/takurot/obs-showrunner-mcp/blob/3682378f0bcc886ee1c8340b0f4fbba3e1088876/src/safety/safety-guard.ts)). `end_show` validates stop options but never calls OBS stop streaming/recording methods ([show source](https://github.com/takurot/obs-showrunner-mcp/blob/3682378f0bcc886ee1c8340b0f4fbba3e1088876/src/tools/show-tools.ts)). |

## Architecture scores

| Dimension | Rating | Rationale |
|---|---:|---|
| A Responsibility boundaries | **3/4** | OBS adapter, show state, safety, tool classes, and server transport are distinct. Manual tool schemas and the dispatch switch duplicate each tool contract, and entry lifecycle composition is incomplete. |
| B Protocol and state model | **1/4** | Scene-list types retain UUID fields and Zod validates calls, but the actual server never connects, failure results are inconsistent at MCP level, debug mode is not a general dry run, and there is no capability/event model. |
| C Reference and real-world fitness | **1/4** | Show segments, moods, overlays, highlights, and safety language are useful product ideas. Missing entry connection, public audio inspection/mute, recording lifecycle, and real end-show output actions prevent the declared job. |
| D Test architecture and evidence | **2/4** | Eight files and 87 tests cover classes with mocked adapters, including connection in isolation. They never test the actual entry/factory lifecycle and therefore pass while the shipped server remains disconnected. Shared execution found the integration defect immediately. |
| E Changeability | **2/4** | Class boundaries help, but every new MCP tool requires list schema, dispatch case, adapter/tool method, and tests. Event, transport, and identity changes span several layers. |
| F Operability and distribution | **2/4** | npm installation, build, stdio framing, and correct MCP product identity work. Ordinary source and npm usage still cannot reach OBS; forced `.env` override can also supersede client-supplied environment values. |

Weighted score: **47.50/100**.

## Changeability traces

- **One OBS request:** add an `OBSAdapter` method, public JSON schema entry, dispatch case, tool-class method as appropriate, and tests. The manual list/dispatch duplication makes drift likely.
- **One nested settings kind:** extend the adapter and `ContentTools`, whose current source-type policy reduces input settings to text, URL, or file. Preserve arbitrary nested settings only with a new typed/raw path.
- **One event-confirmed workflow:** subscribe in `OBSAdapter`, route events into `ShowStateManager`, define correlation/timeouts, and expose MCP state. Existing state is local and timer-driven.
- **Second MCP transport:** `createServer` can be reused, but `start()` hardcodes `StdioServerTransport`; parameterize transport construction and entry configuration.
- **Canvas identity:** existing response interfaces mention scene UUIDs, while public mutation accepts `sceneName` only. Propagate scene UUID/canvas fields through schemas, adapter methods, and show templates.

Adopt the show-level vocabulary and the separation between OBS mechanics, show state, and safety policy. Avoid safety modes whose names promise broader behavior than the guard implements, and always test the actual executable lifecycle rather than only its components.
