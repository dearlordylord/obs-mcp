import { describe, expect, it } from "vitest"

import { ObsRequestError } from "../../src/obs/errors.js"
import { decodeJsonTextEnvelope, OP_REQUEST_RESPONSE } from "../../src/obs/protocol.js"

describe("OBS protocol envelopes", () => {
  it("decodes request responses", () => {
    const decoded = decodeJsonTextEnvelope(JSON.stringify({
      op: OP_REQUEST_RESPONSE,
      d: {
        requestType: "SetCurrentProgramScene",
        requestId: "1",
        requestStatus: { result: false, code: 608, comment: "Parameter: sceneName" }
      }
    }))
    expect(decoded.op).toBe(OP_REQUEST_RESPONSE)
  })

  it("formats failed request status as a domain error", () => {
    const error = new ObsRequestError("SetCurrentProgramScene", 608, "Parameter: sceneName")
    expect(error.toUserMessage()).toContain("OBS rejected SetCurrentProgramScene with status 608")
    expect(error.toUserMessage()).toContain("Parameter: sceneName")
  })
})
