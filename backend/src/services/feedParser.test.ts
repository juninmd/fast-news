import { describe, expect, it } from "vitest";
import {
	decodeFeedBytes,
	FeedFormatError,
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
