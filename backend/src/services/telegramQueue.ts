import Bull from "bull";
import { config } from "../config/env.js";
import { postArticleToTelegram, type TelegramArticle } from "./telegram.js";

interface TelegramQueueJob {
	article: TelegramArticle;
}

let queue: Bull.Queue<TelegramQueueJob> | null = null;
let processorReady = false;

function getQueue(): Bull.Queue<TelegramQueueJob> {
	if (!queue) {
		try {
			queue = new Bull<TelegramQueueJob>(
				config.telegramQueue.name,
				config.redisUrl,
				{
					limiter: {
						max: config.telegramQueue.rateLimitMax,
						duration: config.telegramQueue.rateLimitDurationMs,
					},
					defaultJobOptions: {
						attempts: config.telegramQueue.attempts,
						backoff: {
							type: "exponential",
							delay: config.telegramQueue.backoffMs,
						},
						removeOnComplete: 500,
						removeOnFail: false,
					},
				},
			);
		} catch (err) {
			throw new Error(
				`[TelegramQueue] Failed to create queue "${config.telegramQueue.name}": ${(err as Error).message}`,
			);
		}
	}
	return queue;
}

export async function startTelegramQueueWorker(): Promise<void> {
	if (processorReady) return;
	const q = getQueue();
	await q.isReady();

	q.process(1, async (job) => {
		await postArticleToTelegram(job.data.article);
	});

	q.on("failed", (job, err) => {
		console.error(
			`[TelegramQueue] Job ${job?.id ?? "unknown"} failed:`,
			err.message,
		);
	});
	q.on("completed", (job) => {
		console.log(`[TelegramQueue] Job ${job.id} completed.`);
	});

	processorReady = true;
	await new Promise((r) => setTimeout(r, 100));
	console.log("[TelegramQueue] Worker started and ready.");
}

export async function enqueueTelegramPosts(
	articles: TelegramArticle[],
): Promise<number> {
	if (
		!config.telegramEnabled ||
		!config.telegramBotToken ||
		!config.telegramChatIds.length
	) {
		console.warn(
			"[TelegramQueue] Skipping enqueue: Telegram is disabled or missing credentials/chat IDs.",
		);
		return 0;
	}
	if (!articles.length) {
		console.log("[TelegramQueue] Skipping enqueue: no articles received.");
		return 0;
	}
	const q = getQueue();
	await q.isReady();
	const queued = await Promise.allSettled(
		articles.map((article) => q.add({ article }, { jobId: article.id })),
	);
	const failed = queued.filter((result) => result.status === "rejected");
	const succeeded = queued.length - failed.length;
	if (failed.length > 0) {
		console.error(
			`[TelegramQueue] Failed to enqueue ${failed.length}/${articles.length} article(s).`,
		);
		failed.forEach((result) => {
			if (result.status === "rejected") {
				console.error(`[TelegramQueue] Enqueue error:`, result.reason.message);
			}
		});
	}
	console.log(
		`[TelegramQueue] Enqueued ${succeeded} articles for Telegram posting.`,
	);
	return succeeded;
}

export async function retryFailedTelegramPosts(limit = 100): Promise<number> {
	const q = getQueue();
	const failed = await q.getFailed(0, limit - 1);
	for (const job of failed) {
		await job.retry().catch((err) => {
			console.error(
				`[TelegramQueue] Retry failed for ${job.id}:`,
				(err as Error).message,
			);
		});
	}
	return failed.length;
}

export async function waitForTelegramQueueIdle(
	timeoutMs = 120_000,
): Promise<void> {
	const q = getQueue();
	const startedAt = Date.now();
	while (Date.now() - startedAt < timeoutMs) {
		const [waiting, active, delayed] = await Promise.all([
			q.getWaitingCount(),
			q.getActiveCount(),
			q.getDelayedCount(),
		]);
		if (waiting === 0 && active === 0 && delayed === 0) return;
		await new Promise((resolve) => setTimeout(resolve, 1_000));
	}
	throw new Error("[TelegramQueue] Timed out waiting for queue to go idle.");
}

export async function stopTelegramQueueWorker(): Promise<void> {
	if (!queue) return;
	await queue.close();
	queue = null;
	processorReady = false;
	console.log("[TelegramQueue] Worker stopped.");
}
