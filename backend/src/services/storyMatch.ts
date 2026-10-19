import { titleSimilarity } from "./textSimilarity.js";

export interface StoryCandidate {
	id: string;
	title: string;
	/** Story the candidate already belongs to, if any. */
	storyId: string | null;
	/** Cosine similarity of embeddings; null when either side has no vector. */
	similarity: number | null;
	publishedAt: Date | null;
}

export interface MatchOptions {
	/** Cosine similarity at which two articles are the same story. */
	threshold: number;
	/** How far apart in time two articles may be and still share a story. */
	windowHours: number;
	/** Headline overlap (Jaccard) that is enough without any embedding. */
	lexicalOnly?: number;
	/** Headline overlap that lowers the embedding bar by `lexicalSlack`. */
	lexicalBoost?: number;
	lexicalSlack?: number;
}

export interface ScoredCandidate extends StoryCandidate {
	lexical: number;
	score: number;
}

/**
 * Picks the existing article that `article` most likely repeats. Embeddings do
 * the heavy lifting; the headline overlap rescues near-misses (same event, other
 * wording) and carries the whole decision when the embedding service is down.
 */
export function pickStoryMatch(
	article: { title: string; publishedAt: Date | null },
	candidates: StoryCandidate[],
	opts: MatchOptions,
): ScoredCandidate | null {
	const lexicalOnly = opts.lexicalOnly ?? 0.4;
	const lexicalBoost = opts.lexicalBoost ?? 0.25;
	const slack = opts.lexicalSlack ?? 0.08;
	const windowMs = opts.windowHours * 3_600_000;

	let best: ScoredCandidate | null = null;
	for (const c of candidates) {
		if (article.publishedAt && c.publishedAt) {
			if (
				Math.abs(article.publishedAt.getTime() - c.publishedAt.getTime()) >
				windowMs
			) {
				continue;
			}
		}
		const lexical = titleSimilarity(article.title, c.title);
		const sim = c.similarity;
		const accepted =
			sim === null
				? lexical >= lexicalOnly
				: sim >= opts.threshold ||
					(sim >= opts.threshold - slack && lexical >= lexicalBoost) ||
					lexical >= Math.max(lexicalOnly, 0.7);
		if (!accepted) continue;
		const score = (sim ?? lexical) + lexical * 0.2;
		if (!best || score > best.score) best = { ...c, lexical, score };
	}
	return best;
}
