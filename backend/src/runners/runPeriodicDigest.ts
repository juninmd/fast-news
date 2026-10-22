import "dotenv/config";
import { getPool } from "../database/client.js";
import { runPeriodicDigest } from "../jobs/periodicDigestJob.js";
import { isDigestPeriod } from "../services/digestBuilder.js";

// Usage (CronJob entry): node dist/runners/runPeriodicDigest.js <4h|daily|weekly|monthly>
async function main(): Promise<void> {
	const period = process.argv[2] ?? "daily";
	if (!isDigestPeriod(period)) throw new Error(`Unknown period: ${period}`);
	await getPool().query("SELECT 1");
	const result = await runPeriodicDigest(period);
	console.log(
		`[Runner] ${period} digest: ${result.items} items, ${result.delivered} channel(s) delivered`,
	);
	process.exit(0);
}

main().catch((err) => {
	console.error("[Runner] Failed periodic digest:", (err as Error).message);
	process.exit(1);
});
