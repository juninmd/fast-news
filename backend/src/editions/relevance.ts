import { tokenize } from "../services/textSimilarity.js";
import type { Headline } from "./types.js";

const MIN_TOKEN = 4;

function terms(text: string): string[] {
	return tokenize(text).filter((t) => t.length >= MIN_TOKEN);
}

/**
 * The cited headlines that actually talk about the story: they share a
 * name, number or term with it. The model picks ids from a list of hundreds
 * and sometimes cites one that has nothing to do with the story. When none
 * match (a story in another language can share no word), the first cited
 * headline stays, so a story never loses all of its sources to this check.
 */
export function relatedIds(
	ids: number[],
	known: Map<number, Headline>,
	storyText: string,
): number[] {
	if (ids.length < 2) return ids;
	const wanted = new Set(terms(storyText));
	const matching = ids.filter((id) => {
		const h = known.get(id);
		return h && terms(`${h.title} ${h.snippet}`).some((t) => wanted.has(t));
	});
	return matching.length ? matching : ids.slice(0, 1);
}
