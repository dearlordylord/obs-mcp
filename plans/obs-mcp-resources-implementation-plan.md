# OBS MCP Resources Implementation Plan

Status: tentative implementation plan.

Date: 2026-06-14.

Scope: implement MCP resources for OBS state, starting with a safe read-only static slice and continuing through dynamic resources, retained screenshot resources, resource subscriptions, and event-backed invalidation. This plan does not implement prompts, completions, presets, or generic custom event streams.

## Product Goal

Make important OBS state readable as MCP-native resources so clients can inspect context without discovering and chaining many tools.

First-wave niche:

> MCP-native OBS assistant for recording, streaming setup, visual verification, and direct OBS control.

## Protocol Posture

Use standard MCP resources. The first implementation slice should be conservative:

- Advertise `capabilities.resources: {}`.
- Implement `resources/list`.
- Implement `resources/read`.
- Implement `resources/templates/list` with an empty list unless dynamic screenshot/source templates are added later.
- Do not advertise `resources.subscribe`.
- Do not advertise `resources.listChanged` until the list can change at runtime.
- Do not send `notifications/resources/updated` in this slice.

Rationale: static, read-only resources give immediate user value and close a competitor gap without forcing premature cache invalidation or event subscription architecture.

Later slices may advertise:

- `capabilities.resources.subscribe: true` only after `resources/subscribe` and `resources/unsubscribe` are implemented.
- `capabilities.resources.listChanged: true` only after the server has dynamic resource list changes worth notifying.
- `notifications/resources/updated` only for subscribed resources and only when a resource can be invalidated from known OBS events.

## Resource Catalog

All first-wave resources should return `application/json` text contents unless explicitly noted otherwise.

| URI | Priority | Reads OBS requests | Purpose | Notes |
|---|---:|---|---|---|
| `obs://state/current` | P0 | `GetVersion`, `GetStats`, `GetSceneList`, `GetCurrentProgramScene`, `GetRecordStatus`, `GetStreamStatus`, plus optional `GetOutputList`, `GetVirtualCamStatus`, `GetReplayBufferStatus` when available | One-call summary for assistant context | Must degrade gracefully when optional requests are unavailable. |
| `obs://scenes` | P0 | `GetSceneList`, optional current program/preview scene requests | Scene inventory and current scene context | Include scenes, groups if useful, current program scene, and preview scene only when available. |
| `obs://inputs` | P0 | `GetInputList`, optional `GetSpecialInputs` | Input inventory | Do not fetch every input's settings/audio status in first slice; keep bounded. |
| `obs://recording` | P0 | `GetRecordStatus`, optional `GetRecordDirectory` | Recording status and output location context | Be careful with full output paths. Expose only values already available through explicit record/config tools. |
| `obs://streaming` | P0 | `GetStreamStatus`, optional `GetStreamServiceSettings` | Streaming status and service context | Redact credentials and avoid exposing stream keys. |
| `obs://outputs` | P1 | `GetOutputList`, optional per-output `GetOutputStatus`, `GetVirtualCamStatus`, `GetReplayBufferStatus` | Output inventory and common output lifecycle state | Per-output status can be added after base list if latency is acceptable. |
| `obs://screenshots/latest` | P2 | none initially, later server-retained screenshot state | Last screenshot metadata/link | Do not call `GetSourceScreenshot` without parameters. This resource should wait for a retained screenshot model from screenshot tools. |

Later resource families:

| URI / template | Priority | Reads OBS requests | Purpose | Notes |
|---|---:|---|---|---|
| `obs://config` | P2 | `GetRecordDirectory`, `GetProfileList`, `GetSceneCollectionList`, optional `GetVideoSettings`, `GetStreamServiceSettings` | User-facing OBS configuration summary | Must redact stream credentials. |
| `obs://profiles` | P2 | `GetProfileList`, optional `GetProfileParameter` later | Profile inventory | Do not enumerate arbitrary profile parameters in first version. |
| `obs://scene-collections` | P2 | `GetSceneCollectionList` | Scene collection inventory | Read-only; switching remains a tool. |
| `obs://canvases` | P2 | `GetCanvasList` | OBS v5.7 canvas inventory | Only listed when OBS advertises canvases. |
| `obs://transitions` | P2 | `GetSceneTransitionList`, `GetCurrentSceneTransition` | Transition inventory and current transition | Include transition settings only when bounded and useful. |
| `obs://hotkeys` | P2 | `GetHotkeyList` | Hotkey inventory | Useful for prompt/completion later. |
| `obs://events/recent` | P2 | local event buffer only | Bounded recent OBS event context | Must not become an unbounded raw event stream. |
| `obs://scenes/by-name/{sceneName}` | P3 | `GetSceneItemList`, optional scene current state | Per-scene graph detail | Requires resource template support and URI encoding policy. |
| `obs://inputs/by-name/{inputName}` | P3 | `GetInputSettings`, optional audio/media state requests | Per-input detail | Must sanitize settings and avoid secrets. |
| `obs://outputs/by-name/{outputName}` | P3 | `GetOutputStatus`, optional `GetOutputSettings` | Per-output detail | Output settings may contain paths; document policy. |
| `obs://filters/{sourceName}` | P3 | `GetSourceFilterList` | Per-source filter inventory | Template is by source name; encode names carefully. |
| `obs://media/by-name/{inputName}` | P3 | `GetMediaInputStatus` | Per-media input playback state | Only valid for media-like inputs. |

