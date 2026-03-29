/**
 * MCP bootstrap — catalog match + .mcp.json merge (dry-run / apply).
 */

import { readFileSync, existsSync, writeFileSync, mkdirSync } from "node:fs";
import { isAbsolute, join } from "node:path";
import { fileURLToPath } from "node:url";

export interface McpCatalogEntry {
	id: string;
	title: string;
	npmPackage?: string;
	match?: { hasFile?: string };
	mcpServerKey: string;
	stdioCommand: string;
	stdioArgs: string[];
}

const catalogPath = fileURLToPath(new URL("./data/mcp-catalog.json", import.meta.url));

export function loadMcpCatalog(): McpCatalogEntry[] {
	return JSON.parse(readFileSync(catalogPath, "utf-8")) as McpCatalogEntry[];
}

export function matchMcpCatalog(projectRoot: string): McpCatalogEntry[] {
	const out: McpCatalogEntry[] = [];
	for (const entry of loadMcpCatalog()) {
		const rel = entry.match?.hasFile;
		if (rel && existsSync(join(projectRoot, rel))) {
			out.push(entry);
		}
	}
	return out;
}

export function substituteArgs(args: string[], projectRoot: string): string[] {
	return args.map((a) => a.replace(/\{\{ROOT\}\}/g, projectRoot));
}

export function buildMcpServersPatch(
	projectRoot: string,
	matches: McpCatalogEntry[],
): Record<string, { command: string; args: string[] }> {
	const servers: Record<string, { command: string; args: string[] }> = {};
	for (const m of matches) {
		servers[m.mcpServerKey] = {
			command: m.stdioCommand,
			args: substituteArgs([...m.stdioArgs], projectRoot),
		};
	}
	return servers;
}

export function mergeMcpServers(
	existing: Record<string, unknown>,
	patch: Record<string, { command: string; args: string[] }>,
): Record<string, unknown> {
	return { ...existing, ...patch };
}

export function readMcpJsonPath(cwd: string): string {
	return join(cwd, ".mcp.json");
}

export function readOrEmptyMcpServers(cwd: string): Record<string, unknown> {
	const p = readMcpJsonPath(cwd);
	if (!existsSync(p)) return {};
	try {
		const data = JSON.parse(readFileSync(p, "utf-8")) as {
			mcpServers?: Record<string, unknown>;
		};
		return data.mcpServers && typeof data.mcpServers === "object" ? { ...data.mcpServers } : {};
	} catch {
		return {};
	}
}

export function writeMcpJson(cwd: string, mcpServers: Record<string, unknown>): void {
	const p = readMcpJsonPath(cwd);
	const prev: Record<string, unknown> = existsSync(p)
		? (JSON.parse(readFileSync(p, "utf-8")) as Record<string, unknown>)
		: {};
	const next = { ...prev, mcpServers };
	writeFileSync(p, JSON.stringify(next, null, 2) + "\n", "utf-8");
}

export function requireAbsoluteToolsRoot(): string {
	const raw = process.env.GSD_MCP_TOOLS_ROOT?.trim();
	if (!raw) {
		throw new Error(
			"GSD_MCP_TOOLS_ROOT must be set to an absolute path for mcp bootstrap --apply (example: /opt/mcp-tools)",
		);
	}
	if (!isAbsolute(raw)) {
		throw new Error(`GSD_MCP_TOOLS_ROOT must be an absolute path, got: ${raw}`);
	}
	return raw;
}

export function materializeCatalogMarkers(toolsRoot: string, matches: McpCatalogEntry[]): void {
	mkdirSync(toolsRoot, { recursive: true });
	for (const m of matches) {
		const dir = join(toolsRoot, m.id);
		mkdirSync(dir, { recursive: true });
		writeFileSync(
			join(dir, "README.txt"),
			`GSD MCP bootstrap marker for ${m.id}\nPackage: ${m.npmPackage ?? "n/a"}\n`,
			"utf-8",
		);
	}
}

export async function runMcpBootstrapCommand(cwd: string, argv: string[]): Promise<number> {
	const apply = argv.includes("--apply");
	const yes = argv.includes("--yes");

	if (!apply || argv.includes("--dry-run")) {
		const matches = matchMcpCatalog(cwd);
		const patch = buildMcpServersPatch(cwd, matches);
		process.stdout.write(
			JSON.stringify(
				{ dryRun: true, matched: matches.map((m) => m.id), wouldMerge: patch },
				null,
				2,
			) + "\n",
		);
		return 0;
	}

	if (!yes && process.stdin.isTTY) {
		process.stderr.write(
			"mcp bootstrap --apply requires --yes when stdin is a TUI (or use --dry-run).\n",
		);
		return 1;
	}

	try {
		// Test-only: exercise `catch` non-Error path when GSD_TEST_MCP_BOOTSTRAP_THROW=1 (cleared after read).
		if (process.env.GSD_TEST_MCP_BOOTSTRAP_THROW === "1") {
			delete process.env.GSD_TEST_MCP_BOOTSTRAP_THROW;
			throw "mcp-bootstrap-test-non-error";
		}
		const toolsRoot = requireAbsoluteToolsRoot();
		const matches = matchMcpCatalog(cwd);
		const patch = buildMcpServersPatch(cwd, matches);
		materializeCatalogMarkers(toolsRoot, matches);
		const existing = readOrEmptyMcpServers(cwd);
		const merged = mergeMcpServers(existing, patch);
		writeMcpJson(cwd, merged);
		process.stdout.write(`Wrote ${readMcpJsonPath(cwd)} and markers under ${toolsRoot}\n`);
		return 0;
	} catch (e) {
		process.stderr.write(`${e instanceof Error ? e.message : String(e)}\n`);
		return 1;
	}
}
