# Adjacent OBS products and wrappers

Observed 2026-09-13 from pinned source checkouts. These products are reviewed for end-user jobs, architecture, and useful design evidence. They are not added to the direct-server ranking merely because they expose many tools or include an OBS integration. Source and publication details, including full SHAs, are duplicated in [`releases.json`](releases.json).

The review used clean temporary clones at these commits:

| Product | Full source SHA | Scope |
| --- | --- | --- |
| [JulienCr/obs-live-suite](https://github.com/JulienCr/obs-live-suite/tree/e3b96ac9f4e2ba72fb428a5ae745b8a3498e3a25) | `e3b96ac9f4e2ba72fb428a5ae745b8a3498e3a25` | Live-show dashboard, overlays, Stream Deck, backend OBS adapter, and an MCP facade |
| [skaggsxyz/moltstream](https://github.com/skaggsxyz/moltstream/tree/c521f9cff19833ed4f4ef6bdf69bf3c6a3049d09) | `c521f9cff19833ed4f4ef6bdf69bf3c6a3049d09` | Autonomous AI streamer with chat, LLM, TTS/avatar, broadcast, OBS browser-source integration, and an MCP facade |
| [danielrosehill/Claude-OBS-Plugin](https://github.com/danielrosehill/Claude-OBS-Plugin/tree/4b44ff79db2f009b6921c3461c9f2761a4018b43) | `4b44ff79db2f009b6921c3461c9f2761a4018b43` | Claude Code Linux management plugin that launches a separately published `obs-mcp` package |

No real OBS instance, chat account, stream, external credential, plugin, system service, or production setup was used. The execution results below are source/build or explicitly identified MCP entry checks; they are not real OBS integration.

## OBS Live Suite

### User jobs and product boundary

The repository describes a Next.js live-production application for browser-source overlays, a dashboard, a database, Stream Deck actions, and an OBS WebSocket v5 adapter ([architecture document](https://github.com/JulienCr/obs-live-suite/blob/e3b96ac9f4e2ba72fb428a5ae745b8a3498e3a25/docs/ARCHITECTURE.md)). The end-user jobs are show production: maintain guests and poster assets, put a guest/poster/subvideo on air, render lower thirds and text presets, run a countdown, highlight chat, publish a sommaire, clear all overlays in a panic action, and drive selected actions from Stream Deck. The MCP package is a control surface for those application jobs, rather than a general OBS request catalog.

At the pinned source, `mcp-server/src/tools/index.ts` registers ten tool modules covering guests, posters, subvideos, lower thirds, text presets, countdowns, poster overlays, chat, clear/reload, and sommaire. Counting the 36 `registerTool(...)` calls in those modules gives 36 tools (the earlier 26 count was a transcription error). The tool implementations call the suite's frontend/backend HTTP APIs; they do not call `obs-websocket-js` directly. This separation is useful for product workflows because overlay state, assets, persistence, and MCP calls share the same application policy.

The repository also contains a WIP Live Assist workflow, explicitly marked “not production-ready” in [`docs/LIVE-ASSIST.md`](https://github.com/JulienCr/obs-live-suite/blob/e3b96ac9f4e2ba72fb428a5ae745b8a3498e3a25/docs/LIVE-ASSIST.md). A faster-whisper process posts finalized transcript segments to Express; a rolling buffer, keyword detector, window scheduler, LLM intent extractor, action providers, and suggestion store produce human-reviewable cards over a WebSocket channel. The current providers are poster and definition. A suggestion is previewed and then applied by an operator, so the workflow keeps a human approval boundary before an overlay side effect.

### Architecture and execution path

The MCP package has two entry points:

* [`src/stdio.ts`](https://github.com/JulienCr/obs-live-suite/blob/e3b96ac9f4e2ba72fb428a5ae745b8a3498e3a25/mcp-server/src/stdio.ts) creates an SDK `McpServer`, registers the tools, and connects `StdioServerTransport`.
* [`src/index.ts`](https://github.com/JulienCr/obs-live-suite/blob/e3b96ac9f4e2ba72fb428a5ae745b8a3498e3a25/mcp-server/src/index.ts) exposes a stateless Streamable HTTP `/mcp` endpoint, a health endpoint, and a development fetch diagnostic. It creates a new MCP server and transport per request.

The default MCP port is 3004 and the HTTP host is `0.0.0.0`; the frontend/backend defaults are `127.0.0.1:3000` and `127.0.0.1:3002` in [`src/config.ts`](https://github.com/JulienCr/obs-live-suite/blob/e3b96ac9f4e2ba72fb428a5ae745b8a3498e3a25/mcp-server/src/config.ts). The HTTP client applies a ten-second `AbortSignal` timeout and converts network or non-2xx responses into structured MCP error content with `isError: true` ([`src/httpClient.ts`](https://github.com/JulienCr/obs-live-suite/blob/e3b96ac9f4e2ba72fb428a5ae745b8a3498e3a25/mcp-server/src/httpClient.ts)). This creates a bounded failure surface for a missing backend, although it does not make a tool operation an OBS-confirmed mutation.

The application adapter is a separate layer. [`OBSConnectionManager.ts`](https://github.com/JulienCr/obs-live-suite/blob/e3b96ac9f4e2ba72fb428a5ae745b8a3498e3a25/lib/adapters/obs/OBSConnectionManager.ts) owns the `obs-websocket-js` connection and reconnect policy; [`OBSStateManager.ts`](https://github.com/JulienCr/obs-live-suite/blob/e3b96ac9f4e2ba72fb428a5ae745b8a3498e3a25/lib/adapters/obs/OBSStateManager.ts) listens for events and refreshes state; [`OBSSceneController.ts`](https://github.com/JulienCr/obs-live-suite/blob/e3b96ac9f4e2ba72fb428a5ae745b8a3498e3a25/lib/adapters/obs/OBSSceneController.ts) maps scene and item visibility operations; and [`OBSSourceController.ts`](https://github.com/JulienCr/obs-live-suite/blob/e3b96ac9f4e2ba72fb428a5ae745b8a3498e3a25/lib/adapters/obs/OBSSourceController.ts) handles typed source settings and refresh operations. The connection, state, scene, source, and event responsibilities are localized, while the MCP layer remains a domain facade over the suite API.

### Safe execution check

In an isolated temporary checkout, the following passed:

```text
pnpm --dir /tmp/obs-adjacent.HULbPO/live install --frozen-lockfile --ignore-scripts
```

The install used the checked-in pnpm lockfile and completed with 1,364 packages. The MCP tests were then run without real backend or OBS credentials:

```text
pnpm --dir /tmp/obs-adjacent.HULbPO/live --filter obs-live-suite-mcp exec jest --runInBand
```

The result was 70 passing and one failing test out of 71. `__tests__/config.test.ts` expected `http://localhost:3002`, while the pinned implementation defaults to `http://127.0.0.1:3002` and documents that choice to avoid Node IPv6 `localhost` resolution. This is a reproducible test/config expectation mismatch at the pinned checkout; it is not evidence of an OBS protocol failure. The first attempted command passed Jest's `--runInBand` through the package script and selected no tests; the result above is the corrected direct Jest invocation.

### Reference-job assessment

This product is strong for an operator managing a prepared live show: its domain tools, application API, persistence, overlay event hub, and OBS adapter form a coherent workflow. It is not a complete general OBS MCP server at the pinned MCP surface. Scene discovery, arbitrary input/audio mutation, recording lifecycle, screenshot retrieval, and direct OBS error probes are owned by the backend adapter/API rather than exposed as corresponding MCP tools. A successful MCP response means the suite API accepted the request; the MCP package itself does not show the resulting OBS state. The ten-second HTTP bound and `isError` mapping are useful operational behavior, while the stateless HTTP mode and default LAN bind (`0.0.0.0`) require deployment policy and authentication review before exposing it beyond a trusted host.

The Live Assist design is a separate strength: bounded transcript retention, delayed window collection with a wall-clock maximum, provider registration, deduplication, persistent transcript logging, and explicit human approval make an operator workflow easier to reason about. The documented NVIDIA/CUDA requirement and WIP status limit immediate portability. The architecture document reports singletons, event-driven overlay updates, PM2 deployment, and auto-reconnect as product choices; those are source claims supported by the pinned docs and adapter code, not observed production behavior.

## MoltStream

### User jobs and product boundary

The pinned README presents MoltStream as an autonomous AI streamer: initialize a config, connect to Kick chat, run an LLM personality, speak through TTS, drive an avatar/browser source, and publish an RTMP stream. Its MCP package adds control from Claude, Cursor, or another MCP client. The repository's [README](https://github.com/skaggsxyz/moltstream/blob/c521f9cff19833ed4f4ef6bdf69bf3c6a3049d09/README.md), [MCP source](https://github.com/skaggsxyz/moltstream/blob/c521f9cff19833ed4f4ef6bdf69bf3c6a3049d09/packages/mcp/src/index.ts), and package manifests are the primary evidence.

The source MCP server declares nine tools: `get_status`, `start_stream`, `stop_stream`, `send_chat`, `get_chat_log`, `get_traces`, `update_personality`, `obs_control`, and `configure`. `obs_control` supports six actions: start/stop streaming, get status, switch scene, get scenes, and toggle mute. There is no source tool for recording lifecycle, screenshot capture, arbitrary input settings, or a complete scene/source inspection workflow. It is therefore an adjacent agent-streaming control plane rather than a replacement for a general OBS MCP server.

### Architecture and execution path

[`packages/mcp/src/index.ts`](https://github.com/skaggsxyz/moltstream/blob/c521f9cff19833ed4f4ef6bdf69bf3c6a3049d09/packages/mcp/src/index.ts) uses the MCP SDK's low-level `Server`, `StdioServerTransport`, and request schemas. State (`status`, chat log, traces, and feature flags) is held in process memory. Tool handlers return text containing JSON or status strings. The package is intentionally small and separates the streamer domain from its OBS helper, but the source has several operational limits:

* `obsRequest` opens a new `ws://localhost:4455` connection for each request, uses a five-second timeout, sends an OBS Hello response with `rpcVersion: 1`, then sends one request. The helper does not implement an OBS authentication challenge/response path, does not accept a configurable URL in that function, and uses the fixed request ID `mcp-req`.
* A failed OBS request becomes an `OBS error: ...` rejection, which the tool handler serializes as an MCP error result. The five-second bound is useful, but a fresh socket for every call gives no persistent connection, event subscription, reconnect state, or readback cache.
* `configure` reads and regex-patches the YAML file. Config reads redact selected LLM, TTS, API, and auth-token fields, but the hand-rolled parser and patcher are narrower than a typed configuration model and should be treated as a product risk for nested settings.
* The MCP package depends on workspace `@moltstream/streamer`, so it is not an independently published package at the pinned source. The CLI package declares version 0.4.0, the CLI source constant is 0.7.0, the MCP package is 0.1.0, and npm `moltstream` is 0.7.0. The mismatch is recorded in [`releases.json`](releases.json); it is a release reproducibility limitation, not a reason to merge the identities.

The modular package layout is still valuable for an agent streamer: chat, policy, traces, avatar/TTS, broadcast, and MCP are distinct packages and tool boundaries. The explicit domain tools also make common high-level jobs easy to invoke when the streamer process is already configured.

### Safe execution check

The repository has no root pnpm lockfile at this pinned checkout, so a frozen install was not possible. In an isolated temporary clone, the bounded fallback was:

```text
pnpm --dir /tmp/obs-adjacent.HULbPO/molt install --no-frozen-lockfile --ignore-scripts
```

It completed after 3m28.5s and generated a lockfile only in the temporary clone. The MCP build was then attempted:

```text
pnpm --dir /tmp/obs-adjacent.HULbPO/molt --filter @moltstream/mcp build
```

It failed with TypeScript `TS2307: Cannot find module '@moltstream/streamer'`. This leaf-only build does not establish a product defect because workspace dependencies had not been built. A corrected dependency-inclusive attempt, `pnpm --dir /tmp/obs-adjacent.HULbPO/molt --filter '@moltstream/mcp...' build`, selected seven workspace packages and failed with `TS18003` in core, TTS, avatar, and chat packages: inherited `../../packages` exclusions remove their own `src/**/*` inputs. This is the actual observed build blocker. [Exact command/result](../results/molt-dependency-build.json), [build log](../results/molt-dependency-build.log). No OBS process, Kick account, LLM key, TTS credential, or stream was contacted.

### Reference-job assessment

MoltStream's strongest independent idea is a high-level agent-streaming contract that exposes status, chat, reasoning traces, personality updates, and a small OBS control vocabulary in one MCP surface. Its five-second OBS watchdog and explicit error text are useful starting points. The fixed local WebSocket endpoint, absent authentication path, per-call socket, in-memory state, narrow six-action OBS interface, version drift, and failed clean build materially limit execution feasibility and general OBS reference-job coverage.

## Claude OBS Plugin

### User jobs and architecture

The pinned repository is a Claude Code distribution wrapper. Its plugin metadata identifies version 1.0.0 and MIT licensing ([`plugin.json`](https://github.com/danielrosehill/Claude-OBS-Plugin/blob/4b44ff79db2f009b6921c3461c9f2761a4018b43/.claude-plugin/plugin.json)). The `.mcp.json` launches `npx -y obs-mcp@latest` and passes `OBS_WEBSOCKET_URL` (default `ws://localhost:4455`) and `OBS_WEBSOCKET_PASSWORD` ([`.mcp.json`](https://github.com/danielrosehill/Claude-OBS-Plugin/blob/4b44ff79db2f009b6921c3461c9f2761a4018b43/.mcp.json)). It contains no independent OBS MCP implementation.

The end-user workflow is Linux onboarding and maintenance: detect native/Flatpak/Snap/AppImage OBS installations, enable or validate obs-websocket, initialize a management workspace, back up OBS configuration, and install third-party OBS plugins. The repository's [README](https://github.com/danielrosehill/Claude-OBS-Plugin/blob/4b44ff79db2f009b6921c3461c9f2761a4018b43/README.md) and setup/detection/backup/plugin skills describe those workflows. They complement an MCP server by solving installation and recovery jobs that direct servers generally leave to the user.

The wrapper's important limitation is attribution and reproducibility: `npx -y obs-mcp@latest` is mutable and resolves the npm package at invocation time. The plugin therefore inherits the selected upstream package's schemas, connection behavior, and release status. The environment map requires a password variable, while the setup documentation discusses prompting for and avoiding storage of that password; this should be clarified before calling the setup workflow reproducible. The install-plugin skill can execute system/plugin installation commands, so it was inspected but not run for this study.

### Safe execution check and reference-job assessment

No tests are declared in the plugin repository. The plugin's setup, backup, and install workflows were not executed because doing so would change OBS configuration or install plugins/system dependencies. Static review establishes a useful Linux onboarding boundary, but it provides no observed MCP initialization, tool listing, state fidelity, screenshot, recording, or failure behavior beyond what the mutable upstream `obs-mcp` package supplies. It remains a wrapper lane, not a direct candidate.

## Giancarlo26/obs-action-history: event and meter specialist

This late discovery has both a general MCP control surface and a distinctive event-history design. It is scored in the [direct comparison](../candidates/giancarlo.md); this section develops its specialist contribution. The pinned source is [`882c3c1c0e490bb8aa6e2f3487f6aa817a1521bb`](https://github.com/Giancarlo26/obs-action-history/tree/882c3c1c0e490bb8aa6e2f3487f6aa817a1521bb), authored 2026-08-19, with package version 0.1.0, Node >=22, zero runtime dependencies, and an MIT [`LICENSE`](https://github.com/Giancarlo26/obs-action-history/blob/882c3c1c0e490bb8aa6e2f3487f6aa817a1521bb/LICENSE). No npm publication or GitHub release was verified. The package metadata, source SHA, and no-publication disposition are in [`releases.json`](releases.json).

The product's differentiator is reactive observation. Its README explains that ordinary OBS request wrappers can answer current state but cannot answer whether a microphone is producing audio or whether a media source's cursor has stopped advancing. The server subscribes to OBS events and exposes `obs_watch`, while `InputVolumeMeters` are reduced to per-source peak/last dB/sample counts for `obs_who_is_talking`. This is a distinct end-user job: “who is loud now?”, “what changed recently?”, and “is this media source alive?” rather than only “what is true at this request.”

### Source architecture

The server embeds a CommonJS `ObsClient` in [`server.js`](https://github.com/Giancarlo26/obs-action-history/blob/882c3c1c0e490bb8aa6e2f3487f6aa817a1521bb/server.js). It performs the OBS WebSocket v5 Hello/Identify/authentication handshake with Node's built-in `WebSocket` and `crypto`, subscribes to scene/input/output/media/filter/UI groups plus the high-volume meters bit, and tracks one persistent connection. Connection setup is coalesced through `connecting`; opening has an eight-second timeout, each request has a 15-second timeout, and close rejects all pending requests. The client also exposes request batches, event listeners with unsubscribe functions, close listeners, and bounded reconnect helpers in [`lib/obs.js`](https://github.com/Giancarlo26/obs-action-history/blob/882c3c1c0e490bb8aa6e2f3487f6aa817a1521bb/lib/obs.js).

The live MCP entry defines 23 core tools and loads 44 module tools from eleven modules, for **67 tools**. This count is observed from the source: the repository's `npm run preflight` reported “44 module tools load and are well formed,” while the core `TOOLS` array contains 23 entries. The modules cover scene items, filters, audio routing, capture, studio mode, inputs, outputs, media, hotkeys, and projectors ([registry](https://github.com/Giancarlo26/obs-action-history/blob/882c3c1c0e490bb8aa6e2f3487f6aa817a1521bb/mcp/tools/index.js)). The registry skips missing, malformed, throwing, or duplicate modules so an optional capability cannot prevent the base server from starting. `preflight` also scans credentials, machine-specific values, personal data, commit trailers, module shape, and the license.

The source contains two OBS client implementations: the active `server.js` entry owns its own `ObsClient`, while `lib/obs.js` exports a richer client used by the extracted library surface. That duplication is a maintenance risk because timeout, reconnect, event, and request behavior can diverge; the server's actual behavior must be attributed to its embedded class. The custom MCP transport is newline-delimited JSON-RPC 2.0, with serialized request handling and raw image results for `obs_screenshot`. It returns the requested protocol version during initialize rather than selecting from a fixed supported-version set, so protocol negotiation deserves a separate compatibility check.

### Safe source checks

In a temporary clone, Node 24.20.0 ran:

```text
npm run preflight
```

The command passed all checks, reported 44 module tools, and confirmed the MIT license. A no-OBS process check with an isolated HOME and loopback-only unused OBS URL initialized successfully and listed 67 tools; stderr reported the missing-password diagnostic and readiness, while stdout contained JSON-RPC responses only. No OBS connection was attempted because the initialize and tools/list methods do not call the client.

The subsequent [direct candidate review](../candidates/giancarlo.md) executed the shared reference job through its real MCP entry: scene/audio mutation, recording, valid PNG, and bounded failures passed after explicit response-parser adjudication. This does not exercise all 67 tools or the complete meter/event-history workflow. A targeted event fixture remains future work.

### Lessons for the main study

The most reusable design is the distinction between request state and event history. A bounded event ring prevents a long broadcast from turning event collection into a memory leak, while meter aggregation answers a useful human question without returning thousands of samples. `obs_record_control`, `obs_stream_control`, audio control, and screenshot handlers also read back state after mutations; descriptions explain operational traps such as asynchronous replay-buffer writes, scene-item z-order, filter overlay semantics, and dangerous output stops. The fail-safe registry and preflight checks are practical distribution safeguards.

The study should avoid copying the product's machine-specific narrative or treating static “reference machine” measurements as universal. The active/server-vs-library duplicate client boundary should be consolidated in any adopted design, and initialize version negotiation, raw-request authorization, event subscription volume, and reconnect/re-registration semantics should be tested explicitly. The specialist does not establish real rendering, device, codec, streaming, or performance behavior in this study.

## Cross-product evidence

The adjacent products and Giancarlo specialist analysis expose complementary user jobs:

| Product | Distinct user job | Architecture evidence worth carrying forward | Boundary to preserve |
| --- | --- | --- | --- |
| OBS Live Suite | Produce a structured live show with overlays, assets, chat, Stream Deck, and human-reviewed live assist | Domain-level MCP tools over an application API; separate OBS connection/state/scene/source controllers; bounded HTTP errors; provider registry and approval cards | MCP success should not imply OBS-confirmed state; default LAN bind and stateless HTTP need deployment policy |
| MoltStream | Run and supervise an autonomous chat/TTS/avatar streamer | High-level status/chat/trace tools; modular streamer packages; bounded OBS watchdog | Persistent connection, authentication, identity/readback, screenshot/recording support, and reproducible workspace build remain necessary for general OBS control |
| Claude OBS Plugin | Set up and maintain OBS on Linux for a Claude user | Installation detection, workspace backups, configuration recovery, and explicit plugin-management skills | Pin the upstream server and clarify secret handling; wrapper behavior cannot substitute for server evidence |
| Giancarlo (also scored directly) | Explain recent OBS changes and summarize audio levels | Bounded event history, meter aggregation, mutation readback, and module preflight checks | Separate the actual embedded client from the extracted library; full event-history behavior remains outside the shared fixture |

The architecture evidence is informative for the study's recommendation section, but none of these static reviews establishes real OBS rendering, device capture, codecs, live streaming, or production performance.
