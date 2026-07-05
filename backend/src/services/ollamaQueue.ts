import Bull from "bull";
import { config } from "../config/env.js";
import { analyzeCredibility } from "./credibility.js";
import { fetchFullArticle } from "./fullArticle.js";
import { scoreRelevance } from "./relevance.js";
import {
	isSimilarArticleAlreadySent,
	skipArticleFromTelegram,
	type TelegramArticle,
} from "./telegram.js";
import { enqueueTelegramPosts } from "./telegramQueue.js";

interface CredibilityJob {
	article: TelegramArticle;
	relevanceOnly?: boolean;
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
		const { article, relevanceOnly } = job.data;

		if (article.category === "fact_check") {
			await skipArticleFromTelegram(article.id);
			return;
		}

		const fullContent =
			(await fetchFullArticle(article.url).catch(() => null)) ||
			article.content;

		// Check vector similarity first to avoid wasting credibility/relevance LLM calls on
		// near-duplicate articles (same story from multiple feeds, rehashes, etc).
		const isDuplicate = await isSimilarArticleAlreadySent(article.id);
		if (isDuplicate) {
			console.log(
				`[OllamaQueue] Dropping ${article.id} — similar article already posted recently.`,
			);
			await skipArticleFromTelegram(article.id);
			return;
		}

		let enriched: TelegramArticle = { ...article, fullContent };

		if (!relevanceOnly) {
			const result = await analyzeCredibility(
				article.id,
				article.title,
				fullContent,
				article.source,
				article.category,
				AbortSignal.timeout(config.ai.backgroundTaskTimeoutMs),
			);

			if (!result) {
				// analyzeCredibility already tried both the primary and cloud-fallback
				// models before returning null, so this is a deterministic failure —
				// retrying the same job at the Bull level would just repeat it.
				console.error(
					`[OllamaQueue] Credibility analysis failed for ${article.id} on all providers, skipping without retry.`,
				);
				await skipArticleFromTelegram(article.id);
				return;
			}

			console.log(
				`[OllamaQueue] Credibility done for ${article.id} (score: ${result.fakeNewsScore})`,
			);

			if (result.fakeNewsScore > 6) {
				console.log(
					`[OllamaQueue] Dropping ${article.id} — fake news score ${result.fakeNewsScore} > 6`,
				);
				await skipArticleFromTelegram(article.id);
				return;
			}

			enriched = {
				...enriched,
				fakeNewsScore: result.fakeNewsScore,
				politicalBias: result.politicalBias,
				isMilitant: result.isMilitant,
				hasIncoherence: result.hasIncoherence,
				credibilityFlags: result.credibilityFlags,
				credibilityReasoning: result.reasoning,
			};
		}

		const relevance = await scoreRelevance(
			article.id,
			article.title,
			fullContent,
			article.category,
		);

		if (
			relevance.relevanceScore < config.ingestion.relevanceThreshold ||
			relevance.isSpamOrPromo ||
			relevance.isDuplicateOrRehash ||
			!relevance.shouldPostTelegram
		) {
			console.log(
				`[OllamaQueue] Dropping ${article.id} — relevanceScore=${relevance.relevanceScore} (threshold=${config.ingestion.relevanceThreshold}), isSpamOrPromo=${relevance.isSpamOrPromo}, isDuplicateOrRehash=${relevance.isDuplicateOrRehash}, shouldPostTelegram=${relevance.shouldPostTelegram}`,
			);
			await skipArticleFromTelegram(article.id);
			return;
		}

		// Save the relevance details into the enriched object as well
		enriched = {
			...enriched,
			relevanceScore: relevance.relevanceScore,
			relevanceReasoning: relevance.reason,
		};

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
	opts: { relevanceOnly?: boolean } = {},
): Promise<void> {
	try {
		const q = getQueue();
		await q.isReady();
		const jobId = opts.relevanceOnly
			? `rel:${article.id}`
			: `cred:${article.id}`;
		await q.add(
			{ article, relevanceOnly: opts.relevanceOnly ?? false },
			{ jobId },
		);
	} catch (err) {
		console.warn("[OllamaQueue] Failed to enqueue:", (err as Error).message);
	}
}

export interface QueueCounts {
	waiting: number;
	active: number;
	delayed: number;
	failed: number;
}

export async function getOllamaQueueCounts(): Promise<QueueCounts> {
	if (!queue) return { waiting: 0, active: 0, delayed: 0, failed: 0 };
	const [waiting, active, delayed, failed] = await Promise.all([
		queue.getWaitingCount(),
		queue.getActiveCount(),
		queue.getDelayedCount(),
		queue.getFailedCount(),
	]);
	return { waiting, active, delayed, failed };
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
