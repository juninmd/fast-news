import { describe, expect, it } from "vitest";
import { isAiRelated } from "./aiScope.js";

describe("isAiRelated", () => {
	it("matches AI headlines in Portuguese and English", () => {
		expect(isAiRelated("OpenAI lança novo modelo")).toBe(true);
		expect(isAiRelated("Nova IA da Google gera vídeos")).toBe(true);
		expect(isAiRelated("Inteligência artificial muda o mercado")).toBe(true);
		expect(isAiRelated("Why LLM agents fail at long tasks")).toBe(true);
	});
	it("does not match words that merely contain the letters", () => {
		expect(isAiRelated("He said the main train was late")).toBe(false);
		expect(isAiRelated("Ele ia ao mercado quando choveu")).toBe(false);
		expect(isAiRelated("Selic fica estável")).toBe(false);
	});
	it("trusts the AI category", () => {
		expect(isAiRelated("Qualquer coisa", "", "IA")).toBe(true);
	});
	it("needs two distinct hits in the body when the title is silent", () => {
		expect(
			isAiRelated("Empresa anuncia resultado", "Citou a nvidia de passagem."),
		).toBe(false);
		expect(
			isAiRelated("Empresa anuncia resultado", "A nvidia e a openai lideram."),
		).toBe(true);
	});
});
