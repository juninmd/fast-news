import { generateObject } from "ai";
import { z } from "zod";
import { query } from "../database/client.js";
import { getFastModel } from "./aiProvider.js";

export const SIMILARITY_THRESHOLD = 0.75;
const STORY_MERGE_THRESHOLD = 0.8;

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
	if (!res.rows[0]) return;

	const candidates = await query<{ id: string; similarity: string }>(
		`SELECT id, 1 - (embedding <=> $1::vector) AS similarity
     FROM news_articles
     WHERE id != $2
       AND embedding IS NOT NULL
       AND published_at > NOW() - INTERVAL '7 days'
     ORDER BY embedding <=> $1::vector
     LIMIT 20`,
		[res.rows[0].embedding, articleId],
	);

	for (const c of candidates.rows) {
		const sim = parseFloat(c.similarity);
		if (sim < SIMILARITY_THRESHOLD) continue;
		const [a, b] = articleId < c.id ? [articleId, c.id] : [c.id, articleId];
		await query(
			`INSERT INTO article_relations (article_a, article_b, similarity)
       VALUES ($1, $2, $3) ON CONFLICT (article_a, article_b) DO UPDATE SET similarity = $3`,
			[a, b, sim],
		);
	}
}

export async function assignArticleToStory(
	articleId: string,
): Promise<string | null> {
	const artRes = await query<{
		id: string;
		title: string;
		content: string;
		category: string;
		embedding: string;
	}>(
		`SELECT id, title, content, category, embedding FROM news_articles WHERE id = $1`,
		[articleId],
	);
	const article = artRes.rows[0];
	if (!article || !article.embedding) return null;

	const storyRes = await query<{ story_id: string; avg_sim: string }>(
		`SELECT sa.story_id, AVG(1 - (na.embedding <=> $1::vector)) AS avg_sim
     FROM story_articles sa
     JOIN news_articles na ON na.id = sa.article_id
     JOIN news_stories ns ON ns.id = sa.story_id
     WHERE na.embedding IS NOT NULL
       AND ns.last_updated_at > NOW() - INTERVAL '72 hours'
       AND ns.status = 'active'
     GROUP BY sa.story_id
     HAVING AVG(1 - (na.embedding <=> $1::vector)) >= $2
     ORDER BY avg_sim DESC
     LIMIT 5`,
		[article.embedding, STORY_MERGE_THRESHOLD],
	);

	let targetStoryId: string | null = null;
	if (storyRes.rows.length > 0) {
		targetStoryId = storyRes.rows[0].story_id;
	} else {
		const newStory = await query<{ id: string }>(
			`INSERT INTO news_stories (title, category, article_count)
       VALUES ($1, $2, 0) RETURNING id`,
			[article.title.slice(0, 80), article.category],
		);
		targetStoryId = newStory.rows[0].id;
	}

	await query(
		`INSERT INTO story_articles (story_id, article_id, role)
     VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`,
		[targetStoryId, articleId, storyRes.rows.length > 0 ? "update" : "origin"],
	);

	await enrichStory(targetStoryId, articleId, article);
	return targetStoryId;
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
         financial_signal = $5, affected_assets = $6, last_updated_at = NOW(),
         article_count = (SELECT COUNT(*) FROM story_articles WHERE story_id = $7)
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
