import { describe, expect, it } from "vitest";
import {
	CONTENT_MAX_CHARS,
	cleanAuthor,
	cleanTags,
	cleanTitle,
	normalizeFeedItem,
	normalizeFeedItems,
	normalizeLanguage,
	parseFeedDate,
	resolvePublishedAt,
	withoutTitleEcho,
} from "./feedItem.js";
import { type FeedItemData, parseFeed } from "./feedParser.js";

const NOW = new Date("2026-10-24T12:00:00Z");
const source = { url: "https://site.example/feed", category: "Tecnologia" };

const rss = (item: string, extra = "") =>
	`<rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:media="http://search.yahoo.com/mrss/" xmlns:dc="http://purl.org/dc/elements/1.1/"><channel><title>Site</title>${extra}${item}</channel></rss>`;

async function first(xml: string, src = source) {
	const feed = await parseFeed(xml);
	return normalizeFeedItem(feed.items[0] as FeedItemData, src, feed, NOW);
}

describe("parseFeedDate", () => {
	it("parses RFC 822, ISO and zone-less datetimes (as UTC)", () => {
		expect(
			parseFeedDate("Sat, 24 Oct 2026 10:00:00 +0000")?.toISOString(),
		).toBe("2026-10-24T10:00:00.000Z");
		expect(parseFeedDate("2026-10-24 09:00:00")?.toISOString()).toBe(
			"2026-10-24T09:00:00.000Z",
		);
	});

	it("parses Portuguese/Spanish weekday and month names (UOL, B9)", () => {
		expect(
			parseFeedDate("Sex, 23 Out 2026 17:12:11 -0300")?.toISOString(),
		).toBe("2026-10-23T20:12:11.000Z");
		expect(
			parseFeedDate("ter, 06 out 2026 17:36:00 -0300")?.toISOString(),
		).toBe("2026-10-06T20:36:00.000Z");
		expect(
			parseFeedDate("Sáb, 24 Dic 2026 05:30:00 -0300")?.getUTCMonth(),
		).toBe(11);
	});

	it("returns null for garbage", () => {
		expect(parseFeedDate("ontem")).toBeNull();
		expect(parseFeedDate(undefined)).toBeNull();
	});
});

describe("resolvePublishedAt", () => {
	it("falls back to dc:date/updated and clamps future or missing dates to now", () => {
		expect(
			resolvePublishedAt(
				{ "dc:date": "2026-10-20T00:00:00Z" },
				NOW,
			).toISOString(),
		).toBe("2026-10-20T00:00:00.000Z");
		expect(resolvePublishedAt({ pubDate: "2027-01-01T00:00:00Z" }, NOW)).toBe(
			NOW,
		);
		expect(resolvePublishedAt({}, NOW)).toBe(NOW);
		expect(
			resolvePublishedAt(
				{ pubDate: "lixo", updated: "2026-10-01T00:00:00Z" },
				NOW,
			).toISOString(),
		).toBe("2026-10-01T00:00:00.000Z");
	});
});

