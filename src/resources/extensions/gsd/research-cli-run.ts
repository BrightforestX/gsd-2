/**
 * Shared runner for `gsd research` and `/gsd research`.
 */

import { mkdirSync, writeFileSync, existsSync } from "node:fs";
import { dirname } from "node:path";
import { planResearchArtifact, type ResearchCliCoreOptions } from "./research-cli-core.js";
import { callMcpToolProgrammatic } from "../mcp-client/index.js";

/** Parse a single string (e.g. slash args) into argv tokens; supports "..." quotes. */
export function parseResearchArgvFromString(s: string): string[] {
	const t = s.trim();
	if (!t) return [];
	const out: string[] = [];
	let cur = "";
	let quote: string | null = null;
	for (let i = 0; i < t.length; i++) {
		const c = t[i]!;
		if (quote) {
			if (c === quote) {
				quote = null;
				continue;
			}
			cur += c;
			continue;
		}
		if (c === '"' || c === "'") {
			quote = c;
			continue;
		}
		if (/\s/.test(c)) {
			if (cur) {
				out.push(cur);
				cur = "";
			}
			continue;
		}
		cur += c;
	}
	if (cur) out.push(cur);
	return out;
}

export type ParsedResearchCli = {
	forceSlice: boolean;
	forceMilestone: boolean;
	mcpServer?: string;
	mcpTool?: string;
	mcpArgs: Record<string, unknown>;
};

export function parseResearchCliArgs(argv: string[]): ParsedResearchCli {
	const out: ParsedResearchCli = {
		forceSlice: false,
		forceMilestone: false,
		mcpArgs: {},
	};
	for (let i = 0; i < argv.length; i++) {
		const a = argv[i];
		if (a === "--slice") {
			out.forceSlice = true;
			continue;
		}
		if (a === "--milestone") {
			out.forceMilestone = true;
			continue;
		}
		if (a === "--mcp" && argv[i + 1]) {
			out.mcpServer = argv[++i];
			continue;
		}
		if (a === "--mcp-tool" && argv[i + 1]) {
			out.mcpTool = argv[++i];
			continue;
		}
		if (a === "--mcp-args" && argv[i + 1]) {
			try {
				out.mcpArgs = JSON.parse(argv[++i]!) as Record<string, unknown>;
			} catch {
				throw new Error(`Invalid JSON for --mcp-args`);
			}
			continue;
		}
	}
	return out;
}

export type ResearchRunOpts = ResearchCliCoreOptions & {
	mcpServer?: string;
	mcpTool?: string;
	mcpArgs?: Record<string, unknown>;
};

function buildMarkdownBody(params: {
	unitType: string;
	unitId: string;
	prompt: string;
	mcpServer?: string;
	mcpTool?: string;
	mcpText?: string;
}): string {
	const lines: string[] = [];
	lines.push("---");
	lines.push("gsd_research_cli: true");
	lines.push(`unit_type: ${params.unitType}`);
	lines.push(`unit_id: ${params.unitId}`);
	if (params.mcpServer) lines.push(`mcp_server: ${params.mcpServer}`);
	if (params.mcpTool) lines.push(`mcp_tool: ${params.mcpTool}`);
	lines.push("---");
	lines.push("");
	lines.push("# Research (GSD CLI)");
	lines.push("");
	if (params.mcpText) {
		lines.push("## MCP notes");
		lines.push("");
		lines.push(params.mcpText.trim());
		lines.push("");
	}
	lines.push("## Dispatch prompt");
	lines.push("");
	lines.push("The following matches the prompt auto-dispatch would send for this unit:");
	lines.push("");
	lines.push("```text");
	lines.push(params.prompt.trimEnd());
	lines.push("```");
	lines.push("");
	return lines.join("\n");
}

export type ResearchRunResult =
	| { ok: true; message: string; path?: string }
	| { ok: false; message: string; code: number };

export async function runResearchCliInner(cwd: string, opts: ResearchRunOpts): Promise<ResearchRunResult> {
	if (opts.mcpServer && !opts.mcpTool) {
		return { ok: false, code: 1, message: "--mcp requires --mcp-tool" };
	}

	const plan = await planResearchArtifact(cwd, {
		forceSlice: opts.forceSlice,
		forceMilestone: opts.forceMilestone,
	});
	if (!plan.ok) {
		return { ok: false, code: 1, message: plan.message };
	}

	let mcpText: string | undefined;
	if (opts.mcpServer && opts.mcpTool) {
		try {
			mcpText = await callMcpToolProgrammatic(
				opts.mcpServer,
				opts.mcpTool,
				opts.mcpArgs ?? {},
			);
		} catch (e) {
			const msg = e instanceof Error ? e.message : String(e);
			return { ok: false, code: 1, message: `MCP call failed: ${msg}` };
		}
	}

	const fullBody = buildMarkdownBody({
		unitType: plan.unitType,
		unitId: plan.unitId,
		prompt: plan.prompt,
		mcpServer: opts.mcpServer,
		mcpTool: opts.mcpTool,
		mcpText,
	});

	const target = plan.targetPath;
	if (plan.existingContent && !opts.mcpServer) {
		return {
			ok: true,
			message: `Research file already exists:\n  ${target}\nPass --mcp and --mcp-tool to append MCP notes, or edit the file manually.`,
			path: target,
		};
	}

	if (plan.existingContent && opts.mcpServer) {
		const stamp = new Date().toISOString();
		const append =
			`\n\n## MCP notes (${stamp})\n\n` + (mcpText ?? "").trim() + "\n";
		writeFileSync(target, plan.existingContent.trimEnd() + append, "utf-8");
		return { ok: true, message: `Appended MCP notes to ${target}`, path: target };
	}

	const dir = dirname(target);
	if (!existsSync(dir)) {
		mkdirSync(dir, { recursive: true });
	}
	writeFileSync(target, fullBody, "utf-8");
	return { ok: true, message: `Wrote ${target}`, path: target };
}
