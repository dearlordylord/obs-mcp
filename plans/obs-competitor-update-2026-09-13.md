# OBS MCP competitive refresh — 2026-09-13

Research only. Comparison point: local `@firfi/obs-mcp@0.3.3`, commit `587e356b00d9269dcd124969ee36aad9635f2db8`. Historical baseline: the June 13–14 competitor notes and saved checkouts. This report supersedes their current-state gap assessments; the historical files remain unchanged.

## Findings

**Roy has not advanced since our previous review. Our main gaps against it are settings completeness, not missing OBS categories.** Its branch remains at [`314e7c0`](https://github.com/royshil/obs-mcp/commit/314e7c065ef8c5e2656757b35b24ea7fa81489b0), and [npm latest](https://registry.npmjs.org/obs-mcp) remains 1.1.0. Our current registry has 159 tools, compared with its 127 source registrations / 125 published registrations. Counts describe interfaces, not equivalent functionality. See the [focused Roy comparison](obs-competitor-royshil-update-2026-09-13.md) for pinned source evidence.

| Finding | What it means for us | Suggested priority |
|---|---|---|
| Filter reads omit setting values; writes accept only nine fields. Roy exposes arbitrary setting objects. | Common filter and plugin configuration cannot be completed through our current tools. Enabling every toolset does not bypass this limit. | First: improve filter settings discovery and mutation. |
| Generic output settings also retain only nine fields. | Output-kind-specific and plugin settings can be lost on reads or rejected on writes. | Next: extend output settings deliberately. |
| Our current-transition read drops the official `transitionSettings` response field. | Users cannot inspect these settings through that tool. Roy's dedicated settings reader calls a nonexistent protocol request, so its presence is not proof of a working advantage. | Extend our existing read; do not add Roy's request. |
| Our screenshot formats are fixed; some settings maps reject nested JSON. | Possible compatibility limits, dependent on actual OBS/plugin capabilities. | Lower priority; verify a concrete unsupported format or settings shape. |

These limits are documented design choices with real capability costs. Our screenshot directory boundary, batch-only handling of `Sleep`, and opt-in toolsets are separate policy choices. Roy's screenshot read truncates the base64 image; ours returns a complete bounded payload. Details and source links are in the [Roy report](obs-competitor-royshil-update-2026-09-13.md).

The independent [local audit](obs-competitor-local-baseline-2026-09-13.md) also found two field-level omissions against the official protocol: `list_scenes` cannot pass `canvasUuid`, and `create_input` cannot pass it when selecting a scene by name. These are real multi-canvas limitations, although this review does not establish them as working Roy advantages. Prompts, completions, and presets also remain absent; the June plan's resources, subscriptions, and event-confirmation work is largely implemented.

## What changed elsewhere

Among the established competitors reviewed, no new MCP operation surface was found after the saved snapshots. The material changes were distribution and adjacent production workflows:

- **cdavis / `@unngh/obs-mcp`:** added macOS, Linux, and Windows binaries and Homebrew release automation; npm moved from 5.7.4 to 5.7.5. This widens its installation options. [Release](https://github.com/cdavis-code/obs_websocket_workspace/releases/tag/v5.7.2).
- **OBS Live Suite:** added a WIP Live Assist pipeline combining local transcription, topic detection, LLM suggestions, and operator approval for poster/definition actions. Its MCP server did not change. This is a separate live-production product direction. [Pinned Live Assist documentation](https://github.com/JulienCr/obs-live-suite/blob/e3b96ac9f4e2ba72fb428a5ae745b8a3498e3a25/docs/LIVE-ASSIST.md).
- **Sbroenne:** dependency maintenance; its VS Code extension remains an existing packaging advantage. Agentic OBS, Lars, Takurot, YSHK, MoltStream, and the Claude wrapper stayed at their saved commits. Exact commits and releases are in the [landscape update](obs-competitor-landscape-update-2026-09-13.md).

The broader scan also found five projects absent from our old index. Several started after June; Tom-R-Main has older inherited code and a later independent launch. These are worth tracking:

| Project | Concrete signal to examine |
|---|---|
| [xDarkzx/OBS_MCP](https://github.com/xDarkzx/OBS_MCP/blob/d632587facb94d80563628054ba58dc4af1d700f/obs_mcp/tools/pipeline_tools.py) | One-call audio cleanup and AV-health diagnosis. |
| [aaronckj/obs-studio-mcp](https://github.com/aaronckj/obs-studio-mcp/tree/599b382d97ab554bc21951b725bef3faf3085779/src/obs_studio_mcp/tools) | Dry-run previews, scene-building helpers, and health sampling. |
| [Tom-R-Main/OBS-MCP](https://github.com/Tom-R-Main/OBS-MCP/blob/df584ddbcf117ed82ac5c232d82f128baec8292a/README.md) | Desktop MCPB packaging and request discovery; compatibility claims need independent validation. |
| [JLFN/obs-mcp](https://github.com/JLFN/obs-mcp/blob/f9dccf0f8903b225615ba3b80a8a63287b92716a/README.md) | Optional startup of a closed OBS and an all-tool mock/e2e test design. |
| [ITchrisDEB/obs-studio-mcp](https://github.com/ITchrisDEB/obs-studio-mcp/blob/05f00bafa93725b16b17733d09a561dfd464741c/README.md) | Linux device/plugin management, dashboard, and service lifecycle; a broader product scope. |

The [discovery report](obs-competitor-discovery-2026-09-13.md) distinguishes source observations from advertised capabilities and records chronology. Stream Pilot remains source-unavailable. This was a bounded scan, not an exhaustive market census.

JLFN's larger request-tool count was cross-checked: 157 table entries map to 151 unique request names, comprising our same 147 official names plus four private-settings names absent from the current official protocol. Six entries are convenience aliases. This establishes no official request-name deficit; support for those four additional names remains unverified. The exact names and source table are recorded in the [request-set audit](obs-competitor-discovery-2026-09-13.md#jlfn-request-set-check).

## Recommended order

1. Address filter and output settings completeness, expose current transition settings through the existing read, and close the two canvas-selector omissions.
2. Explore AV-health diagnosis and audio setup as focused workflows over existing primitives. Dry-run previews are worth evaluating alongside those workflows.
3. Evaluate MCPB or native packaging based on target clients and installation friction. Our existing npm path already covers basic installation.
4. Keep live transcription assistance, dashboards, and Linux plugin management as separate product decisions.

No implementation or roadmap commitment is made by this research.

## Evidence and limits

The earlier plans substantially understate current implementation. Current source contains 159 registered tools, resources/templates, bounded event history and confirmations, and stdio plus HTTP transport. Registration and protocol descriptor counts do not prove full field coverage or successful real-OBS execution.

An independent read of the live [official generated protocol JSON](https://github.com/obsproject/obs-websocket/blob/1ef34bf48110c2a18184e50e41cd0b1a855e2147/docs/generated/protocol.json) on September 13 found 147 requests and 60 events, with identical request/event name sets to our saved June snapshot. Upstream head was `1ef34bf48110c2a18184e50e41cd0b1a855e2147` (June 18). This checks names, not every schema or implementation detail.

Research used primary repository source, commit comparisons, release pages, and package metadata. Competitor implementations were inspected without executing them; there was no live OBS comparison. Detailed evidence is split across the [Roy report](obs-competitor-royshil-update-2026-09-13.md), [established landscape](obs-competitor-landscape-update-2026-09-13.md), and [discovery report](obs-competitor-discovery-2026-09-13.md).

Local validation passed: protocol parity, generated README, registry metadata, and version checks; a selected MCP/protocol test slice passed 323 tests. The full test suite was not run. The [local baseline](obs-competitor-local-baseline-2026-09-13.md) records file-level evidence and verification scope.
