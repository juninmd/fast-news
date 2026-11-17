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

const generateText = vi.fn();
vi.mock("ai", () => ({ generateText }));
vi.mock("../../services/aiProvider.js", () => ({
	getFastModel: async () => "m",
}));
const store = new Map<string, unknown>();
vi.mock("../../services/cache.js", () => ({
	cacheWrap: async (
		key: string,
		_ttl: number,
		loader: () => Promise<unknown>,
	) => {
		if (store.has(key)) return store.get(key);
		const v = await loader();
		if (v != null) store.set(key, v);
		return v;
	},
	hashKey: (prefix: string, ...parts: unknown[]) =>
		`${prefix}:${JSON.stringify(parts)}`,
}));
vi.mock("../../config/env.js", () => ({
	config: { aiGenerate: { rateLimitMax: 2, rateLimitWindowMs: 60_000 } },
}));

const { aiRouter, resetRateLimit } = await import("./ai.js");

let server: ReturnType<ReturnType<typeof express>["listen"]>;
let base: string;
beforeAll(async () => {
	const app = express();
	app.use(express.json());
	app.use("/api/ai", aiRouter);
	server = app.listen(0);
	await new Promise((r) => server.once("listening", r));
	base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api/ai/generate`;
});
afterAll(() => server.close());
beforeEach(() => {
	store.clear();
	resetRateLimit();
	generateText.mockReset();
	generateText.mockResolvedValue({ text: "ok" });
});

const post = (body: unknown) =>
	fetch(base, {
		method: "POST",
		headers: { "content-type": "application/json" },
		body: JSON.stringify(body),
	});

describe("POST /api/ai/generate", () => {
	it("mesmo prompt de outro leitor vem do cache, sem nova chamada", async () => {
		expect(await (await post({ prompt: "resuma X" })).json()).toEqual({
			response: "ok",
		});
		expect(await (await post({ prompt: "resuma X" })).json()).toEqual({
			response: "ok",
		});
		expect(generateText).toHaveBeenCalledTimes(1);
		expect(generateText.mock.calls[0][0].maxRetries).toBe(0);
	});

	it("limita chamadas ao modelo por IP", async () => {
		expect((await post({ prompt: "a" })).status).toBe(200);
		expect((await post({ prompt: "b" })).status).toBe(200);
		const third = await post({ prompt: "c" });
		expect(third.status).toBe(429);
		expect(third.headers.get("retry-after")).toBeTruthy();
		// cache não conta: "a" continua respondendo
		expect((await post({ prompt: "a" })).status).toBe(200);
	});

	it("recusa prompt gigante e não vaza a mensagem do provider", async () => {
		expect((await post({ prompt: "x".repeat(12_001) })).status).toBe(413);
		generateText.mockRejectedValueOnce(
			new Error("401 key sk-123 at http://litellm.internal"),
		);
		const r = await post({ prompt: "falha" });
		expect(r.status).toBe(502);
		expect(JSON.stringify(await r.json())).not.toContain("sk-123");
	});
});
