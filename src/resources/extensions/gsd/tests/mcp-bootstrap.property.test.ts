import test from "node:test";
import assert from "node:assert/strict";
import fc from "fast-check";
import { mergeMcpServers } from "../mcp-bootstrap.js";

const serverArb = fc.record({
	command: fc.string({ minLength: 1, maxLength: 12 }),
	args: fc.array(fc.string({ maxLength: 8 }), { maxLength: 4 }),
});

const patchArb = fc.dictionary(fc.string({ minLength: 1, maxLength: 10 }), serverArb, {
	maxKeys: 8,
});

test("mergeMcpServers keys are exactly the union of input keys", () => {
	fc.assert(
		fc.property(patchArb, patchArb, (a, b) => {
			const merged = mergeMcpServers(a, b);
			const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
			const outKeys = new Set(Object.keys(merged));
			assert.deepStrictEqual(outKeys, keys);
			for (const k of Object.keys(b)) {
				assert.deepStrictEqual(merged[k], b[k]);
			}
			for (const k of Object.keys(a)) {
				if (!(k in b)) assert.deepStrictEqual(merged[k], a[k]);
			}
			return true;
		}),
		{ numRuns: 50 },
	);
});
