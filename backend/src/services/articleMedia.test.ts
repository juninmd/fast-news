import { afterEach, describe, expect, it, vi } from "vitest";
import {
	extractImageUrl,
	extractMedia,
	fetchOgImage,
	fetchPageMedia,
	imageFromHtml,
	mediaFromHtml,
	normalizeImageUrl,
	ogImageFromHtml,
	ogVideoFromHtml,
	pageMetaFromHtml,
	parseVideoUrl,
} from "./articleMedia.js";

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

describe("extractImageUrl edge cases", () => {
	it("reads bare-string thumbnails (MyAnimeList) and ignores empty nodes (Wired)", () => {
		expect(extractImageUrl({ mediaThumbnail: ["https://cdn.x/a.jpeg"] })).toBe(
			"https://cdn.x/a.jpeg",
		);
		expect(extractImageUrl({ mediaContent: [""] })).toBeUndefined();
	});

	it("uses data-src / srcset when the body is lazy-loaded", () => {
		const html =
			'<img src="data:image/gif;base64,AAA" data-src="https://x.com/real.jpg" width="800">' +
			'<img srcset="https://x.com/s-400.jpg 400w, https://x.com/s-1200.jpg 1200w, https://x.com/s-2400.jpg 2400w">';
		expect(mediaFromHtml(html).images.map((i) => i.url)).toEqual([
			"https://x.com/real.jpg",
			"https://x.com/s-1200.jpg",
		]);
	});

	it("skips tiny and emoji images", () => {
		const html =
			'<img src="https://x.com/a.jpg" width="40" height="40"><img src="https://x.com/b.png" class="wp-smiley">';
		expect(mediaFromHtml(html).images).toEqual([]);
	});
});

describe("parseVideoUrl", () => {
	it.each([
		"https://www.youtube.com/embed/dQw4w9WgXcQ?rel=0",
		"https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ",
		"https://youtu.be/dQw4w9WgXcQ",
		"https://www.youtube.com/watch?feature=x&v=dQw4w9WgXcQ",
		"https://www.youtube.com/v/dQw4w9WgXcQ?version=3",
		"https://www.youtube.com/shorts/dQw4w9WgXcQ",
	])("recognises YouTube: %s", (url) => {
		expect(parseVideoUrl(url)).toMatchObject({
			provider: "youtube",
			url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
			embedUrl: "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ",
			thumbnail: "https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg",
		});
	});

	it("recognises Vimeo and direct files, rejects pages and widgets", () => {
		expect(
			parseVideoUrl("https://player.vimeo.com/video/123456789"),
		).toMatchObject({
			provider: "vimeo",
			url: "https://vimeo.com/123456789",
		});
		expect(parseVideoUrl("https://x.com/a.mp4?t=1")).toMatchObject({
			provider: "file",
			mimeType: "video/mp4",
		});
		expect(parseVideoUrl("https://x.com/master.m3u8")).toMatchObject({
			mimeType: "application/x-mpegURL",
		});
		expect(parseVideoUrl("https://x.com/story/embed/")).toBeUndefined();
		expect(
			parseVideoUrl("https://x.com/player.html", { medium: "video" }),
		).toBeUndefined();
		expect(
			parseVideoUrl("https://x.com/stream?id=3", { medium: "video" }),
		).toMatchObject({ provider: "file" });
	});
});

