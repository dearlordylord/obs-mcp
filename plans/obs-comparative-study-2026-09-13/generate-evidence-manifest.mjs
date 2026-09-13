#!/usr/bin/env node
import { createHash } from "node:crypto"
import { readdir, readFile, stat, writeFile } from "node:fs/promises"
import { dirname, join, relative, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const studyRoot = dirname(fileURLToPath(import.meta.url))
const manifestPath = join(studyRoot, "results/evidence-manifest.json")
const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex")

const fileEvidence = async (relativePath) => {
  const absolute = join(studyRoot, relativePath)
  try {
    const bytes = await readFile(absolute)
    return { path: relativePath, bytes: bytes.length, sha256: sha256(bytes) }
  } catch (error) {
    return { path: relativePath, missing: true, error: error.code ?? error.message }
  }
}

const walkFiles = async (directory, prefix = "") => {
  const files = []
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name
    if (entry.isDirectory()) files.push(...await walkFiles(join(directory, entry.name), relativePath))
    else if (entry.isFile()) files.push(relativePath)
  }
  return files
}

const candidateFiles = (await readdir(join(studyRoot, "candidates"))).filter((name) => name.endsWith(".json")).sort()
const candidates = []
const activePaths = new Set()
for (const file of candidateFiles) {
  const record = JSON.parse(await readFile(join(studyRoot, "candidates", file), "utf8"))
  const evidence = []
  for (const path of record.runtimeEvidence ?? []) {
    activePaths.add(path)
    evidence.push(await fileEvidence(path))
  }
  candidates.push({
    id: record.id,
    source: { repository: record.repository, commit: record.commit, declaredVersion: record.version },
    candidateRecord: await fileEvidence(`candidates/${file}`),
    candidateReport: await fileEvidence(`candidates/${file.replace(/\.json$/, ".md")}`),
    activeEvidence: evidence
  })
}

const localEvidencePaths = [
  "results/local-check-all.json",
  "results/local-check-all.log",
  "results/local-package-entry.json",
  "results/local-package-entry.log",
  "results/local-package/local-package-0.3.3.json",
  "results/local-field-audit.json",
  "results/local-fields-runtime.json"
]
if (!candidates.some((candidate) => candidate.id === "local")) {
  for (const path of localEvidencePaths) activePaths.add(path)
  candidates.push({
    id: "local",
    source: {
      repository: "https://github.com/dearlordylord/obs-mcp",
      commit: "587e356b00d9269dcd124969ee36aad9635f2db8",
      declaredVersion: "0.3.3"
    },
    candidateRecord: await fileEvidence("candidates/local.md"),
    candidateReport: await fileEvidence("candidates/local.md"),
    activeEvidence: await Promise.all(localEvidencePaths.map(fileEvidence))
  })
}

