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
vi.mock("../../services/twitterTrends.js", () => ({
	fetchLiveTwitterTrends: vi.fn(),
}));
vi.mock("../../services/financial.js", () => ({
	getActiveOpportunities: vi.fn(),
}));
vi.mock("../../services/trendsStore.js", () => ({ getTrends: vi.fn() }));
vi.mock("../../services/articleSearch.js", () => ({
	searchArticles: vi.fn(),
}));
vi.mock("../../services/analysis.js", () => ({
	analyzeTopicWithRAG: vi.fn(),
	getAllTrackedTopics: vi.fn(async () => []),
	getTopicLatestAnalysis: vi.fn(),
}));
vi.mock("../../services/topStories.js", () => ({
	composeTopStories: vi.fn(),
	toExcerpt: vi.fn(),
}));
const analyzeCredibility = vi.fn();
vi.mock("../../services/credibility.js", () => ({ analyzeCredibility }));
vi.mock("../../services/fullArticle.js", () => ({
	fetchFullArticle: vi.fn(async () => null),
}));
const postArticleToTelegram = vi.fn();
vi.mock("../../services/telegramBroadcast.js", () => ({
	postArticleToTelegram,
}));
const handleUpdate = vi.fn(async (_b: unknown, res: express.Response) => {
	res.sendStatus(200);
});
vi.mock("../../services/telegram.js", async () => {
	const { createHash } = await import("node:crypto");
	const secret = createHash("sha256").update("x").digest("hex");
	return {
		fetchTelegramArticle: vi.fn(async () => ({ id: "a" })),
		getBot: () => ({ handleUpdate }),
		isValidWebhookSecret: (given?: string) => given === secret,
		__secret: secret,
	};
});
vi.mock("../../config/env.js", () => ({
	config: {
		adminToken: "secret",
		nodeEnv: "production",
		telegramEnabled: true,
		telegramBotMode: "webhook",
	},
}));

const { newsRouter } = await import("./news.js");
const { topicsRouter } = await import("./topics.js");
const { financialRouter } = await import("./financial.js");
const { telegramRouter } = await import("./telegram.js");
const tg = (await import("../../services/telegram.js")) as unknown as {
	__secret: string;
};
const { forwardAsyncErrors } = await import("../asyncErrors.js");

let server: ReturnType<ReturnType<typeof express>["listen"]>;
let base: string;

