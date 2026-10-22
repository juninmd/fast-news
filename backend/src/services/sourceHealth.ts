import { query } from "../database/client.js";

/** Failures in a row before a feed stops being fetched on every run. */
export const QUARANTINE_AFTER_FAILURES = 3;
const BASE_BACKOFF_MS = 30 * 60 * 1_000;
const MAX_BACKOFF_MS = 24 * 60 * 60 * 1_000;

export type SourceStatus =
	| "healthy"
	| "degraded"
	| "quarantined"
	| "disabled"
	| "unknown";

/** 0 until the threshold, then 30min, 1h, 2h... capped at 24h. */
export function quarantineMs(consecutiveFailures: number): number {
	if (consecutiveFailures < QUARANTINE_AFTER_FAILURES) return 0;
	const exp = consecutiveFailures - QUARANTINE_AFTER_FAILURES;
	return Math.min(BASE_BACKOFF_MS * 2 ** Math.min(exp, 10), MAX_BACKOFF_MS);
}

export function isQuarantined(
	quarantinedUntil: Date | string | null | undefined,
	now: Date = new Date(),
): boolean {
	if (!quarantinedUntil) return false;
	return new Date(quarantinedUntil).getTime() > now.getTime();
}

export function classifySource(
	row: {
		is_active: boolean;
		consecutive_failures: number | null;
		quarantined_until: Date | string | null;
		last_success_at: Date | string | null;
	},
	now: Date = new Date(),
): SourceStatus {
	if (!row.is_active) return "disabled";
	if (isQuarantined(row.quarantined_until, now)) return "quarantined";
	if ((row.consecutive_failures ?? 0) > 0) return "degraded";
	return row.last_success_at ? "healthy" : "unknown";
}

/** Keeps stored errors short and free of credentials that may sit in a feed URL. */
export function sanitizeError(message: string): string {
	return message
		.replace(/(https?:\/\/)[^\s/@]+@/g, "$1")
		.replace(/([?&](?:key|token|apikey|api_key)=)[^&\s]+/gi, "$1<redacted>")
		.slice(0, 200);
}

export async function recordFeedResult(
	url: string,
	ok: boolean,
	error?: string,
): Promise<void> {
	try {
		if (ok) {
			await query(
				`UPDATE source_feeds
				 SET consecutive_failures = 0, last_error = NULL, quarantined_until = NULL,
				     last_success_at = NOW(), last_fetched = NOW()
				 WHERE url = $1`,
				[url],
			);
			return;
		}
		const res = await query<{ consecutive_failures: number }>(
			`UPDATE source_feeds
			 SET consecutive_failures = COALESCE(consecutive_failures, 0) + 1,
			     total_failures = COALESCE(total_failures, 0) + 1,
			     last_error = $2, last_failure_at = NOW(), last_fetched = NOW()
			 WHERE url = $1
			 RETURNING consecutive_failures`,
			[url, sanitizeError(error ?? "unknown error")],
		);
		const failures = res.rows[0]?.consecutive_failures ?? 0;
		const delay = quarantineMs(failures);
		if (delay > 0) {
			await query(
				`UPDATE source_feeds SET quarantined_until = NOW() + ($2 || ' milliseconds')::interval WHERE url = $1`,
				[url, String(delay)],
			);
			console.warn(
				`[sourceHealth] ${url} quarantined for ${Math.round(delay / 60_000)}min after ${failures} failures`,
			);
		}
	} catch (err) {
		// Health bookkeeping must never break ingestion.
		console.warn("[sourceHealth] record failed:", (err as Error).message);
	}
}

export interface SourceHealthRow {
	id: string;
	name: string;
	url: string;
	category: string | null;
	company: string | null;
	status: SourceStatus;
	isActive: boolean;
	consecutiveFailures: number;
	totalFailures: number;
	lastError: string | null;
	lastSuccessAt: string | null;
	lastFailureAt: string | null;
	quarantinedUntil: string | null;
	articlesLast24h: number;
}

export async function getSourceHealth(): Promise<SourceHealthRow[]> {
	const res = await query<{
		id: string;
		name: string;
		url: string;
		category: string | null;
		company: string | null;
		is_active: boolean;
		consecutive_failures: number | null;
		total_failures: number | null;
		last_error: string | null;
		last_success_at: string | null;
		last_failure_at: string | null;
		quarantined_until: string | null;
		articles_24h: number;
	}>(
		`SELECT sf.id, sf.name, sf.url, sf.category, sf.company, sf.is_active,
		        sf.consecutive_failures, sf.total_failures, sf.last_error,
		        sf.last_success_at, sf.last_failure_at, sf.quarantined_until,
		        COALESCE(a.n, 0)::int AS articles_24h
		 FROM source_feeds sf
		 LEFT JOIN LATERAL (
		   SELECT COUNT(*) AS n FROM news_articles na
		   WHERE na.company IS NOT DISTINCT FROM sf.company
		     AND na.category = sf.category
		     AND na.created_at > NOW() - INTERVAL '24 hours'
		 ) a ON TRUE
		 ORDER BY sf.consecutive_failures DESC NULLS LAST, sf.name`,
	);
	return res.rows.map((r) => ({
		id: r.id,
		name: r.name,
		url: r.url,
		category: r.category,
		company: r.company,
		status: classifySource(r),
		isActive: r.is_active,
		consecutiveFailures: r.consecutive_failures ?? 0,
		totalFailures: r.total_failures ?? 0,
		lastError: r.last_error,
		lastSuccessAt: r.last_success_at,
		lastFailureAt: r.last_failure_at,
		quarantinedUntil: r.quarantined_until,
		articlesLast24h: r.articles_24h,
	}));
}
