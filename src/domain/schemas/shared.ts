import { Schema } from "effect"

/*
 * OBS text at the protocol boundary is allowed to be the empty string.
 * obs-websocket uses strings for user labels, generated names, paths, enum-like values,
 * plugin payload keys, and occasionally unset/unknown fields. The schema layer only
 * rejects empty text when a tool input requires meaningful user intent.
 */
export const ObsString = Schema.String

/*
 * Non-empty text is a presence constraint, not a branded domain identity.
 * The same OBS value can move between request, response, fake server, and MCP output
 * shapes; branding every label/uuid/path would add casts without stronger validation.
 */
export const ObsNonEmptyString = Schema.NonEmptyString

/*
 * Raw OBS numbers are accepted only where the surrounding field name carries the unit.
 * Negative, zero, and floating-point values are valid at the protocol boundary because
 * OBS uses the same JSON number type for deltas, coordinates, ratios, durations, counts,
 * and sentinel-capable fields. Domain schemas refine this alias when a field forbids
 * one of those numeric forms.
 */
export const ObsNumber = Schema.Number

/*
 * OBS integer fields are structural JSON numbers, not nominal identities.
 * They stay unbranded because index/count/status fields frequently move through
 * generic protocol envelopes and fake-server fixtures where a brand would not add
 * validation beyond "is an integer".
 */
export const ObsInteger = ObsNumber.pipe(Schema.int())

/*
 * Nonnegative OBS integers model offsets, indices, frame counts, byte counts, and
 * capacities where zero is meaningful. They are not branded because the field name
 * supplies the unit and upper bound; this alias only captures the shared lower bound.
 */
export const ObsNonNegativeInteger = ObsNumber.pipe(Schema.int(), Schema.greaterThanOrEqualTo(0))

/*
 * Positive OBS integers model capacities and denominators where zero is invalid.
 * They are not branded because the schema only proves a shared numeric shape; the
 * domain meaning still comes from the containing field name.
 */
export const ObsPositiveInteger = ObsNumber.pipe(Schema.int(), Schema.positive())

/*
 * OBS unit intervals represent normalized ratios/sliders where 0 and 1 are valid
 * endpoints and floats are expected. This is not branded because it is a reusable
 * numeric shape for unrelated OBS fields such as opacity, balance, and positions.
 */
export const ObsUnitInterval = ObsNumber.pipe(Schema.greaterThanOrEqualTo(0), Schema.lessThanOrEqualTo(1))

/*
 * JSON object keys are strings by specification, and the empty key is valid JSON.
 * This is structural decoding rather than an OBS domain identifier, so it is not branded.
 */
export const JsonRecordKey = ObsString

export const StringArray = Schema.Array(ObsString)
export const UnknownRecord = Schema.Record({ key: JsonRecordKey, value: Schema.Unknown })

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
