import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
	matchMcpCatalog,
	mergeMcpServers,
	buildMcpServersPatch,
	substituteArgs,
	readMcpJsonPath,
	readOrEmptyMcpServers,
	writeMcpJson,
	requireAbsoluteToolsRoot,
	materializeCatalogMarkers,
	runMcpBootstrapCommand,
	loadMcpCatalog,
	type McpCatalogEntry,
} from "../mcp-bootstrap.js";

function captureIo<T>(fn: () => Promise<T>): Promise<{ result: T; stdout: string; stderr: string }> {
	const out: string[] = [];
	const err: string[] = [];
	const ow = process.stdout.write.bind(process.stdout);
	const ew = process.stderr.write.bind(process.stderr);
	process.stdout.write = (c: string | Uint8Array) => {
		out.push(String(c));
		return true;
	};
	process.stderr.write = (c: string | Uint8Array) => {
		err.push(String(c));
		return true;
	};
	return fn()
		.then((result) => ({ result, stdout: out.join(""), stderr: err.join("") }))
		.finally(() => {
			process.stdout.write = ow;
			process.stderr.write = ew;
		});
}

test("loadMcpCatalog includes node matcher and no-signal entry", () => {
	const c = loadMcpCatalog();
	assert.ok(c.some((x) => x.id === "node-npm-generic"));
	assert.ok(c.some((x) => x.id === "catalog-no-file-signal"));
});

test("matchMcpCatalog matches package.json projects", () => {
	const base = mkdtempSync(join(tmpdir(), "mcp-boot-"));
	try {
		writeFileSync(join(base, "package.json"), "{}", "utf-8");
		const m = matchMcpCatalog(base);
		assert.ok(m.some((x) => x.id === "node-npm-generic"));
		assert.ok(!m.some((x) => x.id === "catalog-no-file-signal"));
	} finally {
		rmSync(base, { recursive: true, force: true });
	}
});

test("matchMcpCatalog returns empty when no signals", () => {
	const base = mkdtempSync(join(tmpdir(), "mcp-boot-empty-"));
	try {
		assert.deepEqual(matchMcpCatalog(base), []);
	} finally {
		rmSync(base, { recursive: true, force: true });
	}
});

test("substituteArgs replaces ROOT token", () => {
	const root = "/tmp/proj";
	assert.deepEqual(substituteArgs(["a", "{{ROOT}}/x", "{{ROOT}}"], root), ["a", "/tmp/proj/x", "/tmp/proj"]);
});

test("mergeMcpServers preserves existing keys", () => {
	const merged = mergeMcpServers(
		{ a: { command: "x", args: [] } },
		{ b: { command: "y", args: ["1"] } },
	) as Record<string, { command: string }>;
	assert.equal(merged.a.command, "x");
	assert.equal(merged.b.command, "y");
});

test("readMcpJsonPath", () => {
	assert.equal(readMcpJsonPath("/a/b"), join("/a/b", ".mcp.json"));
});

test("readOrEmptyMcpServers missing file", () => {
	const base = mkdtempSync(join(tmpdir(), "mcp-read-"));
	try {
		assert.deepEqual(readOrEmptyMcpServers(base), {});
	} finally {
		rmSync(base, { recursive: true, force: true });
	}
});

test("readOrEmptyMcpServers invalid JSON returns {}", () => {
	const base = mkdtempSync(join(tmpdir(), "mcp-badjson-"));
	try {
		writeFileSync(join(base, ".mcp.json"), "{ not json", "utf-8");
		assert.deepEqual(readOrEmptyMcpServers(base), {});
	} finally {
		rmSync(base, { recursive: true, force: true });
	}
});

test("readOrEmptyMcpServers missing or non-object mcpServers", () => {
	const base = mkdtempSync(join(tmpdir(), "mcp-noserver-"));
	try {
		writeFileSync(join(base, ".mcp.json"), JSON.stringify({ foo: 1 }), "utf-8");
		assert.deepEqual(readOrEmptyMcpServers(base), {});
		writeFileSync(join(base, ".mcp.json"), JSON.stringify({ mcpServers: null }), "utf-8");
		assert.deepEqual(readOrEmptyMcpServers(base), {});
		writeFileSync(join(base, ".mcp.json"), JSON.stringify({ mcpServers: "not-an-object" }), "utf-8");
		assert.deepEqual(readOrEmptyMcpServers(base), {});
		writeFileSync(join(base, ".mcp.json"), JSON.stringify({ mcpServers: { keep: true } }), "utf-8");
		assert.deepEqual(readOrEmptyMcpServers(base), { keep: true });
	} finally {
		rmSync(base, { recursive: true, force: true });
	}
});

