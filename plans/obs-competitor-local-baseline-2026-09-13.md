# Local implementation baseline for competitor review

Status: complete local audit; no web evidence is asserted here.

Date: 2026-09-13.

This note is the local baseline for the 2026 competitor refresh. It records the
checked-in implementation and the pinned official obs-websocket clone. It does
not treat a request-name count as proof that every request field or user
workflow is covered.

## Snapshot and verification

- Repository: `/workspace/typescript/obs-mcp`.
- Git branch was clean apart from other agents' new research notes when this
  audit started. Current implementation SHA: `587e356b00d9269dcd124969ee36aad9635f2db8`
  (`Add OBS reconnect backoff`, committed 2026-06-15). The repository tracks
  `master` from `origin/master`.
- Package and MCP identity: `@firfi/obs-mcp` version `0.3.3`, MCP name
  `io.github.dearlordylord/obs-mcp`; see `package.json:1-14` and
  `src/version.ts:1-3`.
- The pinned official clone is `.references/protocol/obs-websocket` at
  `ffb09e892bb829e781172a2883870aa1416c638c`. Its generated protocol JSON
  contains 147 requests and 60 events. The earlier June matrix records this
  pinned source at `plans/obs-competitor-gap-matrix.md:13-20`.
- Cheap checks run during this audit all passed: `pnpm verify-protocol-parity`,
  `pnpm verify-readme`, `pnpm verify-registry-metadata`, and
  `pnpm verify-version`. A selected MCP/protocol test slice also passed:
  `registry.test.ts`, `create-mcp-server.test.ts`, `http-transport.test.ts`,
  and `protocol.test.ts` (4 files, 323 tests). The full suite was not run.

## Exact local surface counts

`src/mcp/tools/index.ts:1-41` imports and concatenates the complete registry;
the live registry count is 159 tool definitions. The default configuration
enables 76 tools (`general`, `record`, `scenes`, and `inputs`). The complete
toolset breakdown is:

| Toolset/category | Count |
|---|---:|
| `batch` | 1 |
| `general` | 6 |
| `events` | 11 |
| `canvases` | 1 |
| `config` | 15 |
| `scenes` | 29 |
| `screenshots` | 2 |
| `filters` | 10 |
| `inputs` | 32 |
| `outputs` | 17 |
| `record` | 9 |
| `stream` | 5 |
| `transitions` | 9 |
| `ui` | 8 |
| `admin_raw` | 2 |
| `vendor` | 2 |
| **Total** | **159** |

The local protocol registry declares all 147 request names in
`src/obs/requests.ts:3-153`. Tool definitions reference all 147 unique request
names (149 references because `GetCurrentProgramScene` and
`SetCurrentProgramScene` are each used twice). `Sleep` is represented only as
a schema-limited batch item; the parity audit calls this out as a deliberate
exclusion from standalone tools (`scripts/audit-protocol-parity.ts:35-40`).
The parity script compares request descriptors, required request references,
and the local event catalogue (`scripts/audit-protocol-parity.ts:125-194`).
The passing result was 147 official/local requests, no missing or extra
descriptors, no missing public request tools, and 60 official/local events.

The 14 static resources and 5 URI templates are declared in
`src/mcp/resources/index.ts:135-327` and `:329-492`. The server advertises
resource subscriptions by default and wires list/read/template,
subscribe/unsubscribe, event invalidation, and tool resource links in
`src/mcp/create-mcp-server.ts:127-217`. This is implemented behavior, beyond
the conservative June resources plan.

## Protocol parity versus field fidelity

Name parity is strong, but the request-name audit is not a field-fidelity
audit. The pinned official JSON has a `canvasUuid` request field for
`GetSceneList` and `CreateInput` (and for the scene/filter/source requests).
The local scene/item/filter/source schemas generally carry that field through:
`src/domain/schemas/scenes.ts:55-85,209-277` and
`src/obs/operations/filters.ts:121-145`; scene-item lifecycle schemas also
carry it in `src/domain/schemas/scene-item-lifecycle.ts:14-46,78-99`.

Two genuine capability gaps remain in the current local boundary:

1. `list_scenes` cannot select a canvas. `ListScenesInput` only accepts
   `includeGroups` (`src/domain/schemas/scenes.ts:5-9`), `GetSceneList` is
   declared with `EmptyRequestData` (`src/obs/requests/scenes.ts:44-48`), and
   `listScenes` sends no request data (`src/obs/operations/scenes.ts:37-46`).
   The `obs://scenes` resource and scene template use this same unscoped call
   (`src/mcp/resources/index.ts:165-173,331-357`).
2. `create_input` cannot select a canvas when locating the target scene by
   name. `CreateInputInput` has scene name/UUID but no `canvasUuid`
   (`src/domain/schemas/inputs.ts:352-378`), and `createInput` forwards only
   scene name/UUID, settings, and lifecycle fields
   (`src/obs/operations/inputs.ts:357-370`). The official `CreateInput`
   request includes optional `canvasUuid` for the `sceneName` form.

These are scoped field omissions, not absent request operations. The other
official canvas-bearing request families reviewed in this audit have matching
local locators or explicit canvas-aware schemas, including filters, scene
items, scene create/remove/rename/override, screenshots, source status, and
source projectors. A competitor that advertises canvas-aware list/create
workflows therefore has a concrete advantage even though the request-name
parity check passes.

## Events and policy-limited surfaces

