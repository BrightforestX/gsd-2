import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";

test("spawned Node children inherit VITE_* variables when passed in env", () => {
	const token = `vite-pass-${Date.now()}`;
	const r = spawnSync(
		process.execPath,
		["-e", "process.stdout.write(process.env.VITE_GSD_PASSTHROUGH_TEST || 'missing')"],
		{
			env: { ...process.env, VITE_GSD_PASSTHROUGH_TEST: token },
			encoding: "utf-8",
		},
	);
	assert.equal(r.stdout, token, "VITE_* must not be stripped for typical child_process usage");
});