test("writeMcpJson creates file and merges top-level keys", () => {
	const base = mkdtempSync(join(tmpdir(), "mcp-write-"));
	try {
		writeMcpJson(base, { a: { command: "c", args: [] } });
		const raw = JSON.parse(readFileSync(join(base, ".mcp.json"), "utf-8"));
		assert.ok(raw.mcpServers?.a);
		writeFileSync(join(base, ".mcp.json"), JSON.stringify({ other: 1, mcpServers: { x: { command: "x", args: [] } } }), "utf-8");
		writeMcpJson(base, { y: { command: "z", args: [] } });
		const raw2 = JSON.parse(readFileSync(join(base, ".mcp.json"), "utf-8"));
		assert.equal(raw2.other, 1);
		// writeMcpJson replaces the entire `mcpServers` object (does not deep-merge keys).
		assert.ok(!raw2.mcpServers.x);
		assert.ok(raw2.mcpServers.y);
	} finally {
		rmSync(base, { recursive: true, force: true });
	}
});

test("writeMcpJson throws when existing .mcp.json is not valid JSON", () => {
	const base = mkdtempSync(join(tmpdir(), "mcp-badwrite-"));
	try {
		writeFileSync(join(base, ".mcp.json"), "[[[", "utf-8");
		assert.throws(() => writeMcpJson(base, {}), SyntaxError);
	} finally {
		rmSync(base, { recursive: true, force: true });
	}
});

test("requireAbsoluteToolsRoot errors when unset or not absolute", () => {
	const prev = process.env.GSD_MCP_TOOLS_ROOT;
	try {
		delete process.env.GSD_MCP_TOOLS_ROOT;
		assert.throws(() => requireAbsoluteToolsRoot(), /GSD_MCP_TOOLS_ROOT must be set/);
		process.env.GSD_MCP_TOOLS_ROOT = "relative/path";
		assert.throws(() => requireAbsoluteToolsRoot(), /must be an absolute path/);
		process.env.GSD_MCP_TOOLS_ROOT = join(tmpdir(), "abs-mcp-tools");
		assert.equal(requireAbsoluteToolsRoot(), process.env.GSD_MCP_TOOLS_ROOT);
	} finally {
		if (prev !== undefined) process.env.GSD_MCP_TOOLS_ROOT = prev;
		else delete process.env.GSD_MCP_TOOLS_ROOT;
	}
});

