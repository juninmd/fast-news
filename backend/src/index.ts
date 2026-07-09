import "dotenv/config";
import { config, validateConfig } from "./config/env.js";

validateConfig();

import { createApp } from "./api/app.js";
import { initInfra, shutdownInfra } from "./bootstrap.js";

import { startDigestJob, stopDigestJob } from "./jobs/digestJob.js";
import {
	runIngestionAndPost,
	startIngestionJob,
	stopIngestionJob,
} from "./jobs/ingestionJob.js";
import {
	runLearningCycle,
	startLearningJob,
	stopLearningJob,
} from "./jobs/learningJob.js";
import { startBot, stopBot } from "./services/telegram.js";
import {
	startTelegramQueueWorker,
	stopTelegramQueueWorker,
} from "./services/telegramQueue.js";

let isShuttingDown = false;
let httpServer: ReturnType<ReturnType<typeof createApp>["listen"]> | null =
	null;

async function bootstrap(): Promise<void> {
	console.log("🚀 Fast News Backend starting...");

	try {
		// DB/Redis connect, migrations, vector store init, feed sync — shared with other entry points
		await initInfra();
		console.log("✅ PostgreSQL + Redis connected, migrations applied");

		// Start HTTP server
		const app = createApp();
		const server = app.listen(config.port, () => {
			console.log(`✅ API server running on port ${config.port}`);
		});
		httpServer = server;

		// Handle server errors
		server.on("error", (err) => {
			console.error("[Server] Error:", err);
			shutdown();
		});

		// Start Telegram bot (non-fatal — network may be unavailable at startup)
		await startBot().catch((err) =>
			console.error("[Telegram] Bot failed to start:", err.message),
		);
		await startTelegramQueueWorker().catch((err) =>
			console.error("[TelegramQueue] Failed to start:", err.message),
		);

		// Cron jobs run as separate K8s CronJob pods — not scheduled here.
		// Set ENABLE_INTERNAL_CRONS=true only for local dev without k8s.
		if (process.env["ENABLE_INTERNAL_CRONS"] === "true") {
			startIngestionJob();
			startLearningJob();
			console.log(
				"[DigestJob] Automatic digest disabled; use Telegram summarize button on demand.",
			);
		}

		// Run initial ingestion on startup (if needed)
		if (
			process.env["SKIP_INITIAL_INGESTION"] !== "true" &&
			process.env["ENABLE_INTERNAL_CRONS"] === "true"
		) {
			console.log("🔄 Running initial ingestion...");
			await runIngestionAndPost().catch((err) => {
				console.error("❌ Initial ingestion run failed:", err);
			});
			await runLearningCycle().catch((err) => {
				console.error("❌ Initial learning cycle failed:", err);
			});
		}

		console.log("✅ Fast News Backend ready!");
	} catch (err) {
		console.error("❌ Bootstrap failed:", err);
		process.exit(1);
	}
}

async function shutdown(signal?: string): Promise<void> {
	if (isShuttingDown) {
		console.log("⏳ Already shutting down...");
		return;
	}

	isShuttingDown = true;
	console.log(`\n🛑 Shutting down (${signal || "manual"})...`);

	// Force-exit after 10s so pods don't hang indefinitely
	setTimeout(() => {
		console.error("❌ Shutdown timeout — forcing exit");
		process.exit(1);
	}, 10_000).unref();

	const cleanup: Array<() => Promise<void>> = [];

	// Stop accepting new connections
	cleanup.push(async () => {
		console.log("📤 Stopping HTTP server...");
		if (httpServer)
			await new Promise<void>((res) => httpServer!.close(() => res()));
	});

	// Stop scheduled jobs gracefully
	cleanup.push(async () => {
		console.log("⏹️  Stopping scheduled jobs...");
		stopIngestionJob();
		stopLearningJob();
		stopDigestJob();
		// Give jobs time to finish current operations
		await new Promise((resolve) => setTimeout(resolve, 2000));
	});

	// Stop Telegram bot and queues
	cleanup.push(async () => {
		console.log("📱 Stopping Telegram bot...");
		stopBot();
		await stopTelegramQueueWorker();
	});

	// Close Redis + PostgreSQL
	cleanup.push(async () => {
		console.log("💾 Closing Redis and PostgreSQL connections...");
		await shutdownInfra();
	});

	for (const fn of cleanup) {
		try {
			await fn();
		} catch (err) {
			console.error("❌ Cleanup error:", err);
		}
	}

	console.log("✅ Shutdown complete");
	process.exit(0);
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

process.on("uncaughtException", (err) => {
	console.error("💥 Uncaught Exception:", err);
	shutdown("uncaughtException");
});

process.on("unhandledRejection", (reason, promise) => {
	console.error("💥 Unhandled Rejection at:", promise, "reason:", reason);
});

bootstrap().catch((err) => {
	console.error("❌ Bootstrap failed:", err);
	process.exit(1);
});
