import { readFileSync, writeFileSync } from "node:fs"
import { join } from "node:path"

import { allTools } from "../src/mcp/tools/registry.js"

const checkMode = process.argv.includes("--check")
const readmePath = join(process.cwd(), "README.md")
const startMarker = "<!-- tools:start -->"
const endMarker = "<!-- tools:end -->"

const toolList = allTools.map((tool) => `- \`${tool.name}\``).join("\n")
const replacement = `${startMarker}\n${toolList}\n${endMarker}`
const current = readFileSync(readmePath, "utf-8")
const pattern = new RegExp(`${startMarker}[\\s\\S]*?${endMarker}`)

if (!pattern.test(current)) {
  throw new Error("README.md is missing tools markers")
}

const updated = current.replace(pattern, replacement)

if (updated === current) {
  console.log("README tool list is in sync")
  process.exit(0)
}

if (checkMode) {
  console.error("README tool list is out of sync. Run `pnpm update-readme`.")
  process.exit(1)
}

writeFileSync(readmePath, updated, "utf-8")
console.log("Updated README tool list")
