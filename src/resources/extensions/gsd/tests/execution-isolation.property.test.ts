import test from "node:test";
import assert from "node:assert/strict";
import fc from "fast-check";
import type { GSDPreferences } from "../preferences-types.js";
import { validatePreferences } from "../preferences-validation.js";

const valid = new Set(["host", "overlay", "docker", "e2b"]);

test("validatePreferences rejects execution.isolation outside the enum", () => {
	fc.assert(
		fc.property(
			fc.string({ minLength: 1, maxLength: 24 }).filter((s) => !valid.has(s)),
			(s) => {
				const { errors } = validatePreferences({ execution: { isolation: s } } as unknown as GSDPreferences);
				return errors.some((e) => e.includes("execution.isolation"));
			},
		),
		{ numRuns: 40 },
	);
});
