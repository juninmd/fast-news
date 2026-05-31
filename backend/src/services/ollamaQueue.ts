import Bull from "bull";
import { config } from "../config/env.js";
import { analyzeCredibility } from "./credibility.js";
import { fetchFullArticle } from "./fullArticle.js";
import type { TelegramArticle } from "./telegram.js";
import { enqueueTelegramPosts } from "./telegramQueue.js";

interface CredibilityJob {
	article: TelegramArticle;
}

let queue: Bull.Queue<CredibilityJob> | null = null;
let processorReady = false;

function getQueue(): Bull.Queue<CredibilityJob> {
	if (!queue) {
		queue = new Bull<CredibilityJob>("ollama:credibility", config.redisUrl, {
			defaultJobOptions: {
				attempts: 3,
				backoff: { type: "exponential", delay: config.telegramQueue.backoffMs },
				removeOnComplete: 500,
				removeOnFail: 100,
			},
		});
	}
	return queue;
}

export async function startOllamaQueueWorker(): Promise<void> {
	if (processorReady) return;
	const q = getQueue();
	await q.isReady();

	// Max 2 concurrent Ollama calls to avoid hammering the model server
	q.process(2, async (job) => {
		const { article } = job.data;

		if (article.category === "fact_check") return;

		const fullContent =
			(await fetchFullArticle(article.url).catch(() => null)) ||
			article.content;

		const result = await analyzeCredibility(
			article.id,
			article.title,
			fullContent,
			article.source,
			article.category,
			AbortSignal.timeout(config.ai.backgroundTaskTimeoutMs),
		);

		let enriched: TelegramArticle = article;

		if (result) {
			enriched = {
				...article,
				fullContent,
				fakeNewsScore: result.fakeNewsScore,
				politicalBias: result.politicalBias,
				isMilitant: result.isMilitant,
				hasIncoherence: result.hasIncoherence,
				credibilityFlags: result.credibilityFlags,
				credibilityReasoning: result.reasoning,
			};
			console.log(
				`[OllamaQueue] Credibility done for ${article.id} (score: ${result.fakeNewsScore})`,
			);
		} else {
			throw new Error(
				`Credibility analysis did not complete for ${article.id}`,
			);
		}

		await enqueueTelegramPosts([enriched]);
	});

	q.on("failed", (job, err) => {
		console.error(
			`[OllamaQueue] Job ${job?.id ?? "unknown"} failed after all retries: ${err.message}`,
		);
	});

	processorReady = true;
	await new Promise((r) => setTimeout(r, 100));
	console.log(
		"[OllamaQueue] Credibility worker started and ready (concurrency: 2).",
	);
}

export async function enqueueCredibilityAnalysis(
	article: TelegramArticle,
): Promise<void> {
	try {
		const q = getQueue();
		await q.isReady();
		await q.add({ article }, { jobId: `cred:${article.id}` });
	} catch (err) {
		console.warn("[OllamaQueue] Failed to enqueue:", (err as Error).message);
	}
}

export async function waitForOllamaQueueIdle(
	timeoutMs = 180_000,
): Promise<void> {
	if (!queue) return;
	const startedAt = Date.now();
	while (Date.now() - startedAt < timeoutMs) {
		const [waiting, active, delayed] = await Promise.all([
			queue.getWaitingCount(),
			queue.getActiveCount(),
			queue.getDelayedCount(),
		]);
		if (waiting === 0 && active === 0 && delayed === 0) return;
		await new Promise((resolve) => setTimeout(resolve, 1_000));
	}
	throw new Error("[OllamaQueue] Timed out waiting for queue to go idle.");
}

export async function stopOllamaQueueWorker(): Promise<void> {
	if (!queue) return;
	await queue.close();
	queue = null;
	console.log("[OllamaQueue] Worker stopped.");
}
