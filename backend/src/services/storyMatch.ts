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

const YEAR = /^(19|20)\d{2}$/;

/** Identifying numbers of a headline: contest/round/version numbers, not years or small counts. */
function identifyingNumbers(title: string): Set<string> {
	const found = title.match(/\d[\d.,]*\d|\d/g) ?? [];
	return new Set(
		found
			.map((n) => n.replace(/[.,]/g, ""))
			.filter((n) => n.length >= 3 && !YEAR.test(n)),
	);
}

/**
 * "Quina concurso 7150" and "Dia de Sorte concurso 1329" share every other word
 * and are different stories: two headlines that each name specific numbers
 * with none in common are not the same event.
 */
export function numbersConflict(a: string, b: string): boolean {
	const na = identifyingNumbers(a);
	const nb = identifyingNumbers(b);
	if (na.size === 0 || nb.size === 0) return false;
	for (const n of na) if (nb.has(n)) return false;
	return true;
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
		// Headline overlap alone cannot tell two draws of a lottery apart; only a
		// strong embedding match overrides the numbers.
		if (
			numbersConflict(article.title, c.title) &&
			!(sim !== null && sim >= opts.threshold)
		)
			continue;
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
