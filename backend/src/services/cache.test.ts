import { beforeEach, describe, expect, it, vi } from "vitest";

const store = new Map<string, string>();
const fake = {
	isOpen: true,
	isReady: true,
	get: vi.fn(async (k: string) => store.get(k) ?? null),
	set: vi.fn(async (k: string, v: string) => {
		store.set(k, v);
		return "OK";
	}),
	del: vi.fn(async (k: string) => (store.delete(k) ? 1 : 0)),
	unlink: vi.fn(
		async (keys: string[]) => keys.filter((k) => store.delete(k)).length,
	),
	scanIterator: vi.fn(async function* ({ MATCH }: { MATCH: string }) {
		const re = new RegExp(`^${MATCH.replace(/\*/g, ".*")}$`);
		yield [...store.keys()].filter((k) => re.test(k));
	}),
	connect: vi.fn(async () => undefined),
	on: vi.fn(),
	quit: vi.fn(async () => undefined),
	disconnect: vi.fn(async () => undefined),
};
vi.mock("redis", () => ({ createClient: vi.fn(() => fake) }));
vi.mock("../config/env.js", () => ({ config: { redisUrl: "redis://x" } }));

const cache = await import("./cache.js");

beforeEach(() => {
	store.clear();
	fake.isOpen = true;
	fake.isReady = true;
	vi.clearAllMocks();
});

describe("cacheGet / cacheSet", () => {
	it("round-trips JSON with a TTL", async () => {
		await cache.cacheSet("k", { a: 1 }, 30);
		expect(fake.set).toHaveBeenCalledWith("k", '{"a":1}', { EX: 30 });
		expect(await cache.cacheGet("k")).toEqual({ a: 1 });
	});

	it("degrades to a miss, without touching Redis, while it is not ready", async () => {
		fake.isReady = false;
		expect(await cache.cacheGet("k")).toBeNull();
		await cache.cacheSet("k", 1);
		expect(fake.get).not.toHaveBeenCalled();
		expect(fake.set).not.toHaveBeenCalled();
	});

	it("starts connecting in the background when the socket is closed", async () => {
		fake.isOpen = false;
		fake.isReady = false;
		expect(await cache.cacheGet("k")).toBeNull();
		expect(fake.connect).toHaveBeenCalled();
	});

	it("treats a command that never answers as a miss", async () => {
		vi.useFakeTimers();
		fake.get.mockImplementationOnce(() => new Promise(() => undefined));
		const pending = cache.cacheGet("slow");
		await vi.advanceTimersByTimeAsync(600);
		expect(await pending).toBeNull();
		vi.useRealTimers();
	});
});

describe("cacheWrap", () => {
	it("runs the loader once for concurrent misses and caches the value", async () => {
		const loader = vi.fn(async () => {
			await new Promise((r) => setTimeout(r, 10));
			return { n: 1 };
		});
		const results = await Promise.all(
			Array.from({ length: 5 }, () => cache.cacheWrap("w", 60, loader)),
		);
		expect(loader).toHaveBeenCalledTimes(1);
		expect(results.every((r) => r.n === 1)).toBe(true);
		expect(await cache.cacheWrap("w", 60, loader)).toEqual({ n: 1 });
		expect(loader).toHaveBeenCalledTimes(1);
	});

	it("does not cache failures or empty results, and lets the next call retry", async () => {
		const loader = vi
			.fn<() => Promise<unknown>>()
			.mockRejectedValueOnce(new Error("db down"))
			.mockResolvedValueOnce(null)
			.mockResolvedValue({ ok: true });
		await expect(cache.cacheWrap("f", 60, loader)).rejects.toThrow("db down");
		expect(await cache.cacheWrap("f", 60, loader)).toBeNull();
		expect(await cache.cacheWrap("f", 60, loader)).toEqual({ ok: true });
		expect(loader).toHaveBeenCalledTimes(3);
	});

	it("still serves from the loader when Redis is down", async () => {
		fake.isReady = false;
		expect(await cache.cacheWrap("d", 60, async () => 7)).toBe(7);
	});
});

describe("invalidation", () => {
	it("removes article lists by pattern with SCAN + UNLINK, nothing else", async () => {
		for (const k of ["news:list:a", "news:list:b", "feed:x", "news:article:1"])
			store.set(k, "1");
		const removed = await cache.invalidateArticleCaches();
		expect(removed).toBe(3);
		expect([...store.keys()]).toEqual(["news:article:1"]);
		expect(fake.unlink).toHaveBeenCalled();
	});

	it("unlinks in batches", async () => {
		for (let i = 0; i < 1100; i++) store.set(`tmp:${i}`, "1");
		expect(await cache.cacheDelPattern("tmp:*")).toBe(1100);
		expect(fake.unlink).toHaveBeenCalledTimes(3);
	});
});

describe("keys", () => {
	it("hashKey keeps long inputs distinct (no shared-prefix collisions)", () => {
		const base = "x".repeat(40);
		expect(cache.hashKey("rag", `${base}a`)).not.toBe(
			cache.hashKey("rag", `${base}b`),
		);
		expect(cache.hashKey("rag", "q", 1)).toBe(cache.hashKey("rag", "q", 1));
		expect(cache.hashKey("rag", "q")).toMatch(/^rag:[0-9a-f]{32}$/);
	});

	it("jitterTtl stays within ±10%", () => {
		expect(cache.jitterTtl(100, () => 0)).toBe(90);
		expect(cache.jitterTtl(100, () => 1)).toBe(110);
		expect(cache.jitterTtl(0, () => 0.5)).toBe(1);
	});
});
