/**
 * `gsd learn` — learning / overlay maintenance (stub apply path; overlays merge at subagent load).
 */

export async function runLearnCli(argv: string[], _cwd: string): Promise<number> {
	if (argv[0] === "--help" || argv[0] === "-h") {
		process.stdout.write(`Usage: gsd learn apply (stub)

Full synthesis with LLM is not bundled here. Overlays under GSD_LEARN_OVERLAY_DIR
(or ~/.gsd/agent/agents/overlays/<agent>.md) are merged when subagents load.
`);
		return 0;
	}
	if (argv[0] === "apply") {
		process.stderr.write(
			"[gsd learn apply] Stub: add overlay files manually or extend with a model-backed job later.\n",
		);
		return 0;
	}
	process.stderr.write("Run: gsd learn apply   (see gsd learn --help)\n");
	return 1;
}
