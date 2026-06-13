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

export const ListGroupsOutput = Schema.Struct({
  groups: Schema.Array(Schema.String)
})
export type ListGroupsOutput = typeof ListGroupsOutput.Type
export const ListGroupsOutputJsonSchema = JSONSchema.make(ListGroupsOutput)

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

export const SetCurrentPreviewSceneInput = SceneLocator
export type SetCurrentPreviewSceneInput = typeof SetCurrentPreviewSceneInput.Type
export const SetCurrentPreviewSceneInputJsonSchema = JSONSchema.make(SetCurrentPreviewSceneInput)

export const SetCurrentPreviewSceneOutput = Schema.Struct({
  sceneName: Schema.optional(Schema.String),
  sceneUuid: Schema.optional(Schema.String),
  updated: Schema.Literal(true)
})
export type SetCurrentPreviewSceneOutput = typeof SetCurrentPreviewSceneOutput.Type
export const SetCurrentPreviewSceneOutputJsonSchema = JSONSchema.make(SetCurrentPreviewSceneOutput)

export const CreateSceneInput = Schema.Struct({
  sceneName: Schema.NonEmptyString,
  canvasUuid: Schema.optional(Schema.NonEmptyString)
})
export type CreateSceneInput = typeof CreateSceneInput.Type
export const CreateSceneInputJsonSchema = JSONSchema.make(CreateSceneInput)

export const CreateSceneOutput = Schema.Struct({
  sceneName: Schema.String,
  sceneUuid: Schema.optional(Schema.String),
  created: Schema.Literal(true)
})
export type CreateSceneOutput = typeof CreateSceneOutput.Type
export const CreateSceneOutputJsonSchema = JSONSchema.make(CreateSceneOutput)

export const RemoveSceneInput = SceneLocator
export type RemoveSceneInput = typeof RemoveSceneInput.Type
export const RemoveSceneInputJsonSchema = JSONSchema.make(RemoveSceneInput)

export const RemoveSceneOutput = Schema.Struct({
  sceneName: Schema.optional(Schema.String),
  sceneUuid: Schema.optional(Schema.String),
  canvasUuid: Schema.optional(Schema.String),
  removed: Schema.Literal(true)
})
export type RemoveSceneOutput = typeof RemoveSceneOutput.Type
export const RemoveSceneOutputJsonSchema = JSONSchema.make(RemoveSceneOutput)

const SetSceneNameFields = {
  newSceneName: Schema.NonEmptyString
} as const

export const SetSceneNameInput = Schema.Union(
  Schema.Struct({
    sceneName: Schema.NonEmptyString,
    sceneUuid: ForbiddenLocatorField,
    canvasUuid: Schema.optional(Schema.NonEmptyString),
    ...SetSceneNameFields
  }),
  Schema.Struct({
    sceneName: ForbiddenLocatorField,
    sceneUuid: Schema.NonEmptyString,
    canvasUuid: ForbiddenLocatorField,
    ...SetSceneNameFields
  })
)
export type SetSceneNameInput = typeof SetSceneNameInput.Type
export const SetSceneNameInputJsonSchema = JSONSchema.make(SetSceneNameInput)

export const SetSceneNameOutput = Schema.Struct({
  sceneName: Schema.optional(Schema.String),
  sceneUuid: Schema.optional(Schema.String),
  canvasUuid: Schema.optional(Schema.String),
  newSceneName: Schema.String,
  renamed: Schema.Literal(true)
})
export type SetSceneNameOutput = typeof SetSceneNameOutput.Type
export const SetSceneNameOutputJsonSchema = JSONSchema.make(SetSceneNameOutput)

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

const SceneItemLocatorFields = {
  sceneItemId: SceneItemId
} as const

export const SceneItemLocatorInput = Schema.Union(
  Schema.Struct({
    sceneName: Schema.NonEmptyString,
    sceneUuid: ForbiddenLocatorField,
    canvasUuid: Schema.optional(Schema.NonEmptyString),
    ...SceneItemLocatorFields
  }),
  Schema.Struct({
    sceneName: ForbiddenLocatorField,
    sceneUuid: Schema.NonEmptyString,
    canvasUuid: ForbiddenLocatorField,
    ...SceneItemLocatorFields
  })
)
export type SceneItemLocatorInput = typeof SceneItemLocatorInput.Type
export const SceneItemLocatorInputJsonSchema = JSONSchema.make(SceneItemLocatorInput)

export const GetSceneItemSourceInput = SceneItemLocatorInput
export type GetSceneItemSourceInput = typeof GetSceneItemSourceInput.Type
export const GetSceneItemSourceInputJsonSchema = JSONSchema.make(GetSceneItemSourceInput)

export const GetSceneItemSourceOutput = Schema.Struct({
  sourceName: Schema.String,
  sourceUuid: Schema.String
})
export type GetSceneItemSourceOutput = typeof GetSceneItemSourceOutput.Type
export const GetSceneItemSourceOutputJsonSchema = JSONSchema.make(GetSceneItemSourceOutput)

