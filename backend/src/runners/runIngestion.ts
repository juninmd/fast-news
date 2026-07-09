import "dotenv/config";
import { getPool } from "../database/client.js";
import { runIngestionAndPost } from "../jobs/ingestionJob.js";
import { getRedis } from "../services/cache.js";
import {
	startTelegramQueueWorker,
	waitForTelegramQueueIdle,
} from "../services/telegramQueue.js";

async function main(): Promise<void> {
	const start = Date.now();
	console.log(`[Runner] Starting ingestion at ${new Date().toISOString()}`);
	await getPool().query("SELECT 1");
	await getRedis();
	console.log("[Runner] Starting Telegram posting queue worker...");
	await startTelegramQueueWorker();
	console.log("[Runner] Queue workers ready. Starting ingestion...");
	await runIngestionAndPost();
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
