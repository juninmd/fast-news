import { describe, expect, it, vi } from "vitest";

vi.mock("../database/client.js", () => ({ query: vi.fn() }));

const { buildOpml, parseOpml } = await import("./opml.js");

describe("OPML", () => {
	const feeds = [
		{ title: "A & B", url: "https://a.test/feed?x=1&y=2", category: "IA" },
		{ title: "C", url: "https://c.test/rss", category: "Tecnologia" },
		{ title: "D", url: "https://d.test/rss" },
	];

	it("round-trips feeds with their category and escaping", () => {
		const parsed = parseOpml(buildOpml(feeds));
		expect(parsed).toEqual([
			{ title: "D", url: "https://d.test/rss", category: "Geral" },
			{ title: "A & B", url: "https://a.test/feed?x=1&y=2", category: "IA" },
			{ title: "C", url: "https://c.test/rss", category: "Tecnologia" },
		]);
	});

	it("reads nested folders and ignores non-http or duplicate urls", () => {
		const xml = `<opml><body>
		  <outline text="Dev"><outline text="Sub"><outline type="rss" text="X" xmlUrl="https://x.test/f"/></outline>
		    <outline type="rss" text="Y" xmlUrl="https://x.test/f"/>
		    <outline type="rss" text="Z" xmlUrl="javascript:alert(1)"/>
		  </outline>
		  <outline type="rss" text="W" xmlUrl="https://w.test/f"/>
		</body></opml>`;
		expect(parseOpml(xml)).toEqual([
			{ title: "X", url: "https://x.test/f", category: "Sub" },
			{ title: "W", url: "https://w.test/f" },
		]);
	});

	it("returns nothing for garbage", () => {
		expect(parseOpml("not xml")).toEqual([]);
	});
});
