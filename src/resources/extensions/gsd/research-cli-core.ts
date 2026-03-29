/**
 * Shared plan for `gsd research` / `/gsd research` — same targets as dispatch "research".
 */

import { deriveState } from "./state.js";
import {
	resolveMilestoneFile,
	resolveMilestonePath,
	resolveSliceFile,
	resolveSlicePath,
	buildMilestoneFileName,
	buildSliceFileName,
} from "./paths.js";
import { buildResearchMilestonePrompt, buildResearchSlicePrompt } from "./auto-prompts.js";
import { loadEffectiveGSDPreferences } from "./preferences.js";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

export type ResearchCliCoreOptions = {
	forceSlice?: boolean;
	forceMilestone?: boolean;
};

export type ResearchPlanOk = {
	ok: true;
	unitType: "research-milestone" | "research-slice";
	unitId: string;
	targetPath: string;
	prompt: string;
	existingContent: string | undefined;
};

export type ResearchPlanErr = { ok: false; message: string };

export async function planResearchArtifact(
	basePath: string,
	options: ResearchCliCoreOptions = {},
): Promise<ResearchPlanOk | ResearchPlanErr> {
	const state = await deriveState(basePath);
	const mid = state.activeMilestone?.id;
	const midTitle = state.activeMilestone?.title ?? "";
	if (!mid) {
		return { ok: false, message: "No active milestone — open or create a milestone first." };
	}

	let isSlice =
		options.forceSlice ||
		(!options.forceMilestone && state.phase !== "pre-planning");

	if (options.forceMilestone) {
		isSlice = false;
	}

	if (isSlice) {
		const sid = state.activeSlice?.id;
		const sTitle = state.activeSlice?.title ?? "";
		if (!sid) {
			return { ok: false, message: "No active slice — cannot run slice research." };
		}

		const sliceContextFile = resolveSliceFile(basePath, mid, sid, "CONTEXT");
		const requireDiscussion =
			loadEffectiveGSDPreferences()?.preferences?.phases?.require_slice_discussion;
		if (requireDiscussion && !sliceContextFile) {
			return {
				ok: false,
				message: `Slice ${sid} requires discussion before planning. Run /gsd discuss first.`,
			};
		}

		const targetPath = resolveResearchSlicePath(basePath, mid, sid);
		const prompt = await buildResearchSlicePrompt(mid, midTitle, sid, sTitle, basePath);
		return {
			ok: true,
			unitType: "research-slice",
			unitId: `${mid}/${sid}`,
			targetPath,
			prompt,
			existingContent: existsSync(targetPath) ? readFileSync(targetPath, "utf-8") : undefined,
		};
	}

	const targetPath = resolveResearchMilestonePath(basePath, mid);
	const prompt = await buildResearchMilestonePrompt(mid, midTitle, basePath);
	return {
		ok: true,
		unitType: "research-milestone",
		unitId: mid,
		targetPath,
		prompt,
		existingContent: existsSync(targetPath) ? readFileSync(targetPath, "utf-8") : undefined,
	};
}

function resolveResearchMilestonePath(basePath: string, mid: string): string {
	const existing = resolveMilestoneFile(basePath, mid, "RESEARCH");
	if (existing) return existing;
	const mDir = resolveMilestonePath(basePath, mid);
	if (!mDir) {
		return join(basePath, ".gsd", "milestones", mid, buildMilestoneFileName(mid, "RESEARCH"));
	}
	return join(mDir, buildMilestoneFileName(mid, "RESEARCH"));
}

function resolveResearchSlicePath(basePath: string, mid: string, sid: string): string {
	const existing = resolveSliceFile(basePath, mid, sid, "RESEARCH");
	if (existing) return existing;
	const sDir = resolveSlicePath(basePath, mid, sid);
	if (!sDir) {
		return join(
			basePath,
			".gsd",
			"milestones",
			mid,
			"slices",
			sid,
			buildSliceFileName(sid, "RESEARCH"),
		);
	}
	return join(sDir, buildSliceFileName(sid, "RESEARCH"));
}