export const SourceNameLocator = Schema.Struct({
  sourceName: Schema.NonEmptyString,
  sourceUuid: ForbiddenLocatorField,
  canvasUuid: Schema.optional(Schema.NonEmptyString)
})
export type SourceNameLocator = typeof SourceNameLocator.Type

export const SourceUuidLocator = Schema.Struct({
  sourceName: ForbiddenLocatorField,
  sourceUuid: Schema.NonEmptyString,
  canvasUuid: ForbiddenLocatorField
})
export type SourceUuidLocator = typeof SourceUuidLocator.Type

export const SourceLocatorInput = Schema.Union(SourceNameLocator, SourceUuidLocator)
export type SourceLocatorInput = typeof SourceLocatorInput.Type
export const SourceLocatorInputJsonSchema = JSONSchema.make(SourceLocatorInput)

export const GetSourceActiveInput = SourceLocatorInput
export type GetSourceActiveInput = typeof GetSourceActiveInput.Type
export const GetSourceActiveInputJsonSchema = JSONSchema.make(GetSourceActiveInput)

export const GetSourceActiveOutput = Schema.Struct({
  videoActive: Schema.Boolean,
  videoShowing: Schema.Boolean,
  sourceName: Schema.optional(Schema.String),
  sourceUuid: Schema.optional(Schema.String)
})
export type GetSourceActiveOutput = typeof GetSourceActiveOutput.Type
export const GetSourceActiveOutputJsonSchema = JSONSchema.make(GetSourceActiveOutput)

export const GetSceneItemEnabledInput = SceneItemLocatorInput
export type GetSceneItemEnabledInput = typeof GetSceneItemEnabledInput.Type
export const GetSceneItemEnabledInputJsonSchema = JSONSchema.make(GetSceneItemEnabledInput)

export const GetSceneItemEnabledOutput = Schema.Struct({
  sceneItemEnabled: Schema.Boolean
})
export type GetSceneItemEnabledOutput = typeof GetSceneItemEnabledOutput.Type
export const GetSceneItemEnabledOutputJsonSchema = JSONSchema.make(GetSceneItemEnabledOutput)

export const SetSceneItemEnabledInput = Schema.Union(
  Schema.Struct({
    sceneName: Schema.NonEmptyString,
    sceneUuid: ForbiddenLocatorField,
    canvasUuid: Schema.optional(Schema.NonEmptyString),
    ...SceneItemLocatorFields,
    sceneItemEnabled: Schema.Boolean
  }),
  Schema.Struct({
    sceneName: ForbiddenLocatorField,
    sceneUuid: Schema.NonEmptyString,
    canvasUuid: ForbiddenLocatorField,
    ...SceneItemLocatorFields,
    sceneItemEnabled: Schema.Boolean
  })
)
export type SetSceneItemEnabledInput = typeof SetSceneItemEnabledInput.Type
export const SetSceneItemEnabledInputJsonSchema = JSONSchema.make(SetSceneItemEnabledInput)

export const SetSceneItemEnabledOutput = Schema.Struct({
  sceneItemEnabled: Schema.Boolean,
  updated: Schema.Literal(true)
})
export type SetSceneItemEnabledOutput = typeof SetSceneItemEnabledOutput.Type
export const SetSceneItemEnabledOutputJsonSchema = JSONSchema.make(SetSceneItemEnabledOutput)

export const GetSceneItemLockedInput = SceneItemLocatorInput
export type GetSceneItemLockedInput = typeof GetSceneItemLockedInput.Type
export const GetSceneItemLockedInputJsonSchema = JSONSchema.make(GetSceneItemLockedInput)

export const GetSceneItemLockedOutput = Schema.Struct({
  sceneItemLocked: Schema.Boolean
})
export type GetSceneItemLockedOutput = typeof GetSceneItemLockedOutput.Type
export const GetSceneItemLockedOutputJsonSchema = JSONSchema.make(GetSceneItemLockedOutput)

export const SetSceneItemLockedInput = Schema.Union(
  Schema.Struct({
    sceneName: Schema.NonEmptyString,
    sceneUuid: ForbiddenLocatorField,
    canvasUuid: Schema.optional(Schema.NonEmptyString),
    ...SceneItemLocatorFields,
    sceneItemLocked: Schema.Boolean
  }),
  Schema.Struct({
    sceneName: ForbiddenLocatorField,
    sceneUuid: Schema.NonEmptyString,
    canvasUuid: ForbiddenLocatorField,
    ...SceneItemLocatorFields,
    sceneItemLocked: Schema.Boolean
  })
)
export type SetSceneItemLockedInput = typeof SetSceneItemLockedInput.Type
export const SetSceneItemLockedInputJsonSchema = JSONSchema.make(SetSceneItemLockedInput)

