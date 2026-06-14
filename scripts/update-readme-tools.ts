import { readFileSync, writeFileSync } from "node:fs"
import { join } from "node:path"

import { allTools } from "../src/mcp/tools/registry.js"
import type { ToolCategory, ToolDefinition } from "../src/mcp/tools/registry.js"

const checkMode = process.argv.includes("--check")
const readmePath = join(process.cwd(), "README.md")
const startMarker = "<!-- tools:start -->"
const endMarker = "<!-- tools:end -->"

const categoryTitles: Record<ToolCategory, string> = {
  admin_raw: "Administrative Raw",
  batch: "Batch",
  canvases: "Canvases",
  config: "Configuration",
  events: "Events",
  filters: "Filters",
  general: "General",
  inputs: "Inputs",
  outputs: "Outputs",
  record: "Recording",
  scenes: "Scenes",
  screenshots: "Screenshots",
  stream: "Streaming",
  transitions: "Transitions",
  ui: "OBS UI",
  vendor: "Vendor and Custom Events"
}

const escapeMarkdownTableCell = (value: string): string =>
  value.replaceAll("|", "\\|").replaceAll(/\s+/g, " ").trim()

const toolsByCategory = allTools.reduce((groups, tool) => {
  const existing = groups.get(tool.category) ?? []
  groups.set(tool.category, [...existing, tool])
  return groups
}, new Map<ToolCategory, ReadonlyArray<ToolDefinition>>())

const categoryOrder = Array.from(toolsByCategory.keys())
const toolsetList = categoryOrder.map((category) => `\`${category}\``).join(", ")
const toolSections = categoryOrder.map((category) => {
  const rows = (toolsByCategory.get(category) ?? [])
    .map((tool) => `| \`${tool.name}\` | ${escapeMarkdownTableCell(tool.description)} |`)
    .join("\n")
  return [
    `### ${categoryTitles[category]}`,
    "",
    "| Tool | Description |",
    "|------|-------------|",
    rows
  ].join("\n")
}).join("\n\n")

const generatedTools = [
  "## Available Tools",
  "",
  "<!-- AUTO-GENERATED from src/mcp/tools/ descriptions. Do not edit manually. Run `pnpm update-readme` to regenerate. -->",
  "",
  `**\`TOOLSETS\` categories:** ${toolsetList}`,
  "",
  toolSections
].join("\n")
const replacement = `${startMarker}\n${generatedTools}\n${endMarker}`
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
