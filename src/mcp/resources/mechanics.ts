/* eslint-disable functional/immutable-data -- resource cache and subscriptions are server-local mutable state. */
/* eslint-disable functional/no-mixed-types -- resource definitions carry metadata plus read/match handlers. */
/* eslint-disable import-x/no-unused-modules -- resource registry types are a public compatibility surface. */

import type {
  ListResourcesResult,
  ListResourceTemplatesResult,
  ReadResourceResult,
  Resource,
  ResourceLink,
  ResourceTemplate
} from "@modelcontextprotocol/sdk/types.js"
import { ErrorCode, McpError } from "@modelcontextprotocol/sdk/types.js"

import type { ObsConfig } from "../../config/config.js"
import type { ObsClient } from "../../obs/client.js"
import type { BufferedObsEvent } from "../../obs/events.js"
import { EventSubscription } from "../../obs/protocol.js"

export interface ResourceContext {
  readonly config: ObsConfig
  readonly client: ObsClient
  readonly screenshots: ScreenshotResourceStore
}

export interface ScreenshotMetadata {
  readonly capturedAt: string
  readonly sourceName?: string | undefined
  readonly sourceUuid?: string | undefined
  readonly imageFormat: string
  readonly mimeType?: string | undefined
  readonly imageBytes?: number | undefined
  readonly base64Data?: string | undefined
  readonly imageFilePath?: string | undefined
}

export interface ScreenshotResourceStore {
  getLatest(): ScreenshotMetadata | undefined
  setLatest(metadata: ScreenshotMetadata): void
}

export type ResourceInvalidationGroup =
  | "canvases"
  | "config"
  | "events"
  | "filters"
  | "hotkeys"
  | "inputs"
  | "outputs"
  | "profiles"
  | "record"
  | "scene_collections"
  | "scene_items"
  | "scenes"
  | "screenshots"
  | "state"
  | "stream"
  | "transitions"

export type ResourceReader = (context: ResourceContext, uri: string) => Promise<unknown>

export interface ResourceDefinition {
  readonly uri: string
  readonly name: string
  readonly title: string
  readonly description: string
  readonly mimeType: "application/json"
  readonly requiredObsRequests: ReadonlyArray<string>
  readonly groups: ReadonlyArray<ResourceInvalidationGroup>
  readonly read: ResourceReader
}

export interface ResourceTemplateDefinition {
  readonly uriTemplate: string
  readonly name: string
  readonly title: string
  readonly description: string
  readonly mimeType: "application/json"
  readonly requiredObsRequests: ReadonlyArray<string>
  readonly groups: ReadonlyArray<ResourceInvalidationGroup>
  readonly match: (uri: string) => Readonly<Record<string, string>> | undefined
  readonly read: ResourceReader
}

interface CacheEntry {
  readonly expiresAt: number
  readonly groups: ReadonlyArray<ResourceInvalidationGroup>
  readonly result: ReadResourceResult
}

export const createScreenshotResourceStore = (): ScreenshotResourceStore => {
  let latest: ScreenshotMetadata | undefined
  return {
    getLatest: () => latest,
    setLatest: (metadata) => {
      latest = metadata
    }
  }
}

const JSON_MIME_TYPE = "application/json" as const
const RESOURCE_CACHE_TTL_MS = 750
const RESOURCE_NOTIFICATION_DEBOUNCE_MS = 40

const jsonResourceResult = (uri: string, value: unknown): ReadResourceResult => ({
  contents: [{
    uri,
    mimeType: JSON_MIME_TYPE,
    text: JSON.stringify(value)
  }]
})

export const resourceLink = (
  uri: string,
  name: string,
  title: string,
  description: string
): ResourceLink => ({
  type: "resource_link",
  uri,
  name,
  title,
  description,
  mimeType: JSON_MIME_TYPE
})

const hasRequiredRequests = (
  requiredObsRequests: ReadonlyArray<string>,
  availableRequests: ReadonlyArray<string> | undefined
): boolean => {
  if (availableRequests === undefined) {
    return true
  }
  const available = new Set(availableRequests)
  return requiredObsRequests.every((requestType) => available.has(requestType))
}

