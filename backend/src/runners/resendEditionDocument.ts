import "dotenv/config";
import { runMigrations } from "../bootstrap.js";
import { config } from "../config/env.js";
import { closePool, query } from "../database/client.js";
import { collectHeadlines } from "../editions/collect.js";
import { editionFilename } from "../editions/publish.js";
import { renderEditionHtml } from "../editions/renderHtml.js";
import { hourlyCounts, isFactCheck } from "../editions/select.js";
import type {
	Edition,
	EditionDraft,
	EditionWindow,
	Headline,
} from "../editions/types.js";
import { editionWindow } from "../editions/window.js";
import { fetchMarketSnapshot } from "../services/marketData.js";
import { getBot } from "../services/telegram.js";

/**
 * Recovers an edition whose summary message was delivered but whose file
 * upload never made it (the delivered/failed split in publish.ts leaves
 * such an edition permanently "sent" with no link). The edition's window is
 * already closed, so re-running collectHeadlines() for it reproduces the
 * exact same rows in the exact same order — and the stored draft's `fontes`
 * are indices into that list — so the original document can be rebuilt
 * byte-for-byte without calling the model again.
 */
async function main(): Promise<number> {
	const editionKey = process.argv[2];
	if (!editionKey) {
		console.error(
			"[ResendEdition] Usage: resendEditionDocument.js <YYYY-MM-DD:kind>",
		);
		return 2;
	}
	const [day, kind] = editionKey.split(":");
	if (!day || (kind !== "manha" && kind !== "tarde" && kind !== "noite")) {
		console.error(`[ResendEdition] Bad edition key: ${editionKey}`);
		return 2;
	}
	await runMigrations();

	const row = await query<{ payload: { draft: EditionDraft } }>(
		"SELECT payload FROM news_editions WHERE edition_key = $1 AND sent_at IS NOT NULL",
		[editionKey],
	);
	const draft = row.rows[0]?.payload?.draft;
	if (!draft) {
		console.error(`[ResendEdition] No sent edition found for ${editionKey}`);
		return 1;
	}

	// Same close-hour math as the original run: as long as "now" falls on the
	// same local calendar day and after this kind's close hour, it resolves
	// to the identical window.
	const window: EditionWindow = editionWindow(kind, new Date());
	if (window.day !== day) {
		console.error(
			`[ResendEdition] Window mismatch: expected ${day}, got ${window.day}. Run this closer to the original window.`,
		);
		return 1;
	}

	const all = await collectHeadlines(window);
	const headlines = new Map<number, Headline>(all.map((h) => [h.id, h]));
	const checagens = all.filter(isFactCheck).slice(-4);

	const edition: Edition = {
		window,
		draft,
		headlines,
		checagens,
		hourly: hourlyCounts(
			all.map((h) => h.createdAt),
			window.start,
			Math.round((window.end.getTime() - window.start.getTime()) / 3_600_000),
		),
		totalArticles: all.length,
		totalSources: new Set(all.map((h) => h.source)).size,
		market: await fetchMarketSnapshot(),
	};
	const html = renderEditionHtml(edition);
	const file = Buffer.from(html, "utf-8");
	const doc = { source: file, filename: editionFilename(window) };

	const telegram = getBot().telegram;
	const links: Record<string, string> = {};
	let anyFailed = false;
	for (const chatId of config.telegramChatIds) {
		let sent: { message_id: number } | null = null;
		for (let attempt = 1; attempt <= 3; attempt++) {
			try {
				sent = await telegram.sendDocument(chatId, doc);
				break;
			} catch (err) {
				console.warn(
					`[ResendEdition] Attempt ${attempt}/3 failed for ${chatId}: ${(err as Error).message}`,
				);
				if (attempt < 3) await new Promise((r) => setTimeout(r, 4000));
			}
		}
		if (!sent) {
			anyFailed = true;
			continue;
		}
		links[chatId] = chatId.startsWith("-100")
			? `https://t.me/c/${chatId.slice(4)}/${sent.message_id}`
			: `https://t.me/c/${chatId.replace(/^-/, "")}/${sent.message_id}`;
		console.log(`[ResendEdition] ${chatId}: ${links[chatId]}`);
	}

	await query(
		"UPDATE news_editions SET payload = jsonb_set(payload, '{links}', $2::jsonb) WHERE edition_key = $1",
		[editionKey, JSON.stringify(links)],
	);

	return anyFailed ? 1 : 0;
}

main()
	.then(async (code) => {
		await closePool();
		process.exit(code);
	})
	.catch(async (err) => {
		console.error("[ResendEdition] Failed:", (err as Error).message);
		await closePool().catch(() => undefined);
		process.exit(1);
	});
