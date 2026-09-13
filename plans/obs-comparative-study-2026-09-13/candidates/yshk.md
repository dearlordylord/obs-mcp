# yshk-mrt/obs-mcp: architecture and executed behavior

Observed 2026-09-13. Source pinned to [`643e6646075083418f956e163b6f8c0998f34a68`](https://github.com/yshk-mrt/obs-mcp/tree/643e6646075083418f956e163b6f8c0998f34a68); declared package version **1.0.0**. License provenance: MIT, copyright yshk-mrt 2025; [license](https://github.com/yshk-mrt/obs-mcp/blob/643e6646075083418f956e163b6f8c0998f34a68/LICENSE), [package](https://github.com/yshk-mrt/obs-mcp/blob/643e6646075083418f956e163b6f8c0998f34a68/package.json). Fresh isolated checkout `/tmp/obs-study-ts/yshk`. Runtime Node **24.20.0**, npm **11.19.0**, Linux arm64. Source review, maintainer claims, observed execution, and inferences are distinguished below.

All process runs use the shared loopback OBS v5 fixture, synthetic credentials, an allowlisted environment, isolated HOME, and the pinned source/build. No real OBS rendering, device behavior, codecs, live streams, platform capture, or latency was tested. No candidate code was repaired. Adapters map only public launch/tool arguments. Harness-obsolete initial traces are retained explicitly and excluded from final verdicts.

Presentation Buddy is a hackathon presentation-production relay, not a claimed exhaustive OBS protocol server. Its scene and media controls are relevant to that scope, but mismatched schema conversion, handler parameter access, and result shapes undermine several of its own declared tools. The README itself acknowledges that screenshot delivery to Claude did not work; the general reference-job image gap is therefore not a hidden narrow-scope requirement.

## Distribution and own tests

**Observed:** package version1.0.0 differs from tool-definition/runtime identity `obs-mcp-ts`0.1.0. npm lookup for `obs-mcp-server-ts` returned404, no independently verified npm release. The source README is a presentation/demo narrative rather than a reproducible install guide. [Package](https://github.com/yshk-mrt/obs-mcp/blob/643e6646075083418f956e163b6f8c0998f34a68/package.json), [tool definitions](https://github.com/yshk-mrt/obs-mcp/blob/643e6646075083418f956e163b6f8c0998f34a68/src/obs_mcp_tool_def.json), [README](https://github.com/yshk-mrt/obs-mcp/blob/643e6646075083418f956e163b6f8c0998f34a68/README.md), [registry observation](../results/royshil-publication.json).

Initial `npm install --ignore-scripts` passed, but unlocked SDK1.30.0/TS5.9.3 `npm run build` exceeded a120s watchdog with no emitted entry. We did not stop there: `pnpm install --frozen-lockfile --ignore-scripts --force` restored repository lock versions SDK1.11.4/TS5.8.3 and `npm run build` succeeded unchanged. This is a successful pinned entry with an unlocked-dependency reproducibility limitation, not an absolute build failure. The package has no authored test script/files. [Initial build](../results/yshk-build.log), [locked install](../results/yshk-pnpm-install.log), [locked build](../results/yshk-pinned-build.log), [lock](https://github.com/yshk-mrt/obs-mcp/blob/643e6646075083418f956e163b6f8c0998f34a68/pnpm-lock.yaml). Launch is `node build/index.js`; OBS_WEBSOCKET_URL and OBS_PASSWORD are set synthetically, overriding a hardcoded source default password (value not reproduced here).

## Architecture and changeability

**Static evidence:** one large `src/index.ts` owns console redirection and synchronous debug-file logging, configuration, filesystem paths, WebSocket handshake/authentication, pending-request timeouts/reconnect, dynamic JSON-to-Zod conversion, MCP tool registration, explicit action mapping, replay filesystem workflows and shutdown. `obs_mcp_tool_def.json` separates declarative tools, but conversion ignores required arrays, ignores additionalProperties, and builds `z.object({})` for free-form objects. Handlers inconsistently unwrap `params.params` versus reading top-level params. Several return only structuredContent even though registration supplies no outputSchema. [Implementation](https://github.com/yshk-mrt/obs-mcp/blob/643e6646075083418f956e163b6f8c0998f34a68/src/index.ts), [definitions](https://github.com/yshk-mrt/obs-mcp/blob/643e6646075083418f956e163b6f8c0998f34a68/src/obs_mcp_tool_def.json).

**Observed extended counterexamples:** omitting screenshot fields described as optional is rejected for filePath/width/height/compressionQuality/imageFormat. A valid listed SetShaderFilter invocation loses source/filter identifiers and nested settings before sending `{filterSettings:{}}` to OBS, then returns MCP -32603 because its output lacks required content. CreateSource similarly reaches OBS without its intended source/settings fields (the fixture does not implement creation, so its upstream success/failure is not rated). SetTransitionSettings reads wrapped parameters at the wrong level. These are source-to-schema-to-wire traces, not merely an opinion about a long file. [Extended execution](../results/yshk-extended.json).

**Concrete change traces (inference):**

- One request: edit the JSON definition and switch arm in index.ts, ensuring registration nesting and output shape agree; a direct pass-through handler does not exist.
- One nested settings kind: first correct or replace the shared JSON-to-Zod converter's additionalProperties/required semantics, then audit handlers that unwrap params. A new field alone cannot survive the present object schema.
- Event-confirmed workflow: WebSocket event branch is a TODO. Add event delivery/correlation, cancellation and lifetime boundaries before adding workflows; replay uses a fixed2s sleep and newest matching filesystem file, which does not correlate a save event to the requested replay.
- Second transport: separate the global registration and connection/filesystem state from stdio startup; resolve global console interception and process handlers for embedding.
- Canvas identity: update definitions plus per-action mapping and lookup calls. Several operations resolve source names through GetSceneItemId; UUID/canvas identity needs end-to-end propagation, not an extra field in JSON alone.

## Independent strengths and avoidances

The production-assistant idea and source-name-to-scene-item lookup are useful inspiration; recording/replay/media actions align with a solo-presenter workflow. Avoid fixed-delay latest-file replay selection, default credential literals, synchronous whole-request logs, a partial schema translator, and ambiguous embedded file placeholders instead of screenshot bytes. Demo claims about listening, voiceovers, and automated decisions are not capabilities established by this MCP relay source or fixture.

## Executed gates and weighted ratings

Final evidence: [core run](../results/yshk.json), [schema/settings traces](../results/yshk-extended.json), [authenticated unavailable-request supplement](../results/yshk-unavailable.json). The fixture confirms scene switching, mute and recording mutations; it does not invent readback tools absent from this product. The composite mute/record probes fail because their MCP observation/status steps are unsupported, not because those mutations failed. Screenshot tries to save under a hardcoded sibling directory that does not exist, ignores the caller's supplied filePath, and receives an OBS-shaped filesystem error. The earlier fixture crash on that filesystem error is excluded. Creating the missing directory would change the environment, but would still leave its disabled resources/read path and misleading optional schema; no automatic repair is credited.

| Gate | Verdict | Observed basis |
|---|---|---|
| G1 | P | Frozen pnpm dependencies build and initialize/list successfully; unlocked npm build limitation recorded separately. |
| G2 | F | Core actions map correctly, but settings/media-style wrapped arguments are lost in several advertised handlers; SetShaderFilter omits source/filter identity. |
| G3 | F | Core mutation acknowledgements match fixture state; settings outputs are malformed MCP results, and record/mute inspection is absent. |
| G4 | P | Invalid args, unknown scene, injected OBS rejection,10s missing reply, disconnect and removed screenshot request all return bounded errors in executed probes. This does not validate untested reconnect/handshake corner cases. |
| G5 | F | No version/record-status/mute-readback tools and unusable screenshot path/resource pipeline prevent the complete inspection/visual-verification job. |
| G6 | F | Advertised optional fields become required; free-form settings strip data; structured-only results lack registered output schemas/content. |

No stdout noise was observed: console output is redirected to stderr and an isolated HOME debug file. Logging every request and the hardcoded source default credential are static operability concerns; host secrets were never supplied.

| Dimension | Rating | Evidence-backed rationale |
|---|---:|---|
| A (25) | 1 | JSON declarations separate names from code, but connection, schemas, policy, filesystem, logging, workflows and transport share one global module. |
| B (20) | 1 | Pending-request timeouts/disconnect cleanup work for core probes; broken schema conversion and nested params/results undermine richer protocol/state semantics. |
| C (15) | 1 | Scene/audio/record mutations suit the demo scope, but its own settings/image features and complete reference inspection are unreliable or absent. |
| D (15) | 1 | No authored suite; locked build and shared runtime/failure/settings traces are the only executed assurance. |
| E (15) | 1 | Request changes require JSON+switch synchronization; nested kinds need converter/handler changes, while events/transports/canvas identity cut across the global module. |
| F (10) | 1 | Reproducible with the lockfile after an alternate build attempt, but little installation guidance, no verified publication, divergent identity and local-path/logging assumptions. |

Weighted total **25/100**. Scope-relative result: an interesting presentation assistant prototype whose intended relay primitives partly work, with correctness defects in features it actually advertises. Confidence medium.
