import 'dotenv/config';
import { getPool } from '../database/client.js';
import { getRedis } from '../services/cache.js';
import { runLearningCycle } from '../jobs/learningJob.js';

async function main(): Promise<void> {
  const start = Date.now();
  console.log(`[Runner] Starting learning at ${new Date().toISOString()}`);
  await getPool().query('SELECT 1');
  await getRedis();
  await runLearningCycle();
  console.log(`[Runner] Completed learning in ${Date.now() - start}ms`);
  process.exit(0);
}

main().catch((err) => {
  console.error('[Runner] Failed learning:', (err as Error).message);
  process.exit(1);
});
