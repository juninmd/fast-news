import { describe, expect, it } from "vitest";
import { beatText, isEditorNote } from "./beatText.js";
import { clipSentence } from "./text.js";

describe("isEditorNote", () => {
	it.each([
		"O novo artigo confirma a retomada dos saques no domingo.",
		"Artigo traz detalhes de horário e escalações.",
		"Adiciona detalhes operacionais ao confronto já anunciado. O estado anterior descrevia o contexto.",
		"A inclusão das premiações representa uma nova camada de informação sobre o impacto.",
	])("flags a note about the article: %s", (text) => {
		expect(isEditorNote(text)).toBe(true);
	});

	it.each([
		"Senado aprova o artigo 5º da reforma por 54 votos a 12.",
		"O texto da PEC prevê mandato de cinco anos para ministros.",
		"Cruzeiro vence a final nos pênaltis e conquista o primeiro título.",
		"Atualização do boletim médico mostra melhora do presidente.",
		"Consolidação do acordo deve sair na sexta, diz ministro.",
	])("keeps real news: %s", (text) => {
		expect(isEditorNote(text)).toBe(false);
	});
});

describe("clipSentence", () => {
	it("returns text that already fits", () => {
		expect(clipSentence("Frase curta.", 200)).toBe("Frase curta.");
	});

	it("cuts at a sentence end instead of mid-sentence", () => {
		const text =
			"O Banco Central manteve a taxa Selic em 13,75% ao ano nesta quarta. A decisão foi unânime e o comitê sinalizou cautela com a inflação de serviços nos próximos meses.";
		expect(clipSentence(text, 100)).toBe(
			"O Banco Central manteve a taxa Selic em 13,75% ao ano nesta quarta.",
		);
	});

	it("falls back to a word cut with an ellipsis when no sentence ends in range", () => {
		const out = clipSentence("palavra ".repeat(40), 60);
		expect(out.endsWith("…")).toBe(true);
		expect(out.length).toBeLessThanOrEqual(60);
	});

	it("does not treat a tiny first sentence as a good cut", () => {
		const out = clipSentence(`Sim. ${"detalhe ".repeat(40)}`, 80);
		expect(out.endsWith("…")).toBe(true);
	});
});

describe("beatText", () => {
	it("strips the diamond the model prefixes", () => {
		expect(
			beatText(
				"◆ Os saques foram retomados após a reposição de US$ 6 bilhões.",
				"Binance retoma saques",
			),
		).toBe("Os saques foram retomados após a reposição de US$ 6 bilhões.");
	});

	it("uses the article headline when the note talks about the article", () => {
		expect(
			beatText(
				"O novo artigo confirma a retomada dos saques no domingo.",
				"Binance retoma saques após hack",
			),
		).toBe("Binance retoma saques após hack");
	});

	it("keeps the minus sign of a negative figure", () => {
		expect(beatText("-2,3% na produção industrial em setembro", "h")).toBe(
			"-2,3% na produção industrial em setembro",
		);
	});

	it("uses the headline when there is no note", () => {
		expect(beatText(null, "Cruzeiro é campeão")).toBe("Cruzeiro é campeão");
		expect(beatText("  ", "Cruzeiro é campeão")).toBe("Cruzeiro é campeão");
	});
});

describe("clipSentence decimals", () => {
	it("does not mistake a decimal point at the cut for a sentence end", () => {
		const text = `${"palavra ".repeat(8)}13.75 ao ano e mais texto depois`;
		const out = clipSentence(text, text.indexOf("13.") + 3);
		expect(out.endsWith("13.")).toBe(false);
		expect(out.endsWith("…")).toBe(true);
	});
});

describe("clipSentence abbreviations", () => {
	it("does not cut after Dr. or an initial", () => {
		const text = `${"Frase inicial completa sobre o caso em Brasília. "}Ele conversou com o Dr. Anthony Fauci e com Robert F. Kennedy sobre as medidas de saúde adotadas nos Estados Unidos neste ano.`;
		const out = clipSentence(text, 110);
		expect(out).not.toMatch(/(Dr|F)\.$/);
	});

	it("still cuts at a real sentence end followed by a capital", () => {
		const text = `${"O governo anunciou o pacote de medidas econômicas nesta quarta-feira em Brasília. "}Os detalhes serão divulgados na próxima semana pelo ministério.`;
		expect(clipSentence(text, 100)).toBe(
			"O governo anunciou o pacote de medidas econômicas nesta quarta-feira em Brasília.",
		);
	});
});
