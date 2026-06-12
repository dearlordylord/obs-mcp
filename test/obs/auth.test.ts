import { describe, expect, it } from "vitest"

import { calculateObsAuthentication } from "../../src/obs/auth.js"

describe("OBS authentication", () => {
  it("calculates the protocol challenge response", () => {
    expect(calculateObsAuthentication("supersecretpassword", {
      challenge: "+IxH4CnCiqpX1rM9scsNynZzbOe4KhDeYcTNS3PDaeY=",
      salt: "lM1GncleQOaCu9lT1yeUZhFYnqhsLLP1G5lAGo3ixaI="
    })).toBe("1Ct943GAT+6YQUUX47Ia/ncufilbe6+oD6lY+5kaCu4=")
  })
})
