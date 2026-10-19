const IMAGE_EXT_RE = /\.(jpe?g|png|webp|gif|avif)(\?.*)?$/i;
// Tracking pixels, icons and share buttons that feeds embed inside the HTML body.
const JUNK_IMAGE_RE =
	/(pixel|spacer|blank|1x1|logo|favicon|sprite|avatar|gravatar|emoji|badge|button|feedburner|doubleclick|\/ads?\/)/i;

type Dict = Record<string, unknown>;

function asArray<T>(value: T | T[] | undefined | null): T[] {
	if (value === undefined || value === null) return [];
	return Array.isArray(value) ? value : [value];
}

function attrs(node: unknown): Dict {
	if (!node || typeof node !== "object") return {};
	const n = node as Dict;
	return (n["$"] as Dict | undefined) ?? n;
}

/** Resolves protocol-relative/relative URLs and upgrades http to https; returns undefined for non-http(s) values. */
export function normalizeImageUrl(
	raw: unknown,
	base?: string,
): string | undefined {
	if (typeof raw !== "string") return undefined;
	const trimmed = raw.trim().replace(/&amp;/g, "&");
	if (!trimmed || trimmed.startsWith("data:")) return undefined;
	try {
		const url = new URL(trimmed, base);
		if (url.protocol !== "http:" && url.protocol !== "https:") return undefined;
		if (url.protocol === "http:") url.protocol = "https:";
		return url.toString();
	} catch {
		return undefined;
	}
}

function looksLikeImage(
	url: string,
	type?: unknown,
	medium?: unknown,
): boolean {
	if (JUNK_IMAGE_RE.test(url)) return false;
	if (typeof type === "string" && type.startsWith("image/")) return true;
	if (medium === "image") return true;
	return IMAGE_EXT_RE.test(url);
}

/** First usable `<img src>` of an HTML fragment (RSS `content:encoded` / `description`). */
export function imageFromHtml(
	html: unknown,
	base?: string,
): string | undefined {
	if (typeof html !== "string" || !html.includes("<img")) return undefined;
	const re = /<img\b[^>]*?\bsrc=["']([^"']+)["'][^>]*>/gi;
	for (const match of html.matchAll(re)) {
		const tag = match[0];
		const width = Number(tag.match(/\bwidth=["']?(\d+)/i)?.[1] ?? 0);
		if (width > 0 && width < 120) continue;
		const url = normalizeImageUrl(match[1], base);
		if (url && !JUNK_IMAGE_RE.test(url)) return url;
	}
	return undefined;
}

/**
 * Best image of an rss-parser item. Order: media:content / media:thumbnail
 * (biggest first), enclosure, itunes:image, then the first `<img>` of the body.
 */
export function extractImageUrl(item: Dict, base?: string): string | undefined {
	const media = [
		...asArray(item["mediaContent"]),
		...asArray(item["mediaThumbnail"]),
		...asArray(item["mediaGroup"]),
	].flatMap((m) => {
		const a = attrs(m);
		const url = normalizeImageUrl(a["url"], base);
		if (!url || !looksLikeImage(url, a["type"], a["medium"])) return [];
		return [{ url, width: Number(a["width"] ?? 0) }];
	});
	media.sort((x, y) => y.width - x.width);
	if (media[0]) return media[0].url;

	const enclosure = attrs(item["enclosure"]);
	const enclosureUrl = normalizeImageUrl(enclosure["url"], base);
	if (enclosureUrl && looksLikeImage(enclosureUrl, enclosure["type"])) {
		return enclosureUrl;
	}

	const itunes = attrs((item["itunes"] as Dict | undefined)?.["image"]);
	const itunesUrl = normalizeImageUrl(itunes["href"] ?? itunes["url"], base);
	if (itunesUrl) return itunesUrl;

	return (
		imageFromHtml(item["content:encoded"], base) ??
		imageFromHtml(item["content"], base) ??
		imageFromHtml(item["summary"], base)
	);
}

const META_IMAGE_RES = [
	/<meta[^>]+(?:property|name)=["'](?:og:image(?::secure_url)?|twitter:image(?::src)?)["'][^>]*?content=["']([^"']+)["']/i,
	/<meta[^>]+content=["']([^"']+)["'][^>]*?(?:property|name)=["'](?:og:image(?::secure_url)?|twitter:image(?::src)?)["']/i,
];

/** Pulls og:image / twitter:image out of a page's HTML head. */
export function ogImageFromHtml(
	html: string,
	base: string,
): string | undefined {
	const head = html.slice(0, 200_000);
	for (const re of META_IMAGE_RES) {
		const found = head.match(re)?.[1];
		const url = normalizeImageUrl(found, base);
		if (url && !JUNK_IMAGE_RE.test(url)) return url;
	}
	return undefined;
}

/** Fetches the article page and returns its og:image. Best effort: never throws. */
export async function fetchOgImage(
	pageUrl: string,
	timeoutMs = 6000,
): Promise<string | undefined> {
	try {
		const resp = await fetch(pageUrl, {
			signal: AbortSignal.timeout(timeoutMs),
			headers: { "User-Agent": "Mozilla/5.0 (compatible; FastNews/1.0)" },
			redirect: "follow",
		});
		if (!resp.ok) return undefined;
		const type = resp.headers.get("content-type") ?? "";
		if (/^(image|video|audio)\/|pdf|zip/i.test(type)) return undefined;
		return ogImageFromHtml(await resp.text(), resp.url || pageUrl);
	} catch {
		return undefined;
	}
}
