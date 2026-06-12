import { createHash } from "node:crypto"

interface ObsAuthenticationChallenge {
  readonly salt: string
  readonly challenge: string
}

const sha256Base64 = (input: string): string => createHash("sha256").update(input).digest("base64")

export const calculateObsAuthentication = (
  password: string,
  authentication: ObsAuthenticationChallenge
): string => {
  const secret = sha256Base64(`${password}${authentication.salt}`)
  return sha256Base64(`${secret}${authentication.challenge}`)
}
