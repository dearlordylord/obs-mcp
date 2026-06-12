# OBS MCP Cleanroom Architecture Draft

Status: proposed draft.

Date: 2026-06-12.

This document records the initial architecture decision before project initialization. It is not an implementation contract yet.

## Decision

Build a cleanroom native TypeScript/Effect MCP server for OBS Studio, using the local Huly MCP project at `/workspace/typescript/hulymcp` as the architectural reference.

Do not copy or translate implementation code from existing OBS MCP projects. Existing projects are research inputs for protocol coverage, user-facing tool ideas, packaging expectations, and architectural gotchas only.

## Huly-Inspired Principles

- Use `pnpm`.
- Use native TypeScript, Effect, Effect Schema, and `@modelcontextprotocol/sdk`.
- Keep all external data crossing boundaries behind schemas.
- Prefer explicit LLM-first tools over code execution tools.
- Prefer single-call correctness and identifier-friendly parameters.
- Keep MCP registration thin: schemas define input/output, operations implement domain behavior, and tool modules wire handlers.
- Use Effect services/layers or explicit ports for side effects.
- Do not use module mocks in tests.
- Keep the Huly quality harness: build, typecheck, circular dependency detection, lint, duplication detection, 99% coverage, and property-test placement rules.

## OBS Protocol Requirements

OBS websocket v5 is a WebSocket RPC protocol.

Core requirements:

- Support `ws://` and `wss://`.
- Normalize bare `host:port` connection strings to `ws://host:port`.
- First slice: handle `Hello`, `Identify`, `Identified`, `Event`, `Request`, and `RequestResponse` opcodes.
- Deferred: `ReIdentify`, `RequestBatch`, and `RequestBatchResponse` are protocol work for later verticals.
- Implement OBS challenge authentication:
  - `secret = base64(sha256(password + salt))`
  - `authentication = base64(sha256(secret + challenge))`
- Correlate requests by generated `requestId`.
- Treat every OBS `requestStatus.result === false` as an MCP error, regardless of whether the request has response data.
- Start with JSON over text frames. Treat MessagePack as a later explicit feature.
- Negotiate and report RPC/version information through `GetVersion`.
- Defer broad event subscription support until after the request/response tool surface is stable.

## Rejected Reference Pattern

The `cdavis-code/obs_websocket_workspace` project is useful for protocol and parity research, but its MCP architecture should not be copied.

Rejected patterns:

- Generated code-mode MCP surface as the primary API.
- In-process JavaScript `eval` / `new Function` execution.
- Static singleton client state required by generated per-call server instances.
- Test stubbing style that conflicts with the Huly no-mocks rule.

These choices conflict with the Huly-style explicit registry, testability through DI, and safety posture.

## Proposed Project Shape

```text
src/
  config/
    config.ts
    obs-runtime-context.ts
  domain/
    schemas.ts
    schemas/
      shared.ts
      connection.ts
      general.ts
      scenes.ts
      stream.ts
      record.ts
      inputs.ts
      scene-items.ts
  obs/
    auth.ts
    client.ts
    errors.ts
    protocol.ts
    operations/
      connection.ts
      general.ts
      inputs.ts
      raw.ts
      record.ts
      scene-items.ts
      scenes.ts
      stream.ts
  mcp/
    create-mcp-server.ts
    error-mapping.ts
    http-transport.ts
    protocol-handlers.ts
    server.ts
    tools/
      connection.ts
      general.ts
      index.ts
      inputs.ts
      raw.ts
      record.ts
      registry.ts
      scene-items.ts
      scenes.ts
      stream.ts
  telemetry/
  utils/
test/
  obs/
    fake-obs-server.ts
```

## Initial Tool Surface

Start with a small explicit Scenes tool set that proves the protocol layer and foundation boundaries.

- `get_obs_context`
- `get_version`
- `list_scenes`
- `get_current_scene`
- `set_current_scene`

Deferred toolsets: stats, stream, record, inputs, scene-items, raw requests, batches, events, screenshots, and HTTP transport.

## Test Harness

Use a fake local OBS websocket server instead of module mocks.

Required tests:

- URL normalization and config decoding.
- OBS authentication challenge generation.
- Handshake success and failure paths.
- Request ID correlation.
- Request timeout and close behavior.
- OBS failed status to MCP error mapping.
- Schema validation for request and response boundaries.
- Tool registry argument handling.
- Property tests for URL normalization, toolset filtering, and protocol envelope parsing where useful.

Optional later integration:

- Real local OBS smoke test against `ws://localhost:4455`.
- Manual MCP stdio smoke test.

## Open Questions

- Whether first release includes Huly's HTTP MCP transport or ships stdio-only first.
- Whether `send_raw_obs_request` should be gated behind an explicit toolset such as `raw`.
- Whether event subscriptions should expose resources, tools, or both.
- Whether screenshot/image support belongs in the first usable release or a later parity phase.
