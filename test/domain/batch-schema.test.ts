import { Schema } from "effect"
import { describe, expect, it } from "vitest"

import { RunObsRequestBatchInput } from "../../src/domain/schemas/batch.js"
import { expectSchemaDecodeFailure } from "../support/effect-assertions.js"

describe("batch schemas", () => {
  it("accepts schema-limited serial realtime batches with Sleep milliseconds", () => {
    expect(
      Schema.decodeUnknownSync(RunObsRequestBatchInput)({
        requests: [
          { kind: "set_current_scene", sceneName: "Intro" },
          { kind: "sleep", sleepMillis: 10 },
          { kind: "get_current_scene" }
        ]
      })
    ).toMatchObject({
      executionType: "serial_realtime",
      haltOnFailure: false
    })
  })

  it("rejects unsupported sleep execution combinations and excessive batch size", () => {
    expectSchemaDecodeFailure(
      RunObsRequestBatchInput,
      {
        executionType: "serial_realtime",
        requests: [{ kind: "sleep", sleepFrames: 1 }]
      },
      /Sleep requests must match the batch execution type/
    )
    expectSchemaDecodeFailure(
      RunObsRequestBatchInput,
      {
        executionType: "parallel",
        requests: [{ kind: "sleep", sleepMillis: 1 }]
      },
      /Sleep requests must match the batch execution type/
    )
    expectSchemaDecodeFailure(
      RunObsRequestBatchInput,
      {
        requests: Array.from({ length: 21 }, () => ({ kind: "get_current_scene" }))
      },
      /20/
    )
  })
})
