# OBS MCP Competitor And Parity Matrix

Status: proposed draft.

Date: 2026-06-12.

Scope: public OBS Studio / obs-websocket MCP implementations, package distributions, marketplace mirrors, and official obs-websocket protocol surfaces that should inform a cleanroom OBS MCP implementation.

Cleanroom rule: competitors are evidence for user-facing expectations, packaging, parity, and gotchas. They are not implementation sources. The protocol source of truth is the official `obsproject/obs-websocket` generated protocol docs.

Audit guard draft: `plans/obs-competitor-index.json` classifies every tracked competitor and protocol category as `true-competitor`, `distribution-wrapper`, `registry-mirror`, `stale-or-unavailable`, or `protocol-source`, and classifies protocol/tool surfaces as `initial`, `parity-gap`, `later`, or `not-mcp-facing`.

## Evidence Sources

- Huly reference structure: `/workspace/typescript/hulymcp`, especially `plans/huly-sdk-gap-matrix.md` and `plans/sdk-parity-ledger.json`.
- Official OBS protocol clone: `.references/protocol/obs-websocket`, commit `ffb09e892bb829e781172a2883870aa1416c638c`.
- Saved official protocol file: `.references/protocol/obs-websocket/docs/generated/protocol.md`, refreshed from `https://github.com/obsproject/obs-websocket/blob/master/docs/generated/protocol.md`.
- Existing OBS MCP reference clone: `.references/obs_websocket_workspace`.
- Competitor clones and tarballs: `.references/competitors`.

## Competitor Landscape

| Project | Class | Runtime / license | Distribution | Tool shape | Coverage signal | Cleanroom takeaways |
|---|---|---|---|---|---|---|
| `royshil/obs-mcp` | True competitor | TypeScript/Node, GPL-2.0 | GitHub, `npx -y obs-mcp@latest` | 125 npm / 127 repo tools across broad OBS categories | Broadest handwritten low-level parity among direct TS competitors | Track parity categories, request names, and user expectations. Avoid GPL contamination, text-only JSON results, weak tests, and broad filesystem/vendor tools without policy. |
| `cdavis-code/obs_websocket_workspace` / `@unngh/obs-mcp` | True competitor plus npm/pub distribution | Dart core, compiled JS npm, MIT | GitHub, pub.dev, Homebrew, `npx @unngh/obs-mcp` | Code mode with `search` and `execute`; 134 internal OBS operations | Broad internal operation registry, v5.7-aware | Use for parity discovery only. Reject generated code-mode/eval/static-client architecture. |
| `sbroenne/mcp-server-obs` | True competitor plus VS Code distribution | C#/.NET server, TypeScript VS Code wrapper, MIT | GitHub release zip, VS Code Marketplace | 7 action-multiplexed tools | Strong Windows/VS Code packaging, screenshots, window capture, virtual camera, real OBS integration tests | Adopt packaging lessons, stdout/stderr discipline, window-capture and screenshot parity. Avoid static singleton client and action-multiplexed schemas. |
| `ironystock/agentic-obs` | True competitor | Go, MIT | `go install`, stdio MCP plus local HTTP/TUI | 81 tools in 9 groups plus 4 meta-tools, resources, prompts | Strong workflow/product layer and better tests than most competitors | Adopt typed OBS capability interface, resources/prompts where useful, lifecycle handling, error-injection tests, screenshot retention. Avoid unauthenticated HTTP exposure and config toggles that do not actually gate handlers. |
| `LarsCanGit/OBS-MCP` | True competitor | JavaScript/Node, MIT | GitHub, `npx -y obs-mcp-server` | 26 tools | Compact direct-control surface including canvas, profiles, screenshots | Useful baseline for small first release scope. Need deeper review before implementation. |
| `takurot/obs-showrunner-mcp` | True competitor, higher-level abstraction | TypeScript/Node, npm metadata MIT | GitHub, `npx obs-showrunner-mcp` | 18 higher-level showrunner tools | Show-flow, safety, effects, overlays, snapshots | Useful for later workflow tools and naming. Not a source for core protocol layer. |
| `yshk-mrt/obs-mcp` | Prototype competitor | TypeScript/Node, MIT | GitHub clone/build | 23 JSON-defined actions | Hackathon/prototype scene/media/filter automation | Useful as low-priority idea source. Do not use as parity authority. |
| `danielrosehill/Claude-OBS-Plugin` | Distribution wrapper | Claude Code plugin, MIT | Claude plugin install | Bundles/launches Roy's `obs-mcp` | Setup, backup, plugin management workflows around OBS | Track for install/setup UX, not MCP implementation parity. |
| `@iflow-mcp/obs-mcp` | Registry/package mirror or redistribution | TypeScript/Node package, GPL-2.0 | npm | 127 tools, closely matching Roy package | Not proven independent | Track as package ecosystem signal only. |
| Registry mirrors: LobeHub, MCP Market, Shyft, Glama, LangDB, MCP.so | Registry mirror | N/A | Web registries | Mirror Roy/Lars metadata | Discovery/SEO only | Do not treat as independent implementations. |
| `consigcody94/stream-pilot` | Stale or unavailable listing | Unknown | LobeHub listing only | Listed as OBS+Twitch MCP with 21 tools | Source not publicly cloneable during research | Revisit only if source or package becomes available. |

