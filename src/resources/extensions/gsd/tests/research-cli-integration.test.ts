import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, rmSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { runResearchCliInner } from "../research-cli-run.js";
import { invalidateStateCache } from "../state.js";

function seedMilestone(base: string): void {
	mkdirSync(join(base, ".gsd", "milestones", "M001"), { recursive: true });
	writeFileSync(
		join(base, ".gsd", "milestones", "M001", "M001-CONTEXT.md"),
		"---\ntitle: T\n---\n\n# C\n",
		"utf-8",
	);
	writeFileSync(
		join(base, ".gsd", "milestones", "M001", "M001-ROADMAP.md"),
		`# M001: Test

**Vision:** V

## Slices

- [ ] **S01: S**`,
		"utf-8",
	);
}

test("runResearchCliInner writes milestone RESEARCH.md", async () => {
	const base = mkdtempSync(join(tmpdir(), "gsd-research-int-"));
	try {
		seedMilestone(base);
		invalidateStateCache();
		const r = await runResearchCliInner(base, { forceMilestone: true });
		assert.equal(r.ok, true);
		const p = join(base, ".gsd", "milestones", "M001", "M001-RESEARCH.md");
		assert.ok(existsSync(p), "expected RESEARCH file");
		const txt = readFileSync(p, "utf-8");
		assert.ok(txt.includes("gsd_research_cli: true"));
		assert.ok(txt.includes("## Dispatch prompt"));
	} finally {
		rmSync(base, { recursive: true, force: true });
		invalidateStateCache();
	}
});
