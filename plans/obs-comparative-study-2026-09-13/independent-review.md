# Independent methodology and evidence review

Final scope: 19 implementations, including local. The late-census resolutions below supplement the initial audit rather than changing the frozen gates or weights.

Reviewed 2026-09-13 against the frozen [methodology](methodology.md), fixture `2026-09-13.5`, the polyglot candidate reports, and the local candidate's packed-artifact and field-fidelity evidence. This is an evidence/oracle audit, not a second architecture score for the local project. No candidate or production code was changed.

## Findings requiring explicit adjudication

| Finding | Evidence and implication | Action/status |
|---|---|---|
| **A raw disconnect pass can be false success.** | In [cdavis native](results/cdavis-native-fixture/cdavis-native.json), `in_flight_disconnect` reports raw `pass`, yet the intended scene is `Intro`, the fixture remains `Main`, and the MCP result is `{"ok":true}`. The runner currently accepts any bounded tool success without requiring that the recovered mutation happened. | The [cdavis review](candidates/cdavis.md) correctly assigns G3/G4 failures. Preserve this manual override in synthesis; do not aggregate raw pass counts into gate eligibility. |
| **Embedded application failures are not recovered reads.** | The source and npm [Takurot traces](results/takurot/takurot.json) / [npm trace](results/takurot-npm/takurot-npm.json) label missing-response/disconnect probes `pass`, but return text JSON `{"success":false,"error":"Not connected to OBS"}`. The corresponding upstream fault request was not exercised. `successfulToolResult` checks only outer `isError`, so these bodies are incorrectly interpreted as success. | Workflow owner notified. Assess lack of upstream execution as unresolved fault evidence; discuss missing MCP `isError` separately from the readable application-level error. An offline error is also not proof of unknown-entity or argument validation. |
| **Primitive readbacks can be valid despite raw failures.** | cdavis returns text `Main` for its current-scene getter and `true` for mute. These agree with fixture state and the requested getter semantics, although the generic recursive object-key oracle cannot recognize them. | The cdavis reviewer already adjudicates the core readbacks correctly. Do not turn these parser limitations into candidate G2/G3 failures. |
| **JLFN's initial timeout is an observation-boundary race.** | The initial [JLFN trace](results/jlfn-fixture/jlfn.json) used a 10,000ms watchdog while source has a 10,000ms request bound. The adapter now declares `requestTimeoutMs:10000`, which gives an 11,000ms observation window. | Polyglot owner was already rerunning. Replace the boundary-miss conclusion only with the rerun's result; a static timeout alone is not an observed pass. |
| **JLFN's four nonstandard request names need consistent G2 treatment.** | Pinned [`src/tools_table.rs`](https://github.com/JLFN/obs-mcp/blob/f9dccf0f8903b225615ba3b80a8a63287b92716a/src/tools_table.rs#L684) rows around 684–715 advertise `GetSceneItemPrivateSettings`, `SetSceneItemPrivateSettings`, `GetSourcePrivateSettings`, and `SetSourcePrivateSettings`, none present in the pinned official protocol. This is the same kind of catalog defect for which Roy's nonexistent transition getter receives G2 F. JLFN's ordinary all-tool test mock accepts such names optimistically. | Polyglot owner notified to execute an advertised private-setting tool and either revise G2/B reasoning or establish a specific supported extension contract. Do not equate coverage of every official name with validity of every advertised name. |
| **cdavis timeout prose lagged final evidence.** | The report described a 10s npm initialization timeout, while the final trace records a 30s initialize watchdog. | Polyglot owner notified to update the duration. Source head, npm 5.7.5, and native 5.7.2 are correctly kept distinct otherwise. |

The fixture's `synthetic_secret_surface: pass` means the configured getter was executed, **not** that no secret was returned. Inspect `returnedSyntheticSecret` and the stated raw-settings contract. Roy/Tom return the synthetic stream-key field; the local ordinary getter omits it. A deliberately selected raw settings surface is not equivalent to unsolicited credential disclosure.

## Local candidate checks

The [fresh packed local artifact trace](results/local-package/local-package-0.3.3.json) was inspected beyond its 15 raw passes:

