import cron from "node-cron";
import { config } from "../config/env.js";
import { query } from "../database/client.js";
import { runIngestion } from "../services/ingestion.js";
import { enqueueCredibilityAnalysis } from "../services/ollamaQueue.js";
import type { TelegramArticle } from "../services/telegram.js";

let task: cron.ScheduledTask | null = null;

const JOB_TIMEOUT_MS = 25 * 60 * 1_000;

/**
 * Articles from previous ingestion runs that already have credibility scores
 * and were never sent to Telegram. Safe to send directly without re-evaluation.
 */
async function fetchUnsentEvaluatedArticles(): Promise<TelegramArticle[]> {
	try {
		const res = await query<{
			id: string;
			title: string;
			url: string;
			source: string;
			category: string;
			company?: string;
			content: string;
			publishedAt?: Date | null;
			imageUrl: string | null;
			fakeNewsScore: number | null;
			politicalBias: string | null;
			isMilitant: boolean;
			hasIncoherence: boolean;
			credibilityFlags: string[];
			credibilityReasoning: string | null;
			storyId: string | null;
			sentiment: string | null;
		}>(
			`WITH user_pref AS (
         SELECT AVG(preference_vector) as avg_vector FROM telegram_user_preferences
       )
       SELECT na.id, na.title, na.url, na.source, na.category, na.company,
              na.content, na.published_at AS "publishedAt", na.image_url AS "imageUrl",
              na.fake_news_score AS "fakeNewsScore", na.political_bias AS "politicalBias",
              na.is_militant AS "isMilitant", na.has_incoherence AS "hasIncoherence",
              na.credibility_flags AS "credibilityFlags",
              na.credibility_reasoning AS "credibilityReasoning",
              sa.story_id AS "storyId",
              na.sentiment AS "sentiment",
              COALESCE(1 - (na.embedding <=> (SELECT avg_vector FROM user_pref)), 0) AS "userMatchScore"
       FROM news_articles na
       LEFT JOIN LATERAL (
         SELECT story_id FROM story_articles WHERE article_id = na.id LIMIT 1
       ) sa ON true
       LEFT JOIN (
         SELECT COALESCE(a.company, a.source) as src_name,
                SUM(CASE WHEN f.reaction = 'like' THEN 1 WHEN f.reaction = 'dislike' THEN -2 ELSE 0 END) as score
         FROM telegram_article_feedback f
         JOIN news_articles a ON f.article_id = a.id
         GROUP BY COALESCE(a.company, a.source)
       ) feedback ON feedback.src_name = COALESCE(na.company, na.source)
       WHERE na.telegram_sent_at IS NULL
         AND na.telegram_skipped_at IS NULL
         AND na.fake_news_score IS NOT NULL
         AND na.fake_news_score <= 6
         AND na.category != 'fact_check'
         AND COALESCE(feedback.score, 0) >= -5
         AND NOT EXISTS (
             SELECT 1 FROM telegram_user_blocklist tub WHERE tub.source = na.source
         )
       ORDER BY COALESCE(1 - (na.embedding <=> (SELECT avg_vector FROM user_pref)), 0) DESC, COALESCE(feedback.score, 0) DESC, na.published_at DESC NULLS LAST
       LIMIT 50`,
		);
		console.log(
			`[IngestionJob] Found ${res.rows.length} unsent evaluated articles`,
		);
		return res.rows;
	} catch (err) {
		console.error(
			"[IngestionJob] Failed to fetch unsent evaluated articles:",
			(err as Error).message,
		);
		return [];
	}
}

async function fetchUnsentUnevaluatedArticles(): Promise<TelegramArticle[]> {
	try {
		const res = await query<TelegramArticle>(
			`SELECT na.id, na.title, na.url, na.source, na.category, na.company,
              na.content, na.published_at AS "publishedAt", na.image_url AS "imageUrl", sa.story_id AS "storyId"
       FROM news_articles na
       LEFT JOIN LATERAL (
         SELECT story_id FROM story_articles WHERE article_id = na.id LIMIT 1
       ) sa ON true
       WHERE na.telegram_sent_at IS NULL
         AND na.telegram_skipped_at IS NULL
         AND na.fake_news_score IS NULL
         AND na.category != 'fact_check'
         AND na.created_at < NOW() - INTERVAL '5 minutes'
         AND NOT EXISTS (
             SELECT 1 FROM telegram_user_blocklist tub WHERE tub.source = na.source
         )
       ORDER BY na.published_at DESC NULLS LAST
       LIMIT 30`,
		);
		return res.rows;
	} catch (err) {
		console.error(
			"[IngestionJob] Failed to fetch unevaluated articles:",
			(err as Error).message,
		);
		return [];
	}
}

export async function runIngestionAndPost(): Promise<void> {
	console.log(`[IngestionJob] Running at ${new Date().toISOString()}`);
	const result = await Promise.race([
		runIngestion(),
		new Promise<never>((_, reject) =>
			setTimeout(
				() => reject(new Error("ingestion job timeout after 25min")),
				JOB_TIMEOUT_MS,
			),
		),
	]);
	console.log(
		`[IngestionJob] Stored ${result.stored} new articles — queued for credibility evaluation.`,
	);

	const allowedCategories = config.telegramNewsCategories;
	const maxPerRun =
		config.telegramMaxNewsPerRun > 0 ? config.telegramMaxNewsPerRun : Infinity;

	function filterAndCap<T extends { category: string }>(items: T[]): T[] {
		const filtered =
			allowedCategories.length > 0
				? items.filter((a) => allowedCategories.includes(a.category))
				: items;
		return filtered.slice(0, maxPerRun as number);
	}

	// New articles (unevaluated): credibility+relevance or relevance-only → Telegram
	const unevaluated = await fetchUnsentUnevaluatedArticles();
	const filteredUnevaluated = filterAndCap(unevaluated);
	if (filteredUnevaluated.length > 0) {
		const relevanceOnly = !config.ingestion.credibilityEnabled;
		await Promise.all(
			filteredUnevaluated.map((a) =>
				enqueueCredibilityAnalysis(a, { relevanceOnly }),
			),
		);
		console.log(
			`[IngestionJob] Requeued ${filteredUnevaluated.length} unevaluated articles (relevanceOnly=${relevanceOnly}).`,
		);
	}

	// Previously evaluated articles: relevance check before Telegram
	const evaluated = await fetchUnsentEvaluatedArticles();
	const filteredEvaluated = filterAndCap(evaluated);
	if (filteredEvaluated.length > 0) {
		await Promise.all(
			filteredEvaluated.map((a) =>
				enqueueCredibilityAnalysis(a, { relevanceOnly: true }),
			),
		);
		console.log(
			`[IngestionJob] Queued ${filteredEvaluated.length} previously-evaluated articles for relevance check.`,
		);
	}
}

export function startIngestionJob(): void {
	task = cron.schedule(config.cron.ingestion, async () => {
		await runIngestionAndPost().catch(console.error);
	});
	console.log(`[IngestionJob] Scheduled: ${config.cron.ingestion}`);
}

export function stopIngestionJob(): void {
	task?.stop();
	task = null;
}
