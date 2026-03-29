import test from "node:test";
import assert from "node:assert/strict";
import {
	parseResearchCliArgs,
	parseResearchArgvFromString,
} from "../research-cli-run.js";

test("parseResearchCliArgs parses mcp flags", () => {
	const p = parseResearchCliArgs(["--mcp", "srv", "--mcp-tool", "t1", "--mcp-args", '{"a":1}']);
	assert.equal(p.mcpServer, "srv");
	assert.equal(p.mcpTool, "t1");
	assert.deepEqual(p.mcpArgs, { a: 1 });
});

test("parseResearchArgvFromString handles quotes", () => {
	const a = parseResearchArgvFromString(`--mcp-args '{"x":"y z"}'`);
	assert.deepEqual(parseResearchCliArgs(a).mcpArgs, { x: "y z" });
});
