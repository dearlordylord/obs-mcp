# npm Publish Runbook for 0.2.0

Status: ready to publish after npm authentication.

## Current State

- `master` is synced with `origin/master`.
- Package version is `0.2.0` in `package.json` and `server.json`.
- GitHub CI is green for commit `6d41ce5`.
- `pnpm package-smoke` passes locally.
- `npm pack --dry-run` passes locally.
- npm registry still reports `@firfi/obs-mcp@0.1.0`.
- Local publish is blocked by npm auth: `npm whoami` returns `E401 Unauthorized`.

## Verified Tarball Contents

The `0.2.0` package includes only:

- `CHANGELOG.md`
- `dist/index.cjs`
- `INTEGRATION_TESTING.md`
- `package.json`
- `README.md`
- `server.json`

## Publish Steps

Run from a clean checkout of `master` at or after commit `6d41ce5`.

```sh
git checkout master
git pull --ff-only
git status --short --branch
pnpm install --frozen-lockfile
pnpm check-all
pnpm package-smoke
npm whoami
npm publish --access public
npm view @firfi/obs-mcp version
```

Expected final npm version:

```text
0.2.0
```

## If Publishing from CI

Use an npm automation token with publish access to `@firfi/obs-mcp`.

Required secret:

```text
NPM_TOKEN
```

Minimum release workflow shape:

```sh
pnpm install --frozen-lockfile
pnpm check-all
npm publish --access public
```

Set npm auth before publish:

```sh
npm config set //registry.npmjs.org/:_authToken "$NPM_TOKEN"
```

## Post-Publish Checks

```sh
npm view @firfi/obs-mcp version
npx -y @firfi/obs-mcp@0.2.0 --help
```

Then run the real OBS smoke when a live OBS websocket is available:

```sh
OBS_INTEGRATION_TESTS=1 OBS_WEBSOCKET_CONNECTION_TIMEOUT=1000 \
  pnpm exec vitest run --config vitest.integration.config.ts test/obs/real-obs.integration.test.ts
```

## Known Blockers

- This environment is not logged into npm.
- The real OBS integration smoke needs a reachable OBS websocket; the prior attempt failed with `ECONNREFUSED`.
