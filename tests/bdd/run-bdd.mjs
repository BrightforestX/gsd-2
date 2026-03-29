import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const here = fileURLToPath(new URL(".", import.meta.url));
const projectRoot = join(here, "..", "..");

test("BDD suite (Cucumber)", { timeout: 120_000 }, () => {
	if (!existsSync(join(projectRoot, "dist", "loader.js"))) {
		throw new Error("dist/loader.js missing — run npm run build before test:bdd");
	}
	const cucumberBin = join(projectRoot, "node_modules", "@cucumber", "cucumber", "bin", "cucumber.js");
	const r = spawnSync(
		process.execPath,
		[
			cucumberBin,
			"--publish-quiet",
			join(projectRoot, "tests/bdd/features"),
			"--import",
			join(projectRoot, "tests/bdd/steps/p0-bedrock.steps.mjs"),
			"--import",
			join(projectRoot, "tests/bdd/steps/p1-research.steps.mjs"),
			"--import",
			join(projectRoot, "tests/bdd/steps/p2-p5-capabilities.steps.mjs"),
		],
		{ cwd: projectRoot, encoding: "utf-8" },
	);
	assert.equal(r.status, 0, `cucumber-js failed:\n${r.stdout}\n${r.stderr}`);
});
