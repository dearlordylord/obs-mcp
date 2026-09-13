# ironystock/agentic-obs

Observed 2026-09-13. Source snapshot: [`89fcf6c68675229e01c7e702e3234cf0cf53ebe7`](https://github.com/ironystock/agentic-obs/commit/89fcf6c68675229e01c7e702e3234cf0cf53ebe7). Runtime: Go 1.25.5. License: MIT, copyright ironystock, in the pinned [license](https://github.com/ironystock/agentic-obs/blob/89fcf6c68675229e01c7e702e3234cf0cf53ebe7/LICENSE).

## Artifact and publication identity

There are no GitHub tags or releases. Go's module resolver independently resolves `@latest` to pseudo-version `v0.0.0-20260418210912-89fcf6c68675`, origin hash equal to the pinned head, with module sum `h1:NKvJ1k+NLKWPiXBrxZWrR4nFXlXh0LfcwPUQJkaNb+s=`. This is source/module distribution, not a maintainer-cut versioned release. The pinned [README](https://github.com/ironystock/agentic-obs/blob/89fcf6c68675229e01c7e702e3234cf0cf53ebe7/README.md) attributes installation to `github.com/ironystock/agentic-obs@latest`; the license identifies ironystock. The changelog calls 0.13.0 the latest dated release-like milestone, while the built binary and MCP initialization both report `dev`.

A user-local Go 1.25.5 toolchain built the source. `go test ./...` passed every test-bearing package: root, automation, docs, HTTP, MCP, storage, and TUI. The OBS client and screenshot manager packages have no direct tests, but the MCP tests use a typed error-injectable fake. The binary was tested only against loopback synthetic OBS.

## Gates

| Gate | Verdict | Rationale |
|---|---|---|
| G1 | **p** | With an initialized database, the binary connected before MCP startup, initialized, and listed 72 tools. On a genuinely clean HOME it printed interactive setup prompts to stdout and read stdin before MCP startup; the shared runner's initialize JSON was consumed by those prompts and timed out. A second run after ordinary first-run initialization works. |
| G2 | **P** | Shared probes observed correct scene, toggle-mute, record, and version/status request mapping with relevant names. Structured outputs preserve state. Identity is mainly name plus scene item ID; broad UUID/canvas support is absent. |
| G3 | **P** | Scene/mute state and recording lifecycle were truthful. Strict generated schemas rejected missing scene name, and unknown entity/injected OBS errors returned `isError: true` with code/comment. The shared runner's key-name heuristic initially marked `current_scene`/`is_muted` readbacks false, but their structured values and fixture state are unambiguous passes. |
| G4 | **F** | Missing reply and in-flight disconnect both exceeded the ten-second watchdog. The client's monitor reconnects only after its internal connected flag becomes false, while an in-flight request through goobs did not yield a bounded MCP error in the probe. |
| G5 | **P** | Shared execution completed inspection, scene/audio mutation, and recording. A focused shared-fixture extension enabled the documented loopback HTTP service, created a screenshot source, then read `obs://screenshot/{name}` as a valid 70-byte PNG. |
| G6 | **F** | Fresh-run prompts corrupt stdout and consume MCP messages. Runtime lists 72 tools and identifies `dev`, while README/changelog advertise 81 tools/0.13.0-era behavior. With `AGENTIC_OBS_HTTP_ENABLED=false`, the still-advertised `create_screenshot_source` dereferenced a nil HTTP server and crashed the process; the database insertion had already persisted. |

Evidence: final shared output `results/agentic-fixture-seeded/agentic.json`; clean-run output `results/agentic-fixture/agentic.json`; focused observations in `results/agentic-first-run.log` and `results/agentic-screenshot-probes.json`. Mocking cannot establish rendering, real capture/devices/codecs, live streaming, or performance.

## Architecture score

| Dimension | Rating | Rationale |
|---|---:|---|
| A Responsibility boundaries | **3** | [`interfaces.go`](https://github.com/ironystock/agentic-obs/blob/89fcf6c68675229e01c7e702e3234cf0cf53ebe7/internal/mcp/interfaces.go) defines a typed OBS capability boundary; separate packages own OBS, storage, screenshots, automation, HTTP, TUI, and MCP. [`server.go`](https://github.com/ironystock/agentic-obs/blob/89fcf6c68675229e01c7e702e3234cf0cf53ebe7/internal/mcp/server.go) is still a large composition root and `tools.go` is a monolithic registry/handler file; HTTP assumptions leaked into the screenshot tool and caused the observed panic. |
| B Protocol and state model | **2** | Structured outputs, strict schemas, error propagation, event callbacks, and the capability interface are strong. Most entity identity is name/item ID; `ToggleInputMute` cannot request an idempotent target state; timeout/disconnect behavior is unbounded in practice; capability/config state does not consistently govern advertised handlers. |
| C Reference and real-world fitness | **3** | It provides resources, prompts, screenshot retention, presets, source design, filters, transitions, automation, TUI, and dashboards beyond the core job. The screenshot resource is usable. Fresh-start and disabled-HTTP crashes are major operational gaps, and stream elicitation proceeds when elicitation fails. |
| D Test architecture and evidence | **3** | The passing suite exercises typed fakes, injected errors, tools, prompts/resources, storage, HTTP, automation, shutdown, and TUI. [`tools_test.go`](https://github.com/ironystock/agentic-obs/blob/89fcf6c68675229e01c7e702e3234cf0cf53ebe7/internal/mcp/tools_test.go) includes happy/error workflow cases. There is no OBS-wire contract suite, and tests missed both fresh stdio setup and HTTP-disabled screenshot panic. |
| E Changeability | **2** | Package boundaries help, but adding capability crosses the OBS interface, client implementation, fake, registry, handlers, history/help/docs, and often storage. Large generated-style registration and duplicated help content amplify changes. |
| F Operability and distribution | **1** | Source installation through Go is reproducible, configuration is persisted, logging redacts passwords, and shutdown paths exist. There are no tagged releases/binaries, version metadata remains `dev`, first-run breaks stdio MCP, startup requires OBS, and disabling HTTP leaves a process-crashing advertised tool. |

Weighted score: **61.25/100**.

## Changeability traces

- **One OBS request:** add it to `OBSClient`, implement in `internal/obs/commands.go`, add fake state/error hooks, define public input/output, register/handle it in `tools.go`, then update help/docs/history tests. This is explicit but several-file work.
- **One nested settings kind:** generic maps already preserve filter/source settings, and strict outer schemas allow `additionalProperties` only at selected nested fields. A new typed kind affects interface/client models, schema structs, structured output, fake, and round-trip tests.
- **An event-confirmed workflow:** event callbacks and automation engine already exist. Add callback/state mapping, bounded waiter or rule trigger, lifecycle cancellation, tool/prompt surface, action history, and failure tests. Do not rely solely on polling flags.
- **A second MCP transport:** MCP server construction is reusable, but `main.go` owns stdio, first-run prompts, storage, OBS connection, HTTP, and signals in one sequence. Extract startup/session composition before adding transport-specific lifecycle/authentication.
- **Canvas identity:** current scene operations accept names and source operations mostly item IDs. Canvas support changes the OBS interface and goobs request parameters, public schemas/outputs, storage keys for presets/screenshots, completion providers, and tests.

## Independent lessons

Worth adopting: a typed OBS boundary; structured results; error-injectable fakes; bounded screenshot retention; read-only resources; workflow prompts; event callbacks; and action history with redaction. Avoid: interactive stdout on an stdio server, mandatory OBS connection before MCP initialization, runtime configuration that does not unregister dependent tools, persisting state before a fallible response is completed, and documentation counts/version strings maintained separately from registration/build metadata.