const adapterFiles = (await readdir(join(studyRoot, "adapters"))).filter((name) => name.endsWith(".json")).sort()
const adapters = []
for (const file of adapterFiles) {
  const path = `adapters/${file}`
  const adapter = JSON.parse(await readFile(join(studyRoot, path), "utf8"))
  const serialized = JSON.stringify(adapter)
  const sessionLocalPaths = [...new Set(serialized.match(/\/tmp\/obs-[^"\\ ]*/g) ?? [])].sort()
  adapters.push({
    id: adapter.id,
    evidence: await fileEvidence(path),
    recordedLaunch: adapter.launch,
    sessionLocalPaths,
    containsSessionLocalPath: sessionLocalPaths.length > 0
  })
}

const obsoleteNames = (await readdir(join(studyRoot, "results")))
  .filter((name) => /initial-harness-obsolete|fixture-v4/.test(name))
  .sort()
const excludedObsoleteEvidence = await Promise.all(obsoleteNames.map((name) => fileEvidence(`results/${name}`)))

const fixtureFiles = ["runner.mjs", "fake-obs.mjs", "mcp-process.mjs", "msgpack.mjs"]
const fixtureSources = Object.fromEntries(await Promise.all(fixtureFiles.map(async (file) => {
  const evidence = await fileEvidence(`fixture/${file}`)
  return [file, evidence.sha256]
})))

const activeFixtureRuns = []
for (const path of [...activePaths].filter((path) => path.endsWith(".json")).sort()) {
  try {
    const parsed = JSON.parse(await readFile(join(studyRoot, path), "utf8"))
    if (!parsed.candidateId) continue
    const hashesMatch = parsed.fixtureSources === undefined
      ? null
      : fixtureFiles.every((file) => parsed.fixtureSources[file] === fixtureSources[file])
    activeFixtureRuns.push({
      path,
      candidateId: parsed.candidateId,
      fixtureVersion: parsed.fixtureVersion ?? null,
      fixtureSourceHashesMatchCurrent: hashesMatch,
      classification: parsed.fixtureVersion === "2026-09-13.5" && hashesMatch ? "final-common-fixture" : "specialized-or-pre-versioned-evidence"
    })
  } catch {}
}

const markdownFiles = (await walkFiles(studyRoot)).filter((path) => path.endsWith(".md")).sort()
const brokenLocalLinks = []
for (const markdownPath of markdownFiles) {
  let text
  try { text = await readFile(join(studyRoot, markdownPath), "utf8") } catch { continue }
  for (const match of text.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)) {
    const target = match[1].replace(/^<|>$/g, "").split("#")[0]
    if (!target || /^[a-z]+:/i.test(target)) continue
    const absolute = resolve(dirname(join(studyRoot, markdownPath)), decodeURIComponent(target))
    try { await stat(absolute) } catch { brokenLocalLinks.push({ markdown: markdownPath, target }) }
  }
}

const publicationPaths = (await readdir(join(studyRoot, "results")))
  .filter((name) => name.endsWith("publication.json"))
  .map((name) => `results/${name}`)
publicationPaths.push("results/royshil-source-package-diff.json", "study/releases.json")
const publicationEvidence = await Promise.all([...new Set(publicationPaths)].sort().map(fileEvidence))

const studySourcePaths = [
  "README.md",
  "methodology.md",
  "benchmark-infrastructure.md",
  "comparison-table.md",
  "independent-review.md",
  "validation-notes.md",
  "reproduction.md",
  "aggregate.mjs",
  "prepare-adapter.mjs",
  "generate-evidence-manifest.mjs",
  "study/census.md",
  "study/releases.json",
  "study/adjacent.md",
  "fixture/README.md",
  "results/official-protocol.json",
  "fixture/selftest.mjs",
  "fixture/selftest/candidate.mjs",
  "fixture/adapters/selftest.json",
  "fixture/adapters/local-package.json",
  ...fixtureFiles.map((file) => `fixture/${file}`)
]
const studySources = await Promise.all(studySourcePaths.map(fileEvidence))

const adjacentPath = "study/adjacent.md"
const adjacentText = await readFile(join(studyRoot, adjacentPath), "utf8")
const adjacentResultPaths = [...adjacentText.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)]
  .map((match) => match[1].replace(/^<|>$/g, "").split("#")[0])
  .filter((target) => target && !/^[a-z]+:/i.test(target))
  .map((target) => relative(studyRoot, resolve(dirname(join(studyRoot, adjacentPath)), decodeURIComponent(target))))
  .filter((target) => !target.startsWith("..") && target.startsWith("results/"))
const adjacentNamedResults = (await readdir(join(studyRoot, "results")))
  .filter((name) => name.startsWith("molt-") && /\.(json|log)$/.test(name))
  .map((name) => `results/${name}`)
const adjacentEvidence = await Promise.all([...new Set([...adjacentResultPaths, ...adjacentNamedResults])].sort().map(fileEvidence))

const manifest = {
  schemaVersion: 1,
  observedDate: "2026-09-13",
  authority: "candidates/*.json runtimeEvidence arrays; local fallback enumeration applies only when candidates/local.json is absent",
  fixture: { version: "2026-09-13.5", sourceSha256: fixtureSources },
  candidates,
  adapters,
  publicationEvidence,
  studySources,
  adjacentEvidence,
  activeFixtureRuns,
  excludedObsoleteEvidence,
  integrityChecks: {
    missingActiveEvidence: candidates.flatMap((candidate) => candidate.activeEvidence.filter((item) => item.missing).map((item) => ({ candidate: candidate.id, path: item.path }))),
    missingCandidateReports: candidates.filter((candidate) => candidate.candidateReport.missing).map((candidate) => candidate.id),
    versionedFixtureSourceHashIssues: activeFixtureRuns.filter((run) => run.fixtureVersion === "2026-09-13.5" && run.fixtureSourceHashesMatchCurrent !== true),
    sessionLocalAdapters: adapters.filter((adapter) => adapter.containsSessionLocalPath).map((adapter) => adapter.id),
    brokenLocalLinks
  }
}

await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`)
process.stdout.write(`${JSON.stringify({ manifestPath: relative(process.cwd(), manifestPath), candidates: candidates.length, adapters: adapters.length, activeFixtureRuns: activeFixtureRuns.length, checks: manifest.integrityChecks })}\n`)
