# OBS MCP study census

Observed 2026-09-13. This is the reproducible census for the fixed comparative study. It records the declared index, the local reference implementation, adjacent products, and the bounded final discovery pass. It does not silently expand the scored direct set after scoring began.

## Scope and evidence rules

The direct lane contains an implementation that exposes an MCP server or an attributable direct bridge to OBS Studio over OBS WebSocket or an OBS-native integration. The reference job is the seven-step workflow in [`methodology.md`](../methodology.md): install/init, inspect capabilities and state, mutate scene/source/audio, record lifecycle, screenshot, bounded failure behavior, and composable MCP output. Adjacent products can inform architecture and user jobs, but their feature count does not enter the direct-server ranking.

Every entry is pinned to a full source commit SHA. `study/releases.json` is the machine-readable release ledger: it contains the source URL, observed commit date where recoverable, manifest and declared version, runtime, license provenance, registry or release identity, publication version, release date where available, commands attempted, and known source/publication discrepancies. A source manifest and a registry package are separate evidence objects; a same-name registry package is not attributed to a repository without identity evidence.

Evidence is labeled as observed source/registry metadata, maintainer declaration, observed execution, or inference. No stars, repository size, implementation language, recency, tool count alone, or visual polish affects census inclusion. A real OBS instance was not assumed and no real OBS, stream, chat, external credential, system service, or plugin installation was used in this census.

## Frozen direct index and local reference

The initial fixed set is the established June index named by the methodology. The local project is evaluated as a thirteenth implementation under the same rules. The table gives the full source SHA and the independently checked publication disposition; details and exact commands are in [`releases.json`](releases.json).

