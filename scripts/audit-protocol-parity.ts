import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"

import { allTools } from "../src/mcp/tools/registry.js"

export const OFFICIAL_PROTOCOL_URL =
  "https://raw.githubusercontent.com/obsproject/obs-websocket/master/docs/generated/protocol.json"

interface OfficialRequest {
  readonly requestType: string
}

interface OfficialEvent {
  readonly eventType: string
}

interface OfficialProtocol {
  readonly requests: ReadonlyArray<OfficialRequest>
  readonly events: ReadonlyArray<OfficialEvent>
}

export interface LocalProtocolSurface {
  readonly requestTypes: ReadonlyArray<string>
  readonly eventTypes: ReadonlyArray<string>
  readonly toolRequestTypes: ReadonlyArray<string>
}

export interface DeliberateExclusion {
  readonly name: string
  readonly reason: string
}

export interface ProtocolParityAudit {
  readonly officialRequestCount: number
  readonly localRequestCount: number
  readonly missingRequestDescriptors: ReadonlyArray<string>
  readonly extraRequestDescriptors: ReadonlyArray<string>
  readonly missingPublicRequestTools: ReadonlyArray<string>
  readonly deliberateRequestToolExclusions: ReadonlyArray<DeliberateExclusion>
  readonly officialEventCount: number
  readonly localEventCount: number
  readonly missingEventCatalogueEntries: ReadonlyArray<string>
  readonly extraEventCatalogueEntries: ReadonlyArray<string>
  readonly deliberateEventWorkflowExclusions: ReadonlyArray<DeliberateExclusion>
}

const requestSourcePath = fileURLToPath(new URL("../src/obs/requests.ts", import.meta.url))
const protocolSourcePath = fileURLToPath(new URL("../src/obs/protocol.ts", import.meta.url))

const DELIBERATE_REQUEST_TOOL_EXCLUSIONS = [
  {
    name: "Sleep",
    reason: "OBS supports Sleep only inside request batches; obs-mcp exposes it only as a schema-limited batch item."
  }
] as const

const DELIBERATE_EVENT_WORKFLOW_EXCLUSIONS = [
  {
    name: "InputVolumeMeters",
    reason: "High-volume meter stream; not useful as a default LLM-facing workflow confirmation."
  },
  {
    name: "InputActiveStateChanged",
    reason: "High-volume activity signal; direct read tools are safer unless a debounced aggregate is designed."
  },
  {
    name: "InputShowStateChanged",
    reason: "High-volume UI/showing signal; direct read tools are safer unless a debounced aggregate is designed."
  },
  {
    name: "SceneItemTransformChanged",
    reason: "High-volume transform stream; needs an opt-in aggregate/debounce design before public exposure."
  },
  {
    name: "VendorEvent",
    reason: "Plugin-defined raw payload surface; only useful with plugin-specific documentation and schemas."
  },
  {
    name: "CustomEvent",
    reason: "Arbitrary raw custom payload surface; not a general MCP workflow confirmation."
  },
  {
    name: "ExitStarted",
    reason: "Race-prone shutdown signal with weak workflow semantics for this server."
  },
  {
    name: "ScreenshotSaved",
    reason: "OBS hotkey screenshot-output event, not confirmation for obs-mcp screenshot tools."
  }
] as const

const sortedUnique = (values: Iterable<string>): ReadonlyArray<string> => Array.from(new Set(values)).sort()

const difference = (left: ReadonlyArray<string>, right: ReadonlyArray<string>): ReadonlyArray<string> => {
  const rightSet = new Set(right)
  return left.filter((value) => !rightSet.has(value)).sort()
}

const quotedStrings = (source: string): ReadonlyArray<string> =>
  Array.from(source.matchAll(/"([^"]+)"/gu), (match) => match[1] ?? "")

export const parseOfficialProtocol = (value: unknown): OfficialProtocol => {
  if (typeof value !== "object" || value === null) {
    throw new Error("Official protocol JSON must be an object")
  }
  const record = value as { readonly requests?: unknown; readonly events?: unknown }
  if (!Array.isArray(record.requests) || !Array.isArray(record.events)) {
    throw new Error("Official protocol JSON must contain requests and events arrays")
  }
  const requests = record.requests.map((entry) => {
    if (typeof entry !== "object" || entry === null || typeof (entry as { requestType?: unknown }).requestType !== "string") {
      throw new Error("Official protocol request entry is missing requestType")
    }
    return { requestType: (entry as { requestType: string }).requestType }
  })
  const events = record.events.map((entry) => {
    if (typeof entry !== "object" || entry === null || typeof (entry as { eventType?: unknown }).eventType !== "string") {
      throw new Error("Official protocol event entry is missing eventType")
    }
    return { eventType: (entry as { eventType: string }).eventType }
  })
  return { requests, events }
}

