import "dotenv/config";
import { initInfra } from "../bootstrap.js";
import { runLearningCycle } from "../jobs/learningJob.js";

async function main(): Promise<void> {
	const start = Date.now();
	console.log(`[Runner] Starting learning at ${new Date().toISOString()}`);
	await initInfra();
	await runLearningCycle();
	console.log(`[Runner] Completed learning in ${Date.now() - start}ms`);
	process.exit(0);
}

main().catch((err) => {
	console.error("[Runner] Failed learning:", (err as Error).message);
	process.exit(1);
});
