import 'dotenv/config';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { join, dirname } from 'path';
import { config, validateConfig } from './config/env.js';
validateConfig();
import { getPool, closePool } from './database/client.js';
import { getRedis, closeRedis } from './services/cache.js';
import { createApp } from './api/app.js';

const __dir = dirname(fileURLToPath(import.meta.url));

async function runMigrations(): Promise<void> {
  const files = ['schema.sql', 'telegram-feedback.sql'];
  const sql = files.map((file) =>
    readFileSync(join(__dir, 'database', file), 'utf-8')
  ).join('\n');
  await getPool().query(sql);
  console.log('✅ Migrations applied');
}
import { startIngestionJob, stopIngestionJob, runIngestionAndPost } from './jobs/ingestionJob.js';
import { startLearningJob, stopLearningJob } from './jobs/learningJob.js';
import { startDigestJob, stopDigestJob } from './jobs/digestJob.js';
import { startBot, stopBot } from './services/telegram.js';
import { startTelegramQueueWorker, stopTelegramQueueWorker } from './services/telegramQueue.js';
import { startOllamaQueueWorker, stopOllamaQueueWorker } from './services/ollamaQueue.js';
import { runLearningCycle } from './jobs/learningJob.js';

let isShuttingDown = false;
let httpServer: ReturnType<ReturnType<typeof createApp>['listen']> | null = null;

async function bootstrap(): Promise<void> {
  console.log('🚀 Fast News Backend starting...');

  try {
    // Verify DB + Redis connections
    await getPool().query('SELECT 1');
    console.log('✅ PostgreSQL connected');

    // Apply schema migrations on every startup (idempotent — all IF NOT EXISTS)
    await runMigrations();

    await getRedis();
    console.log('✅ Redis connected');

    // Start HTTP server
    const app = createApp();
    const server = app.listen(config.port, () => {
      console.log(`✅ API server running on port ${config.port}`);
    });
    httpServer = server;

    // Handle server errors
    server.on('error', (err) => {
      console.error('[Server] Error:', err);
      shutdown();
    });

    // Start Telegram bot (non-fatal — network may be unavailable at startup)
    await startBot().catch((err) => console.error('[Telegram] Bot failed to start:', err.message));
    await startTelegramQueueWorker().catch((err) => console.error('[TelegramQueue] Failed to start:', err.message));
    await startOllamaQueueWorker().catch((err) => console.error('[OllamaQueue] Failed to start:', err.message));

    // Cron jobs run as separate K8s CronJob pods — not scheduled here.
    // Set ENABLE_INTERNAL_CRONS=true only for local dev without k8s.
    if (process.env['ENABLE_INTERNAL_CRONS'] === 'true') {
      startIngestionJob();
      startLearningJob();
      startDigestJob();
    }

    // Run initial ingestion on startup (if needed)
    if (process.env['SKIP_INITIAL_INGESTION'] !== 'true' && process.env['ENABLE_INTERNAL_CRONS'] === 'true') {
      console.log('🔄 Running initial ingestion...');
      await runIngestionAndPost().catch(console.error);
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

  // Force-exit after 10s so pods don't hang indefinitely
  setTimeout(() => { console.error('❌ Shutdown timeout — forcing exit'); process.exit(1); }, 10_000).unref();

  const cleanup: Array<() => Promise<void>> = [];

  // Stop accepting new connections
  cleanup.push(async () => {
    console.log('📤 Stopping HTTP server...');
    if (httpServer) await new Promise<void>((res) => httpServer!.close(() => res()));
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

  // Stop Telegram bot and queues
  cleanup.push(async () => {
    console.log('📱 Stopping Telegram bot...');
    stopBot();
    await stopTelegramQueueWorker();
    await stopOllamaQueueWorker();
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
