import { describe, expect, it } from "vitest";
import { clipWords, TitleIndex } from "./text.js";

describe("clipWords", () => {
	it("leaves text that fits untouched", () => {
		expect(clipWords("Selic cai para 13,75%", 50)).toBe(
			"Selic cai para 13,75%",
		);
	});

	it("cuts at a word boundary instead of mid-word", () => {
		const out = clipWords(
			"Eleições no Brasil: segundo turno entre Lula e Flávio",
			45,
		);
		expect(out).toBe("Eleições no Brasil: segundo turno entre Lula…");
		expect(out.length).toBeLessThanOrEqual(45);
	});

	it("hard-cuts a single very long word", () => {
		expect(clipWords("x".repeat(100), 10)).toBe(`${"x".repeat(9)}…`);
	});
});

describe("TitleIndex", () => {
	it("finds the same story in other words but not a different score", () => {
		const idx = new TitleIndex<string>();
		idx.add("Flamengo vence o Vasco por 2 a 1 no Maracanã", "a");
		expect(idx.find("Flamengo vence Vasco por 2 a 1 no Maracanã", 0.5)).toBe(
			"a",
		);
		expect(
			idx.find("Flamengo perde do Vasco por 3 a 0 no Maracanã", 0.5),
		).toBeUndefined();
	});
});
