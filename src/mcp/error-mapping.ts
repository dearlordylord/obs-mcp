import { ErrorCode, McpError } from "@modelcontextprotocol/sdk/types.js"

import { ObsProtocolError, ObsRequestError, ObsTimeoutError, ObsValidationError } from "../obs/errors.js"

const MISSING_OR_UNKNOWN_REQUEST_MIN = 203
const MISSING_OR_UNKNOWN_REQUEST_MAX = 204
const UNSUPPORTED_BATCH_EXECUTION_TYPE = 206
const REQUEST_FIELD_ERROR_MIN = 300
const REQUEST_FIELD_ERROR_MAX = 499
const RESOURCE_OR_STATE_ERROR_MIN = 500
const RESOURCE_OR_STATE_ERROR_MAX = 699
const CANNOT_ACT = 703
const OBS_NOT_READY = 207
const OBS_PROCESSING_ERROR_MIN = 700
const OBS_PROCESSING_ERROR_MAX = 702

const isBetween = (value: number, min: number, max: number): boolean => value >= min && value <= max

const mcpErrorCodeForObsStatus = (statusCode: number): ErrorCode => {
  if (isBetween(statusCode, MISSING_OR_UNKNOWN_REQUEST_MIN, MISSING_OR_UNKNOWN_REQUEST_MAX)) {
    return ErrorCode.InvalidParams
  }
  if (statusCode === UNSUPPORTED_BATCH_EXECUTION_TYPE) {
    return ErrorCode.InvalidParams
  }
  if (isBetween(statusCode, REQUEST_FIELD_ERROR_MIN, REQUEST_FIELD_ERROR_MAX)) {
    return ErrorCode.InvalidParams
  }
  if (isBetween(statusCode, RESOURCE_OR_STATE_ERROR_MIN, RESOURCE_OR_STATE_ERROR_MAX)) {
    return ErrorCode.InvalidParams
  }
  if (statusCode === CANNOT_ACT) {
    return ErrorCode.InvalidParams
  }
  if (statusCode === OBS_NOT_READY || isBetween(statusCode, OBS_PROCESSING_ERROR_MIN, OBS_PROCESSING_ERROR_MAX)) {
    return ErrorCode.InternalError
  }
  return ErrorCode.InternalError
}

const obsStatusIsRetryable = (statusCode: number): boolean => statusCode === OBS_NOT_READY

export const toMcpError = (error: unknown): McpError => {
  if (error instanceof McpError) {
    return error
  }
  if (error instanceof ObsRequestError) {
    return new McpError(mcpErrorCodeForObsStatus(error.code), error.toUserMessage(), {
      requestType: error.requestType,
      obsStatusCode: error.code,
      comment: error.comment,
      retryable: obsStatusIsRetryable(error.code)
    })
  }
  if (error instanceof ObsValidationError) {
    return new McpError(ErrorCode.InvalidParams, error.message)
  }
  if (error instanceof ObsTimeoutError || error instanceof ObsProtocolError) {
    return new McpError(ErrorCode.InternalError, error.message)
  }
  if (error instanceof Error) {
    return new McpError(ErrorCode.InternalError, error.message)
  }
  return new McpError(ErrorCode.InternalError, String(error))
}
