import { beforeEach, describe, expect, it, vi } from "vitest";

const searchSimilarArticles = vi.fn();
vi.mock("./rag.js", () => ({ searchSimilarArticles }));

const query = vi.fn();
vi.mock("../database/client.js", () => ({ query }));

const cacheGet = vi.fn();
const cacheSet = vi.fn();
vi.mock("./cache.js", () => ({ cacheGet, cacheSet }));

const { keywordPatterns, searchArticles } = await import("./articleSearch.js");

beforeEach(() => {
	vi.clearAllMocks();
});

const row = {
	id: "a1",
	title: "Inteligência artificial no Brasil",
	summary: "Um resumo curto",
	url: "https://example.com/a1",
	source: "example",
	category: "Tecnologia",
	published_at: "2026-10-17T10:00:00.000Z",
	image_url: null,
};

describe("searchArticles", () => {
	it("keeps the semantic answer when the embedding model works", async () => {
		const items = [{ id: "sem", similarity: 0.91 }];
		searchSimilarArticles.mockResolvedValueOnce(items);

		const result = await searchArticles("inteligência artificial", {
			limit: 5,
		});

		expect(result).toEqual({ mode: "semantic", items });
	});

	it("answers with keyword rows when the embedding model is in cooldown", async () => {
		searchSimilarArticles.mockRejectedValueOnce(
			new Error("No deployments available for selected model"),
		);
		cacheGet.mockResolvedValueOnce(null);
		query.mockResolvedValueOnce({ rows: [row] });

		const result = await searchArticles("inteligência artificial", {
			limit: 5,
		});

		expect(result.mode).toBe("keyword");
		expect(result.items).toHaveLength(1);
		expect(result.items[0]).toMatchObject({
			id: "a1",
			content: "Um resumo curto",
			similarity: null,
		});
		expect(cacheSet).toHaveBeenCalled();
	});

	it("does not scan the table when the query has no usable word", async () => {
		searchSimilarArticles.mockRejectedValueOnce(new Error("cooldown"));

		const result = await searchArticles("a b", { limit: 5 });

		expect(result).toEqual({ mode: "keyword", items: [] });
		expect(query).not.toHaveBeenCalled();
	});
});

describe("keywordPatterns", () => {
	it("matches both the accented and the stripped spelling", () => {
		expect(keywordPatterns("inteligência artificial")).toEqual([
			"%inteligência%",
			"%inteligencia%",
			"%artificial%",
		]);
	});

	it("drops words too short to be selective", () => {
		expect(keywordPatterns("de ia ok")).toEqual([]);
	});

	it("caps the fan-out at six words", () => {
		expect(
			keywordPatterns("alfa bravo charlie delta echo foxtrot golf"),
		).toHaveLength(6);
	});
});
