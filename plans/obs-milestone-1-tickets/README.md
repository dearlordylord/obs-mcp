# OBS first-milestone implementation tickets

Status: User approved the full breakdown; all 18 tickets are published with verified native parent links and dependencies. See [publication record](tracker.json) and [verification](verification.json).

Scope: Decompose the five existing **OBS fidelity and visual acceptance** workstream specifications. The later milestone, investigations and all 58 finding dispositions remain in the existing backlog.

The backlog contains 16 development/verification tasks and two operational acceptance/release tasks. Tickets are linked beneath their existing workstream specifications. Existing issue bodies, labels, milestones and states are not changed by ticket publication.

## Execution boundaries

- The existing foundation workstream remains the gate for feature implementation. Complete and reconcile its five child slices before the gate is satisfied. This retains the published dependency contract; no child is blocked by its own parent.
- The installed-workflow integration retains the existing release workstream's foundation, selector, settings and image gates. These are workstream completion dependencies; implementation tickets also show their narrower dependencies where applicable.
- Settings families can proceed independently after the shared public contract is recorded. Shared helper ownership is an integration concern, not a filter-first dependency.
- Every feature slice includes public schema/result behavior, request forwarding, controlled OBS state assertions and documentation. No separate schema-only, operation-only or test-only layer tickets are introduced.
- Reuse existing installed-package, protocol and HTTP seams. Historical benchmark snapshots remain immutable. Actual rendering and save-topology claims require the separate real OBS/client check.
- Real OBS access and maintainer release authorization are explicit external gates. Plan approval does not authorize npm publication.
- A future orchestrator must select approved implementation children, not broad workstream specs merely because they share the ready-for-agent label. It must retain blockers, evidence and next actions in the tracker when handing off.

## Published tickets

