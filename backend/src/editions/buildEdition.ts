import { config } from "../config/env.js";
import { generateWithFallback } from "../services/llmWithFallback.js";
import { collectHeadlines } from "./collect.js";
import { draftSchema } from "./draftSchema.js";
import { buildEditionPrompt } from "./prompt.js";
import { sanitizeDraft } from "./sanitize.js";
import {
	cleanHeadlines,
	hourlyCounts,
	isFactCheck,
	pickForPrompt,
} from "./select.js";
import type {
	Edition,
	EditionDraft,
	EditionWindow,
	Headline,
} from "./types.js";

const MIN_HEADLINES = 20;

export async function buildEdition(window: EditionWindow): Promise<Edition> {
	const all = await collectHeadlines(window);
	const clean = cleanHeadlines(all, config.editions.excludedCategories);
	const checagens = clean.filter(isFactCheck).slice(-4);
	const news = clean.filter((h) => !isFactCheck(h));
	if (news.length < MIN_HEADLINES)
		throw new Error(
			`[Edition] Only ${news.length} usable headlines in ${window.start.toISOString()}..${window.end.toISOString()}; ingestion may be down`,
		);

	const picked = pickForPrompt(
		news,
		config.editions.maxHeadlines,
		config.editions.perSource,
	);
	const known = new Map<number, Headline>(picked.map((h) => [h.id, h]));
	console.log(
		`[Edition] ${window.kind} ${window.day}: ${all.length} articles, ${clean.length} clean, ${picked.length} sent to the model`,
	);

	const raw = await generateWithFallback({
		schema: draftSchema,
		prompt: buildEditionPrompt(window, picked),
		abortSignal: AbortSignal.timeout(config.editions.aiTimeoutMs),
		logTag: "Edition",
	});
	if (!raw) throw new Error("[Edition] Model returned no draft");
	const draft = sanitizeDraft(raw as EditionDraft, known);
	for (const h of checagens) known.set(h.id, h);

	return {
		window,
		draft,
		headlines: known,
		checagens,
		hourly: hourlyCounts(
			all.map((h) => h.createdAt),
			window.start,
		),
		totalArticles: all.length,
		totalSources: new Set(all.map((h) => h.source)).size,
	};
}
