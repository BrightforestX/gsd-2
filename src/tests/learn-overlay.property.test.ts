import test from "node:test";
import assert from "node:assert/strict";
import fc from "fast-check";
import { safeAgentFileKey } from "../resources/extensions/subagent/learn-overlay.js";

test("safeAgentFileKey output is filename-safe (no path separators)", () => {
	fc.assert(
		fc.property(fc.string({ maxLength: 40 }), (name) => {
			const k = safeAgentFileKey(name);
			assert.ok(!k.includes("/"));
			assert.ok(!k.includes("\\"));
			assert.ok(!k.includes(".."));
			// Hyphen is preserved (allowed in filenames); other punctuation becomes "_".
			return /^[a-zA-Z0-9_-]*$/.test(k);
		}),
		{ numRuns: 60 },
	);
});
