import {
	extractArticleText,
	isUsableArticleText,
	MIN_TITLE_COVERAGE,
	sanitizeFeedContent,
	stripHtml,
	titleCoverage,
} from "./articleText.js";

const READER_TIMEOUT_MS = 15_000;
const DIRECT_TIMEOUT_MS = 12_000;

export interface FullArticleOptions {
	/** Headline — anchors extraction and validates that the right page was read. */
	title?: string;
	/** RSS summary used when the fetched body fails the quality gate. */
	fallback?: string;
	signal?: AbortSignal;
}

/**
 * Loopback and private addresses: the external reader cannot reach them, so
 * going straight to a direct fetch saves a guaranteed round-trip failure.
 */
function isLocalAddress(url: string): boolean {
	try {
		const { hostname } = new URL(url);
		return (
			hostname === "localhost" ||
			hostname === "::1" ||
			hostname.endsWith(".local") ||
			/^127\./.test(hostname) ||
			/^10\./.test(hostname) ||
			/^192\.168\./.test(hostname) ||
			/^172\.(1[6-9]|2\d|3[01])\./.test(hostname)
		);
	} catch {
		return false;
	}
}

async function fetchReaderMarkdown(
	url: string,
	signal?: AbortSignal,
): Promise<string> {
	const response = await fetch(`https://r.jina.ai/${url}`, {
		signal: signal ?? AbortSignal.timeout(READER_TIMEOUT_MS),
		headers: { Accept: "text/plain" },
	});
	if (!response.ok) throw new Error(`Reader HTTP ${response.status}`);
	return response.text();
}

/** Last resort when the reader is down: pull the page and keep its `<article>`. */
async function fetchDirectHtml(
	url: string,
	signal?: AbortSignal,
): Promise<string> {
	const response = await fetch(url, {
		signal: signal ?? AbortSignal.timeout(DIRECT_TIMEOUT_MS),
		headers: {
			"User-Agent": "FastNews/1.0 (+https://github.com/juninmd/fast-news)",
			Accept: "text/html,application/xhtml+xml",
		},
	});
	if (!response.ok) throw new Error(`HTTP ${response.status}`);
	const html = await response.text();
	const body =
		html.match(/<article\b[^>]*>([\s\S]*?)<\/article>/i)?.[1] ??
		html.match(
			/<div[^>]+(?:class|id)\s*=\s*["'][^"']*(?:article|content|post)-?(?:body|text|content)[^"']*["'][^>]*>([\s\S]*?)<\/div>/i,
		)?.[1] ??
		html;
	return stripHtml(body);
}

/**
 * Best-effort full text for an article URL.
 *
 * Tries the reader service, falls back to fetching the page directly, and
 * accepts a result only when it looks like article prose about *this* headline.
 * Otherwise returns the sanitized RSS summary — a short accurate summary beats
 * a long body full of another page's content.
 */
export async function fetchFullArticle(
	url: string,
	options: FullArticleOptions = {},
): Promise<string> {
	const { title, fallback = "", signal } = options;
	const cleanFallback = sanitizeFeedContent(fallback);
	if (!url) return cleanFallback;

	const attempts: Array<() => Promise<string>> = isLocalAddress(url)
		? [() => fetchDirectHtml(url, signal)]
		: [
				() => fetchReaderMarkdown(url, signal),
				() => fetchDirectHtml(url, signal),
			];

	let best = "";
	for (const attempt of attempts) {
		let raw: string;
		try {
			raw = await attempt();
		} catch {
			continue;
		}
		const text = extractArticleText(raw, { title });
		if (isUsableArticleText(text, { title })) return text;
		// Keep the longest near-miss: better than nothing if every attempt fails.
		if (text.length > best.length) best = text;
	}

	if (!cleanFallback) return best;
	// A near-miss still wins when it is clearly richer and stays on topic.
	const richer = best.length > cleanFallback.length + 400;
	const onTopic = !title || titleCoverage(best, title) >= MIN_TITLE_COVERAGE;
	return richer && onTopic ? best : cleanFallback;
}