export const filterReadableResources = (
  resources: ReadonlyArray<ResourceDefinition>,
  availableRequests: ReadonlyArray<string> | undefined
): ReadonlyArray<ResourceDefinition> =>
  resources.filter((resource) => hasRequiredRequests(resource.requiredObsRequests, availableRequests))

export const filterReadableTemplates = (
  templates: ReadonlyArray<ResourceTemplateDefinition>,
  availableRequests: ReadonlyArray<string> | undefined
): ReadonlyArray<ResourceTemplateDefinition> =>
  templates.filter((template) => hasRequiredRequests(template.requiredObsRequests, availableRequests))

const toResource = (definition: ResourceDefinition): Resource => ({
  uri: definition.uri,
  name: definition.name,
  title: definition.title,
  description: definition.description,
  mimeType: definition.mimeType
})

const toResourceTemplate = (definition: ResourceTemplateDefinition): ResourceTemplate => ({
  uriTemplate: definition.uriTemplate,
  name: definition.name,
  title: definition.title,
  description: definition.description,
  mimeType: definition.mimeType
})

const unknownResourceError = (uri: string): McpError =>
  new McpError(ErrorCode.InvalidParams, `Unknown resource: ${uri}`)

export const invalidResourceParams = (message: string): McpError => new McpError(ErrorCode.InvalidParams, message)

export class ResourceManager {
  private readonly cache = new Map<string, CacheEntry>()
  private readonly subscribedUris = new Set<string>()
  private readonly pendingUpdatedUris = new Set<string>()
  private notificationTimer: NodeJS.Timeout | undefined

  constructor(
    private readonly resources: ReadonlyArray<ResourceDefinition>,
    private readonly templates: ReadonlyArray<ResourceTemplateDefinition>,
    private readonly sendUpdated: (uri: string) => Promise<void>
  ) {}

  listResources(availableRequests: ReadonlyArray<string> | undefined): ListResourcesResult {
    return {
      resources: filterReadableResources(this.resources, availableRequests).map(toResource)
    }
  }

  listTemplates(availableRequests: ReadonlyArray<string> | undefined): ListResourceTemplatesResult {
    return {
      resourceTemplates: filterReadableTemplates(this.templates, availableRequests).map(toResourceTemplate)
    }
  }

  async read(uri: string, context: ResourceContext): Promise<ReadResourceResult> {
    const entry = this.cache.get(uri)
    if (entry !== undefined && entry.expiresAt >= performance.now()) {
      return entry.result
    }
    const definition = this.findDefinition(uri, context.client.availableRequests)
    if (definition === undefined) {
      throw unknownResourceError(uri)
    }
    const result = jsonResourceResult(uri, await definition.read(context, uri))
    this.cache.set(uri, {
      expiresAt: performance.now() + RESOURCE_CACHE_TTL_MS,
      groups: definition.groups,
      result
    })
    return result
  }

  subscribe(uri: string, availableRequests: ReadonlyArray<string> | undefined): void {
    if (this.findDefinition(uri, availableRequests) === undefined) {
      throw unknownResourceError(uri)
    }
    this.subscribedUris.add(uri)
  }

  unsubscribe(uri: string): void {
    this.subscribedUris.delete(uri)
  }

  invalidate(groups: ReadonlyArray<ResourceInvalidationGroup>): void {
    if (groups.length === 0) {
      return
    }
    const invalidGroups = new Set(groups)
    for (const [uri, entry] of this.cache.entries()) {
      if (entry.groups.some((group) => invalidGroups.has(group))) {
        this.cache.delete(uri)
      }
    }
    for (const uri of this.subscribedUris) {
      const definition = this.findDefinition(uri, undefined)
      if (definition?.groups.some((group) => invalidGroups.has(group)) === true) {
        this.pendingUpdatedUris.add(uri)
      }
    }
    this.scheduleNotifications()
  }

  definitionForUri(uri: string, availableRequests: ReadonlyArray<string> | undefined):
    | ResourceDefinition
    | ResourceTemplateDefinition
    | undefined
  {
    return this.findDefinition(uri, availableRequests)
  }

