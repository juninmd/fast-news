import { describe, expect, it, vi } from "vitest";

vi.mock("../config/env.js", () => ({
	config: { llmBudget: { relevancePerDay: 0 } },
}));
vi.mock("../database/client.js", () => ({ query: vi.fn() }));
vi.mock("./llmWithFallback.js", () => ({ generateWithFallback: vi.fn() }));

const { buildRelevancePrompt, heuristicRelevance } = await import(
	"./relevance.js"
);

describe("heuristicRelevance", () => {
	it("scores obvious junk locally", () => {
		expect(
			heuristicRelevance("Horóscopo de hoje: veja o seu signo")?.isSpamOrPromo,
		).toBe(true);
		expect(
			heuristicRelevance("Cupom de desconto imperdível")?.relevanceScore,
		).toBe(2);
	});
	it("leaves real news to the model", () => {
		expect(heuristicRelevance("Banco Central mantém Selic em 15%")).toBeNull();
		expect(heuristicRelevance("Nvidia lança novo chip")).toBeNull();
	});
});

describe("buildRelevancePrompt", () => {
	it("appends the per-source hint only when set", () => {
		expect(buildRelevancePrompt("T", "C", "IA")).not.toContain(
			"Critério adicional",
		);
		expect(
			buildRelevancePrompt("T", "C", "IA", "Priorize papers com código aberto"),
		).toContain("Critério adicional desta fonte");
	});
	it("does not interpret $ patterns in titles", () => {
		expect(buildRelevancePrompt("Ação $& dispara", "C", "IA")).toContain(
			"Ação $& dispara",
		);
	});
});
