import { describe, expect, it } from "vitest";
import {
	extractImageFromPage,
	extractImageUrl,
	imagesFromHtml,
	isRejectedImage,
} from "./articleImage.js";

const LINK = "https://portal.com.br/noticia/1";

describe("extractImageUrl", () => {
	it("reads media:content attributes exposed under $", () => {
		expect(
			extractImageUrl({
				mediaContent: { $: { url: "https://cdn.com/foto.jpg", width: "1200" } },
			}),
		).toBe("https://cdn.com/foto.jpg");
	});

	it("prefers the highest resolution among several media:content entries", () => {
		expect(
			extractImageUrl({
				mediaContent: [
					{
						$: {
							url: "https://cdn.com/small.jpg",
							width: "320",
							height: "240",
						},
					},
					{
						$: { url: "https://cdn.com/big.jpg", width: "1600", height: "900" },
					},
				],
			}),
		).toBe("https://cdn.com/big.jpg");
	});

	it("accepts an extensionless CDN url declared as image/*", () => {
		expect(
			extractImageUrl({
				enclosure: { url: "https://cdn.com/render?id=99", type: "image/jpeg" },
			}),
		).toBe("https://cdn.com/render?id=99");
	});

	it("ignores audio and video enclosures", () => {
		expect(
			extractImageUrl({
				enclosure: { url: "https://cdn.com/audio.mp3", type: "audio/mpeg" },
			}),
		).toBeUndefined();
	});

	it("falls back to the first image inside content:encoded", () => {
		expect(
			extractImageUrl(
				{
					contentEncoded:
						'<p>Texto</p><img src="/uploads/lead.jpg" width="900" height="600">',
				},
				LINK,
			),
		).toBe("https://portal.com.br/uploads/lead.jpg");
	});

	it("skips tracking pixels and logos in favour of a real photo", () => {
		expect(
			extractImageUrl({
				contentEncoded:
					'<img src="https://feeds.feedburner.com/~ff/site?d=abc"><img src="https://cdn.com/logo.png"><img src="https://cdn.com/reportagem.jpg" width="1000" height="600">',
			}),
		).toBe("https://cdn.com/reportagem.jpg");
	});

	it("prefers media:content over a body image", () => {
		expect(
			extractImageUrl({
				mediaContent: { $: { url: "https://cdn.com/lead.jpg" } },
				contentEncoded: '<img src="https://cdn.com/inline.jpg">',
			}),
		).toBe("https://cdn.com/lead.jpg");
	});

	it("returns undefined when nothing usable exists", () => {
		expect(
			extractImageUrl({
				contentEncoded: '<img src="data:image/gif;base64,R0=">',
			}),
		).toBeUndefined();
	});
});

describe("isRejectedImage", () => {
	it("rejects svg, tiny assets and banner ratios", () => {
		expect(isRejectedImage({ url: "https://cdn.com/icon.svg", score: 1 })).toBe(
			true,
		);
		expect(
			isRejectedImage({
				url: "https://cdn.com/a.jpg",
				score: 1,
				width: 80,
				height: 80,
			}),
		).toBe(true);
		expect(
			isRejectedImage({
				url: "https://cdn.com/b.jpg",
				score: 1,
				width: 1200,
				height: 90,
			}),
		).toBe(true);
		expect(
			isRejectedImage({
				url: "https://cdn.com/c.jpg",
				score: 1,
				width: 1200,
				height: 800,
			}),
		).toBe(false);
	});
});

describe("imagesFromHtml", () => {
	it("takes the largest srcset entry and resolves relative urls", () => {
		const [candidate] = imagesFromHtml(
			'<img src="/small.jpg" srcset="/a.jpg 400w, /b.jpg 1200w">',
			LINK,
		);
		expect(candidate.url).toBe("https://portal.com.br/b.jpg");
	});

	it("understands lazy-loaded data-src", () => {
		const [candidate] = imagesFromHtml(
			'<img data-src="https://cdn.com/lazy.jpg">',
		);
		expect(candidate.url).toBe("https://cdn.com/lazy.jpg");
	});
});

describe("extractImageFromPage", () => {
	it("prefers og:image over twitter:image", () => {
		const html = `<head>
			<meta name="twitter:image" content="https://cdn.com/twitter.jpg">
			<meta property="og:image" content="https://cdn.com/og.jpg">
		</head>`;
		expect(extractImageFromPage(html)).toBe("https://cdn.com/og.jpg");
	});

	it("returns undefined when the page only advertises a logo", () => {
		expect(
			extractImageFromPage(
				'<meta property="og:image" content="https://cdn.com/logo.png">',
			),
		).toBeUndefined();
	});
});
