import { generateObject } from "ai";
import { z } from "zod";
import { config } from "../config/env.js";
import { query } from "../database/client.js";
import { searchVectors } from "../database/vectorStore.js";
import { getFastModel } from "./aiProvider.js";
import { pickStoryMatch, type StoryCandidate } from "./storyMatch.js";

// 0.75 was stricter than the app's own default (0.55 in vectorStore.ts) and
// left the graph almost edgeless for normal daily news diversity — only
// near-duplicate coverage of the same story crossed it. STORY_MERGE_THRESHOLD
// is configurable (STORY_MATCH_THRESHOLD) since it drives story clustering,
// not just a "related" edge.
export const SIMILARITY_THRESHOLD = 0.62;

const StorySchema = z.object({
	title: z.string().describe("Título conciso da história (max 80 chars)"),
	summary: z.string().describe("Resumo em 2-3 frases do que aconteceu"),
	impactLevel: z.enum(["low", "medium", "high", "critical"]),
	worldImpact: z.string().describe("Impactos no mundo em 3-4 frases"),
	financialSignal: z.enum(["bullish", "bearish", "neutral"]),
	affectedAssets: z
		.array(z.string())
		.describe("Ativos afetados: tickers BR e globais, crypto, commodities"),
	eventType: z.enum([
		"new_development",
		"contradiction",
		"resolution",
		"escalation",
		"impact_update",
	]),
	whatChanged: z
		.string()
		.describe("O que mudou nesta notícia vs estado anterior da história"),
});

export async function buildArticleRelations(articleId: string): Promise<void> {
	const res = await query<{ id: string; embedding: string }>(
		`SELECT id, embedding FROM news_articles WHERE id = $1 AND embedding IS NOT NULL`,
		[articleId],
	);
	if (!res.rows[0] || !res.rows[0].embedding) return;

	let embedding: number[];
	try {
		embedding = JSON.parse(res.rows[0].embedding);
	} catch (err) {
		console.error(
			`[correlation] Malformed embedding for article ${articleId}, skipping relation build:`,
			(err as Error).message,
		);
		return;
	}
	const candidates = await searchVectors(embedding, 20, {
		daysBack: 7,
		minSimilarity: SIMILARITY_THRESHOLD,
	});

	for (const c of candidates) {
		const sim = c.similarity;
		if (sim < SIMILARITY_THRESHOLD) continue;
		if (c.id === articleId) continue;
		const [a, b] = articleId < c.id ? [articleId, c.id] : [c.id, articleId];
		await query(
			`INSERT INTO article_relations (article_a, article_b, similarity)
       VALUES ($1, $2, $3) ON CONFLICT (article_a, article_b) DO UPDATE SET similarity = $3`,
			[a, b, sim],
		);
	}
}

type CandidateRow = {
	id: string;
	title: string;
	published_at: string | null;
	similarity: string | number | null;
	story_id: string | null;
};

const STORY_OF = `(SELECT sa.story_id FROM story_articles sa WHERE sa.article_id = na.id LIMIT 1)`;

/** Nearest stored articles by vector. LIMIT with no WHERE keeps the ivfflat index usable. */
async function nearestByEmbedding(
	articleId: string,
	embedding: string,
): Promise<CandidateRow[]> {
	const res = await query<CandidateRow>(
		`SELECT na.id, na.title, na.published_at,
            1 - (na.embedding <=> $1::vector) AS similarity,
            ${STORY_OF} AS story_id
     FROM news_articles na
     WHERE na.embedding IS NOT NULL AND na.id <> $2
     ORDER BY na.embedding <=> $1::vector
     LIMIT 8`,
		[embedding, articleId],
	);
	return res.rows;
}

/** Recent headlines for the lexical fallback, used when the article has no vector. */
async function recentArticles(
	articleId: string,
	windowHours: number,
): Promise<CandidateRow[]> {
	const res = await query<CandidateRow>(
		`SELECT na.id, na.title, na.published_at, NULL AS similarity,
            ${STORY_OF} AS story_id
     FROM news_articles na
     WHERE na.created_at > NOW() - make_interval(hours => $2) AND na.id <> $1
     ORDER BY na.created_at DESC
     LIMIT 800`,
		[articleId, windowHours],
	);
	return res.rows;
}

function toCandidate(r: CandidateRow): StoryCandidate {
	return {
		id: r.id,
		title: r.title,
		storyId: r.story_id,
		similarity: r.similarity === null ? null : Number(r.similarity),
		publishedAt: r.published_at ? new Date(r.published_at) : null,
	};
}

/** Recomputes the counters and cover image a story card reads. */
export async function refreshStoryStats(storyId: string): Promise<void> {
	await query(
		`WITH s AS (
       SELECT COUNT(*)::int AS n,
              COUNT(DISTINCT na.source)::int AS src,
              (ARRAY_AGG(na.image_url ORDER BY na.published_at DESC NULLS LAST)
                 FILTER (WHERE na.image_url IS NOT NULL))[1] AS img
       FROM story_articles sa
       JOIN news_articles na ON na.id = sa.article_id
       WHERE sa.story_id = $1
     )
     UPDATE news_stories
     SET article_count = s.n, source_count = s.src, image_url = s.img, last_updated_at = NOW()
     FROM s WHERE news_stories.id = $1`,
		[storyId],
	);
}

