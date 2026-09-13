# sbroenne/mcp-server-obs

Observed 2026-09-13. Source snapshot: [`96354251a40a6a7299585652358f63eba62b3714`](https://github.com/sbroenne/mcp-server-obs/commit/96354251a40a6a7299585652358f63eba62b3714). Runtime: .NET 10, declared Windows-only. License: MIT, copyright sbroenne, in the pinned [license](https://github.com/sbroenne/mcp-server-obs/blob/96354251a40a6a7299585652358f63eba62b3714/LICENSE).

## Artifact and publication identity

The [project properties](https://github.com/sbroenne/mcp-server-obs/blob/96354251a40a6a7299585652358f63eba62b3714/Directory.Build.props) attribute the package to Stefan Broenner. GitHub release [`mcp-v1.0.4`](https://github.com/sbroenne/mcp-server-obs/releases/tag/mcp-v1.0.4) was published by `sbroenne` on 2026-03-25 from commit [`7b4c64c9ee54b5bf1f345990f5d085893cae151a`](https://github.com/sbroenne/mcp-server-obs/commit/7b4c64c9ee54b5bf1f345990f5d085893cae151a). The downloaded Windows x64 zip matched GitHub's SHA-256 exactly.

Version identity is inconsistent: current [`ObsMcp.McpServer.csproj`](https://github.com/sbroenne/mcp-server-obs/blob/96354251a40a6a7299585652358f63eba62b3714/src/ObsMcp.McpServer/ObsMcp.McpServer.csproj) declares 0.0.3; [`Program.cs`](https://github.com/sbroenne/mcp-server-obs/blob/96354251a40a6a7299585652358f63eba62b3714/src/ObsMcp.McpServer/Program.cs) reports MCP server 1.0.0; the latest independently published server release is 1.0.4.

The Windows release could not execute on Linux arm64, an environmental NT. A user-local .NET 10.0.401 SDK built the current source with Windows targeting enabled, and the resulting managed DLL executed under Linux for protocol fixture work. `dotnet test` built successfully: 26 tests passed and 20 real-OBS integration tests failed in setup because no real OBS existed. Those 20 are environmental NT. This alternate execution does not validate the product's Windows capture integrations.

## Gates

| Gate | Verdict | Rationale |
|---|---|---|
| G1 | **P** | The source-built documented server initialized, listed seven action-multiplexed tools, and connected through its documented `obs_connection` setup tool. The published platform artifact itself was NT on this host. |
| G2 | **p** | Scene, mute, record, and saved-screenshot requests mapped correctly with names and relevant arguments. The version adapter could only use connection status, which did not expose or request OBS version. Entity handling is name-based and source visibility first resolves name to item ID. |
| G3 | **F** | Successful operations mutated fixture state and human-readable readbacks were accurate. However every tool catches exceptions and returns an `Error: ...` string as a successful MCP result; observed missing parameters, unknown scene, and injected OBS 600 errors all had `isError` false. |
| G4 | **F** | Invalid/OBS errors were success results. Missing reply and in-flight disconnect exceeded the watchdog. [`ObsClient.Connect`](https://github.com/sbroenne/mcp-server-obs/blob/96354251a40a6a7299585652358f63eba62b3714/src/ObsMcp.McpServer/ObsClient.cs) bounds only connection setup at ten seconds, not ordinary requests. |
| G5 | **P** | Inspection, scene/audio change, and recording completed with truthful human-readable state. The final fixture's `SaveSourceScreenshot` support wrote the caller-selected path, and the runner validated a complete 70-byte PNG. This proves protocol composition with the mock; real-OBS screenshot and recording tests remained NT. |
| G6 | **F** | `Error:` content is returned with MCP success, and three conflicting product versions are exposed. Action enums provide discoverable schemas but couple unrelated action-specific optional parameters into each tool. |

Evidence: `results/sbroenne-fixture/sbroenne.json`, `results/polyglot-own-tests.log`, `results/polyglot-publication.json`. Mocked execution cannot establish Windows capture, file creation, rendering, devices/codecs, live streaming, or performance.

## Architecture score

| Dimension | Rating | Rationale |
|---|---:|---|
| A Responsibility boundaries | **1** | A reusable [`ObsClient`](https://github.com/sbroenne/mcp-server-obs/blob/96354251a40a6a7299585652358f63eba62b3714/src/ObsMcp.McpServer/ObsClient.cs) separates the third-party OBS library, but [`ObsConnectionTool`](https://github.com/sbroenne/mcp-server-obs/blob/96354251a40a6a7299585652358f63eba62b3714/src/ObsMcp.McpServer/Tools/ObsConnectionTool.cs) owns a static singleton used by every static tool. Seven tool classes mix validation, output formatting, workflow policy, filesystem paths, and error conversion. |
| B Protocol and state model | **1** | Typed third-party response models provide workable happy-path mapping. Error state is erased into successful strings; outputs are prose; capability negotiation, events, UUID/canvas identity, nested settings fidelity, and request-level timeouts are absent. |
| C Reference and real-world fitness | **2** | Its declared Windows window-recording scope is coherent: window discovery/capture, audio policy, paths/formats, screenshot files, and virtual camera form a practical workflow. The general OBS surface is narrow and its default recording action mutates audio by muting all inputs. |
| D Test architecture and evidence | **2** | There are unit and MCP-server tests plus ambitious opt-in real OBS scenarios in pinned [`tests`](https://github.com/sbroenne/mcp-server-obs/tree/96354251a40a6a7299585652358f63eba62b3714/tests). Twenty-six passed; 20 real tests were NT. Tests often assert absence of the word “Error,” mirroring the string-error design instead of validating MCP error semantics. |
| E Changeability | **1** | Each feature crosses `ObsClient`, an action enum, a switch, action-specific optional parameters, prose formatting, docs/instructions, and tests. Events and additional transports lack extension seams. |
| F Operability and distribution | **2** | A VS Code extension and signed/digested GitHub zip are strong distribution choices for the target audience. Windows-only binaries, a .NET 10 runtime requirement, explicit connect step, and version drift materially raise support burden. |

Weighted score: **35.0/100**.

## Changeability traces

- **One OBS request:** add a method/model conversion to `ObsClient`; choose or create a multiplexed tool; extend its enum, signature, switch, validation/prose; update `Program` instructions and tests.
- **One nested settings kind:** Newtonsoft `JObject` can carry arbitrary JSON internally, but public tool signatures and prose outputs need new types/serialization if callers must round-trip it faithfully.
- **An event-confirmed workflow:** the static client has no event/state abstraction beyond connection callbacks. Add subscription ownership, correlated bounded waiting, workflow policy, MCP result/error modeling, and lifecycle tests across several modules.
- **A second MCP transport:** `Program` directly binds assembly-discovered static tools to stdio. Host configuration can add a transport, but singleton connection scope and shutdown semantics must be redesigned for multiple sessions.
- **Canvas identity:** current helpers take scene/source names and resolve item IDs. Canvas/UUID support affects client method signatures, every relevant action schema, lookup logic, output identity, and tests.

## Independent lessons

Worth adopting: stderr logging discipline; release checksums; one-click VS Code distribution; explicit screenshot file control; and opt-in tests against real OBS. Avoid: static singleton clients, broad action switches, default hidden audio mutations, error strings returned as success, and independently drifting assembly/MCP/release versions.
