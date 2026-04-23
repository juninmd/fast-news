import cron from 'node-cron';
import { runIngestion } from '../services/ingestion.js';
import { postNewArticles } from '../services/telegram.js';
import { config } from '../config/env.js';

let task: cron.ScheduledTask | null = null;

export async function runIngestionAndPost(): Promise<void> {
  console.log(`[IngestionJob] Running at ${new Date().toISOString()}`);
  const result = await runIngestion();
  console.log(`[IngestionJob] Stored ${result.stored} new articles.`);

  if (result.newArticles.length > 0) {
    await postNewArticles(result.newArticles);
    console.log(`[IngestionJob] Posted ${Math.min(result.newArticles.length, config.telegramMaxNewsPerRun)} to Telegram.`);
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
