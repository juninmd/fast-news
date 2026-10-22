export interface FeedItem {
	id: string;
	title: string;
	url: string;
	source: string;
	category?: string | null;
	summary?: string | null;
	publishedAt: Date | string | null;
	imageUrl?: string | null;
}

export interface FeedMeta {
	title: string;
	description: string;
	/** Public URL of the feed itself (rel=self). */
	selfUrl: string;
	/** Public URL of the site the feed describes. */
	homeUrl: string;
	/** WebSub hub; advertised so subscribers get pushed instead of polling. */
	hubUrl?: string;
	language?: string;
}

function esc(s: string): string {
	return s
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;");
}

// XML 1.0 forbids most control characters; feed text sometimes carries them.
function clean(s: string): string {
	// biome-ignore lint/suspicious/noControlCharactersInRegex: stripping them is the point
	return s.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "");
}

function toDate(v: Date | string | null): Date | null {
	if (!v) return null;
	const d = v instanceof Date ? v : new Date(v);
	return Number.isNaN(d.getTime()) ? null : d;
}

export function buildRss(
	items: FeedItem[],
	meta: FeedMeta,
	now: Date = new Date(),
): string {
	const last = items.map((i) => toDate(i.publishedAt)).find(Boolean) ?? now;
	const entries = items
		.map((i) => {
			const date = toDate(i.publishedAt);
			return `    <item>
      <title>${esc(clean(i.title))}</title>
      <link>${esc(i.url)}</link>
      <guid isPermaLink="false">${esc(i.id)}</guid>
${date ? `      <pubDate>${date.toUTCString()}</pubDate>\n` : ""}      <source url="${esc(i.url)}">${esc(clean(i.source))}</source>
${i.category ? `      <category>${esc(clean(i.category))}</category>\n` : ""}${i.summary ? `      <description>${esc(clean(i.summary))}</description>\n` : ""}${i.imageUrl ? `      <enclosure url="${esc(i.imageUrl)}" type="image/jpeg" length="0"/>\n` : ""}    </item>`;
		})
		.join("\n");
	return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${esc(meta.title)}</title>
    <link>${esc(meta.homeUrl)}</link>
    <description>${esc(meta.description)}</description>
    <language>${esc(meta.language ?? "pt-BR")}</language>
    <lastBuildDate>${(last as Date).toUTCString()}</lastBuildDate>
    <atom:link href="${esc(meta.selfUrl)}" rel="self" type="application/rss+xml"/>
${meta.hubUrl ? `    <atom:link href="${esc(meta.hubUrl)}" rel="hub"/>\n` : ""}${entries}
  </channel>
</rss>
`;
}

/** JSON Feed 1.1 (jsonfeed.org). */
export function buildJsonFeed(items: FeedItem[], meta: FeedMeta) {
	return {
		version: "https://jsonfeed.org/version/1.1",
		title: meta.title,
		description: meta.description,
		home_page_url: meta.homeUrl,
		feed_url: meta.selfUrl,
		language: meta.language ?? "pt-BR",
		...(meta.hubUrl ? { hubs: [{ type: "WebSub", url: meta.hubUrl }] } : {}),
		items: items.map((i) => ({
			id: i.id,
			url: i.url,
			title: i.title,
			...(i.summary ? { content_text: i.summary } : {}),
			...(i.imageUrl ? { image: i.imageUrl } : {}),
			...(toDate(i.publishedAt)
				? { date_published: (toDate(i.publishedAt) as Date).toISOString() }
				: {}),
			authors: [{ name: i.source }],
			...(i.category ? { tags: [i.category] } : {}),
		})),
	};
}
