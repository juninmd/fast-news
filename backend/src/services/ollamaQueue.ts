import Bull from 'bull';
import { config } from '../config/env.js';
import { analyzeCredibility } from './credibility.js';

interface CredibilityJob {
  articleId: string;
  title: string;
  content: string;
  source: string;
  category: string;
}

let queue: Bull.Queue<CredibilityJob> | null = null;

function getQueue(): Bull.Queue<CredibilityJob> {
  if (!queue) {
    queue = new Bull<CredibilityJob>('ollama:credibility', config.redisUrl, {
      defaultJobOptions: {
        attempts: 2,
        backoff: { type: 'fixed', delay: 5_000 },
        removeOnComplete: 200,
        removeOnFail: 100,
      },
    });
    // Max 2 concurrent Ollama calls — avoids overloading the model server
    queue.process(2, async (job) => {
      const { articleId, title, content, source, category } = job.data;
      await analyzeCredibility(
        articleId, title, content, source, category,
        AbortSignal.timeout(config.ai.backgroundTaskTimeoutMs)
      );
    });
    queue.on('failed', (job, err) => {
      console.error(`[OllamaQueue] Credibility job ${job?.id ?? 'unknown'} failed:`, err.message);
    });
    console.log('[OllamaQueue] Credibility worker started (concurrency: 2).');
  }
  return queue;
}

export async function startOllamaQueueWorker(): Promise<void> {
  getQueue();
  console.log('[OllamaQueue] Worker ready.');
}

export async function enqueueCredibilityAnalysis(
  articleId: string,
  title: string,
  content: string,
  source: string,
  category: string,
): Promise<void> {
  try {
    const q = getQueue();
    await q.isReady();
    await q.add({ articleId, title, content, source, category }, { jobId: `cred:${articleId}` });
  } catch (err) {
    console.warn('[OllamaQueue] Failed to enqueue credibility analysis:', (err as Error).message);
  }
}

export async function stopOllamaQueueWorker(): Promise<void> {
  if (!queue) return;
  await queue.close();
  queue = null;
  console.log('[OllamaQueue] Worker stopped.');
}
