# xDarkzx/OBS_MCP

Observed 2026-09-13 under the frozen study methodology. The pinned repository source is the only owned candidate here that passed all 14 implemented common behavior probes, including a valid PNG. Its published PyPI artifact is currently non-starting under a fresh unconstrained install, so it is not eligible as a dependable complete winner.

## Identity and evidence boundary

- **Source:** [`xDarkzx/OBS_MCP`](https://github.com/xDarkzx/OBS_MCP/tree/d632587facb94d80563628054ba58dc4af1d700f), pinned at `d632587facb94d80563628054ba58dc4af1d700f`. Metadata declares Python 3.10+, Apache-2.0, version 0.2.0, `mcp[cli]>=1,<2`, and obsws-python 1.7+ ([current `pyproject.toml`](https://github.com/xDarkzx/OBS_MCP/blob/d632587facb94d80563628054ba58dc4af1d700f/pyproject.toml)); the license file is Apache 2.0 ([`LICENSE`](https://github.com/xDarkzx/OBS_MCP/blob/d632587facb94d80563628054ba58dc4af1d700f/LICENSE)).
- **Released artifact:** PyPI reports `obs-mcp==0.2.0`, wheel SHA-256 `6e1030ec5036c64fc0c4a4ec376916aee85fcf221f3543050362aa81cf1e2b60`, and upload time 2026-07-25 ([PyPI JSON](https://pypi.org/pypi/obs-mcp/0.2.0/json)). Tag `v0.2.0` is commit `ae557d1f63d61f1717630b9ca9a16284e38dbd24`. No `obs_mcp/` source changed between that tag and pinned HEAD, but the release metadata says `mcp[cli]>=1.0.0` without `<2` ([tagged metadata](https://github.com/xDarkzx/OBS_MCP/blob/ae557d1f63d61f1717630b9ca9a16284e38dbd24/pyproject.toml)). A fresh install selected MCP 2.2.0 and exited with `ModuleNotFoundError: mcp.server.fastmcp`.
- **Maintainer claims:** the README advertises PyPI/`uvx`, broad OBS v5 control, and `clean_audio_input` plus `diagnose_av_health` workflows ([README](https://github.com/xDarkzx/OBS_MCP/blob/d632587facb94d80563628054ba58dc4af1d700f/README.md)). The source architecture explicitly describes the request lock, reconnect policy, and generic dispatcher ([architecture](https://github.com/xDarkzx/OBS_MCP/blob/d632587facb94d80563628054ba58dc4af1d700f/docs/ARCHITECTURE.md)).
- **Observed execution:** the pinned source with its corrected dependency bound passed 14 common probes; the published artifact failed initialization before opening an OBS connection. Extended workflow calls terminated truthfully at fixture-unimplemented `GetStats` and `GetSourceFilterKindList`; full workflow composition is therefore supported by executed own tests, not claimed as shared end-to-end OBS behavior.
- **Runtime:** CPython 3.11.2 with uv 0.11.3. The source environment used MCP 1.30.0; the fresh published environment selected MCP 2.2.0.

Commands used from fresh temporary locations:

```text
git clone https://github.com/xDarkzx/OBS_MCP.git <temporary>/repo
uv run --extra dev pytest -q
node fixture/runner.mjs --adapter adapters/xdark.json --output results/xdark
uv venv <temporary>/venv
uv pip install --python <temporary>/venv/bin/python obs-mcp==0.2.0
node fixture/runner.mjs --adapter adapters/xdark-pypi.json --output results/xdark-pypi
node results/aaron-xdark-workflow-extended-probes.mjs
```

The source suite passed 20 tests. Evidence: [`xdark.json`](../results/xdark/xdark.json), [`xdark-pypi.json`](../results/xdark-pypi/xdark-pypi.json), [`xdark-own-tests.log`](../results/xdark-own-tests.log), and [`aaron-xdark-workflow-extended-probes.json`](../results/aaron-xdark-workflow-extended-probes.json).

## Gates

| Gate | Verdict | Evidence and rationale |
|---|---|---|
| G1 Reproducible entry | **P** | The documented source build starts, initializes MCP, and lists 148 tools. The independently released PyPI path fails and is separately charged to G6/F; a valid attributable build entry was still observed. |
| G2 Protocol and identity correctness | **p** | Shared probes confirmed version, scenes, scene readback, mute readback, and exact camelCase OBS arguments. Initialization reports `obs-mcp` version `1.30.0`, the MCP SDK version instead of product 0.2.0, so identity is only partial. |
| G3 State and result fidelity | **P** | Scene/mute mutations changed fake OBS state, recording completed start/status/stop, a 70-byte PNG decoded and passed CRC/IEND/IDAT validation, and OBS code/comment survived in MCP errors. |
| G4 Failure and lifecycle behavior | **P** | Invalid schema, unknown entity, injected OBS failure, five-second missing reply, in-flight disconnect, and reduced capability all returned bounded errors. The client serializes the send/receive library and resets connection state after transport failures ([client](https://github.com/xDarkzx/OBS_MCP/blob/d632587facb94d80563628054ba58dc4af1d700f/obs_mcp/obs_client.py)). |
| G5 Complete reference workflow | **P** | The complete inspection, scene/audio mutation, recording, and screenshot sequence succeeded through MCP in the shared fake. This does not establish real rendering or devices. |
| G6 Honest usable MCP contract | **F** | The README's ordinary `pip install obs-mcp`/`uvx obs-mcp` route resolves MCP 2.2.0 from the released metadata and exits before MCP initialization. Pinned HEAD fixes the bound but has not produced a new attributable release. Initialization also reports the framework version. |

## Architecture scores

| Dimension | Rating | Rationale |
|---|---:|---|
| A Responsibility boundaries | **3/4** | MCP entry, connection/error taxonomy, registry, category mappings, and pipelines are separate. A module-global client remains the shared dependency, but request serialization and tool discovery live in focused components. |
| B Protocol and state model | **3/4** | The generic dispatcher preserves nested JSON, separates OBS request errors from connection failures, serializes a library without request-ID matching, and resets on transport failure. Product identity is wrong and there is no event/capability state model beyond `GetVersion.availableRequests`. |
| C Reference and real-world fitness | **4/4** | The source completes the reference job and adds two coherent user workflows. `clean_audio_input` checks available filter kinds and reorders stages; `diagnose_av_health` distinguishes render, encoder, network, and disk signals ([pipeline source](https://github.com/xDarkzx/OBS_MCP/blob/d632587facb94d80563628054ba58dc4af1d700f/obs_mcp/tools/pipeline_tools.py)). |
| D Test architecture and evidence | **2/4** | Twenty tests concentrate on pipeline ordering/idempotence and registry fail-loud behavior ([tests](https://github.com/xDarkzx/OBS_MCP/tree/d632587facb94d80563628054ba58dc4af1d700f/tests)). They do not cover the published install, full entry, screenshots, secrets, or most mappings. Shared source execution is strong but exposed the release gap. |
| E Changeability | **3/4** | Generic dispatch and category modules localize ordinary requests and nested settings. Events and identity remain broad changes; transport selection is mostly an entry concern. |
| F Operability and distribution | **1/4** | Documentation and multi-platform source setup are extensive, but the verified published artifact no longer starts under its declared unconstrained dependency. Source HEAD is usable only because it contains the unreleased upper bound. |

Weighted score: **70.00/100**.

## Changeability traces

- **One OBS request:** add a decorated mapping to the appropriate tool module, using `client.execute(RequestType, **fields)`, and a contract test. Add `_EXPECTED_MODULES` only when introducing a new module.
- **One nested settings kind:** the generic dispatcher and dictionary arguments are already lossless; add a thin schema/mapping and round-trip test.
- **One event-confirmed workflow:** introduce an OBS event connection/subscription, bounded event correlation, cancellation, and lifecycle ownership. The current single lock protects request/reply traffic but has no event store.
- **Second MCP transport:** parameterize `mcp.run()` in the entry and keep registration/client modules unchanged; add stdout and shutdown coverage per transport.
- **Canvas identity:** canvas-list support exists at request level, but broad name-based wrappers need UUID/canvas arguments and identity-preserving outputs; update mapping schemas and workflow selection logic together.

The workflow separation, filter capability check, request serialization, and transport-failure reset are worth adopting. Avoid publishing dependency ranges that differ from the tested source constraint, and make product identity explicit rather than inheriting an SDK version.
