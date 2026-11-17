import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../config/env.js", () => ({
	config: {
		llmBudget: { relevancePerDay: 0 },
		ingestion: { analysisConcurrency: 2 },
	},
}));
const query = vi.fn();
vi.mock("../database/client.js", () => ({ query }));
const generateWithFallback = vi.fn();
vi.mock("./llmWithFallback.js", () => ({ generateWithFallback }));

const { analyzeArticle, fallbackTheme } = await import("./articleAnalysis.js");

const modelAnswer = {
	relevanceScore: 7,
	isSpamOrPromo: false,
	isDuplicateOrRehash: false,
	shouldPostTelegram: true,
	reason: "relevante",
	theme: "Economia",
};

beforeEach(() => {
	query.mockReset();
	generateWithFallback.mockReset();
});

describe("analyzeArticle", () => {
	it("faz uma chamada só para tema + relevância e grava os dois", async () => {
		query.mockResolvedValue({ rows: [] });
		generateWithFallback.mockResolvedValue(modelAnswer);
		const r = await analyzeArticle({
			id: "a1",
			title: "Selic sobe",
			content: "c",
			category: "Economia",
			storyId: "s1",
		});
		expect(generateWithFallback).toHaveBeenCalledTimes(1);
		expect(generateWithFallback.mock.calls[0][0].prompt).toContain("theme");
		expect(r?.theme).toBe("Economia");
		const update = query.mock.calls.find(([sql]) =>
			String(sql).includes("UPDATE news_articles"),
		);
		expect(update?.[1]).toEqual([
			"Economia",
			7,
			"relevante",
			false,
			true,
			"a1",
		]);
	});

	it("cópia de história já analisada herda sem chamar o modelo e não posta de novo", async () => {
		query.mockImplementation(async (sql: string) =>
			sql.includes("FROM story_articles")
				? {
						rows: [
							{
								theme_category: "Mundo",
								relevance_score: 8,
								relevance_reasoning: "x",
								is_spam_or_promo: false,
							},
						],
					}
				: { rows: [] },
		);
		const r = await analyzeArticle({
			id: "a2",
			title: "Mesma notícia",
			content: "c",
			category: "Mundo",
			storyId: "s1",
		});
		expect(generateWithFallback).not.toHaveBeenCalled();
		expect(r?.theme).toBe("Mundo");
		expect(r?.relevance.shouldPostTelegram).toBe(false);
	});

	it("duas cópias no mesmo run: a segunda espera a primeira", async () => {
		query.mockResolvedValue({ rows: [] });
		generateWithFallback.mockResolvedValue(modelAnswer);
		const base = { content: "c", category: "Economia", storyId: "s9" };
		const [a, b] = await Promise.all([
			analyzeArticle({ ...base, id: "x1", title: "A" }),
			analyzeArticle({ ...base, id: "x2", title: "A'" }),
		]);
		expect(generateWithFallback).toHaveBeenCalledTimes(1);
		expect(a?.relevance.shouldPostTelegram).toBe(true);
		expect(b?.relevance.shouldPostTelegram).toBe(false);
	});

	it("sem modelo, o tema cai para a categoria do feed", async () => {
		query.mockResolvedValue({ rows: [] });
		generateWithFallback.mockResolvedValue(null);
		expect(
			await analyzeArticle({
				id: "z",
				title: "t",
				content: "c",
				category: "Gaming",
			}),
		).toBeNull();
		expect(query.mock.calls.at(-1)?.[1]).toEqual(["Gaming", "z"]);
		expect(fallbackTheme("fofoca")).toBe("Mundo");
	});
});
