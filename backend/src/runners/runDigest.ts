import 'dotenv/config';
import { getPool } from '../database/client.js';
import { getRedis } from '../services/cache.js';
import { buildAndSendDigest } from '../jobs/digestJob.js';
import { startBot, stopBot } from '../services/telegram.js';

async function main(): Promise<void> {
  const start = Date.now();
  console.log(`[Runner] Starting digest at ${new Date().toISOString()}`);
  await getPool().query('SELECT 1');
  await getRedis();
  await startBot().catch((err: Error) => console.warn('[Runner] Telegram bot warning:', err.message));
  await buildAndSendDigest();
  stopBot();
  console.log(`[Runner] Completed digest in ${Date.now() - start}ms`);
  process.exit(0);
}

main().catch((err) => {
  console.error('[Runner] Failed digest:', (err as Error).message);
  process.exit(1);
});
