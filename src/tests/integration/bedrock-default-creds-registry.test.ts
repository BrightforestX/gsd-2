/**
 * Integration: ModelRegistry + AuthStorage + getEnvApiKey(Bedrock) with a temp HOME.
 */

import test from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, writeFileSync, rmSync, mkdtempSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { AuthStorage } from "../../../packages/pi-coding-agent/src/core/auth-storage.js";
import { ModelRegistry } from "../../../packages/pi-coding-agent/src/core/model-registry.js";
import { resetGsdEnvWarningCacheForTests } from "../../../packages/pi-ai/src/gsd-env-boolean.js";

test("ModelRegistry.getAvailable includes amazon-bedrock models when default AWS files + flag", async () => {
	const home = mkdtempSync(join(tmpdir(), "bedrock-registry-int-"));
	mkdirSync(join(home, ".aws"), { recursive: true });
	writeFileSync(join(home, ".aws", "credentials"), "[default]\naws_access_key_id = x\n", "utf-8");

	const prev: Record<string, string | undefined> = {
		HOME: process.env.HOME,
		AWS_PROFILE: process.env.AWS_PROFILE,
		AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID,
		AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY,
		AWS_SESSION_TOKEN: process.env.AWS_SESSION_TOKEN,
		GSD_BEDROCK_ASSUME_DEFAULT_CREDS: process.env.GSD_BEDROCK_ASSUME_DEFAULT_CREDS,
	};

	process.env.HOME = home;
	delete process.env.AWS_PROFILE;
	delete process.env.AWS_ACCESS_KEY_ID;
	delete process.env.AWS_SECRET_ACCESS_KEY;
	delete process.env.AWS_SESSION_TOKEN;
	process.env.GSD_BEDROCK_ASSUME_DEFAULT_CREDS = "yes";
	resetGsdEnvWarningCacheForTests();

	try {
		const storage = AuthStorage.inMemory({});
		const registry = new ModelRegistry(storage, undefined);

		let bedrock: ReturnType<ModelRegistry["getAvailable"]> = [];
		for (let i = 0; i < 100; i++) {
			bedrock = registry.getAvailable().filter((m) => m.provider === "amazon-bedrock");
			if (bedrock.length > 0) break;
			await new Promise((r) => setTimeout(r, 15));
		}

		assert.ok(bedrock.length > 0, "expected at least one amazon-bedrock model when auth resolves");
	} finally {
		for (const [k, v] of Object.entries(prev)) {
			if (v === undefined) delete process.env[k];
			else process.env[k] = v;
		}
		rmSync(home, { recursive: true, force: true });
		resetGsdEnvWarningCacheForTests();
	}
});
