# Architecture

This project is a cleanroom TypeScript/Effect MCP server for OBS Studio. Competitor projects and protocol snapshots under `.references/` are research references, not implementation sources.

The Scenes vertical is not just a feature slice. It is the foundation slice: future OBS verticals should be boring to add because the harness, boundaries, schemas, protocol client, MCP handlers, and test tiers are already proven here.

## Vertical Pattern

Each OBS area should follow the Scenes exemplar:

1. Define input and output schemas in `src/domain/schemas`.
2. Export Effect JSON Schema from those schemas for MCP protocol-visible contracts.
3. Implement domain operations in `src/obs/operations`.
4. Define OBS request descriptors in `src/obs/requests.ts` with literal request names, request-data schemas, response schemas, and capability names.
5. Keep obs-websocket protocol details in `src/obs`.
6. Register MCP tools in `src/mcp/tools/registry.ts`; each tool owns its runtime schemas, protocol JSON schemas, and required OBS requests.
7. Expose tools through lower-level MCP protocol handlers in `src/mcp/create-mcp-server.ts`; do not use high-level SDK registration when it weakens schema or error behavior.
8. Test schemas, operations, protocol behavior, MCP handlers, and real OBS integration through the same tiered harness.

## Boundaries

- `src/config`: environment decoding and sanitized runtime context.
- `src/obs/client.ts`: websocket lifecycle, Hello/Identify/Identified handshake, auth, request IDs, response correlation, timeouts, and status errors.
- `src/obs/requests.ts`: schema-first OBS request descriptors and capability names.
- `src/obs/operations`: schema-first OBS request wrappers.
- `src/mcp`: stdio MCP server setup, error mapping, and tool registry.
- `test/obs/fake-obs-server.ts`: no-mock integration harness for obs-websocket behavior.

## Test Tiers

- Unit/property tests validate config decoding, URL normalization, auth, schemas, and operation transformations.
- Fake OBS websocket tests validate protocol behavior deterministically without module mocks.
- MCP in-memory tests validate the actual protocol handlers, including listed JSON schemas and structured error metadata.
- Real OBS integration tests are opt-in through `OBS_INTEGRATION_TESTS=1`; read-only tests are safe by default, while mutation tests require `OBS_INTEGRATION_MUTATION_TESTS=1`.

Default `pnpm check-all` must stay deterministic and fake-harness only. Real OBS integration is a local confidence gate before expanding the foundation to new verticals.

## Strictness

The harness follows the Huly MCP baseline:

- TypeScript NodeNext, strict mode, exact optional properties, and no unchecked indexed access.
- Effect Schema at external boundaries, with Effect JSON Schema for MCP protocol contracts.
- Registry-owned MCP schemas and README/registry metadata verifiers in `pnpm check-all`.
- No module mocks or monkey-patching in tests.
- No source type assertions outside `as const`.
- No direct wall-clock reads in implementation code.
- Property-based tests must live in `*.property.test.ts`.
- Coverage gate remains at 99% or better.

## Deferred Work

HTTP transport, events, raw requests, batches, screenshots, stream/record/input tools, VS Code packaging, and advanced scene identity are intentionally deferred until the first vertical is stable.
