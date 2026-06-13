import { JSONSchema, Schema } from "effect"

export const ListScenesInput = Schema.Struct({
  includeGroups: Schema.optionalWith(Schema.Boolean, { default: () => true })
})
export type ListScenesInput = typeof ListScenesInput.Type
export const ListScenesInputJsonSchema = JSONSchema.make(ListScenesInput)

export const SceneSummary = Schema.Struct({
  sceneName: Schema.String,
  sceneUuid: Schema.optional(Schema.String),
  sceneIndex: Schema.Number,
  isGroup: Schema.optional(Schema.Boolean)
})
export type SceneSummary = typeof SceneSummary.Type

export const ListScenesOutput = Schema.Struct({
  currentProgramSceneName: Schema.NullOr(Schema.String),
  currentProgramSceneUuid: Schema.NullOr(Schema.String),
  currentPreviewSceneName: Schema.optional(Schema.NullOr(Schema.String)),
  currentPreviewSceneUuid: Schema.optional(Schema.NullOr(Schema.String)),
  scenes: Schema.Array(SceneSummary)
})
export type ListScenesOutput = typeof ListScenesOutput.Type
export const ListScenesOutputJsonSchema = JSONSchema.make(ListScenesOutput)

export const CurrentSceneOutput = Schema.Struct({
  sceneName: Schema.String,
  sceneUuid: Schema.optional(Schema.String)
})
export type CurrentSceneOutput = typeof CurrentSceneOutput.Type
export const CurrentSceneOutputJsonSchema = JSONSchema.make(CurrentSceneOutput)

export const SetCurrentSceneInput = Schema.Struct({
  sceneName: Schema.NonEmptyString
})
export type SetCurrentSceneInput = typeof SetCurrentSceneInput.Type
export const SetCurrentSceneInputJsonSchema = JSONSchema.make(SetCurrentSceneInput)

export const SetCurrentSceneOutput = Schema.Struct({
  sceneName: Schema.String,
  switched: Schema.Literal(true)
})
export type SetCurrentSceneOutput = typeof SetCurrentSceneOutput.Type
export const SetCurrentSceneOutputJsonSchema = JSONSchema.make(SetCurrentSceneOutput)

const ForbiddenLocatorField = Schema.optional(Schema.Never)

export const SceneNameLocator = Schema.Struct({
  sceneName: Schema.NonEmptyString,
  sceneUuid: ForbiddenLocatorField,
  canvasUuid: Schema.optional(Schema.NonEmptyString)
})
export type SceneNameLocator = typeof SceneNameLocator.Type

export const SceneUuidLocator = Schema.Struct({
  sceneName: ForbiddenLocatorField,
  sceneUuid: Schema.NonEmptyString,
  canvasUuid: ForbiddenLocatorField
})
export type SceneUuidLocator = typeof SceneUuidLocator.Type

export const SceneLocator = Schema.Union(SceneNameLocator, SceneUuidLocator)
export type SceneLocator = typeof SceneLocator.Type

const SceneItemId = Schema.Number.pipe(Schema.int(), Schema.greaterThanOrEqualTo(0))
const LastMatchSearchOffset = -1

export const SceneItemSummary = Schema.Struct({
  sceneItemId: SceneItemId,
  sceneItemIndex: Schema.Number.pipe(Schema.int(), Schema.greaterThanOrEqualTo(0)),
  sourceName: Schema.String,
  sourceUuid: Schema.optional(Schema.String),
  sourceType: Schema.optional(Schema.String),
  inputKind: Schema.optional(Schema.NullOr(Schema.String)),
  isGroup: Schema.optional(Schema.NullOr(Schema.Boolean))
})
export type SceneItemSummary = typeof SceneItemSummary.Type

export const ListSceneItemsInput = SceneLocator
export type ListSceneItemsInput = typeof ListSceneItemsInput.Type
export const ListSceneItemsInputJsonSchema = JSONSchema.make(ListSceneItemsInput)

export const ListSceneItemsOutput = Schema.Struct({
  sceneItems: Schema.Array(SceneItemSummary)
})
export type ListSceneItemsOutput = typeof ListSceneItemsOutput.Type
export const ListSceneItemsOutputJsonSchema = JSONSchema.make(ListSceneItemsOutput)

export const ListGroupSceneItemsInput = SceneLocator
export type ListGroupSceneItemsInput = typeof ListGroupSceneItemsInput.Type
export const ListGroupSceneItemsInputJsonSchema = JSONSchema.make(ListGroupSceneItemsInput)

export const ListGroupSceneItemsOutput = ListSceneItemsOutput
export type ListGroupSceneItemsOutput = typeof ListGroupSceneItemsOutput.Type
export const ListGroupSceneItemsOutputJsonSchema = JSONSchema.make(ListGroupSceneItemsOutput)

const SceneItemIdLookupFields = {
  sourceName: Schema.NonEmptyString,
  searchOffset: Schema.optional(Schema.Number.pipe(Schema.int(), Schema.greaterThanOrEqualTo(LastMatchSearchOffset)))
} as const

export const GetSceneItemIdInput = Schema.Union(
  Schema.Struct({
    sceneName: Schema.NonEmptyString,
    sceneUuid: ForbiddenLocatorField,
    canvasUuid: Schema.optional(Schema.NonEmptyString),
    ...SceneItemIdLookupFields
  }),
  Schema.Struct({
    sceneName: ForbiddenLocatorField,
    sceneUuid: Schema.NonEmptyString,
    canvasUuid: ForbiddenLocatorField,
    ...SceneItemIdLookupFields
  })
)
export type GetSceneItemIdInput = typeof GetSceneItemIdInput.Type
export const GetSceneItemIdInputJsonSchema = JSONSchema.make(GetSceneItemIdInput)

export const GetSceneItemIdOutput = Schema.Struct({
  sceneItemId: SceneItemId
})
export type GetSceneItemIdOutput = typeof GetSceneItemIdOutput.Type
export const GetSceneItemIdOutputJsonSchema = JSONSchema.make(GetSceneItemIdOutput)

const SceneItemSourceLookupFields = {
  sceneItemId: SceneItemId
} as const

export const GetSceneItemSourceInput = Schema.Union(
  Schema.Struct({
    sceneName: Schema.NonEmptyString,
    sceneUuid: ForbiddenLocatorField,
    canvasUuid: Schema.optional(Schema.NonEmptyString),
    ...SceneItemSourceLookupFields
  }),
  Schema.Struct({
    sceneName: ForbiddenLocatorField,
    sceneUuid: Schema.NonEmptyString,
    canvasUuid: ForbiddenLocatorField,
    ...SceneItemSourceLookupFields
  })
)
export type GetSceneItemSourceInput = typeof GetSceneItemSourceInput.Type
export const GetSceneItemSourceInputJsonSchema = JSONSchema.make(GetSceneItemSourceInput)

export const GetSceneItemSourceOutput = Schema.Struct({
  sourceName: Schema.String,
  sourceUuid: Schema.String
})
export type GetSceneItemSourceOutput = typeof GetSceneItemSourceOutput.Type
export const GetSceneItemSourceOutputJsonSchema = JSONSchema.make(GetSceneItemSourceOutput)