## First Implementation Slice

Build P0 resources first:

- `obs://state/current`
- `obs://scenes`
- `obs://inputs`
- `obs://recording`
- `obs://streaming`

Then add P1:

- `obs://outputs`

Defer P2:

- `obs://screenshots/latest`

Reason: screenshot resources need retained artifact semantics. The current screenshot tools are request-specific and do not naturally define a global latest screenshot resource.

## Data Shape Principles

Each resource payload should include:

- `uri`
- `generatedAt`
- `obs` connection/version summary where relevant
- `availableRequests` only where helpful, not everywhere
- resource-specific state
- `partial` boolean when optional sections could not be read
- `omitted` array explaining skipped optional sections

Example shape for `obs://state/current`:

```json
{
  "uri": "obs://state/current",
  "generatedAt": "2026-06-14T00:00:00.000Z",
  "obs": {
    "negotiatedRpcVersion": 1,
    "obsVersion": "31.0.0",
    "obsWebSocketVersion": "5.7.0"
  },
  "scene": {
    "currentProgramSceneName": "Scene"
  },
  "recording": {
    "outputActive": false,
    "outputPaused": false
  },
  "streaming": {
    "outputActive": false
  },
  "partial": false,
  "omitted": []
}
```

## Architecture Plan

Add a resource layer parallel to the existing tool layer.

New files:

- `src/domain/schemas/resources.ts`
- `src/mcp/resources/mechanics.ts`
- `src/mcp/resources/index.ts`
- `src/mcp/resources/state.ts`
- `src/mcp/resources/scenes.ts`
- `src/mcp/resources/inputs.ts`
- `src/mcp/resources/recording.ts`
- `src/mcp/resources/streaming.ts`
- `src/mcp/resources/outputs.ts`

Optional later file:

- `src/mcp/resources/screenshots.ts`

### Resource Definition

Introduce a `ResourceDefinition` type similar to `ToolDefinition`:

- `uri`
- `name`
- `title`
- `description`
- `mimeType`
- `requiredObsRequests`
- `optionalObsRequests`
- `read(context): Promise<unknown>`
- `outputSchema`
- `outputJsonSchema`

Filtering:

- A resource is listed only if all `requiredObsRequests` are available.
- Optional sections are included only if their requests are available.
- Resources are not gated by `TOOLSETS` in the first slice unless we introduce an explicit `RESOURCESETS` config.

Why not gate by `TOOLSETS`: resources are read-only context, and users expect resources to help discover state even when a write-oriented toolset is disabled. If this becomes noisy, add `RESOURCESETS` later rather than tying resources to tool categories.

### Resource Reading

Add:

- `getEnabledResources(client.availableRequests)`
- `readResource(resource, { config, client })`
- `unknownResourceError(uri)`
- JSON text encoding equivalent to tool output encoding.

Resource reads should reuse existing OBS operations where possible:

- `getVersion`
- `getObsStats`
- `listScenes`
- `getCurrentScene`
- `getCurrentPreviewScene`
- `listInputs`
- `getSpecialInputs`
- `getRecordStatus`
- `getStreamStatus`
- `listOutputs`
- `getVirtualCamStatus`
- `getReplayBufferStatus`

This keeps resource behavior aligned with tool behavior.

## MCP Server Wiring

Update `src/mcp/create-mcp-server.ts`:

- Import:
  - `ListResourcesRequestSchema`
  - `ReadResourceRequestSchema`
  - `ListResourceTemplatesRequestSchema`
  - resource result types as needed
- Change capabilities from:

```ts
capabilities: {
  tools: {}
}
```

to:

```ts
capabilities: {
  tools: {},
  resources: {}
}
```

- Register `resources/list`.
- Register `resources/templates/list` returning `{ resourceTemplates: [] }`.
- Register `resources/read`.
- Return `ErrorCode.InvalidParams` for unknown/unavailable resource URIs.
- Return `application/json` text contents:

```ts
{
  contents: [{
    uri: resource.uri,
    mimeType: "application/json",
    text: JSON.stringify(payload)
  }]
}
```

