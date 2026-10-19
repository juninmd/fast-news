import { tokenizeWithForms } from "./textSimilarity.js";

export interface TrendArticle {
	id: string;
	title: string;
	source: string;
	theme: string;
	publishedAt: Date;
}

export interface TrendTerm {
	term: string;
	/** Articles mentioning the term in the current window. */
	count: number;
	/** Distinct outlets that mentioned it: cross-portal coverage, not one feed's spam. */
	sources: number;
	/** Same count in the window right before. */
	previous: number;
	/** count / previous (previous floored at 1). */
	growth: number;
	score: number;
	/** Mentions per bucket, oldest first, for a sparkline. */
	hourly: number[];
	articleIds: string[];
}

export interface TrendTheme {
	theme: string;
	count: number;
	previous: number;
	growth: number;
	/** Share of the window's articles, 0..1. */
	share: number;
}

export interface TrendReport {
	windowHours: number;
	generatedAt: string;
	totalArticles: number;
	terms: TrendTerm[];
	themes: TrendTheme[];
}

export interface TrendOptions {
	now?: Date;
	windowHours?: number;
	minCount?: number;
	minSources?: number;
	limit?: number;
	buckets?: number;
}

const HOUR = 3_600_000;

/** Unigrams and adjacent pairs of a headline: match key -> display form. */
function termsOf(title: string): Map<string, string> {
	const tokens = tokenizeWithForms(title).filter(
		(t) => t.key.length >= 4 || /\d/.test(t.key),
	);
	const out = new Map<string, string>();
	for (const t of tokens) out.set(t.key, t.form);
	for (let i = 0; i + 1 < tokens.length; i++) {
		const [a, b] = [tokens[i], tokens[i + 1]];
		if (a && b) out.set(`${a.key} ${b.key}`, `${a.form} ${b.form}`);
	}
	return out;
}

/**
 * Burst detection over two equal windows. A term trends when several outlets
 * pick it up and it is being mentioned more than in the previous window;
 * evergreen words have a high `previous` and wash out.
 */
export function computeTrends(
	articles: TrendArticle[],
	opts: TrendOptions = {},
): TrendReport {
	const now = opts.now ?? new Date();
	const windowHours = opts.windowHours ?? 24;
	const minCount = opts.minCount ?? 3;
	const minSources = opts.minSources ?? 2;
	const limit = opts.limit ?? 12;
	const buckets = opts.buckets ?? 12;

	const windowMs = windowHours * HOUR;
	const start = now.getTime() - windowMs;
	const prevStart = start - windowMs;

	const current = articles.filter((a) => {
		const t = a.publishedAt.getTime();
		return t > start && t <= now.getTime();
	});
	const previous = articles.filter((a) => {
		const t = a.publishedAt.getTime();
		return t > prevStart && t <= start;
	});

	const prevCounts = new Map<string, number>();
	for (const a of previous) {
		for (const term of termsOf(a.title).keys()) {
			prevCounts.set(term, (prevCounts.get(term) ?? 0) + 1);
		}
	}

	type Acc = {
		display: string;
		ids: string[];
		sources: Set<string>;
		hourly: number[];
	};
	const acc = new Map<string, Acc>();
	const bucketMs = windowMs / buckets;
	for (const a of current) {
		const slot = Math.min(
			buckets - 1,
			Math.max(0, Math.floor((a.publishedAt.getTime() - start) / bucketMs)),
		);
		for (const [term, display] of termsOf(a.title)) {
			let entry = acc.get(term);
			if (!entry) {
				entry = {
					display,
					ids: [],
					sources: new Set(),
					hourly: new Array<number>(buckets).fill(0),
				};
				acc.set(term, entry);
			}
			entry.ids.push(a.id);
			entry.sources.add(a.source);
			entry.hourly[slot] = (entry.hourly[slot] ?? 0) + 1;
		}
	}

	const candidates: TrendTerm[] = [];
	const fullIds = new Map<string, string[]>();
	for (const [term, entry] of acc) {
		const count = entry.ids.length;
		if (count < minCount || entry.sources.size < minSources) continue;
		const prev = prevCounts.get(term) ?? 0;
		const growth = count / Math.max(1, prev);
		const isPhrase = term.includes(" ");
		const score =
			Math.log2(1 + entry.sources.size) *
			Math.log2(2 + count) *
			Math.min(growth, 6) *
			(isPhrase ? 1.25 : 1);
		candidates.push({
			term: entry.display,
			count,
			sources: entry.sources.size,
			previous: prev,
			growth: Math.round(growth * 100) / 100,
			score: Math.round(score * 100) / 100,
			hourly: entry.hourly,
			articleIds: entry.ids.slice(0, 8),
		});
		fullIds.set(entry.display, entry.ids);
	}
	candidates.sort((a, b) => b.score - a.score || b.count - a.count);

	// Terms that cover (nearly) the same articles are one topic ("furacão",
	// "milton", "flórida"). Each topic is shown through its broadest term, a
	// phrase over a bare word on a tie, and ranked by its best member's score.
	type Group = { rep: TrendTerm; ids: Set<string>; score: number };
	const groups: Group[] = [];
	for (const c of candidates) {
		const ids = new Set(fullIds.get(c.term));
		const group = groups.find((g) => {
			let shared = 0;
			for (const id of ids) if (g.ids.has(id)) shared++;
			return shared / (ids.size + g.ids.size - shared) >= 0.6;
		});
		if (!group) {
			groups.push({ rep: c, ids, score: c.score });
			continue;
		}
		const broader =
			c.count > group.rep.count ||
			(c.count === group.rep.count &&
				c.term.includes(" ") &&
				!group.rep.term.includes(" "));
		if (broader) {
			group.rep = c;
			group.ids = ids;
		}
		group.score = Math.max(group.score, c.score);
	}
	const kept = groups
		.sort((a, b) => b.score - a.score)
		.slice(0, limit)
		.map((g) => ({ ...g.rep, score: g.score }));

	const themeNow = new Map<string, number>();
	const themePrev = new Map<string, number>();
	for (const a of current) {
		themeNow.set(a.theme, (themeNow.get(a.theme) ?? 0) + 1);
	}
	for (const a of previous) {
		themePrev.set(a.theme, (themePrev.get(a.theme) ?? 0) + 1);
	}
	const themes: TrendTheme[] = [...themeNow.entries()]
		.map(([theme, count]) => {
			const prev = themePrev.get(theme) ?? 0;
			return {
				theme,
				count,
				previous: prev,
				growth: Math.round((count / Math.max(1, prev)) * 100) / 100,
				share: current.length ? count / current.length : 0,
			};
		})
		.sort((a, b) => b.count - a.count);

	return {
		windowHours,
		generatedAt: now.toISOString(),
		totalArticles: current.length,
		terms: kept,
		themes,
	};
}

/**
 * Heat of a story cluster: breadth (distinct outlets) matters most, volume
 * adds a little, and the whole thing decays with a 12h half-life since the
 * last update so yesterday's big story gives way to today's.
 */
export function storyHeat(
	input: { sources: number; articles: number; lastUpdatedAt: Date },
	now: Date = new Date(),
): number {
	const ageHours = Math.max(
		0,
		(now.getTime() - input.lastUpdatedAt.getTime()) / HOUR,
	);
	const decay = 0.5 ** (ageHours / 12);
	const raw =
		input.sources * 2 +
		Math.log2(1 + Math.max(0, input.articles - input.sources));
	return Math.round(raw * decay * 100) / 100;
}