describe("normalizeFeedItem", () => {
	it("cleans title, content, source and date", async () => {
		const a = await first(
			rss(`<item><title> It&amp;#039;s  &lt;b&gt;big&lt;/b&gt;
			news </title><link>/post/1</link><pubDate>Sat, 24 Oct 2026 10:00:00 +0000</pubDate>
			<description><![CDATA[<p>Texto&nbsp;do <a href="x">resumo</a>.</p><p>The post It's big appeared first on Site.</p>]]></description></item>`),
		);
		expect(a.title).toBe("It's big news");
		expect(a.url).toBe("https://site.example/post/1");
		expect(a.content).toBe("Texto do resumo.");
		expect(a.source).toBe("Site");
		expect(a.publishedAt?.toISOString()).toBe("2026-10-24T10:00:00.000Z");
		expect(a.category).toBe("Tecnologia");
	});

	it("uses the full body when the description is just a few words", async () => {
		const full = "Corpo completo da matéria. ".repeat(30);
		const a = await first(
			rss(
				`<item><title>T</title><link>https://x.com/1</link><description>Curto</description><content:encoded><![CDATA[<p>${full}</p>]]></content:encoded></item>`,
			),
		);
		expect(a.content.startsWith("Corpo completo")).toBe(true);
		expect(a.content.length).toBeLessThanOrEqual(CONTENT_MAX_CHARS);
	});

	it("drops comment-link teasers (HN, lobste.rs)", async () => {
		const a = await first(
			rss(
				`<item><title>T</title><link>https://x.com/1</link><description><![CDATA[<a href="https://news.ycombinator.com/item?id=1">Comments</a>]]></description></item>`,
			),
		);
		expect(a.content).toBe("");
	});

	it("strips the arXiv announce prefix and Reddit footer", async () => {
		const arxiv = await first(
			rss(
				`<item><title>P</title><link>https://arxiv.org/abs/1</link><description>arXiv:2610.30154v1 Announce Type: new \nAbstract: We study recurrence.</description></item>`,
			),
			{ ...source, url: "https://rss.arxiv.org/rss/cs.AI" },
		);
		expect(arxiv.content).toBe("We study recurrence.");

		const reddit = await first(
			rss(
				`<item><title>R</title><link>https://reddit.com/r/x/1</link><description><![CDATA[<div class="md"><p>Corpo do post</p></div> submitted by <a href="/u/bob"> /u/bob </a> <span><a href="x">[link]</a></span> <span><a href="y">[comments]</a></span>]]></description></item>`,
			),
			{ ...source, url: "https://www.reddit.com/r/x/.rss" },
		);
		expect(reddit.content).toBe("Corpo do post");
	});

	it("builds guids that survive missing guid/link", async () => {
		const a = await first(rss("<item><title>Sem link</title></item>"));
		const b = await first(rss("<item><title>Sem link</title></item>"));
		expect(a.guid).toMatch(/^[0-9a-f]{40}$/);
		expect(a.guid).toBe(b.guid);
		expect(a.url).toBe("");
	});

	it("ignores a homepage guid shared by every item (CNN Brasil)", async () => {
		const feed = await parseFeed(
			rss(
				`<item><title>A</title><link>https://site.example/a</link><guid isPermaLink="false">https://site.example///</guid></item>
				 <item><title>B</title><link>https://site.example/b</link><guid isPermaLink="false">https://site.example///</guid></item>`,
			),
		);
		const articles = normalizeFeedItems(feed.items, source, feed, NOW);
		expect(articles.map((x) => x.guid)).toEqual([
			"https://site.example/a",
			"https://site.example/b",
		]);
	});

	it("drops repeated items inside one feed", async () => {
		const item = `<item><title>A</title><link>https://site.example/a</link></item>`;
		const feed = await parseFeed(rss(item + item));
		expect(normalizeFeedItems(feed.items, source, feed, NOW)).toHaveLength(1);
	});

	it("imports the video, poster and description of a YouTube Atom entry", async () => {
		const feed = await parseFeed(
			`<feed xmlns="http://www.w3.org/2005/Atom" xmlns:yt="http://www.youtube.com/xml/schemas/2015" xmlns:media="http://search.yahoo.com/mrss/">
			<title>Two Minute Papers</title>
			<entry><id>yt:video:LWxX6vvHfrc</id><yt:videoId>LWxX6vvHfrc</yt:videoId><title>Gemini</title>
			<link rel="alternate" href="https://www.youtube.com/watch?v=LWxX6vvHfrc"/>
			<published>2026-10-19T08:49:21+00:00</published>
			<media:group><media:title>Gemini</media:title>
			<media:content url="https://www.youtube.com/v/LWxX6vvHfrc?version=3" type="application/x-shockwave-flash"/>
			<media:thumbnail url="https://i1.ytimg.com/vi/LWxX6vvHfrc/hqdefault.jpg" width="480" height="360"/>
			<media:description>Resumo do vídeo</media:description></media:group></entry></feed>`,
		);
		const a = normalizeFeedItem(
			feed.items[0] as FeedItemData,
			{
				...source,
				url: "https://www.youtube.com/feeds/videos.xml?channel_id=x",
			},
			feed,
			NOW,
		);
		expect(a.videoUrl).toBe("https://www.youtube.com/watch?v=LWxX6vvHfrc");
		expect(a.imageUrl).toBe(
			"https://i1.ytimg.com/vi/LWxX6vvHfrc/hqdefault.jpg",
		);
		expect(a.content).toBe("Resumo do vídeo");
		expect(a.media?.map((m) => m.type)).toEqual(["image", "video"]);
	});
});

