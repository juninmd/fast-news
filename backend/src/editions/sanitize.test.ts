import { describe, expect, it } from "vitest";
import { draft, headline, knownOf } from "./fixtures.js";
import { sanitizeDraft } from "./sanitize.js";

const real = [
	headline({ title: "Copom reduz Selic para 13,75%", snippet: "quinto corte" }),
	headline({ title: "Bolsa Família sobe para R$ 691" }),
	headline({ title: "Flamengo vai à semifinal" }),
	headline({ title: "Datafolha: empate técnico" }),
];
const known = knownOf(real);
const [a, b, c, d] = real.map((h) => h.id) as [number, number, number, number];
const story = (fontes: number[]) => ({ titulo: "T", texto: "x", fontes });

describe("sanitizeDraft", () => {
	it("discards stories whose sources the model invented", () => {
		const out = sanitizeDraft(
			draft({
				manchete: { ...draft().manchete, fontes: [a] },
				destaques: [story([9999]), story([b, 9999])],
			}),
			known,
		);
		expect(out.destaques).toHaveLength(1);
		expect(out.destaques[0]?.fontes).toEqual([b]);
	});

	it("promotes the first sourced highlight when the lead cites nothing real", () => {
		const out = sanitizeDraft(
			draft({ destaques: [{ ...story([c]), titulo: "Flamengo" }] }),
			known,
		);
		expect(out.manchete.titulo).toBe("Flamengo");
		expect(out.destaques).toHaveLength(0);
	});

	it("refuses to publish an edition with no sourced story at all", () => {
		expect(() => sanitizeDraft(draft(), known)).toThrow(/no sourced lead/);
	});

	it("keeps only figures that literally appear in the headlines", () => {
		const out = sanitizeDraft(
			draft({
				manchete: { ...draft().manchete, fontes: [a] },
				numeros: [
					{ rotulo: "Selic", valor: "13,75%", nota: "" },
					{ rotulo: "Piso", valor: "R$ 691", nota: "" },
					{ rotulo: "Inventado", valor: "42,5%", nota: "" },
					{ rotulo: "Sem número", valor: "alta", nota: "" },
				],
			}),
			known,
		);
		expect(out.numeros.map((n) => n.rotulo)).toEqual(["Selic", "Piso"]);
	});

	it("drops malformed quiz items instead of shipping a wrong answer key", () => {
		const out = sanitizeDraft(
			draft({
				manchete: { ...draft().manchete, fontes: [a] },
				quiz: [
					{ pergunta: "Selic?", opcoes: ["13,75%", "14%", "12%"], correta: 0 },
					{ pergunta: "Índice fora", opcoes: ["a", "b", "c"], correta: 3 },
					{ pergunta: "Duas opções", opcoes: ["a", "b"], correta: 0 },
				],
			}),
			known,
		);
		expect(out.quiz.map((q) => q.pergunta)).toEqual(["Selic?"]);
	});

	it("orders thread events by arrival time and drops threads with fewer than 3 real events", () => {
		const out = sanitizeDraft(
			draft({
				manchete: { ...draft().manchete, fontes: [a] },
				fio: [
					{
						tema: "Economia",
						eventos: [d, b, a].map((fonte) => ({ fonte, texto: `e${fonte}` })),
					},
					{
						tema: "Curto",
						eventos: [
							{ fonte: a, texto: "1" },
							{ fonte: 9999, texto: "falso" },
							{ fonte: a, texto: "repetido" },
						],
					},
				],
			}),
			known,
		);
		expect(out.fio).toHaveLength(1);
		expect(out.fio[0]?.eventos.map((e) => e.fonte)).toEqual([a, b, d]);
	});
});