export const readLocalProtocolSurface = (): LocalProtocolSurface => {
  const requestSource = readFileSync(requestSourcePath, "utf8")
  const requestList =
    /OBS_REQUEST_TYPES = \[([\s\S]*?)\] as const/u.exec(requestSource)?.[1]
    ?? /Schema\.Literal\(([\s\S]*?)\)\nexport type ObsRequestType/u.exec(requestSource)?.[1]
  if (requestList === undefined) {
    throw new Error("Could not locate ObsRequestType literals in src/obs/requests.ts")
  }

  const protocolSource = readFileSync(protocolSourcePath, "utf8")
  const eventMap = /OFFICIAL_EVENT_SUBSCRIPTIONS = new Map<string, number>\(\[([\s\S]*?)\]\)/u.exec(protocolSource)?.[1]
  if (eventMap === undefined) {
    throw new Error("Could not locate OFFICIAL_EVENT_SUBSCRIPTIONS in src/obs/protocol.ts")
  }

  return {
    requestTypes: sortedUnique(quotedStrings(requestList)),
    eventTypes: sortedUnique(Array.from(eventMap.matchAll(/\["([^"]+)"/gu), (match) => match[1] ?? "")),
    toolRequestTypes: sortedUnique(allTools.flatMap((tool) => tool.requiredObsRequests))
  }
}

export const buildProtocolParityAudit = (
  officialProtocol: OfficialProtocol,
  localSurface: LocalProtocolSurface
): ProtocolParityAudit => {
  const officialRequests = sortedUnique(officialProtocol.requests.map((request) => request.requestType))
  const officialEvents = sortedUnique(officialProtocol.events.map((event) => event.eventType))
  const deliberateRequestToolExclusionNames = new Set<string>(
    DELIBERATE_REQUEST_TOOL_EXCLUSIONS.map((entry) => entry.name)
  )
  const missingPublicRequestTools = difference(officialRequests, localSurface.toolRequestTypes)
    .filter((requestType) => !deliberateRequestToolExclusionNames.has(requestType))

  return {
    officialRequestCount: officialRequests.length,
    localRequestCount: localSurface.requestTypes.length,
    missingRequestDescriptors: difference(officialRequests, localSurface.requestTypes),
    extraRequestDescriptors: difference(localSurface.requestTypes, officialRequests),
    missingPublicRequestTools,
    deliberateRequestToolExclusions: DELIBERATE_REQUEST_TOOL_EXCLUSIONS,
    officialEventCount: officialEvents.length,
    localEventCount: localSurface.eventTypes.length,
    missingEventCatalogueEntries: difference(officialEvents, localSurface.eventTypes),
    extraEventCatalogueEntries: difference(localSurface.eventTypes, officialEvents),
    deliberateEventWorkflowExclusions: DELIBERATE_EVENT_WORKFLOW_EXCLUSIONS
  }
}

export const auditHasFailures = (audit: ProtocolParityAudit): boolean =>
  audit.missingRequestDescriptors.length > 0
  || audit.extraRequestDescriptors.length > 0
  || audit.missingPublicRequestTools.length > 0
  || audit.missingEventCatalogueEntries.length > 0
  || audit.extraEventCatalogueEntries.length > 0

export const formatProtocolParityAudit = (audit: ProtocolParityAudit): string =>
  [
    `Official requests: ${audit.officialRequestCount}; local descriptors: ${audit.localRequestCount}`,
    `Missing request descriptors: ${audit.missingRequestDescriptors.join(", ") || "none"}`,
    `Extra request descriptors: ${audit.extraRequestDescriptors.join(", ") || "none"}`,
    `Missing public request tools: ${audit.missingPublicRequestTools.join(", ") || "none"}`,
    "Deliberate request tool exclusions:",
    ...audit.deliberateRequestToolExclusions.map((entry) => `- ${entry.name}: ${entry.reason}`),
    `Official events: ${audit.officialEventCount}; local catalogue entries: ${audit.localEventCount}`,
    `Missing event catalogue entries: ${audit.missingEventCatalogueEntries.join(", ") || "none"}`,
    `Extra event catalogue entries: ${audit.extraEventCatalogueEntries.join(", ") || "none"}`,
    "Deliberate event workflow exclusions:",
    ...audit.deliberateEventWorkflowExclusions.map((entry) => `- ${entry.name}: ${entry.reason}`)
  ].join("\n")

const fetchOfficialProtocol = async (): Promise<OfficialProtocol> => {
  const response = await fetch(OFFICIAL_PROTOCOL_URL)
  if (!response.ok) {
    throw new Error(`Failed to fetch official protocol JSON: HTTP ${String(response.status)}`)
  }
  return parseOfficialProtocol(await response.json())
}

const main = async (): Promise<void> => {
  const audit = buildProtocolParityAudit(await fetchOfficialProtocol(), readLocalProtocolSurface())
  process.stdout.write(`${formatProtocolParityAudit(audit)}\n`)
  if (process.argv.includes("--check") && auditHasFailures(audit)) {
    process.exit(1)
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error: unknown) => {
    process.stderr.write(`${String(error)}\n`)
    process.exit(1)
  })
}
