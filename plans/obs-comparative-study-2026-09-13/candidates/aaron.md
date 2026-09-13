# aaronckj/obs-studio-mcp

Observed 2026-09-13 under the frozen study methodology. This is a direct Python MCP server. It is not eligible as a complete reference-job winner because the advertised screenshot operation fails in both the source checkout and the published artifact, and ordinary OBS connection logging exposes the supplied password on stderr.

## Identity and evidence boundary

- **Source:** [`aaronckj/obs-studio-mcp`](https://github.com/aaronckj/obs-studio-mcp/tree/599b382d97ab554bc21951b725bef3faf3085779), pinned at `599b382d97ab554bc21951b725bef3faf3085779` (`v0.5.1`). The project metadata declares Python 3.11+, version 0.5.1, MIT, `mcp>=1.2,<2`, and `obsws-python>=1.7` ([`pyproject.toml`](https://github.com/aaronckj/obs-studio-mcp/blob/599b382d97ab554bc21951b725bef3faf3085779/pyproject.toml)). The repository license text is MIT ([`LICENSE`](https://github.com/aaronckj/obs-studio-mcp/blob/599b382d97ab554bc21951b725bef3faf3085779/LICENSE)).
- **Released artifact:** PyPI independently reports `obs-studio-mcp==0.5.1`, owner `aaronckj`, MIT expression, wheel SHA-256 `5cc0c972654e3a3317d150083b2edd8ee5100cdd99673899d834a9f914b5f2a9`, and upload time 2026-07-28 ([PyPI JSON](https://pypi.org/pypi/obs-studio-mcp/0.5.1/json)). The release tag resolves to the pinned source SHA. A fresh artifact install selected MCP 1.30.0 and obsws-python 1.8.0.
- **Maintainer claims:** the README says every mutating tool has `dry_run=true`, advertises source screenshots, and documents `uvx obs-studio-mcp` ([README](https://github.com/aaronckj/obs-studio-mcp/blob/599b382d97ab554bc21951b725bef3faf3085779/README.md)).
- **Observed execution:** source and PyPI adapters produced the same shared-fixture outcome: 12 pass, 2 fail, 1 unsupported. The false-negative scene-readback result is a fixture extractor limitation: the recorded readback is explicitly `{"current_program":"Main"}` and the fixture state is `Main`. The real failures are screenshot execution and the password-bearing stderr line. Mocked WebSocket execution does not establish OBS rendering, codecs, devices, platform capture, live streaming, or performance.
- **Runtime:** CPython 3.11.2 with uv 0.11.3; the fresh release resolved MCP 1.30.0 and obsws-python 1.8.0.

Commands used from a fresh `/tmp/obs-aaron-*` checkout:

```text
git clone https://github.com/aaronckj/obs-studio-mcp.git <temporary>/repo
git -C <temporary>/repo rev-parse HEAD
uv run --extra dev pytest -q
node fixture/runner.mjs --adapter adapters/aaron.json --output results/aaron
node fixture/runner.mjs --adapter adapters/aaron-pypi.json --output results/aaron-pypi
node results/aaron-xdark-workflow-extended-probes.mjs
```

The test command passed 11 tests. Runtime evidence is in [`aaron.json`](../results/aaron/aaron.json), [`aaron-pypi.json`](../results/aaron-pypi/aaron-pypi.json), [`aaron-own-tests.log`](../results/aaron-own-tests.log), and [`aaron-xdark-workflow-extended-probes.json`](../results/aaron-xdark-workflow-extended-probes.json).

## Gates

| Gate | Verdict | Evidence and rationale |
|---|---|---|
| G1 Reproducible entry | **P** | Both the source entry and freshly installed PyPI console script initialized MCP and listed 62 tools with clean JSON-RPC stdout. |
| G2 Protocol and identity correctness | **p** | Version/scenes, exact `scene`, `input_name`, and boolean mute forwarding, unknown-scene errors, and readback all worked. MCP initialization identified the server as `obs-studio` version `1.30.0`, the MCP SDK version rather than product 0.5.1. The surface is primarily name-based and does not advertise canvas/UUID identity. |
| G3 State and result fidelity | **P** | Scene and mute state changed in the fake OBS, record start/status/stop returned to inactive, and injected OBS code 600 became an MCP tool error. The scene readback text and fixture state both said `Main`; the machine runner's one failed label came only from not recognizing the key `current_program`. |
| G4 Failure and lifecycle behavior | **P** | Invalid MCP arguments, unknown scenes, injected OBS errors, a missing reply, and an in-flight disconnect all terminated within the finite probes. Missing reply returned at the library's five-second timeout. The client does not clear a failed established connection, so automatic recovery is not established, but prompt truthful failure satisfies this gate. |
| G5 Complete reference workflow | **F** | Inspection, scene/audio changes, and recording compose, but `screenshot_source` fails before any OBS request: obsws-python 1.8.0 requires positional `width` and `height`; the tool omits `height` and omits `width` when unset ([source](https://github.com/aaronckj/obs-studio-mcp/blob/599b382d97ab554bc21951b725bef3faf3085779/src/obs_studio_mcp/tools/sources.py)). No usable screenshot was obtained. |
| G6 Honest usable MCP contract | **F** | The advertised screenshot is unusable with the fresh dependency resolution. More seriously, stderr contained obsws-python's `Connecting with parameters ... password='...'`; the published study result redacts the synthetic value but preserves the disclosure shape. The server itself does not raise that dependency logger above INFO. |

## Architecture scores

| Dimension | Rating | Rationale |
|---|---:|---|
| A Responsibility boundaries | **3/4** | Entry/app assembly, connection/secrets, and category tool modules are small and intelligible ([server](https://github.com/aaronckj/obs-studio-mcp/blob/599b382d97ab554bc21951b725bef3faf3085779/src/obs_studio_mcp/server.py), [client](https://github.com/aaronckj/obs-studio-mcp/blob/599b382d97ab554bc21951b725bef3faf3085779/src/obs_studio_mcp/client.py)). A module-global client and tool-local response shaping couple all requests to one synchronous connection. |
| B Protocol and state model | **2/4** | Nested input/filter settings remain dictionaries and OBS errors are wrapped. There is no capability model, event state, UUID/canvas identity, or reconnect state machine; several tools return ordinary `{"error":...}` values for local validation rather than a consistent MCP error. Product identity is wrong at initialization. |
| C Reference and real-world fitness | **2/4** | The main scene/audio/record flow works and the health/text/SFX helpers are useful, but screenshot is broken and health sampling blocks synchronously for up to 60 seconds. |
| D Test architecture and evidence | **2/4** | Eleven offline tests cover registration, basic forwarding, dry run, and pure health summaries ([tests](https://github.com/aaronckj/obs-studio-mcp/tree/599b382d97ab554bc21951b725bef3faf3085779/tests)). They omit screenshot signatures, connection failures, timeouts, secrets, and end-to-end entry behavior. Shared black-box execution supplies stronger evidence but found defects those tests miss. |
| E Changeability | **2/4** | Category modules make ordinary additions easy, while events, another transport, and identity changes cross the global connection and many name-shaped tool contracts. |
| F Operability and distribution | **3/4** | The tagged PyPI artifact, source entry, secret backends, and compact client setup are reproducible. Missing upper control for obsws-python allowed a runtime signature break, and INFO logging leaks the password. |

Weighted score: **58.75/100** under A25/B20/C15/D15/E15/F10.

## Changeability traces

- **One OBS request:** add one decorated function to the relevant `tools/*.py` module and a focused fake-client test; app assembly changes only if a new module is introduced.
- **One nested settings kind:** dictionary settings already flow through `get_input_settings`, `set_input_settings_json`, and filter settings, so a same-shaped kind is localized to a tool and test. Output settings need a new mapping because no generic output-settings pair exists.
- **One event-confirmed workflow:** add a subscription/event client, lifecycle ownership, correlation/timeout policy, and asynchronous workflow state. The present request-only synchronous `ReqClient` and `time.sleep` health workflow do not supply those pieces.
- **Second MCP transport:** preserve `build_app()` and tool modules, then make the entry select a FastMCP transport and add transport-specific configuration/shutdown tests.
- **Canvas identity:** introduce UUID/canvas-aware argument schemas, preserve identifiers in scene/input/item outputs, and update all name-only calls and tests; this is cross-cutting rather than a one-tool edit.

The strongest ideas to adopt are explicit dry-run previews and small task-level health/text/SFX tools. The implementation patterns to avoid are dependency calls without signature coverage, unsanitized library logging, and blocking multi-second workflows inside synchronous tool functions.
