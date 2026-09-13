# Reproducing the OBS MCP comparative study

Observed environment: Linux arm64 on 2026-09-13. The benchmark uses a mock OBS WebSocket endpoint and real candidate MCP processes. It does not require or launch OBS. The [frozen methodology](methodology.md), [fixture contract](fixture/README.md), and [evidence manifest](results/evidence-manifest.json) define the evaluation boundary.

The checked-in adapters are evidence of the exact recorded launches. Their `/tmp/obs-*` paths are session-specific and are not durable install locations. Rebuild or reinstall a pinned artifact, create a substituted adapter with `prepare-adapter.mjs`, and run that copy. Do not edit the recorded adapter when reproducing evidence.

## Common prerequisites

Run commands from this repository unless a candidate row says to run inside its checkout. The fixture requires Node.js and resolves `ws` from this repository's installed dependencies. The observed local versions were Node 24.20.0, npm 11.19.0, and pnpm 10.29.3. Restore the fixture dependency with the repository's pinned package manager before running:

```sh
pnpm install --frozen-lockfile --ignore-scripts
node plans/obs-comparative-study-2026-09-13/fixture/selftest.mjs
```

Candidate-specific observed runtimes were Python 3.11.2 with uv 0.11.3, Rust/Cargo 1.94.0, Go 1.25.5, and .NET SDK 10.0.401. Project minima may be lower; these exact versions describe the executed environment. Sbroenne is a Windows-targeted product. Its source-built managed DLL ran under the Linux .NET runtime for protocol testing, while its Windows x64 release was environmental NT on this host.

For a source candidate, first make an isolated checkout and verify the exact commit recorded in `candidates/<id>.json`:

```sh
git clone --filter=blob:none REPOSITORY_URL CANDIDATE_ROOT
git -C CANDIDATE_ROOT checkout --detach FULL_COMMIT_SHA
git -C CANDIDATE_ROOT rev-parse HEAD
```

The last output must equal the full recorded SHA. Do not substitute a branch, tag, or current registry release for that source snapshot.

## Observed preparation commands

These commands were actually exercised. Replace `CANDIDATE_ROOT`, `ARTIFACT_ROOT`, and toolchain paths with isolated absolute paths. The candidate reports linked in the last column contain result interpretation and platform qualifications.

