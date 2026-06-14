import { Client } from "@modelcontextprotocol/sdk/client/index.js"
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js"
import { config as loadDotEnv } from "dotenv"
import { Effect } from "effect"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { loadObsConfigFromEnv } from "../../src/config/config.js"
import { createObsMcpServer } from "../../src/mcp/create-mcp-server.js"
import { createObsClient, type ObsClient } from "../../src/obs/client.js"
import { ObsRequestError } from "../../src/obs/errors.js"
import { getRecordStatus, getVersion } from "../../src/obs/operations/general.js"
import { getVirtualCamStatus } from "../../src/obs/operations/outputs.js"
import { stopRecord } from "../../src/obs/operations/record.js"
import { getCurrentScene, listScenes, setCurrentScene } from "../../src/obs/operations/scenes.js"
import { getStreamStatus, stopStream } from "../../src/obs/operations/stream.js"

const integrationEnabled = process.env["OBS_INTEGRATION_TESTS"] === "1"
if (integrationEnabled) {
  loadDotEnv({ path: ".env", override: false })
}
const mutationEnabled = process.env["OBS_INTEGRATION_MUTATION_TESTS"] === "1"

const requestAvailable = (client: ObsClient, requestType: string): boolean => {
  return client.availableRequests.includes(requestType)
}

const OBS_FEATURE_UNAVAILABLE = 604

const expectOptionalVirtualCameraStatus = async (client: ObsClient): Promise<void> => {
  try {
    await expect(await getVirtualCamStatus(client)).toEqual(expect.objectContaining({
      outputActive: expect.any(Boolean)
    }))
  } catch (error) {
    if (error instanceof ObsRequestError && error.code === OBS_FEATURE_UNAVAILABLE) {
      expect(error.comment).toContain("not available")
      return
    }
    throw error
  }
}

if (integrationEnabled) {
  describe("real OBS websocket integration", () => {
    let client: ObsClient | undefined

    beforeAll(async () => {
      const config = await Effect.runPromise(loadObsConfigFromEnv(process.env))
      client = await createObsClient(config)
    })

    afterAll(async () => {
      await client?.close()
    })

    it("connects to OBS and reads version capabilities", async () => {
      expect(client).toBeDefined()
      const obs = client
      if (obs === undefined) throw new Error("OBS client was not initialized")
      const version = await getVersion(obs)
      expect(version.availableRequests).toContain("GetVersion")
      expect(version.negotiatedRpcVersion).toBe(1)
    })

    it("reads the current scene and scene list", async () => {
      expect(client).toBeDefined()
      const obs = client
      if (obs === undefined) throw new Error("OBS client was not initialized")
      const current = await getCurrentScene(obs)
      const scenes = await listScenes(obs, { includeGroups: true })
      expect(scenes.scenes.map((scene) => scene.sceneName)).toContain(current.sceneName)
    })

    it("reads lifecycle output status without mutating OBS", async () => {
      expect(client).toBeDefined()
      const obs = client
      if (obs === undefined) throw new Error("OBS client was not initialized")

      await expect(getRecordStatus(obs)).resolves.toEqual(expect.objectContaining({
        outputActive: expect.any(Boolean)
      }))
      await expect(getStreamStatus(obs)).resolves.toEqual(expect.objectContaining({
        outputActive: expect.any(Boolean)
      }))
      await expectOptionalVirtualCameraStatus(obs)
    })

    it("lists and reads OBS MCP resources through the protocol", async () => {
      expect(client).toBeDefined()
      const obs = client
      if (obs === undefined) throw new Error("OBS client was not initialized")
      const config = await Effect.runPromise(loadObsConfigFromEnv(process.env))
      const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair()
      const server = createObsMcpServer(config, obs)
      const mcpClient = new Client({ name: "integration-resource-client", version: "0.0.0" })

      try {
        await Promise.all([server.connect(serverTransport), mcpClient.connect(clientTransport)])
        const resources = await mcpClient.listResources()
        expect(resources.resources.map((resource) => resource.uri)).toContain("obs://state/current")
        await expect(mcpClient.readResource({ uri: "obs://state/current" })).resolves.toEqual(
          expect.objectContaining({
            contents: expect.arrayContaining([
              expect.objectContaining({ uri: "obs://state/current", mimeType: "application/json" })
            ])
          })
        )
      } finally {
        await Promise.all([
          mcpClient.close().catch(() => undefined),
          server.close().catch(() => undefined)
        ])
      }
    })

    if (mutationEnabled) {
      it("can set the current scene to the current scene", async () => {
        expect(client).toBeDefined()
        const obs = client
        if (obs === undefined) throw new Error("OBS client was not initialized")
        const current = await getCurrentScene(obs)
        await expect(setCurrentScene(obs, { sceneName: current.sceneName }))
          .resolves.toEqual({ sceneName: current.sceneName, switched: true })
      })

      it("checks inactive record and stream stop mutations without starting recording or streaming", async () => {
        expect(client).toBeDefined()
        const obs = client
        if (obs === undefined) throw new Error("OBS client was not initialized")

        const record = await getRecordStatus(obs)
        if (!record.outputActive && requestAvailable(obs, "StopRecord")) {
          await expect(stopRecord(obs)).rejects.toThrow(ObsRequestError)
        }

        const stream = await getStreamStatus(obs)
        if (!stream.outputActive && requestAvailable(obs, "StopStream")) {
          await expect(stopStream(obs)).rejects.toThrow(ObsRequestError)
        }
      })
    }
  })
}

if (!integrationEnabled) {
  describe("real OBS websocket integration configuration", () => {
    it("does not read local .env unless integration is explicitly enabled", () => {
      expect(process.env["OBS_WEBSOCKET_PASSWORD"]).toBeUndefined()
    })
  })
}
