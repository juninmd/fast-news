import "dotenv/config";
import { initInfra } from "../bootstrap.js";
import { runIngestionAndPost } from "../jobs/ingestionJob.js";
import {
	startOllamaQueueWorker,
	waitForOllamaQueueIdle,
} from "../services/ollamaQueue.js";
import {
	startTelegramQueueWorker,
	waitForTelegramQueueIdle,
} from "../services/telegramQueue.js";

async function main(): Promise<void> {
	const start = Date.now();
	console.log(`[Runner] Starting ingestion at ${new Date().toISOString()}`);
	await initInfra();
	// Workers must be running so credibility → Telegram pipeline completes within this pod
	console.log("[Runner] Starting Ollama credibility queue worker...");
	await startOllamaQueueWorker();
	console.log("[Runner] Starting Telegram posting queue worker...");
	await startTelegramQueueWorker();
	console.log("[Runner] Queue workers ready. Starting ingestion...");
	await runIngestionAndPost();
	// Wait for all queued jobs to finish before exiting (max 10 min)
	console.log("[Runner] Waiting for Ollama credibility queue to drain...");
	await waitForOllamaQueueIdle(600_000).catch((err: Error) =>
		console.warn("[Runner] Ollama queue did not drain:", err.message),
	);
	console.log("[Runner] Waiting for Telegram queue to drain...");
	await waitForTelegramQueueIdle(300_000).catch((err: Error) =>
		console.warn("[Runner] Telegram queue did not drain:", err.message),
	);
	console.log(`[Runner] Completed ingestion in ${Date.now() - start}ms`);
	process.exit(0);
}

main().catch((err) => {
	console.error("[Runner] Failed ingestion:", (err as Error).message);
	process.exit(1);
});
