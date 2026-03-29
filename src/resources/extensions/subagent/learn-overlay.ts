/**
 * Merge per-agent markdown overlays (GSD_LEARN_OVERLAY_DIR or ~/.gsd/agent/agents/overlays).
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { homedir } from "node:os";

function overlayDir(): string {
	const raw = process.env.GSD_LEARN_OVERLAY_DIR?.trim();
	if (raw && path.isAbsolute(raw)) return raw;
	return path.join(homedir(), ".gsd", "agent", "agents", "overlays");
}

/** Safe filename fragment for overlay files. */
export function safeAgentFileKey(agentName: string): string {
	return agentName.replace(/[^a-zA-Z0-9_-]/g, "_");
}

/**
 * Append overlay markdown after the bundled agent body when a matching file exists.
 */
export function appendLearnOverlayMarkdown(agentName: string, body: string): string {
	const dir = overlayDir();
	const p = path.join(dir, `${safeAgentFileKey(agentName)}.md`);
	if (!fs.existsSync(p)) return body;
	try {
		const extra = fs.readFileSync(p, "utf-8").trim();
		if (!extra) return body;
		return `${body}\n\n## Learned overlay (${agentName})\n\n${extra}\n`;
	} catch {
		return body;
	}
}