| Candidate/artifact | Pinned preparation or install | Runnable entry used by its adapter | Evidence |
|---|---|---|---|
| Aaron source `599b382…` | In the checkout: `uv run --extra dev pytest -q` | `CANDIDATE_ROOT/.venv/bin/obs-studio-mcp` | [report](candidates/aaron.md), [tests](results/aaron-own-tests.log) |
| Aaron PyPI `0.5.1` | Create an isolated venv, then install `obs-studio-mcp==0.5.1`; the observed wheel SHA-256 is recorded below. | `ARTIFACT_ROOT/venv/bin/obs-studio-mcp` | [report](candidates/aaron.md) |
| Agentic source `89fcf6c…` | `go test ./...`; `go build -trimpath -o agentic-obs .` | `CANDIDATE_ROOT/agentic-obs` | [report](candidates/agentic.md), [commands](results/polyglot-own-tests.log) |
| BEA source `d1909bd…` | `pnpm install --frozen-lockfile --ignore-scripts`; `pnpm test` (36 tests after the TypeScript build). Requires Node 20+; observed with Node 24.20.0. | `node dist/server.js` with a synthetic 32-byte bearer token; Streamable HTTP on loopback, not the stdio fixture | [report](candidates/bea.md), [HTTP evidence](results/bea-http.json) |
| cdavis npm `5.7.5` | `npm install --ignore-scripts --no-audit --no-fund @unngh/obs-mcp@5.7.5` in an empty artifact directory | `node node_modules/@unngh/obs-mcp/bin/obs-mcp-server.js` from that directory | [report](candidates/cdavis.md), [commands](results/polyglot-own-tests.log) |
| cdavis native `5.7.2` | Download the exact `obs-mcp-linux-arm64` release asset and verify the SHA-256 below. | downloaded executable | [report](candidates/cdavis.md), [publication](results/polyglot-publication.json) |
| DCC source `b30dd8f…` | `uv sync --extra dev` was blocked by the unavailable Linux arm64 `dcc-mcp-server`; alternate source checks used a no-dependency editable install, `dcc-mcp-core==0.20.29`, explicit test dependencies, `pytest -q`, Ruff, and `uv build`. | No complete entry was available: the sidecar also requires the native OBS plugin and DCC server. | [report](candidates/dcc.md), [commands](results/dcc-own-tests.log) |
| DCC PyPI `1.4.0` | Download the exact wheel, verify its SHA-256 below, and install it without the unavailable platform dependency in an isolated venv. This alternate only established the version entry; full runtime remained platform/plugin NT. | `ARTIFACT_ROOT/venv/bin/dcc-mcp-obs` | [report](candidates/dcc.md), [publication](results/dcc-publication.json) |
| Giancarlo source `882c3c1…` | No install or build is required. With Node 24.20.0 (package minimum 22), run `npm run preflight`; it passed and loaded 44 module tools. | `node server.js` in the checkout | [report](candidates/giancarlo.md), [preflight](results/giancarlo-source-check.log) |
| ITchris source `05f00ba…` | `cargo build --locked -p obs-studio-mcp-server`; tests: `cargo test --locked`, then `cargo test --locked -p obs-studio-mcp-core -p obs-studio-mcp-obs` | `CANDIDATE_ROOT/target/debug/obs-studio-mcp`; adapter creates a study-local TOML before exec | [report](candidates/itchris.md), [build](results/itchris-build.log), [tests](results/itchris-core-obs-tests.log) |
| JLFN source `f9dccf0…` | `cargo test --all-targets --locked`; explicit entry build: `cargo build --locked --bin obs-mcp` | `CANDIDATE_ROOT/target/debug/obs-mcp` | [report](candidates/jlfn.md), [commands](results/polyglot-own-tests.log) |
| Lars source `8025f2c…` | `npm ci --ignore-scripts`; there is no build or authored test suite. | `node obs-mcp-server.js` in the checkout | [report](candidates/lars.md), [install](results/lars-install.log) |
| LHenri source `ca71103…` | With Python 3.13.12/uv 0.11.3: `uv venv --python 3.13 .venv`; `uv pip install --python .venv/bin/python -e .`; `uv build --wheel --out-dir ARTIFACT_ROOT`; `python3 -m compileall -q src`. | `CANDIDATE_ROOT/.venv/bin/obs-mcp`; startup is Windows-only and stopped at `winreg` on this host. | [report](candidates/lhenri.md), [install](results/lhenri-install.log), [build](results/lhenri-build.log) |
| Royshil source `314e7c0…` | `npm ci --ignore-scripts`; `npm run build`; `npm run test` | `node build/index.js` in the checkout | [report](candidates/royshil.md), [install](results/royshil-install.log) |
| Royshil npm `obs-mcp@1.1.0` | Obtain the registry tarball, verify SHA-1 below, extract it, then run `npm install --omit=dev --ignore-scripts` in the extracted package. | `node build/index.js` in the extracted package | [report](candidates/royshil.md), [install](results/royshil-published-install.log) |
| Sidfou source `60f14e6…` | With Python 3.13.12/uv 0.11.3: create `.venv`, install editable source, and build the wheel. The declared range selects incompatible MCP 2.2.0; the executed alternate then installed `mcp==1.26.0`. | `CANDIDATE_ROOT/.venv/bin/obs-stream-mcp --no-sse` after the explicit MCP 1.26 deviation | [report](candidates/sidfou.md), [declared install](results/sidfou-install.log), [deviation](results/sidfou-mcp1-install.log) |
| Sbroenne source `9635425…` | With .NET 10.0.401: `dotnet test ObsMcp.sln -p:EnableWindowsTargeting=true --configuration Release` | `dotnet CANDIDATE_ROOT/src/ObsMcp.McpServer/bin/Release/net10.0-windows/Sbroenne.ObsMcp.McpServer.dll` | [report](candidates/sbroenne.md), [commands](results/polyglot-own-tests.log) |
| Takurot source `3682378…` | `npm ci --ignore-scripts`; `npm test`; `npm run build` (Node 24.20.0, npm 11.19.0, TypeScript 5.9.3) | `node CANDIDATE_ROOT/dist/index.js` | [report](candidates/takurot.md), [tests](results/takurot-own-tests.log) |
| Takurot npm `0.1.0` | `npm install --prefix ARTIFACT_ROOT --ignore-scripts obs-showrunner-mcp@0.1.0` | `ARTIFACT_ROOT/node_modules/.bin/obs-showrunner-mcp` | [report](candidates/takurot.md) |
| Tom source `df584dd…` | `npm ci --ignore-scripts`; `npm run build`; `npm run test`; `npm run validate:manifest` | `node build/index.js` in the checkout | [report](candidates/tom.md), [build](results/tom-build.log) |
| xDark source `d632587…` | `uv run --extra dev pytest -q` | `CANDIDATE_ROOT/.venv/bin/obs-mcp` | [report](candidates/xdark.md), [tests](results/xdark-own-tests.log) |
| xDark PyPI `0.2.0` | `uv venv ARTIFACT_ROOT/venv`; `uv pip install --python ARTIFACT_ROOT/venv/bin/python obs-mcp==0.2.0` | `ARTIFACT_ROOT/venv/bin/obs-mcp` | [report](candidates/xdark.md) |
| YSHK source `643e664…` | `pnpm install --frozen-lockfile --ignore-scripts --force`; `npm run build` | `node build/index.js` in the checkout | [report](candidates/yshk.md), [locked install](results/yshk-pnpm-install.log) |
| Umar source `37f3e7a…` | `npm install --ignore-scripts --no-audit --no-fund`; `npm run build` | `node dist/index.js` in the checkout | [report](candidates/umar.md), [fixture result](results/umar-fixture/umar.json) |
| Local source `587e356…` | `pnpm build`; `npm pack --ignore-scripts --pack-destination ARTIFACT_ROOT`; install the resulting tarball into an empty consumer with lifecycle scripts disabled. | `ARTIFACT_ROOT/consumer/node_modules/@firfi/obs-mcp/dist/index.cjs` | [report](candidates/local.md), [exact commands](results/local-package-entry.json) |

