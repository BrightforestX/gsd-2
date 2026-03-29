/**
 * Parse GSD_* environment flags: `1`, `true`, `yes` (case-insensitive) → enabled.
 * Any other non-empty value is invalid → disabled + optional one-time stderr warning.
 */

const warnedInvalidKeys = new Set<string>();

/** Clears one-time invalid-env warnings (for tests only). */
export function resetGsdEnvWarningCacheForTests(): void {
	warnedInvalidKeys.clear();
}

export interface GsdTruthyParseResult {
	enabled: boolean;
	/** True when value was non-empty but not a recognized truthy token */
	invalidNonEmpty: boolean;
}

/**
 * Parse a GSD-style boolean env value.
 */
export function parseGsdTruthyEnv(value: string | undefined): GsdTruthyParseResult {
	if (value === undefined || value === "") {
		return { enabled: false, invalidNonEmpty: false };
	}
	const v = value.trim().toLowerCase();
	if (v === "1" || v === "true" || v === "yes") {
		return { enabled: true, invalidNonEmpty: false };
	}
	return { enabled: false, invalidNonEmpty: true };
}

/**
 * Log a single stderr line once per env var name when value is non-empty but not truthy.
 */
export function warnInvalidGsdEnvOnce(envName: string, raw: string | undefined): void {
	const { invalidNonEmpty } = parseGsdTruthyEnv(raw);
	if (!invalidNonEmpty || raw === undefined || raw === "") return;
	if (warnedInvalidKeys.has(envName)) return;
	warnedInvalidKeys.add(envName);
	if (typeof process !== "undefined" && process.stderr?.write) {
		process.stderr.write(
			`[${envName}] ignored non-empty value "${raw.trim()}" (use true, 1, or yes)\n`,
		);
	}
}
