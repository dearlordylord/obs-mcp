#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises"
import { dirname, resolve } from "node:path"

const usage = `Usage:
  node prepare-adapter.mjs --adapter INPUT.json --mapping replacements.json --output OUTPUT.json

Mapping file:
  {
    "replacements":{"/recorded/session/root":"/absolute/rebuilt/root"},
    "literalReplacements":{"RECORDED_PROCESS_ID":"CURRENT_PROCESS_ID"}
  }`

const parseArgs = (argv) => {
  const parsed = {}
  for (let index = 0; index < argv.length; index += 2) {
    const key = argv[index]
    const value = argv[index + 1]
    if (!value) throw new Error(usage)
    if (key === "--adapter") parsed.adapter = value
    else if (key === "--mapping") parsed.mapping = value
    else if (key === "--output") parsed.output = value
    else throw new Error(`Unknown argument ${key}\n${usage}`)
  }
  if (!parsed.adapter || !parsed.mapping || !parsed.output) throw new Error(usage)
  return parsed
}

const replace = (value, replacements) => {
  if (typeof value === "string") {
    let output = value
    for (const [from, to] of replacements) output = output.split(from).join(to)
    return output
  }
  if (Array.isArray(value)) return value.map((entry) => replace(entry, replacements))
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, replace(entry, replacements)]))
  }
  return value
}

const main = async () => {
  const args = parseArgs(process.argv.slice(2))
  const adapter = JSON.parse(await readFile(resolve(args.adapter), "utf8"))
  const mapping = JSON.parse(await readFile(resolve(args.mapping), "utf8"))
  if (mapping === null || typeof mapping.replacements !== "object" || Array.isArray(mapping.replacements)) {
    throw new Error("mapping.replacements must be an object of recorded literal path to replacement path")
  }
  if (mapping.literalReplacements !== undefined &&
      (mapping.literalReplacements === null || typeof mapping.literalReplacements !== "object" || Array.isArray(mapping.literalReplacements))) {
    throw new Error("mapping.literalReplacements must be an object when provided")
  }
  const pathReplacements = Object.entries(mapping.replacements)
  const literalReplacements = Object.entries(mapping.literalReplacements ?? {})
  const replacements = [...pathReplacements, ...literalReplacements].sort(([left], [right]) => right.length - left.length)
  if (replacements.length === 0) throw new Error("mapping.replacements must not be empty")
  for (const [from, to] of pathReplacements) {
    if (!from.startsWith("/")) throw new Error(`replacement source must be an absolute recorded path: ${from}`)
    if (typeof to !== "string" || (!to.startsWith("/") && !to.startsWith("{{tempDir}}") && !to.startsWith("{{home}}"))) {
      throw new Error(`replacement target must be absolute or start with {{tempDir}}/{{home}}: ${to}`)
    }
  }
  for (const [from, to] of literalReplacements) {
    if (from.length === 0 || typeof to !== "string" || to.length === 0) {
      throw new Error("literal replacement sources and targets must be non-empty strings")
    }
  }
  const sourceText = JSON.stringify(adapter)
  const unused = replacements.map(([from]) => from).filter((from) => !sourceText.includes(from))
  if (unused.length > 0) throw new Error(`mapping source not present in adapter: ${unused.join(", ")}`)
  const prepared = replace(adapter, replacements)
  const remainingSessionPaths = [...new Set(JSON.stringify(prepared).match(/\/tmp\/obs-[^"\\ ]*/g) ?? [])]
  if (remainingSessionPaths.length > 0) {
    throw new Error(`prepared adapter still contains recorded /tmp paths: ${remainingSessionPaths.join(", ")}`)
  }
  const output = resolve(args.output)
  await mkdir(dirname(output), { recursive: true })
  await writeFile(output, `${JSON.stringify(prepared, null, 2)}\n`, { flag: "wx" })
  process.stdout.write(`${JSON.stringify({ adapter: adapter.id, output, replacements: replacements.length })}\n`)
}

main().catch((error) => {
  process.stderr.write(`${error.message}\n`)
  process.exitCode = 1
})
