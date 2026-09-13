# External benchmark infrastructure

Observed 2026-09-13. Fixture version: `2026-09-13.5`.

The reusable runner is in [`fixture/`](fixture/README.md). It launches an isolated deterministic OBS WebSocket server and a real candidate MCP subprocess, exchanges MCP JSON-RPC over stdio, and writes sanitized JSON evidence. Candidate adapters contain only launch, setup, and public tool/argument mappings. The fixture validates OBS request names against the [official generated obs-websocket protocol](https://github.com/obsproject/obs-websocket/blob/1ef34bf48110c2a18184e50e41cd0b1a855e2147/docs/generated/protocol.json), pinned in [`results/official-protocol.json`](results/official-protocol.json).

## Validation against the frozen gates

| Gate evidence | Automated observation | Limits requiring reviewer judgment |
|---|---|---|
| G1 entry | Initializes the real process, validates the basic initialize shape, sends initialized, lists tools, and preserves names and input schemas. | It offers MCP protocol `2024-11-05`; it does not exercise every protocol version, pagination, or alternate MCP transport. |
| G2 protocol/identity | Records corresponding OBS requests and arguments for version, scenes, scene switch, mute, and unknown entities. Scene and mute readbacks must report the resulting value. Official request names are checked against the pinned snapshot. | The common runner uses name identity. UUID/canvas and nested settings are available in the fake for reviewer extensions but are not common scored probes. Tool-description quality and full JSON Schema fidelity remain review evidence. |
| G3 state/result fidelity | Checks scene, mute, and record state transitions; requires truthful readback values; injects an identifiable OBS error; and accepts only a structurally complete PNG with valid chunk CRCs, IEND, and an inflating IDAT stream. | `scenes` proves a successful OBS request but does not deeply normalize every candidate's returned scene-list shape. Screenshot bytes prove transport integrity, not OBS rendering. The synthetic stream-key probe records whether an exposed settings tool returns the key; whether that is honest opt-in behavior or unsafe ordinary exposure depends on the documented contract. |
| G4 failure/lifecycle | Exercises invalid arguments, unknown entity, injected OBS error, reduced screenshot capabilities, a missing `GetSceneList` reply with a candidate-aware watchdog, and a disconnect during scene mutation. It records retry counts and bounded outcomes. | The timeout probe covers one read. The disconnect happens before applying an idempotent scene setter, so it cannot establish behavior after an applied non-idempotent mutation. A watchdog expiration means no bounded response was observed; it does not prove an infinite hang. Reduced capability coverage removes both screenshot requests rather than sampling all capability combinations. |
| G5 workflow | Composes inspect, scene mutation/readback, mute mutation/readback, record start/status/stop, and complete screenshot probes against one deterministic state model. | A missing operation is recorded as unsupported. Composite probe output still needs gate-level adjudication for intentionally narrower products. |
| G6 contract | Saves full advertised tool schemas, MCP requests/responses, stdout noise, bounded stderr, OBS traces, fixture-unimplemented classifications, and a synthetic-secret observation. The child receives an allowlisted environment and temporary HOME/config/cache paths; persisted evidence redacts fixture credentials. | Stdout noise is recorded as evidence rather than converted to a score. Install documentation, artifact attribution, opt-in raw surfaces, and source/runtime discrepancies require reviewer evidence outside the runner. |

The fake implements JSON and `obswebsocket.msgpack`, authentication, realistic version strings, two named/UUID scenes, two named/UUID inputs, record and stream state, one canvas, nested input/filter/output/transition settings, a synthetic stream credential, and in-memory mutations. File screenshots are only written under isolated `/tmp/obs-study-*` paths. Official requests that the fixture advertises but cannot execute are classified separately; candidate adapters cannot manufacture a success.

## Reproduction and calibration

From the repository root:

```sh
node plans/obs-comparative-study-2026-09-13/fixture/selftest.mjs
node plans/obs-comparative-study-2026-09-13/fixture/runner.mjs \
  --adapter plans/obs-comparative-study-2026-09-13/fixture/adapters/local-package.json \
  --output plans/obs-comparative-study-2026-09-13/results/local-package
```

The subprocess self-test passes all 15 common/secret-surface observations, including a MessagePack handshake and request. The fresh packed local `0.3.3` artifact produced 15 passes with no failures, unsupported probes, not-testable probes, environment blockers, or mapping errors in [`local-package-0.3.3.json`](results/local-package/local-package-0.3.3.json). That is calibration evidence, not a gate or architecture score.

Every result embeds the fixture version, the pinned official protocol commit and SHA-256, and SHA-256 hashes of `runner.mjs`, `fake-obs.mjs`, `mcp-process.mjs`, and `msgpack.mjs`. Reviewers should compare those hashes before combining runs.

Mock execution cannot establish rendering, codecs or devices, platform capture behavior, live streaming, or real OBS performance. It also cannot replace a real-OBS smoke test for the eventual selected implementation.
