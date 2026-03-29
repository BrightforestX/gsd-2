/**
 * `gsd mcp bootstrap` — see `mcp-bootstrap.ts`.
 */

import { createJiti } from "@mariozechner/jiti";
import { fileURLToPath } from "node:url";
import { resolveBundledSourceResource } from "./bundled-resource-path.js";

const jiti = createJiti(fileURLToPath(import.meta.url), { interopDefault: true, debug: false });

function gsdMod(...segments: string[]) {
	return resolveBundledSourceResource(import.meta.url, "extensions", "gsd", ...segments);
}

export async function runMcpBootstrapCli(argv: string[], cwd: string): Promise<number> {
	const { runMcpBootstrapCommand } = (await jiti.import(gsdMod("mcp-bootstrap.ts"), {})) as typeof import("./resources/extensions/gsd/mcp-bootstrap.js");
	return runMcpBootstrapCommand(cwd, argv);
}
