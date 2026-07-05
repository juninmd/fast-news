import { createHash } from "crypto";
import { config } from "../config/env.js";
import { query } from "../database/client.js";
import { searchInsights, searchVectors } from "../database/vectorStore.js";
import { cacheGet, cacheSet } from "./cache.js";
import { embedQuery } from "./embeddings.js";

export interface ArticleResult {
	id: string;
	title: string;
	content: string;
	url: string;
	source: string;
	category: string;
	published_at: string;
	image_url: string | null;
	similarity: number;
}

export interface InsightResult {
	id: string;
	topic: string;
	insight: string;
	confidence: number;
	created_at: string;
	similarity: number;
}

export async function searchSimilarArticles(
	queryText: string,
	daysBack = 30,
	limit = config.rag.topK,
): Promise<ArticleResult[]> {
	const cacheKey = `rag:articles:${createHash("sha256").update(`${queryText}:${daysBack}:${limit}`).digest("hex").slice(0, 32)}`;
	const cached = await cacheGet<ArticleResult[]>(cacheKey);
	if (cached) return cached;

	const embedding = await embedQuery(queryText);
	const results = await searchVectors(embedding, limit, {
		daysBack,
		minSimilarity: 0.55,
	});

	const mapped: ArticleResult[] = results.map((r) => ({
		id: r.id,
		title: r.metadata?.title ?? "",
		content: r.metadata?.content ?? "",
		url: r.metadata?.url ?? "",
		source: r.metadata?.source ?? "",
		category: r.metadata?.category ?? "",
		published_at: r.metadata?.publishedAt ?? new Date().toISOString(),
		image_url: r.metadata?.imageUrl ?? null,
		similarity: r.similarity,
	}));

	await cacheSet(cacheKey, mapped, 1800);
	return mapped;
}

export async function searchSimilarInsights(
	queryText: string,
	limit = 5,
): Promise<InsightResult[]> {
	const cacheKey = `rag:insights:${createHash("sha256").update(`${queryText}:${limit}`).digest("hex").slice(0, 32)}`;
	const cached = await cacheGet<InsightResult[]>(cacheKey);
	if (cached) return cached;

	const embedding = await embedQuery(queryText);
	const results = await searchInsights(embedding, limit, 0.55);

	await cacheSet(cacheKey, results, 1800);
	return results;
}

export function buildRagContext(
	articles: ArticleResult[],
	insights: InsightResult[],
): string {
	const articleContext = articles
		.slice(0, 8)
		.map(
			(a, i) =>
				`[${i + 1}] ${a.source} (${new Date(a.published_at).toLocaleDateString("pt-BR")})\n${a.title}\n${(a.content ?? "").slice(0, 300)}`,
		)
		.join("\n\n");

	const insightContext = insights
		.slice(0, 3)
		.map(
			(ins) =>
				`• ${ins.insight} (confiança: ${(ins.confidence * 10).toFixed(1)}/10)`,
		)
		.join("\n");

	return [
		articleContext ? `NOTÍCIAS RELACIONADAS:\n${articleContext}` : "",
		insightContext ? `INSIGHTS ACUMULADOS:\n${insightContext}` : "",
	]
		.filter(Boolean)
		.join("\n\n");
}
