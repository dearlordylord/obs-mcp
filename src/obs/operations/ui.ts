import { Schema } from "effect"

import { StudioModeEnabledOutput } from "../../domain/schemas/ui.js"
import type { ObsClient } from "../client.js"
import { GetStudioModeEnabled } from "../requests.js"

export const getStudioModeEnabled = async (client: ObsClient): Promise<StudioModeEnabledOutput> =>
  Schema.decodeUnknownSync(StudioModeEnabledOutput)(await client.request(GetStudioModeEnabled))
