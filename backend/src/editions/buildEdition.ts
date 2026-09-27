import type { z } from "zod";
import { config } from "../config/env.js";
import { generateWithFallback } from "../services/llmWithFallback.js";
import { fetchMarketSnapshot } from "../services/marketData.js";
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

/**
 * Collects and derives the window's headline sets: the one place that turns
 * a raw collect() result into clean/checagens/news. buildEdition and the
 * recovery runner (resendEditionDocument) both call this so a stored
 * edition can be rebuilt byte-for-byte without re-deriving checagens by
 * hand and drifting from the original (the fact-check section silently
 * diverged this way once already).
 */
export async function deriveWindowHeadlines(window: EditionWindow): Promise<{
	all: Headline[];
	clean: Headline[];
	checagens: Headline[];
	news: Headline[];
}> {
	const all = await collectHeadlines(window);
	const clean = cleanHeadlines(all, config.editions.excludedCategories);
	const checagens = clean.filter(isFactCheck).slice(-4);
	const news = clean.filter((h) => !isFactCheck(h));
	return { all, clean, checagens, news };
}

export async function buildEdition(window: EditionWindow): Promise<Edition> {
	const { all, checagens, news } = await deriveWindowHeadlines(window);
	if (news.length === 0)
		throw new Error(
			`[Edition] No usable news in ${window.start.toISOString()}..${window.end.toISOString()}; keeping the last valid edition unchanged`,
		);

	const picked = pickForPrompt(
		news,
		config.editions.maxHeadlines,
		config.editions.perSource,
	);
	const known = new Map<number, Headline>(picked.map((h) => [h.id, h]));
	console.log(
		`[Edition] ${window.kind} ${window.day}: ${all.length} articles, ${news.length + checagens.length} clean, ${picked.length} sent to the model`,
	);

	let front = await generatePart(
		frontSchema,
		(r) => [r.manchete, ...r.destaques].some((s) => s.fontes.length > 0),
		"front",
		window,
		picked,
	);
	const frontFallback = front === null;
	if (!front) {
		const lead = picked[0];
		if (!lead)
			throw new Error(
				"[Edition] No eligible headline can support a factual cover",
			);
		front = {
			manchete: {
				titulo: lead.title,
				linhaFina: "",
				texto: lead.snippet,
				paragrafos: lead.snippet ? [lead.snippet] : [],
				fontes: [lead.id],
			},
			destaques: [],
		};
		console.warn(
			"[Edition] AI cover failed; using a sourced headline as the cover",
		);
	}
	const onFront = [front.manchete, ...front.destaques].map((s) => s.titulo);
	// Sections, extras and the market snapshot are optional: a failed call
	// drops them, not the edition.
	const [sections, extras, market] = await Promise.all([
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
		fetchMarketSnapshot(),
	]);
	const generatedSections = sections?.secoes ?? [];
	const raw = {
		...front,
		secoes: generatedSections,
		...(extras ?? { fio: [], numeros: [], leve: [], quiz: [] }),
	};
	const editorial = sanitizeDraft(raw as EditionDraft, known);
	const used = new Set<number>([
		...editorial.manchete.fontes,
		...editorial.destaques.flatMap((story) => story.fontes),
		...editorial.secoes.flatMap((section) =>
			section.materias.flatMap((story) => story.fontes),
		),
	]);
	const unrepresented = picked.filter((headline) => !used.has(headline.id));
	const factualSections = new Map<
		string,
		EditionDraft["secoes"][number]["materias"]
	>();
	for (const headline of unrepresented) {
		const category = headline.category.trim() || "Outras notícias";
		const stories = factualSections.get(category) ?? [];
		stories.push({
			titulo: headline.title,
			texto: headline.snippet,
			fontes: [headline.id],
		});
		factualSections.set(category, stories);
	}
	const draft = factualSections.size
		? sanitizeDraft(
				{
					...editorial,
					secoes: [
						...editorial.secoes,
						...[...factualSections].map(([nome, materias]) => ({
							nome,
							materias,
							notas: [],
						})),
					],
				},
				known,
			)
		: editorial;
	for (const h of checagens) known.set(h.id, h);

	return {
		window,
		draft,
		headlines: known,
		checagens,
		coverage: {
			collected: all.length,
			eligible: news.length + checagens.length,
			selectedForAi: picked.length,
			omittedBeforeAi: Math.max(0, news.length - picked.length),
			modelFallback: frontFallback || sections === null,
		},
		hourly: hourlyCounts(
			all.map((h) => h.createdAt),
			window.start,
			Math.round((window.end.getTime() - window.start.getTime()) / 3_600_000),
		),
		totalArticles: all.length,
		totalSources: new Set(all.map((h) => h.source)).size,
		market,
	};
}
