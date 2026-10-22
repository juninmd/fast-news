import { describe, expect, it, vi } from "vitest";

vi.mock("../config/env.js", () => ({
	config: { llmBudget: { translationPerDay: 10 } },
}));
vi.mock("../database/client.js", () => ({ query: vi.fn() }));
vi.mock("./llmWithFallback.js", () => ({ generateWithFallback: vi.fn() }));

const { buildTranslationPrompt, detectLang, isLang, parseTranslations } =
	await import("./translation.js");

describe("detectLang", () => {
	it("recognises the three supported languages", () => {
		expect(detectLang("O Banco Central mantém a Selic acima do esperado")).toBe(
			"pt",
		);
		expect(detectLang("The Fed holds rates after the meeting")).toBe("en");
		expect(detectLang("El Banco Central mantiene los tipos para el año")).toBe(
			"es",
		);
	});
	it("returns null when unsure so the model decides", () => {
		expect(detectLang("OpenAI GPT")).toBeNull();
	});
});

describe("parseTranslations", () => {
	it("maps by index and ignores invented, empty or duplicate entries", () => {
		const out = parseTranslations(
			[
				{ i: 0, text: " Hello  world " },
				{ i: 5, text: "invented" },
				{ i: 1, text: "   " },
				{ i: 0, text: "dup" },
			],
			2,
		);
		expect([...out]).toEqual([[0, "Hello world"]]);
	});
});

describe("prompt / lang guard", () => {
	it("numbers the titles", () => {
		expect(buildTranslationPrompt(["a", "b"], "en")).toContain("0: a\n1: b");
	});
	it("validates languages", () => {
		expect(isLang("en")).toBe(true);
		expect(isLang("fr")).toBe(false);
	});
});
