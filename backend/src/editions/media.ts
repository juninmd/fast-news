import { safeUrl } from "./escape.js";
import type { Headline } from "./types.js";

/** First usable http(s) image among the headlines a story cites. */
export function storyImage(
	ids: number[],
	known: Map<number, Headline>,
): string | null {
	for (const id of ids) {
		const raw = known.get(id)?.imageUrl;
		const url = raw ? safeUrl(raw) : null;
		if (url) return url;
	}
	return null;
}
