import { After, Given, Then, When } from "@cucumber/cucumber";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
const projectRoot = process.cwd();
const loaderPath = join(projectRoot, "dist", "loader.js");

async function importDistShellHookRunner() {
	const mod = await import(
		join(projectRoot, "dist/resources/extensions/gsd/shell-hook-runner.js"),
	);
	return mod;
}

async function importDistDoctorEnv() {
	return import(join(projectRoot, "dist/resources/extensions/gsd/doctor-environment.js"));
}

function runGsdInDir(cwd, args, env, timeoutMs = 20_000) {
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

// ── P2 shell hooks ───────────────────────────────────────────────────────

Given("GSD_SHELL_HOOKS_ENABLED is unset for the shell hook gate", async function () {
	delete process.env.GSD_SHELL_HOOKS_ENABLED;
	const { resetShellHookRunnerForTests } = await importDistShellHookRunner();
	resetShellHookRunnerForTests();
});

Then("shell hooks should not be globally enabled", async function () {
	const { isShellHooksGloballyEnabled } = await importDistShellHookRunner();
	assert.equal(isShellHooksGloballyEnabled(), false);
});

// ── P3 MCP bootstrap ───────────────────────────────────────────────────────

Given("a temporary project with package.json", async function () {
	if (!existsSync(loaderPath)) {
		throw new Error("dist/loader.js not found — run: npm run build");
	}
	this.mcpProjDir = mkdtempSync(join(tmpdir(), "bdd-mcp-"));
	writeFileSync(join(this.mcpProjDir, "package.json"), JSON.stringify({ name: "bdd-mcp" }), "utf-8");
});

When("I run gsd mcp bootstrap dry-run in that project", async function () {
	this.mcpResult = await runGsdInDir(this.mcpProjDir, ["mcp", "bootstrap", "--dry-run"], {});
});

Then("the bootstrap output should include a server key", async function () {
	assert.ok(!this.mcpResult.timedOut);
	const out = this.mcpResult.stdout + this.mcpResult.stderr;
	assert.ok(
		out.includes("wouldMerge") || out.includes("matched"),
		`expected dry-run JSON in:\n${out.slice(0, 2500)}`,
	);
});

Then("the bootstrap exit code should be {int}", async function (code) {
	assert.equal(this.mcpResult.code, code);
});

After(async function () {
	for (const d of [this.mcpProjDir, this.sandboxDir]) {
		if (!d) continue;
		try {
			rmSync(d, { recursive: true, force: true });
		} catch {
			// ignore
		}
	}
});

// ── P4 learn ───────────────────────────────────────────────────────────────

When("I run gsd learn with help flag", async function () {
	if (!existsSync(loaderPath)) {
		throw new Error("dist/loader.js not found — run: npm run build");
	}
	this.learnResult = await runGsdInDir(projectRoot, ["learn", "--help"], {});
});

Then("the learn output should include {string}", async function (text) {
	const out = this.learnResult.stdout + this.learnResult.stderr;
	assert.ok(out.includes(text), `expected ${JSON.stringify(text)} in:\n${out.slice(0, 2000)}`);
});

Then("the learn exit code should be {int}", async function (code) {
	assert.equal(this.learnResult.code, code);
});

// ── P5 doctor env ─────────────────────────────────────────────────────────

Given("a temporary directory with a gsd project marker", async function () {
	this.sandboxDir = mkdtempSync(join(tmpdir(), "bdd-sandbox-"));
	mkdirSync(join(this.sandboxDir, ".gsd"), { recursive: true });
	writeFileSync(join(this.sandboxDir, "package.json"), JSON.stringify({ name: "bdd-sb" }), "utf-8");
	mkdirSync(join(this.sandboxDir, "node_modules"), { recursive: true });
});

When("I run environment health checks on that directory", async function () {
	const { runEnvironmentChecks } = await importDistDoctorEnv();
	this.envResults = runEnvironmentChecks(this.sandboxDir);
});

Then("the environment results should include gsd_sandbox", async function () {
	const hit = this.envResults.find((r) => r.name === "gsd_sandbox");
	assert.ok(hit, `expected gsd_sandbox in ${JSON.stringify(this.envResults.map((r) => r.name))}`);
});
