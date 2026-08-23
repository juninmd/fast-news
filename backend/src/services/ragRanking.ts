/**
 * Post-retrieval ranking for vector search results.
 *
 * Cosine similarity alone ranks a three-week-old piece above today's coverage of
 * the same event, and returns the same story five times when several portals
 * syndicated it. This module fixes both, and stays pure so it is testable.
 */

import { normalizeForMatch } from "./articleText.js";

export interface RankableArticle {
	id: string;
	title: string;
	url: string;
	source: string;
	published_at: string;
	similarity: number;
}

/** Exponential decay: an article's weight halves every `halfLifeDays`. */
export function recencyWeight(
	publishedAt: string | Date | null | undefined,
	halfLifeDays: number,
	now = Date.now(),
): number {
	if (!publishedAt || halfLifeDays <= 0) return 1;
	const time = new Date(publishedAt).getTime();
	if (!Number.isFinite(time)) return 1;
	const ageDays = Math.max(0, (now - time) / 86_400_000);
	return 2 ** (-ageDays / halfLifeDays);
}

/**
 * Final score: similarity dominates, recency only breaks ties between results
 * that are already relevant. `recencyWeight` of 1 leaves the score untouched.
 */
export function scoreArticle<T extends RankableArticle>(
	article: T,
	halfLifeDays: number,
	now = Date.now(),
): number {
	const decay = recencyWeight(article.published_at, halfLifeDays, now);
	return article.similarity * (0.75 + 0.25 * decay);
}

function dedupeKey(article: RankableArticle): string {
	const normalized = normalizeForMatch(article.title);
	// Headlines are rewritten slightly across syndication — the first words are
	// the stable part, so key on them rather than the whole string.
	return normalized.split(" ").slice(0, 8).join(" ") || article.url;
}

export interface RerankOptions {
	halfLifeDays?: number;
	limit?: number;
	/** Keep at most this many results per source so one portal cannot flood. */
	maxPerSource?: number;
	now?: number;
}

/**
 * Re-scores by relevance × recency, then drops syndicated repeats and caps how
 * many results a single source may contribute.
 */
export function rerankArticles<T extends RankableArticle>(
	articles: T[],
	options: RerankOptions = {},
): T[] {
	const {
		halfLifeDays = 7,
		limit = articles.length,
		maxPerSource = 3,
		now = Date.now(),
	} = options;

	const sorted = [...articles].sort(
		(a, b) =>
			scoreArticle(b, halfLifeDays, now) - scoreArticle(a, halfLifeDays, now),
	);

	const seenStories = new Set<string>();
	const seenUrls = new Set<string>();
	const perSource = new Map<string, number>();
	const out: T[] = [];

	for (const article of sorted) {
		if (out.length >= limit) break;
		if (article.url && seenUrls.has(article.url)) continue;
		const key = dedupeKey(article);
		if (seenStories.has(key)) continue;
		const sourceCount = perSource.get(article.source) ?? 0;
		if (maxPerSource > 0 && sourceCount >= maxPerSource) continue;

		seenStories.add(key);
		if (article.url) seenUrls.add(article.url);
		perSource.set(article.source, sourceCount + 1);
		out.push(article);
	}

	return out;
}
