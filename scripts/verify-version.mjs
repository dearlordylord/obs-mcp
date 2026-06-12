#!/usr/bin/env node

import { readFileSync } from "node:fs"
import { join } from "node:path"

const packageJson = JSON.parse(readFileSync(join(process.cwd(), "package.json"), "utf-8"))
const version = packageJson.version

if (typeof version !== "string" || version.length === 0) {
  throw new Error("package.json version must be a non-empty string")
}

const bundle = readFileSync(join(process.cwd(), "dist/index.cjs"), "utf-8")

if (!bundle.includes(`"${version}"`)) {
  throw new Error(`dist version mismatch: expected ${version}`)
}

console.log(`dist bundle contains package version ${version}`)
