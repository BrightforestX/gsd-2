import test from "node:test";
import assert from "node:assert/strict";
import {
	parseGsdTruthyEnv,
	warnInvalidGsdEnvOnce,
	resetGsdEnvWarningCacheForTests,
} from "./gsd-env-boolean.js";

test("parseGsdTruthyEnv: empty and undefined are disabled", () => {
	assert.deepEqual(parseGsdTruthyEnv(undefined), { enabled: false, invalidNonEmpty: false });
	assert.deepEqual(parseGsdTruthyEnv(""), { enabled: false, invalidNonEmpty: false });
	assert.deepEqual(parseGsdTruthyEnv("   "), { enabled: false, invalidNonEmpty: true });
});

test("parseGsdTruthyEnv: true, 1, yes (case-insensitive)", () => {
	for (const v of ["true", "TRUE", "True", "1", "yes", "YES", "  yes  "]) {
		assert.deepEqual(parseGsdTruthyEnv(v), { enabled: true, invalidNonEmpty: false }, v);
	}
});

test("parseGsdTruthyEnv: trues and other junk are invalid non-empty", () => {
	assert.deepEqual(parseGsdTruthyEnv("trues"), { enabled: false, invalidNonEmpty: true });
	assert.deepEqual(parseGsdTruthyEnv("false"), { enabled: false, invalidNonEmpty: true });
});

test("warnInvalidGsdEnvOnce fires once per key", () => {
	resetGsdEnvWarningCacheForTests();
	const chunks: string[] = [];
	const orig = process.stderr.write.bind(process.stderr);
	(process.stderr as any).write = (s: string) => {
		chunks.push(s);
		return true;
	};
	try {
		warnInvalidGsdEnvOnce("GSD_FOO", "trues");
		warnInvalidGsdEnvOnce("GSD_FOO", "trues");
		assert.equal(chunks.length, 1);
		assert.match(chunks[0]!, /GSD_FOO/);
	} finally {
		process.stderr.write = orig;
		resetGsdEnvWarningCacheForTests();
	}
});

test("warnInvalidGsdEnvOnce skips write when stderr has no write function", () => {
	resetGsdEnvWarningCacheForTests();
	const orig = process.stderr;
	Object.defineProperty(process, "stderr", { value: {}, configurable: true });
	try {
		warnInvalidGsdEnvOnce("GSD_NO_STDERR", "trues");
		assert.ok(true);
	} finally {
		Object.defineProperty(process, "stderr", { value: orig, configurable: true });
		resetGsdEnvWarningCacheForTests();
	}
});

test("warnInvalidGsdEnvOnce returns early for empty raw", () => {
	resetGsdEnvWarningCacheForTests();
	const chunks: string[] = [];
	const orig = process.stderr.write.bind(process.stderr);
	(process.stderr as any).write = (s: string) => {
		chunks.push(s);
		return true;
	};
	try {
		warnInvalidGsdEnvOnce("GSD_EMPTY", "");
		assert.equal(chunks.length, 0);
	} finally {
		process.stderr.write = orig;
		resetGsdEnvWarningCacheForTests();
	}
});
