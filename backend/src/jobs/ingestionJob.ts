import cron from 'node-cron';
import { runIngestion } from '../services/ingestion.js';
import { postNewArticles } from '../services/telegram.js';
import { buildArticleRelations, assignArticleToStory } from '../services/correlation.js';
import { config } from '../config/env.js';

let task: cron.ScheduledTask | null = null;

const JOB_TIMEOUT_MS = 25 * 60 * 1_000;

export async function runIngestionAndPost(): Promise<void> {
  console.log(`[IngestionJob] Running at ${new Date().toISOString()}`);
  const result = await Promise.race([
    runIngestion(),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('ingestion job timeout after 25min')), JOB_TIMEOUT_MS)
    ),
  ]);
  console.log(`[IngestionJob] Stored ${result.stored} new articles.`);

  if (result.newArticles.length > 0) {
    // Enrich the articles that will be posted with correlation data before sending
    const toPost = result.newArticles.slice(0, config.telegramMaxNewsPerRun);
    const enriched = await Promise.all(
      toPost.map(async (article) => {
        const storyId = await assignArticleToStory(article.id)
          .catch(() => null);
        await buildArticleRelations(article.id).catch(() => null);
        return { ...article, storyId };
      })
    );
    await postNewArticles(enriched);
    console.log(`[IngestionJob] Posted ${toPost.length} to Telegram.`);
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
