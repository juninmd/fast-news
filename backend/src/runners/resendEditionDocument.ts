import "dotenv/config";
import { runMigrations } from "../bootstrap.js";
import { config } from "../config/env.js";
import { closePool, query } from "../database/client.js";
import { collectHeadlines } from "../editions/collect.js";
import {
	editionFilename,
	messageLink,
	safeMessage,
	sendDocumentWithRetry,
} from "../editions/publish.js";
import { renderEditionHtml } from "../editions/renderHtml.js";
import {
	cleanHeadlines,
	hourlyCounts,
	isFactCheck,
} from "../editions/select.js";
import type {
	Edition,
	EditionDraft,
	EditionWindow,
} from "../editions/types.js";
import { editionWindow } from "../editions/window.js";
import { fetchMarketSnapshot } from "../services/marketData.js";

/**
 * Recovers an edition whose summary message was delivered but whose file
 * upload never made it (the delivered/failed split in publish.ts leaves
 * such an edition permanently "sent" with no link). The edition's window is
 * already closed, so re-running collectHeadlines() for it reproduces the
 * exact same rows in the exact same order — and the stored draft's `fontes`
 * are indices into that list — so the original document can be rebuilt
 * byte-for-byte without calling the model again, as long as every derived
 * value mirrors buildEdition.ts's own derivation exactly (checagens in
 * particular must come from the same cleaned/deduped list, not the raw
 * collect() output, or the fact-check section can silently drift).
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

	const row = await query<{
		payload: { draft: EditionDraft; links?: Record<string, string> };
	}>(
		"SELECT payload FROM news_editions WHERE edition_key = $1 AND sent_at IS NOT NULL",
		[editionKey],
	);
	const draft = row.rows[0]?.payload?.draft;
	if (!draft) {
		console.error(`[ResendEdition] No sent edition found for ${editionKey}`);
		return 1;
	}
	const existingLinks = row.rows[0]?.payload?.links ?? {};
	const pendingChatIds = config.telegramChatIds.filter(
		(id) => !existingLinks[id],
	);
	if (!pendingChatIds.length) {
		console.error(
			`[ResendEdition] ${editionKey} already has links for every chat — nothing to do.`,
		);
		return 0;
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
	const clean = cleanHeadlines(all, config.editions.excludedCategories);
	const checagens = clean.filter(isFactCheck).slice(-4);

	const edition: Edition = {
		window,
		draft,
		headlines: new Map(all.map((h) => [h.id, h])),
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
	const filename = editionFilename(window);

	const links: Record<string, string> = {};
	let anyFailed = false;
	for (const chatId of pendingChatIds) {
		try {
			const sent = await sendDocumentWithRetry(
				config.telegramBotToken,
				chatId,
				filename,
				file,
			);
			links[chatId] = messageLink(chatId, sent.message_id);
			console.log(`[ResendEdition] ${chatId}: ${links[chatId]}`);
		} catch (err) {
			anyFailed = true;
			console.error(
				`[ResendEdition] Gave up on ${chatId}: ${safeMessage(err)}`,
			);
		}
	}

	if (Object.keys(links).length > 0) {
		// Merges into whatever the row holds now rather than overwriting it, so
		// a concurrent successful send (e.g. the real CronJob finishing mid-run)
		// can't be clobbered by this script's result.
		await query(
			`UPDATE news_editions SET payload = jsonb_set(payload, '{links}', payload->'links' || $2::jsonb)
			 WHERE edition_key = $1`,
			[editionKey, JSON.stringify(links)],
		);
	}

	return anyFailed ? 1 : 0;
}

main()
	.then(async (code) => {
		await closePool();
		process.exit(code);
	})
	.catch(async (err) => {
		console.error("[ResendEdition] Failed:", safeMessage(err));
		await closePool().catch(() => undefined);
		process.exit(1);
	});
