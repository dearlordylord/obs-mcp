# Ralph Lane inputs-discovery-audio-core

Branch: `ralph/inputs-discovery-audio-core`

## Tasks

- [ ] `task-1` Add input discovery and locator schema
- [ ] `task-2` Add input mute and volume controls

## task-1

Status: `todo`

### Load

Add input discovery only: `list_inputs`, `list_input_kinds`, and `get_special_inputs` from `GetInputList`, `GetInputKindList`, and `GetSpecialInputs`. First inspect the current schema, operation, registry, request descriptor, fake OBS server, and MCP tests for scenes/general. Establish a reusable input locator schema for later tasks, but do not use it for discovery unless the official request needs it. The locator must require exactly one of `inputName` or `inputUuid` at the user-facing schema boundary even though OBS marks both fields optional. Preserve structured output, capability gating through `GetVersion.availableRequests`, OBS error metadata, and README metadata generation if needed. Add tests for discovery output shapes, optional input-kind filtering, unversioned input-kind behavior if exposed, capability-gated unavailable requests, and disabled input toolset behavior if a new toolset is introduced. Non-goals: no mute/volume controls, no advanced audio controls, no media controls, no Object-shaped input settings, no create/remove input lifecycle, no screenshots, no events. Verification: run focused input discovery tests first, then `pnpm check-all`; real OBS integration should be read-only only.

## task-2

Status: `todo`

### Load

Add core input audio controls: `get_input_mute`, `set_input_mute`, `toggle_input_mute`, `get_input_volume`, and `set_input_volume` from the corresponding official requests. Reuse the task-1 input locator schema and require exactly one of `inputName` or `inputUuid` for every targeted input tool. For `set_input_volume`, require exactly one of `inputVolumeMul` or `inputVolumeDb`; reject both and reject neither. Use official numeric restrictions where documented and keep the output structured. Add schema tests for the locator and volume one-of rules, fake OBS websocket tests for every request, OBS failure mapping coverage, capability-gated unavailable tests, disabled toolset tests where applicable, and MCP handler tests. Non-goals: no balance, sync offset, audio tracks, monitor type, deinterlace, Object-shaped settings, media input controls, screenshots, or events. Verification: run focused input audio core tests first, then `pnpm check-all`; real OBS mutations remain opt-in.
