/**
 * engine-resolver.ts — Route sessions to engine/policy pairs.
 *
 * Routes `null` and `"dev"` engine IDs to the DevWorkflowEngine/DevExecutionPolicy
 * pair. Respects `GSD_ENGINE_BYPASS=1` kill switch to skip the engine layer entirely.
 */

import type { WorkflowEngine } from "./workflow-engine.js";
import type { ExecutionPolicy } from "./execution-policy.js";
import { DevWorkflowEngine } from "./dev-workflow-engine.js";
import { DevExecutionPolicy } from "./dev-execution-policy.js";

/** A resolved engine + policy pair ready for the auto-loop. */
export interface ResolvedEngine {
  engine: WorkflowEngine;
  policy: ExecutionPolicy;
}

/**
 * Resolve an engine/policy pair for the given session.
 *
 * - `GSD_ENGINE_BYPASS=1` → throws (fall through to direct auto-mode path)
 * - `null` or `"dev"` → DevWorkflowEngine + DevExecutionPolicy
 * - anything else → throws (unknown engine)
 */
export function resolveEngine(
  session: { activeEngineId: string | null },
): ResolvedEngine {
  if (process.env.GSD_ENGINE_BYPASS === "1") {
    throw new Error(
      "Engine layer bypassed (GSD_ENGINE_BYPASS=1) — falling through to direct auto-mode path",
    );
  }

  const { activeEngineId } = session;

  if (activeEngineId === null || activeEngineId === "dev") {
    return {
      engine: new DevWorkflowEngine(),
      policy: new DevExecutionPolicy(),
    };
  }

  throw new Error(
    `Unknown engine ID: "${activeEngineId}" — only "dev" is registered`,
  );
}
