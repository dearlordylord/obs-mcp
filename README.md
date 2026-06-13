# OBS MCP

`@firfi/obs-mcp` is a stdio-only Model Context Protocol server for OBS Studio.

This first slice intentionally implements one exemplar vertical: Scenes. It proves the repo pattern for future OBS areas with strict schemas, a small MCP registry, a scoped obs-websocket protocol client, and fake OBS websocket tests.

## Install

```sh
pnpm install
pnpm build
```

The package binary is `obs-mcp`.

## Configuration

Environment variables:

- `OBS_WEBSOCKET_URL`: OBS websocket URL. Defaults to `ws://localhost:4455`. Bare `host:port` values are normalized to `ws://host:port`.
- `OBS_WEBSOCKET_PASSWORD`: optional OBS websocket password.
- `OBS_WEBSOCKET_CONNECTION_TIMEOUT`: connection and request timeout in milliseconds. Defaults to `30000`.
- `TOOLSETS`: optional comma-separated category filter. The first category is `scenes`.
- `OBS_INTEGRATION_TESTS`: set to `1` to run real OBS websocket integration tests.
- `OBS_INTEGRATION_MUTATION_TESTS`: set to `1` to enable integration tests that send state-changing OBS requests.

The server logs diagnostics to stderr. Stdout is reserved for MCP JSON-RPC.

## Tools

<!-- tools:start -->
- `get_obs_context`
- `get_version`
- `list_scenes`
- `get_current_scene`
- `set_current_scene`
- `list_scene_items`
- `list_group_scene_items`
- `get_scene_item_id`
- `get_scene_item_source`
<!-- tools:end -->

Tool results use MCP structured content rather than textified JSON.

## Manual Stdio Smoke Test

Start OBS Studio with obs-websocket enabled, then run:

```sh
OBS_WEBSOCKET_URL=ws://localhost:4455 pnpm start
```

Send MCP JSON-RPC on stdin from an MCP client. For local development without real OBS, the automated test harness starts a fake OBS websocket server.

## Verify

```sh
pnpm check-all
```

## Real OBS Integration

Local `.env` is supported for integration tests and is ignored by git. The checked-in development template uses `host.docker.internal`, which resolves from this workspace.
Use `.env.example` as the non-secret template; keep real passwords only in local `.env`.

Read-only integration tests:

```sh
pnpm test:integration
```

Mutation tests are separate because they can switch the current OBS scene:

```sh
OBS_INTEGRATION_MUTATION_TESTS=1 pnpm test:integration
```

Default `pnpm test` remains fake-harness only and does not require OBS.
