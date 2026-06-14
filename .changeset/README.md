# Changesets

This folder is managed by `@changesets/cli`. Use it to record release notes before publishing:

```sh
pnpm changeset
```

The local release flow consumes pending changesets, updates `package.json`, `CHANGELOG.md`, and `server.json`,
then publishes the npm package:

```sh
pnpm local-release
```
