import { decodeEntities } from "../services/htmlText.js";
import { clipWords } from "./text.js";

/** One live trending topic on X (Brazil): the name and our own search link, nothing invented. */
export interface XTrend {
	name: string;
	url: string;
}

const SOURCE_URL = "https://getdaytrends.com/brazil/";
const MAX_TRENDS = 8;
const MIN_TRENDS = 3;
const MAX_NAME = 60;
const FETCH_TIMEOUT_MS = 4000;
const ANCHOR = /<a href="\/brazil\/trend\/[^"]+"[^>]*>([^<]+)<\/a>/g;

/** Builds the link ourselves, so a scraped value can never smuggle in a URL. */
export function xSearchUrl(name: string): string {
	return `https://x.com/search?q=${encodeURIComponent(name)}`;
}

/**
 * Keeps plain-text names only (no control chars or markup), de-duplicated,
 * and rebuilds each link. Used on scraped input and on stored snapshots alike.
 */
export function sanitizeXTrends(list: unknown): XTrend[] {
	if (!Array.isArray(list)) return [];
	const seen = new Set<string>();
	const out: XTrend[] = [];
	for (const item of list) {
		const raw = (item as Partial<XTrend> | null)?.name;
		if (typeof raw !== "string") continue;
		const name = clipWords(raw.replace(/[\p{Cc}<>]/gu, " "), MAX_NAME);
		const key = name.toLowerCase();
		if (!name || seen.has(key)) continue;
		seen.add(key);
		out.push({ name, url: xSearchUrl(name) });
		if (out.length >= MAX_TRENDS) break;
	}
	return out;
}

export function parseXTrends(html: string): XTrend[] {
	const names = [...html.matchAll(ANCHOR)].map((m) => ({
		name: decodeEntities(m[1] ?? "").trim(),
	}));
	const trends = sanitizeXTrends(names);
	return trends.length >= MIN_TRENDS ? trends : [];
}

/**
 * Live trending names from a public aggregator. Never throws and never falls
 * back to stale or made-up topics: when the source is down the section is
 * simply left out of the edition.
 */
export async function fetchXTrends(): Promise<XTrend[]> {
	try {
		const res = await fetch(SOURCE_URL, {
			headers: { "Accept-Language": "pt-BR,pt;q=0.9" },
			signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
		});
		if (!res.ok) return [];
		return parseXTrends(await res.text());
	} catch {
		return [];
	}
}
