# LarsCanGit/OBS-MCP: architecture and executed behavior

Observed 2026-09-13. Source pinned to [`8025f2c0336cb882d79e3227884fcaedd6d23603`](https://github.com/LarsCanGit/OBS-MCP/tree/8025f2c0336cb882d79e3227884fcaedd6d23603); declared package version **1.0.0**. License provenance: MIT, copyright Lars Hansen 2026; [license](https://github.com/LarsCanGit/OBS-MCP/blob/8025f2c0336cb882d79e3227884fcaedd6d23603/LICENSE), [package](https://github.com/LarsCanGit/OBS-MCP/blob/8025f2c0336cb882d79e3227884fcaedd6d23603/package.json). Fresh isolated checkout `/tmp/obs-study-ts/lars`. Runtime Node **24.20.0**, npm **11.19.0**, Linux arm64. Source review, maintainer claims, observed execution, and inferences are distinguished below.

All process runs use the shared loopback OBS v5 fixture, synthetic credentials, an allowlisted environment, isolated HOME, and the pinned source/build. No real OBS rendering, device behavior, codecs, live streams, platform capture, or latency was tested. No candidate code was repaired. Adapters map only public launch/tool arguments. Harness-obsolete initial traces are retained explicitly and excluded from final verdicts.

This deliberately compact server makes everyday recording/scene actions readable, with agent-friendly status summaries. It is a single-file product with no authored test suite and strong Windows audio assumptions. A broad architecture comparison should acknowledge that simplicity without mistaking a small public surface for either a defect or a correctness guarantee.

## Distribution and own tests

**Observed:** `npm ci --ignore-scripts` exit0; JavaScript runs directly with `node obs-mcp-server.js`, no compilation. Package has only a start script and no test suite. Independently fetched registry metadata links **obs-mcp-server@1.0.0** to `LarsCanGit/OBS-MCP`, publication 2026-03-25, tarball SHA1 `7b234be17e0b427ef480ad60e47f9447707f2357`. Source version and npm version agree; executed artifact is pinned source with its lockfile, not an independently compared npm tarball. [Package](https://github.com/LarsCanGit/OBS-MCP/blob/8025f2c0336cb882d79e3227884fcaedd6d23603/package.json), [README](https://github.com/LarsCanGit/OBS-MCP/blob/8025f2c0336cb882d79e3227884fcaedd6d23603/README.md), [registry](https://registry.npmjs.org/obs-mcp-server), [metadata](../results/royshil-publication.json), [install](../results/lars-install.log).

The README documents both a local checkout and `npx obs-mcp-server`, Node18+, OBS28+, .env or OBS_WS_URL/OBS_WS_PASSWORD. The dotenv import executes in the isolated checkout, never the workspace .env. The pinned obs-websocket-js5.0.8 Node export uses MessagePack; an initial JSON-only fixture could not speak its protocol. Those initial hangs are **harness blockers**, excluded from candidate lifecycle judgments. No GitHub tagged release was extracted from the release page (API enumeration rate limited).

## Architecture and changeability

**Static evidence:** one `obs-mcp-server.js` contains configuration, singleton connection state, schema array, switch-based mapping, policy defaults, response normalization and stdio startup. `ensureConnected` delegates the OBS protocol to obs-websocket-js and lazily connects on a tool call; ConnectionClosed clears a boolean. It has no promise to share concurrent first connection attempts. Low-level MCP `Server` accepts an advertised schema inventory but handler code itself does not parse/validate against those schemas. Results use shared `ok`/`err` helpers, which consistently attach `isError` for caught OBS errors. [Implementation](https://github.com/LarsCanGit/OBS-MCP/blob/8025f2c0336cb882d79e3227884fcaedd6d23603/obs-mcp-server.js).

The status tool reads stream/record/scene state together. Scene list simplifies to names, removing UUID/index identity. Audio enumeration asks only for `wasapi_input_capture` and `wasapi_output_capture`; non-Windows inputs are excluded. It destructures `inputVolumeMultiplier`, although OBS returns `inputVolumeMul`, so the summary's numeric computation becomes NaN and serializes as null. Screenshot is a **save to OBS-side file path** capability, not an MCP image/resource tool. A same-host agent with file access can use that, while a remote MCP client cannot infer local availability. [Mappings](https://github.com/LarsCanGit/OBS-MCP/blob/8025f2c0336cb882d79e3227884fcaedd6d23603/obs-mcp-server.js#L365), [audio](https://github.com/LarsCanGit/OBS-MCP/blob/8025f2c0336cb882d79e3227884fcaedd6d23603/obs-mcp-server.js#L463), [screenshot](https://github.com/LarsCanGit/OBS-MCP/blob/8025f2c0336cb882d79e3227884fcaedd6d23603/obs-mcp-server.js#L515).

**Concrete change traces (inference):**

- One request: add a TOOLS schema and matching `executeTool` switch arm in the same file; update README. No independently checked mapping registry binds the two.
- One nested settings kind: currently no generic settings surface, so add a schema plus forwarding arm. Without runtime validation, arbitrary object support should not be confused with a validated contract.
- Event-confirmed workflow: introduce listener ownership, request/event correlation, timeout and cancellation around the shared `obs` instance; only connection closure is currently observed.
- Second transport: extract construction/registration from the top-level script; share one connection and define transport/process shutdown ownership.
- Canvas identity: add sceneUuid/canvasUuid/inputUuid to relevant schemas and explicit request construction; preserve identifiers currently removed by output summaries. `set_canvas_resolution` is video dimensions/FPS policy, not support for OBS canvas entity identity.

## Independent strengths and avoidances

Adopt readable job-oriented status, exact scene item ID use for visibility, defaulting source inspection to the current scene, and small common result helpers. Avoid OS-specific discovery presented as all audio, silent null volume, manually duplicated schemas/mappings, and unbounded reliance on downstream request promises.

## Executed gates and weighted ratings

Final evidence: [MessagePack core run](../results/lars.json), [audio/invalid-volume trace](../results/lars-extended.json), [authenticated unavailable-request supplement](../results/lars-unavailable.json). The initial JSON-only fixture failure is excluded. Likewise, early duplicated audio inputs came from a fixture filter omission; the final fixture honors inputKind. Final audio summaries contain one entry per input and still contain `volume:null` despite numeric OBS volume, demonstrating the candidate field-name defect.

| Gate | Verdict | Observed basis |
|---|---|---|
| G1 | P | Pinned source/dependencies start and serve valid MCP initialization/listing. |
| G2 | F | Scene/audio/record requests map correctly, but volume response maps the wrong OBS field and loses a real value; no version/capability tool is exposed. |
| G3 | F | Scene/mute/record state matches returned values; audio volume is silently null. |
| G4 | F | Missing GetSceneList response and in-flight scene disconnect receive no MCP reply within10s watchdog. This establishes failure of this bounded probe, not proof of an infinite hang. Invalid/unknown/OBS rejection and unavailable screenshot return errors. |
| G5 | P | Scenes/status, audio mutation, record lifecycle and same-host file screenshot compose successfully. Version inspection is unsupported, and the image path requires access to the OBS host filesystem. |
| G6 | F | Audio discovery summary silently loses numeric volume and excludes non-Windows kinds; direct invalid-volume invocation forwards a string despite numeric schema. The fixture does not implement SetInputVolume, so its returned204 is not rated as a candidate request-name defect. Stdio itself is clean. |

| Dimension | Rating | Evidence-backed rationale |
|---|---:|---|
| A (25) | 1 | Small readable helpers, but transport/connection/schema/mapping/policy live in one top-level script with no composition boundary. |
| B (20) | 1 | Valid basic primitives and shared error shape, undermined by lost volume, schema non-enforcement, no bounded pending-request handling and reduced entity identity. |
| C (15) | 2 | Ordinary same-host job works; Windows-specific audio, filesystem-only image access and weak disconnect behavior limit real-world coverage. |
| D (15) | 1 | No authored tests or test architecture; shared external success/error/fidelity execution provides limited concrete evidence. |
| E (15) | 1 | New request needs duplicate schema/switch changes; nested settings, events, extra transport and canvas identity require new boundaries in the monolith. |
| F (10) | 2 | Simple direct Node entry and registry-attributable npm identity; no build burden. .env/platform assumptions and limited lifecycle controls remain. |

Weighted total **31.25/100**. Scope-relative result: usable small Windows-oriented control surface, not a dependable fault-tolerant general OBS server. Confidence medium.
