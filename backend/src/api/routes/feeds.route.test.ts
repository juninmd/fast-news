import type { AddressInfo } from "node:net";
import express from "express";
import {
	afterAll,
	beforeAll,
	beforeEach,
	describe,
	expect,
	it,
	vi,
} from "vitest";

const query = vi.fn();
vi.mock("../../database/client.js", () => ({ query }));
vi.mock("../../services/cache.js", () => ({
	cacheGet: vi.fn(async () => null),
	cacheSet: vi.fn(async () => undefined),
	cacheWrap: async (
		_key: string,
		_ttl: number,
		loader: () => Promise<unknown>,
	) => loader(),
	hashKey: (prefix: string, ...parts: unknown[]) =>
		`${prefix}:${JSON.stringify(parts)}`,
}));
vi.mock("../../config/env.js", () => ({
	config: {
		adminToken: "secret",
		nodeEnv: "production",
		publicUrl: "https://n.test",
		websub: { hubUrl: "https://hub.test/" },
		tts: { apiUrl: "" },
	},
}));

const { feedsRouter } = await import("./feeds.js");
const { sourcesRouter } = await import("./sources.js");
const { forwardAsyncErrors } = await import("../asyncErrors.js");

let server: ReturnType<ReturnType<typeof express>["listen"]>;
let base: string;

beforeAll(async () => {
	const app = express();
	app.use(express.json());
	app.use("/api/sources", forwardAsyncErrors(sourcesRouter));
	app.use("/api", forwardAsyncErrors(feedsRouter));
	server = app.listen(0);
	await new Promise((r) => server.once("listening", r));
	base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
afterAll(() => server.close());
beforeEach(() => query.mockReset());

describe("feeds", () => {
	it("serves RSS with the WebSub hub and applies the AI scope in SQL", async () => {
		query.mockResolvedValueOnce({
			rows: [
				{
					id: "1",
					title: "OpenAI lança modelo",
					url: "https://a.test/1",
					source: "S",
					category: "IA",
					summary: null,
					content: "<p>texto</p>",
					published_at: "2026-01-01T10:00:00Z",
					image_url: null,
				},
			],
		});
		const res = await fetch(`${base}/api/feed.xml?scope=ai`);
		expect(res.headers.get("content-type")).toContain("application/rss+xml");
		const body = await res.text();
		expect(body).toContain("OpenAI lança modelo");
		expect(body).toContain('rel="hub"');
		expect(query.mock.calls[0]?.[0]).toContain("is_ai = TRUE");
	});

	it("rejects an unknown digest period", async () => {
		const res = await fetch(`${base}/api/digests/yearly`);
		expect(res.status).toBe(400);
	});

	it("reports the podcast as empty when TTS is off", async () => {
		const res = await fetch(`${base}/api/podcast.xml`);
		expect(await res.text()).not.toContain("<item>");
		expect((await fetch(`${base}/api/digests/daily/audio.mp3`)).status).toBe(
			404,
		);
	});
});

describe("sources", () => {
	const opml = `<opml version="2.0"><body><outline text="IA"><outline type="rss" text="X" xmlUrl="https://x.test/f"/></outline></body></opml>`;

	it("blocks OPML import without the admin token", async () => {
		const res = await fetch(`${base}/api/sources/opml`, {
			method: "POST",
			headers: { "Content-Type": "text/xml" },
			body: opml,
		});
		expect(res.status).toBe(401);
		expect(query).not.toHaveBeenCalled();
	});

	it("imports OPML with the token", async () => {
		query.mockResolvedValue({ rowCount: 1, rows: [] });
		const res = await fetch(`${base}/api/sources/opml`, {
			method: "POST",
			headers: { "Content-Type": "text/xml", Authorization: "Bearer secret" },
			body: opml,
		});
		expect(await res.json()).toEqual({ found: 1, added: 1, skipped: 0 });
		expect(query.mock.calls[0]?.[1]).toEqual([
			"X",
			"https://x.test/f",
			"IA",
			"X",
		]);
	});

	it("exports OPML", async () => {
		query.mockResolvedValueOnce({
			rows: [{ name: "X", url: "https://x.test/f", category: "IA" }],
		});
		const res = await fetch(`${base}/api/sources/opml`);
		expect(res.headers.get("content-disposition")).toContain("fast-news.opml");
		expect(await res.text()).toContain('xmlUrl="https://x.test/f"');
	});
});
