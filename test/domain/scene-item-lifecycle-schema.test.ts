import { Schema } from "effect"
import { describe, expect, it } from "vitest"

import { DuplicateSceneItemInput } from "../../src/domain/schemas/scene-item-lifecycle.js"
import { expectSchemaDecodeFailure } from "../support/effect-assertions.js"

describe("scene item lifecycle schemas", () => {
  it("accepts at most one duplicate destination scene locator", () => {
    expect(
      Schema.decodeUnknownSync(DuplicateSceneItemInput)({
        sceneName: "Program",
        sceneItemId: 12,
        destinationSceneName: "Replay"
      })
    ).toEqual({
      sceneName: "Program",
      sceneItemId: 12,
      destinationSceneName: "Replay"
    })
    expectSchemaDecodeFailure(
      DuplicateSceneItemInput,
      {
        sceneName: "Program",
        sceneItemId: 12,
        destinationSceneName: "Replay",
        destinationSceneUuid: "scene-replay"
      },
      /At most one duplicate destination scene locator is allowed/
    )
  })
})
