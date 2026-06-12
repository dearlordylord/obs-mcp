# obs-websocket-js Evaluation

Reference clone: `.references/obs-websocket-js`.

Package checked: `obs-websocket-js` `5.0.8`, MIT licensed, repository `obs-websocket-community-projects/obs-websocket-js`.

## What It Provides

- OBS websocket v5 connection, `Hello`/`Identify`/`Identified`, and challenge authentication.
- JSON and MessagePack entry points. In Node, package-root import resolves to MessagePack; JSON text-frame users should import `obs-websocket-js/json`.
- Request/response calls, request batches, event emitter support, `reidentify`, and generated OBS request/event types.

## Fit Against This Repo

For the current Scenes exemplar, the custom `src/obs/client.ts` remains the better fit:

- It is JSON-only by design, matching the first slice.
- It has explicit connection and per-request timeouts.
- It maps failed OBS request statuses into domain/MCP errors.
- It keeps all public operation boundaries behind local Effect schemas and the fake OBS server harness.

`obs-websocket-js` is a better choice if this project pivots to broad OBS client coverage quickly. It would still need an adapter for Effect timeouts, local schema decoding, MCP error mapping, JSON-only import discipline, and batch failure semantics.

## Recommendation

Keep the custom client for the Scenes vertical. Use `obs-websocket-js` as a compatibility reference and revisit adoption when events, batches, and broad generated OBS request coverage become product requirements.
