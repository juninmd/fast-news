import 'dotenv/config';
import { getPool } from '../database/client.js';
import { getRedis } from '../services/cache.js';
import { runLearningCycle } from '../jobs/learningJob.js';

async function main(): Promise<void> {
  await getPool().query('SELECT 1');
  await getRedis();
  await runLearningCycle();
  process.exit(0);
}

main().catch((err) => { console.error(err); process.exit(1); });
