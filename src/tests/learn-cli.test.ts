import test from "node:test";
import assert from "node:assert/strict";
import { runLearnCli } from "../learn-cli.js";

async function captureIo(fn: () => Promise<number>): Promise<{ code: number; stdout: string; stderr: string }> {
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
		.then((code) => ({ code, stdout: out.join(""), stderr: err.join("") }))
		.finally(() => {
			process.stdout.write = ow;
			process.stderr.write = ew;
		});
}

test("runLearnCli --help prints usage and exits 0", async () => {
	const { code, stdout } = await captureIo(() => runLearnCli(["--help"], "/tmp"));
	assert.equal(code, 0);
	assert.ok(stdout.includes("Overlays") || stdout.includes("overlay"));
});

test("runLearnCli -h same as --help", async () => {
	const { code, stdout } = await captureIo(() => runLearnCli(["-h"], "/tmp"));
	assert.equal(code, 0);
	assert.ok(stdout.length > 0);
});

test("runLearnCli apply is stub exit 0", async () => {
	const { code, stderr } = await captureIo(() => runLearnCli(["apply"], "/tmp"));
	assert.equal(code, 0);
	assert.ok(stderr.includes("Stub"));
});

test("runLearnCli unknown prints hint exit 1", async () => {
	const { code, stderr } = await captureIo(() => runLearnCli([], "/tmp"));
	assert.equal(code, 1);
	assert.ok(stderr.includes("learn apply"));
});

test("runLearnCli bogus subcommand exit 1", async () => {
	const { code, stderr } = await captureIo(() => runLearnCli(["nope"], "/tmp"));
	assert.equal(code, 1);
	assert.ok(stderr.includes("learn"));
});
