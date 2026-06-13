import { RunObsRequestBatchInput, RunObsRequestBatchOutput } from "../../domain/schemas/index.js"
import { runObsRequestBatch } from "../../obs/operations/batch.js"
import { defineTool, type ToolDefinition } from "./mechanics.js"

const CATEGORY = "batch" as const

export const batchTools: ReadonlyArray<ToolDefinition> = [
  defineTool({
    name: "run_obs_request_batch",
    title: "Run OBS Request Batch",
    description:
      "Run a schema-limited OBS request batch with optional batch-only Sleep items. Exposed only by the batch toolset; arbitrary raw request batches and standalone sleep are not exposed.",
    category: CATEGORY,
    requiredObsRequests: ["GetCurrentProgramScene", "SetCurrentProgramScene", "Sleep"],
    inputSchema: RunObsRequestBatchInput,
    outputSchema: RunObsRequestBatchOutput,
    handler: async (input, context) => runObsRequestBatch(context.client, input)
  })
]