  private findDefinition(
    uri: string,
    availableRequests: ReadonlyArray<string> | undefined
  ): ResourceDefinition | ResourceTemplateDefinition | undefined {
    const staticDefinition = this.resources.find((resource) =>
      resource.uri === uri && hasRequiredRequests(resource.requiredObsRequests, availableRequests)
    )
    if (staticDefinition !== undefined) {
      return staticDefinition
    }
    return this.templates.find((template) =>
      template.match(uri) !== undefined && hasRequiredRequests(template.requiredObsRequests, availableRequests)
    )
  }

  private scheduleNotifications(): void {
    if (this.pendingUpdatedUris.size === 0 || this.notificationTimer !== undefined) {
      return
    }
    this.notificationTimer = setTimeout(() => {
      const uris = [...this.pendingUpdatedUris]
      this.pendingUpdatedUris.clear()
      this.notificationTimer = undefined
      void Promise.all(uris.map((uri) => this.sendUpdated(uri).catch(() => undefined)))
    }, RESOURCE_NOTIFICATION_DEBOUNCE_MS)
  }
}

const READ_TOOL_PREFIXES = ["get_", "list_"] as const
const isReadOnlyToolName = (toolName: string): boolean =>
  READ_TOOL_PREFIXES.some((prefix) => toolName.startsWith(prefix))

export const invalidationGroupsForTool = (
  toolName: string,
  category: string
): ReadonlyArray<ResourceInvalidationGroup> => {
  if (toolName === "get_source_screenshot") {
    return ["screenshots", "state"]
  }
  if (isReadOnlyToolName(toolName)) {
    return []
  }
  switch (category) {
    case "canvases":
      return ["canvases", "state"]
    case "config":
      return ["config", "profiles", "scene_collections", "state"]
    case "events":
      return ["events"]
    case "filters":
      return ["filters", "inputs", "scenes", "state"]
    case "general":
      return toolName.startsWith("trigger_hotkey") ? ["hotkeys", "events"] : []
    case "inputs":
      return ["inputs", "state"]
    case "outputs":
      return ["outputs", "record", "stream", "state"]
    case "record":
      return ["record", "outputs", "state"]
    case "scenes":
      return ["scenes", "scene_items", "transitions", "state"]
    case "screenshots":
      return ["screenshots", "state"]
    case "stream":
      return ["stream", "outputs", "state"]
    case "transitions":
      return ["transitions", "scenes", "state"]
    default:
      return []
  }
}

const uniqueGroups = (
  groups: ReadonlyArray<ResourceInvalidationGroup>
): ReadonlyArray<ResourceInvalidationGroup> => [...new Set(groups)]

export const invalidationGroupsForObsEvent = (
  event: BufferedObsEvent
): ReadonlyArray<ResourceInvalidationGroup> => {
  const groups: Array<ResourceInvalidationGroup> = ["events"]
  const intent = event.eventIntent
  if ((intent & EventSubscription.Config) !== 0) {
    groups.push("config", "profiles", "scene_collections", "state")
  }
  if ((intent & EventSubscription.Scenes) !== 0) {
    groups.push("scenes", "transitions", "state")
  }
  if ((intent & EventSubscription.Inputs) !== 0) {
    groups.push("inputs", "state")
  }
  if ((intent & EventSubscription.Transitions) !== 0) {
    groups.push("transitions", "scenes", "state")
  }
  if ((intent & EventSubscription.Filters) !== 0) {
    groups.push("filters", "inputs", "scenes", "state")
  }
  if ((intent & EventSubscription.Outputs) !== 0) {
    groups.push("outputs", "record", "stream", "state")
  }
  if ((intent & EventSubscription.SceneItems) !== 0) {
    groups.push("scene_items", "scenes", "state")
  }
  if ((intent & EventSubscription.MediaInputs) !== 0) {
    groups.push("inputs", "state")
  }
  if ((intent & EventSubscription.Ui) !== 0) {
    groups.push("state")
  }
  if ((intent & EventSubscription.Canvases) !== 0) {
    groups.push("canvases", "state")
  }
  return uniqueGroups(groups)
}
