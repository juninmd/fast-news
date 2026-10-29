import { afterEach, describe, expect, it, vi } from "vitest";
import { API_URL, installNativeFetch, resolveApiUrl } from "./apiBase";

describe("apiBase", () => {
	afterEach(() => {
		delete globalThis.Capacitor;
		vi.restoreAllMocks();
	});

	it("prefixes only /api and /health paths", () => {
		expect(resolveApiUrl("/api/news?x=1")).toBe(`${API_URL}/api/news?x=1`);
		expect(resolveApiUrl("/health")).toBe(`${API_URL}/health`);
		expect(resolveApiUrl("https://r.jina.ai/x")).toBe("https://r.jina.ai/x");
	});

	it("does not touch fetch in the browser", () => {
		const before = globalThis.fetch;
		installNativeFetch();
		expect(globalThis.fetch).toBe(before);
	});

	it("rewrites relative calls on native platforms", async () => {
		const spy = vi.fn().mockResolvedValue({ ok: true });
		vi.stubGlobal("fetch", spy);
		globalThis.Capacitor = { isNativePlatform: () => true };
		installNativeFetch();
		await globalThis.fetch("/api/news");
		expect(spy).toHaveBeenCalledWith(`${API_URL}/api/news`, undefined);
		vi.unstubAllGlobals();
	});
});
