import { afterEach, describe, expect, it, vi } from "vitest";
import {
	extractImageUrl,
	fetchOgImage,
	imageFromHtml,
	normalizeImageUrl,
	ogImageFromHtml,
} from "./articleImages.js";

describe("normalizeImageUrl", () => {
	it("resolves relative and protocol-relative urls and upgrades to https", () => {
		expect(normalizeImageUrl("//cdn.x.com/a.jpg")).toBeUndefined();
		expect(normalizeImageUrl("//cdn.x.com/a.jpg", "https://x.com/p")).toBe(
			"https://cdn.x.com/a.jpg",
		);
		expect(normalizeImageUrl("/img/a.png", "https://x.com/p/1")).toBe(
			"https://x.com/img/a.png",
		);
		expect(normalizeImageUrl("http://x.com/a.png")).toBe("https://x.com/a.png");
	});

	it("rejects data uris and other schemes", () => {
		expect(normalizeImageUrl("data:image/png;base64,AAA")).toBeUndefined();
		expect(normalizeImageUrl("javascript:alert(1)")).toBeUndefined();
	});
});

describe("extractImageUrl", () => {
	it("prefers the widest media:content", () => {
		const item = {
			mediaContent: [
				{
					$: { url: "https://x.com/small.jpg", width: "100", medium: "image" },
				},
				{ $: { url: "https://x.com/big.jpg", width: "1200", medium: "image" } },
			],
		};
		expect(extractImageUrl(item)).toBe("https://x.com/big.jpg");
	});

	it("reads media:thumbnail and typed enclosures without extension", () => {
		expect(
			extractImageUrl({
				mediaThumbnail: { $: { url: "https://x.com/t.jpg" } },
			}),
		).toBe("https://x.com/t.jpg");
		expect(
			extractImageUrl({
				enclosure: { url: "https://x.com/photo?id=3", type: "image/jpeg" },
			}),
		).toBe("https://x.com/photo?id=3");
	});

	it("ignores audio enclosures", () => {
		expect(
			extractImageUrl({
				enclosure: { url: "https://x.com/ep.mp3", type: "audio/mpeg" },
			}),
		).toBeUndefined();
	});

	it("falls back to the first real <img> in the body", () => {
		const html =
			'<p><img src="https://x.com/pixel.gif" width="1"><img src="/media/foto.jpg" width="640"></p>';
		expect(imageFromHtml(html, "https://x.com/n/1")).toBe(
			"https://x.com/media/foto.jpg",
		);
		expect(
			extractImageUrl({ "content:encoded": html }, "https://x.com/n/1"),
		).toBe("https://x.com/media/foto.jpg");
	});
});

describe("ogImageFromHtml", () => {
	it("reads og:image in either attribute order", () => {
		expect(
			ogImageFromHtml(
				'<meta property="og:image" content="https://x.com/og.jpg">',
				"https://x.com",
			),
		).toBe("https://x.com/og.jpg");
		expect(
			ogImageFromHtml(
				'<meta content="/og2.jpg" name="twitter:image">',
				"https://x.com/a",
			),
		).toBe("https://x.com/og2.jpg");
	});
});

describe("fetchOgImage", () => {
	afterEach(() => vi.unstubAllGlobals());

	const page = (body: string, type = "text/html; charset=utf-8", ok = true) =>
		vi.stubGlobal(
			"fetch",
			vi.fn().mockResolvedValue({
				ok,
				url: "https://x.example/news/1",
				headers: new Headers({ "content-type": type }),
				text: async () => body,
			}),
		);

	it("returns the og:image of the article page", async () => {
		page('<meta property="og:image" content="/cover.jpg">');
		expect(await fetchOgImage("https://x.example/news/1")).toBe(
			"https://x.example/cover.jpg",
		);
	});

	it("accepts servers that omit a useful content type", async () => {
		page(
			'<meta property="og:image" content="/cover.jpg">',
			"application/octet-stream",
		);
		expect(await fetchOgImage("https://x.example/news/1")).toBeDefined();
	});

	it("gives up quietly on media, errors and network failures", async () => {
		page("", "image/png");
		expect(await fetchOgImage("https://x.example/a.png")).toBeUndefined();
		page("", "text/html", false);
		expect(await fetchOgImage("https://x.example/404")).toBeUndefined();
		vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("boom")));
		expect(await fetchOgImage("https://x.example/down")).toBeUndefined();
	});
});
