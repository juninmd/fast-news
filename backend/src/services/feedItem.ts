import { createHash } from "node:crypto";
import { type ArticleMedia, extractMedia } from "./articleMedia.js";
import type { FeedItemData } from "./feedParser.js";
import { htmlToText, inlineText, truncateText } from "./htmlText.js";
import { resolveHttpUrl } from "./textSimilarity.js";

export interface RawArticle {
	guid: string;
	title: string;
	content: string;
	url: string;
	source: string;
	category: string;
	company?: string;
	publishedAt: Date | null;
	imageUrl?: string;
	videoUrl?: string;
	media?: ArticleMedia[];
	promptHint?: string;
}

export interface FeedSource {
	url: string;
	category: string;
	company?: string;
	promptHint?: string;
}

/** Stored `content` stays a teaser: downstream prompts and embeddings slice it anyway. */
export const CONTENT_MAX_CHARS = 3000;
const TITLE_MAX_CHARS = 300;
/** A description shorter than this is enriched with the full body when the feed has one. */
const SHORT_DESCRIPTION_CHARS = 200;
/** Feeds stamp items a little ahead of us (clock skew, timezone slips). */
const FUTURE_TOLERANCE_MS = 5 * 60 * 1000;

// ── Dates ──────────────────────────────────────────────────────────────────

const DATE_FIELDS = [
	"isoDate",
	"pubDate",
	"dc:date",
	"date",
	"published",
	"updated",
] as const;

// Month abbreviations of the localized RFC 822 dates some BR/ES feeds emit ("Sex, 23 Out 2026 ...").
const LOCAL_MONTHS: Record<string, string> = {
	jan: "Jan",
	fev: "Feb",
	mar: "Mar",
	abr: "Apr",
	mai: "May",
	jun: "Jun",
	jul: "Jul",
	ago: "Aug",
	set: "Sep",
	out: "Oct",
	nov: "Nov",
	dez: "Dec",
	ene: "Jan",
	dic: "Dec",
};

function validDate(text: string): Date | null {
	const date = new Date(text);
	return Number.isNaN(date.getTime()) ? null : date;
}

/** Parses one feed date; tolerates `2026-10-24 09:00:00` (read as UTC) and pt/es month names. Null when invalid. */
export function parseFeedDate(value: unknown): Date | null {
	if (value instanceof Date)
		return Number.isNaN(value.getTime()) ? null : value;
	if (typeof value !== "string" || !value.trim()) return null;
	const text = value.trim();
	if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}(:\d{2})?$/.test(text))
		return validDate(`${text.replace(" ", "T")}Z`);
	const parsed = validDate(text);
	if (parsed) return parsed;
	const local = text
		.replace(/^\p{L}+\.?,\s*/u, "")
		.match(/^(\d{1,2})\s+(\p{L}{3,})\.?\s+(\d{4})(.*)$/u);
	const month = local?.[2]
		? LOCAL_MONTHS[
				local[2]
					.normalize("NFD")
					.replace(/[\u0300-\u036f]/g, "")
					.slice(0, 3)
					.toLowerCase()
			]
		: undefined;
	return local && month
		? validDate(`${local[1]} ${month} ${local[3]}${local[4] ?? ""}`)
		: null;
}

/**
 * Publication date of an item. A missing or bogus date must not bury the
 * article (the feed sorts by published_at) nor float it above "now" (feeds in
 * the wrong timezone), so both fall back to `now`.
 */
export function resolvePublishedAt(
	item: Record<string, unknown>,
	now: Date = new Date(),
): Date {
	for (const field of DATE_FIELDS) {
		const date = parseFeedDate(item[field]);
		if (date)
			return date.getTime() > now.getTime() + FUTURE_TOLERANCE_MS ? now : date;
	}
	return now;
}

// ── Text ───────────────────────────────────────────────────────────────────

// Boilerplate appended by CMSs and aggregators to every teaser.
const GENERIC_NOISE: Array<[RegExp, string]> = [
	[
		/\s*(?:The post|O post|A matéria|El artículo)\s[\s\S]{0,300}?\s(?:appeared first on|apareceu primeiro em|apareció primero en)\s[\s\S]{0,120}$/i,
		"",
	],
	[
		/\s*(?:\[(?:…|\.\.\.)\]|…|\.\.\.)?\s*(?:Continue reading|Read more|Leia mais|Continue lendo|Saiba mais|Veja mais)(?:[^\n]{0,120}?[»›→]|[\s»›→>….]{0,4})\s*$/,
		"…",
	],
	[/^(?:comments?|comentários?)$/i, ""],
	[/\s*\[(?:…|\.\.\.)\]$/, "…"],
];

/** Per-host cleanup for feeds whose teaser is machine-generated. */
const SOURCE_PROFILES: Array<{
	host: RegExp;
	clean: (text: string) => string;
}> = [
	{
		// "arXiv:2610.01234v1 Announce Type: new\nAbstract: ..."
		host: /(^|\.)arxiv\.org$/,
		clean: (t) =>
			t.replace(
				/^arXiv:\S+\s+Announce Type:\s*[\w-]+\s*(?:Abstract:\s*)?/i,
				"",
			),
	},
	{
		// Reddit appends "submitted by /u/x [link] [comments]" to every post
		host: /(^|\.)reddit\.com$/,
		clean: (t) => t.replace(/\s*submitted by\s+\/?u\/[\s\S]{0,200}$/i, ""),
	},
];

