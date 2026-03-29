import { After, Given, Then, When } from "@cucumber/cucumber";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

const projectRoot = process.cwd();
const loaderPath = join(projectRoot, "dist", "loader.js");

function runGsd(args, env, timeoutMs = 12_000) {
	return new Promise((resolve) => {
		let stdout = "";
		let stderr = "";
		let timedOut = false;
		const child = spawn("node", [loaderPath, ...args], {
			cwd: projectRoot,
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

Given("a temporary HOME with only default AWS shared config files", async function () {
	if (!existsSync(loaderPath)) {
		throw new Error("dist/loader.js not found — run: npm run build");
	}
	this.tempHome = mkdtempSync(join(tmpdir(), "bdd-bedrock-"));
	mkdirSync(join(this.tempHome, ".aws"), { recursive: true });
	writeFileSync(join(this.tempHome, ".aws", "config"), "[default]\nregion = us-east-1\n", "utf-8");
});

Given("GSD_BEDROCK_ASSUME_DEFAULT_CREDS is enabled", async function () {
	this.gsdBedrockAssume = "true";
});

Given("explicit AWS credential environment variables are cleared", async function () {
	this.clearAws = true;
});

When("I run gsd with list-models argument {string}", async function (search) {
	const env = { ...process.env, HOME: this.tempHome, GSD_BEDROCK_ASSUME_DEFAULT_CREDS: this.gsdBedrockAssume ?? "true" };
	if (this.clearAws) {
		delete env.AWS_PROFILE;
		delete env.AWS_ACCESS_KEY_ID;
		delete env.AWS_SECRET_ACCESS_KEY;
		delete env.AWS_SESSION_TOKEN;
		delete env.AWS_WEB_IDENTITY_TOKEN_FILE;
		delete env.AWS_CONTAINER_CREDENTIALS_RELATIVE_URI;
		delete env.AWS_CONTAINER_CREDENTIALS_FULL_URI;
		delete env.AWS_BEARER_TOKEN_BEDROCK;
	}
	let last = { stdout: "", stderr: "", code: null, timedOut: false };
	for (let i = 0; i < 60; i++) {
		last = await runGsd(["--list-models", search], env);
		if (!last.timedOut && last.stdout.includes("amazon-bedrock")) break;
		await new Promise((r) => setTimeout(r, 25));
	}
	this.result = last;
});

Then("the output should include {string}", async function (text) {
	assert.ok(!this.result.timedOut, "gsd should not time out");
	const out = this.result.stdout + this.result.stderr;
	assert.ok(out.includes(text), `expected ${JSON.stringify(text)} in:\n${out.slice(0, 2000)}`);
});

Then("the exit code should be {int}", async function (code) {
	assert.equal(this.result.code, code);
});

After(async function () {
	if (this.tempHome) {
		try {
			rmSync(this.tempHome, { recursive: true, force: true });
		} catch {
			// best-effort
		}
	}
});