async function createStory(title: string, category: string): Promise<string> {
	const created = await query<{ id: string }>(
		`INSERT INTO news_stories (title, category, article_count) VALUES ($1, $2, 0) RETURNING id`,
		[title.slice(0, 80), category],
	);
	return created.rows[0].id;
}

/**
 * Groups the article with the same news from other outlets. Never drops it:
 * an article with no match opens its own story, and one without a vector is
 * matched by headline. The (slow, optional) LLM enrichment runs afterwards in
 * the background so a model outage cannot leave an article ungrouped.
 */
export async function assignArticleToStory(
	articleId: string,
): Promise<string | null> {
	const artRes = await query<{
		id: string;
		title: string;
		content: string;
		category: string;
		embedding: string | null;
		published_at: string | null;
	}>(
		`SELECT id, title, content, category, embedding, published_at
     FROM news_articles WHERE id = $1`,
		[articleId],
	);
	const article = artRes.rows[0];
	if (!article) return null;

	const existing = await query<{ story_id: string }>(
		`SELECT story_id FROM story_articles WHERE article_id = $1 LIMIT 1`,
		[articleId],
	);
	if (existing.rows[0]) return existing.rows[0].story_id;

	const cfg = config.ingestion;
	const rows = article.embedding
		? await nearestByEmbedding(articleId, article.embedding)
		: await recentArticles(articleId, cfg.storyWindowHours);
	const publishedAt = article.published_at
		? new Date(article.published_at)
		: new Date();
	const matchOpts = {
		threshold: cfg.storyMatchThreshold,
		windowHours: cfg.storyWindowHours,
	};
	const target = { title: article.title, publishedAt };
	const candidates = rows.map(toCandidate);
	// Articles already in a story win: ones not grouped yet are still waiting for
	// their own turn, and joining them first would split one story in two.
	const match =
		pickStoryMatch(
			target,
			candidates.filter((c) => c.storyId),
			matchOpts,
		) ??
		pickStoryMatch(
			target,
			candidates.filter((c) => !c.storyId),
			matchOpts,
		);

	let storyId: string;
	let role: "origin" | "update" = "origin";
	if (match) {
		role = "update";
		if (match.storyId) {
			storyId = match.storyId;
		} else {
			// The matching article was never grouped (earlier failure): open the
			// story from it so both end up together.
			storyId = await createStory(match.title, article.category);
			await query(
				`INSERT INTO story_articles (story_id, article_id, role)
         VALUES ($1, $2, 'origin') ON CONFLICT DO NOTHING`,
				[storyId, match.id],
			);
		}
	} else {
		storyId = await createStory(article.title, article.category);
	}

	await query(
		`INSERT INTO story_articles (story_id, article_id, role)
     VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`,
		[storyId, articleId, role],
	);
	await refreshStoryStats(storyId);

	void enrichStory(storyId, articleId, article);
	return storyId;
}

async function enrichStory(
	storyId: string,
	newArticleId: string,
	article: { title: string; content: string; category: string },
): Promise<void> {
	try {
		const prev = await query<{ title: string; summary: string }>(
			`SELECT title, summary FROM news_stories WHERE id = $1`,
			[storyId],
		);

		const contextPrompt = `Analise este artigo no contexto de uma história de notícias em evolução.
HISTÓRIA ATUAL: ${prev.rows[0]?.title ?? "Nova história"}
ESTADO ANTERIOR: ${prev.rows[0]?.summary ?? "Primeira notícia desta história"}

NOVO ARTIGO:
Título: ${article.title}
Conteúdo: ${(article.content ?? "").slice(0, 1500)}`;

		const model = await getFastModel();
		const { object } = await generateObject({
			model,
			schema: StorySchema,
			prompt: contextPrompt,
		});

		await query(
			`UPDATE news_stories SET
         title = $1, summary = $2, impact_level = $3, world_impact = $4,
         financial_signal = $5, affected_assets = $6, last_updated_at = NOW()
       WHERE id = $7`,
			[
				object.title,
				object.summary,
				object.impactLevel,
				object.worldImpact,
				object.financialSignal,
				object.affectedAssets,
				storyId,
			],
		);

		const artPublished = await query<{ published_at: string }>(
			`SELECT published_at FROM news_articles WHERE id = $1`,
			[newArticleId],
		);

		await query(
			`INSERT INTO story_timeline (story_id, article_id, event_type, headline, what_changed, occurred_at)
       VALUES ($1, $2, $3, $4, $5, $6)`,
			[
				storyId,
				newArticleId,
				object.eventType,
				article.title,
				object.whatChanged,
				artPublished.rows[0]?.published_at ?? new Date().toISOString(),
			],
		);
	} catch (err) {
		console.error("[correlation] enrichStory failed:", err);
	}
}