## Error And Partial-State Policy

Required request fails:

- `resources/read` returns an MCP error.
- Use existing OBS-to-MCP error mapping.

Optional request unavailable:

- Do not call it.
- Add an `omitted` entry.
- Mark `partial: true`.

Optional request available but fails:

- Prefer `partial: true` with an `omitted` entry if the resource can still provide meaningful state.
- Use MCP error only if the remaining payload would be misleading.

Sensitive data:

- Do not include OBS websocket password.
- Do not include stream keys.
- Avoid broad file path disclosure outside resources specifically about recording/output paths.
- For `obs://streaming`, redact stream service settings aggressively.

## Testing Plan

Unit/in-memory MCP tests:

- `initialize` advertises `resources`.
- `client.listResources()` returns P0 resources when required OBS capabilities are available.
- `client.readResource({ uri: "obs://scenes" })` returns JSON text with scene data.
- `client.readResource({ uri: "obs://state/current" })` aggregates scene, record, stream, and optional output state.
- Unknown resource URI returns `InvalidParams`.
- Missing required OBS request hides that resource from `resources/list`.
- Missing optional OBS request keeps resource readable with `partial: true`.
- `client.listResourceTemplates()` returns `[]`.

Registry tests:

- Resource registry filters required requests.
- Optional request helpers do not call unavailable requests.
- Output schemas decode generated payloads.

Fake OBS integration tests:

- With fake OBS default capabilities, list and read all P0/P1 resources.
- Verify no write OBS requests are called by resource reads.

Real OBS integration tests:

- Add a minimal resource smoke test behind existing integration flag:
  - list resources
  - read `obs://state/current`
  - assert JSON parses and contains expected top-level keys

Do not require real screenshots or virtual camera for resource integration in this slice.

## Documentation Plan

Update generated or static docs:

- README MCP capabilities section: tools plus resources.
- README resource list with one-line user-facing descriptions.
- Glama/server metadata if it has a capabilities/features field.
- `plans/obs-mcp-user-facing-competitive-plan.md` status note once resources are implemented.

Avoid describing resources as "real-time" until subscriptions/update notifications exist.

## Implementation Phases

### Phase 1: Static Resource Infrastructure

- Add `ResourceDefinition` mechanics.
- Add resource registry and filtering.
- Add JSON resource content encoder.
- Wire `resources/list`, `resources/templates/list`, and `resources/read`.
- Advertise `resources: {}`.
- Tests: protocol handler tests for listing, reading, unknown URI, empty templates.

Exit criteria:

- MCP client can list and read a simple resource through in-memory transport.

### Phase 2: P0 Static Inventory Resources

- Implement `obs://scenes`.
- Implement `obs://inputs`.
- Implement `obs://recording`.
- Implement `obs://streaming`.
- Add schema coverage and fake OBS tests.

Exit criteria:

- P0 resources are useful individually and degrade correctly on partial OBS capabilities.

### Phase 3: P0 Aggregate Current State

- Implement `obs://state/current`.
- Compose P0 resource readers or shared state builders.
- Include optional stats/output sections when available.
- Keep latency bounded by avoiding deep per-input/per-output expansion.

Exit criteria:

- `obs://state/current` gives enough context for "what is OBS doing right now?" in one read.

### Phase 4: P1 Outputs Resource

- Implement `obs://outputs`.
- Include output list and optional virtual camera/replay status.
- Decide whether per-output status calls are worth the latency; default to list plus common output statuses.

Exit criteria:

- Output state is visible without calling output tools directly.

### Phase 5: P2 Additional Static Resources

- Implement `obs://config`.
- Implement `obs://profiles`.
- Implement `obs://scene-collections`.
- Implement `obs://canvases`.
- Implement `obs://transitions`.
- Implement `obs://hotkeys`.
- Implement `obs://events/recent`.

Design rules:

- Each resource requires all core requests for its domain.
- Optional sections must be gated by `availableRequests`.
- `obs://events/recent` reads only the existing bounded event buffer.
- `obs://config` and stream-related resources must redact credentials.

Exit criteria:

- Every major read-only OBS inventory domain has a top-level resource where it is useful to users.

### Phase 6: P3 Resource Templates

- Implement `resources/templates/list`.
- Add template registry entries with RFC 6570 URI templates.
- Add template matching and read dispatch in the resource registry.
- Implement:
  - `obs://scenes/by-name/{sceneName}`
  - `obs://inputs/by-name/{inputName}`
  - `obs://outputs/by-name/{outputName}`
  - `obs://filters/{sourceName}`
  - `obs://media/by-name/{inputName}`

Design rules:

- Use encoded path segments; never parse raw names by splitting ambiguous unescaped strings.
- Prefer name templates first because they are user-facing; add UUID templates later if names prove ambiguous.
- Template resources should return `InvalidParams` when the named entity does not exist.
- Avoid expensive deep expansion by default.

