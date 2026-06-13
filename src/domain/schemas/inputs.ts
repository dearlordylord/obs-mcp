import { JSONSchema, Schema } from "effect"

export const InputLocatorInput = Schema.Struct({
  inputName: Schema.optional(Schema.NonEmptyString),
  inputUuid: Schema.optional(Schema.NonEmptyString)
}).pipe(
  Schema.filter((input) => (input.inputName === undefined) !== (input.inputUuid === undefined), {
    message: () => "Exactly one of inputName or inputUuid is required"
  })
)
export type InputLocatorInput = typeof InputLocatorInput.Type
export const InputLocatorInputJsonSchema = JSONSchema.make(InputLocatorInput)

export const ListInputsInput = Schema.Struct({
  inputKind: Schema.optional(Schema.NonEmptyString)
})
export type ListInputsInput = typeof ListInputsInput.Type
export const ListInputsInputJsonSchema = JSONSchema.make(ListInputsInput)

export const InputSummary = Schema.Struct({
  inputName: Schema.String,
  inputUuid: Schema.optional(Schema.String),
  inputKind: Schema.String,
  unversionedInputKind: Schema.String
})
export type InputSummary = typeof InputSummary.Type

export const ListInputsOutput = Schema.Struct({
  inputs: Schema.Array(InputSummary)
})
export type ListInputsOutput = typeof ListInputsOutput.Type
export const ListInputsOutputJsonSchema = JSONSchema.make(ListInputsOutput)

export const ListInputKindsInput = Schema.Struct({
  unversioned: Schema.optionalWith(Schema.Boolean, { default: () => false })
})
export type ListInputKindsInput = typeof ListInputKindsInput.Type
export const ListInputKindsInputJsonSchema = JSONSchema.make(ListInputKindsInput)

export const ListInputKindsOutput = Schema.Struct({
  inputKinds: Schema.Array(Schema.String)
})
export type ListInputKindsOutput = typeof ListInputKindsOutput.Type
export const ListInputKindsOutputJsonSchema = JSONSchema.make(ListInputKindsOutput)

export const SpecialInputsOutput = Schema.Struct({
  desktop1: Schema.NullOr(Schema.String),
  desktop2: Schema.NullOr(Schema.String),
  mic1: Schema.NullOr(Schema.String),
  mic2: Schema.NullOr(Schema.String),
  mic3: Schema.NullOr(Schema.String),
  mic4: Schema.NullOr(Schema.String)
})
export type SpecialInputsOutput = typeof SpecialInputsOutput.Type
export const SpecialInputsOutputJsonSchema = JSONSchema.make(SpecialInputsOutput)
