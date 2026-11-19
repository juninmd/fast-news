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
	cacheWrap: async (_k: string, _t: number, loader: () => Promise<unknown>) =>
		loader(),
	hashKey: (prefix: string, ...parts: unknown[]) =>
		`${prefix}:${JSON.stringify(parts)}`,
}));
const searchArticles = vi.fn(async () => ({ items: [], mode: "text" }));
vi.mock("../../services/articleSearch.js", () => ({ searchArticles }));
vi.mock("../../services/twitterTrends.js", () => ({
	fetchLiveTwitterTrends: vi.fn(),
}));
vi.mock("../../services/trendsStore.js", () => ({ getTrends: vi.fn() }));
vi.mock("../../services/credibility.js", () => ({
	analyzeCredibility: vi.fn(),
}));
vi.mock("../../services/fullArticle.js", () => ({ fetchFullArticle: vi.fn() }));
vi.mock("../../services/topStories.js", () => ({
	composeTopStories: vi.fn(),
	toExcerpt: vi.fn(),
}));
vi.mock("../../config/env.js", () => ({
	config: { adminToken: "secret", nodeEnv: "production" },
}));

const { newsRouter } = await import("./news.js");
const { forwardAsyncErrors } = await import("../asyncErrors.js");

let server: ReturnType<ReturnType<typeof express>["listen"]>;
let base: string;

beforeAll(async () => {
	const app = express();
	app.use("/api/news", forwardAsyncErrors(newsRouter));
	app.use(
		(
			_e: Error,
			_q: express.Request,
			res: express.Response,
			_n: express.NextFunction,
		) => {
			res.status(500).json({ error: "Internal server error" });
		},
	);
	server = app.listen(0);
	await new Promise((r) => server.once("listening", r));
	base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
afterAll(() => server.close());
beforeEach(() => {
	query.mockReset();
	query.mockResolvedValue({ rows: [] });
	searchArticles.mockClear();
});

describe("query strings repetidas (?q=a&q=b) não derrubam a rota", () => {
	it("/search com q repetido → 400, sem consultar o banco", async () => {
		const res = await fetch(`${base}/api/news/search?q=abcd&q=efgh`);
		expect(res.status).toBe(400);
		expect(searchArticles).not.toHaveBeenCalled();
	});

	it("/ com category repetido ignora o filtro em vez de mandar array ao SQL", async () => {
		const res = await fetch(`${base}/api/news?category=a&category=b`);
		expect(res.status).toBe(200);
		const params = query.mock.calls[0]?.[1] as unknown[];
		expect(params.some((p) => Array.isArray(p))).toBe(false);
	});
});
