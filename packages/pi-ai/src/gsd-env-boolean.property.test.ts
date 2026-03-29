import test from "node:test";
import assert from "node:assert/strict";
import fc from "fast-check";
import { parseGsdTruthyEnv } from "./gsd-env-boolean.js";

test("property: parseGsdTruthyEnv agrees with trim/lowercase token rules", () => {
	fc.assert(
		fc.property(fc.string(), (s) => {
			const r = parseGsdTruthyEnv(s);
			const t = s.trim().toLowerCase();
			const expectEnabled = t === "1" || t === "true" || t === "yes";
			assert.equal(r.enabled, expectEnabled, `input: ${JSON.stringify(s)}`);
			assert.equal(
				r.invalidNonEmpty,
				s !== "" && !expectEnabled,
				`invalid flag for: ${JSON.stringify(s)}`,
			);
		}),
		{ numRuns: 500 },
	);
});
