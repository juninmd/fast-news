import { decodeEntities } from "./htmlText.js";

const IMAGE_EXT_RE = /\.(jpe?g|png|webp|gif|avif)(\?.*)?$/i;
const VIDEO_EXT_RE = /\.(mp4|webm|m4v|mov|ogv|m3u8)(\?.*)?$/i;
// Tracking pixels, icons and share buttons that feeds embed inside the HTML body.
const JUNK_IMAGE_RE =
	/(pixel|spacer|blank|1x1|logo|favicon|sprite|avatar|gravatar|emoji|badge|button|feedburner|doubleclick|\/ads?\/)/i;
const JUNK_CLASS_RE = /\b(wp-smiley|emoji|avatar|gravatar|icon)\b/i;

const YOUTUBE_RE =
	/(?:youtube(?:-nocookie)?\.com\/(?:embed\/|v\/|shorts\/|watch\?(?:[^#]*&)?v=)|youtu\.be\/)([\w-]{11})(?![\w-])/i;
const VIMEO_RE = /(?:player\.)?vimeo\.com\/(?:video\/)?(\d{6,})(?!\d)/i;

const MAX_IMAGES = 6;
const MAX_VIDEOS = 3;

export type MediaType = "image" | "video";
export type VideoProvider = "youtube" | "vimeo" | "file";

/** One image or video attached to an article, as stored in `news_articles.media`. */
export interface ArticleMedia {
	type: MediaType;
	/** Image file, or the canonical video URL (watch page for YouTube/Vimeo, file URL otherwise). */
	url: string;
	provider?: VideoProvider;
	/** Iframe-ready URL for YouTube/Vimeo. */
	embedUrl?: string;
	/** Poster of a video. */
	thumbnail?: string;
	mimeType?: string;
	width?: number;
	height?: number;
	/** Seconds. */
	duration?: number;
	/** Image alt text / Media RSS description. */
	alt?: string;
	/** Photographer or agency (`media:credit`). */
	credit?: string;
}

export interface ExtractedMedia {
	media: ArticleMedia[];
	/** Cover: first image, else the poster of the first video. */
	imageUrl?: string;
	/** Canonical URL of the best video (embeddable first, HLS last). */
	videoUrl?: string;
}

type Dict = Record<string, unknown>;

function asArray<T>(value: T | T[] | undefined | null): T[] {
	if (value === undefined || value === null) return [];
	return Array.isArray(value) ? value : [value];
}

/** rss-parser nodes are `{ $: attrs }`, plain attr objects, or bare strings (`<media:thumbnail>url</media:thumbnail>`). */
function attrs(node: unknown): Dict {
	if (typeof node === "string") return node.trim() ? { url: node.trim() } : {};
	if (!node || typeof node !== "object") return {};
	const n = node as Dict;
	return (n["$"] as Dict | undefined) ?? n;
}

/** Short single-line text from an attribute or Media RSS node (`"x"` or `{ _: "x" }`); junk like "null" is dropped. */
function shortText(value: unknown, max = 200): string | undefined {
	const raw = Array.isArray(value) ? value[0] : value;
	const text =
		typeof raw === "string"
			? raw
			: raw && typeof raw === "object"
				? String((raw as Dict)["_"] ?? "")
				: "";
	const clean = decodeEntities(text).replace(/\s+/g, " ").trim();
	return clean && !/^(null|undefined)$/i.test(clean)
		? clean.slice(0, max)
		: undefined;
}

function num(value: unknown): number | undefined {
	const n = Number(value);
	return Number.isFinite(n) && n > 0 ? n : undefined;
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
	if (
		medium === "video" ||
		(typeof type === "string" && /^(video|audio)\//.test(type))
	)
		return false;
	return IMAGE_EXT_RE.test(url);
}

// ── HTML attribute scanning ────────────────────────────────────────────────

function parseAttrs(tag: string): Record<string, string> {
	const out: Record<string, string> = {};
	const re = /([\w:.-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+)))?/g;
	for (const m of tag.replace(/^<\w+/, "").matchAll(re)) {
		const name = (m[1] ?? "").toLowerCase();
		if (name && !(name in out)) out[name] = m[2] ?? m[3] ?? m[4] ?? "";
	}
	return out;
}

/** Picks the smallest srcset candidate that is at least 800px wide, else the widest. */
function pickSrcset(srcset: string): string | undefined {
	const candidates = srcset
		.split(/,\s+(?=\S)/)
		.map((part) => {
			const [url, descriptor] = part.trim().split(/\s+/);
			const width = descriptor?.endsWith("w") ? Number.parseInt(descriptor) : 0;
			return { url: url ?? "", width: Number.isFinite(width) ? width : 0 };
		})
		.filter((c) => c.url);
	if (!candidates.length) return undefined;
	const sorted = [...candidates].sort((a, b) => a.width - b.width);
	return (sorted.find((c) => c.width >= 800) ?? sorted[sorted.length - 1])?.url;
}

function mediaKey(url: string): string {
	try {
		const u = new URL(url);
		// `foo-1024x683.jpg` and `foo.jpg?w=800` are the same picture.
		return `${u.host}${u.pathname.replace(/-\d{2,4}x\d{2,4}(?=\.\w+$)/, "")}`;
	} catch {
		return url;
	}
}

interface HtmlMedia {
	images: ArticleMedia[];
	videos: ArticleMedia[];
}

/** Every usable `<img>`, `<video>`/`<source>` and YouTube/Vimeo `<iframe>` of an HTML fragment. */
export function mediaFromHtml(html: unknown, base?: string): HtmlMedia {
	const out: HtmlMedia = { images: [], videos: [] };
	if (typeof html !== "string" || !/<(img|video|iframe|embed)\b/i.test(html))
		return out;

	for (const match of html.matchAll(/<img\b[^>]*>/gi)) {
		const a = parseAttrs(match[0]);
		const width = Number(a["width"] ?? 0);
		const height = Number(a["height"] ?? 0);
		if ((width > 0 && width < 120) || (height > 0 && height < 120)) continue;
		if (JUNK_CLASS_RE.test(a["class"] ?? "")) continue;
		// Lazy-loaded bodies keep a placeholder in `src` and the real URL in data-*.
		const raw =
			[a["data-src"], a["data-lazy-src"], a["data-original"], a["src"]].find(
				(v) => v && !v.startsWith("data:"),
			) ??
			pickSrcset(a["srcset"] ?? a["data-srcset"] ?? "") ??
			"";
		const url = normalizeImageUrl(raw, base);
		if (!url || JUNK_IMAGE_RE.test(url)) continue;
		const alt = shortText(a["alt"]);
		out.images.push({
			type: "image",
			url,
			...(alt ? { alt } : {}),
			...(num(width) ? { width: num(width) } : {}),
			...(num(height) ? { height: num(height) } : {}),
		});
	}

	for (const match of html.matchAll(/<video\b([^>]*)>([\s\S]*?)<\/video>/gi)) {
		const a = parseAttrs(`<video ${match[1] ?? ""}`);
		const poster = normalizeImageUrl(a["poster"], base);
		const sources = [
			{ src: a["src"], type: a["type"] },
			...[...(match[2] ?? "").matchAll(/<source\b[^>]*>/gi)].map((s) => {
				const sa = parseAttrs(s[0]);
				return { src: sa["src"], type: sa["type"] };
			}),
		];
		for (const s of sources) {
			const url = normalizeImageUrl(s.src, base);
			const video =
				url && parseVideoUrl(url, { type: s.type, assumeVideo: true });
			if (!video) continue;
			out.videos.push({
				...video,
				...(poster ? { thumbnail: poster } : {}),
				...(num(a["width"]) ? { width: num(a["width"]) } : {}),
				...(num(a["height"]) ? { height: num(a["height"]) } : {}),
			});
			break;
		}
	}

	for (const match of html.matchAll(/<(?:iframe|embed)\b[^>]*>/gi)) {
		const a = parseAttrs(match[0]);
		const url = normalizeImageUrl(a["src"] ?? a["data-src"], base);
		const video = url && parseVideoUrl(url);
		// Generic iframes (ads, widgets, web stories) are not playable media.
		if (video && video.provider !== "file") out.videos.push(video);
	}

	return out;
}

// ── Video URLs ─────────────────────────────────────────────────────────────

function mimeFromUrl(url: string): string | undefined {
	const ext = url.match(VIDEO_EXT_RE)?.[1]?.toLowerCase();
	if (!ext) return undefined;
	return (
		{
			mp4: "video/mp4",
			m4v: "video/mp4",
			webm: "video/webm",
			ogv: "video/ogg",
			mov: "video/quicktime",
			m3u8: "application/x-mpegURL",
		}[ext] ?? undefined
	);
}

/**
 * Classifies a URL as a playable video: YouTube/Vimeo (embeddable) or a direct
 * file. Returns undefined for anything else, so pages and widgets are never
 * mistaken for media. `assumeVideo` is for `<video src>` / `medium="video"`
 * nodes whose URL has no telling extension.
 */
export function parseVideoUrl(
	url: string,
	hint: { type?: unknown; medium?: unknown; assumeVideo?: boolean } = {},
): ArticleMedia | undefined {
	const yt = url.match(YOUTUBE_RE)?.[1];
	if (yt) {
		return {
			type: "video",
			provider: "youtube",
			url: `https://www.youtube.com/watch?v=${yt}`,
			embedUrl: `https://www.youtube-nocookie.com/embed/${yt}`,
			thumbnail: `https://i.ytimg.com/vi/${yt}/hqdefault.jpg`,
		};
	}
	const vimeo = url.match(VIMEO_RE)?.[1];
	if (vimeo) {
		return {
			type: "video",
			provider: "vimeo",
			url: `https://vimeo.com/${vimeo}`,
			embedUrl: `https://player.vimeo.com/video/${vimeo}`,
		};
	}
	const type = typeof hint.type === "string" ? hint.type.toLowerCase() : "";
	const hls = type === "application/x-mpegurl";
	const declared = hint.medium === "video" || hint.assumeVideo === true;
	// A declared HTML/flash player page is not a file the <video> element can play.
	const isFile =
		VIDEO_EXT_RE.test(url) ||
		type.startsWith("video/") ||
		hls ||
		(declared && !/\.(html?|php|aspx?|swf)(\?|$)/i.test(url));
	if (!isFile) return undefined;
	const mime = type.startsWith("video/")
		? type
		: hls
			? "application/x-mpegURL"
			: mimeFromUrl(url);
	return {
		type: "video",
		provider: "file",
		url,
		...(mime ? { mimeType: mime } : {}),
	};
}

/** Embeddable first, plain files next, HLS (no native support outside Safari) last. */
function videoRank(video: ArticleMedia): number {
	if (video.embedUrl) return 0;
	return video.mimeType === "application/x-mpegURL" ? 2 : 1;
}

// ── RSS / Atom item ────────────────────────────────────────────────────────

interface Candidate<T> {
	value: T;
	width: number;
}

/**
 * Images and videos of an rss-parser item, in priority order: Media RSS
 * (`media:content` / `media:thumbnail` / `media:group`, widest first), enclosure,
 * itunes:image, `yt:videoId`, then whatever the HTML body embeds.
 */
export function extractMedia(item: Dict, base?: string): ExtractedMedia {
	const mediaImages: Candidate<ArticleMedia>[] = [];
	const videos: ArticleMedia[] = [];

	const group = (asArray(item["mediaGroup"])[0] ?? {}) as Dict;
	const contents = [
		...asArray(item["mediaContent"]),
		...asArray(group["media:content"]),
	];
	const groupThumbs = [
		...asArray(item["mediaThumbnail"]),
		...asArray(group["media:thumbnail"]),
	];

	const thumbUrl = (
		nodes: unknown[],
	): { url: string; width: number } | undefined => {
		for (const node of nodes) {
			const a = attrs(node);
			const url = normalizeImageUrl(a["url"], base);
			if (url && !JUNK_IMAGE_RE.test(url))
				return { url, width: Number(a["width"] ?? 0) };
		}
		return undefined;
	};

	for (const node of contents) {
		const a = attrs(node);
		const nested = (
			node && typeof node === "object" ? (node as Dict) : {}
		) as Dict;
		const player = attrs(asArray(nested["media:player"])[0])["url"];
		const url = normalizeImageUrl(a["url"] ?? player, base);
		if (!url) continue;
		const video = parseVideoUrl(url, { type: a["type"], medium: a["medium"] });
		if (video) {
			const poster = thumbUrl([
				...asArray(nested["media:thumbnail"]),
				...groupThumbs,
			]);
			videos.push({
				...video,
				...(!video.thumbnail && poster ? { thumbnail: poster.url } : {}),
				...(num(a["width"]) ? { width: num(a["width"]) } : {}),
				...(num(a["height"]) ? { height: num(a["height"]) } : {}),
				...(num(a["duration"]) ? { duration: num(a["duration"]) } : {}),
			});
		} else if (looksLikeImage(url, a["type"], a["medium"])) {
			const credit = shortText(nested["media:credit"], 120);
			const alt = shortText(nested["media:description"]);
			mediaImages.push({
				value: {
					type: "image",
					url,
					...(alt ? { alt } : {}),
					...(credit ? { credit } : {}),
					...(num(a["height"]) ? { height: num(a["height"]) } : {}),
				},
				width: Number(a["width"] ?? 0),
			});
		}
	}
	for (const node of groupThumbs) {
		const a = attrs(node);
		const url = normalizeImageUrl(a["url"], base);
		if (url && !JUNK_IMAGE_RE.test(url))
			mediaImages.push({
				value: { type: "image", url },
				width: Number(a["width"] ?? 0),
			});
	}
	mediaImages.sort((x, y) => y.width - x.width);

	const images: ArticleMedia[] = mediaImages.map((c) => ({
		...c.value,
		...(c.width > 0 ? { width: c.width } : {}),
	}));

	const atomEnclosures = asArray(item["linkNodes"])
		.map((n) => attrs(n))
		.filter((a) => a["rel"] === "enclosure")
		.map((a) => ({ url: a["href"], type: a["type"] }));
	const enclosures = [...asArray(item["enclosure"]), ...atomEnclosures];
	for (const node of enclosures) {
		const e = attrs(node);
		const url = normalizeImageUrl(e["url"], base);
		if (!url) continue;
		const video = parseVideoUrl(url, { type: e["type"] });
		if (video) videos.push(video);
		else if (looksLikeImage(url, e["type"]))
			images.push({ type: "image", url });
	}

	const itunes = attrs((item["itunes"] as Dict | undefined)?.["image"]);
	const itunesUrl = normalizeImageUrl(itunes["href"] ?? itunes["url"], base);
	if (itunesUrl) images.push({ type: "image", url: itunesUrl });

	const ytId = item["ytVideoId"] ?? item["yt:videoId"];
	if (typeof ytId === "string" && /^[\w-]{11}$/.test(ytId.trim())) {
		const video = parseVideoUrl(
			`https://www.youtube.com/watch?v=${ytId.trim()}`,
		);
		if (video) videos.push(video);
	}

	for (const field of ["content:encoded", "content", "summary"]) {
		const html = mediaFromHtml(item[field], base);
		images.push(...html.images);
		videos.push(...html.videos);
	}

	const seen = new Set<string>();
	const uniqueImages = images.filter((m) => {
		const key = mediaKey(m.url);
		if (seen.has(key)) return false;
		seen.add(key);
		return true;
	});
	const seenVideo = new Set<string>();
	const uniqueVideos = videos
		.filter((v) => {
			if (seenVideo.has(v.url)) return false;
			seenVideo.add(v.url);
			return true;
		})
		.sort((a, b) => videoRank(a) - videoRank(b));

	const keptImages = uniqueImages.slice(0, MAX_IMAGES);
	const keptVideos = uniqueVideos.slice(0, MAX_VIDEOS);
	const imageUrl =
		keptImages[0]?.url ?? keptVideos.find((v) => v.thumbnail)?.thumbnail;
	return {
		media: [...keptImages, ...keptVideos],
		...(imageUrl ? { imageUrl } : {}),
		...(keptVideos[0] ? { videoUrl: keptVideos[0].url } : {}),
	};
}

/** First usable `<img src>` of an HTML fragment (RSS `content:encoded` / `description`). */
export function imageFromHtml(
	html: unknown,
	base?: string,
): string | undefined {
	return mediaFromHtml(html, base).images[0]?.url;
}

/** Best image of an rss-parser item; see {@link extractMedia} for the order. */
export function extractImageUrl(item: Dict, base?: string): string | undefined {
	return extractMedia(item, base).media.find((m) => m.type === "image")?.url;
}

// ── Article page (og:*) ────────────────────────────────────────────────────

function metaTags(html: string): Map<string, string> {
	const meta = new Map<string, string>();
	for (const tag of html.slice(0, 200_000).matchAll(/<meta\b[^>]*>/gi)) {
		const a = parseAttrs(tag[0]);
		const key = (a["property"] ?? a["name"] ?? "").toLowerCase();
		const content = a["content"];
		if (key && content && !meta.has(key)) meta.set(key, content);
	}
	return meta;
}

const OG_IMAGE_KEYS = [
	"og:image:secure_url",
	"og:image",
	"twitter:image",
	"twitter:image:src",
];
const OG_VIDEO_KEYS = [
	"og:video:secure_url",
	"og:video:url",
	"og:video",
	"twitter:player:stream",
];

/** Pulls og:image / twitter:image out of a page's HTML head. */
export function ogImageFromHtml(
	html: string,
	base: string,
): string | undefined {
	const meta = metaTags(html);
	for (const key of OG_IMAGE_KEYS) {
		const url = normalizeImageUrl(meta.get(key), base);
		if (url && !JUNK_IMAGE_RE.test(url)) return url;
	}
	return undefined;
}

/** og:video / twitter:player:stream when it is a YouTube/Vimeo embed or a playable file. */
export function ogVideoFromHtml(
	html: string,
	base: string,
): ArticleMedia | undefined {
	const meta = metaTags(html);
	const type =
		meta.get("og:video:type") ?? meta.get("twitter:player:stream:content_type");
	for (const key of OG_VIDEO_KEYS) {
		const url = normalizeImageUrl(meta.get(key), base);
		const video = url && parseVideoUrl(url, { type });
		if (video) return video;
	}
	return undefined;
}

/** Editorial metadata of an article page, used to fill what the feed left empty. */
export interface PageMeta {
	description?: string;
	author?: string;
	tags?: string[];
}

export interface PageMedia {
	imageUrl?: string;
	video?: ArticleMedia;
	meta?: PageMeta;
}

/** `og:description` / `description`, `author` and `article:tag` / `keywords` of a page head. */
export function pageMetaFromHtml(html: string): PageMeta {
	const meta = metaTags(html);
	const description = shortText(
		meta.get("og:description") ??
			meta.get("description") ??
			meta.get("twitter:description"),
		600,
	);
	const rawAuthor = meta.get("author") ?? meta.get("article:author");
	// `article:author` is often a profile URL, not a name.
	const author =
		rawAuthor && !/^https?:\/\//i.test(rawAuthor)
			? shortText(rawAuthor, 120)
			: undefined;
	const articleTags = [...html.slice(0, 200_000).matchAll(/<meta\b[^>]*>/gi)]
		.map((tag) => parseAttrs(tag[0]))
		.filter((a) => a["property"]?.toLowerCase() === "article:tag")
		.map((a) => a["content"] ?? "");
	const tags = [...articleTags, ...(meta.get("keywords") ?? "").split(",")]
		.map((t) => shortText(t, 40))
		.filter((t): t is string => !!t);
	return {
		...(description ? { description } : {}),
		...(author ? { author } : {}),
		...(tags.length ? { tags: [...new Set(tags)].slice(0, 8) } : {}),
	};
}

/** Fetches the article page and returns its og:image / og:video / editorial meta. Best effort: never throws. */
export async function fetchPageMedia(
	pageUrl: string,
	timeoutMs = 6000,
): Promise<PageMedia> {
	try {
		const resp = await fetch(pageUrl, {
			signal: AbortSignal.timeout(timeoutMs),
			headers: { "User-Agent": "Mozilla/5.0 (compatible; FastNews/1.0)" },
			redirect: "follow",
		});
		if (!resp.ok) return {};
		const type = resp.headers.get("content-type") ?? "";
		if (/^(image|video|audio)\/|pdf|zip/i.test(type)) return {};
		const html = await resp.text();
		const base = resp.url || pageUrl;
		const imageUrl = ogImageFromHtml(html, base);
		const video = ogVideoFromHtml(html, base);
		const meta = pageMetaFromHtml(html);
		return {
			...(imageUrl ? { imageUrl } : {}),
			...(video ? { video } : {}),
			...(Object.keys(meta).length ? { meta } : {}),
		};
	} catch {
		return {};
	}
}

/** Fetches the article page and returns its og:image. Best effort: never throws. */
export async function fetchOgImage(
	pageUrl: string,
	timeoutMs = 6000,
): Promise<string | undefined> {
	return (await fetchPageMedia(pageUrl, timeoutMs)).imageUrl;
}
