import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fetchMarketSnapshot } from "./marketData.js";

const originalFetch = globalThis.fetch;

afterEach(() => {
	globalThis.fetch = originalFetch;
});

describe("fetchMarketSnapshot", () => {
	it("parses dólar, Ibovespa and Selic from the two sources", async () => {
		globalThis.fetch = vi.fn(async (url: string | URL) => {
			const href = url.toString();
			if (href.includes("hgbrasil.com")) {
				return new Response(
					JSON.stringify({
						results: {
							currencies: { USD: { buy: 5.14, variation: 0.35 } },
							stocks: { IBOVESPA: { points: 135000, variation: -0.4 } },
						},
					}),
					{ status: 200 },
				);
			}
			return new Response(JSON.stringify([{ valor: "10.75" }]), {
				status: 200,
			});
		}) as typeof fetch;

		const snapshot = await fetchMarketSnapshot();
		expect(snapshot.usdBrl).toEqual({ value: 5.14, changePct: 0.35 });
		expect(snapshot.ibovespa).toEqual({ value: 135000, changePct: -0.4 });
		expect(snapshot.selicRate).toBe(10.75);
	});

	it("returns nulls instead of throwing when a source fails", async () => {
		globalThis.fetch = vi.fn(async () => {
			throw new Error("network down");
		}) as typeof fetch;

		const snapshot = await fetchMarketSnapshot();
		expect(snapshot).toEqual({
			usdBrl: null,
			ibovespa: null,
			selicRate: null,
		});
	});

	it("returns nulls when a source responds with a non-ok status", async () => {
		globalThis.fetch = vi.fn(
			async () => new Response("", { status: 500 }),
		) as typeof fetch;

		const snapshot = await fetchMarketSnapshot();
		expect(snapshot.usdBrl).toBeNull();
		expect(snapshot.ibovespa).toBeNull();
		expect(snapshot.selicRate).toBeNull();
	});
});
