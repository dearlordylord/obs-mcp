import { JSONSchema, Schema } from "effect"

import { ObsNonEmptyString, ObsNonNegativeInteger, ObsNumber, ObsString } from "./shared.js"

export const ListScenesInput = Schema.Struct({
  includeGroups: Schema.optionalWith(Schema.Boolean, { default: () => true })
})
export type ListScenesInput = typeof ListScenesInput.Type
export const ListScenesInputJsonSchema = JSONSchema.make(ListScenesInput)

export const SceneSummary = Schema.Struct({
  sceneName: ObsString,
  sceneUuid: Schema.optional(ObsString),
  sceneIndex: ObsNumber,
  isGroup: Schema.optional(Schema.Boolean)
})
export type SceneSummary = typeof SceneSummary.Type

export const ListScenesOutput = Schema.Struct({
  currentProgramSceneName: Schema.NullOr(ObsString),
  currentProgramSceneUuid: Schema.NullOr(ObsString),
  currentPreviewSceneName: Schema.optional(Schema.NullOr(ObsString)),
  currentPreviewSceneUuid: Schema.optional(Schema.NullOr(ObsString)),
  scenes: Schema.Array(SceneSummary)
})
export type ListScenesOutput = typeof ListScenesOutput.Type
export const ListScenesOutputJsonSchema = JSONSchema.make(ListScenesOutput)

export const ListGroupsOutput = Schema.Struct({
  groups: Schema.Array(ObsString)
})
export type ListGroupsOutput = typeof ListGroupsOutput.Type
export const ListGroupsOutputJsonSchema = JSONSchema.make(ListGroupsOutput)

export const CurrentSceneOutput = Schema.Struct({
  sceneName: ObsString,
  sceneUuid: Schema.optional(ObsString)
})
export type CurrentSceneOutput = typeof CurrentSceneOutput.Type
export const CurrentSceneOutputJsonSchema = JSONSchema.make(CurrentSceneOutput)

export const SetCurrentSceneInput = Schema.Struct({
  sceneName: ObsNonEmptyString
})
export type SetCurrentSceneInput = typeof SetCurrentSceneInput.Type
export const SetCurrentSceneInputJsonSchema = JSONSchema.make(SetCurrentSceneInput)

export const SetCurrentSceneOutput = Schema.Struct({
  sceneName: ObsString,
  switched: Schema.Literal(true)
})
export type SetCurrentSceneOutput = typeof SetCurrentSceneOutput.Type
export const SetCurrentSceneOutputJsonSchema = JSONSchema.make(SetCurrentSceneOutput)

const ForbiddenLocatorField = Schema.optional(Schema.Never)

const SceneNameLocatorFields = {
  sceneName: ObsNonEmptyString,
  sceneUuid: ForbiddenLocatorField,
  canvasUuid: Schema.optional(ObsNonEmptyString)
} as const

const SceneUuidLocatorFields = {
  sceneName: ForbiddenLocatorField,
  sceneUuid: ObsNonEmptyString,
  canvasUuid: ForbiddenLocatorField
} as const

export const SceneLocatorOutputFields = {
  sceneName: Schema.optional(ObsString),
  sceneUuid: Schema.optional(ObsString),
  canvasUuid: Schema.optional(ObsString)
} as const

const sceneLocatedInput = <Fields extends Schema.Struct.Fields>(fields: Fields) =>
  Schema.Union(
    Schema.Struct({
      ...SceneNameLocatorFields,
      ...fields
    }),
    Schema.Struct({
      ...SceneUuidLocatorFields,
      ...fields
    })
  )

export const SceneNameLocator = Schema.Struct(SceneNameLocatorFields)
export type SceneNameLocator = typeof SceneNameLocator.Type

export const SceneUuidLocator = Schema.Struct(SceneUuidLocatorFields)
export type SceneUuidLocator = typeof SceneUuidLocator.Type

export const SceneLocator = Schema.Union(SceneNameLocator, SceneUuidLocator)
export type SceneLocator = typeof SceneLocator.Type

const PreviewSceneNameLocator = Schema.Struct({
  sceneName: ObsNonEmptyString,
  sceneUuid: ForbiddenLocatorField,
  canvasUuid: ForbiddenLocatorField
})

export const SetCurrentPreviewSceneInput = Schema.Union(PreviewSceneNameLocator, SceneUuidLocator)
export type SetCurrentPreviewSceneInput = typeof SetCurrentPreviewSceneInput.Type
export const SetCurrentPreviewSceneInputJsonSchema = JSONSchema.make(SetCurrentPreviewSceneInput)

