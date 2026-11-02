import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ query: vi.fn() }));
vi.mock("../database/client.js", () => ({ query: mocks.query }));

const { collectHeadlines } = await import("./collect.js");
const { isFactCheck } = await import("./select.js");

const window = {
	kind: "noite" as const,
	day: "2026-09-30",
	start: new Date("2026-09-30T18:00:00Z"),
	end: new Date("2026-09-30T23:00:00Z"),
};
const row = (over: Record<string, unknown>) => ({
	id: "a",
	title: "Título",
	source: "Folha",
	category: "Brasil",
	url: "https://example.com/a",
	snippet: "",
	created_at: new Date("2026-09-30T19:00:00Z"),
	image_url: null,
	...over,
});

describe("collectHeadlines", () => {
	beforeEach(() => mocks.query.mockReset());

	it("names the outlet, not the feed", async () => {
		mocks.query.mockResolvedValue({
			rows: [row({ source: "Folha de S.Paulo - Esporte - Principal" })],
		});
		const [h] = await collectHeadlines(window);
		expect(h?.source).toBe("Folha de S.Paulo");
	});

	it("still recognizes the g1 fact-check feed after the label is shortened", async () => {
		mocks.query.mockResolvedValue({
			rows: [row({ source: "g1 &gt; Fato ou Fake", category: "Brasil" })],
		});
		const [h] = await collectHeadlines(window);
		expect(h?.source).toBe("g1");
		expect(h && isFactCheck(h)).toBe(true);
	});
});
