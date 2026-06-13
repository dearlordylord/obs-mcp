import { Schema } from "effect"

import { ListCanvasesOutput } from "../../domain/schemas/canvases.js"
import type { ObsClient } from "../client.js"
import { GetCanvasList } from "../requests.js"

const stringField = (canvas: Readonly<Record<string, unknown>>, field: string): string | undefined =>
  typeof canvas[field] === "string" ? canvas[field] : undefined

const numberField = (canvas: Readonly<Record<string, unknown>>, field: string): number | undefined =>
  typeof canvas[field] === "number" && Number.isInteger(canvas[field]) && canvas[field] >= 0
    ? canvas[field]
    : undefined

export const listCanvases = async (client: ObsClient): Promise<ListCanvasesOutput> => {
  const response = await client.request(GetCanvasList)
  return Schema.decodeUnknownSync(ListCanvasesOutput)({
    canvases: response.canvases.map((canvas, index) => ({
      canvasIndex: numberField(canvas, "canvasIndex") ?? index,
      ...(stringField(canvas, "canvasName") === undefined ? {} : { canvasName: stringField(canvas, "canvasName") }),
      ...(stringField(canvas, "canvasUuid") === undefined ? {} : { canvasUuid: stringField(canvas, "canvasUuid") })
    }))
  })
}
