import type { z } from "zod";
import { config } from "../config/env.js";
import { generateWithFallback } from "../services/llmWithFallback.js";
import { collectHeadlines } from "./collect.js";
import { extrasSchema, frontSchema, sectionsSchema } from "./draftSchema.js";
import { buildEditionPrompt, type EditionPart } from "./prompt.js";
import { extractJsonObject } from "./repairJson.js";
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
// Some pool backends loop in JSON mode; a cap turns that into a parse
// failure instead of a call that never returns.
const MAX_OUTPUT_TOKENS = 3000;
// Each attempt lands on a random pool backend, so retrying is what gets past
// the ones that answer with reasoning text instead of JSON.
const ATTEMPTS = 3;

// generateObject resolves to the parsed output (defaults applied), which the
// shared helper types as the schema input; the cast restores the output type.
async function generatePart<S extends z.ZodTypeAny>(
	schema: S,
	// Schema defaults turn "{}" into a valid empty part; this rejects that.
	useful: (result: z.output<S>) => boolean,
	part: EditionPart,
	window: EditionWindow,
	picked: Headline[],
	onFront: string[] = [],
): Promise<z.output<S> | null> {
	const prompt = buildEditionPrompt(window, picked, part, onFront);
	for (let attempt = 1; attempt <= ATTEMPTS; attempt++) {
		const started = Date.now();
		// LiteLLM caches responses by prompt, bad ones included; a unique
		// request line makes every attempt a fresh call.
		const result = (await generateWithFallback({
			schema,
			prompt: `Pedido ${started}-${attempt}.\n${prompt}`,
			abortSignal: AbortSignal.timeout(config.editions.aiTimeoutMs),
			logTag: `Edition:${part}`,
			mode: "json",
			maxTokens: MAX_OUTPUT_TOKENS,
			repairText: extractJsonObject,
		})) as z.output<S> | null;
		const ok = result !== null && useful(result);
		console.log(
			`[Edition:${part}] attempt ${attempt} ${ok ? "ok" : result ? "empty" : "failed"} in ${Date.now() - started} ms`,
		);
		if (ok) return result;
	}
	return null;
}

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

	const front = await generatePart(
		frontSchema,
		(r) => [r.manchete, ...r.destaques].some((s) => s.fontes.length > 0),
		"front",
		window,
		picked,
	);
	if (!front) throw new Error("[Edition] Model returned no front page");
	const onFront = [front.manchete, ...front.destaques].map((s) => s.titulo);
	// Sections and extras are optional: a failed call drops them, not the edition.
	const [sections, extras] = await Promise.all([
		generatePart(
			sectionsSchema,
			(r) => r.secoes.some((s) => s.materias.length + s.notas.length > 0),
			"sections",
			window,
			picked,
			onFront,
		),
		generatePart(
			extrasSchema,
			(r) =>
				r.fio.length + r.numeros.length + r.leve.length + r.quiz.length > 0,
			"extras",
			window,
			picked,
			onFront,
		),
	]);
	const raw = {
		...front,
		secoes: sections?.secoes ?? [],
		...(extras ?? { fio: [], numeros: [], leve: [], quiz: [] }),
	};
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
