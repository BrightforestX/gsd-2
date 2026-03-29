/**
 * `gsd research` — materialize RESEARCH.md scaffold + optional MCP merge.
 */

import { createJiti } from "@mariozechner/jiti";
import { fileURLToPath } from "node:url";
import { resolveBundledSourceResource } from "./bundled-resource-path.js";

const jiti = createJiti(fileURLToPath(import.meta.url), { interopDefault: true, debug: false });

function gsdMod(...segments: string[]) {
	return resolveBundledSourceResource(import.meta.url, "extensions", "gsd", ...segments);
}

export async function runResearchCli(argv: string[], cwd: string): Promise<number> {
	if (argv[0] === "--help" || argv[0] === "-h") {
		process.stdout.write(`Usage: gsd research [options]

Writes the same research scaffold as /gsd dispatch research (Mxxx-RESEARCH.md or Sxx-RESEARCH.md).

Options:
  --milestone     Force milestone-level research
  --slice         Force slice-level research
  --mcp <name>    Merge output from an MCP server (requires --mcp-tool)
  --mcp-tool <t>  Tool name on that server
  --mcp-args <j>  JSON object of tool arguments (default: {})
`);
		return 0;
	}

	const { runResearchCliInner, parseResearchCliArgs } = (await jiti.import(
		gsdMod("research-cli-run.ts"),
		{},
	)) as typeof import("./resources/extensions/gsd/research-cli-run.js");

	let parsed;
	try {
		parsed = parseResearchCliArgs(argv);
	} catch (e) {
		process.stderr.write(`${e instanceof Error ? e.message : String(e)}\n`);
		return 1;
	}

	const r = await runResearchCliInner(cwd, {
		forceSlice: parsed.forceSlice,
		forceMilestone: parsed.forceMilestone,
		mcpServer: parsed.mcpServer,
		mcpTool: parsed.mcpTool,
		mcpArgs: parsed.mcpArgs,
	});

	if (!r.ok) {
		process.stderr.write(`${r.message}\n`);
		return r.code;
	}
	if (r.message.startsWith("Research file already exists")) {
		process.stderr.write(`${r.message}\n`);
	} else {
		process.stdout.write(`${r.message}\n`);
	}
	return 0;
}