export const SetSceneItemLockedOutput = Schema.Struct({
  sceneItemLocked: Schema.Boolean,
  updated: Schema.Literal(true)
})
export type SetSceneItemLockedOutput = typeof SetSceneItemLockedOutput.Type
export const SetSceneItemLockedOutputJsonSchema = JSONSchema.make(SetSceneItemLockedOutput)

export const GetSceneItemIndexInput = SceneItemLocatorInput
export type GetSceneItemIndexInput = typeof GetSceneItemIndexInput.Type
export const GetSceneItemIndexInputJsonSchema = JSONSchema.make(GetSceneItemIndexInput)

export const GetSceneItemIndexOutput = Schema.Struct({
  sceneItemIndex: Schema.Number.pipe(Schema.int(), Schema.greaterThanOrEqualTo(0))
})
export type GetSceneItemIndexOutput = typeof GetSceneItemIndexOutput.Type
export const GetSceneItemIndexOutputJsonSchema = JSONSchema.make(GetSceneItemIndexOutput)

export const SceneItemBlendMode = Schema.Literal(
  "OBS_BLEND_NORMAL",
  "OBS_BLEND_ADDITIVE",
  "OBS_BLEND_SUBTRACT",
  "OBS_BLEND_SCREEN",
  "OBS_BLEND_MULTIPLY",
  "OBS_BLEND_LIGHTEN",
  "OBS_BLEND_DARKEN"
)
export type SceneItemBlendMode = typeof SceneItemBlendMode.Type

export const GetSceneItemBlendModeInput = SceneItemLocatorInput
export type GetSceneItemBlendModeInput = typeof GetSceneItemBlendModeInput.Type
export const GetSceneItemBlendModeInputJsonSchema = JSONSchema.make(GetSceneItemBlendModeInput)

export const GetSceneItemBlendModeOutput = Schema.Struct({
  sceneItemBlendMode: SceneItemBlendMode
})
export type GetSceneItemBlendModeOutput = typeof GetSceneItemBlendModeOutput.Type
export const GetSceneItemBlendModeOutputJsonSchema = JSONSchema.make(GetSceneItemBlendModeOutput)

export const SetSceneItemIndexInput = Schema.Union(
  Schema.Struct({
    sceneName: Schema.NonEmptyString,
    sceneUuid: ForbiddenLocatorField,
    canvasUuid: Schema.optional(Schema.NonEmptyString),
    ...SceneItemLocatorFields,
    sceneItemIndex: Schema.Number.pipe(Schema.int(), Schema.greaterThanOrEqualTo(0))
  }),
  Schema.Struct({
    sceneName: ForbiddenLocatorField,
    sceneUuid: Schema.NonEmptyString,
    canvasUuid: ForbiddenLocatorField,
    ...SceneItemLocatorFields,
    sceneItemIndex: Schema.Number.pipe(Schema.int(), Schema.greaterThanOrEqualTo(0))
  })
)
export type SetSceneItemIndexInput = typeof SetSceneItemIndexInput.Type
export const SetSceneItemIndexInputJsonSchema = JSONSchema.make(SetSceneItemIndexInput)

export const SetSceneItemIndexOutput = Schema.Struct({
  sceneItemIndex: Schema.Number.pipe(Schema.int(), Schema.greaterThanOrEqualTo(0)),
  updated: Schema.Literal(true)
})
export type SetSceneItemIndexOutput = typeof SetSceneItemIndexOutput.Type
export const SetSceneItemIndexOutputJsonSchema = JSONSchema.make(SetSceneItemIndexOutput)

export const SetSceneItemBlendModeInput = Schema.Union(
  Schema.Struct({
    sceneName: Schema.NonEmptyString,
    sceneUuid: ForbiddenLocatorField,
    canvasUuid: Schema.optional(Schema.NonEmptyString),
    ...SceneItemLocatorFields,
    sceneItemBlendMode: SceneItemBlendMode
  }),
  Schema.Struct({
    sceneName: ForbiddenLocatorField,
    sceneUuid: Schema.NonEmptyString,
    canvasUuid: ForbiddenLocatorField,
    ...SceneItemLocatorFields,
    sceneItemBlendMode: SceneItemBlendMode
  })
)
export type SetSceneItemBlendModeInput = typeof SetSceneItemBlendModeInput.Type
export const SetSceneItemBlendModeInputJsonSchema = JSONSchema.make(SetSceneItemBlendModeInput)

export const SetSceneItemBlendModeOutput = Schema.Struct({
  sceneItemBlendMode: SceneItemBlendMode,
  updated: Schema.Literal(true)
})
export type SetSceneItemBlendModeOutput = typeof SetSceneItemBlendModeOutput.Type
export const SetSceneItemBlendModeOutputJsonSchema = JSONSchema.make(SetSceneItemBlendModeOutput)