beforeAll(async () => {
	const app = express();
	app.use(express.json());
	app.use("/api/news", forwardAsyncErrors(newsRouter));
	app.use("/api/topics", forwardAsyncErrors(topicsRouter));
	app.use("/api/financial", forwardAsyncErrors(financialRouter));
	app.use("/api/telegram", forwardAsyncErrors(telegramRouter));
	server = app.listen(0);
	await new Promise((r) => server.once("listening", r));
	base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
afterAll(() => server.close());
beforeEach(() => {
	query.mockReset();
	query.mockResolvedValue({ rows: [] });
	analyzeCredibility.mockReset();
	postArticleToTelegram.mockReset();
	handleUpdate.mockClear();
});

const ID = "11111111-1111-1111-1111-111111111111";
const writes: Array<[string, string, unknown?]> = [
	["POST", "/api/news/feeds/toggle", { id: "1", isActive: false }],
	["POST", "/api/news/feeds/add", { name: "x", url: "https://x.test/rss" }],
	["DELETE", "/api/news/feeds/1"],
	["POST", "/api/topics", { name: "x", keywords: ["x"] }],
	["DELETE", "/api/topics/1"],
	["PATCH", "/api/financial/1/dismiss"],
	["POST", `/api/telegram/articles/${ID}/send`],
];

describe("escritas da API exigem ADMIN_TOKEN", () => {
	it.each(
		writes,
	)("%s %s sem token → 401, sem tocar no banco", async (method, path, body) => {
		const res = await fetch(base + path, {
			method,
			headers: { "content-type": "application/json" },
			body: body ? JSON.stringify(body) : undefined,
		});
		expect(res.status).toBe(401);
		expect(query).not.toHaveBeenCalled();
		expect(postArticleToTelegram).not.toHaveBeenCalled();
	});

	it("com o token a escrita passa", async () => {
		query.mockResolvedValueOnce({ rows: [], rowCount: 1 });
		const res = await fetch(`${base}/api/news/feeds/1`, {
			method: "DELETE",
			headers: { "x-admin-token": "secret" },
		});
		expect(res.status).toBe(200);
		expect(query).toHaveBeenCalledOnce();
	});
});

describe("toggle e exclusão de feed", () => {
	const admin = {
		"content-type": "application/json",
		"x-admin-token": "secret",
	};
	const toggle = (body: unknown) =>
		fetch(`${base}/api/news/feeds/toggle`, {
			method: "POST",
			headers: admin,
			body: JSON.stringify(body),
		});

	it("toggle sem isActive booleano → 400, sem gravar NULL", async () => {
		expect((await toggle({ id: ID })).status).toBe(400);
		expect((await toggle({ id: ID, isActive: "no" })).status).toBe(400);
		expect(query).not.toHaveBeenCalled();
	});

	it("toggle de feed inexistente → 404", async () => {
		query.mockResolvedValueOnce({ rows: [], rowCount: 0 });
		expect((await toggle({ id: ID, isActive: false })).status).toBe(404);
	});

	it("exclusão de feed inexistente → 404", async () => {
		query.mockResolvedValueOnce({ rows: [], rowCount: 0 });
		const res = await fetch(`${base}/api/news/feeds/${ID}`, {
			method: "DELETE",
			headers: admin,
		});
		expect(res.status).toBe(404);
	});
});

describe("webhook do Telegram", () => {
	it("recusa update sem o secret_token", async () => {
		const res = await fetch(`${base}/api/telegram/webhook`, {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({ update_id: 1 }),
		});
		expect(res.status).toBe(401);
		expect(handleUpdate).not.toHaveBeenCalled();
	});

	it("aceita update com o secret_token", async () => {
		const res = await fetch(`${base}/api/telegram/webhook`, {
			method: "POST",
			headers: {
				"content-type": "application/json",
				"x-telegram-bot-api-secret-token": tg.__secret,
			},
			body: JSON.stringify({ update_id: 1 }),
		});
		expect(res.status).toBe(200);
		expect(handleUpdate).toHaveBeenCalledOnce();
	});
});

describe("credibilidade (rota pública)", () => {
	const stored = {
		title: "t",
		content: "c",
		url: "https://x.test",
		source: "s",
		category: "Brasil",
		fake_news_score: 3,
		political_bias: "neutral",
		is_militant: false,
		has_incoherence: false,
		credibility_flags: [],
		credibility_reasoning: "ok",
	};

	it("análise já gravada volta sem chamar o modelo", async () => {
		query.mockResolvedValue({ rows: [stored] });
		const res = await fetch(`${base}/api/news/${ID}/credibility`, {
			method: "POST",
		});
		expect(res.status).toBe(200);
		expect(await res.json()).toMatchObject({ fakeNewsScore: 3, cached: true });
		expect(analyzeCredibility).not.toHaveBeenCalled();
	});

	it("cliques simultâneos fazem uma chamada só", async () => {
		query.mockResolvedValue({
			rows: [{ ...stored, fake_news_score: null, credibility_reasoning: null }],
		});
		let release!: (v: unknown) => void;
		analyzeCredibility.mockReturnValue(
			new Promise((r) => {
				release = r;
			}),
		);
		const call = () =>
			fetch(`${base}/api/news/${ID}/credibility`, { method: "POST" });
		const a = call();
		const b = call();
		await vi.waitFor(() => expect(analyzeCredibility).toHaveBeenCalled());
		await new Promise((r) => setTimeout(r, 50));
		release({ fakeNewsScore: 2, reasoning: "r" });
		const [ra, rb] = await Promise.all([a, b]);
		expect(ra.status).toBe(200);
		expect(rb.status).toBe(200);
		expect(analyzeCredibility).toHaveBeenCalledOnce();
	});
});
