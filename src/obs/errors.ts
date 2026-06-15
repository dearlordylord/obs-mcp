export class ObsProtocolError extends Error {
  public readonly kind = "ObsProtocolError"

  public constructor(message: string) {
    super(message)
  }
}

export class ObsRequestError extends Error {
  public readonly kind = "ObsRequestError"

  public constructor(
    public readonly requestType: string,
    public readonly code: number,
    public readonly comment: string | undefined
  ) {
    super(`OBS request ${requestType} failed with status ${code}${comment === undefined ? "" : `: ${comment}`}`)
  }

  public toUserMessage(): string {
    const detail = this.comment === undefined ? "" : ` OBS said: ${this.comment}.`
    return `OBS rejected ${this.requestType} with status ${this.code}.${detail} Check that OBS is running and the requested scene or feature exists.`
  }
}

export class ObsValidationError extends Error {
  public readonly kind = "ObsValidationError"

  public constructor(message: string) {
    super(message)
  }
}

export class ObsTimeoutError extends Error {
  public readonly kind = "ObsTimeoutError"

  public constructor(message: string) {
    super(message)
  }
}
