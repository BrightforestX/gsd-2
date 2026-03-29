import test from "node:test";
import assert from "node:assert/strict";
import { getEnvApiKey } from "../../packages/pi-ai/src/env-api-keys.js";
import { resetGsdEnvWarningCacheForTests } from "../../packages/pi-ai/src/gsd-env-boolean.js";

test("GROQ_API_KEY still resolves when GSD_BEDROCK_ASSUME_DEFAULT_CREDS toggles", () => {
	const prevGroq = process.env.GROQ_API_KEY;
	const prevBedrock = process.env.GSD_BEDROCK_ASSUME_DEFAULT_CREDS;
	process.env.GROQ_API_KEY = "gsk_test_env_passthrough";
	try {
		process.env.GSD_BEDROCK_ASSUME_DEFAULT_CREDS = "true";
		resetGsdEnvWarningCacheForTests();
		assert.equal(getEnvApiKey("groq"), "gsk_test_env_passthrough");
		process.env.GSD_BEDROCK_ASSUME_DEFAULT_CREDS = "trues";
		resetGsdEnvWarningCacheForTests();
		assert.equal(getEnvApiKey("groq"), "gsk_test_env_passthrough");
	} finally {
		if (prevGroq !== undefined) process.env.GROQ_API_KEY = prevGroq;
		else delete process.env.GROQ_API_KEY;
		if (prevBedrock !== undefined) process.env.GSD_BEDROCK_ASSUME_DEFAULT_CREDS = prevBedrock;
		else delete process.env.GSD_BEDROCK_ASSUME_DEFAULT_CREDS;
		resetGsdEnvWarningCacheForTests();
	}
});