- Scene readback contains `sceneName:Main`; mute readback contains `inputMuted:true`; recording status contains `outputActive:true`; the fixture records the corresponding mutations and a stopped final state.
- Screenshot content carries a complete 70-byte PNG, not only a signature or truncated prefix. JSON/structured content rather than native MCP image content remains a usability limitation, already stated by the local review.
- The dropped reply returns an explicit tool error. The in-flight disconnect returns an explicit error while the scene remains unchanged; it is **not** the cdavis false-success pattern.
- Reduced screenshot capabilities omit the unavailable tool. The ordinary stream-service getter omits the synthetic key. Invalid and unknown scene requests preserve meaningful errors.

No additional false-success counterexample was found in this finite core run. This is not evidence for every tool or for real OBS integration.

The [local adapter](fixture/adapters/local-package.json) enables `TOOLSETS=all` and sets a 1s configurable timeout. These are legitimate documented settings, but they must remain explicit: the observed timeout is not a claim about default latency or a performance advantage over candidates exercised at longer defaults. The local review already distinguishes default toolsets from the all-toolsets job.

The [targeted field traces](results/local-fields-runtime.json) support the local review's three pre-dispatch locator rejections and nested-settings restrictions. `get_source_filter` explicitly returns `rawSettingsDeferred:true` and name/type summaries. A deliberate disclosed summary or a rejected unsupported input should not be described as a falsely successful full-fidelity read/write. Conversely, those policies still limit fitness/changeability and do not establish parity with implementations preserving arbitrary nested settings. The report correctly distinguishes these limitations from default MCP behavior annotations, which are absent.

## Fixture scope and remaining limits

The [runner](fixture/runner.mjs) is useful external execution evidence, but its result envelope predicate is shallow. It does not normalize arbitrary code-mode application results. Its scene/mute value search is also not a general identity oracle: a matching field somewhere in a complex response does not prove the value belongs to the requested entity. No additional affected final core conclusion was identified in the local/polyglot traces inspected here.

The fake validates request **names**, selected fields, and selected state transitions; it does not implement every schema in the official protocol. It ignores batch opcodes and does not provide the complete event/state machine needed to verify event-confirmed workflows, batch atomicity, rendering, capture devices, or remote filesystem behavior. UUID/canvas traces that include both name and UUID prove forwarding, not ambiguity resolution or UUID-only correctness. Reports should preserve the distinction between these executed facts and source-derived architectural strengths.

The screenshot parser verifies framing, CRCs, IEND and an inflating IDAT stream. The fixture-generated PNG is valid; this finite check is not a full PNG conformance suite or a real screenshot rendering test. File-image alternatives genuinely meet the frozen job when the returned path is accessible, with their same-host filesystem assumption stated. Roy's saved-file alternative and Tom's generic request therefore support G5 without repairing their defective named screenshot tool.

## Reproducibility and evidence integrity

At this audit, all final JSON records declaring fixture `2026-09-13.5` matched the current four fixture source hashes:

| File | SHA-256 |
|---|---|
| `runner.mjs` | `f94f2a5dadeb1e6f6dc10f5aedbdf7dda01aa84cacb28bf8050413f74c4963bf` |
| `fake-obs.mjs` | `6c87648ea0ade612e75d60a349a827f9ed422bab3454f81f1d52f8dd17bcef75` |
| `mcp-process.mjs` | `0dc1a6d6549546548ff11774f882e95700a230d9df6ad91b650137d1fae43b88` |
| `msgpack.mjs` | `3c0ed11c94b3df67733d548a8be08d672e29b2b3480d240af9ca07fc7c0fb227` |

Earlier fixture-v4/obsolete traces are explicitly retained and should not be used for final scoring. Source hashes, not the label alone, are the appropriate comparison because calibration changed implementation during the study.

The fixture currently imports `ws` from the enclosing installed repository. Reproduction therefore needs Node and the repository's installed dependencies, not merely copied `.mjs` files. Many adapters contain ephemeral absolute checkout/binary paths. The final guide should state the prerequisite dependency installation, retrieval of each pinned commit or exact attributable artifact, build/install commands, and replacement of adapter launch paths. A runner invocation alone is insufficient on a fresh machine. Candidate source/package identity is generally well documented; cdavis's alternate native G5 pass must not be assigned silently to its non-initializing npm artifact.

