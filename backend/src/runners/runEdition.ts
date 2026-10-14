import "dotenv/config";
import { resolve } from "node:path";
import { runMigrations } from "../bootstrap.js";
import { closePool } from "../database/client.js";
import { buildEdition } from "../editions/buildEdition.js";
import { GitHubPagesPublisher } from "../editions/githubPages.js";
import { publishEdition } from "../editions/publish.js";
import { renderEditionHtml } from "../editions/renderHtml.js";
import { renderEditionMarkdown } from "../editions/renderMarkdown.js";
import { renderTelegramSummary } from "../editions/renderTelegram.js";
import {
	createEditionSnapshot,
	hydrateSnapshot,
	type SnapshotEnvelope,
} from "../editions/snapshot.js";
import {
	getSnapshot,
	listSnapshots,
	markSnapshotPublicationFailed,
	markSnapshotPublished,
	persistSnapshot,
} from "../editions/snapshotStore.js";
import {
	buildStaticEditionSite,
	writeStaticSitePreview,
} from "../editions/staticSite.js";
import {
	claimEdition,
	editionKey,
	markEditionSent,
	releaseEdition,
} from "../editions/store.js";
import type { Edition } from "../editions/types.js";
import { editionWindow, isEditionKind } from "../editions/window.js";

async function main(): Promise<number> {
	const mode = process.env["EDITION_DELIVERY_MODE"] ?? "legacy_document";
	if (!["legacy_document", "pages_preview", "pages"].includes(mode)) {
		console.error(
			"[Edition] EDITION_DELIVERY_MODE must be legacy_document, pages_preview, or pages",
		);
		return 2;
	}
	const kind = process.argv[2] ?? process.env["EDITION_KIND"];
	if (!isEditionKind(kind)) {
		console.error("[Edition] Usage: runEdition.js <manha|meiodia|tarde|noite>");
		return 2;
	}
	const started = Date.now();
	const window = editionWindow(kind, new Date());
	await runMigrations();

	if (mode !== "pages_preview" && !(await claimEdition(window))) {
		console.log(
			`[Edition] ${editionKey(window)} already sent or in progress; skipping`,
		);
		return 0;
	}

	let delivered = 0;
	let snapshot: SnapshotEnvelope;
	try {
		const key = editionKey(window);
		const stored = await getSnapshot(key);
		let edition: Edition;
		if (stored) {
			snapshot = { snapshot: stored.snapshot, checksum: stored.checksum };
			edition = hydrateSnapshot(snapshot);
		} else {
			edition = await buildEdition(window);
			snapshot = createEditionSnapshot(edition);
			await persistSnapshot(window, snapshot);
		}
		const html = renderEditionHtml(edition);
		if (mode === "pages_preview") {
			const directory = process.env["EDITION_SITE_PREVIEW_DIR"];
			const baseUrl = process.env["EDITION_PAGES_BASE_URL"];
			if (!directory || !baseUrl)
				throw new Error(
					"pages_preview requires EDITION_SITE_PREVIEW_DIR and EDITION_PAGES_BASE_URL",
				);
			const archived = await listSnapshots();
			const site = buildStaticEditionSite(
				[
					...archived.filter(
						(item) => item.snapshot.editionId !== snapshot.snapshot.editionId,
					),
					snapshot,
				],
				baseUrl,
			);
			writeStaticSitePreview(site, directory);
			console.log(
				`[Edition] Static preview written to ${resolve(directory)}; Telegram was not contacted`,
			);
			return 0;
		}

		let editionUrl: string | undefined;
		if (mode === "pages") {
			const publisher = new GitHubPagesPublisher();
			if (stored?.publicationStatus === "published" && stored.publicationUrl) {
				editionUrl = await publisher.verifyPublished(snapshot);
			} else {
				try {
					const publication = await publisher.publish(
						snapshot,
						renderEditionMarkdown(edition).markdown,
					);
					editionUrl = publication.url;
					await markSnapshotPublished(key, publication.url, publication.commit);
				} catch (error) {
					await markSnapshotPublicationFailed(key);
					throw error;
				}
			}
		}
		const result = await publishEdition(
			window,
			renderTelegramSummary(edition, editionUrl),
			html,
			editionUrl,
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
		await markEditionSent(window, {
			schemaVersion: snapshot.snapshot.schemaVersion,
			checksum: snapshot.checksum,
			draft: edition.draft,
			deliveryMode: mode,
			links,
		});
		console.log(
			`[Edition] Sent ${editionKey(window)} to ${delivered} chat(s), ${Math.round(html.length / 1024)} KB, in ${Date.now() - started}ms`,
		);
		for (const [chatId, link] of Object.entries(links)) {
			console.log(`[Edition] ${chatId}: ${link}`);
		}
		return chats.some(([, c]) => c.status !== "full") ? 1 : 0;
	} catch (err) {
		if (mode !== "pages_preview" && !delivered) await releaseEdition(window);
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