describe("cleanAuthor", () => {
	it("handles RSS email form, lobste.rs, Reddit and bare addresses", () => {
		expect(cleanAuthor("joe@site.com (Joe Doe)")).toBe("Joe Doe");
		expect(cleanAuthor("joe@site.com")).toBeUndefined();
		expect(cleanAuthor("blog.luitjes.it by lucasluitjes")).toBe("lucasluitjes");
		expect(cleanAuthor("/u/brainExploded99")).toBe("brainExploded99");
		expect(cleanAuthor({ name: " Ana  Souza " })).toBe("Ana Souza");
		expect(cleanAuthor(undefined)).toBeUndefined();
	});

	it("repairs arXiv LaTeX accents and shortens long author lists", () => {
		expect(cleanAuthor("Lu\\'is Seabra, Sebasti\\'an Vera")).toBe(
			"Luís Seabra, Sebastián Vera",
		);
		const many = Array.from({ length: 30 }, (_, i) => `Autor Numero${i}`).join(
			", ",
		);
		expect(cleanAuthor(many)).toBe(
			"Autor Numero0, Autor Numero1, Autor Numero2 et al.",
		);
	});
});

describe("cleanTags / normalizeLanguage", () => {
	it("merges RSS categories and Atom terms without duplicates", () => {
		expect(
			cleanTags({
				categories: ["php", "Security", "php", "x".repeat(60)],
				categoryNodes: [
					{ $: { term: "LocalLLaMA", label: "r/LocalLLaMA" } },
					{ $: { term: "security" } },
				],
			} as unknown as FeedItemData),
		).toEqual(["php", "Security", "r/LocalLLaMA"]);
	});

	it("reduces locale codes to the language", () => {
		expect(normalizeLanguage("pt-BR")).toBe("pt");
		expect(normalizeLanguage("en_US")).toBe("en");
		expect(normalizeLanguage("")).toBeUndefined();
		expect(normalizeLanguage(42)).toBeUndefined();
	});
});

describe("normalizeFeedItem details", () => {
	it("fills author, tags, discussion link, language and word count", async () => {
		const feed = await parseFeed(
			rss(
				`<item><title>T</title><link>https://x.com/1</link><dc:creator>Ana</dc:creator>
				<category>php</category><category>security</category>
				<comments>https://news.ycombinator.com/item?id=1</comments>
				<content:encoded><![CDATA[<p>um dois três quatro cinco</p>]]></content:encoded></item>`,
				"<language>pt-BR</language>",
			),
		);
		const a = normalizeFeedItem(
			feed.items[0] as FeedItemData,
			source,
			feed,
			NOW,
		);
		expect(a).toMatchObject({
			author: "Ana",
			tags: ["php", "security"],
			commentsUrl: "https://news.ycombinator.com/item?id=1",
			language: "pt",
			wordCount: 5,
		});
	});

	it("reads Atom categories and authors (Reddit)", async () => {
		const feed = await parseFeed(
			`<feed xmlns="http://www.w3.org/2005/Atom"><title>r/x</title><entry><title>P</title>
			<author><name>/u/bob</name></author><category term="LocalLLaMA" label="r/LocalLLaMA"/>
			<link href="https://www.reddit.com/r/x/comments/1/p/"/><id>t3_1</id></entry></feed>`,
		);
		const a = normalizeFeedItem(
			feed.items[0] as FeedItemData,
			source,
			feed,
			NOW,
		);
		expect(a.author).toBe("bob");
		expect(a.tags).toEqual(["r/LocalLLaMA"]);
	});
});

describe("links and titles", () => {
	it("unwraps Folha's redirect and strips tracking params", async () => {
		const a = await first(
			rss(
				`<item><title>T</title><link>https://redir.folha.com.br/redir/online/poder/rss091/*https://www1.folha.uol.com.br/poder/2026/10/a.shtml?utm_source=rss&amp;id=7</link></item>`,
			),
		);
		expect(a.url).toBe(
			"https://www1.folha.uol.com.br/poder/2026/10/a.shtml?id=7",
		);
		expect(a.outlet).toBe("folha.uol.com.br");
	});

	it("keeps the guid stable when the link is cleaned", async () => {
		const raw = "https://site.example/a?utm_source=rss";
		const a = await first(
			rss(`<item><title>T</title><link>${raw}</link></item>`),
		);
		expect(a.guid).toBe(raw);
		expect(a.url).toBe("https://site.example/a");
	});

	it("normalizes title text", () => {
		expect(cleanTitle("Cafe\u0301 \u00adbem\u200b  &amp; forte")).toBe(
			"Café bem & forte",
		);
	});

	it("drops teasers that only echo the headline", () => {
		expect(withoutTitleEcho("Dólar cai a R$ 5", "Dólar cai a R$ 5")).toBe("");
		expect(
			withoutTitleEcho(
				"Dólar cai a R$ 5. Moeda fecha em baixa.",
				"Dólar cai a R$ 5",
			),
		).toBe("Moeda fecha em baixa.");
		expect(withoutTitleEcho("Outro texto", "Dólar cai")).toBe("Outro texto");
	});
});
