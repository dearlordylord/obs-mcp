# OBS MCP external benchmark fixture

This study-owned fixture starts a deterministic authenticated OBS WebSocket v5 server on a random loopback port and drives a real MCP candidate process over stdio. It records MCP exchanges, advertised tool schemas, OBS requests, state changes, elapsed times, watchdogs, and assertions as JSON. It never launches OBS or inherits the repository `.env`.

The fake validates every received request name against `../results/official-protocol.json`, the official generated protocol pinned at commit `1ef34bf48110c2a18184e50e41cd0b1a855e2147`. Official requests outside the fixture implementation receive an explicit `fixture_unimplemented` trace and OBS status 204; they are not automatically candidate failures. Unknown request names are `candidate_invalid_request`. The deterministic model implements the common workflow plus selected canvas, UUID, nested settings, transition, output, filter, and file screenshot requests.

Run an adapter from the repository root:

```sh
node plans/obs-comparative-study-2026-09-13/fixture/runner.mjs \
  --adapter plans/obs-comparative-study-2026-09-13/fixture/adapters/local-package.json \
  --output plans/obs-comparative-study-2026-09-13/results/local-package
```

Run the fixture's independent subprocess calibration:

```sh
node plans/obs-comparative-study-2026-09-13/fixture/selftest.mjs
```

## Adapter contract v1

An adapter translates launch configuration and public MCP tool conventions only. It cannot synthesize responses, change assertions, or repair candidate behavior.

```json
{
  "schemaVersion": 1,
  "id": "candidate-id",
  "requestTimeoutMs": 10000,
  "normalTimeoutMs": 10000,
  "startupGraceMs": 250,
  "launch": {
    "command": "node",
    "args": ["dist/index.js"],
    "cwd": "/isolated/candidate/checkout",
    "env": {
      "OBS_WEBSOCKET_URL": "{{obsUrl}}",
      "OBS_WEBSOCKET_PASSWORD": "{{obsPassword}}"
    }
  },
  "setup": [
    { "tool": "obs_connection", "arguments": { "action": "Connect", "host": "{{obsHost}}", "port": "{{obsPort}}", "password": "{{obsPassword}}" } }
  ],
  "operations": {
    "getVersion": { "tool": "get_version", "arguments": {} },
    "setCurrentScene": { "tool": "set_current_scene", "arguments": { "sceneName": "{{sceneName}}" } }
  }
}
```

Recognized operation keys are `getVersion`, `listScenes`, `getCurrentScene`, `setCurrentScene`, `getInputMute`, `setInputMute`, `startRecord`, `getRecordStatus`, `stopRecord`, `getSourceScreenshot`, and the extended `getStreamServiceSettings` synthetic-secret probe. Omit a capability the candidate does not expose. Setup calls run after initialize and tools/list.

Templates are recursive. Exact placeholders preserve their JSON type; embedded placeholders become strings. Available values are `obsUrl`, `obsHost`, `obsPort`, `obsPassword`, `sceneName`, `inputName`, `inputMuted`, `sourceName`, `imageFormat`, `tempDir`, and `home`. `requestTimeoutMs` is the candidate's documented request bound; the missing-response watchdog adds a one-second observation margin. If no bound is declared, the fixture uses ten seconds and describes expiry as finite evidence rather than proof of an indefinite hang.

`startupGraceMs` defaults to 250 ms after initialization, discovery, and setup. Adapters may raise it to a maximum of two seconds when the candidate documents an asynchronous OBS connection startup.

The runner uses only an allowlisted base environment, a temporary HOME/config/cache area, the synthetic fixture password, loopback endpoints, and bounded child process groups. It redacts the synthetic password before persisting results. Screenshot validation checks the PNG signature, chunk framing and CRCs, terminal IEND chunk, and a decodable IDAT stream; a truncated data URL that retains only the PNG signature fails.

Probe statuses are `pass`, `fail`, `unsupported`, `not_testable`, `fixture_unimplemented`, `environment_blocker`, or `invocation_mapping_error`. These are raw observations for reviewers; the runner makes no gate or architecture score decisions.

Mock execution cannot establish rendering, real codecs or devices, platform capture behavior, live streaming, or real OBS performance.

The disconnect probe closes the socket before applying `SetCurrentProgramScene`. It records retry count, bounded recovery, and returned behavior for this idempotent setter; it does not establish safety after an applied non-idempotent mutation.
