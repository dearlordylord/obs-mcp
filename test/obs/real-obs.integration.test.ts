import { config as loadDotEnv } from "dotenv"
import { Effect } from "effect"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { loadObsConfigFromEnv } from "../../src/config/config.js"
import { createObsClient, type ObsClient } from "../../src/obs/client.js"
import { getRecordStatus, getVersion } from "../../src/obs/operations/general.js"
import {
  getReplayBufferStatus,
  getVirtualCamStatus,
  startReplayBuffer,
  startVirtualCam,
  stopReplayBuffer,
  stopVirtualCam
} from "../../src/obs/operations/outputs.js"
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

describe.skipIf(!integrationEnabled)("real OBS websocket integration", () => {
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
    await expect(getVirtualCamStatus(obs)).resolves.toEqual(expect.objectContaining({
      outputActive: expect.any(Boolean)
    }))
    await expect(getReplayBufferStatus(obs)).resolves.toEqual(expect.objectContaining({
      outputActive: expect.any(Boolean)
    }))
  })

  it.skipIf(!mutationEnabled)("can set the current scene to the current scene", async () => {
    expect(client).toBeDefined()
    const obs = client
    if (obs === undefined) throw new Error("OBS client was not initialized")
    const current = await getCurrentScene(obs)
    await expect(setCurrentScene(obs, { sceneName: current.sceneName }))
      .resolves.toEqual({ sceneName: current.sceneName, switched: true })
  })

  it.skipIf(!mutationEnabled)(
    "checks inactive record and stream stop mutations without starting recording or streaming",
    async () => {
      expect(client).toBeDefined()
      const obs = client
      if (obs === undefined) throw new Error("OBS client was not initialized")

      const record = await getRecordStatus(obs)
      if (!record.outputActive && requestAvailable(obs, "StopRecord")) {
        await expect(stopRecord(obs)).rejects.toThrow()
      }

      const stream = await getStreamStatus(obs)
      if (!stream.outputActive && requestAvailable(obs, "StopStream")) {
        await expect(stopStream(obs)).rejects.toThrow()
      }
    }
  )

  it.skipIf(!mutationEnabled)("can start and stop inactive virtual camera and replay buffer outputs", async () => {
    expect(client).toBeDefined()
    const obs = client
    if (obs === undefined) throw new Error("OBS client was not initialized")

    const virtualCam = await getVirtualCamStatus(obs)
    if (
      !virtualCam.outputActive && requestAvailable(obs, "StartVirtualCam") && requestAvailable(obs, "StopVirtualCam")
    ) {
      await expect(startVirtualCam(obs)).resolves.toEqual({ outputActive: true, switched: true })
      await expect(stopVirtualCam(obs)).resolves.toEqual({ outputActive: false, switched: true })
    }

    const replayBuffer = await getReplayBufferStatus(obs)
    if (
      !replayBuffer.outputActive
      && requestAvailable(obs, "StartReplayBuffer")
      && requestAvailable(obs, "StopReplayBuffer")
    ) {
      await expect(startReplayBuffer(obs)).resolves.toEqual({ outputActive: true })
      await expect(stopReplayBuffer(obs)).resolves.toEqual({ outputActive: false })
    }
  })
})

describe.skipIf(integrationEnabled)("real OBS websocket integration configuration", () => {
  it("does not read local .env unless integration is explicitly enabled", () => {
    expect(process.env["OBS_WEBSOCKET_PASSWORD"]).toBeUndefined()
  })
})
