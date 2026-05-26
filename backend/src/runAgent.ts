import "dotenv/config";
import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { config, validateConfig } from "./config/env.js";
import { closePool, getPool } from "./database/client.js";
import { runIngestionAndPost } from "./jobs/ingestionJob.js";
import { closeRedis, getRedis } from "./services/cache.js";
import {
	startOllamaQueueWorker,
	stopOllamaQueueWorker,
	waitForOllamaQueueIdle,
} from "./services/ollamaQueue.js";
import { startBot, stopBot } from "./services/telegram.js";
import {
	startTelegramQueueWorker,
	stopTelegramQueueWorker,
	waitForTelegramQueueIdle,
} from "./services/telegramQueue.js";

const __dir = dirname(fileURLToPath(import.meta.url));
const LOOP_INTERVAL_MS = parseInt(
	process.env["NEWS_AGENT_LOOP_INTERVAL_MS"] ?? "900000",
	10,
);

validateConfig();

async function runMigrations(): Promise<void> {
	const files = ["schema.sql", "telegram-feedback.sql"];
	const sql = files
		.map((file) => readFileSync(join(__dir, "database", file), "utf-8"))
		.join("\n");
	await getPool().query(sql);
}

async function bootstrap(): Promise<void> {
	await getPool().query("SELECT 1");
	await runMigrations();
	await getRedis();
	await startBot();
	await startTelegramQueueWorker();
	await startOllamaQueueWorker();
}

async function waitForPipelines(): Promise<void> {
	await waitForOllamaQueueIdle();
	await waitForTelegramQueueIdle();
}

async function shutdown(): Promise<void> {
	stopBot();
	await stopTelegramQueueWorker();
	await stopOllamaQueueWorker();
	await closeRedis();
	await closePool();
}

async function runOnce(): Promise<void> {
	console.log(`[Agent] Cycle started at ${new Date().toISOString()}`);
	await runIngestionAndPost();
	await waitForPipelines();
	console.log("[Agent] Cycle completed.");
}

async function main(): Promise<void> {
	const loopMode = process.argv.includes("--loop");
	await bootstrap();
	try {
		if (!loopMode) {
			await runOnce();
			return;
		}
		console.log(
			`[Agent] Loop mode enabled. Interval: ${Math.round(LOOP_INTERVAL_MS / 60000)} min.`,
		);
		for (;;) {
			try {
				await runOnce();
			} catch (err) {
				console.error("[Agent] Cycle failed:", (err as Error).message);
			}
			await new Promise((resolve) => setTimeout(resolve, LOOP_INTERVAL_MS));
		}
	} finally {
		await shutdown();
	}
}

main().catch(async (err) => {
	console.error("[Agent] Fatal error:", (err as Error).message);
	await shutdown().catch(() => {});
	process.exit(1);
});
