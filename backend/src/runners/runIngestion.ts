import 'dotenv/config';
import { getPool } from '../database/client.js';
import { getRedis } from '../services/cache.js';
import { runIngestionAndPost } from '../jobs/ingestionJob.js';
import { startTelegramQueueWorker, stopTelegramQueueWorker } from '../services/telegramQueue.js';
import { startOllamaQueueWorker, stopOllamaQueueWorker } from '../services/ollamaQueue.js';

async function main(): Promise<void> {
  const start = Date.now();
  console.log(`[Runner] Starting ingestion at ${new Date().toISOString()}`);
  await getPool().query('SELECT 1');
  await getRedis();
  await startTelegramQueueWorker();
  await startOllamaQueueWorker();
  await runIngestionAndPost();
  await stopTelegramQueueWorker();
  await stopOllamaQueueWorker();
  console.log(`[Runner] Completed ingestion in ${Date.now() - start}ms`);
  process.exit(0);
}

main().catch((err) => {
  console.error('[Runner] Failed ingestion:', (err as Error).message);
  process.exit(1);
});
