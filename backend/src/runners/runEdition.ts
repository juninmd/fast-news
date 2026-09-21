import "dotenv/config";
import { runMigrations } from "../bootstrap.js";
import { closePool } from "../database/client.js";
import { buildEdition } from "../editions/buildEdition.js";
import { publishEdition } from "../editions/publish.js";
import { renderEditionHtml } from "../editions/renderHtml.js";
import { renderTelegramSummary } from "../editions/renderTelegram.js";
import {
	claimEdition,
	editionKey,
	markEditionSent,
	releaseEdition,
} from "../editions/store.js";
import { editionWindow, isEditionKind } from "../editions/window.js";

async function main(): Promise<number> {
	const kind = process.argv[2] ?? process.env["EDITION_KIND"];
	if (!isEditionKind(kind)) {
		console.error("[Edition] Usage: runEdition.js <manha|tarde|noite>");
		return 2;
	}
	const started = Date.now();
	const window = editionWindow(kind, new Date());
	await runMigrations();

	if (!(await claimEdition(window))) {
		console.log(
			`[Edition] ${editionKey(window)} already sent or in progress; skipping`,
		);
		return 0;
	}

	let delivered = 0;
	try {
		const edition = await buildEdition(window);
		const html = renderEditionHtml(edition);
		const result = await publishEdition(
			window,
			renderTelegramSummary(edition),
			html,
		);
		const chats = Object.entries(result.chats);
		delivered = chats.filter(([, c]) => c.status !== "failed").length;
		for (const [chatId, c] of chats)
			if (c.status !== "full")
				console.error(
					`[Edition] Delivery failed for chat ${chatId}: ${c.error}`,
				);
		if (!delivered) throw new Error("[Edition] No chat received the edition");
		const links = Object.fromEntries(
			chats
				.filter(([, c]) => c.link)
				.map(([chatId, c]) => [chatId, c.link as string]),
		);
		await markEditionSent(window, { draft: edition.draft, links });
		console.log(
			`[Edition] Sent ${editionKey(window)} to ${delivered} chat(s), ${Math.round(html.length / 1024)} KB, in ${Date.now() - started}ms`,
		);
		for (const [chatId, link] of Object.entries(links)) {
			console.log(`[Edition] ${chatId}: ${link}`);
		}
		return chats.some(([, c]) => c.status !== "full") ? 1 : 0;
	} catch (err) {
		if (!delivered) await releaseEdition(window);
		throw err;
	}
}

main()
	.then(async (code) => {
		await closePool();
		process.exit(code);
	})
	.catch(async (err) => {
		console.error("[Edition] Failed:", (err as Error).message);
		await closePool().catch(() => undefined);
		process.exit(1);
	});
