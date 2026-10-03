import "dotenv/config";
import { runMigrations } from "../bootstrap.js";
import { closePool } from "../database/client.js";
import { GitHubPagesPublisher } from "../editions/githubPages.js";
import { renderEditionMarkdown } from "../editions/renderMarkdown.js";
import { hydrateSnapshot } from "../editions/snapshot.js";
import { listSnapshots } from "../editions/snapshotStore.js";

/**
 * Republishes every stored, already-published edition as a VitePress article.
 * Idempotent: articles that already exist in the repository are left untouched.
 * Commits only; the Pages workflow builds the site once the pushes land.
 */
async function main(): Promise<number> {
	await runMigrations();
	const publisher = new GitHubPagesPublisher();
	const snapshots = await listSnapshots();
	let failed = 0;
	for (const snapshot of snapshots) {
		const id = snapshot.snapshot.editionId;
		try {
			const { markdown } = renderEditionMarkdown(hydrateSnapshot(snapshot));
			await publisher.commitArticle(snapshot, markdown);
			console.log(`[Backfill] ${id} ok`);
		} catch (err) {
			failed++;
			console.error(`[Backfill] ${id} failed: ${(err as Error).message}`);
		}
	}
	console.log(`[Backfill] ${snapshots.length - failed}/${snapshots.length} ok`);
	return failed ? 1 : 0;
}

main()
	.then(async (code) => {
		await closePool();
		process.exit(code);
	})
	.catch(async (err) => {
		console.error("[Backfill] Failed:", (err as Error).message);
		await closePool().catch(() => undefined);
		process.exit(1);
	});
