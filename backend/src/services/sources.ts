import { query } from "../database/client.js";
import { FEED_SOURCES, RETIRED_FEED_URLS } from "./feedSources.js";

export type { FeedSource } from "./feedSources.js";
export { FEED_SOURCES };

function isValidFeedUrl(url: string): boolean {
	try {
		const parsed = new URL(url);
		return parsed.protocol === "http:" || parsed.protocol === "https:";
	} catch {
		return false;
	}
}

export async function syncDefaultFeeds(): Promise<void> {
	try {
		// Upsert idempotente: insere apenas fontes novas, preserva is_active de existentes
		let inserted = 0;
		for (const source of FEED_SOURCES) {
			if (!isValidFeedUrl(source.url)) {
				console.warn(`[sources] Skipping malformed feed URL: ${source.url}`);
				continue;
			}
			const res = await query(
				"INSERT INTO source_feeds (name, url, category, company, is_active) VALUES ($1, $2, $3, $4, true) ON CONFLICT (url) DO NOTHING",
				[
					source.company || "Fonte",
					source.url,
					source.category,
					source.company,
				],
			);
			inserted += res.rowCount ?? 0;
		}
		if (inserted > 0)
			console.log(`[sources] Seeded ${inserted} new default sources.`);

		const retired = await query(
			"UPDATE source_feeds SET is_active = false WHERE url = ANY($1) AND is_active = true",
			[RETIRED_FEED_URLS],
		);
		if (retired.rowCount)
			console.log(`[sources] Deactivated ${retired.rowCount} retired feeds.`);
	} catch (err) {
		console.error("[sources] Failed to sync default feeds:", err);
	}
}

export async function getActiveFeeds(): Promise<
	Array<{ url: string; category: string; company?: string }>
> {
	try {
		const res = await query<{ url: string; category: string; company: string }>(
			"SELECT url, category, company FROM source_feeds WHERE is_active = true",
		);
		if (res.rows.length > 0) {
			return res.rows.map((r) => ({
				url: r.url,
				category: r.category,
				company: r.company || undefined,
			}));
		}
	} catch (err) {
		console.error(
			"[sources] Error loading feeds from database, falling back to static list:",
			err,
		);
	}
	return FEED_SOURCES;
}