Exit criteria:

- Clients can discover and read entity-specific resources without needing bespoke tools for every detail view.

### Phase 7: P2/P3 Screenshot Resource And Retention

- Decide retained screenshot model:
  - last screenshot metadata only
  - latest saved screenshot file URI
  - latest base64 image payload
- Update screenshot tools to record latest screenshot metadata if chosen.
- Implement `obs://screenshots/latest` only after that model exists.
- Consider later templates:
  - `obs://screenshots/by-source/{sourceName}/latest`
  - `obs://screenshots/by-scene/{sceneName}/latest`

Exit criteria:

- Screenshot resource has honest semantics and does not imply a global screenshot exists when no screenshot has been requested.

### Phase 8: Resource Cache And Invalidation Model

- Add a resource cache abstraction only after multiple resources share expensive reads or subscriptions need invalidation.
- Cache entries should be short-lived and keyed by resource URI.
- Include resource generation time and cache age in `_meta` or payload where useful.
- Define invalidation groups:
  - scenes
  - scene items
  - inputs
  - outputs
  - recording
  - streaming
  - transitions
  - config
  - canvases
  - events
  - screenshots

Design rules:

- Do not cache credentials.
- Do not let cache hide failed OBS reads indefinitely.
- Cache must be an optimization and subscription primitive, not the source of truth.

Exit criteria:

- Resource reads can be cached, invalidated, and tested without changing public resource payload semantics.

### Phase 9: MCP Resource Subscriptions

- Advertise `resources.subscribe: true`.
- Implement `resources/subscribe`.
- Implement `resources/unsubscribe`.
- Track subscriptions per MCP server session.
- Send standard `notifications/resources/updated` only for subscribed resources.
- Use OBS event buffer and resource invalidation groups to decide which subscribed URIs changed.

Design rules:

- A notification means "reread this resource"; it must not include the whole resource payload.
- Notifications must be debounced for high-volume OBS changes.
- Subscriptions must not expose custom/raw OBS event streams.
- If the client does not subscribe, no resource update notifications are sent.

Exit criteria:

- A client can subscribe to `obs://state/current`, mutate OBS through a tool, receive a standard resource update notification, and reread the resource.

### Phase 10: Dynamic Resource List Changes

- Advertise `resources.listChanged: true` only if dynamic resource list membership becomes visible.
- Candidate dynamic resources:
  - retained screenshots
  - saved preset resources, if presets later become MCP resources
  - per-scene/per-input concrete resources, if we choose to list concrete entity resources instead of only templates
- Send `notifications/resources/list_changed` when the listed resource set changes.

Design rules:

- Prefer templates over constantly changing concrete resource lists.
- Do not advertise list changes just because OBS state changes.

Exit criteria:

- Resource list change notifications are tied to real changes in `resources/list`, not to ordinary OBS state updates.

### Phase 11: Resource Tool Links

- Update relevant tools to return MCP `ResourceLink` content where useful:
  - screenshot tools can link to `obs://screenshots/latest`
  - scene mutation tools can link to `obs://scenes` or `obs://state/current`
  - recording/streaming tools can link to status resources
- Keep structured tool output unchanged for compatibility.

Exit criteria:

- Tool calls guide users toward the relevant resource without forcing automatic embedding of large payloads.

### Phase 12: Full Documentation And Release Gates

- Update README and metadata.
- Add tests to `check-all`.
- Run typecheck, focused MCP tests, registry tests, and package smoke as appropriate.
- Document static resources, templates, subscriptions, and update semantics separately.
- Document which resources are always listed versus capability-gated.

Exit criteria:

- Resources are documented as user-facing MCP features and verified by automated tests.

## Open Decisions

1. Should resources be always enabled, or should we add `RESOURCESETS` before release?
2. Should `obs://state/current` include `availableRequests`, or should that stay in `get_obs_context` / `get_version`?
3. How much path data should `obs://recording` expose?
4. Should `obs://outputs` call `GetOutputStatus` for every output, or avoid N+1 calls?
5. What is the correct retained artifact model for `obs://screenshots/latest`?
6. Should entity-specific resources be listed as concrete resources, templates only, or both?
7. Should UUID-based templates be added alongside name-based templates?
8. What debounce window is appropriate for resource update notifications?
9. Should `obs://events/recent` be subscribable, or should it remain a pull-only context resource?
10. Should presets become MCP resources when the preset feature exists?

## Non-Goals

- No prompt implementation.
- No completions implementation.
- No preset storage.
- No generic event stream.
- No non-standard resource notification protocol.
- No raw OBS event push stream disguised as resources.
- No resource writes; mutations remain tools.
- No dashboard/UI work.
