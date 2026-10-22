import { z } from "zod";
import { config } from "../config/env.js";
import { query } from "../database/client.js";
import { tryConsume } from "./llmBudget.js";
import { generateWithFallback } from "./llmWithFallback.js";
import { stripAccents } from "./textSimilarity.js";

export const SUPPORTED_LANGS = ["pt", "en", "es"] as const;
export type Lang = (typeof SUPPORTED_LANGS)[number];

export function isLang(v: unknown): v is Lang {
	return (
		typeof v === "string" && (SUPPORTED_LANGS as readonly string[]).includes(v)
	);
}

const LANG_NAME: Record<Lang, string> = {
	pt: "português do Brasil",
	en: "English",
	es: "español",
};

// Function words that rarely overlap between the three languages (shared ones like "para" or "que" are left out on purpose).
const MARKERS: Record<Lang, string[]> = {
	pt: [
		"de",
		"da",
		"do",
		"das",
		"dos",
		"em",
		"com",
		"uma",
		"nao",
		"pelo",
		"pela",
		"sobre",
		"apos",
		"ao",
		"aos",
		"numa",
	],
	en: [
		"the",
		"of",
		"and",
		"to",
		"in",
		"for",
		"with",
		"is",
		"are",
		"on",
		"after",
		"over",
		"how",
		"why",
	],
	es: [
		"el",
		"los",
		"las",
		"del",
		"en",
		"con",
		"una",
		"sobre",
		"tras",
		"como",
		"al",
	],
};

/** Cheap language guess so already-translated titles never reach the model. */
export function detectLang(text: string): Lang | null {
	const words = stripAccents(text.toLowerCase())
		.split(/[^a-z]+/)
		.filter(Boolean);
	if (words.length < 3) return null;
	let best: Lang | null = null;
	let bestScore = 0;
	let second = 0;
	for (const lang of SUPPORTED_LANGS) {
		const set = new Set(MARKERS[lang]);
		const score = words.filter((w) => set.has(w)).length;
		if (score > bestScore) {
			second = bestScore;
			bestScore = score;
			best = lang;
		} else if (score > second) second = score;
	}
	return bestScore >= 1 && bestScore > second ? best : null;
}

const BATCH = 25;
const TranslationSchema = z.object({
	items: z.array(z.object({ i: z.number().int(), text: z.string() })),
});

export function buildTranslationPrompt(titles: string[], lang: Lang): string {
	return `Traduza cada título de notícia abaixo para ${LANG_NAME[lang]}. Mantenha nomes próprios, siglas e números; não explique nada. Responda com "i" igual ao índice recebido e "text" com o título traduzido.

${titles.map((t, i) => `${i}: ${t.replace(/\s+/g, " ").trim()}`).join("\n")}`;
}

/** Maps the model output back to inputs by index, ignoring invented or empty entries. */
export function parseTranslations(
	items: Array<{ i: number; text: string }>,
	count: number,
): Map<number, string> {
	const out = new Map<number, string>();
	for (const { i, text } of items) {
		const t = text.replace(/\s+/g, " ").trim();
		if (Number.isInteger(i) && i >= 0 && i < count && t && !out.has(i))
			out.set(i, t.slice(0, 300));
	}
	return out;
}

export interface TranslatedTitle {
	id: string;
	title: string;
	/** "cache" | "model" | "same-language" | "unavailable" */
	origin: string;
}

/**
 * Cache first, language heuristic second, model last. At most one model call
 * per BATCH titles, charged against the daily translation budget; when the
 * budget is spent the original title is returned instead of failing.
 */
export async function translateTitles(
	ids: string[],
	lang: Lang,
): Promise<TranslatedTitle[]> {
	const unique = [...new Set(ids)].slice(0, 100);
	if (!unique.length) return [];

	const rows = await query<{
		id: string;
		title: string;
		cached: string | null;
	}>(
		`SELECT na.id, na.title, t.title AS cached
		 FROM news_articles na
		 LEFT JOIN article_translations t ON t.article_id = na.id AND t.lang = $2
		 WHERE na.id = ANY($1::uuid[])`,
		[unique, lang],
	);

	const result = new Map<string, TranslatedTitle>();
	const pending: Array<{ id: string; title: string }> = [];
	for (const r of rows.rows) {
		if (r.cached)
			result.set(r.id, { id: r.id, title: r.cached, origin: "cache" });
		else if (detectLang(r.title) === lang)
			result.set(r.id, { id: r.id, title: r.title, origin: "same-language" });
		else pending.push({ id: r.id, title: r.title });
	}

	for (let i = 0; i < pending.length; i += BATCH) {
		const chunk = pending.slice(i, i + BATCH);
		const keep = (origin: string) => {
			for (const p of chunk)
				result.set(p.id, { id: p.id, title: p.title, origin });
		};
		if (
			!tryConsume(
				"translation",
				config.llmBudget.translationPerDay,
				chunk.length,
			)
		) {
			keep("unavailable");
			continue;
		}
		const object = await generateWithFallback({
			schema: TranslationSchema,
			prompt: buildTranslationPrompt(
				chunk.map((c) => c.title),
				lang,
			),
			logTag: "translation",
			maxTokens: 60 * chunk.length,
		});
		if (!object) {
			keep("unavailable");
			continue;
		}
		const parsed = parseTranslations(object.items, chunk.length);
		for (const [idx, text] of parsed) {
			const p = chunk[idx];
			if (!p) continue;
			result.set(p.id, { id: p.id, title: text, origin: "model" });
			await query(
				`INSERT INTO article_translations (article_id, lang, title) VALUES ($1, $2, $3)
				 ON CONFLICT (article_id, lang) DO NOTHING`,
				[p.id, lang, text],
			).catch((e: Error) =>
				console.warn("[translation] cache write failed:", e.message),
			);
		}
		for (const [idx, p] of chunk.entries())
			if (!parsed.has(idx))
				result.set(p.id, { id: p.id, title: p.title, origin: "unavailable" });
	}

	return unique.flatMap((id) => {
		const r = result.get(id);
		return r ? [r] : [];
	});
}
