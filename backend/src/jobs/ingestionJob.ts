import cron from 'node-cron';
import { runIngestion } from '../services/ingestion.js';
import { enqueueTelegramPosts } from '../services/telegramQueue.js';
import { config } from '../config/env.js';
import { query } from '../database/client.js';
import type { TelegramArticle } from '../services/telegram.js';

let task: cron.ScheduledTask | null = null;

const JOB_TIMEOUT_MS = 25 * 60 * 1_000;

async function fetchUnsentRecentArticles(): Promise<TelegramArticle[]> {
  try {
    const res = await query<{
      id: string; title: string; url: string; source: string; category: string;
      company?: string; content: string; publishedAt?: Date | null;
      fakeNewsScore?: number | null; politicalBias?: string | null;
      isMilitant: boolean; hasIncoherence: boolean; storyId: string | null;
    }>(
      `SELECT na.id, na.title, na.url, na.source, na.category, na.company,
              na.content, na.published_at AS "publishedAt",
              na.fake_news_score AS "fakeNewsScore", na.political_bias AS "politicalBias",
              na.is_militant AS "isMilitant", na.has_incoherence AS "hasIncoherence",
              sa.story_id AS "storyId"
       FROM news_articles na
       LEFT JOIN LATERAL (
         SELECT story_id FROM story_articles WHERE article_id = na.id LIMIT 1
       ) sa ON true
       WHERE na.telegram_sent_at IS NULL
         AND na.created_at > NOW() - INTERVAL '24 hours'
       ORDER BY na.published_at DESC NULLS LAST
       LIMIT 150`
    );
    return res.rows;
  } catch (err) {
    console.error('[IngestionJob] Failed to fetch unsent articles:', (err as Error).message);
    return [];
  }
}

export async function runIngestionAndPost(): Promise<void> {
  console.log(`[IngestionJob] Running at ${new Date().toISOString()}`);
  const result = await Promise.race([
    runIngestion(),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('ingestion job timeout after 25min')), JOB_TIMEOUT_MS)
    ),
  ]);
  console.log(`[IngestionJob] Stored ${result.stored} new articles.`);

  // Fetch all unsent articles from last 24h (not just newly ingested ones)
  // This ensures all sources appear in Telegram, not just high-frequency ones like dev.to
  const unsentArticles = await fetchUnsentRecentArticles();
  console.log(`[IngestionJob] Found ${unsentArticles.length} unsent articles from last 24h.`);

  if (unsentArticles.length > 0) {
    const queued = await enqueueTelegramPosts(unsentArticles);
    console.log(`[IngestionJob] Queued ${queued} articles for Telegram.`);
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