| Candidate | Lane | Pinned source | Publication identity/version observed | Runtime and license provenance |
| --- | --- | --- | --- | --- |
| [Royshil/obs-mcp](https://github.com/royshil/obs-mcp/tree/314e7c065ef8c5e2656757b35b24ea7fa81489b0) | direct | `314e7c065ef8c5e2656757b35b24ea7fa81489b0` | npm [`obs-mcp`](https://registry.npmjs.org/obs-mcp) 1.1.0; source package declares 1.0.1, so versions differ | Node/TypeScript plus legacy Python; GPL-2.0 source license |
| [cdavis-code/obs_websocket_workspace](https://github.com/cdavis-code/obs_websocket_workspace/tree/1d95b2933dc1de520cca09414d5d65b2a85466b8) / `@unngh` | direct | `1d95b2933dc1de520cca09414d5d65b2a85466b8` | pub [`obs_mcp`](https://pub.dev/api/packages/obs_mcp) 5.7.2 and npm [`@unngh/obs-mcp`](https://registry.npmjs.org/@unngh%2fobs-mcp) 5.7.5; source is the Dart 5.7.2 package | Dart >=3.8; MIT source license |
| [sbroenne/mcp-server-obs](https://github.com/sbroenne/mcp-server-obs/tree/96354251a40a6a7299585652358f63eba62b3714) | direct | `96354251a40a6a7299585652358f63eba62b3714` | GitHub releases `mcp-v1.0.4` and `vscode-v1.0.4`, with tag SHAs recorded in the ledger; no registry package observed | .NET 10 Windows server plus TypeScript extension; MIT |
| [ironystock/agentic-obs](https://github.com/ironystock/agentic-obs/tree/89fcf6c68675229e01c7e702e3234cf0cf53ebe7) | direct | `89fcf6c68675229e01c7e702e3234cf0cf53ebe7` | no tag, GitHub release, or package publication observed; source default is `dev` | Go 1.25.5+; MIT |
| [LarsCanGit/OBS-MCP](https://github.com/LarsCanGit/OBS-MCP/tree/8025f2c0336cb882d79e3227884fcaedd6d23603) | direct | `8025f2c0336cb882d79e3227884fcaedd6d23603` | npm [`obs-mcp-server`](https://registry.npmjs.org/obs-mcp-server) 1.0.0; identity and source version agree | Node >=18; MIT |
| [takurot/obs-showrunner-mcp](https://github.com/takurot/obs-showrunner-mcp/tree/3682378f0bcc886ee1c8340b0f4fbba3e1088876) | direct/high-level | `3682378f0bcc886ee1c8340b0f4fbba3e1088876` | npm [`obs-showrunner-mcp`](https://registry.npmjs.org/obs-showrunner-mcp) 0.1.0; identity and source version agree | Node >=18; MIT declared in package metadata, no source LICENSE observed |
| [yshk-mrt/obs-mcp](https://github.com/yshk-mrt/obs-mcp/tree/643e6646075083418f956e163b6f8c0998f34a68) | direct/prototype | `643e6646075083418f956e163b6f8c0998f34a68` | no publication verified for declared npm name `obs-mcp-server-ts`; npm [`obs-mcp`](https://registry.npmjs.org/obs-mcp) is Royshil's different package | Node/TypeScript; MIT |
| [aaronckj/obs-studio-mcp](https://github.com/aaronckj/obs-studio-mcp/tree/599b382d97ab554bc21951b725bef3faf3085779) | direct | `599b382d97ab554bc21951b725bef3faf3085779` | PyPI [`obs-studio-mcp`](https://pypi.org/pypi/obs-studio-mcp/json) 0.5.1; homepage and version identify the source | Python >=3.11; MIT in source and package metadata |
| [Tom-R-Main/OBS-MCP](https://github.com/Tom-R-Main/OBS-MCP/tree/df584ddbcf117ed82ac5c232d82f128baec8292a) | direct/independent lineage | `df584ddbcf117ed82ac5c232d82f128baec8292a` | no package publication for this repository; its README says so. npm `obs-mcp` 1.1.0 is Royshil's package and is not attributed here | Node >=20.19 plus legacy Python; GPL-2.0-only |
| [JLFN/obs-mcp](https://github.com/JLFN/obs-mcp/tree/f9dccf0f8903b225615ba3b80a8a63287b92716a) | direct | `f9dccf0f8903b225615ba3b80a8a63287b92716a` | crates.io [`obs-mcp`](https://crates.io/api/v1/crates/obs-mcp) 0.2.0; repository and version identify the crate | Rust 1.88+; MIT OR Apache-2.0 |
| [xDarkzx/OBS_MCP](https://github.com/xDarkzx/OBS_MCP/tree/d632587facb94d80563628054ba58dc4af1d700f) | direct | `d632587facb94d80563628054ba58dc4af1d700f` | PyPI [`obs-mcp`](https://pypi.org/pypi/obs-mcp/json) 0.2.0; package metadata identifies this source | Python >=3.10; Apache-2.0 |
| [ITchrisDEB/obs-studio-mcp](https://github.com/ITchrisDEB/obs-studio-mcp/tree/05f00bafa93725b16b17733d09a561dfd464741c) | direct/Linux-adjacent | `05f00bafa93725b16b17733d09a561dfd464741c` | no npm, PyPI, or other package publication verified | Rust workspace; Linux daemon/tray/dashboard; MIT |
| [dearlordylord/obs-mcp](https://github.com/dearlordylord/obs-mcp/tree/587e356b00d9269dcd124969ee36aad9635f2db8) / local | local reference | `587e356b00d9269dcd124969ee36aad9635f2db8` | npm [`@firfi/obs-mcp`](https://registry.npmjs.org/@firfi%2fobs-mcp) 0.3.3; source and publication identity/version agree | Node/TypeScript; MIT in package metadata (no top-level LICENSE observed) |

Publication observations are point-in-time observations on 2026-09-13. A missing registry or GitHub release means “not observed” under the bounded checks, not proof that a private or inaccessible artifact cannot exist.

## Bounded discovery protocol

The final sweep was run on 2026-09-13 with the following fixed limits. GitHub repository API searches used `per_page=20`, `page=1`, for each of `obs mcp`, `obs studio mcp`, `obs websocket mcp`, and `obs streaming mcp`. The unauthenticated API returned HTTP 403 during the sweep; no long unauthenticated retry loop was used. The primary GitHub search HTML pages were then checked once, page 1 only, for the same four exact queries:

* [`obs mcp`](https://github.com/search?q=obs+mcp&type=repositories)
* [`obs studio mcp`](https://github.com/search?q=obs+studio+mcp&type=repositories)
* [`obs websocket mcp`](https://github.com/search?q=obs+websocket+mcp&type=repositories)
* [`obs streaming mcp`](https://github.com/search?q=obs+streaming+mcp&type=repositories)

The omission check added one bounded page-1 HTML pass for `obs events mcp`, `obs studio model context protocol`, `obs stream mcp`, `obs-websocket server mcp`, and `OBS MCP server`; the last three responses were rate limited (HTTP 429), so their inaccessible listings are recorded as such rather than interpreted as empty results. Each GitHub candidate that could be reached was checked with `git ls-remote` for its default branch and tags, then its pinned manifest, README, license, and relevant source were fetched. Tags were recorded as source references; a tag was called a release only when a GitHub release or registry publication was independently observed.

Registry checks were similarly bounded: npm registry search used `size=250` for exact text queries `obs mcp`, `obs studio mcp`, and `obs websocket mcp`, followed by direct metadata for candidate package names; crates.io API used page 1 with `per_page=100` for `obs-mcp`, `obs-studio-mcp`, and `obs-websocket-mcp`; PyPI and pub.dev used direct exact-name JSON endpoints for candidate names. No registry search result was included without source identity evidence. Full commands and per-entry outcomes are in [`releases.json`](releases.json).

An item entered the direct-lane omission review only if its primary source showed an MCP surface or a directly attributable OBS control bridge. A product entered the adjacent lane if it used OBS in a broader live-production workflow or was a distribution wrapper. Observability, Obsidian, media-only, Streamlabs, registry mirror, and unavailable-source results were excluded. A source-only direct candidate remains a discovery finding even when it has no publication or release.

## Omission and amended-candidate disposition

The sweep found material omissions. They are recorded in [`releases.json`](releases.json) with full SHAs. The dated methodology amendment now adds six direct implementations to the review set: `dcc-mcp-obs`, `LHenri88/obs-mcp`, `sid-fou/obs-stream-mcp`, `muhammadumarakram1/mcp-obs-websocket`, `Giancarlo26/obs-action-history`, and `BEA-BOLD-EVOLUTION/obs-studio-bridge`. The final direct comparison contains 18 external implementations plus local, with three adjacent applications/wrappers reviewed separately. Their candidate reviews and fixture evidence must be read with the amendment's NT/environment-blocker rule; the amendment changes coverage only, not gates, anchors, or weights.

| Finding | Evidence and relevance | Disposition |
| --- | --- | --- |
| [LHenri88/obs-mcp](https://github.com/LHenri88/obs-mcp/tree/ca711037c0bca4c4c6e9142a52821319780bd45e) | Python/Windows source declares 0.1.0 MIT and implements 11 tools, cold-start OBS plus WebSocket enablement, recording flush polling, and screenshot behavior. PyPI `obs-mcp` is xDarkzx's different project. | Included by the dated amendment; see [`candidates/lhenri.md`](../candidates/lhenri.md). |
| [dcc-mcp/dcc-mcp-obs](https://github.com/dcc-mcp/dcc-mcp-obs/tree/b30dd8f0498750582f33a3e2be46f8a9eb9f848e) | Native OBS plugin plus Python MCP sidecar, source/PyPI 1.4.0 GPL-2.0-or-later, typed readback and instance-identity claims, tags v1.0.0 through v1.4.0 checked. | Included by the dated amendment; see [`candidates/dcc.md`](../candidates/dcc.md). Native/plugin lifecycle remains a separate execution policy. |
| [Giancarlo26/obs-action-history](https://github.com/Giancarlo26/obs-action-history/tree/882c3c1c0e490bb8aa6e2f3487f6aa817a1521bb) | Node >=22, 0.1.0 MIT, source-only; has a general 67-tool OBS control surface plus event and audio-meter history diagnostics. | Included in the direct comparison: [`giancarlo.md`](../candidates/giancarlo.md). Its specialist history design also receives deeper analysis in [`adjacent.md`](adjacent.md). |
| [sid-fou/obs-stream-mcp](https://github.com/sid-fou/obs-stream-mcp/tree/60f14e61b25e8173c67dc18e0fdf741cacc788ec) | Python source advertises streaming, plugin, Windows UI, and multi-PC workflows; no independent package or standalone license was verified; its README declares MIT. | Included by the dated amendment; see [`candidates/sidfou.md`](../candidates/sidfou.md), with platform/build limits recorded there. |
| [muhammadumarakram1/mcp-obs-websocket](https://github.com/muhammadumarakram1/mcp-obs-websocket/tree/37f3e7ae8031f034cc8282429c75703a11bd6737) | Node/TypeScript 1.0.0 MIT source; README exposes ten basic recording, scene, audio, and stats tools; no independent publication. | Included by the dated amendment; see [`candidates/umar.md`](../candidates/umar.md). |
| [BEA-BOLD-EVOLUTION/obs-studio-bridge](https://github.com/BEA-BOLD-EVOLUTION/obs-studio-bridge/tree/d1909bd397c390fb7a644ca24ff53c088e401fa3) | Node/TypeScript 1.6.0 MIT source includes an independent local HTTP MCP bridge plus a native dock and hosted creator application. The README reports the Windows installer withdrawn; the local MCP source can be built independently. | Included in the direct comparison: [`bea.md`](../candidates/bea.md). Local HTTP entry, native dock, hosted workflows, and unavailable installer are distinct evidence boundaries. |

The dated amendment covers all six direct additions. Giancarlo and BEA initially appeared specialist/adjacent; source review established independent general OBS control surfaces, so the same direct criteria apply. An unavailable installer or an unexecuted fixture is not a reason to exclude an otherwise attributable implementation. Coverage changed; the scoring rules did not.

## Explicit exclusions and collisions

* **Stream Pilot:** the earlier index named it, but no accessible primary source repository or independently attributable package was available at observation time. It remains an explicit unavailable-source exclusion rather than a claim that no such product has ever existed.
* **Observability collisions:** `rhobs/obs-mcp` and npm `agent-obs` describe observability/agent telemetry, not OBS Studio control. They were excluded even though the names contain `obs` and `mcp`.
* **Unrelated desktop products:** `obs-cli` is a CLI, `@leejkee/obs-live-overlay` is a browser-source overlay, and `AhmadTariq1337/streamlabs-mcp` targets Streamlabs Desktop rather than OBS Studio. These are not direct candidates.
* **Registry mirrors and same-name packages:** npm `obs-mcp` is Royshil's package; it is not evidence for Tom-R-Main, YSHK, or LHenri88. PyPI `obs-mcp` is xDarkzx's package and is not evidence for those repositories. crates.io `obs-mcp` is JLFN's crate. The scoped local npm package `@firfi/obs-mcp` and scoped `@unngh/obs-mcp` are distinct identities.

## Reproduction limits

GitHub API 403/429 responses limit exhaustive ranking of inaccessible search pages. The HTML and registry passes are therefore bounded evidence, not a claim of global completeness. A future audit should repeat the exact queries with authenticated or cached primary listings and compare repository identity before adding candidates. No candidate should be removed solely because its release listing was inaccessible; the ledger distinguishes “no release observed” from “listing inaccessible.”
