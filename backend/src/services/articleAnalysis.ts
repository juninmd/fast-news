import { z } from "zod";
import { config } from "../config/env.js";
import { query } from "../database/client.js";
import { tryConsume } from "./llmBudget.js";
import { generateWithFallback } from "./llmWithFallback.js";
import {
	buildRelevancePrompt,
	heuristicRelevance,
	type RelevanceResult,
	RelevanceSchema,
} from "./relevance.js";
import { THEME_TAXONOMY } from "./themeClassification.js";

/**
 * Tema editorial e relevância numa chamada só. Antes cada artigo pagava três
 * chamadas com o mesmo texto (resumo para o embedding, tema e relevância); o
 * embedding agora usa o texto cru, e tema + relevância saem juntos.
 */
export const ArticleAnalysisSchema = RelevanceSchema.extend({
	theme: z
		.enum(THEME_TAXONOMY)
		.describe(
			'A categoria editorial que melhor descreve o ASSUNTO da notícia (não a fonte); "Geral" se nenhuma se aplicar',
		),
});

export type ArticleAnalysis = z.infer<typeof ArticleAnalysisSchema>;

const THEME_INSTRUCTION = `\n\nClassifique também o ASSUNTO da notícia (theme) em UMA destas categorias: ${THEME_TAXONOMY.join(", ")}.`;

export function fallbackTheme(category: string): string {
	return (THEME_TAXONOMY as readonly string[]).includes(category)
		? category
		: "Mundo";
}

interface ArticleInput {
	id: string;
	title: string;
	content: string;
	category: string;
	promptHint?: string | null;
	storyId?: string | null;
}

interface StoredAnalysis {
	theme: string;
	relevance: RelevanceResult;
}

async function persist(id: string, theme: string, r: RelevanceResult) {
	await query(
		`UPDATE news_articles SET
			theme_category = $1,
			relevance_score = $2,
			relevance_reasoning = $3,
			is_spam_or_promo = $4,
			should_post_telegram = $5
		 WHERE id = $6`,
		[
			theme,
			r.relevanceScore,
			r.reason,
			r.isSpamOrPromo,
			r.shouldPostTelegram,
			id,
		],
	);
}

/** Uma cópia da mesma história já analisada (outro veículo, mesma notícia). */
async function analyzedSibling(
	storyId: string,
	articleId: string,
): Promise<StoredAnalysis | null> {
	const res = await query<{
		theme_category: string;
		relevance_score: number;
		relevance_reasoning: string | null;
		is_spam_or_promo: boolean | null;
	}>(
		`SELECT na.theme_category, na.relevance_score, na.relevance_reasoning, na.is_spam_or_promo
		   FROM story_articles sa
		   JOIN news_articles na ON na.id = sa.article_id
		  WHERE sa.story_id = $1 AND na.id <> $2
		    AND na.theme_category IS NOT NULL AND na.relevance_score IS NOT NULL
		  ORDER BY na.created_at ASC
		  LIMIT 1`,
		[storyId, articleId],
	);
	const row = res.rows[0];
	if (!row) return null;
	return {
		theme: row.theme_category,
		relevance: {
			relevanceScore: row.relevance_score,
			isSpamOrPromo: !!row.is_spam_or_promo,
			isDuplicateOrRehash: true,
			// A história já foi avaliada (e postada, se valia): a cópia não posta de novo.
			shouldPostTelegram: false,
			reason:
				`Herdado da história ${storyId}: ${row.relevance_reasoning ?? ""}`.slice(
					0,
					500,
				),
		},
	};
}

function inherit(first: StoredAnalysis, storyId: string): StoredAnalysis {
	return {
		theme: first.theme,
		relevance: {
			...first.relevance,
			isDuplicateOrRehash: true,
			// A história já foi avaliada (e postada, se valia): a cópia não posta de novo.
			shouldPostTelegram: false,
			reason: `Herdado da história ${storyId}: ${first.relevance.reason}`.slice(
				0,
				500,
			),
		},
	};
}

/** Análises em andamento por história: duas cópias no mesmo run esperam a primeira. */
const inFlight = new Map<string, Promise<StoredAnalysis | null>>();

/** Limita chamadas simultâneas: o ingest dispara isto para centenas de artigos. */
let active = 0;
const waiting: Array<() => void> = [];
async function gate<T>(fn: () => Promise<T>): Promise<T> {
	const limit = Math.max(1, config.ingestion.analysisConcurrency);
	if (active >= limit) await new Promise<void>((r) => waiting.push(r));
	active++;
	try {
		return await fn();
	} finally {
		active--;
		waiting.shift()?.();
	}
}

async function analyzeWithModel(
	input: ArticleInput,
): Promise<StoredAnalysis | null> {
	const fallback = fallbackTheme(input.category);
	const local = heuristicRelevance(input.title);
	if (local) return { theme: fallback, relevance: local };

	const cap = config.llmBudget.relevancePerDay;
	if (cap > 0 && !tryConsume("relevance", cap)) return null;

	const object = await gate(() =>
		generateWithFallback({
			schema: ArticleAnalysisSchema,
			prompt:
				buildRelevancePrompt(
					input.title,
					input.content,
					input.category,
					input.promptHint,
				) + THEME_INSTRUCTION,
			logTag: "articleAnalysis",
			maxTokens: 400,
		}),
	);
	if (!object) return null;
	const { theme, ...relevance } = object;
	return { theme, relevance };
}

/**
 * Analisa um artigo recém-agrupado. Se outra cópia da mesma história já foi
 * analisada, herda tema e relevância sem chamar o modelo. Nunca lança.
 */
export async function analyzeArticle(
	input: ArticleInput,
): Promise<StoredAnalysis | null> {
	try {
		const storyId = input.storyId ?? null;
		let result: StoredAnalysis | null = null;
		const pending = storyId ? inFlight.get(storyId) : undefined;
		if (storyId && pending) {
			const first = await pending;
			if (first) result = inherit(first, storyId);
		} else {
			// Registrada antes de qualquer await: a cópia seguinte já encontra a promessa.
			const job = (async () =>
				(storyId ? await analyzedSibling(storyId, input.id) : null) ??
				(await analyzeWithModel(input)))();
			if (storyId) inFlight.set(storyId, job);
			try {
				result = await job;
			} finally {
				if (storyId) inFlight.delete(storyId);
			}
		}
		if (!result) {
			// Sem modelo (fora do ar ou teto diário): tema pela categoria do feed.
			await query(
				"UPDATE news_articles SET theme_category = $1 WHERE id = $2 AND theme_category IS NULL",
				[fallbackTheme(input.category), input.id],
			);
			return null;
		}
		await persist(input.id, result.theme, result.relevance);
		console.log(
			`[articleAnalysis] ${input.id} theme=${result.theme} score=${result.relevance.relevanceScore} post=${result.relevance.shouldPostTelegram}`,
		);
		return result;
	} catch (err) {
		console.warn(
			"[articleAnalysis] failed:",
			(err as Error).message.slice(0, 120),
		);
		return null;
	}
}
