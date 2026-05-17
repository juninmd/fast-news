import 'dotenv/config';
import { getPool } from '../database/client.js';
import { getRedis } from '../services/cache.js';
import { buildAndSendDigest } from '../jobs/digestJob.js';

async function main(): Promise<void> {
  const start = Date.now();
  console.log(`[Runner] Starting digest at ${new Date().toISOString()}`);
  await getPool().query('SELECT 1');
  await getRedis();
  await buildAndSendDigest();
  console.log(`[Runner] Completed digest in ${Date.now() - start}ms`);
  process.exit(0);
}

main().catch((err) => {
  console.error('[Runner] Failed digest:', (err as Error).message);
  process.exit(1);
});
