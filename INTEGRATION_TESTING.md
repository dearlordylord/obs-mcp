# Integration Testing Guide

## Prerequisites

Start OBS Studio with obs-websocket enabled, then build the MCP server:

```sh
pnpm build
```

Local `.env` is loaded by the full integration harness. The default template uses:

```env
OBS_WEBSOCKET_URL=ws://host.docker.internal:4455
```

That is intended for container-to-host OBS access. Use `ws://localhost:4455` only when the MCP
server process runs on the same host network namespace as OBS.

## Smoke Suite

The Vitest smoke suite connects directly through the TypeScript OBS client and checks a small read-only
surface plus opt-in lifecycle mutations:

```sh
pnpm test:integration
```

Mutation smoke checks require:

```sh
OBS_INTEGRATION_MUTATION_TESTS=1 pnpm test:integration
```

## Full Live MCP Suite

The full suite is modeled after the Huly MCP integration harness. It drives the built stdio MCP server
with JSON-RPC, enables every toolset, and reports each public tool as one of:

- `PASS`: exercised against the live OBS websocket through the MCP boundary.
- `SKIP`: unavailable in the current OBS profile/version, disabled by safety policy, or missing a
  disposable fixture.
- `FAIL`: listed by the live server but neither exercised nor covered by an explicit skip policy, or
  returned an unexpected error.

Run it with:

```sh
pnpm test:integration:full
```

The default read-only suite intentionally skips local UI side effects, file-writing screenshots, raw
vendor/custom surfaces, request batches, and mutating tools. It also skips OBS-profile-dependent reads
such as replay buffer status when OBS reports the feature as unavailable.

Current verified read-only result against a local OBS profile:

```text
73 passed, 0 failed, 86 skipped (of 159)
```

The total includes the protocol `tools/list` check plus the 158 public tools in the registry.

## Optional Modes

State-changing checks are opt-in:

```sh
OBS_INTEGRATION_MUTATION_TESTS=1 pnpm test:integration:full
```

Current verified mutation-enabled result against the same local OBS profile:

```text
149 passed, 0 failed, 10 skipped (of 159)
```

With an OBS-visible screenshot directory on this host:

```sh
OBS_MCP_SCREENSHOT_OUTPUT_DIR=/tmp OBS_INTEGRATION_MUTATION_TESTS=1 pnpm test:integration:full
```

the verified result is:

```text
150 passed, 0 failed, 9 skipped (of 159)
```

Global OBS config writes are behind an additional opt-in flag because they create and switch to a
temporary OBS profile before exercising profile/config settings:

```sh
OBS_INTEGRATION_GLOBAL_CONFIG_TESTS=1 OBS_INTEGRATION_MUTATION_TESTS=1 pnpm test:integration:full
```

Stream start/toggle checks are separate and only run when the isolated profile stream sink was created:

```sh
OBS_INTEGRATION_GLOBAL_CONFIG_TESTS=1 OBS_INTEGRATION_STREAM_OUTPUT_TESTS=1 OBS_INTEGRATION_MUTATION_TESTS=1 pnpm test:integration:full
```

The verified isolated global-config and stream-output result is:

```text
155 passed, 0 failed, 4 skipped (of 159)
```

With both isolated modes and an OBS-visible screenshot directory:

```sh
OBS_MCP_SCREENSHOT_OUTPUT_DIR=/tmp OBS_INTEGRATION_GLOBAL_CONFIG_TESTS=1 OBS_INTEGRATION_STREAM_OUTPUT_TESTS=1 OBS_INTEGRATION_MUTATION_TESTS=1 pnpm test:integration:full
```

the verified result is camera-only skipped:

```text
156 passed, 0 failed, 3 skipped (of 159)
```

Bounded `get_source_screenshot` payload checks run in the default full suite when the current scene has
a source. `save_source_screenshot` is skipped unless `OBS_MCP_SCREENSHOT_OUTPUT_DIR` points to a
directory visible to the OBS process. Mutation mode also performs guarded `start_record` and
`toggle_record` start/stop checks when recording is inactive, so it may create short recording artifacts
in the current OBS recording directory.

## Maturity Target

Huly MCP has a broad live integration script with explicit pass/fail/skip accounting. OBS MCP now has
the same harness shape:

- built-server MCP protocol calls, not direct operation calls;
- all toolsets enabled;
- no silent gaps for listed tools;
- explicit safety/capability skip policy;
- disposable scene, input, scene-item, and source-filter fixtures with cleanup;
- deterministic fake-harness tests remain the default `pnpm test` gate;
- real OBS checks stay local and opt-in.

The remaining default-suite parity gap is concentrated in intentionally isolated global config writes,
external stream start/toggle isolation, OBS-visible screenshot file paths, or a configured virtual camera.
Virtual camera start/stop/toggle remains an environment exception until the local OBS host has a virtual
camera device.
