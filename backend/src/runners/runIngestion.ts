import "dotenv/config";
import { getPool } from "../database/client.js";
import { runIngestionAndPost } from "../jobs/ingestionJob.js";
import { getRedis } from "../services/cache.js";

async function main(): Promise<void> {
	const start = Date.now();
	console.log(`[Runner] Starting ingestion at ${new Date().toISOString()}`);
	await getPool().query("SELECT 1");
	await getRedis();
	await runIngestionAndPost();
	console.log(`[Runner] Completed ingestion in ${Date.now() - start}ms`);
	process.exit(0);
}

main().catch((err) => {
	console.error("[Runner] Failed ingestion:", (err as Error).message);
	process.exit(1);
});