function hostOf(url: string): string {
	try {
		return new URL(url).hostname.toLowerCase();
	} catch {
		return "";
	}
}

/** Teaser text of a feed item: cleaned plain text, bounded by {@link CONTENT_MAX_CHARS}. */
export function cleanContent(item: FeedItemData, feedUrl: string): string {
	const text = (html: unknown) => htmlToText(html).trim();
	// Atom exposes a short `summary` next to the full `content`; RSS puts the
	// teaser in `content` (description) and the full body in `content:encoded`.
	const short = text(item["summary"]) || text(item["content"]) || "";
	const full = text(item["content:encoded"]);
	let out =
		short.length >= SHORT_DESCRIPTION_CHARS ||
		!full ||
		full.length <= short.length
			? short
			: full;
	if (!out) out = (item.contentSnippet ?? "").trim();

	const host = hostOf(feedUrl);
	for (const profile of SOURCE_PROFILES) {
		if (profile.host.test(host)) out = profile.clean(out);
	}
	for (const [pattern, replacement] of GENERIC_NOISE) {
		out = out.replace(pattern, replacement);
	}
	return truncateText(out.trim(), CONTENT_MAX_CHARS);
}

// ── Item ───────────────────────────────────────────────────────────────────

/** `https://site.com///` — some CMSs emit the homepage as every item's guid, which would collapse a whole feed into one article. */
function isHomepageUrl(value: string): boolean {
	try {
		const url = new URL(value);
		return url.pathname.replace(/\/+$/, "") === "" && !url.search;
	} catch {
		return false;
	}
}

/** Stable id of an item: its guid (unless it is just a homepage), else link, else Atom id, else a hash that survives re-fetches. */
export function resolveGuid(
	item: FeedItemData,
	feedUrl: string,
	title: string,
): string {
	const explicit = [item.guid, item.link, item["id"]].find(
		(v): v is string =>
			typeof v === "string" && v.trim() !== "" && !isHomepageUrl(v.trim()),
	);
	if (explicit) return explicit.trim();
	const dateText = DATE_FIELDS.map((f) => item[f]).find(
		(v) => typeof v === "string",
	);
	return createHash("sha1")
		.update(title ? `${title}|${feedUrl}|${dateText ?? ""}` : feedUrl)
		.digest("hex");
}

/** Absolute article link: `link`, else a guid that is itself a URL. */
export function resolveLink(item: FeedItemData, feedUrl: string): string {
	return (
		resolveHttpUrl(item.link, feedUrl) ||
		resolveHttpUrl(
			/^https?:\/\//.test(item.guid ?? "") ? item.guid : "",
			feedUrl,
		)
	);
}

/**
 * Single entry point that turns any RSS/Atom/RDF/YouTube item into the
 * `RawArticle` the pipeline stores, so every source is parsed the same way.
 */
export function normalizeFeedItem(
	item: FeedItemData,
	source: FeedSource,
	feedTitle?: string,
	now: Date = new Date(),
): RawArticle {
	const title = truncateText(inlineText(item.title), TITLE_MAX_CHARS);
	const url = resolveLink(item, source.url);
	const { media, imageUrl, videoUrl } = extractMedia(
		item as Record<string, unknown>,
		url || source.url,
	);
	// YouTube Atom keeps the description inside media:group.
	const group = (
		Array.isArray(item["mediaGroup"])
			? item["mediaGroup"][0]
			: item["mediaGroup"]
	) as Record<string, unknown[]> | undefined;
	const withGroupText: FeedItemData = group?.["media:description"]?.[0]
		? {
				...item,
				summary: item.summary ?? String(group["media:description"][0]),
			}
		: item;

	return {
		guid: resolveGuid(item, source.url, title),
		title,
		content: cleanContent(withGroupText, source.url),
		url,
		source: inlineText(feedTitle) || source.company || source.url,
		category: source.category,
		company: source.company,
		...(source.promptHint ? { promptHint: source.promptHint } : {}),
		publishedAt: resolvePublishedAt(item, now),
		...(imageUrl ? { imageUrl } : {}),
		...(videoUrl ? { videoUrl } : {}),
		...(media.length ? { media } : {}),
	};
}

/** Normalizes a whole feed, dropping repeated items (same guid) so one story is never queued twice. */
export function normalizeFeedItems(
	items: FeedItemData[],
	source: FeedSource,
	feedTitle?: string,
	now: Date = new Date(),
): RawArticle[] {
	const seen = new Set<string>();
	return items
		.map((item) => normalizeFeedItem(item, source, feedTitle, now))
		.filter((article) => {
			if (seen.has(article.guid)) return false;
			seen.add(article.guid);
			return true;
		});
}
