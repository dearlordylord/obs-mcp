import { config as loadDotEnv } from "dotenv"
import { Effect } from "effect"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { loadObsConfigFromEnv } from "../../src/config/config.js"
import { createObsClient, type ObsClient } from "../../src/obs/client.js"
import { getVersion } from "../../src/obs/operations/general.js"
import { getCurrentScene, listScenes, setCurrentScene } from "../../src/obs/operations/scenes.js"

const integrationEnabled = process.env["OBS_INTEGRATION_TESTS"] === "1"
if (integrationEnabled) {
  loadDotEnv({ path: ".env", override: false })
}
const mutationEnabled = process.env["OBS_INTEGRATION_MUTATION_TESTS"] === "1"

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

  it.skipIf(!mutationEnabled)("can set the current scene to the current scene", async () => {
    expect(client).toBeDefined()
    const obs = client
    if (obs === undefined) throw new Error("OBS client was not initialized")
    const current = await getCurrentScene(obs)
    await expect(setCurrentScene(obs, { sceneName: current.sceneName }))
      .resolves.toEqual({ sceneName: current.sceneName, switched: true })
  })
})

describe.skipIf(integrationEnabled)("real OBS websocket integration configuration", () => {
  it("does not read local .env unless integration is explicitly enabled", () => {
    expect(process.env["OBS_WEBSOCKET_PASSWORD"]).toBeUndefined()
  })
})