1. **[Record the current OBS baseline and public compatibility contracts](https://github.com/dearlordylord/obs-mcp/issues/21)**

   Blocked by: None.

   Delivers: An operator can distinguish shipped behavior from planned changes and find the exact compatibility rules for settings and screenshots.

2. **[Verify an installed package against controlled OBS](https://github.com/dearlordylord/obs-mcp/issues/22)**

   Blocked by: None.

   Delivers: A fresh consumer runs a real MCP process and proves existing inspection, mutation/readback, audio, recording and screenshot behavior.

3. **[Make package acceptance reject false success and uncertain outcomes](https://github.com/dearlordylord/obs-mcp/issues/23)**

   Blocked by: [Verify an installed package against controlled OBS](https://github.com/dearlordylord/obs-mcp/issues/22).

   Delivers: Acceptance fails when the server reports success without the expected OBS state, and reports faults without inventing a verdict.

4. **[Detect protocol field omissions and documented restrictions](https://github.com/dearlordylord/obs-mcp/issues/24)**

   Blocked by: None.

   Delivers: Maintainers can detect missing or stripped request fields rather than relying on request-name counts.

5. **[Verify existing subscriptions and screenshot retention](https://github.com/dearlordylord/obs-mcp/issues/25)**

   Blocked by: [Record the current OBS baseline and public compatibility contracts](https://github.com/dearlordylord/obs-mcp/issues/21).

   Delivers: Users have an evidence-backed description of stateful subscriptions, stateless reads and latest-screenshot lifetime.

6. **[List scenes on the requested canvas](https://github.com/dearlordylord/obs-mcp/issues/26)**

   Blocked by: [Establish OBS adoption contracts, current baseline, and maintained acceptance fixture](https://github.com/dearlordylord/obs-mcp/issues/8).

   Delivers: A client lists scenes for a supplied canvas UUID without silently falling back to another canvas.

7. **[Create an input in the requested canvas and scene](https://github.com/dearlordylord/obs-mcp/issues/27)**

   Blocked by: [Establish OBS adoption contracts, current baseline, and maintained acceptance fixture](https://github.com/dearlordylord/obs-mcp/issues/8).

   Delivers: Name-based input creation targets the intended canvas even where scene names are duplicated.

8. **[Select a program scene by UUID in tools and batches](https://github.com/dearlordylord/obs-mcp/issues/28)**

   Blocked by: [Establish OBS adoption contracts, current baseline, and maintained acceptance fixture](https://github.com/dearlordylord/obs-mcp/issues/8).

   Delivers: Single calls and supported batches select the same intended program scene by stable UUID.

9. **[Read and update full-fidelity filter settings](https://github.com/dearlordylord/obs-mcp/issues/29)**

   Blocked by: [Establish OBS adoption contracts, current baseline, and maintained acceptance fixture](https://github.com/dearlordylord/obs-mcp/issues/8).

   Delivers: Explicit settings access preserves permitted nested filter values while existing typed controls keep working.

10. **[Read and update full-fidelity output settings](https://github.com/dearlordylord/obs-mcp/issues/30)**

   Blocked by: [Establish OBS adoption contracts, current baseline, and maintained acceptance fixture](https://github.com/dearlordylord/obs-mcp/issues/8).

   Delivers: Explicit output settings access preserves permitted kind-specific nested configuration.

11. **[Read and update full-fidelity transition settings](https://github.com/dearlordylord/obs-mcp/issues/31)**

   Blocked by: [Establish OBS adoption contracts, current baseline, and maintained acceptance fixture](https://github.com/dearlordylord/obs-mcp/issues/8).

   Delivers: Users inspect the active transition's settings and apply supported nested updates.

12. **[Return bounded native MCP screenshot images](https://github.com/dearlordylord/obs-mcp/issues/32)**

   Blocked by: [Establish OBS adoption contracts, current baseline, and maintained acceptance fixture](https://github.com/dearlordylord/obs-mcp/issues/8).

   Delivers: A screenshot tool returns complete native MCP image content with compatible metadata.

13. **[Save screenshots with explicit OBS-host path semantics](https://github.com/dearlordylord/obs-mcp/issues/33)**

   Blocked by: [Establish OBS adoption contracts, current baseline, and maintained acceptance fixture](https://github.com/dearlordylord/obs-mcp/issues/8).

   Delivers: Users know which host receives a saved screenshot and receive truthful results for supported topologies.

14. **[Gate the complete installed workflow on supported Node versions](https://github.com/dearlordylord/obs-mcp/issues/34)**

   Blocked by: [Establish OBS adoption contracts, current baseline, and maintained acceptance fixture](https://github.com/dearlordylord/obs-mcp/issues/8); [Preserve scene UUID and canvas identity across public tools and batches](https://github.com/dearlordylord/obs-mcp/issues/9); [Provide explicit full-fidelity filter, output, and transition settings contracts](https://github.com/dearlordylord/obs-mcp/issues/10); [Return native MCP images and define remote screenshot save semantics](https://github.com/dearlordylord/obs-mcp/issues/11).

   Delivers: CI verifies the milestone's actual installed workflow under documented defaults and explicit opt-ins.

15. **[Bind release preparation to one verified tarball](https://github.com/dearlordylord/obs-mcp/issues/35)**

   Blocked by: [Gate the complete installed workflow on supported Node versions](https://github.com/dearlordylord/obs-mcp/issues/34).

   Delivers: Release preparation produces one attributable candidate whose tested bytes are the bytes offered for publication.

16. **[Verify registry attribution and safe publication retry](https://github.com/dearlordylord/obs-mcp/issues/36)**

   Blocked by: [Bind release preparation to one verified tarball](https://github.com/dearlordylord/obs-mcp/issues/35).

   Delivers: The release flow distinguishes a matching published artifact, a conflict and an unavailable registry.

17. **[Verify the release candidate in real OBS and an MCP client](https://github.com/dearlordylord/obs-mcp/issues/37)**

   Blocked by: [Bind release preparation to one verified tarball](https://github.com/dearlordylord/obs-mcp/issues/35).

   Delivers: Recorded evidence establishes that the exact candidate produces a consumable real OBS image and honors its claimed save topology.

18. **[Publish the authorized candidate and record release evidence](https://github.com/dearlordylord/obs-mcp/issues/38)**

   Blocked by: [Verify registry attribution and safe publication retry](https://github.com/dearlordylord/obs-mcp/issues/36); [Verify the release candidate in real OBS and an MCP client](https://github.com/dearlordylord/obs-mcp/issues/37).

   Delivers: An explicitly authorized release is attributable to the accepted candidate and verified from the registry.

## Coverage and review

| Existing workstream | Tickets |
|---|---|
| Foundation: contracts, baseline, fixture, field parity, subscriptions | 1–5 |
| Scene and canvas selectors, including batches | 6–8 |
| Full-fidelity filter, output and transition settings | 9–11 |
| Native images, retention compatibility, save topology and format disposition | 12–13 |
| Installed workflow, exact candidate, registry/retry, real visual acceptance, release evidence | 14–18 |

Initial unblocked work: current contracts/baseline, installed baseline acceptance, and field-aware audit (1, 2, 4). Subscription/retention verification follows the recorded contract (5 follows 1); fault acceptance follows the installed baseline (3 follows 2).

Review basis: full current GitHub bodies and comments for the epic, five milestone specifications and existing subscription issue; current package smoke, parity audit, publication paths and relevant implementation seams. Source baseline is recorded in the catalog. Two Sol medium agents independently reviewed feature slicing and foundation/release coverage. Their corrections are incorporated before submitting this breakdown.

Publication completed after user approval. All children carry ready-for-agent and the existing milestone; bodies, native parent relationships and blocking edges were read back and verified. Existing issue bodies, labels, milestones, assignees and states were preserved. Ticket publication does not start implementation or authorize an npm release.
