import { Schema } from "effect"

export const StringArray = Schema.Array(Schema.String)
export const UnknownRecord = Schema.Record({ key: Schema.String, value: Schema.Unknown })

export const OutputActiveState = Schema.Struct({
  outputActive: Schema.Boolean
})
export type OutputActiveState = typeof OutputActiveState.Type

export const OutputActiveSwitchState = Schema.Struct({
  outputActive: Schema.Boolean,
  switched: Schema.Literal(true)
})
export type OutputActiveSwitchState = typeof OutputActiveSwitchState.Type

export const EmptyInput = Schema.Struct({}).pipe(
  Schema.filter((input) => Object.keys(input).length === 0, {
    message: () => "Expected no arguments"
  })
).annotations({
  jsonSchema: { type: "object", properties: {}, additionalProperties: false }
})
