import { createHash } from "node:crypto";
import { type ArticleMedia, extractMedia } from "./articleMedia.js";
import type { FeedItemData } from "./feedParser.js";
import { htmlToText, inlineText, truncateText } from "./htmlText.js";
import { outletOf } from "./outlet.js";
import {
	resolveHttpUrl,
	stripAccents,
	stripTracking,
	unwrapRedirect,
} from "./textSimilarity.js";

export interface RawArticle {
	guid: string;
	title: string;
	content: string;
	url: string;
	source: string;
	category: string;
	company?: string;
	publishedAt: Date | null;
	/** Publisher key (see outlet.ts): one value per outlet, however many feeds it has. */
	outlet?: string;
	author?: string;
	tags?: string[];
	/** Discussion thread (HN, lobste.rs, WordPress `comments`). */
	commentsUrl?: string;
	/** ISO 639-1 code of the article ("pt", "en"). */
	language?: string;
	wordCount?: number;
	imageUrl?: string;
	videoUrl?: string;
	media?: ArticleMedia[];
	promptHint?: string;
}

export interface FeedMeta {
	title?: string;
	language?: string;
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

// ── Title ──────────────────────────────────────────────────────────────────

const invisible = /[\u00ad\u200b-\u200d\ufeff]/g;

/** Title as one line of NFC text, without soft hyphens and zero-width characters. */
export function cleanTitle(raw: unknown): string {
	return truncateText(
		inlineText(raw).normalize("NFC").replace(invisible, ""),
		TITLE_MAX_CHARS,
	);
}

const squash = (text: string) =>
	stripAccents(text)
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "");

/** Teasers that only repeat the headline say nothing: drop them, or just the repeated lead. */
export function withoutTitleEcho(content: string, title: string): string {
	if (!content || !title) return content;
	const c = squash(content);
	const t = squash(title);
	if (!t || c === t) return "";
	if (c.startsWith(t) && content.toLowerCase().startsWith(title.toLowerCase()))
		return content
			.slice(title.length)
			.replace(/^[\s:–—.-]+/, "")
			.trim();
	return content;
}

// ── Details ────────────────────────────────────────────────────────────────

const MAX_TAGS = 8;
const MAX_AUTHOR_CHARS = 120;
const ACCENTS: Record<string, string> = {
	"'": "\u0301",
	"`": "\u0300",
	"^": "\u0302",
	'"': "\u0308",
	"~": "\u0303",
};

