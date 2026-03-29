import { test, before } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, writeFileSync, rmSync, mkdtempSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { getEnvApiKey } from "./env-api-keys.js";
import { resetGsdEnvWarningCacheForTests } from "./gsd-env-boolean.js";

async function waitForBedrockFsHelpers(maxMs = 500): Promise<void> {
	const start = Date.now();
	while (Date.now() - start < maxMs) {
		// Warm path: once dynamic node:fs import completes, default creds path works
		const home = mkdtempSync(join(tmpdir(), "bedrock-warm-"));
		try {
			mkdirSync(join(home, ".aws"), { recursive: true });
			writeFileSync(join(home, ".aws", "config"), "[default]\nregion = us-east-1\n", "utf-8");
			const prevHome = process.env.HOME;
			process.env.HOME = home;
			process.env.GSD_BEDROCK_ASSUME_DEFAULT_CREDS = "true";
			delete process.env.AWS_PROFILE;
			delete process.env.AWS_ACCESS_KEY_ID;
			resetGsdEnvWarningCacheForTests();
			const v = getEnvApiKey("amazon-bedrock");
			process.env.HOME = prevHome;
			delete process.env.GSD_BEDROCK_ASSUME_DEFAULT_CREDS;
			if (v === "<authenticated>") return;
		} finally {
			rmSync(home, { recursive: true, force: true });
		}
		await new Promise((r) => setTimeout(r, 10));
	}
}

before(async () => {
	await waitForBedrockFsHelpers();
});

test("getEnvApiKey amazon-bedrock: GSD_BEDROCK_ASSUME_DEFAULT_CREDS + ~/.aws/config", async () => {
	const home = mkdtempSync(join(tmpdir(), "bedrock-auth-"));
	mkdirSync(join(home, ".aws"), { recursive: true });
	writeFileSync(join(home, ".aws", "config"), "[default]\nregion = us-east-1\n", "utf-8");

	const prev = {
		HOME: process.env.HOME,
		AWS_PROFILE: process.env.AWS_PROFILE,
		AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID,
		AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY,
		GSD_BEDROCK_ASSUME_DEFAULT_CREDS: process.env.GSD_BEDROCK_ASSUME_DEFAULT_CREDS,
		GROQ_API_KEY: process.env.GROQ_API_KEY,
	};

	process.env.HOME = home;
	delete process.env.AWS_PROFILE;
	delete process.env.AWS_ACCESS_KEY_ID;
	delete process.env.AWS_SECRET_ACCESS_KEY;
	process.env.GSD_BEDROCK_ASSUME_DEFAULT_CREDS = "true";
	process.env.GROQ_API_KEY = "gsk_test_fake_key_for_regression";
	resetGsdEnvWarningCacheForTests();

	try {
		let v: string | undefined;
		for (let i = 0; i < 80; i++) {
			v = getEnvApiKey("amazon-bedrock");
			if (v === "<authenticated>") break;
			await new Promise((r) => setTimeout(r, 10));
		}
		assert.equal(v, "<authenticated>");
		assert.equal(getEnvApiKey("groq"), "gsk_test_fake_key_for_regression");
	} finally {
		process.env.HOME = prev.HOME;
		if (prev.AWS_PROFILE !== undefined) process.env.AWS_PROFILE = prev.AWS_PROFILE;
		else delete process.env.AWS_PROFILE;
		if (prev.AWS_ACCESS_KEY_ID !== undefined) process.env.AWS_ACCESS_KEY_ID = prev.AWS_ACCESS_KEY_ID;
		else delete process.env.AWS_ACCESS_KEY_ID;
		if (prev.AWS_SECRET_ACCESS_KEY !== undefined)
			process.env.AWS_SECRET_ACCESS_KEY = prev.AWS_SECRET_ACCESS_KEY;
		else delete process.env.AWS_SECRET_ACCESS_KEY;
		if (prev.GSD_BEDROCK_ASSUME_DEFAULT_CREDS !== undefined)
			process.env.GSD_BEDROCK_ASSUME_DEFAULT_CREDS = prev.GSD_BEDROCK_ASSUME_DEFAULT_CREDS;
		else delete process.env.GSD_BEDROCK_ASSUME_DEFAULT_CREDS;
		if (prev.GROQ_API_KEY !== undefined) process.env.GROQ_API_KEY = prev.GROQ_API_KEY;
		else delete process.env.GROQ_API_KEY;
		rmSync(home, { recursive: true, force: true });
		resetGsdEnvWarningCacheForTests();
	}
});

test("getEnvApiKey amazon-bedrock: assume flag off does not use files alone", async () => {
	const home = mkdtempSync(join(tmpdir(), "bedrock-no-assume-"));
	mkdirSync(join(home, ".aws"), { recursive: true });
	writeFileSync(join(home, ".aws", "credentials"), "[default]\naws_access_key_id = x\n", "utf-8");

	const prevHome = process.env.HOME;
	process.env.HOME = home;
	delete process.env.AWS_PROFILE;
	delete process.env.AWS_ACCESS_KEY_ID;
	delete process.env.GSD_BEDROCK_ASSUME_DEFAULT_CREDS;
	resetGsdEnvWarningCacheForTests();

	try {
		await new Promise((r) => setTimeout(r, 50));
		const v = getEnvApiKey("amazon-bedrock");
		assert.notEqual(v, "<authenticated>");
	} finally {
		process.env.HOME = prevHome;
		rmSync(home, { recursive: true, force: true });
	}
});
