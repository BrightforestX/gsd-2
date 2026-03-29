import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { appendLearnOverlayMarkdown } from "../resources/extensions/subagent/learn-overlay.js";

test("appendLearnOverlayMarkdown appends when GSD_LEARN_OVERLAY_DIR has file", () => {
	const dir = mkdtempSync(join(tmpdir(), "learn-ov-"));
	process.env.GSD_LEARN_OVERLAY_DIR = dir;
	try {
		mkdirSync(dir, { recursive: true });
		writeFileSync(join(dir, "scout.md"), "# Extra\nhello", "utf-8");
		const out = appendLearnOverlayMarkdown("scout", "BASE");
		assert.ok(out.includes("BASE"));
		assert.ok(out.includes("hello"));
	} finally {
		delete process.env.GSD_LEARN_OVERLAY_DIR;
		rmSync(dir, { recursive: true, force: true });
	}
});

test("appendLearnOverlayMarkdown returns body when overlay file missing", () => {
	const dir = mkdtempSync(join(tmpdir(), "learn-miss-"));
	process.env.GSD_LEARN_OVERLAY_DIR = dir;
	try {
		mkdirSync(dir, { recursive: true });
		assert.equal(appendLearnOverlayMarkdown("nobody", "ONLY"), "ONLY");
	} finally {
		delete process.env.GSD_LEARN_OVERLAY_DIR;
		rmSync(dir, { recursive: true, force: true });
	}
});

test("appendLearnOverlayMarkdown returns body when overlay file is whitespace only", () => {
	const dir = mkdtempSync(join(tmpdir(), "learn-ws-"));
	process.env.GSD_LEARN_OVERLAY_DIR = dir;
	try {
		mkdirSync(dir, { recursive: true });
		writeFileSync(join(dir, "scout.md"), "  \n\t  ", "utf-8");
		assert.equal(appendLearnOverlayMarkdown("scout", "BASE"), "BASE");
	} finally {
		delete process.env.GSD_LEARN_OVERLAY_DIR;
		rmSync(dir, { recursive: true, force: true });
	}
});

test("appendLearnOverlayMarkdown returns body on read failure (path is directory)", () => {
	const dir = mkdtempSync(join(tmpdir(), "learn-eisdir-"));
	process.env.GSD_LEARN_OVERLAY_DIR = dir;
	try {
		mkdirSync(dir, { recursive: true });
		mkdirSync(join(dir, "scout.md"), { recursive: true });
		assert.equal(appendLearnOverlayMarkdown("scout", "BASE"), "BASE");
	} finally {
		delete process.env.GSD_LEARN_OVERLAY_DIR;
		rmSync(dir, { recursive: true, force: true });
	}
});

test("appendLearnOverlayMarkdown ignores non-absolute GSD_LEARN_OVERLAY_DIR", () => {
	const fakeHome = mkdtempSync(join(tmpdir(), "learn-fake-home-"));
	const overlays = join(fakeHome, ".gsd", "agent", "agents", "overlays");
	const prevHome = process.env.HOME;
	const prevLearn = process.env.GSD_LEARN_OVERLAY_DIR;
	process.env.HOME = fakeHome;
	process.env.GSD_LEARN_OVERLAY_DIR = "relative/not/used";
	try {
		mkdirSync(overlays, { recursive: true });
		writeFileSync(join(overlays, "agent_x.md"), "from-home", "utf-8");
		const out = appendLearnOverlayMarkdown("agent_x", "CORE");
		assert.ok(out.includes("from-home"));
	} finally {
		if (prevHome !== undefined) process.env.HOME = prevHome;
		else delete process.env.HOME;
		if (prevLearn !== undefined) process.env.GSD_LEARN_OVERLAY_DIR = prevLearn;
		else delete process.env.GSD_LEARN_OVERLAY_DIR;
		rmSync(fakeHome, { recursive: true, force: true });
	}
});
