import { describe, expect, it } from "vitest";
import { buildJsonFeed, buildRss, type FeedItem } from "./feedOutput.js";

const meta = {
	title: "T",
	description: "D",
	selfUrl: "https://n.test/api/feed.xml?scope=ai",
	homeUrl: "https://n.test",
	hubUrl: "https://hub.test/",
};
const items: FeedItem[] = [
	{
		id: "1",
		title: "A <b> & \u0007C",
		url: "https://a.test/1",
		source: "Src",
		category: "IA",
		summary: "resumo",
		publishedAt: "2026-01-01T10:00:00Z",
		imageUrl: "https://a.test/i.jpg",
	},
	{
		id: "2",
		title: "B",
		url: "https://a.test/2",
		source: "S2",
		publishedAt: null,
	},
];

describe("buildRss", () => {
	const xml = buildRss(items, meta, new Date("2026-01-02T00:00:00Z"));
	it("escapes markup and strips control characters", () => {
		expect(xml).toContain("<title>A &lt;b&gt; &amp; C</title>");
		expect(xml).not.toContain("\u0007");
	});
	it("advertises self and WebSub hub links", () => {
		expect(xml).toContain('rel="self"');
		expect(xml).toContain('<atom:link href="https://hub.test/" rel="hub"/>');
	});
	it("omits pubDate when the date is missing", () => {
		expect(xml.match(/<pubDate>/g)).toHaveLength(1);
	});
});

describe("buildJsonFeed", () => {
	it("follows JSON Feed 1.1", () => {
		const feed = buildJsonFeed(items, meta);
		expect(feed.version).toBe("https://jsonfeed.org/version/1.1");
		expect(feed.hubs).toEqual([{ type: "WebSub", url: "https://hub.test/" }]);
		expect(feed.items[0]).toMatchObject({
			id: "1",
			date_published: "2026-01-01T10:00:00.000Z",
			tags: ["IA"],
		});
		expect(feed.items[1]).not.toHaveProperty("date_published");
	});
});
