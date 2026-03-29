import { After, Given, Then, When } from "@cucumber/cucumber";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

After(async function () {
	if (this.researchBase) {
		try {
			rmSync(this.researchBase, { recursive: true, force: true });
		} catch {
			// best-effort
		}
	}
});

const projectRoot = process.cwd();
const loaderPath = join(projectRoot, "dist", "loader.js");

function runGsd(args, cwd, env, timeoutMs = 20_000) {
	return new Promise((resolve) => {
		let stdout = "";
		let stderr = "";
		let timedOut = false;
		const child = spawn("node", [loaderPath, ...args], {
			cwd,
			env: { ...process.env, ...env },
			stdio: ["pipe", "pipe", "pipe"],
		});
		child.stdout.on("data", (c) => {
			stdout += c.toString();
		});
		child.stderr.on("data", (c) => {
			stderr += c.toString();
		});
		child.stdin.end();
		const timer = setTimeout(() => {
			timedOut = true;
			child.kill("SIGTERM");
		}, timeoutMs);
		child.on("close", (code) => {
			clearTimeout(timer);
			resolve({ stdout, stderr, code, timedOut });
		});
	});
}

Given("a minimal GSD project with milestone M001", async function () {
	if (!existsSync(loaderPath)) {
		throw new Error("dist/loader.js not found — run: npm run build");
	}
	this.researchBase = mkdtempSync(join(tmpdir(), "bdd-research-"));
	const m = join(this.researchBase, ".gsd", "milestones", "M001");
	mkdirSync(m, { recursive: true });
	writeFileSync(join(m, "M001-CONTEXT.md"), "---\ntitle: T\n---\n\n# C\n", "utf-8");
	writeFileSync(
		join(m, "M001-ROADMAP.md"),
		"# M001: Test\n\n**Vision:** V\n\n## Slices\n\n- [ ] **S01: S**",
		"utf-8",
	);
});

When("I run gsd research with milestone flag in that project", async function () {
	const r = await runGsd(["research", "--milestone"], this.researchBase, {});
	assert.ok(!r.timedOut, "should finish");
	assert.equal(r.code, 0, r.stdout + r.stderr);
	this.researchOut = r.stdout;
});

Then("the project should contain M001-RESEARCH.md with dispatch scaffold", async function () {
	const p = join(this.researchBase, ".gsd", "milestones", "M001", "M001-RESEARCH.md");
	assert.ok(existsSync(p), "missing RESEARCH file");
	const txt = readFileSync(p, "utf-8");
	assert.ok(txt.includes("gsd_research_cli: true"));
	assert.ok(txt.includes("## Dispatch prompt"));
});
