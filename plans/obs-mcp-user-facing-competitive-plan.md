# OBS MCP User-Facing Competitive Plan

Status: tentative.

Date: 2026-06-14.

Scope: roadmap-level plan for making `@firfi/obs-mcp` competitive in user-facing OBS MCP niches. This is not an implementation PRD and does not commit exact tool names, schemas, storage format, or release order.

Product thesis: users care first about what they can accomplish with OBS. Architecture matters when it makes those jobs more reliable, easier to discover, easier to compose, or safer to run, but it is not the headline.

Primary niche to win first:

> The most capable MCP-native OBS assistant for recording, streaming setup, visual verification, and direct OBS control.

Secondary niches to consider after the primary niche is credible:

- Recording and screen-capture assistant.
- Low-level OBS control plus workflow hybrid.
- Showrunner-lite assistant.
- AI-streamer or live-production overlay integration, only if chosen deliberately as a larger product direction.

## 1. MCP Resources

Goal: make OBS state inspectable as MCP-native resources, not only through imperative tools.

Tentative resources:

- `obs://state/current`
- `obs://scenes`
- `obs://inputs`
- `obs://outputs`
- `obs://recording`
- `obs://streaming`
- `obs://screenshots/latest`

User value:

- Clients can inspect OBS context without guessing which tools to call.
- Assistants can reason from stable state documents.
- This closes a visible gap against Agentic OBS, Sbroenne, and obs-showrunner.

Design caution:

- Start with read-only resources.
- Avoid inventing resource subscriptions until we have a real workflow requiring them.
- Do not expose huge screenshot payloads by default if a retained file or URI model is better.

## 2. MCP Prompts

Goal: provide ready-to-use OBS workflows as MCP prompts, not just a pile of controls.

Tentative prompts:

- `record-window`
- `quick-screen-record`
- `stream-readiness-check`
- `audio-check`
- `scene-designer`
- `troubleshoot-recording`

User value:

- A user can ask for common jobs directly.
- New users get guided workflows instead of needing OBS protocol knowledge.
- This competes directly with Agentic OBS and Sbroenne's workflow orientation.

Design caution:

- Prompts should call existing tools/resources; they should not hide unavailable functionality.
- Keep prompt text grounded in what the server can actually do.

## 3. Completions

Goal: make names and identifiers easier to use from MCP clients that support completions.

Tentative completion domains:

- scene names
- source names
- input names
- filter names
- profile names
- scene collection names

User value:

- Fewer failed calls from misspelled scene/source/input names.
- Better interactive UX in clients that expose MCP completions.

Design caution:

- Completions should come from current OBS state.
- Completion values must match the identifier model used by the related tools.

## 4. Workflow Tools

Goal: add user-job tools that compose low-level OBS primitives into common outcomes.

Tentative tools:

- `get_status`
- `record_window`
- `capture_window`
- `setup_recording`
- `setup_streaming`
- `mute_all`
- `unmute_all`
- `verify_scene_visual`
- `switch_scene_and_confirm`
- `start_recording_and_confirm`

User value:

- Users can request common OBS work in one call.
- We compete with Sbroenne's recording/window-capture niche and Lars-style aggregate status.
- We make broad OBS coverage useful without requiring the user to chain many primitive tools.

Design caution:

- Workflow tools should be thin orchestrators over existing primitives.
- Prefer explicit workflow tools for common jobs over a generic action multiplexer.
- Window capture details are platform-sensitive; confirm OBS support and input property behavior before promising cross-platform parity.

## 5. Presets

Goal: make repeatable OBS setup possible without forcing users to manually recreate scene/source/recording state.

Tentative capabilities:

- save/apply scene preset
- save/apply source preset
- save/apply recording preset
- diff current scene against preset
- list/delete/rename presets

User value:

- Users can save known-good streaming or recording setups.
- Assistants can restore or compare OBS state.
- This addresses a real gap versus Agentic OBS.

Design caution:

- Decide whether presets are MCP-server state, OBS persistent data, or explicit files before implementation.
- Avoid storing secrets or stream credentials.
- Version preset schemas from the start.

## 6. Event And Condition Layer

Goal: use events to support workflows, not to expose events for their own sake.

Tentative capabilities:

- `wait_for_obs_condition`
- workflow confirmations backed by bounded recent events
- optional expert-gated `wait_for_event`

User value:

- Tools can confirm that OBS actually changed state.
- Assistants can wait for recording, streaming, scene, media, or transition conditions without polling blindly.

Design caution:

- Generic event streaming is not the default product.
- Event waits must be bounded by timeout and clear cancellation semantics.
- Prefer named workflow conditions over regex/event firehose APIs.
- Confirm MCP client behavior for long-running tool calls before committing generic wait tools.

## 7. Screenshot And Visual Loop

Goal: let users and assistants verify what OBS is showing.

Tentative capabilities:

- screenshot resource
- retained screenshot files or URIs
- before/after workflow confirmation
- optional visual diff metadata

User value:

- Assistants can verify scene changes visually.
- Recording/stream setup workflows can prove the expected source is visible.
- This strengthens the recording assistant niche.

Design caution:

- Keep filesystem writes scoped to configured output directories.
- Avoid unbounded screenshot retention.
- Treat screenshot payload size as a client UX and transport concern.

## 8. Distribution Polish

Goal: make the server easy to discover, install, verify, and trust.

Tentative capabilities:

- npm release path
- Glama metadata
- Docker image
- smoke checks
- generated README checks
- clean Claude Desktop and MCP client config examples
- registry metadata
- VS Code packaging only if it becomes a deliberate niche

User value:

- Users can install without cloning.
- Registries can index the server accurately.
- Release checks reduce broken package risk.

Design caution:

- Do not overfit README language to architecture claims.
- Keep install examples MCP-user oriented.
- Registry metadata should describe real user-facing capabilities, not aspirational features.

## Competitive Read

If these eight areas are implemented well, `@firfi/obs-mcp` can credibly compete as a top general-purpose OBS MCP server and can likely win the recording/setup/visual-verification niche.

It still would not automatically beat:

- `obs-live-suite` for full live-production overlays, guests, posters, countdowns, and Stream Deck workflows.
- `moltstream` for AI-streamer runtime, chat, TTS, personality, and trace workflows.
- Agentic OBS dashboard/TUI UX unless we choose to build a UI.

The plan should be judged by user jobs completed, not by raw tool count.
