# Stateful HTTP Resource Subscriptions Plan

Status: preplanned for GitHub issue #2.

## Goal

Add stateful Streamable HTTP sessions so HTTP clients can use MCP resource subscriptions. The current HTTP transport is intentionally stateless: it creates a fresh MCP server and `StreamableHTTPServerTransport` for each POST, shares screenshot resource state, and advertises `resources: {}` without `subscribe`.

## Protocol Notes

The MCP 2025-06-18 Streamable HTTP transport allows a server to return `Mcp-Session-Id` during initialization. When present, clients must send that header on later requests, and may send DELETE to terminate the session. The resources capability supports `resources.subscribe` for `resources/subscribe` and `resources/unsubscribe`, with `notifications/resources/updated` as a reread signal.

References:

- https://modelcontextprotocol.io/specification/2025-06-18/basic/transports
- https://modelcontextprotocol.io/specification/2025-06-18/server/resources

Protocol watch item:

- The current MCP draft proposes removing protocol-level `Mcp-Session-Id` sessions, HTTP GET subscriptions, and `resources/subscribe` in favor of a stateless model plus `subscriptions/listen`.
- Before implementation, re-check the package's target MCP SDK and stable spec. If the SDK has moved to the draft model, replace this plan with a `subscriptions/listen` implementation plan rather than building new session infrastructure.
- The installed SDK currently supports protocol versions through `2025-11-25` and still exposes `StreamableHTTPServerTransport` session options.

The local SDK already supports the required server pieces:

- `StreamableHTTPServerTransport({ sessionIdGenerator })`
- `onsessioninitialized`
- `onsessionclosed`
- session validation for POST, GET, and DELETE
- GET Server-Sent Events for server-to-client messages
- client `terminateSession()`

## Non-Goals

- Do not make HTTP subscriptions the only HTTP mode.
- Do not push resource payloads in notifications.
- Do not advertise `resources.listChanged` unless listed static resources can actually appear or disappear at runtime.
- Do not add a custom SSE implementation while SDK transport support is sufficient.
- Do not introduce persistent server-side session storage in this pass.

## Design

Add an HTTP mode switch:

- Default remains stateless for backward compatibility.
- Stateful mode keeps one MCP server and one `StreamableHTTPServerTransport` per active session.
- New sessions are created on initialize POSTs without `Mcp-Session-Id`.
- Existing sessions are selected by `Mcp-Session-Id` for POST, GET, and DELETE.
- Unknown session IDs return 404 through the SDK transport path.
- Missing session IDs on non-initialize requests return 400 through the SDK transport path.
- DELETE closes the transport, closes the MCP server, unregisters OBS event listeners, and removes the session.

## Suggested Config

Add an environment-driven setting:

```text
MCP_HTTP_SESSION_MODE=stateless|stateful
```

Default:

```text
stateless
```

When `stateful`:

- `createObsMcpServer` is called with `enableResourceSubscriptions: true`.
- Session IDs are generated with `crypto.randomUUID()`.
- Each session receives its own `createObsMcpResourceState()`.
- A shared OBS client is still used by all sessions.

## Implementation Steps

1. Extend config parsing with `MCP_HTTP_SESSION_MODE`.
2. Split `startHttpTransport` into stateless and stateful request routing paths.
3. Introduce an internal `HttpMcpSession` record:

```ts
interface HttpMcpSession {
  readonly id: string
  readonly server: Server
  readonly transport: StreamableHTTPServerTransport
  readonly createdAtMs: number
  lastSeenAtMs: number
}
```

4. Add a session map keyed by `Mcp-Session-Id`.
5. For initialize POST without a session header:
   - create transport with `sessionIdGenerator: randomUUID`
   - connect MCP server once
   - register session in `onsessioninitialized`
   - delegate request to `transport.handleRequest`
6. For POST/GET/DELETE with a session header:
   - look up the session
   - delegate to that session transport
   - update `lastSeenAtMs`
7. For DELETE:
   - let SDK handle the DELETE response
   - remove and close the session in `onsessionclosed`
8. Add shutdown cleanup that closes every active session before closing the Node HTTP server.
9. Keep stateless behavior unchanged, including `resources: {}`.

## Open Decisions

- Whether to expose stateful HTTP by default after one release cycle.
- Whether to add idle session TTL now or after usage feedback.
- Whether each session should have independent screenshot latest state or share screenshot latest across the HTTP server. Independent is cleaner for client isolation; shared matches current stateless behavior.
- Whether auth token changes should invalidate existing sessions. Current process env is static, so this is not urgent.

## Test Plan

- Existing stateless HTTP tests continue to pass.
- Stateful initialize returns an `Mcp-Session-Id`.
- Stateful server advertises `resources.subscribe: true`.
- `resources/subscribe` over HTTP succeeds in stateful mode.
- OBS event invalidation emits `notifications/resources/updated` to a subscribed HTTP client.
- GET opens the client SSE channel and rejects a second concurrent GET for the same session.
- POST without `Mcp-Session-Id` after initialize is rejected for non-initialize messages.
- Unknown `Mcp-Session-Id` is rejected with 404.
- DELETE terminates the session and later requests with that ID return 404.
- Server shutdown closes all sessions and unregisters OBS event listeners.

## Risks

- Long-lived GET requests can hold Node HTTP sockets; tests should close clients and server explicitly.
- The SDK disallows reusing a stateless transport across requests, but stateful transports are intended to be reused.
- Resource notifications depend on the MCP client opening the GET SSE stream after initialization.
- Multiple HTTP sessions will each register OBS event listeners unless invalidation is centralized.
