/**
 * Cheap lexical signals used next to embeddings: they keep story clustering
 * working when the embedding provider is down, and break ties near the
 * embedding threshold.
 */

const STOPWORDS = new Set(
	(
		"a o as os um uma uns umas de do da dos das em no na nos nas por para com sem sob sobre " +
		"e ou mas que se ao aos à às pelo pela pelos pelas como mais menos ja já apos após ate até " +
		"the of and to in on for at by with from is are was were be as an its it this that after " +
		"new news diz afirma segundo milhoes bilhoes milhao bilhao anos hoje ontem apos veja saiba entenda confira video vídeo foto fotos"
	).split(/\s+/),
);

export function stripAccents(text: string): string {
	return text.normalize("NFD").replace(/[̀-ͯ]/g, "");
}

export interface Token {
	/** Accent-free form used for matching. */
	key: string;
	/** Lower-case form as written, accents kept, for display. */
	form: string;
}

/** Lower-case tokens without stopwords and bare numbers shorter than 4 digits. */
export function tokenizeWithForms(text: string): Token[] {
	const out: Token[] = [];
	for (const form of text.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? []) {
		const key = stripAccents(form).replace(/[^a-z0-9]/g, "");
		if (
			key.length >= 3 &&
			!STOPWORDS.has(key) &&
			!(/^\d+$/.test(key) && key.length < 4)
		) {
			out.push({ key, form });
		}
	}
	return out;
}

/** Accent-free match tokens of `text`. */
export function tokenize(text: string): string[] {
	return tokenizeWithForms(text).map((t) => t.key);
}

/** Crude stem (first 4 letters of long words) so mantém/mantida/manter count as one. */
function stem(token: string): string {
	return /^\d/.test(token) || token.length < 6 ? token : token.slice(0, 4);
}

/** Stemmed, accent-free title tokens; compute once when comparing many titles. */
export function titleTokenSet(title: string): Set<string> {
	return new Set(tokenize(title).map(stem));
}

/** Jaccard overlap of two stemmed token sets, 0..1 (see titleSimilarity). */
export function tokenSetSimilarity(ta: Set<string>, tb: Set<string>): number {
	if (ta.size === 0 || tb.size === 0) return 0;
	let shared = 0;
	for (const t of ta) if (tb.has(t)) shared++;
	// Two headlines sharing one word are not the same story.
	if (shared < 2) return 0;
	return shared / (ta.size + tb.size - shared);
}

/** Jaccard overlap of the stemmed title token sets, 0..1. */
export function titleSimilarity(a: string, b: string): number {
	return tokenSetSimilarity(titleTokenSet(a), titleTokenSet(b));
}

/**
 * Absolute http(s) URL for a feed link, or "" when it has none. Feeds ship
 * padded, relative and non-web links; stored as-is they never open from the
 * edition or the app, so they are fixed here once at ingestion.
 */
export function resolveHttpUrl(raw: string | undefined, base: string): string {
	const value = (raw ?? "").trim();
	if (!value) return "";
	try {
		const url = new URL(value, base);
		return url.protocol === "https:" || url.protocol === "http:"
			? url.toString()
			: "";
	} catch {
		return "";
	}
}

const TRACKING_PARAM =
	/^(utm_|fbclid$|gclid$|mc_|ref$|ref_|cmpid$|ocid$|at_|src$)/i;

/**
 * Real article URL behind a click-tracking redirect of the form
 * `https://redir.example.com/path/*https://site.com/article` (Folha, Yahoo).
 * Anything else is returned unchanged.
 */
export function unwrapRedirect(raw: string): string {
	const inner = raw.match(/^https?:\/\/[^/]+\/[^?#]*?\*(https?:\/\/.+)$/i)?.[1];
	if (!inner) return raw;
	try {
		return new URL(inner).toString();
	} catch {
		return raw;
	}
}

/** The link as published, minus tracking params (utm_*, fbclid, ...): same page, one URL. */
export function stripTracking(raw: string): string {
	try {
		const u = new URL(raw);
		let changed = false;
		for (const key of [...u.searchParams.keys()]) {
			if (TRACKING_PARAM.test(key)) {
				u.searchParams.delete(key);
				changed = true;
			}
		}
		return changed ? u.toString() : raw;
	} catch {
		return raw;
	}
}

/** URL without tracking params, fragment, `www.` and trailing slash, so one story shared via two links dedups. */
export function canonicalUrl(raw: string): string {
	try {
		const u = new URL(raw);
		u.hash = "";
		for (const key of [...u.searchParams.keys()]) {
			if (TRACKING_PARAM.test(key)) u.searchParams.delete(key);
		}
		u.searchParams.sort();
		const host = u.hostname.replace(/^www\./, "").toLowerCase();
		const path = u.pathname.replace(/\/+$/, "") || "/";
		const qs = u.searchParams.toString();
		return `${host}${path}${qs ? `?${qs}` : ""}`;
	} catch {
		return raw.trim();
	}
}
