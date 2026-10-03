import { describe, expect, it } from "vitest";
import { draft, edition, headline, knownOf } from "./fixtures.js";
import { mdEscape, renderEditionMarkdown } from "./renderMarkdown.js";

describe("renderEditionMarkdown", () => {
	it("produces a slugged article with frontmatter and linked sources", () => {
		const h = headline({ source: "Folha", url: "https://example.com/a" });
		const out = renderEditionMarkdown(
			edition(
				draft({
					manchete: {
						titulo: "Grande manchete",
						texto: "",
						fontes: [h.id],
						linhaFina: "Resumo da edição",
						paragrafos: ["Primeiro parágrafo."],
					},
					secoes: [
						{
							nome: "Economia",
							materias: [{ titulo: "Juros", texto: "Texto.", fontes: [h.id] }],
							notas: ["Nota rápida"],
						},
					],
					quiz: [{ pergunta: "Qual?", opcoes: ["A", "B"], correta: 1 }],
				}),
				knownOf([h]),
			),
		);
		expect(out.slug).toBe("2026-09-18-noite");
		expect(out.title).toBe("O Fio — Edição da Noite, 18/09/2026");
		expect(out.markdown).toMatch(/^---\ntitle: "O Fio — Edição da Noite/);
		expect(out.markdown).toContain("date: 2026-09-18");
		expect(out.markdown).toContain("# Grande manchete");
		expect(out.markdown).toContain("## Economia");
		expect(out.markdown).toContain("### Juros");
		expect(out.markdown).toContain("[Folha](<https://example.com/a>)");
		expect(out.markdown).toContain("::: details Resposta");
	});

	it("neutralises raw HTML, Vue interpolation and markdown syntax", () => {
		const text = mdEscape("<script>x</script> {{ 1+1 }} **b** [l](u)");
		expect(text).not.toMatch(/<|\{\{/);
		expect(text).toContain("\\*\\*b\\*\\*");
		expect(mdEscape("# título")).toBe("\\# título");
		expect(mdEscape("1. item")).toBe("1\\. item");
		expect(mdEscape(":::danger")).toBe("\\:::danger");
	});

	it("drops links with unsafe protocols", () => {
		const h = headline({ source: "X", url: "javascript:alert(1)" });
		const out = renderEditionMarkdown(
			edition(
				draft({
					destaques: [{ titulo: "T", texto: "", fontes: [h.id] }],
				}),
				knownOf([h]),
			),
		);
		expect(out.markdown).not.toContain("javascript:");
	});
});
