import cron from "node-cron";
import { config } from "../config/env.js";
import { query } from "../database/client.js";
import { runIngestion } from "../services/ingestion.js";
import type { TelegramArticle } from "../services/telegram.js";
import { enqueueTelegramPosts } from "../services/telegramQueue.js";

let task: cron.ScheduledTask | null = null;

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
				config.ingestion.jobTimeoutMs,
			),
		),
	]);
	console.log(`[IngestionJob] Stored ${result.stored} new articles.`);

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

	// New articles: send lightweight Telegram cards without background LLM.
	const unevaluated = await fetchUnsentUnevaluatedArticles();
	const filteredUnevaluated = filterAndCap(unevaluated);
	if (filteredUnevaluated.length > 0) {
		await enqueueTelegramPosts(filteredUnevaluated);
		console.log(
			`[IngestionJob] Queued ${filteredUnevaluated.length} unevaluated articles for Telegram without AI analysis.`,
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
