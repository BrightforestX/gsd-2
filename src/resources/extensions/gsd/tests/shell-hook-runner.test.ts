import test from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
	runPreDispatchShellHook,
	resetShellHookRunnerForTests,
	SHELL_HOOK_MAX_STREAM_CHARS,
} from "../shell-hook-runner.js";

test("shell hook omits args uses empty argv (spawn ?? [])", async () => {
	if (process.platform === "win32") {
		// Covered on Unix via `true`; Windows uses explicit argv elsewhere.
		return;
	}
	resetShellHookRunnerForTests();
	process.env.GSD_SHELL_HOOKS_ENABLED = "true";
	try {
		const r = await runPreDispatchShellHook({ command: "true" }, "no-args", process.cwd());
		assert.equal(r.ok, true);
		if (r.ok) assert.equal(r.executed, true);
	} finally {
		delete process.env.GSD_SHELL_HOOKS_ENABLED;
		resetShellHookRunnerForTests();
	}
});

test("shell hook skipped when GSD_SHELL_HOOKS_ENABLED unset", async () => {
	resetShellHookRunnerForTests();
	delete process.env.GSD_SHELL_HOOKS_ENABLED;
	const r = await runPreDispatchShellHook(
		{ command: "node", args: ["-e", "process.exit(1)"] },
		"t",
		process.cwd(),
	);
	assert.equal(r.ok, true);
	if (r.ok) assert.equal(r.executed, false);
});

test("shell hook runs when enabled and propagates failure", async () => {
	resetShellHookRunnerForTests();
	process.env.GSD_SHELL_HOOKS_ENABLED = "true";
	const r = await runPreDispatchShellHook(
		{ command: "node", args: ["-e", "process.exit(7)"] },
		"t",
		process.cwd(),
	);
	delete process.env.GSD_SHELL_HOOKS_ENABLED;
	resetShellHookRunnerForTests();
	assert.equal(r.ok, false);
});

test("shell hook failure message caps long stderr", async () => {
	resetShellHookRunnerForTests();
	process.env.GSD_SHELL_HOOKS_ENABLED = "true";
	const big = "x".repeat(SHELL_HOOK_MAX_STREAM_CHARS + 10_000);
	const r = await runPreDispatchShellHook(
		{ command: "node", args: ["-e", `console.error(${JSON.stringify(big)}); process.exit(1)`] },
		"long-err",
		process.cwd(),
	);
	delete process.env.GSD_SHELL_HOOKS_ENABLED;
	resetShellHookRunnerForTests();
	assert.equal(r.ok, false);
	if (!r.ok) {
		assert.ok(r.message.length < big.length, "message should truncate stderr");
		assert.ok(r.message.length <= SHELL_HOOK_MAX_STREAM_CHARS + 400, "message stays near cap + suffix");
	}
});

test("shell hook runs successfully when enabled", async () => {
	resetShellHookRunnerForTests();
	process.env.GSD_SHELL_HOOKS_ENABLED = "true";
	const r = await runPreDispatchShellHook(
		{ command: "node", args: ["-e", "process.exit(0)"] },
		"ok-hook",
		process.cwd(),
	);
	delete process.env.GSD_SHELL_HOOKS_ENABLED;
	resetShellHookRunnerForTests();
	assert.equal(r.ok, true);
	if (r.ok) assert.equal(r.executed, true);
});

test("shell hook times out", async () => {
	resetShellHookRunnerForTests();
	process.env.GSD_SHELL_HOOKS_ENABLED = "true";
	const r = await runPreDispatchShellHook(
		{ command: "node", args: ["-e", "setInterval(() => {}, 10000)"], timeoutMs: 120 },
		"slow",
		process.cwd(),
	);
	delete process.env.GSD_SHELL_HOOKS_ENABLED;
	resetShellHookRunnerForTests();
	assert.equal(r.ok, false);
	if (!r.ok) {
		assert.ok(r.message.includes("timed out"));
		assert.ok(r.message.includes("124") || r.message.includes("timed out"));
	}
});

