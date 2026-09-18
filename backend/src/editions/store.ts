import { query } from "../database/client.js";
import type { EditionWindow } from "./types.js";

export function editionKey(w: EditionWindow): string {
	return `${w.day}:${w.kind}`;
}

/**
 * Claims the edition slot. Returns false when it was already sent, so a
 * retried or duplicated job never posts the same edition twice. A claim left
 * unsent (crashed run) is taken over after 40 minutes, well past the
 * CronJob's 20-minute activeDeadlineSeconds.
 */
export async function claimEdition(w: EditionWindow): Promise<boolean> {
	const res = await query(
		`INSERT INTO news_editions (edition_key, kind, window_start, window_end)
		 VALUES ($1, $2, $3, $4)
		 ON CONFLICT (edition_key) DO UPDATE SET claimed_at = NOW()
		   WHERE news_editions.sent_at IS NULL
		     AND news_editions.claimed_at < NOW() - INTERVAL '40 minutes'
		 RETURNING id`,
		[editionKey(w), w.kind, w.start, w.end],
	);
	return (res.rowCount ?? 0) > 0;
}

export async function markEditionSent(
	w: EditionWindow,
	payload: unknown,
): Promise<void> {
	await query(
		`UPDATE news_editions SET sent_at = NOW(), payload = $2 WHERE edition_key = $1`,
		[editionKey(w), JSON.stringify(payload)],
	);
}

/** Frees the slot after a failure that sent nothing, so a retry can run. */
export async function releaseEdition(w: EditionWindow): Promise<void> {
	await query(
		`DELETE FROM news_editions WHERE edition_key = $1 AND sent_at IS NULL`,
		[editionKey(w)],
	);
}
