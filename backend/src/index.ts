import 'dotenv/config';
import { config } from './config/env.js';
import { getPool, closePool } from './database/client.js';
import { getRedis, closeRedis } from './services/cache.js';
import { createApp } from './api/app.js';
import { startIngestionJob, stopIngestionJob } from './jobs/ingestionJob.js';
import { startLearningJob, stopLearningJob } from './jobs/learningJob.js';
import { startDigestJob, stopDigestJob } from './jobs/digestJob.js';
import { startBot, stopBot } from './services/telegram.js';
import { runIngestion } from './services/ingestion.js';
import { runLearningCycle } from './jobs/learningJob.js';

let isShuttingDown = false;

async function bootstrap(): Promise<void> {
  console.log('🚀 Fast News Backend starting...');

  try {
    // Verify DB + Redis connections
    await getPool().query('SELECT 1');
    console.log('✅ PostgreSQL connected');
    await getRedis();
    console.log('✅ Redis connected');

    // Start HTTP server
    const app = createApp();
    const server = app.listen(config.port, () => {
      console.log(`✅ API server running on port ${config.port}`);
    });

    // Handle server errors
    server.on('error', (err) => {
      console.error('[Server] Error:', err);
      shutdown();
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
  } catch (err) {
    console.error('❌ Bootstrap failed:', err);
    process.exit(1);
  }
}

async function shutdown(signal?: string): Promise<void> {
  if (isShuttingDown) {
    console.log('⏳ Already shutting down...');
    return;
  }

  isShuttingDown = true;
  console.log(`\n🛑 Shutting down (${signal || 'manual'})...`);

  const cleanup: Array<() => Promise<void>> = [];

  // Stop accepting new connections
  cleanup.push(async () => {
    console.log('📤 Stopping HTTP server...');
  });

  // Stop scheduled jobs gracefully
  cleanup.push(async () => {
    console.log('⏹️  Stopping scheduled jobs...');
    stopIngestionJob();
    stopLearningJob();
    stopDigestJob();
    // Give jobs time to finish current operations
    await new Promise((resolve) => setTimeout(resolve, 2000));
  });

  // Stop Telegram bot
  cleanup.push(async () => {
    console.log('📱 Stopping Telegram bot...');
    stopBot();
  });

  // Close Redis
  cleanup.push(async () => {
    console.log('💾 Closing Redis connection...');
    await closeRedis();
  });

  // Close PostgreSQL
  cleanup.push(async () => {
    console.log('🗄️  Closing PostgreSQL connection...');
    await closePool();
  });

  for (const fn of cleanup) {
    try {
      await fn();
    } catch (err) {
      console.error('❌ Cleanup error:', err);
    }
  }

  console.log('✅ Shutdown complete');
  process.exit(0);
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

process.on('uncaughtException', (err) => {
  console.error('💥 Uncaught Exception:', err);
  shutdown('uncaughtException');
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
});

bootstrap().catch((err) => {
  console.error('❌ Bootstrap failed:', err);
  process.exit(1);
});
