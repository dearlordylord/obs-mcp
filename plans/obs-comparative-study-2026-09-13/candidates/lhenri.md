# LHenri88/obs-mcp

Observed 2026-09-13 at commit [`ca711037c0bca4c4c6e9142a52821319780bd45e`](https://github.com/LHenri88/obs-mcp/tree/ca711037c0bca4c4c6e9142a52821319780bd45e). This is a direct, deliberately Windows-only recording server. Its declared version is `0.1.0`; no tag was present at the pinned commit or remote. The repository contains an [MIT license](https://github.com/LHenri88/obs-mcp/blob/ca711037c0bca4c4c6e9142a52821319780bd45e/LICENSE). The package name is not independently attributable on PyPI: the live [`obs-mcp` project](https://pypi.org/project/obs-mcp/) is xDarkzx's unrelated 0.2.0 distribution. Accordingly, only the pinned source-built wheel is evaluated, not a public release.

## Entry and execution evidence

The README explicitly requires Windows because process discovery, registry lookup, and the OBS websocket config path are Windows-specific. It documents `uv venv --python 3.13`, `uv pip install -e .`, and `.venv/Scripts/obs-mcp.exe` ([README](https://github.com/LHenri88/obs-mcp/blob/ca711037c0bca4c4c6e9142a52821319780bd45e/README.md)). In a fresh Linux/aarch64 checkout, Python 3.13.12 and uv 0.11.3 successfully installed the source and built `obs_mcp-0.1.0-py3-none-any.whl` (study-built SHA-256 `2e60b956d7513f31820c81caf016d7fb909d3902065d58e7de14ccf046a160c4`). The documented entry then exited before initialization because [`paths.py`](https://github.com/LHenri88/obs-mcp/blob/ca711037c0bca4c4c6e9142a52821319780bd45e/src/obs_mcp/paths.py) imports the Windows-only `winreg` module. This is the documented native-platform boundary and is rated NT, not a product failure. No Windows host or real OBS was used.

Commands:

```text
git clone --no-checkout https://github.com/LHenri88/obs-mcp.git /tmp/obs-lhenri-MSg7lE/repo
git -C /tmp/obs-lhenri-MSg7lE/repo checkout --detach ca711037c0bca4c4c6e9142a52821319780bd45e
uv venv --python 3.13 .venv
uv pip install --python .venv/bin/python -e .
uv build --wheel --out-dir /tmp/lhenri-dist .
env -i PATH="$PATH" HOME=/tmp/obs-lhenri-MSg7lE/home XDG_CONFIG_HOME=/tmp/obs-lhenri-MSg7lE/home/.config timeout 10s .venv/bin/obs-mcp
node fixture/runner.mjs --adapter adapters/lhenri.json --output results/lhenri
python3 -m compileall -q /tmp/obs-lhenri-MSg7lE/repo/src
```

There is no authored test suite. Source compilation and wheel build passed. The frozen 2026-09-13.5 fixture recorded zero OBS connections and the attributable `winreg` startup boundary in [the machine-readable result](../results/lhenri/lhenri.json). Supporting logs: [install](../results/lhenri-install.log), [build](../results/lhenri-build.log), [entry](../results/lhenri-entry.stderr.log), and [source check](../results/lhenri-source-check.log).

## Gates

| Gate | Result | Evidence and rationale |
|---|---:|---|
| G1 | **NT** | Source installation and wheel construction passed, but the documented Windows entry could not initialize on the Linux study host. |
| G2 | **NT** | Static mappings use valid-looking obsws-python calls and preserve scene names/source item IDs, but no MCP-to-OBS execution occurred on the supported platform. Claims/static inspection cannot earn a runtime pass. |
| G3 | **NT** | Recording, scene, visibility, and screenshot result fidelity were not executable here. Static code polls `GetRecordStatus` after stop, but that is not observed runtime evidence. |
| G4 | **NT** | Connection setup is bounded (3-second requests and a 25-second cold-start deadline), but invalid input, OBS rejection, missing response, and disconnect behavior were not executable. |
| G5 | **F** | Even within its declared recording scope, the source has no audio inspection or mute operation, so the frozen general reference workflow cannot be completed. Windows-only scene/record/screenshot features remain NT. |
| G6 | **p** | The source is candid about Windows support and its 11 listed tools match [`server.py`](https://github.com/LHenri88/obs-mcp/blob/ca711037c0bca4c4c6e9142a52821319780bd45e/src/obs_mcp/server.py). MCP schemas, identity, errors, and stdout cleanliness could not be observed; there is no attributable public package. |

This candidate is ineligible as a complete general-job winner because G5 is F and most runtime gates are NT. The F does not contradict its narrower autonomous Windows screen-recording purpose.

## Architecture scores

| Dimension | Rating | Rationale |
|---|---:|---|
| A Responsibility boundaries (25) | **3** | [`paths.py`](https://github.com/LHenri88/obs-mcp/blob/ca711037c0bca4c4c6e9142a52821319780bd45e/src/obs_mcp/paths.py) owns Windows discovery/config/process work, [`client.py`](https://github.com/LHenri88/obs-mcp/blob/ca711037c0bca4c4c6e9142a52821319780bd45e/src/obs_mcp/client.py) owns connection/cold start, and `server.py` owns tools. Short-lived connection ownership is simple, although it prevents event-oriented coordination. |
| B Protocol and state model (20) | **2** | Calls preserve scene names and numeric scene-item identity; stop recording polls actual state. There is no capability model, UUID/canvas identity, event state, nested settings surface, or executed protocol evidence. |
| C Reference and real-world fitness (15) | **2** | Cold-start OBS enablement, record-directory control, flush polling, source visibility, and screenshot files form a coherent Windows recording workflow. Audio control, streaming, other platforms, and real-device/render evidence are absent. |
| D Test architecture and evidence (15) | **1** | No authored tests exist. A clean source build, compile check, and externally observed platform boundary provide limited evidence; none exercises a tool. |
| E Changeability (15) | **2** | The small modules localize ordinary tool additions, but richer settings, events, transports, and canvas-aware identity require new models and longer-lived connection boundaries. |
| F Operability and distribution (10) | **2** | The source install, verification script, explicit platform requirements, OBS discovery, and bounded cold start are useful. Windows-only operation, mutation of OBS's config, lack of an attributable release, and per-call reconnection add burden. |

Weighted architecture score: **52.5/100**. Confidence: **medium** because the supported runtime was unavailable.

## Changeability traces

| Change | Concrete impact trace |
|---|---|
| Add one OBS request | Add one decorated handler in `server.py`; reuse `_client()` and disconnect discipline; document it. |
| Add one nested settings kind | Introduce an explicit settings schema/model and mapping in `server.py`; current tools expose no generic nested-settings boundary. |
| Add an event-confirmed workflow | Replace or supplement short-lived `ReqClient` calls in `client.py` with a subscription/lifecycle owner, then add workflow state and timeout policy. |
| Add a second MCP transport | Parameterize `main()`/`mcp.run()` and configuration; tool functions can remain shared. |
| Add canvas identity | Extend scene/source schemas and calls in `server.py` with canvas/UUID selectors; add discovery support rather than relying only on names and item IDs. |

The strongest ideas worth adopting are explicit cold-start readiness polling, a read-only setup verifier, source-item IDs for visibility, and post-stop flush polling. Avoid coupling server import to platform-only discovery code and avoid writing OBS configuration without an explicit dry-run/consent boundary.

