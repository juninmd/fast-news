import Bull from "bull";
import { config } from "../config/env.js";
import { analyzeCredibility } from "./credibility.js";
import type { TelegramArticle } from "./telegram.js";
import { enqueueTelegramPosts } from "./telegramQueue.js";

interface CredibilityJob {
	article: TelegramArticle;
}

let queue: Bull.Queue<CredibilityJob> | null = null;

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

		// Max 2 concurrent Ollama calls to avoid hammering the model server
		queue.process(2, async (job) => {
			const { article } = job.data;

			if (article.category === "fact_check") return;

			const result = await analyzeCredibility(
				article.id,
				article.title,
				article.content,
				article.source,
				article.category,
				AbortSignal.timeout(config.ai.backgroundTaskTimeoutMs),
			);

			let enriched: TelegramArticle = article;

			if (result) {
				// Credibility succeeded — use fresh scores from result
				enriched = {
					...article,
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

		queue.on("failed", (job, err) => {
			console.error(
				`[OllamaQueue] Job ${job?.id ?? "unknown"} failed after all retries: ${err.message}`,
			);
		});

		console.log("[OllamaQueue] Credibility worker started (concurrency: 2).");
	}
	return queue;
}

export async function startOllamaQueueWorker(): Promise<void> {
	getQueue();
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

export async function stopOllamaQueueWorker(): Promise<void> {
	if (!queue) return;
	await queue.close();
	queue = null;
	console.log("[OllamaQueue] Worker stopped.");
}
