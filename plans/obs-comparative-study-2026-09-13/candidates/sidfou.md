# sid-fou/obs-stream-mcp

Observed 2026-09-13 at commit [`60f14e61b25e8173c67dc18e0fdf741cacc788ec`](https://github.com/sid-fou/obs-stream-mcp/tree/60f14e61b25e8173c67dc18e0fdf741cacc788ec). This is a credible direct OBS MCP server, scoped primarily to live streaming, scene construction, multi-RTMP, Teleport, and multi-PC coordination rather than recording. Its declared source version is `0.1.0`. No tag was present at the pinned commit or remote, and the [`obs-stream-mcp` PyPI JSON endpoint](https://pypi.org/pypi/obs-stream-mcp/json) returned 404, so no public package was independently verified. The README claims MIT, but the pinned repository has no `LICENSE` file and [`pyproject.toml`](https://github.com/sid-fou/obs-stream-mcp/blob/60f14e61b25e8173c67dc18e0fdf741cacc788ec/pyproject.toml) declares no license; provenance is therefore a maintainer claim rather than a license artifact.

## Entry and execution evidence

The documented source command is `pip install -e .`, then `obs-stream-mcp`. In a fresh Linux/aarch64 checkout using Python 3.13.12 and uv 0.11.3, installation and wheel construction passed, producing a study-built wheel with SHA-256 `5799e0cadd65a92feb888857bfcf245f918e80cc8e823f67e29c6886e0ea7a6c`. The unconstrained `mcp>=1.0.0` dependency selected MCP 2.2.0; the entry failed before initialization because [`tools.py`](https://github.com/sid-fou/obs-stream-mcp/blob/60f14e61b25e8173c67dc18e0fdf741cacc788ec/src/obs_stream_mcp/tools.py) uses the MCP 1.x `Server.list_tools()` decorator removed in MCP 2. A reasonable alternate attempt pinned `mcp==1.26.0` without changing candidate code. That entry initialized, listed 36 tools, connected to the fixture, and ran the shared probes. This deviation earns only a partial reproducible-entry gate.

Commands:

```text
git clone --no-checkout https://github.com/sid-fou/obs-stream-mcp.git /tmp/obs-sidfou-pKc7OU/repo
git -C /tmp/obs-sidfou-pKc7OU/repo checkout --detach 60f14e61b25e8173c67dc18e0fdf741cacc788ec
uv venv --python 3.13 .venv
uv pip install --python .venv/bin/python -e .
uv build --wheel --out-dir /tmp/sidfou-dist .
env -i PATH="$PATH" HOME=/tmp/obs-sidfou-pKc7OU/home XDG_CONFIG_HOME=/tmp/obs-sidfou-pKc7OU/home/.config OBS_HOST=127.0.0.1 OBS_PORT=65534 OBS_PASSWORD=<synthetic> timeout 10s .venv/bin/obs-stream-mcp --no-sse
uv pip install --python .venv/bin/python 'mcp==1.26.0'
node fixture/runner.mjs --adapter adapters/sidfou.json --output results/sidfou
node results/sidfou-extended-probes.mjs
python3 -m compileall -q /tmp/obs-sidfou-pKc7OU/repo/src
```

There is no authored test suite. Source compilation passed. With the MCP 1.26 deviation, frozen fixture 2026-09-13.5 observed valid initialization, listing, OBS authentication, version/health data, scene listing, and `SetCurrentProgramScene` followed by actual `Main` readback. The shared runner labels that readback `fail` only because its generic extractor does not recognize the nested `data.current_program_scene`; the raw result and fixture state establish the mutation, so it is manually adjudicated as a pass. Missing reply and subsequent disconnect probes each exceeded the 10-second watchdog. Invalid JSON-schema input used MCP `isError:true`; controller errors such as missing scene and injected OBS 600 were readable `{"success":false,...}` text but had MCP `isError:false`.

Machine evidence: [shared result](../results/sidfou/sidfou.json), [extended streaming/workflow probes](../results/sidfou-extended-probes.json), [declared install](../results/sidfou-install.log), [declared entry failure](../results/sidfou-declared-entry.stderr.log), [MCP 1.26 deviation](../results/sidfou-mcp1-install.log), [build](../results/sidfou-build.log), and [source check](../results/sidfou-source-check.log). The extended probe observed stream-key redaction, a stop-stream confirmation guard before any OBS request, and truthful fixture-unimplemented errors for source visibility/scene construction. Mock execution does not establish real streaming, plugins, UI automation, devices, codecs, rendering, or cluster behavior.

## Gates

| Gate | Result | Evidence and rationale |
|---|---:|---|
| G1 | **p** | The documented fresh install resolves MCP 2.2 and crashes before initialization. An explicit `mcp==1.26.0` deviation starts and serves valid initialization/listing. |
| G2 | **P** | Executed version, scene listing, scene-name forwarding, and scene readback preserve the supported reference contract. This finite pass does not establish richer fixture-unimplemented operations or optional UUID/canvas parity; those remain scope/architecture limitations. Framework version metadata is assessed under G6. |
| G3 | **p** | The supported scene mutation changed and read back fixture state correctly, and failures retain readable structured codes. Recording/audio fidelity is absent, and controller errors are returned without MCP `isError`. |
| G4 | **F** | Invalid schema input terminates correctly, but a missing `GetSceneList` reply and the subsequent disconnect case each exceeded the external 10-second watchdog. There is no request-level recovery/reconnect after the wedged persistent client. |
| G5 | **F** | No recording lifecycle, input mute/audio control, or screenshot tool is exposed, so the general recording reference workflow cannot be completed. This is consistent with its narrower streaming focus. |
| G6 | **F** | The documented unconstrained install is incompatible with current MCP; runtime identity is the SDK version; domain failures have `isError:false`; and Windows UI tools remain advertised in the base list when their optional handler is unavailable. Stdio remained clean and the observed stream key was redacted. |

This candidate is ineligible as a complete general-job winner. Its scene/streaming architecture remains relevant to the separate static ranking and its declared niche.

## Architecture scores

| Dimension | Rating | Rationale |
|---|---:|---|
| A Responsibility boundaries (25) | **3** | [`server.py`](https://github.com/sid-fou/obs-stream-mcp/blob/60f14e61b25e8173c67dc18e0fdf741cacc788ec/src/obs_stream_mcp/server.py) owns transports, [`schemas.py`](https://github.com/sid-fou/obs-stream-mcp/blob/60f14e61b25e8173c67dc18e0fdf741cacc788ec/src/obs_stream_mcp/schemas.py) schemas, [`obs_controller.py`](https://github.com/sid-fou/obs-stream-mcp/blob/60f14e61b25e8173c67dc18e0fdf741cacc788ec/src/obs_stream_mcp/obs_controller.py) protocol/domain calls, [`orchestrator.py`](https://github.com/sid-fou/obs-stream-mcp/blob/60f14e61b25e8173c67dc18e0fdf741cacc788ec/src/obs_stream_mcp/orchestrator.py) workflows, and coordination has its own client/manager. Large controller/UI modules and a central dispatch still concentrate policy. |
| B Protocol and state model (20) | **2** | Valid observed scene/version requests, explicit error codes, stream guards, settings redaction, readback after transforms, and rollback intent are strengths. Name-only identity, success-wrapped domain errors, a blocking persistent client with no request timeout recovery, and no capability-pruned tool list are material gaps. |
| C Reference and real-world fitness (15) | **2** | Scene/source/transform control, streaming settings/lifecycle, diagnostics, guarded destructive operations, scene builders, optional multi-RTMP/Teleport, and cluster transport form a substantial live-production scope. The complete recording/audio/screenshot job is absent, and native plugin/UI behavior is unverified. |
| D Test architecture and evidence (15) | **1** | There are no authored tests. The external fixture provides real MCP/wire success and failure evidence, but the default install fails and many ambitious workflows remain static-only. |
| E Changeability (15) | **2** | Separation helps, and a second SSE transport already exists, but each ordinary request crosses schema, tool catalog, central dispatch, and controller; events/canvas identity need new state abstractions. |
| F Operability and distribution (10) | **1** | Client configuration and `--no-sse` are documented, but the fresh dependency range is broken, no attributable release/license artifact exists, default stdio also binds background SSE to `0.0.0.0`, and unavailable optional tools remain listed. |

Weighted architecture score: **50.0/100**. Confidence: **high** for the source and tested core, low for Windows/plugin/cluster claims.

## Changeability traces

| Change | Concrete impact trace |
|---|---|
| Add one OBS request | Add schema in `schemas.py`, catalog and dispatch cases in `tools.py`, and mapping/error logic in `obs_controller.py`; extend docs/tests. |
| Add one nested settings kind | Extend permissive nested schema plus controller mapping/readback; settings can pass dictionaries, but each domain still needs hand-written preservation checks. |
| Add an event-confirmed workflow | Add OBS event subscription and correlated lifecycle state to `obs_controller.py`, then consume it in `orchestrator.py` with timeout/rollback policy. |
| Add a second MCP transport | SSE already shares `create_server`; another transport belongs in `server.py`, while authentication and lifecycle must be made consistent. |
| Add canvas identity | Extend schemas/catalog/dispatch/controller selectors with canvas and UUID fields and add discovery; current scene/source methods accept names only. |

The strongest ideas worth adopting are structured domain error codes, explicit confirmation guards, stream-key redaction, readback after transform, workflow rollback, and a shared server factory for stdio/SSE. Avoid unbounded dependency ranges across an SDK major version, advertising optional tools without handlers, and leaving request futures wedged after a missing response.