/** Author name from `dc:creator`, `author` (RSS email form or Atom name) or lobste.rs' "domain by user". */
export function cleanAuthor(raw: unknown): string | undefined {
	const value = Array.isArray(raw) ? raw[0] : raw;
	const text =
		typeof value === "string"
			? value
			: value && typeof value === "object"
				? String((value as Record<string, unknown>)["name"] ?? "")
				: "";
	let name = inlineText(text);
	// "joe@site.com (Joe Doe)" -> "Joe Doe"; a bare address says nothing.
	const paren = name.match(/\(([^)]+)\)\s*$/);
	if (/\S+@\S+/.test(name)) name = paren?.[1]?.trim() ?? "";
	name = name
		.replace(/^\S+\.\S+ by /, "")
		.replace(/^\/?u\//, "")
		// arXiv authors carry LaTeX accents: Lu\'is -> Luís
		.replace(
			/\\(['`^"~])\{?([a-zA-Z])\}?/g,
			(_m, mark: string, letter: string) =>
				`${letter}${ACCENTS[mark] ?? ""}`.normalize("NFC"),
		);
	if (name.length > MAX_AUTHOR_CHARS) {
		// Long author lists (papers): the first three, then "et al."
		name = `${name.split(/,\s*/).slice(0, 3).join(", ")} et al.`;
	}
	return name && name.length <= MAX_AUTHOR_CHARS ? name : undefined;
}

/** Categories of an item: RSS `<category>` text and Atom `term`/`label`, deduplicated. */
export function cleanTags(item: FeedItemData): string[] {
	const atom = (item["categoryNodes"] as unknown[] | undefined) ?? [];
	const raw = [
		...((item.categories as unknown[] | undefined) ?? []),
		...atom.map((n) => {
			const a =
				n && typeof n === "object"
					? ((n as Record<string, unknown>)["$"] as Record<string, unknown>)
					: undefined;
			return a?.["label"] ?? a?.["term"] ?? (typeof n === "string" ? n : "");
		}),
	];
	const seen = new Set<string>();
	const tags: string[] = [];
	for (const entry of raw) {
		const tag = inlineText(typeof entry === "string" ? entry : "");
		const key = tag.toLowerCase();
		if (!tag || tag.length > 40 || seen.has(key)) continue;
		seen.add(key);
		tags.push(tag);
	}
	return tags.slice(0, MAX_TAGS);
}

/** "pt-BR" / "en_US" / "EN" -> "pt" / "en"; undefined for anything else. */
export function normalizeLanguage(raw: unknown): string | undefined {
	if (typeof raw !== "string") return undefined;
	const code = raw.trim().toLowerCase().split(/[-_]/)[0] ?? "";
	return /^[a-z]{2,3}$/.test(code) ? code : undefined;
}

function wordCountOf(item: FeedItemData): number | undefined {
	const body = htmlToText(
		item["content:encoded"] ?? item["content"] ?? item["summary"],
	);
	const words = body ? body.split(/\s+/).length : 0;
	return words > 0 ? words : undefined;
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
	return stripTracking(
		unwrapRedirect(
			resolveHttpUrl(item.link, feedUrl) ||
				resolveHttpUrl(
					/^https?:\/\//.test(item.guid ?? "") ? item.guid : "",
					feedUrl,
				),
		),
	);
}

/**
 * Single entry point that turns any RSS/Atom/RDF/YouTube item into the
 * `RawArticle` the pipeline stores, so every source is parsed the same way.
 */
export function normalizeFeedItem(
	item: FeedItemData,
	source: FeedSource,
	feed: FeedMeta = {},
	now: Date = new Date(),
): RawArticle {
	const sourceName = inlineText(feed.title) || source.company || source.url;
	const title = cleanTitle(item.title);
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

	const author = cleanAuthor(
		item["creator"] ?? item["dc:creator"] ?? item["author"],
	);
	const tags = cleanTags(item);
	const commentsUrl =
		typeof item["comments"] === "string"
			? resolveHttpUrl(item["comments"], source.url) || undefined
			: undefined;
	const language = normalizeLanguage(item["language"] ?? feed.language);
	const wordCount = wordCountOf(item);

	const outlet = outletOf(url, source.company ?? sourceName);

	return {
		guid: resolveGuid(item, source.url, title),
		title,
		content: withoutTitleEcho(cleanContent(withGroupText, source.url), title),
		url,
		source: sourceName,
		category: source.category,
		company: source.company,
		...(source.promptHint ? { promptHint: source.promptHint } : {}),
		publishedAt: resolvePublishedAt(item, now),
		...(outlet ? { outlet } : {}),
		...(author ? { author } : {}),
		...(tags.length ? { tags } : {}),
		...(commentsUrl ? { commentsUrl } : {}),
		...(language ? { language } : {}),
		...(wordCount ? { wordCount } : {}),
		...(imageUrl ? { imageUrl } : {}),
		...(videoUrl ? { videoUrl } : {}),
		...(media.length ? { media } : {}),
	};
}

/** Normalizes a whole feed, dropping repeated items (same guid) so one story is never queued twice. */
export function normalizeFeedItems(
	items: FeedItemData[],
	source: FeedSource,
	feed: FeedMeta = {},
	now: Date = new Date(),
): RawArticle[] {
	const seen = new Set<string>();
	return items
		.map((item) => normalizeFeedItem(item, source, feed, now))
		.filter((article) => {
			if (seen.has(article.guid)) return false;
			seen.add(article.guid);
			return true;
		});
}
