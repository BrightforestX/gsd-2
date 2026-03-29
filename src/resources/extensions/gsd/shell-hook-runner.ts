/**
 * Opt-in shell execution for pre-dispatch hooks (`GSD_SHELL_HOOKS_ENABLED`).
 */

import { spawn } from "node:child_process";
import { isAbsolute, join } from "node:path";
import { parseGsdTruthyEnv, warnInvalidGsdEnvOnce } from "@gsd/pi-ai";
import { debugLog } from "./debug-logger.js";

export type ShellHookRunConfig = {
	command: string;
	args?: string[];
	cwd?: string;
	timeoutMs?: number;
};

/** Max captured stdout/stderr bytes surfaced in hook error messages (with truncation suffix). */
export const SHELL_HOOK_MAX_STREAM_CHARS = 64_000;

let shellHooksDisabledNotified = false;

export function resetShellHookRunnerForTests(): void {
	shellHooksDisabledNotified = false;
}

export function isShellHooksGloballyEnabled(): boolean {
	const raw = process.env.GSD_SHELL_HOOKS_ENABLED;
	warnInvalidGsdEnvOnce("GSD_SHELL_HOOKS_ENABLED", raw);
	return parseGsdTruthyEnv(raw).enabled;
}

function capStream(s: string): string {
	if (s.length <= SHELL_HOOK_MAX_STREAM_CHARS) return s;
	return s.slice(0, SHELL_HOOK_MAX_STREAM_CHARS) + `\n… [truncated ${s.length - SHELL_HOOK_MAX_STREAM_CHARS} bytes]`;
}

/**
 * Runs a shell hook when globally enabled; no-ops (success) when disabled.
 */
export async function runPreDispatchShellHook(
	run: ShellHookRunConfig,
	hookName: string,
	basePath: string,
): Promise<{ ok: true; executed: boolean } | { ok: false; message: string }> {
	if (!isShellHooksGloballyEnabled()) {
		if (!shellHooksDisabledNotified) {
			shellHooksDisabledNotified = true;
			debugLog("shell-hooks", {
				phase: "skipped",
				hook: hookName,
				reason: "GSD_SHELL_HOOKS_ENABLED not truthy",
			});
		}
		return { ok: true, executed: false };
	}

	const timeoutMs = run.timeoutMs ?? 120_000;
	const cwd =
		run.cwd !== undefined && run.cwd !== ""
			? isAbsolute(run.cwd)
				? run.cwd
				: join(basePath, run.cwd)
			: basePath;

	let stdout = "";
	let stderr = "";
	const child = spawn(run.command, run.args ?? [], {
		cwd,
		shell: false,
		env: { ...process.env },
		stdio: ["ignore", "pipe", "pipe"],
	});

	/* c8 ignore start — optional chaining covers null streams; stdio always pipes stdout/stderr here */
	child.stdout?.on("data", (c: Buffer) => {
		stdout += c.toString();
	});
	child.stderr?.on("data", (c: Buffer) => {
		stderr += c.toString();
	});
	/* c8 ignore stop */

	const exitCode = await new Promise<number>((resolve, reject) => {
		const timer = setTimeout(() => {
			/* c8 ignore start — SIGKILL rarely throws; branch is defensive */
			try {
				child.kill("SIGKILL");
			} catch {
				// ignore
			}
			/* c8 ignore stop */
			resolve(124);
		}, timeoutMs);

		child.on("error", (err) => {
			clearTimeout(timer);
			reject(err);
		});
		child.on("close", (code) => {
			clearTimeout(timer);
			resolve(code ?? 1);
		});
	});

	if (exitCode === 124) {
		return {
			ok: false,
			message: `Shell hook "${hookName}" timed out after ${timeoutMs}ms\n${capStream(stderr) || capStream(stdout)}`,
		};
	}
	if (exitCode !== 0) {
		return {
			ok: false,
			message: `Shell hook "${hookName}" exited ${exitCode}\n${capStream(stderr) || capStream(stdout)}`,
		};
	}
	return { ok: true, executed: true };
}
