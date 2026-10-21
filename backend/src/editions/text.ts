import {
	titleTokenSet,
	tokenSetSimilarity,
} from "../services/textSimilarity.js";

/**
 * Shortens text at a word boundary and marks the cut with "…", so a label is
 * never left ending mid-word. Text that already fits is returned untouched.
 */
export function clipWords(value: string | undefined, max: number): string {
	const t = (value ?? "").replace(/\s+/g, " ").trim();
	if (t.length <= max) return t;
	const head = t.slice(0, max - 1);
	const space = head.lastIndexOf(" ");
	// Fall back to a hard cut for one very long word (URLs, compound names).
	const cut =
		t[max - 1] === " " || space < max * 0.5 ? head : head.slice(0, space);
	return `${cut.replace(/[\s,;:.\-–—(]+$/, "")}…`;
}

const digitRuns = (title: string): string[] => title.match(/\d+/g) ?? [];

/** Precomputed form of a title for comparing it against many others. */
export interface TitleProfile {
	tokens: Set<string>;
	numbers: Set<string>;
}

export function titleProfile(title: string): TitleProfile {
	return { tokens: titleTokenSet(title), numbers: new Set(digitRuns(title)) };
}

/**
 * True when two titles tell the same story in other words. The lexical match
 * ignores short numbers, so "Flamengo 2 x 1" and "Flamengo 3 x 0" are told
 * apart here: when both titles carry numbers, they must agree.
 */
export function sameProfile(
	a: TitleProfile,
	b: TitleProfile,
	threshold: number,
) {
	if (tokenSetSimilarity(a.tokens, b.tokens) < threshold) return false;
	if (!a.numbers.size || !b.numbers.size) return true;
	return (
		a.numbers.size === b.numbers.size &&
		[...b.numbers].every((n) => a.numbers.has(n))
	);
}

/** Newest entries examined per word: bounds the work on huge, repetitive feeds. */
const PER_TOKEN = 40;

/**
 * Lookup of "have I seen this story already?" over many titles: an inverted
 * index on title words means a title is only compared with entries it shares
 * a word with, so building a 5000-headline edition stays near-linear.
 */
export class TitleIndex<T> {
	private readonly entries: Array<{ profile: TitleProfile; item: T }> = [];
	private readonly byToken = new Map<string, number[]>();

	add(title: string, item: T): void {
		const profile = titleProfile(title);
		const id = this.entries.push({ profile, item }) - 1;
		for (const token of profile.tokens) {
			const list = this.byToken.get(token) ?? [];
			list.push(id);
			this.byToken.set(token, list);
		}
	}

	/** Oldest-first match among the candidates that `accept` allows. */
	find(
		title: string,
		threshold: number,
		accept: (item: T) => boolean = () => true,
	): T | undefined {
		const profile = titleProfile(title);
		const candidates = new Set<number>();
		for (const token of profile.tokens)
			for (const id of (this.byToken.get(token) ?? []).slice(-PER_TOKEN))
				candidates.add(id);
		for (const id of [...candidates].sort((a, b) => a - b)) {
			const entry = this.entries[id];
			if (
				entry &&
				accept(entry.item) &&
				sameProfile(entry.profile, profile, threshold)
			)
				return entry.item;
		}
		return undefined;
	}
}