## Official Protocol Parity Baseline

The official generated protocol currently has 147 requests across 14 request categories and 60 events across 11 event categories. `GetVersion.availableRequests` must drive feature gating; version strings are only soft hints.

| Protocol category | Initial MCP status | Minimum useful tools | Later parity targets / gotchas |
|---|---|---|---|
| General | Initial | `get_version`, `get_stats`, `trigger_hotkey` | Vendor/custom requests should be gated; `Sleep` matters mostly for request batches. |
| Config | Parity gap | `get_record_directory`, stream service reads after core is stable | Scene collection/profile switching blocks and has side effects; video settings need paired dimension/FPS validation. |
| Scenes | Initial | `list_scenes`, `get_current_scene`, `set_current_scene` | Preview/studio mode tools, scene create/remove/rename, transition overrides, canvas-aware identities. |
| Inputs | Initial | `list_inputs`, `get_input_mute`, `set_input_mute`, `get_input_volume`, `set_input_volume` | Input create/remove/settings, property-list/button tools, deinterlace v5.6, audio tracks/monitor/sync. |
| Transitions | Later | None in first slice unless needed by competitor parity | Current transition, duration, settings, T-bar; T-bar is likely future-deprecated. |
| Filters | Later | None in first slice | Filter CRUD/settings/enabled/reorder; settings overlay semantics need explicit docs. |
| Outputs | Later | Virtual camera after record/stream are stable | Generic output list/status/start/stop/settings, replay buffer, output-specific state semantics. |
| Scene Items | Initial | `list_scene_items`, `set_scene_item_enabled` | Find by source with `searchOffset`, transform, lock/index/blend, create/remove/duplicate; IDs are per scene/group. |
| Media Inputs | Later | None in first slice | Playback status, seek, trigger action; cursor operations do not bounds-check. |
| Ui | Later | None in first slice | Studio mode, monitor list, projector APIs, input dialogs; projector APIs may change/deprecate. |
| Record | Initial | `get_record_status`, `start_recording`, `stop_recording` | Pause/resume, split file, chapter markers, settings/path; chapter markers require Hybrid MP4 as of OBS 30.2. |
| Stream | Initial | `get_stream_status`, `start_stream`, `stop_stream` | Captions, stream service config belongs under Config; tests must avoid requiring a real stream destination by default. |
| Sources | Parity gap | Source active status and screenshots after file policy exists | Base64 screenshot payload size, supported formats from `GetVersion`, save path policy. |
| Canvases | Later | `list_canvases` after core scene/source identity works | v5.7; canvas UUID breaks name-only assumptions and program/preview scene concepts do not apply to canvases. |