The Python artifact reports document the observed install result but do not preserve the complete venv-creation command for Aaron. Use the package's documented `uvx obs-studio-mcp==0.5.1` for ordinary use; to reproduce the checked-in adapter, create a venv and install that exact version, then point the adapter at its console script. This is an explicit reconstruction boundary rather than a claim that an unrecorded command was executed.

## Preparing a durable adapter

Create a JSON mapping from every recorded session-local prefix in the selected adapter to your rebuilt absolute location. File-output paths can be redirected to the runner's isolated `{{tempDir}}` template. Longer source strings are replaced first.

```json
{
  "replacements": {
    "/tmp/obs-study-ts/lars/.study-home/fixture.png": "{{tempDir}}/lars.png",
    "/tmp/obs-study-ts/lars": "/absolute/checkouts/lars"
  },
  "literalReplacements": {}
}
```

Then generate a new adapter. The tool refuses to overwrite an existing output, rejects unused mappings, and rejects any remaining `/tmp/obs-*` launch path.

```sh
node plans/obs-comparative-study-2026-09-13/prepare-adapter.mjs \
  --adapter plans/obs-comparative-study-2026-09-13/adapters/lars.json \
  --mapping /absolute/replacements/lars.json \
  --output /absolute/prepared-adapters/lars.json

node plans/obs-comparative-study-2026-09-13/fixture/runner.mjs \
  --adapter /absolute/prepared-adapters/lars.json \
  --output /absolute/new-results/lars
```

Common recorded roots to replace are listed in [the evidence manifest](results/evidence-manifest.json) under `adapters[].sessionLocalPaths` and `adapters[].recordedLaunch`. Some adapters need more than one replacement:

- Sbroenne needs the recorded .NET executable path, source checkout prefix, and screenshot file replaced; use `{{tempDir}}/sbroenne.png` for the screenshot.
- ITchris embeds its checkout in `cwd`, environment, and a shell command; one checkout-prefix replacement covers all three.
- Agentic embeds both its executable and initialized database/HOME paths. Replacing the recorded candidate prefix intentionally relocates both. A genuinely clean first-run adapter produces the separate clean-start evidence described in its report.
- Lars and YSHK include recorded screenshot paths. Map those full paths to `{{tempDir}}/<candidate>.png` in addition to relocating the checkout.
- A direct executable adapter such as cdavis-native maps the whole recorded executable filename to the verified downloaded file.
- Local-package, Aaron/xdark published, and Takurot-published adapters map their entire recorded artifact root to the new install root.
- DCC also binds an exact host PID. After starting the harmless process required by its report, map the adapter's recorded PID to the new decimal PID with `literalReplacements`. This only reconstructs the launch; the native OBS plugin and platform-specific DCC server remain required for a complete entry.
- Umar's durable adapter is checked in. Relocate its recorded checkout prefix in the same way as the other source-built Node adapters.

The prepared adapter still uses only synthetic loopback OBS values supplied by the runner. Inspect it before execution. Do not add real credentials or inherit a workspace `.env`.

## Artifact identity and integrity

Source and published artifacts are distinct unless the candidate report proves equivalence. The following independently recorded identities must be checked before reusing publication results:

| Artifact | Verified identity/integrity | Relationship to evaluated source |
|---|---|---|
| Aaron PyPI `obs-studio-mcp==0.5.1` | wheel SHA-256 `5cc0c972654e3a3317d150083b2edd8ee5100cdd99673899d834a9f914b5f2a9` | release tag resolves to evaluated source SHA |
| Agentic Go module | `v0.0.0-20260418210912-89fcf6c68675`, sum `h1:NKvJ1k+NLKWPiXBrxZWrR4nFXlXh0LfcwPUQJkaNb+s=` | origin hash equals evaluated source; no maintainer-cut release |
| BEA source build `1.6.0` | `dist/server.js` SHA-256 `20d46a1c992961fcbac98e972ccd21cdcd42a3e1df39f664afde3d5d2415e277`; `dist/bootstrap.js` SHA-256 `2d30fec73f8de8634d29f24b1229a60883f246a8a99d539ff7371be99be51a9f` | no verified public artifact; digests identify the pinned source build, whose package, MCP, and plugin versions disagree |
| cdavis npm `@unngh/obs-mcp@5.7.5` | integrity `sha512-MSlq2w4gdC0e3cS6F3gmG1FusNu1U0QdbesBRAjx1GUnccw4bhLWRVr1ERbUb3kJjm9H5n4JUO9dT8EVHaglcQ==`; gitHead `831a4a2…` | differs from evaluated source head `1d95b29…` |
| cdavis native `v5.7.2` arm64 | SHA-256 `f6336c7427e5f1ed1a3b93c34864880d3e543970989aca17839c12efa2d7aeca` | older, separate artifact; its runtime results cannot establish npm 5.7.5 behavior |
| DCC PyPI `dcc-mcp-obs==1.4.0` | wheel SHA-256 `31afb647da5c999147fd6629e8abb5a2020b30519a1fc68d39fb5c134bdbbddb`; trusted-publisher source commit `4ae80d4…` | evaluated source head is materially later while still declaring 1.4.0; publication execution applies only to the tagged artifact |
| Giancarlo source `0.1.0` | pinned Git commit `882c3c1c0e490bb8aa6e2f3487f6aa817a1521bb`; no install/build output or public package exists | fixture executed `server.js` directly from the pinned checkout |
| JLFN crate `0.2.0` | publisher JLFN; tag `v0.2.0` at `de5bdb0…` | evaluated head is two later commits; fixture used a source build |
| Lars npm `obs-mcp-server@1.0.0` | registry tarball SHA-1 `7b234be17e0b427ef480ad60e47f9447707f2357` | source version agrees; fixture executed source, not the tarball |
| LHenri source wheel `0.1.0` | study-built SHA-256 `2e60b956d7513f31820c81caf016d7fb909d3902065d58e7de14ccf046a160c4` | no attributable public package; this digest only identifies the isolated source build |
| Royshil npm `obs-mcp@1.1.0` | tarball SHA-1 `04bc7b4fb43cfacc6ecc84f9969b23e322c8a6dd` | differs behaviorally from source `1.0.1`; see the recorded file comparison |
| Sidfou source wheel `0.1.0` | study-built SHA-256 `5799e0cadd65a92feb888857bfcf245f918e80cc8e823f67e29c6886e0ea7a6c` | no attributable public package; the runnable fixture entry also required the recorded MCP 1.26 dependency deviation |
| Sbroenne release `mcp-v1.0.4` | Windows zip SHA-256 `fa9ed3ad7015436ebd0173b10d99b8f121190d2505524f4389b89a9ec740d6dd` | release commit `7b4c64c…`; fixture used managed DLL built from later evaluated source |
| Takurot npm `0.1.0` | integrity `sha512-ISvLt4YFedXrv2GmRvlEOQUFRc76mRVJdldOkYci7bmSjDFP16LL2N1VhMQkdM1aCkvCu6uRJZnwOkrPFR0UdQ==` | tag/current evaluated source agree |
| Umar source build `1.0.0` | compiled `dist/index.js` SHA-256 `8d2f92b662fc7b7922bcc6bf7529855453f65bf67b283c64a1164c86448d26a8` | no verified public package; this digest only identifies the pinned isolated source build |
| xDark PyPI `obs-mcp==0.2.0` | wheel SHA-256 `6e1030ec5036c64fc0c4a4ec376916aee85fcf221f3543050362aa81cf1e2b60` | tag `ae557d1…`; source code later unchanged, but published dependency bound differs and the fresh artifact did not start |
| Local/registry `@firfi/obs-mcp@0.3.3` | locally packed tarball SHA-256 `7847ea6f0a7be26df56b47b5c3021963fde5933bdca9a2c7bcf8e07b18e87b2d`; its SHA-1 `5fb7d20c6267deb820434719499a39c9812af784` and SHA-512 integrity match registry metadata | built from evaluated commit `587e356…`, matching registry gitHead; fixture installed the local tarball, not a separate registry download |

