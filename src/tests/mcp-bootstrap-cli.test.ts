import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { runMcpBootstrapCli } from "../mcp-bootstrap-cli.js";

test("runMcpBootstrapCli delegates dry-run to core implementation", async () => {
	const base = mkdtempSync(join(tmpdir(), "mcp-cli-"));
	try {
		writeFileSync(join(base, "package.json"), "{}", "utf-8");
		const out: string[] = [];
		const ow = process.stdout.write.bind(process.stdout);
		process.stdout.write = (c: string | Uint8Array) => {
			out.push(String(c));
			return true;
		};
		try {
			const code = await runMcpBootstrapCli(["--dry-run"], base);
			assert.equal(code, 0);
			const text = out.join("");
			// jiti / loader may prefix stdout; assert on the JSON payload substring.
			assert.ok(/"dryRun"\s*:\s*true/.test(text), `expected dryRun JSON in: ${text.slice(0, 400)}`);
		} finally {
			process.stdout.write = ow;
		}
	} finally {
		rmSync(base, { recursive: true, force: true });
	}
});