Extended scripts and reports are separately useful evidence; where they lack embedded fixture source hashes, tie them to their pinned candidate review and the fixture revision explicitly rather than pretending they are interchangeable common-run results.

## Resolution check

The owners' final revisions were inspected after the findings above:

- **JLFN:** the 11s-margin rerun demonstrates the 10s bounded error, so G4 is now P. The focused private-setting invocation emits the nonstandard request and receives204; the report now assigns G2 F and B2. Its `Sleep` discussion now correctly says the official operation is batch-only. [Focused evidence](results/jlfn-private-fixture/jlfn-private.json).
- **cdavis:** the npm initialize duration now matches30s. Native5.7.2 false-success findings are explicitly separated from unexecuted current head, whose dispatch rejects errors; the source B rating was revised to2 without claiming a current-head runtime pass. These are appropriate attribution corrections.
- **Takurot:** the final G4 p rationale explicitly identifies fault probes that never reached OBS as NT, rather than claiming recovered requests. This resolves the oracle-versus-review finding.
- **Local:** this reviewer subsequently assigned the requested independent ratings in [local.json](candidates/local.json) and appended the rationale to [local.md](candidates/local.md): A4/B2/C3/D4/E3/F3, **80/100**, G1–G5 P and G6 p for stale architecture documentation. Scores are supported by responsibility/lifecycle evidence, not test-count/coverage points, and do not assert a universal winner.

Remaining fixture oracle limitations are documented above rather than silently rewritten in historical evidence. Final synthesis should rely on these adjudicated gates, with the raw traces available for independent inspection.

Final follow-up checks:

- JLFN G6 F is now anchored to its observed unusable advertised private-settings operation, not SDK metadata alone. Default framework identity by itself is partial, consistent with ITchris G6 p. This resolves the metadata-only inconsistency without overlooking a separate broken capability.
- Roy's published run and Tom's generic-image run are now included in their JSON evidence lists. The local evidence list includes packaging logs, the field audit, and publication metadata.
- [Local publication verification](results/local-publication.json) establishes that the executed locally packed tarball's SHA-1 **and** SHA-512 match the owning registry's distribution metadata, with matching gitHead. The review now describes identical published artifact bytes precisely while retaining that installation used the local tarball, not a separately performed registry download/install.
- The main README's demonstrated local gaps and ordered recommendations were checked against the field/runtime evidence. Its native-image comparison is supported by ITchris's actual `type:image` result. Tom's MCPB strength remains source/manifest evidence rather than a completed desktop-package installation; the main text appropriately does not claim that stronger result. Local license provenance now says MIT declared in metadata, with no standalone LICENSE file, and the review's obsolete future-tense scoring sentence was removed.

## Late-census independent check

The four added direct candidates were checked against the same frozen gates and rating anchors; no additional candidate run was needed to identify the following distinctions.

- **Umar:** the actual toggle operation sends one `ToggleInputMute`, internally reads `GetInputMute`, and returns `muted:true`, matching fixture state. A separate public getter is not necessary to establish this mutation's fidelity. The owner corrected G3 to P and aligned the single-file responsibility rating to A1. Missing replies and disconnection remain observed bounded-watchdog failures, and absent screenshot capability still fails G5. Its adapter is now preserved.
- **LHenri:** `winreg` prevents startup on the Linux host and matches the explicitly Windows-only product requirement. G1–G4 NT correctly describe an environment boundary. The static absence of audio control independently prevents the general reference workflow, so G5 F is consistent with its narrower recording purpose.
- **sid-fou:** the alternate MCP 1.26 entry and nested `data.current_program_scene:Main` support the manually accepted scene result; the documented unconstrained install remains incompatible. Missing replies genuinely exceed the watchdog. The subsequent disconnection result follows an already wedged client and should not be presented as an independently isolated recovery experiment. Controller `success:false` bodies remain readable failures with incorrect MCP error metadata, distinct from a false successful mutation. The owner was asked to separate G2 protocol/identity evidence from G6 framework identity and unavailable optional canvas support.
- **DCC:** official `CallVendorRequest` reaches an unavailable vendor implementation, so NT is appropriate; no ordinary OBS request failure can substitute for this native contract. Source-head architecture and the verified published wheel are correctly attributed separately. Its exact process/plugin-instance identity, inherited deadlines, event sequence and mutation postconditions are concrete strengths. Its settings surface is nevertheless narrow: reviewed input settings allow only `width`, `height`, and `color`, and reviewed gain-filter settings only `db`; scenes remain name-based without a canvas model. The owner/root were asked to account for these same categories of limitation that constrain the local B rating, rather than exempting a custom protocol from them.

