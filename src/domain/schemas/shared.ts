import { Schema } from "effect"

export const StringArray = Schema.Array(Schema.String)
export const UnknownRecord = Schema.Record({ key: Schema.String, value: Schema.Unknown })

export const EmptyInput = Schema.Struct({}).annotations({
  jsonSchema: { type: "object", properties: {}, additionalProperties: false }
})