test("shell hook timeout uses stdout when stderr is empty", async () => {
	resetShellHookRunnerForTests();
	process.env.GSD_SHELL_HOOKS_ENABLED = "true";
	const r = await runPreDispatchShellHook(
		{
			command: "node",
			args: ["-e", "process.stdout.write('OUTONLY'); setInterval(() => {}, 20000)"],
			timeoutMs: 100,
		},
		"slow-out",
		process.cwd(),
	);
	delete process.env.GSD_SHELL_HOOKS_ENABLED;
	resetShellHookRunnerForTests();
	assert.equal(r.ok, false);
	if (!r.ok) {
		assert.ok(r.message.includes("OUTONLY"), r.message);
	}
});

test("shell hook empty cwd string uses basePath", async () => {
	resetShellHookRunnerForTests();
	process.env.GSD_SHELL_HOOKS_ENABLED = "true";
	const base = mkdtempSync(join(tmpdir(), "sh-hook-emptycwd-"));
	writeFileSync(join(base, "here.txt"), "ok", "utf-8");
	try {
		const r = await runPreDispatchShellHook(
			{
				command: "node",
				args: ["-e", "require('fs').accessSync('here.txt')"],
				cwd: "",
			},
			"emptycwd",
			base,
		);
		assert.equal(r.ok, true);
	} finally {
		rmSync(base, { recursive: true, force: true });
		delete process.env.GSD_SHELL_HOOKS_ENABLED;
		resetShellHookRunnerForTests();
	}
});

test("shell hook absolute cwd bypasses basePath join", async () => {
	resetShellHookRunnerForTests();
	process.env.GSD_SHELL_HOOKS_ENABLED = "true";
	const base = mkdtempSync(join(tmpdir(), "sh-hook-abscwd-"));
	const sub = join(base, "nested");
	mkdirSync(sub, { recursive: true });
	writeFileSync(join(sub, "abs.txt"), "1", "utf-8");
	try {
		const r = await runPreDispatchShellHook(
			{
				command: "node",
				args: ["-e", "require('fs').accessSync('abs.txt')"],
				cwd: sub,
			},
			"abscwd",
			"/tmp",
		);
		assert.equal(r.ok, true);
	} finally {
		rmSync(base, { recursive: true, force: true });
		delete process.env.GSD_SHELL_HOOKS_ENABLED;
		resetShellHookRunnerForTests();
	}
});

test("shell hook uses relative cwd under basePath", async () => {
	resetShellHookRunnerForTests();
	process.env.GSD_SHELL_HOOKS_ENABLED = "true";
	const base = mkdtempSync(join(tmpdir(), "sh-hook-cwd-"));
	const sub = join(base, "sub");
	mkdirSync(sub, { recursive: true });
	try {
		const r = await runPreDispatchShellHook(
			{
				command: "node",
				args: ["-e", "require('fs').writeFileSync('cwd.txt', process.cwd())"],
				cwd: "sub",
			},
			"rel",
			base,
		);
		assert.equal(r.ok, true);
		const recorded = readFileSync(join(sub, "cwd.txt"), "utf-8");
		assert.ok(recorded.includes("sub"), `expected sub in ${recorded}`);
	} finally {
		rmSync(base, { recursive: true, force: true });
		delete process.env.GSD_SHELL_HOOKS_ENABLED;
		resetShellHookRunnerForTests();
	}
});

test("shell hook spawn error rejects", async () => {
	resetShellHookRunnerForTests();
	process.env.GSD_SHELL_HOOKS_ENABLED = "true";
	try {
		await assert.rejects(
			runPreDispatchShellHook(
				{ command: "__nonexistent_gsd_hook_binary__", args: [] },
				"badcmd",
				process.cwd(),
			),
			/ENOENT|spawn/,
		);
	} finally {
		delete process.env.GSD_SHELL_HOOKS_ENABLED;
		resetShellHookRunnerForTests();
	}
});