test("materializeCatalogMarkers writes README per match", () => {
	const root = mkdtempSync(join(tmpdir(), "mcp-mat-"));
	const matches: McpCatalogEntry[] = [
		{
			id: "t1",
			title: "T",
			mcpServerKey: "k",
			stdioCommand: "x",
			stdioArgs: [],
			npmPackage: "pkg",
		},
		{
			id: "t2",
			title: "T2",
			mcpServerKey: "k2",
			stdioCommand: "y",
			stdioArgs: [],
		},
	];
	try {
		materializeCatalogMarkers(root, matches);
		assert.ok(existsSync(join(root, "t1", "README.txt")));
		assert.ok(readFileSync(join(root, "t1", "README.txt"), "utf-8").includes("pkg"));
		assert.ok(readFileSync(join(root, "t2", "README.txt"), "utf-8").includes("n/a"));
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
});

test("buildMcpServersPatch keys align with catalog mcpServerKey", () => {
	const base = mkdtempSync(join(tmpdir(), "mcp-boot-p-"));
	try {
		writeFileSync(join(base, "package.json"), "{}", "utf-8");
		const m = matchMcpCatalog(base);
		const p = buildMcpServersPatch(base, m);
		for (const e of m) {
			assert.ok(Object.prototype.hasOwnProperty.call(p, e.mcpServerKey));
		}
	} finally {
		rmSync(base, { recursive: true, force: true });
	}
});

test("runMcpBootstrapCommand dry-run prints JSON", async () => {
	const base = mkdtempSync(join(tmpdir(), "mcp-run-dry-"));
	try {
		writeFileSync(join(base, "package.json"), "{}", "utf-8");
		const { result, stdout } = await captureIo(() => runMcpBootstrapCommand(base, []));
		assert.equal(result, 0);
		const j = JSON.parse(stdout) as { dryRun: boolean; matched: string[] };
		assert.equal(j.dryRun, true);
		assert.ok(j.matched.includes("node-npm-generic"));
	} finally {
		rmSync(base, { recursive: true, force: true });
	}
});

test("runMcpBootstrapCommand --apply --dry-run prefers dry-run", async () => {
	const base = mkdtempSync(join(tmpdir(), "mcp-run-ad-"));
	try {
		writeFileSync(join(base, "package.json"), "{}", "utf-8");
		const { result, stdout } = await captureIo(() => runMcpBootstrapCommand(base, ["--apply", "--dry-run"]));
		assert.equal(result, 0);
		assert.ok(stdout.includes("dryRun"));
	} finally {
		rmSync(base, { recursive: true, force: true });
	}
});

test("runMcpBootstrapCommand --apply without --yes in TTY returns 1", async () => {
	const base = mkdtempSync(join(tmpdir(), "mcp-tty-"));
	const orig = process.stdin.isTTY;
	Object.defineProperty(process.stdin, "isTTY", { value: true, configurable: true });
	try {
		writeFileSync(join(base, "package.json"), "{}", "utf-8");
		const { result, stderr } = await captureIo(() => runMcpBootstrapCommand(base, ["--apply"]));
		assert.equal(result, 1);
		assert.ok(stderr.includes("--yes"));
	} finally {
		Object.defineProperty(process.stdin, "isTTY", { value: orig, configurable: true });
		rmSync(base, { recursive: true, force: true });
	}
});

test("runMcpBootstrapCommand --apply --yes writes .mcp.json and markers", async () => {
	const base = mkdtempSync(join(tmpdir(), "mcp-apply-"));
	const tools = mkdtempSync(join(tmpdir(), "mcp-tools-"));
	const prev = process.env.GSD_MCP_TOOLS_ROOT;
	process.env.GSD_MCP_TOOLS_ROOT = tools;
	try {
		writeFileSync(join(base, "package.json"), "{}", "utf-8");
		const { result, stdout } = await captureIo(() => runMcpBootstrapCommand(base, ["--apply", "--yes"]));
		assert.equal(result, 0);
		assert.ok(stdout.includes(".mcp.json"));
		assert.ok(existsSync(join(base, ".mcp.json")));
		assert.ok(existsSync(join(tools, "node-npm-generic", "README.txt")));
	} finally {
		if (prev !== undefined) process.env.GSD_MCP_TOOLS_ROOT = prev;
		else delete process.env.GSD_MCP_TOOLS_ROOT;
		rmSync(base, { recursive: true, force: true });
		rmSync(tools, { recursive: true, force: true });
	}
});

test("runMcpBootstrapCommand apply catch handles non-Error throw (test hook)", async () => {
	const base = mkdtempSync(join(tmpdir(), "mcp-ne-"));
	const tools = mkdtempSync(join(tmpdir(), "mcp-tools-ne-"));
	const prevRoot = process.env.GSD_MCP_TOOLS_ROOT;
	const prevThrow = process.env.GSD_TEST_MCP_BOOTSTRAP_THROW;
	process.env.GSD_MCP_TOOLS_ROOT = tools;
	process.env.GSD_TEST_MCP_BOOTSTRAP_THROW = "1";
	try {
		writeFileSync(join(base, "package.json"), "{}", "utf-8");
		const { result, stderr } = await captureIo(() => runMcpBootstrapCommand(base, ["--apply", "--yes"]));
		assert.equal(result, 1);
		assert.ok(stderr.includes("mcp-bootstrap-test-non-error"));
		assert.equal(process.env.GSD_TEST_MCP_BOOTSTRAP_THROW, undefined);
	} finally {
		if (prevRoot !== undefined) process.env.GSD_MCP_TOOLS_ROOT = prevRoot;
		else delete process.env.GSD_MCP_TOOLS_ROOT;
		if (prevThrow !== undefined) process.env.GSD_TEST_MCP_BOOTSTRAP_THROW = prevThrow;
		else delete process.env.GSD_TEST_MCP_BOOTSTRAP_THROW;
		rmSync(base, { recursive: true, force: true });
		rmSync(tools, { recursive: true, force: true });
	}
});

test("runMcpBootstrapCommand apply catches requireAbsoluteToolsRoot failure", async () => {
	const base = mkdtempSync(join(tmpdir(), "mcp-no-root-"));
	const prev = process.env.GSD_MCP_TOOLS_ROOT;
	delete process.env.GSD_MCP_TOOLS_ROOT;
	try {
		writeFileSync(join(base, "package.json"), "{}", "utf-8");
		const { result, stderr } = await captureIo(() => runMcpBootstrapCommand(base, ["--apply", "--yes"]));
		assert.equal(result, 1);
		assert.ok(stderr.includes("GSD_MCP_TOOLS_ROOT"));
	} finally {
		if (prev !== undefined) process.env.GSD_MCP_TOOLS_ROOT = prev;
		rmSync(base, { recursive: true, force: true });
	}
});