export const SetCurrentPreviewSceneOutput = Schema.Struct({
  sceneName: Schema.optional(ObsString),
  sceneUuid: Schema.optional(ObsString),
  updated: Schema.Literal(true)
})
export type SetCurrentPreviewSceneOutput = typeof SetCurrentPreviewSceneOutput.Type
export const SetCurrentPreviewSceneOutputJsonSchema = JSONSchema.make(SetCurrentPreviewSceneOutput)

export const CreateSceneInput = Schema.Struct({
  sceneName: ObsNonEmptyString,
  canvasUuid: Schema.optional(ObsNonEmptyString)
})
export type CreateSceneInput = typeof CreateSceneInput.Type
export const CreateSceneInputJsonSchema = JSONSchema.make(CreateSceneInput)

export const CreateSceneOutput = Schema.Struct({
  sceneName: ObsString,
  sceneUuid: Schema.optional(ObsString),
  created: Schema.Literal(true)
})
export type CreateSceneOutput = typeof CreateSceneOutput.Type
export const CreateSceneOutputJsonSchema = JSONSchema.make(CreateSceneOutput)

export const RemoveSceneInput = SceneLocator
export type RemoveSceneInput = typeof RemoveSceneInput.Type
export const RemoveSceneInputJsonSchema = JSONSchema.make(RemoveSceneInput)

export const RemoveSceneOutput = Schema.Struct({
  ...SceneLocatorOutputFields,
  removed: Schema.Literal(true)
})
export type RemoveSceneOutput = typeof RemoveSceneOutput.Type
export const RemoveSceneOutputJsonSchema = JSONSchema.make(RemoveSceneOutput)

const SetSceneNameFields = {
  newSceneName: ObsNonEmptyString
} as const

export const SetSceneNameInput = sceneLocatedInput(SetSceneNameFields)
export type SetSceneNameInput = typeof SetSceneNameInput.Type
export const SetSceneNameInputJsonSchema = JSONSchema.make(SetSceneNameInput)

export const SetSceneNameOutput = Schema.Struct({
  ...SceneLocatorOutputFields,
  newSceneName: ObsString,
  renamed: Schema.Literal(true)
})
export type SetSceneNameOutput = typeof SetSceneNameOutput.Type
export const SetSceneNameOutputJsonSchema = JSONSchema.make(SetSceneNameOutput)

const MinTransitionDuration = 50
const MaxTransitionDuration = 20000
// Scene transition duration is a bounded structural millisecond value, not a branded transition identity.
const TransitionDuration = ObsNumber.pipe(
  Schema.greaterThanOrEqualTo(MinTransitionDuration),
  Schema.lessThanOrEqualTo(MaxTransitionDuration)
)

export const GetSceneTransitionOverrideInput = SceneLocator
export type GetSceneTransitionOverrideInput = typeof GetSceneTransitionOverrideInput.Type
export const GetSceneTransitionOverrideInputJsonSchema = JSONSchema.make(GetSceneTransitionOverrideInput)

export const SceneTransitionOverrideOutput = Schema.Struct({
  transitionName: Schema.NullOr(ObsString),
  transitionDuration: Schema.NullOr(ObsNumber)
})
export type SceneTransitionOverrideOutput = typeof SceneTransitionOverrideOutput.Type
export const SceneTransitionOverrideOutputJsonSchema = JSONSchema.make(SceneTransitionOverrideOutput)

const SetSceneTransitionOverrideFields = {
  transitionName: Schema.optional(Schema.NullOr(ObsNonEmptyString)),
  transitionDuration: Schema.optional(Schema.NullOr(TransitionDuration))
} as const

export const SetSceneTransitionOverrideInput = sceneLocatedInput(SetSceneTransitionOverrideFields)
export type SetSceneTransitionOverrideInput = typeof SetSceneTransitionOverrideInput.Type
export const SetSceneTransitionOverrideInputJsonSchema = JSONSchema.make(SetSceneTransitionOverrideInput)

export const SetSceneTransitionOverrideOutput = Schema.Struct({
  ...SceneLocatorOutputFields,
  transitionName: Schema.optional(Schema.NullOr(ObsString)),
  transitionDuration: Schema.optional(Schema.NullOr(ObsNumber)),
  updated: Schema.Literal(true)
})
export type SetSceneTransitionOverrideOutput = typeof SetSceneTransitionOverrideOutput.Type
export const SetSceneTransitionOverrideOutputJsonSchema = JSONSchema.make(SetSceneTransitionOverrideOutput)