Primary provenance records are [polyglot publication metadata](results/polyglot-publication.json), [Royshil/npm metadata](results/royshil-publication.json), [Royshil source/package comparison](results/royshil-source-package-diff.json), [local registry metadata](results/local-publication.json), [local package metadata](results/local-package-entry.json), and candidate reports. Where no independently executed publication appears here, reproduce the pinned source result only.

## Evidence selection and integrity checks

Regenerate the evidence manifest after any report or result changes:

```sh
node plans/obs-comparative-study-2026-09-13/generate-evidence-manifest.mjs
```

`candidates/*.json` `runtimeEvidence` arrays are authoritative for active candidate evidence. The manifest hashes active evidence, candidate records, adapters, publication records, and fixture sources; verifies local Markdown links; reports missing active files; and identifies adapters containing session-local paths.

Files named `*-initial-harness-obsolete.json` and `*-fixture-v4.json` are retained history and excluded from final verdicts. They capture known harness defects such as invalid PNG data, JSON-only OBS framing, or earlier extraction behavior. Do not combine them with fixture `2026-09-13.5` common results. Specialized files without a fixture version can remain active when the candidate record explicitly cites them for a separate question, such as Agentic's clean-first-run or HTTP screenshot probe.

All final common fixture results must report fixture version `2026-09-13.5` and these source SHA-256 values:

```text
runner.mjs       f94f2a5dadeb1e6f6dc10f5aedbdf7dda01aa84cacb28bf8050413f74c4963bf
fake-obs.mjs     6c87648ea0ade612e75d60a349a827f9ed422bab3454f81f1d52f8dd17bcef75
mcp-process.mjs  0dc1a6d6549546548ff11774f882e95700a230d9df6ad91b650137d1fae43b88
msgpack.mjs      3c0ed11c94b3df67733d548a8be08d672e29b2b3480d240af9ca07fc7c0fb227
```

The runner's raw `pass` is an assertion result, not the final gate verdict. Review the MCP result and final fixture state together. In particular, cdavis-native's disconnect probe returned a success-shaped result while the intended scene remained `Main`; the candidate report correctly adjudicates that as false success and G4 failure even though the generic bounded-outcome probe is raw-pass. Human-readable result formats also required report-level correction when a key-name extractor could not recognize an otherwise explicit readback.

No mocked result establishes rendering, codecs, devices, platform capture, live streaming, or real OBS performance. A successful reproduction should preserve that limitation rather than describing the loopback fixture as real OBS integration.
