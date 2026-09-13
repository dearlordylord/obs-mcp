# How `crap4ts` turned competitor research into a release

Date: 2026-09-13

This is a history of decisions and executable contracts, not a new competitor
ranking. Evidence comes from the `crap4ts` commit DAG and diffs, plus the issue
bodies and closure comments that those commits implemented.

## The actual ordering

1. At 23:00 EDT on August 25, [`3c7561f`](https://github.com/dearlordylord/crap4ts/commit/3c7561f6da3f40ffcebbb2ec1076d2ae30d43425)
   committed the fixed-commit comparison, six viability gates, weighted rubric,
   and shared external fixture. The report did not select the highest score
   mechanically: Icaruswings scored highest (86.25) but failed the end-to-end
   gate; Alperlabs (82.50) was the best candidate to pass all gates. Its stated
   conclusion was to combine independent strengths and implement TypeScript
   first.
2. [Issue #1](https://github.com/dearlordylord/crap4ts/issues/1) was opened at
   23:02. Its product, implementation, test, and out-of-scope sections converted
   the comparison into a parent contract. At 23:06,
   [`625325a`](https://github.com/dearlordylord/crap4ts/commit/625325a8817017fcf26410bdbdd8b124480ce12b)
   reassessed the language choice to a Rust/Oxc core, standalone CLI, five native
   targets, and thin npm wrapper. Child issues
   [#2–#11](https://github.com/dearlordylord/crap4ts/issues/1) were opened at
   23:18 with dependency edges and observable acceptance criteria, before the
   first implementation commit at 23:48.
3. Implementation landed as issue-shaped branches and explicit merge commits:
   foundation #2 at [`76eb048`](https://github.com/dearlordylord/crap4ts/commit/76eb048d1ac23bd8364cb752c75f9574a4eda22d),
   source analysis #3 at [`ca4eb23`](https://github.com/dearlordylord/crap4ts/commit/ca4eb23167426f95688d33b8c1042429df7b6142),
   source selection #5 at [`5b9c1ba`](https://github.com/dearlordylord/crap4ts/commit/5b9c1ba273e9e9a6d405bc19b86e11bec96d6155),
   npm wrapper #10 at [`44815e9`](https://github.com/dearlordylord/crap4ts/commit/44815e9ea817a671d5953f1b820fd3ffa3aa4d8f),
   Istanbul #4 at [`33b7d4e`](https://github.com/dearlordylord/crap4ts/commit/33b7d4e25628f22c3ba00d2fea1e8823befd4f49),
   LCOV #6 at [`391a5cf`](https://github.com/dearlordylord/crap4ts/commit/391a5cfdc4c601665ecb91d46a0a1f684eeff6b0),
   policy #7 at [`f80d793`](https://github.com/dearlordylord/crap4ts/commit/f80d793b4630412d9e08fab9bd81cfcd41ad7a43),
   fresh coverage #8 at [`b202e44`](https://github.com/dearlordylord/crap4ts/commit/b202e44db1dbb6f96a51c34aefef07b5113c1f70),
   and package groups #9 at [`81ce544`](https://github.com/dearlordylord/crap4ts/commit/81ce544fca24b5239e85130a964beb2572aa8828).
   This order followed dependencies rather than issue number; the distribution
   wrapper could land after the minimal executable while LCOV waited for the
   normalized Istanbul model.
4. Release #11 began at [`057e31f`](https://github.com/dearlordylord/crap4ts/commit/057e31ffed62e8ab3b166075019a5e8d5845c63c),
   then accumulated schema, checksum, immutability, retry, OIDC, uploaded-binary,
   Windows, and exact-asset gates through [`d7d0694`](https://github.com/dearlordylord/crap4ts/commit/d7d06947f8e2cc98f1de5f4bdf87380dcb442512).
   A post-push audit then disproved “automation complete means released.”
   [`593fcc4`](https://github.com/dearlordylord/crap4ts/commit/593fcc48468f516dfa1c5db161116aefd6a9832e)
   recorded that no attributable release existed, Windows CI was red, the
   unscoped npm name belonged to Breezy, and new scoped packages needed first
   publication before trusted publishing. Issue #11 was reopened.
5. The fixes were again audit-driven: scoped organization publication and
   resumability (`8c15127` through `09bcc6e`), comprehensive review
   [`4f4dcb5`](https://github.com/dearlordylord/crap4ts/commit/4f4dcb5bf6b0ca83ab811b999712c029e0b34ff3),
   second-pass release findings
   [`00c1526`](https://github.com/dearlordylord/crap4ts/commit/00c152619346fe9fef4fd40aafec13bb3a8c01ad),
   active-account validation (`34ac102`), and an exported target matrix
   (`981fa7e`). Only after green hosted release evidence and registry publication
   did #11 and #1 close. A later production audit found that v1.0.0/1.0.1 Linux
   binaries inherited Ubuntu 24.04's glibc floor; [`c3fcb06`](https://github.com/dearlordylord/crap4ts/commit/c3fcb060553f7a731766a5a459fc6780b70f3c50)
   moved builds to Ubuntu 22.04 and made `readelf` plus Debian 12 execution of the
   exact release binary a release gate for 1.0.2.

## What was adopted, and where it became executable

| Research finding | Contract | First substantial implementation evidence |
|---|---|---|
| Icaruswings: narrow parser/coverage/domain/report boundaries, exact ranges, explicit unknowns, diagnostics, safe cleanup, black-box seams | #1, then #2/#3/#5/#8 | [`53e7372`](https://github.com/dearlordylord/crap4ts/commit/53e737251bbb8a1591282b8d6f25296f9047668f) created the typed core and real CLI; [`53976c9`](https://github.com/dearlordylord/crap4ts/commit/53976c990679bf68299e9f9bbe12ab215f172f90) split application, coverage, domain, path, report, and source modules; `04004f3` and `207278b` added root/symlink/stale-artifact failure tests. |
| Gligorkot: uniquely most-specific, exclusive ownership with ambiguity rejected | #4, and line-only limitations in #6 | [`e823e87`](https://github.com/dearlordylord/crap4ts/commit/e823e8725e3c081b15c614bcdf60bfe98048aad2) added tests for nested/same-line functions, duplicate ranges, unmatched-child barriers, file-scoped duplicate names, and crossing ranges; [`1cdec3d`](https://github.com/dearlordylord/crap4ts/commit/1cdec3dd41a5782e0f6f2d9ff7237bac274799c0) preserved LCOV ambiguity as unknown/diagnostic rather than guessing. |
| Alperlabs: replaceable coverage/report concerns, configuration precedence, package orchestration, ratchet-friendly policy | #6/#7/#9 | `1cdec3d` added a second adapter without format-specific scoring changes; [`f7cc683`](https://github.com/dearlordylord/crap4ts/commit/f7cc683aa04e1d51e99bfe6c6af669f59aa3dee0) and `7addcef` tested strict data-only config, defaults/config/CLI precedence, path thresholds, and report-only unknowns; [`ac0e5af`](https://github.com/dearlordylord/crap4ts/commit/ac0e5af3f08135e4d5b572665dc186a316e35dcb) tested isolated Istanbul and LCOV groups and atomic failure. |
| Jaseempk: compact deterministic report and a distinct threshold exit | #2/#7 | `53e7372` locked golden formula vectors, numeric-before-unknown ordering, deterministic JSON/text, and `0/1/2` outcomes; `f7cc683` extended those outcomes to configuration and effective thresholds. |
| Comparison-wide operability lesson: packaged CLI is the primary acceptance seam | #1/#2/#10/#11 | Black-box CLI tests started in `53e7372`; [`263b09d`](https://github.com/dearlordylord/crap4ts/commit/263b09d7b0402acd35970609c3b1322808ec5ddd) added the no-analysis npm launcher; `057e31f` made direct and packed installation smoke part of release assembly. |

The six viability gates therefore became tests rather than prose: fresh build,
help and version, formula vectors and unknown semantics, structural TS/TSX
fixtures, collision-resistant coverage joins, deterministic end-to-end reports,
and distinct failure statuses. “Honest scope” also became negative tests and
declared limitations: unsupported/bodyless syntax, LCOV same-line ambiguity,
unsafe paths, missing evidence, malformed inputs, and unsupported platforms had
explicit failure behavior.

## What did not follow mechanically

- The score table was evidence, not a purchase order. The implementation did
  not clone Alperlabs, and it did not discard Icaruswings because that project
  failed one viability gate. It selected local strengths and supplied the
  missing policy itself. GPL Breezy informed boundaries but was explicitly a
  design lesson rather than source for the MIT implementation.
- The original report's TypeScript-first recommendation was superseded for a
  separate product reason: runtime-independent execution. The semantic findings
  survived the language change. `625325a` initially overwrote the historical
  conclusion; the audit at `4f4dcb5` restored the exact original report blob,
  then added
  [`research/2026-08-25-rust-architecture-reassessment.md`](../../crap4ts/research/2026-08-25-rust-architecture-reassessment.md)
  and
  [`ADR 0001`](../../crap4ts/docs/adr/0001-rust-core-and-thin-npm-wrapper.md).
  The ADR supersedes only language/distribution and retains the normalized
  boundaries. This is the clearest reason OBS should not recommend a rewrite
  merely because a competitor scores higher.
- The release census did not cause a race to publish because six peers had
  shipped. It produced falsifiable readiness checks, reopened #11, renamed the
  package, required green Windows evidence and authenticated bootstrap, and
  closed only on public registry/release evidence.

## Method implications for OBS

OBS should preserve this chain: fixed evidence snapshot -> explicit
reassessment/ADR for changed assumptions -> issue-sized observable contracts ->
implementation commits -> artifact-level release audit. Keep the original
comparison immutable when the decision changes; supersede one conclusion in a
new record and state which findings remain valid.

Translate viability claims into tests at existing product seams. For OBS, the
current tarball smoke is the natural seam: extend it with a small semantic OBS
fixture and assert tool results, tool errors, initialization identity, and the
resulting OBS state. Per-job CLI exit codes from `crap4ts` do not transfer
directly to a long-running MCP server.
Bind publication to the exact packed bytes that passed that smoke (and verify
the registry result against those bytes), instead of inventing a parallel
packaging architecture. Treat Node 22/24/26, lazy tool discovery, initialization
identity, and tool-count checks as necessary compatibility evidence, not as a
semantic proof of the shipped package.

Finally, separate adoption from correction. Copy a competitor strength only
when it closes an OBS contract or a measured failure. A higher architecture
score can justify investigation; it cannot by itself justify changing OBS's
language, framework, module layout, or release machinery.

## Proposed OBS execution sequence

This is a proposed implementation plan, not a record of shipped changes or
created GitHub issues. It follows the historical method while accounting for
OBS's existing architecture and release pipeline.

### Parent contract and first milestone

Keep the TypeScript/Effect implementation and existing stdio/HTTP boundaries.
The next milestone should let an agent inspect supported OBS settings without
silent field loss, select the intended scene/canvas, make a bounded change,
and consume a complete image through MCP. Failures must remain truthful. The
[comparative study](obs-comparative-study-2026-09-13/README.md) supplies the
counterexamples; it is preserved as dated evidence.

Record the settings contract before implementation: how typed conveniences
coexist with nested JSON, how a caller requests the lossless representation,
which sensitive values remain excluded, and how existing callers remain
compatible. Record the chosen image-content contract too. Native OBS process
identity, dashboards, hosted multi-PC control, and a general workflow engine
are separate product decisions, outside this first milestone.

| Proposed work item | Observable acceptance contract | Dependency / sequencing |
|---|---|---|
| Baseline and maintained regression fixture | Run against current dependencies, preserve the old study baseline, and turn the known local field failures into executable assertions. Fix response parsing and false-success oracles before using them as CI verdicts. | First. Current master includes dependency merge `eb42103`; the research ran at `587e356`. Preserve study traces and maintain the CI fixture separately. |
| Contract and documentation alignment | Architecture docs agree with shipped transports, screenshots, batches, and studio-mode writes; descriptor-name parity is distinguished from field parity. Settings/image compatibility decisions are explicit. | First, alongside baseline. This addresses the study's local G6 documentation partial. |
| UUID/canvas fidelity | `list_scenes.canvasUuid`, name-based `create_input.canvasUuid`, and `set_current_scene.sceneUuid` reach OBS unchanged and select the intended entity; batch and public schema behavior agree. Invalid combinations fail truthfully. | After baseline; can run alongside settings work with distinct schema ownership. |
| Nested settings fidelity | Representative filter/output/transition nested values round-trip through the declared interface; current transition reads expose settings using the existing valid request. Unknown supported values are preserved, and exclusions/rejections are explicit. | After the settings contract. Include unknown keys, nested arrays/objects, and the chosen sensitive-field policy. |
| Native MCP visual result | A supported client consumes a complete bounded image from an actual MCP result/resource; existing JSON metadata remains compatible as agreed. Remote OBS save behavior has an explicit filesystem contract. | After the image contract; can run alongside selector/settings work. |
| Artifact acceptance and release | A fresh install of the packed artifact performs inspection, mutation/readback, recording, image retrieval, and truthful error/timeout/disconnect handling. The published artifact is the exact tested tarball, with registry integrity checked afterward. | Add the job to the existing package-smoke pipeline, then use it to close this milestone. Keep real-OBS acceptance separate from simulated execution. |

The existing [package smoke](../scripts/package-smoke.ts) already installs a
tarball and checks server identity plus tool listing. Its
[Node matrix](../.github/workflows/package-smoke.yml) already covers Node
22/24/26. The proposed work extends these seams. The current
[publish workflow](../.github/workflows/publish-npm.yml) runs checks and package
smoke, then invokes directory-based `npm publish` and checks registry version;
it does not explicitly bind publication to the previously tested tarball.
That is an enforcement gap, not evidence that different bytes were published.

Use the study's PNG, settings, capability, and failure counterexamples as
regressions, but do not promote its raw pass count into a CI oracle. Its
[independent review](obs-comparative-study-2026-09-13/independent-review.md)
records parser false negatives and success-shaped false positives that must be
resolved in a maintained acceptance runner. A passing screenshot through a
fake does not establish real rendering or actual client presentation; include
an isolated real OBS/client acceptance run for the visual milestone.

### Second milestone: one task-level workflow

Start with read-only AV-health diagnosis over existing primitives. Its result
should separate observed measurements, inferred warnings, unsupported checks,
and unknown/stale information. Use xDark's workflow shape and Giancarlo's
bounded history as design evidence. A useful acceptance case is a controlled
OBS profile producing a known warning, with the report stating the evidence
and making no OBS mutation.

Only then add a preview/apply audio setup or similarly focused mutating job.
DCC and BEA inform deadline propagation, postcondition checks, partial-failure
reporting, and restoration. Our client already has tests preventing retries
of in-flight requests and batches; preserve those rather than treating the
feature as absent. Add end-to-end coverage only where the new workflow opens
an uncovered uncertain-outcome or restoration case. Restoration must account
for intervening state changes rather than blindly replaying an old snapshot.
Exact DCC PID/plugin-instance binding requires a native contract and is not a
standard-WebSocket feature we can simply switch on.

### Orchestration and completion

Draft one parent milestone with scope, exclusions, dependencies, and evidence
required for closure. Split the first milestone into the concrete work items
above. After the shared contracts and baseline are established, selectors,
settings, and visual results can be implemented in parallel with explicit file
ownership. Integrate through the packed entrypoint, independently review the
strongest success/failure claims, and close only against the recorded release
acceptance. Retain failures and superseding decisions as dated evidence, as
crap4ts eventually did for both its language choice and release status.