const SceneItemId = ObsNonNegativeInteger
const LastMatchSearchOffset = -1
// OBS permits -1 as a "last match" search sentinel; this locator offset is structural, not branded.
const SceneItemSearchOffset = ObsNumber.pipe(Schema.int(), Schema.greaterThanOrEqualTo(LastMatchSearchOffset))

export const SceneItemSummary = Schema.Struct({
  sceneItemId: SceneItemId,
  sceneItemIndex: ObsNonNegativeInteger,
  sourceName: ObsString,
  sourceUuid: Schema.optional(ObsString),
  sourceType: Schema.optional(ObsString),
  inputKind: Schema.optional(Schema.NullOr(ObsString)),
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
  sourceName: ObsNonEmptyString,
  searchOffset: Schema.optional(SceneItemSearchOffset)
} as const

export const GetSceneItemIdInput = sceneLocatedInput(SceneItemIdLookupFields)
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

export const SceneItemLocatorInput = sceneLocatedInput(SceneItemLocatorFields)
export type SceneItemLocatorInput = typeof SceneItemLocatorInput.Type
export const SceneItemLocatorInputJsonSchema = JSONSchema.make(SceneItemLocatorInput)

export const GetSceneItemSourceInput = SceneItemLocatorInput
export type GetSceneItemSourceInput = typeof GetSceneItemSourceInput.Type
export const GetSceneItemSourceInputJsonSchema = JSONSchema.make(GetSceneItemSourceInput)

export const GetSceneItemSourceOutput = Schema.Struct({
  sourceName: ObsString,
  sourceUuid: ObsString
})
export type GetSceneItemSourceOutput = typeof GetSceneItemSourceOutput.Type
export const GetSceneItemSourceOutputJsonSchema = JSONSchema.make(GetSceneItemSourceOutput)

export const SourceNameLocator = Schema.Struct({
  sourceName: ObsNonEmptyString,
  sourceUuid: ForbiddenLocatorField,
  canvasUuid: Schema.optional(ObsNonEmptyString)
})
export type SourceNameLocator = typeof SourceNameLocator.Type

export const SourceUuidLocator = Schema.Struct({
  sourceName: ForbiddenLocatorField,
  sourceUuid: ObsNonEmptyString,
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
  sourceName: Schema.optional(ObsString),
  sourceUuid: Schema.optional(ObsString)
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

export const SetSceneItemEnabledInput = sceneLocatedInput({
  ...SceneItemLocatorFields,
  sceneItemEnabled: Schema.Boolean
})
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

export const SetSceneItemLockedInput = sceneLocatedInput({
  ...SceneItemLocatorFields,
  sceneItemLocked: Schema.Boolean
})
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
  sceneItemIndex: ObsNonNegativeInteger
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

export const SetSceneItemIndexInput = sceneLocatedInput({
  ...SceneItemLocatorFields,
  sceneItemIndex: ObsNonNegativeInteger
})
export type SetSceneItemIndexInput = typeof SetSceneItemIndexInput.Type
export const SetSceneItemIndexInputJsonSchema = JSONSchema.make(SetSceneItemIndexInput)

export const SetSceneItemIndexOutput = Schema.Struct({
  sceneItemIndex: ObsNonNegativeInteger,
  updated: Schema.Literal(true)
})
export type SetSceneItemIndexOutput = typeof SetSceneItemIndexOutput.Type
export const SetSceneItemIndexOutputJsonSchema = JSONSchema.make(SetSceneItemIndexOutput)

export const SetSceneItemBlendModeInput = sceneLocatedInput({
  ...SceneItemLocatorFields,
  sceneItemBlendMode: SceneItemBlendMode
})
export type SetSceneItemBlendModeInput = typeof SetSceneItemBlendModeInput.Type
export const SetSceneItemBlendModeInputJsonSchema = JSONSchema.make(SetSceneItemBlendModeInput)

export const SetSceneItemBlendModeOutput = Schema.Struct({
  sceneItemBlendMode: SceneItemBlendMode,
  updated: Schema.Literal(true)
})
export type SetSceneItemBlendModeOutput = typeof SetSceneItemBlendModeOutput.Type
export const SetSceneItemBlendModeOutputJsonSchema = JSONSchema.make(SetSceneItemBlendModeOutput)