## Current Draft Coverage

The cleanroom architecture draft already proposes these first-slice surfaces:

- Connection/context and version/stats.
- Scenes: list/get/set current.
- Stream: status/start/stop.
- Record: status/start/stop.
- Inputs: list, mute, volume.
- Scene items: list, enable/disable.
- Raw request escape hatch.
- Fake OBS websocket harness.

## Gaps To Add Before First Implementation Plan

| Gap | Source evidence | Why it matters | Proposed cleanroom treatment |
|---|---|---|---|
| Version-gated request registry | Official protocol, Roy broad parity | OBS installations differ by available requests | Cache `GetVersion.availableRequests`; validate raw and typed requests before dispatch where possible. |
| Window capture workflow | Sbroenne | Common recording workflow in VS Code/user automation | Add later typed tools: list windows via `GetInputPropertiesListPropertyItems`, create/set/remove window capture source. |
| Screenshot policy | Sbroenne, Roy, Agentic OBS, official Sources | Useful for visual verification but high payload/filesystem risk | Add after core: base64 screenshot resource/tool and save-to-file only under explicit path policy. |
| Virtual camera and replay buffer | Sbroenne, Agentic OBS, official Outputs | Common OBS controls beyond stream/record | Add output tools in parity phase. |
| Recording pause/resume/settings/path | Sbroenne, official Record/Config | Useful and low conceptual complexity | Add after start/stop with clear state/error semantics. |
| Resources/prompts | Agentic OBS | Helpful for clients that support MCP resources/prompts | Add read-only resources for version/context/scenes after tools are stable. |
| Toolset/category filtering | Huly, Agentic OBS gotcha | Large tool surfaces need scoping | Build registry from config at startup; disabled categories must actually unregister or reject handlers. |
| Event subscriptions | Official protocol, Agentic OBS | Needed for automation/history | Defer. If added, model as session config and bounded event buffer/resource. |
| Request batches | Official protocol | Useful for animations/multi-step OBS changes | Defer until request/response correctness and error mapping are solid. |
| Multi-canvas identity | Official v5.7 | Avoid name-only assumptions becoming wrong | Use optional `canvasUuid` in schemas where official protocol supports it. |

## Architectural Gotchas To Avoid

- Do not expose an in-process code execution tool.
- Do not use action-multiplexed tools when explicit schemas provide clearer LLM behavior.
- Do not use static singleton connection state when an Effect scoped service can own lifecycle.
- Do not leak credentials or config paths through status tools.
- Do not write logs to stdout in stdio mode.
- Do not allow arbitrary file writes for screenshots without a path policy.
- Do not expose arbitrary vendor/raw requests without gating, available-request validation, and a clear warning in the tool description.
- Do not rely on version strings alone for feature gating.

## Best Ideas To Borrow

- Huly: Effect services/layers, schema-first tools, strict harness, no mocks, stdio plus HTTP infrastructure.
- Agentic OBS: typed OBS capability interface, explicit tool groups, resources/prompts, action history with redaction, graceful shutdown, screenshot retention.
- Sbroenne: VS Code extension wrapper, stderr logging discipline, real MCP-client integration tests, window capture workflow.
- Roy: broad request category coverage as parity checklist, raw protocol edge cases.
- Lars/Takurot/YSHK: smaller first-slice and higher-level workflow naming ideas.

## Open Research

- Deep-read Lars, Takurot, and YSHK before finalizing first release scope.
- Verify npm tarball contents and licenses for all package distributions before citing package-derived behavior.
- Decide whether the first public package should include VS Code packaging or keep that as a later distribution layer.
- Decide whether `send_raw_obs_request` ships in the default toolset or behind `TOOLSETS=raw`.