The event catalogue maps all 60 official event names in
`src/obs/protocol.ts:79-140`. The safe event buffer is bounded to 100 by
default, retains sequence/drop/missed state, decodes typed payloads, and
ignores events outside the safe policy (`src/obs/events.ts:5-21,56-140`).
There are 11 event tools: one bounded recent snapshot and ten typed
confirmation workflows (`src/mcp/tools/events.ts:42-163`).

The excluded event workflows are intentional policy choices rather than an
unimplemented catalogue: four high-volume signals plus `VendorEvent` and
`CustomEvent` are excluded from the safe surface, while `ExitStarted` and
`ScreenshotSaved` remain unsuitable confirmation events. The reasons and
names are explicit in `src/obs/protocol.ts:51-77` and
`scripts/audit-protocol-parity.ts:61-95`. There is no generic event firehose
or generic `wait_for_event`; the product exposes bounded typed confirmations.

Likewise, the following limits are deliberate boundary policies:

- Input settings pass source-kind-specific raw objects through and expose
  discovery data (`src/domain/schemas/inputs.ts:365-378,398-417`; README
  `README.md:252-256`).
- Filter operations are present (10 tools in `src/mcp/tools/filters.ts:31-132`),
  but filter settings are an allowlist of bounded fields and reads mark raw
  settings as deferred (`src/domain/schemas/filters.ts:112-128`,
  `src/obs/operations/filters.ts:91-118,148-173`).
- Output settings operations are present (including lifecycle, virtual camera,
  and replay tools in `src/mcp/tools/outputs.ts:61-235`), but the generic
  settings schema intentionally exposes a bounded field set
  (`src/domain/schemas/outputs.ts:56-66`).
- Transition settings can be written through a flat primitive map, while the
  public current-transition read omits raw `transitionSettings`
  (`src/domain/schemas/transitions.ts:47-64,109-129`; tools
  `src/mcp/tools/transitions.ts:64-113`). This explains a transition-read
  comparison gap without calling the underlying request missing.
- Screenshot reads are bounded to 1,500,000 decoded bytes, and saves require
  an existing configured directory plus a simple filename
  (`src/obs/operations/screenshots.ts:19-96`; schemas
  `src/domain/schemas/screenshots.ts:7-76`).
- Stream service settings redact key/password/secret/token fields in
  `src/obs/operations/config.ts:186-224`.

## Transports, settings, and packaging

Configuration supports 16 toolsets, request capability filtering, stdio or
Streamable HTTP, stateful/stateless HTTP sessions, bearer authentication,
event-buffer capacity, screenshot output directory, lazy environments, and
auto-exit (`src/config/config.ts:8-55,69-139`). Tool filtering is done before
MCP registration and also uses the OBS handshake's available request list
(`src/mcp/tools/mechanics.ts:74-87`; `src/mcp/create-mcp-server.ts:146-147`).

HTTP is stateful by default with an opt-in stateless mode, session idle
cleanup, GET/POST/DELETE handling, and bearer auth
(`src/mcp/http-transport.ts:197-217,242-369,371-417`; README
`README.md:167-201`). This supersedes the June plan's intended stateless
default (`plans/stateful-http-resource-subscriptions-plan.md:1-8,41-65`).

The npm package is version 0.3.3 and only packages the built bundle, registry
metadata, README, integration notes, and changelog (`package.json:8-29`).
`server.json` currently advertises the stdio package transport only
(`server.json:1-20`), although runtime HTTP is documented and implemented.
The package smoke check initializes the packed server, verifies identity/version,
and requires at least 100 listed tools (`scripts/package-smoke.ts:7-8,128-149`);
the checked-in tarball was built from 0.3.3. There is no prompt or completion
registration: `create-mcp-server.ts` imports only tool/resource MCP request
schemas (`src/mcp/create-mcp-server.ts:1-14,165-217`).

## June plan status

The June 13 matrix is stale as a current-gap list. It marked config,
transitions, filters, outputs, sources, and canvases as parity gaps/later and
listed version gating, screenshot policy, virtual camera/replay, resources,
event subscriptions, batches, and canvas identity as future work
(`plans/obs-competitor-gap-matrix.md:41-60,75-88`). Current code closes the
request-level parts of those items: 147 request descriptors, 60 event entries,
version-gated tools/resources, typed filters/outputs/transitions/screenshots,
canvas inventory, bounded events, batches, resources/templates/subscriptions,
and toolset filtering.

The user-facing June plan's resource slice is implemented and expanded, while
its prompts, completions, presets, workflow tools, and visual diff layer remain
roadmap items (`plans/obs-mcp-user-facing-competitive-plan.md:22-46,48-168`;
`plans/obs-mcp-resources-implementation-plan.md:37-86,517-526`). The practical
remaining product-level gaps visible from local code are:

- prompts and completions;
- presets and scene/state diff workflows;
- higher-level recording/window-capture/setup tools;
- a generic condition/event wait layer beyond typed confirmations;
- canvas-scoped `list_scenes` and `create_input` field support;
- deliberate packaging/registry expansion if HTTP, Docker, VS Code, or other
  distributions become competitive requirements.

For competitor comparison, use the 159/147/60 counts as the local structural
baseline, then compare request names and field semantics separately. In
particular, a competitor's larger tool count can represent split wrappers or
higher-level workflows; it should be cross-walked to the two canvas field
gaps, the intentional settings/read redactions, and the still-absent MCP
prompts/completions before classifying us as ahead or behind.
