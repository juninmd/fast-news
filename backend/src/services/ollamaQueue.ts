import Bull from 'bull';
import { config } from '../config/env.js';
import { analyzeCredibility } from './credibility.js';
import { enqueueTelegramPosts } from './telegramQueue.js';
import { query } from '../database/client.js';
import type { TelegramArticle } from './telegram.js';

interface CredibilityJob {
  article: TelegramArticle;
}

let queue: Bull.Queue<CredibilityJob> | null = null;

function getQueue(): Bull.Queue<CredibilityJob> {
  if (!queue) {
    queue = new Bull<CredibilityJob>('ollama:credibility', config.redisUrl, {
      defaultJobOptions: {
        attempts: 1,   // no retry — timeout fallback sends article without score
        removeOnComplete: 500,
        removeOnFail: 100,
      },
    });

    // Max 2 concurrent Ollama calls to avoid hammering the model server
    queue.process(2, async (job) => {
      const { article } = job.data;

      try {
        await analyzeCredibility(
          article.id, article.title, article.content, article.source, article.category,
          AbortSignal.timeout(config.ai.backgroundTaskTimeoutMs),
        );
      } catch (err) {
        console.warn(`[OllamaQueue] Credibility failed for ${article.id}, sending without scores: ${(err as Error).message}`);
        // Still send to Telegram — credibility is best-effort, not a blocker
        await enqueueTelegramPosts([article]);
        return;
      }

      // Re-read credibility scores from DB before sending to Telegram
      const res = await query<{
        fakeNewsScore: number | null;
        politicalBias: string | null;
        isMilitant: boolean;
        hasIncoherence: boolean;
      }>(
        `SELECT fake_news_score AS "fakeNewsScore", political_bias AS "politicalBias",
                is_militant AS "isMilitant", has_incoherence AS "hasIncoherence"
         FROM news_articles WHERE id = $1`,
        [article.id],
      );

      const scores = res.rows[0];
      const enriched: TelegramArticle = scores ? { ...article, ...scores } : article;
      await enqueueTelegramPosts([enriched]);
    });

    queue.on('failed', (job, err) => {
      console.error(`[OllamaQueue] Job ${job?.id ?? 'unknown'} failed after all retries: ${err.message}`);
    });

    console.log('[OllamaQueue] Credibility worker started (concurrency: 2).');
  }
  return queue;
}

export async function startOllamaQueueWorker(): Promise<void> {
  getQueue();
}

export async function enqueueCredibilityAnalysis(article: TelegramArticle): Promise<void> {
  try {
    const q = getQueue();
    await q.isReady();
    await q.add({ article }, { jobId: `cred:${article.id}` });
  } catch (err) {
    console.warn('[OllamaQueue] Failed to enqueue:', (err as Error).message);
  }
}

export async function stopOllamaQueueWorker(): Promise<void> {
  if (!queue) return;
  await queue.close();
  queue = null;
  console.log('[OllamaQueue] Worker stopped.');
}