DCC test evidence needs a precise execution boundary: its standalone C++ cancellation gate really compiles and runs, while many native contracts inspect source and real-OBS acceptance workflow tests inspect YAML. The real MCP launch test is among the two environment-blocked failures; loaded-plugin/native OBS acceptance was not executed. These facts support a substantial test architecture without implying native end-to-end coverage. A prose clarification and final B-rating adjudication were requested from the owner.

All scored candidate JSON files were parsed, all six gate/rating keys and gate values validated, and every listed runtime-evidence path existed at this final check. The main synthesis's separation of architecture ranking, finite externally executed workflow evidence, and complete-job eligibility remains necessary, especially for DCC's native runtime NTs.

Late-census resolutions: DCC B was reduced to 3 (total 85) to acknowledge name-only scenes, absent canvas identity and narrow reviewed settings alongside its strong lifecycle model. Its D rationale now explicitly separates executed standalone C++ cancellation from static native/acceptance contracts and the two blocked real MCP launch tests. Root adjudicated sid-fou G2 P for its valid supported reference calls; this reviewer applied the narrow MD/JSON correction. Optional locator omissions remain scored limitations and framework identity remains a G6 issue, consistently with the local gate interpretation.

## Giancarlo direct-candidate completion

The final census correction appropriately includes Giancarlo as a direct general-control implementation despite its event-history name. Its actual trace supports G1–G5 P: scene `currentProgramScene:Main` agrees with fixture state despite the extractor's raw failure; mute readback is `muted:true`; recording status is truthful; screenshot content is a complete native MCP image; the missing reply returns `isError:true` at the documented 15-second bound; and disconnect returns an explicit error with the mutation unapplied. This is not the cdavis false-success pattern.

The owner was asked to remove absence of a warning on its explicitly selected `obs_raw` stream-settings result as a gate penalty. The frozen method accepts opt-in raw settings according to their stated contract, and no redaction promise was established. Source-derived unconditional protocol-version echo and incomplete local schema enforcement can support G6 p, but must be identified as source evidence rather than an executed unsupported-version counterexample. The executed initializer requested and received `2024-11-05`; it did not exercise an unknown version.

Giancarlo and local therefore share the G1–G5 P/G6 p gate pattern. Local's stronger architecture/authored-test evidence does not make it the only candidate completing the finite executed reference job. The main synthesis must preserve that distinction.

## Final BEA and census resolution

A second reviewer audited the census owner's [BEA record](candidates/bea.md), independently preserved a successful frozen install/build and 36 tests, and rechecked source-artifact hashes and publication identity. The local HTTP MCP entry works independently of the native dock. G2–G4 remain NT because the shared stdio OBS fixture did not exercise this HTTP path; **G5 is F**, because screenshot retrieval is absent from source and the observed listing. An unexecuted fixture cannot turn a known missing required capability into NT. G6 is partial for the observed version attribution discrepancy, with broader fault/secret probes unexecuted. Final score 68.75 is unchanged. [Build/test log](results/bea-own-tests.log), [HTTP evidence](results/bea-http.json), [publication](results/bea-publication.json).

Giancarlo and BEA were both moved into the direct comparison once source review established independent OBS control surfaces. The final comparison includes every direct implementation among the six late discoveries. MoltStream's initial leaf-only build was also corrected: the [dependency-inclusive build](results/molt-dependency-build.json) fails on inherited TypeScript source exclusions, rather than proving that the unbuilt workspace dependency itself is defective.
