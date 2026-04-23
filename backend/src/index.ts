import 'dotenv/config';
import { config } from './config/env.js';
import { getPool } from './database/client.js';
import { getRedis } from './services/cache.js';
import { createApp } from './api/app.js';
import { startIngestionJob } from './jobs/ingestionJob.js';
import { startLearningJob } from './jobs/learningJob.js';
import { startDigestJob } from './jobs/digestJob.js';
import { startBot, stopBot } from './services/telegram.js';
import { runIngestion } from './services/ingestion.js';
import { runLearningCycle } from './jobs/learningJob.js';

async function bootstrap(): Promise<void> {
  console.log('🚀 Fast News Backend starting...');

  // Verify DB + Redis connections
  await getPool().query('SELECT 1');
  console.log('✅ PostgreSQL connected');
  await getRedis();
  console.log('✅ Redis connected');

  // Start HTTP server
  const app = createApp();
  app.listen(config.port, () => {
    console.log(`✅ API server running on port ${config.port}`);
  });

  // Start Telegram bot
  await startBot();

  // Start scheduled jobs
  startIngestionJob();
  startLearningJob();
  startDigestJob();

  // Run initial ingestion on startup (if needed)
  if (process.env['SKIP_INITIAL_INGESTION'] !== 'true') {
    console.log('🔄 Running initial ingestion...');
    await runIngestion().catch(console.error);
    await runLearningCycle().catch(console.error);
  }

  console.log('✅ Fast News Backend ready!');
}

async function shutdown(): Promise<void> {
  console.log('\n🛑 Shutting down...');
  stopBot();
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

bootstrap().catch((err) => {
  console.error('❌ Bootstrap failed:', err);
  process.exit(1);
});
