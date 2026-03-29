import test from "node:test";
import assert from "node:assert/strict";
import fc from "fast-check";
import { parseResearchArgvFromString } from "../research-cli-run.js";

test("property: parseResearchArgvFromString splits ASCII tokens without spaces", () => {
	fc.assert(
		fc.property(fc.array(fc.stringMatching(/^[a-z0-9_-]+$/), { minLength: 1, maxLength: 12 }), (parts) => {
			const line = parts.join(" ");
			const back = parseResearchArgvFromString(line);
			assert.deepEqual(back, parts);
		}),
		{ numRuns: 200 },
	);
});
