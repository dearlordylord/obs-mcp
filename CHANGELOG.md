# @firfi/obs-mcp

## 0.3.0

### Minor Changes

- Make OBS input settings fully source-kind-specific: `set_input_settings` and `create_input` now pass raw `inputSettings` objects through verbatim, while input settings discovery tools return raw OBS values instead of sanitized summaries.

## 0.2.0

### Minor Changes

- Add MCP resources for read-only OBS state, including static resources, resource templates, subscriptions over stateful transports, screenshot retention, cache invalidation, OBS-event-backed update notifications, tool resource links, and documentation.

## 0.1.0

### Minor Changes

- Initial OBS MCP release with typed tool coverage for scenes, inputs, outputs, recording, streaming, transitions, filters, canvases, configuration, UI, screenshots, batches, events, persistent data, and vendor/admin surfaces.

  This release includes stdio and stateless HTTP transports, generated README tool listings, registry metadata checks, OBS protocol parity audit tooling, a live OBS integration harness, and a deterministic OBS protocol unit-test harness.
