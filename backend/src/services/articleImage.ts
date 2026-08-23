/**
 * Image discovery for ingested articles.
 *
 * RSS feeds expose the lead image in a dozen incompatible ways, and half of the
 * URLs that *look* like images are tracking pixels, logos or share buttons. The
 * strategy here is: collect every candidate with a provenance score, discard the
 * ones that are structurally not a lead image, then keep the best-scoring one.
 * Pure module — the network fallback (og:image) lives in `fetchOgImage`.
 */

const IMAGE_EXT_RE = /\.(jpe?g|png|webp|avif|gif)(?:[?#]|$)/i;
const BAD_EXT_RE = /\.(svg|ico|bmp|tiff?)(?:[?#]|$)/i;

/** URL fragments that mark decoration, tracking or UI chrome rather than content. */
const REJECT_URL_PATTERNS: RegExp[] = [
	/\/(logos?|icons?|sprites?|avatars?|placeholders?|blank|spacer|pixel|badge|button)[-_./]/i,
	/[-_/](logo|icon|sprite|avatar|placeholder|blank|spacer|pixel|1x1|transparent)\.(?:jpe?g|png|webp|gif)/i,
	/^https?:\/\/(?:\w+\.)?gravatar\.com\//i,
	/(?:^|\.)doubleclick\.net\//i,
	/\/~ff\//,
	/feedburner|feedsportal|feedblitz/i,
	/pixel\.(?:wp|quantserve)\.com/i,
	/\/(ads?|adserver|banner)s?\//i,
	/\/emoji\//i,
	/stats?\.(?:gif|png)/i,
];

export interface ImageCandidate {
	url: string;
	/** Provenance weight: how likely this slot holds the article's lead image. */
	score: number;
	width?: number;
	height?: number;
}

function toInt(value: unknown): number | undefined {
	const n =
		typeof value === "number"
			? value
			: typeof value === "string"
				? Number.parseInt(value, 10)
				: Number.NaN;
	return Number.isFinite(n) && n > 0 ? n : undefined;
}

/** Resolves protocol-relative and root-relative URLs against the article link. */
export function absolutizeUrl(url: string, base?: string): string | null {
	const raw = url.trim();
	if (!raw || raw.startsWith("data:")) return null;
	if (raw.startsWith("//")) return `https:${raw}`;
	if (/^https?:\/\//i.test(raw)) return raw;
	if (!base) return null;
	try {
		return new URL(raw, base).toString();
	} catch {
		return null;
	}
}

/** Structural rejection: wrong format, known chrome path, or a thumbnail-sized asset. */
export function isRejectedImage(candidate: ImageCandidate): boolean {
	const { url, width, height } = candidate;
	if (!/^https?:\/\//i.test(url)) return true;
	if (BAD_EXT_RE.test(url)) return true;
	if (REJECT_URL_PATTERNS.some((pattern) => pattern.test(url))) return true;
	if ((width && width < 200) || (height && height < 150)) return true;
	// Extreme aspect ratios are banners/separators, never lead images.
	if (width && height && (width / height > 5 || height / width > 5))
		return true;
	return false;
}

/**
 * Dimension-aware ranking. Provenance dominates; resolution and a plausible
 * landscape ratio break ties between slots of the same kind.
 */
export function rankCandidate(candidate: ImageCandidate): number {
	let score = candidate.score;
	const { width, height } = candidate;
	if (width && height) {
		const area = width * height;
		score += Math.min(30, Math.round(area / 40_000));
		const ratio = width / height;
		if (ratio >= 1.2 && ratio <= 2.4) score += 8;
	}
	// An explicit image extension is a stronger signal than a bare CDN path.
	if (IMAGE_EXT_RE.test(candidate.url)) score += 4;
	return score;
}

function pushMediaNode(
	out: ImageCandidate[],
	node: unknown,
	baseScore: number,
	base?: string,
): void {
	if (!node) return;
	if (Array.isArray(node)) {
		for (const entry of node) pushMediaNode(out, entry, baseScore, base);
		return;
	}
	if (typeof node === "string") {
		const url = absolutizeUrl(node, base);
		if (url) out.push({ url, score: baseScore });
		return;
	}
	if (typeof node !== "object") return;

	const record = node as Record<string, unknown>;
	// rss-parser exposes XML attributes under "$"; some feeds inline them.
	const attrs = (record["$"] as Record<string, unknown> | undefined) ?? record;
	const rawUrl = attrs["url"] ?? attrs["href"] ?? record["url"];
	const medium = String(attrs["medium"] ?? "").toLowerCase();
	const type = String(attrs["type"] ?? "").toLowerCase();
	if (type && !type.startsWith("image/")) return;
	if (medium && medium !== "image") return;

	if (typeof rawUrl === "string") {
		const url = absolutizeUrl(rawUrl, base);
		if (url) {
			out.push({
				url,
				score: baseScore,
				width: toInt(attrs["width"]),
				height: toInt(attrs["height"]),
			});
		}
	}
	// media:group wraps several media:content entries.
	if (record["media:content"]) {
		pushMediaNode(out, record["media:content"], baseScore, base);
	}
	if (record["content"]) {
		pushMediaNode(out, record["content"], baseScore, base);
	}
}

/** Pulls `<img>` tags out of an HTML blob, honouring srcset and data-src lazy loading. */
export function imagesFromHtml(
	html: string,
	base?: string,
	baseScore = 70,
): ImageCandidate[] {
	const out: ImageCandidate[] = [];
	const tagRe = /<img\b[^>]*>/gi;
	let match: RegExpExecArray | null = tagRe.exec(html);
	let index = 0;
	while (match) {
		const tag = match[0];
		const attr = (name: string): string | undefined =>
			tag.match(new RegExp(`${name}\\s*=\\s*["']([^"']+)["']`, "i"))?.[1];
		const srcset = attr("srcset") ?? attr("data-srcset");
		// Largest srcset entry wins — feeds list them ascending or descending.
		const fromSrcset = srcset
			?.split(",")
			.map((part) => part.trim().split(/\s+/))
			.filter((parts) => parts[0])
			.sort(
				(a, b) =>
					Number.parseInt(b[1] ?? "0", 10) - Number.parseInt(a[1] ?? "0", 10),
			)[0]?.[0];
		const raw =
			fromSrcset ?? attr("src") ?? attr("data-src") ?? attr("data-original");
		const url = raw ? absolutizeUrl(raw, base) : null;
		if (url) {
			out.push({
				url,
				// The first image in the body is usually the lead art.
				score: baseScore - Math.min(index, 3) * 5,
				width: toInt(attr("width")),
				height: toInt(attr("height")),
			});
			index++;
		}
		match = tagRe.exec(html);
	}
	return out;
}

/** Every image slot a feed item can carry, scored by how reliable that slot is. */
export function collectImageCandidates(
	item: Record<string, unknown>,
	base?: string,
): ImageCandidate[] {
	const out: ImageCandidate[] = [];

	pushMediaNode(out, item["mediaContent"], 100, base);
	pushMediaNode(out, item["media:content"], 100, base);
	pushMediaNode(out, item["mediaGroup"], 95, base);
	pushMediaNode(out, item["media:group"], 95, base);
	pushMediaNode(out, item["enclosure"], 90, base);
	pushMediaNode(out, item["mediaThumbnail"], 80, base);
	pushMediaNode(out, item["media:thumbnail"], 80, base);
	pushMediaNode(out, item["thumbnail"], 75, base);
	pushMediaNode(out, item["itunes:image"], 60, base);
	pushMediaNode(out, item["image"], 60, base);

	for (const [key, weight] of [
		["content:encoded", 72],
		["contentEncoded", 72],
		["content", 68],
		["description", 64],
		["summary", 60],
	] as const) {
		const value = item[key];
		if (typeof value === "string" && value.includes("<img"))
			out.push(...imagesFromHtml(value, base, weight));
	}

	return out;
}

/** Best usable image URL for a feed item, or undefined when none qualifies. */
export function extractImageUrl(
	item: Record<string, unknown>,
	base?: string,
): string | undefined {
	const link = base ?? (typeof item["link"] === "string" ? item["link"] : "");
	const seen = new Set<string>();
	const ranked = collectImageCandidates(item, link || undefined)
		.filter((candidate) => {
			if (seen.has(candidate.url)) return false;
			seen.add(candidate.url);
			return !isRejectedImage(candidate);
		})
		.sort((a, b) => rankCandidate(b) - rankCandidate(a));

	return ranked[0]?.url;
}

const META_IMAGE_RE =
	/<meta[^>]+(?:property|name)\s*=\s*["'](og:image(?::secure_url|:url)?|twitter:image(?::src)?)["'][^>]*>/gi;

/** Reads og:image / twitter:image out of a page's `<head>`. */
export function extractImageFromPage(
	html: string,
	base?: string,
): string | undefined {
	const head = html.slice(0, 200_000);
	const candidates: ImageCandidate[] = [];
	let match: RegExpExecArray | null = META_IMAGE_RE.exec(head);
	while (match) {
		const content = match[0].match(/content\s*=\s*["']([^"']+)["']/i)?.[1];
		const url = content ? absolutizeUrl(content, base) : null;
		if (url) {
			candidates.push({
				url,
				score: match[1].startsWith("og:") ? 95 : 85,
			});
		}
		match = META_IMAGE_RE.exec(head);
	}
	META_IMAGE_RE.lastIndex = 0;

	const usable = candidates
		.filter((candidate) => !isRejectedImage(candidate))
		.sort((a, b) => rankCandidate(b) - rankCandidate(a));
	return usable[0]?.url;
}

/**
 * Network fallback: fetches only the beginning of the page and reads its
 * social-preview meta tags. Returns undefined on any failure — callers treat a
 * missing image as normal, never as an error.
 */
export async function fetchOgImage(
	url: string,
	timeoutMs = 8_000,
): Promise<string | undefined> {
	if (!/^https?:\/\//i.test(url)) return undefined;
	try {
		const response = await fetch(url, {
			signal: AbortSignal.timeout(timeoutMs),
			headers: {
				"User-Agent": "FastNews/1.0 (+https://github.com/juninmd/fast-news)",
				Accept: "text/html,application/xhtml+xml",
			},
		});
		if (!response.ok) return undefined;
		const contentType = response.headers.get("content-type") ?? "";
		if (!contentType.includes("html")) return undefined;
		// `<head>` is all we need; abandon the body to keep this cheap.
		const html = (await response.text()).slice(0, 200_000);
		return extractImageFromPage(html, response.url || url);
	} catch {
		return undefined;
	}
}
