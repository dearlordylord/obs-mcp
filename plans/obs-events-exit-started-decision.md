# Decision: Keep `ExitStarted` Diagnostic-Only

Status: accepted.

Date: 2026-06-13.

## Decision

Do not implement a public confirmation tool for `ExitStarted`.

No `confirm_obs_exit_started`, `confirm_obs_general_lifecycle`, or close-as-confirm behavior should be added in the current event architecture.

`ExitStarted` remains a typed-safe diagnostic event available through `get_recent_obs_events` when retained and when the caller asks for general events.

## Rationale

`ExitStarted` has weak workflow semantics for this MCP server:

- It has no payload beyond an exact empty object.
- It has no domain target identity.
- There is no safe follow-up OBS request surface after OBS begins shutdown.
- It is already visible diagnostically through the safe event journal.

It is also race-prone as a waiter target. OBS may emit `ExitStarted` and then close the websocket immediately. The current event buffer rejects pending and future waiters after close, and that behavior is correct for all other confirmation tools. Reinterpreting close as a successful `ExitStarted` confirmation would blur transport lifecycle with OBS event semantics.

This follows the broader event posture: diagnostic-safe events do not automatically become public wait predicates.

## Requirements

- `ExitStarted` remains typed-safe in the event catalogue.
- `ExitStarted` remains visible through `get_recent_obs_events` as a `general` diagnostic event when retained.
- Workflow confirmation tools continue excluding `ExitStarted`.
- Pending waiters continue to reject on OBS disconnect/client close.
- No MCP resources, resource subscriptions, or custom event notifications are introduced for shutdown state in this slice.

## Future Work

If shutdown-aware behavior becomes important, design it as a broader connection/server lifecycle feature rather than a narrow OBS event confirmation tool. That future design should account for transport close, reconnection policy, server lifecycle notifications, and any MCP resource semantics explicitly.
