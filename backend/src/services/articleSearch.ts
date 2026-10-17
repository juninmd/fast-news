import { createHash } from "crypto";
import { query } from "../database/client.js";
import { cacheGet, cacheSet } from "./cache.js";
import { type ArticleResult, searchSimilarArticles } from "./rag.js";

export type SearchMode = "semantic" | "keyword";

export interface ArticleSearch {
	mode: SearchMode;
	items: ArticleResult[];
}

/** Repeated identical searches during a cooldown window must not each pay for a table pass. */
const KEYWORD_CACHE_SECONDS = 120;
const MAX_TOKENS = 6;

/**
 * The embedding provider (a LiteLLM deployment) can go into cooldown, which used to
 * turn every search into a 500 — the old fallback re-embedded the query and failed
 * the same way. A keyword pass over the same table keeps the endpoints answering;
 * `mode` tells the client the ranking is not semantic.
 */
export async function searchArticles(
	queryText: string,
	options: { limit: number; daysBack?: number },
): Promise<ArticleSearch> {
	const daysBack = options.daysBack ?? 30;
	try {
		const items = await searchSimilarArticles(
			queryText,
			daysBack,
			options.limit,
		);
		return { mode: "semantic", items };
	} catch (error) {
		console.warn(
			`[articleSearch] busca semântica indisponível, usando palavras-chave: ${(error as Error).message}`,
		);
		const items = await searchArticlesByKeyword(queryText, {
			limit: options.limit,
			daysBack,
		});
		return { mode: "keyword", items };
	}
}

/**
 * LIKE patterns for the words worth matching. Each word yields both its raw and its
 * accent-stripped spelling: feeds store either "inteligência" or "inteligencia", and
 * matching only one form silently drops results.
 */
export function keywordPatterns(text: string): string[] {
	const words = text
		.split(/[^\p{L}\p{N}]+/u)
		.filter((word) => word.length >= 3)
		.slice(0, MAX_TOKENS);
	const patterns = new Set<string>();
	for (const word of words) {
		patterns.add(`%${word}%`);
		const stripped = word.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
		if (stripped.length >= 3) patterns.add(`%${stripped}%`);
	}
	return [...patterns];
}

/**
 * Text search over title and summary only: `content` is large and there is no
 * trigram/full-text index, so scanning it would make the fallback slower than the
 * failure it replaces. `published_at` bounds the scan to the same window the
 * semantic path uses.
 */
export async function searchArticlesByKeyword(
	queryText: string,
	options: { limit: number; daysBack?: number },
): Promise<ArticleResult[]> {
	const patterns = keywordPatterns(queryText);
	if (patterns.length === 0) return [];

	const daysBack = options.daysBack ?? 30;
	const cacheKey = `rag:keyword:${createHash("sha256")
		.update(`${queryText}:${daysBack}:${options.limit}`)
		.digest("hex")
		.slice(0, 32)}`;
	const cached = await cacheGet<ArticleResult[]>(cacheKey);
	if (cached) return cached;

	const result = await query<{
		id: string;
		title: string;
		summary: string | null;
		url: string;
		source: string;
		category: string;
		published_at: string | null;
		image_url: string | null;
	}>(
		`SELECT id, title, summary, url, source, category, published_at, image_url
		 FROM news_articles
		 WHERE published_at > NOW() - ($1::text || ' days')::interval
		   AND (title ILIKE ANY($2) OR summary ILIKE ANY($2))
		 ORDER BY (title ILIKE ANY($2)) DESC, published_at DESC NULLS LAST
		 LIMIT $3`,
		[daysBack, patterns, options.limit],
	);

	const mapped: ArticleResult[] = result.rows.map((row) => ({
		id: row.id,
		title: row.title,
		content: row.summary ?? "",
		url: row.url,
		source: row.source,
		category: row.category,
		published_at: row.published_at ?? new Date().toISOString(),
		image_url: row.image_url,
		similarity: null,
	}));

	await cacheSet(cacheKey, mapped, KEYWORD_CACHE_SECONDS);
	return mapped;
}
