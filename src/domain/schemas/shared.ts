import { Schema } from "effect"

export const StringArray = Schema.Array(Schema.String)
export const UnknownRecord = Schema.Record({ key: Schema.String, value: Schema.Unknown })

export const EmptyInput = Schema.Struct({}).pipe(
  Schema.filter((input) => Object.keys(input).length === 0, {
    message: () => "Expected no arguments"
  })
).annotations({
  jsonSchema: { type: "object", properties: {}, additionalProperties: false }
})
