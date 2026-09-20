import cron from "node-cron";
import { config } from "../config/env.js";
import { runIngestion } from "../services/ingestion.js";

let task: cron.ScheduledTask | null = null;

export async function runIngestionAndPost(): Promise<void> {
	console.log(`[IngestionJob] Running at ${new Date().toISOString()}`);
	const result = await Promise.race([
		runIngestion(),
		new Promise<never>((_, reject) =>
			setTimeout(
				() => reject(new Error("ingestion job timeout after 25min")),
				config.ingestion.jobTimeoutMs,
			),
		),
	]);
	console.log(`[IngestionJob] Stored ${result.stored} new articles.`);
	// Telegram posting for new articles now happens exclusively via the
	// "O Fio" editions (see editions/*, runners/runEdition.ts). Per-article
	// posting was removed here to keep Telegram limited to 3 posts/day.
}

export function startIngestionJob(): void {
	task = cron.schedule(config.cron.ingestion, async () => {
		await runIngestionAndPost().catch(console.error);
	});
	console.log(`[IngestionJob] Scheduled: ${config.cron.ingestion}`);
}

export function stopIngestionJob(): void {
	task?.stop();
	task = null;
}
