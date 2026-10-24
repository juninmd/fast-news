import Parser from "rss-parser";

/** The body is not a parseable RSS/Atom document (HTML block page, wrong URL...). */
export class FeedFormatError extends Error {}

export type FeedItemData = Parser.Item & Record<string, unknown>;
export interface ParsedFeed {
	title?: string;
	items: FeedItemData[];
}

const parser = new Parser({
	customFields: {
		item: [
			["media:content", "mediaContent", { keepArray: true }],
			["media:thumbnail", "mediaThumbnail", { keepArray: true }],
			["media:group", "mediaGroup"],
			["yt:videoId", "ytVideoId"],
			"enclosure",
		],
	},
});

const FEED_ACCEPT =
	"application/rss+xml, application/atom+xml, application/xml;q=0.9, text/xml;q=0.8, */*;q=0.5";

/** Decodes a feed body honouring the XML prolog, the HTTP charset and mojibake fallbacks. */
export function decodeFeedBytes(buf: ArrayBuffer, contentType = ""): string {
	const headerCharset = contentType.match(/charset=([^\s;'"]+)/i)?.[1];
	// XML prolog encoding wins over a generic/absent HTTP charset — BR feeds
	// often serve ISO-8859-1 bodies while declaring utf-8 (or nothing) in HTTP.
	const prolog = new TextDecoder("ascii").decode(buf.slice(0, 200));
	const prologCharset = prolog.match(/encoding=["']([^"']+)["']/i)?.[1];
	let charset = (prologCharset ?? headerCharset ?? "utf-8").toLowerCase();
	// TextDecoder accepts 'windows-1252' as alias for latin-1 variants
	if (["iso-8859-1", "latin1", "latin-1", "cp1252"].includes(charset))
		charset = "windows-1252";
	let decoded: string;
	try {
		decoded = new TextDecoder(charset, { fatal: false }).decode(buf);
	} catch {
		decoded = new TextDecoder("utf-8").decode(buf);
	}
	// Safety net: U+FFFD means the charset guess was wrong (e.g. utf-8 header on a
	// latin-1 body with no prolog). windows-1252 maps every byte, so it never
	// yields U+FFFD — retry there before persisting irrecoverable mojibake.
	if (charset !== "windows-1252" && decoded.includes("�")) {
		decoded = new TextDecoder("windows-1252").decode(buf);
	}
	return decoded;
}

// biome-ignore lint/suspicious/noControlCharactersInRegex: stripping them is the point
const CONTROL_CHARS_RE = /[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g;

/**
 * Repairs the usual real-world breakage rss-parser rejects: BOM/leading
 * whitespace, control characters, bare `&`, and `<rss>` without `version`
 * (UOL). Throws {@link FeedFormatError} when the body is not a feed at all.
 */
export function sanitizeFeedXml(raw: string): string {
	const xml = raw
		.replace(/^\uFEFF/, "")
		.replace(CONTROL_CHARS_RE, "")
		.trimStart();
	if (/^<!doctype html|^<html[\s>]/i.test(xml))
		throw new FeedFormatError(
			"HTML em vez de feed (bloqueio anti-bot ou URL incorreta)",
		);
	if (!/<(?:rss|feed|rdf:RDF)[\s>]/i.test(xml.slice(0, 4000)))
		throw new FeedFormatError("resposta não é um feed RSS/Atom");
	return xml
		.split(/(<!\[CDATA\[[\s\S]*?\]\]>)/)
		.map((part, i) =>
			i % 2
				? part
				: part.replace(/&(?!(?:#\d+|#x[0-9a-f]+|[a-z][a-z0-9]*);)/gi, "&amp;"),
		)
		.join("")
		.replace(/<rss(?=[\s>])(?![^>]*\bversion\s*=)/i, '<rss version="2.0"');
}

export async function parseFeed(xml: string): Promise<ParsedFeed> {
	const feed = await parser.parseString(sanitizeFeedXml(xml));
	return { title: feed.title, items: feed.items as unknown as FeedItemData[] };
}

/** Fetches a feed and decodes it to text (see {@link decodeFeedBytes}). */
export async function fetchFeedXml(
	url: string,
	timeoutMs: number,
): Promise<string> {
	const resp = await fetch(url, {
		signal: AbortSignal.timeout(timeoutMs),
		headers: { "User-Agent": "FastNews/1.0", Accept: FEED_ACCEPT },
	});
	if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
	return decodeFeedBytes(
		await resp.arrayBuffer(),
		resp.headers.get("content-type") ?? "",
	);
}
