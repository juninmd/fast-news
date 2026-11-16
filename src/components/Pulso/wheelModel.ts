import type { TrendTerm } from "../../hooks/useTrends";

export const TAU = Math.PI * 2;
export const RINGS = 3;

export type WheelTone = "new" | "rising" | "steady";

export interface WheelWord {
	term: TrendTerm;
	/** Position around the wheel, radians clockwise from the top. */
	angle: number;
	/** 0 = outer ring. */
	ring: number;
	/** Score relative to the top term, 0..1. */
	rel: number;
	tone: WheelTone;
}

export function toneOf(term: TrendTerm): WheelTone {
	if (term.previous === 0) return "new";
	return term.growth >= 1.5 ? "rising" : "steady";
}

/** Relative ring radii (outer first); matches RING_RADIUS in WordWheel. */
export const RING_WEIGHTS = [44, 34.5, 25];

/** How many words each ring holds: proportional to its circumference. */
export function ringCounts(n: number): number[] {
	if (n <= 6) return [n, 0, 0];
	const total = RING_WEIGHTS.reduce((a, b) => a + b, 0);
	const counts = RING_WEIGHTS.map((w) => Math.floor((n * w) / total));
	let left = n - counts.reduce((a, b) => a + b, 0);
	for (let i = 0; left > 0; i = (i + 1) % RINGS, left--) counts[i]++;
	return counts;
}

/**
 * Ranks terms by score: the strongest fill the outer ring (most room for the
 * biggest type), the rest the inner rings. Each ring is spread evenly and
 * staggered against the others so labels don't line up radially.
 */
export function layoutWheel(terms: TrendTerm[], max = 24): WheelWord[] {
	const ranked = [...terms].sort((a, b) => b.score - a.score).slice(0, max);
	const top = Math.max(1e-9, ranked[0]?.score ?? 1);
	const counts = ringCounts(ranked.length);
	const words: WheelWord[] = [];
	let k = 0;
	counts.forEach((count, ring) => {
		const offset = ring === 0 ? 0 : (ring * Math.PI) / Math.max(1, count) / 1.5;
		for (let j = 0; j < count; j++, k++) {
			const term = ranked[k];
			words.push({
				term,
				angle: offset + (j / count) * TAU,
				ring,
				rel: Math.max(0, Math.min(1, term.score / top)),
				tone: toneOf(term),
			});
		}
	});
	return words;
}

/** Word indexes in clockwise order from the top, for arrow-key stepping. */
export function clockwiseOrder(words: WheelWord[]): number[] {
	return words
		.map((w, i) => [((w.angle % TAU) + TAU) % TAU, i] as const)
		.sort((a, b) => a[0] - b[0] || a[1] - b[1])
		.map(([, i]) => i);
}

/** Wraps an angle to (-π, π]. */
export function wrap(a: number): number {
	const r = (((a + Math.PI) % TAU) + TAU) % TAU;
	return r === 0 ? Math.PI : r - Math.PI;
}

/** Angular distance of a word from the pointer at 12 o'clock, 0..π. */
export function distanceFromTop(angle: number, rotation: number): number {
	return Math.abs(wrap(angle + rotation));
}

/** Index of the word under the pointer for a given rotation. */
export function nearestToTop(words: WheelWord[], rotation: number): number {
	let best = -1;
	let bestD = Number.POSITIVE_INFINITY;
	for (let i = 0; i < words.length; i++) {
		const d = distanceFromTop(words[i].angle, rotation);
		if (d < bestD) {
			bestD = d;
			best = i;
		}
	}
	return best;
}

/** Rotation that brings `angle` to the top, along the shortest path from `rotation`. */
export function rotationFor(angle: number, rotation: number): number {
	return rotation + wrap(-angle - rotation);
}

export function titleCase(term: string): string {
	return term.replace(
		/(^|\s)(\p{L})/gu,
		(_, sp: string, ch: string) => sp + ch.toUpperCase(),
	);
}
