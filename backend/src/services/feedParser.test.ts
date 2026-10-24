import { afterEach, describe, expect, it, vi } from "vitest";
import {
	decodeFeedBytes,
	FeedFormatError,
	fetchFeedXml,
	parseFeed,
	sanitizeFeedXml,
} from "./feedParser.js";

const bytes = (b: Buffer) =>
	b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer;

describe("decodeFeedBytes", () => {
	it("honours the XML prolog over the HTTP charset", () => {
		const body = Buffer.from(
			'<?xml version="1.0" encoding="ISO-8859-1"?><t>Not\xedcias</t>',
			"latin1",
		);
		expect(decodeFeedBytes(bytes(body), "text/xml; charset=utf-8")).toContain(
			"Notícias",
		);
	});

	it("retries as windows-1252 when utf-8 yields replacement characters", () => {
		const body = Buffer.from("<t>Não</t>", "latin1");
		expect(decodeFeedBytes(bytes(body), "text/xml")).toBe("<t>Não</t>");
	});
});

describe("sanitizeFeedXml", () => {
	it("escapes bare ampersands but not entities or CDATA", () => {
		const out = sanitizeFeedXml(
			'<rss version="2.0"><t>A & B &amp; C &#39;</t><d><![CDATA[x & y]]></d></rss>',
		);
		expect(out).toContain("A &amp; B &amp; C &#39;");
		expect(out).toContain("<![CDATA[x & y]]>");
	});

	it("adds the missing RSS version only on the root element", () => {
		expect(sanitizeFeedXml("<rss><channel/></rss>")).toContain(
			'<rss version="2.0">',
		);
		const out = sanitizeFeedXml(
			'<rss version="2.0"><channel><rssFeedStyles:x/></channel></rss>',
		);
		expect(out).toBe(
			'<rss version="2.0"><channel><rssFeedStyles:x/></channel></rss>',
		);
	});

	it("strips BOM, leading whitespace and control characters", () => {
		expect(sanitizeFeedXml('﻿ \n<rss version="2.0">\u0001</rss>')).toBe(
			'<rss version="2.0"></rss>',
		);
	});

	it("rejects HTML block pages and non-feeds with a clear error", () => {
		expect(() => sanitizeFeedXml("<!DOCTYPE html><html></html>")).toThrow(
			FeedFormatError,
		);
		expect(() => sanitizeFeedXml("Error HTTP 404")).toThrow(/não é um feed/);
	});
});

describe("parseFeed", () => {
	it("parses a UOL-style feed (no version, bare ampersand)", async () => {
		const feed = await parseFeed(
			"<rss><channel><title>UOL</title><item><title>Tom & Jerry</title><link>https://x.com/1</link></item></channel></rss>",
		);
		expect(feed.title).toBe("UOL");
		expect(feed.items[0]?.title).toBe("Tom & Jerry");
	});

	it("keeps Media RSS, enclosure and yt:videoId fields", async () => {
		const feed = await parseFeed(
			`<feed xmlns="http://www.w3.org/2005/Atom" xmlns:yt="http://www.youtube.com/xml/schemas/2015" xmlns:media="http://search.yahoo.com/mrss/">
			<title>Canal</title>
			<entry><title>V</title><link rel="alternate" href="https://www.youtube.com/watch?v=abcdefghijk"/>
			<yt:videoId>abcdefghijk</yt:videoId>
			<media:group><media:thumbnail url="https://i.ytimg.com/vi/abcdefghijk/hqdefault.jpg"/></media:group></entry></feed>`,
		);
		expect(feed.items[0]?.["ytVideoId"]).toBe("abcdefghijk");
		expect(feed.items[0]?.["mediaGroup"]).toBeDefined();
	});
});

describe("fetchFeedXml (conditional GET)", () => {
	afterEach(() => vi.unstubAllGlobals());

	const reply = (status: number, headers: Record<string, string>, body = "") =>
		vi.fn().mockResolvedValue({
			status,
			ok: status >= 200 && status < 300,
			headers: new Headers(headers),
			arrayBuffer: async () => new TextEncoder().encode(body).buffer,
		});

	it("sends the stored validators and reports 304 as no body", async () => {
		const fetchMock = reply(304, {});
		vi.stubGlobal("fetch", fetchMock);
		const out = await fetchFeedXml("https://x.test/feed", 1000, {
			etag: '"abc"',
			lastModified: "Sat, 24 Oct 2026 10:00:00 GMT",
		});
		expect(out).toEqual({
			xml: null,
			etag: '"abc"',
			lastModified: "Sat, 24 Oct 2026 10:00:00 GMT",
		});
		const headers = fetchMock.mock.calls[0]?.[1]?.headers as Record<
			string,
			string
		>;
		expect(headers["If-None-Match"]).toBe('"abc"');
		expect(headers["If-Modified-Since"]).toBe("Sat, 24 Oct 2026 10:00:00 GMT");
	});

	it("returns the body with the new validators on 200", async () => {
		vi.stubGlobal(
			"fetch",
			reply(200, { etag: '"v2"', "content-type": "application/xml" }, "<rss/>"),
		);
		const out = await fetchFeedXml("https://x.test/feed", 1000);
		expect(out.xml).toBe("<rss/>");
		expect(out.etag).toBe('"v2"');
		expect(out.lastModified).toBeNull();
	});

	it("does not send validators it does not have, and fails on HTTP errors", async () => {
		const fetchMock = reply(503, {});
		vi.stubGlobal("fetch", fetchMock);
		await expect(fetchFeedXml("https://x.test/feed", 1000)).rejects.toThrow(
			"HTTP 503",
		);
		const headers = fetchMock.mock.calls[0]?.[1]?.headers as Record<
			string,
			string
		>;
		expect(headers["If-None-Match"]).toBeUndefined();
	});
});
