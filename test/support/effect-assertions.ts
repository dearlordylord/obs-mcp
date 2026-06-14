import { Effect, Either, ParseResult, Schema } from "effect"
import { expect } from "vitest"

export const expectSchemaDecodeFailure = (
  schema: Schema.Schema.AnyNoContext,
  value: unknown,
  expectedDiagnostic: RegExp | string,
  options?: Parameters<typeof Schema.decodeUnknownEither>[1]
): void => {
  const result = Schema.decodeUnknownEither(schema, options)(value)

  expect(Either.isLeft(result)).toBe(true)
  if (Either.isLeft(result)) {
    expect(ParseResult.TreeFormatter.formatErrorSync(result.left)).toMatch(expectedDiagnostic)
  }
}

export const expectEffectFailure = async <A, E>(
  effect: Effect.Effect<A, E>,
  expectedDiagnostic: RegExp | string
): Promise<void> => {
  const result = await Effect.runPromise(Effect.either(effect))

  expect(Either.isLeft(result)).toBe(true)
  if (Either.isLeft(result)) {
    expect(errorDiagnostic(result.left)).toMatch(expectedDiagnostic)
  }
}

export const expectParseError = (
  parse: () => unknown,
  expectedDiagnostic: RegExp | string
): void => {
  try {
    parse()
  } catch (error) {
    expect(ParseResult.isParseError(error)).toBe(true)
    if (ParseResult.isParseError(error)) {
      expect(ParseResult.TreeFormatter.formatErrorSync(error)).toMatch(expectedDiagnostic)
    }
    return
  }

  expect.fail("Expected schema parsing to fail")
}

const errorDiagnostic = (error: unknown): string => error instanceof Error ? error.message : String(error)