describe("extractMedia", () => {
	it("finds YouTube iframes and <video> files with their poster in the body", () => {
		const html =
			'<p><iframe src="//www.youtube.com/embed/dQw4w9WgXcQ"></iframe></p>' +
			'<video controls poster="/p.png" src="/clip.mp4" width="640"></video>' +
			'<iframe src="https://ads.example.com/widget"></iframe>';
		const out = extractMedia({ "content:encoded": html }, "https://x.com/post");
		expect(out.media.filter((m) => m.type === "video")).toEqual([
			expect.objectContaining({ provider: "youtube" }),
			expect.objectContaining({
				provider: "file",
				url: "https://x.com/clip.mp4",
				thumbnail: "https://x.com/p.png",
				width: 640,
			}),
		]);
		expect(out.videoUrl).toBe("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
		// no <img> in the body: the cover falls back to the first video poster
		expect(out.imageUrl).toBe(
			"https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg",
		);
	});

	it("reads video media:content (YouTube embed, mp4, HLS) and ranks HLS last", () => {
		const out = extractMedia({
			mediaContent: [
				{
					$: {
						url: "https://cdn.x/master.m3u8",
						medium: "video",
						type: "application/x-mpegURL",
					},
					"media:thumbnail": [{ $: { url: "https://cdn.x/thumb.jpg" } }],
				},
				{
					$: {
						url: "https://www.youtube.com/embed/dQw4w9WgXcQ",
						duration: "1178",
					},
					"media:player": [
						{ $: { url: "https://www.youtube.com/embed/dQw4w9WgXcQ" } },
					],
				},
			],
		});
		expect(out.media.map((m) => m.provider)).toEqual(["youtube", "file"]);
		expect(out.media[0]).toMatchObject({ duration: 1178 });
		expect(out.media[1]).toMatchObject({
			thumbnail: "https://cdn.x/thumb.jpg",
		});
	});

	it("takes video enclosures and a yt:videoId", () => {
		expect(
			extractMedia({
				enclosure: { url: "https://x.com/ep.webm", type: "video/webm" },
			}).videoUrl,
		).toBe("https://x.com/ep.webm");
		expect(extractMedia({ ytVideoId: "dQw4w9WgXcQ" }).videoUrl).toBe(
			"https://www.youtube.com/watch?v=dQw4w9WgXcQ",
		);
	});

	it("keeps the image order (widest media first) and de-duplicates sizes of one picture", () => {
		const out = extractMedia({
			mediaThumbnail: [
				{ $: { url: "https://x.com/a-300x200.jpg", width: "300" } },
			],
			mediaContent: [
				{ $: { url: "https://x.com/a.jpg", medium: "image", width: "1200" } },
			],
			"content:encoded":
				'<img src="https://x.com/a-1024x683.jpg"><img src="https://x.com/b.jpg">',
		});
		expect(out.media.map((m) => m.url)).toEqual([
			"https://x.com/a.jpg",
			"https://x.com/b.jpg",
		]);
		expect(out.imageUrl).toBe("https://x.com/a.jpg");
		expect(out.videoUrl).toBeUndefined();
	});
});

describe("og:video", () => {
	it("accepts YouTube embeds and typed files, ignores player pages", () => {
		expect(
			ogVideoFromHtml(
				'<meta property="og:video" content="https://www.youtube.com/embed/dQw4w9WgXcQ">',
				"https://x.com",
			),
		).toMatchObject({ provider: "youtube" });
		expect(
			ogVideoFromHtml(
				'<meta property="og:video:url" content="/v/clip"><meta property="og:video:type" content="video/mp4">',
				"https://x.com",
			),
		).toMatchObject({ provider: "file", url: "https://x.com/v/clip" });
		expect(
			ogVideoFromHtml(
				'<meta property="og:video" content="https://x.com/player.html">',
				"https://x.com",
			),
		).toBeUndefined();
	});

	it("fetchPageMedia returns image and video in one request", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn().mockResolvedValue({
				ok: true,
				url: "https://x.example/n/1",
				headers: new Headers({ "content-type": "text/html" }),
				text: async () =>
					'<meta property="og:image" content="/c.jpg"><meta content="https://youtu.be/dQw4w9WgXcQ" property="og:video">',
			}),
		);
		const page = await fetchPageMedia("https://x.example/n/1");
		vi.unstubAllGlobals();
		expect(page.imageUrl).toBe("https://x.example/c.jpg");
		expect(page.video?.provider).toBe("youtube");
	});
});

describe("image alt and credit", () => {
	it("keeps <img alt> and media:credit / media:description", () => {
		const out = extractMedia({
			mediaContent: [
				{
					$: { url: "https://x.com/a.jpg", medium: "image", width: "900" },
					"media:credit": ["Jackal Pan/Getty Images"],
					"media:description": [{ _: "Prédio da bolsa" }],
				},
			],
			"content:encoded":
				'<img src="https://x.com/b.jpg" alt="Gráfico &amp; dados">',
		});
		expect(out.media[0]).toMatchObject({
			credit: "Jackal Pan/Getty Images",
			alt: "Prédio da bolsa",
		});
		expect(out.media[1]).toMatchObject({ alt: "Gráfico & dados" });
		expect(
			extractMedia({
				mediaContent: [
					{
						$: { url: "https://x.com/c.jpg", medium: "image" },
						"media:credit": ["null"],
					},
				],
			}).media[0]?.credit,
		).toBeUndefined();
	});
});

describe("pageMetaFromHtml", () => {
	it("reads description, author and tags, ignoring profile urls", () => {
		const html =
			'<meta property="og:description" content="Resumo &amp; contexto">' +
			'<meta name="author" content="Ana Souza">' +
			'<meta property="article:tag" content="IA"><meta property="article:tag" content="Chips">' +
			'<meta name="keywords" content="ia, mercado">';
		expect(pageMetaFromHtml(html)).toEqual({
			description: "Resumo & contexto",
			author: "Ana Souza",
			tags: ["IA", "Chips", "ia", "mercado"],
		});
		expect(
			pageMetaFromHtml(
				'<meta property="article:author" content="https://fb.com/ana">',
			).author,
		).toBeUndefined();
	});
});
