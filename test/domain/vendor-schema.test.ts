import { Schema } from "effect"
import { describe, expect, it } from "vitest"

import { BroadcastCustomEventInput, CallVendorRequestInput } from "../../src/domain/schemas/vendor.js"
import { expectSchemaDecodeFailure } from "../support/effect-assertions.js"

describe("vendor schemas", () => {
  it("accepts explicit JSON-safe vendor and custom event objects", () => {
    expect(
      Schema.decodeUnknownSync(CallVendorRequestInput)({
        vendorName: "example.vendor",
        requestType: "DoThing",
        requestData: { enabled: true, count: 1, nested: { label: "ok" }, values: [null, "x"] }
      })
    ).toMatchObject({
      vendorName: "example.vendor",
      requestType: "DoThing"
    })
    expect(
      Schema.decodeUnknownSync(BroadcastCustomEventInput)({
        eventData: { eventName: "ralph.task9", ok: true }
      })
    ).toEqual({ eventData: { eventName: "ralph.task9", ok: true } })
  })

  it("defaults optional vendor request data to an empty object", () => {
    expect(
      Schema.decodeUnknownSync(CallVendorRequestInput)({
        vendorName: "example.vendor",
        requestType: "DoThing"
      })
    ).toEqual({
      vendorName: "example.vendor",
      requestType: "DoThing",
      requestData: {}
    })
  })

  it("rejects empty identifiers and non JSON-safe values", () => {
    expectSchemaDecodeFailure(
      CallVendorRequestInput,
      {
        vendorName: "",
        requestType: "DoThing",
        requestData: {}
      },
      /vendorName/
    )
    expectSchemaDecodeFailure(
      CallVendorRequestInput,
      {
        vendorName: "example.vendor",
        requestType: "DoThing",
        requestData: { missing: undefined }
      },
      /missing/
    )
    expectSchemaDecodeFailure(
      BroadcastCustomEventInput,
      {
        eventData: { callback: () => undefined }
      },
      /callback/
    )
    expectSchemaDecodeFailure(
      BroadcastCustomEventInput,
      {
        eventData: new Date("2026-06-13T00:00:00.000Z")
      },
      /eventData/
    )
  })
})
