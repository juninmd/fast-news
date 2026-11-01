import { describe, expect, it, vi } from "vitest";
import { draft } from "./fixtures.js";
import { type Translator, translateDraft } from "./translate.js";
import type { EditionDraft } from "./types.js";

vi.mock("../config/env.js", () => ({
	config: { editions: { aiTimeoutMs: 1000 } },
}));
vi.mock("../services/llmWithFallback.js", () => ({
	generateWithFallback: vi.fn(),
}));

const story = (titulo: string, texto = "") => ({ titulo, texto, fontes: [1] });

function fixture(): EditionDraft {
	return draft({
		manchete: {
			titulo: "Binance retoma saques",
			texto: "",
			linhaFina: "",
			paragrafos: [],
			fontes: [1],
		},
		destaques: [
			story(
				"Putin Breaks Down His Isolation, With a Big Assist From Trump",
				"The Russian leader met 3 envoys this week.",
			),
		],
		secoes: [
			{
				nome: "Mundo",
				materias: [
					story(
						"Cruzeiro vence a Libertadores Feminina",
						"Final nos pênaltis.",
					),
					story("Qatar LNG carrier struck by objects in Gulf"),
				],
				notas: [],
			},
		],
		fio: [
			{
				tema: "Where are the most expensive midterm races and who is funding them?",
				eventos: [
					{ fonte: 1, texto: "Polls say the race is tight in 2 states." },
					{ fonte: 2, texto: "Candidates hit the trail on Sunday." },
				],
			},
		],
	});
}

const pt: Record<string, string> = {
	"Putin Breaks Down His Isolation, With a Big Assist From Trump":
		"Putin quebra o isolamento com ajuda de Trump",
	"The Russian leader met 3 envoys this week.":
		"O líder russo se reuniu com 3 enviados nesta semana.",
	"Qatar LNG carrier struck by objects in Gulf":
		"Navio de GNL do Catar é atingido por objetos no Golfo",
	"Where are the most expensive midterm races and who is funding them?":
		"Onde estão as disputas mais caras das eleições e quem as financia?",
	"Polls say the race is tight in 2 states.":
		"Pesquisas dizem que a disputa está apertada em 2 estados.",
	"Candidates hit the trail on Sunday.":
		"Candidatos fazem campanha no domingo.",
};

const fake: Translator = async (units) =>
	units.map((u) => ({ t: pt[u.t] ?? u.t, b: pt[u.b] ?? u.b }));

describe("translateDraft", () => {
	it("translates English titles, bodies and thread lines, leaving Portuguese alone", async () => {
		const out = await translateDraft(fixture(), fake);
		expect(out.destaques[0]).toMatchObject({
			titulo: "Putin quebra o isolamento com ajuda de Trump",
			texto: "O líder russo se reuniu com 3 enviados nesta semana.",
		});
		expect(out.secoes[0]?.materias.map((m) => m.titulo)).toEqual([
			"Cruzeiro vence a Libertadores Feminina",
			"Navio de GNL do Catar é atingido por objetos no Golfo",
		]);
		expect(out.manchete.titulo).toBe("Binance retoma saques");
		expect(out.fio[0]?.tema).toMatch(/^Onde estão as disputas/);
		expect(out.fio[0]?.eventos.map((e) => e.texto)).toEqual([
			"Pesquisas dizem que a disputa está apertada em 2 estados.",
			"Candidatos fazem campanha no domingo.",
		]);
	});

	it("does not mutate the draft it was given", async () => {
		const input = fixture();
		await translateDraft(input, fake);
		expect(input.destaques[0]?.titulo).toMatch(/^Putin Breaks/);
	});

	it("keeps the original when the translation changes a number", async () => {
		const out = await translateDraft(
			draft({
				destaques: [
					story(
						"Putin Breaks Down His Isolation, With a Big Assist From Trump",
						"The Russian leader met 3 envoys this week.",
					),
				],
			}),
			async () => [
				{
					t: "Putin quebra o isolamento com ajuda de Trump",
					b: "O líder se reuniu com 5 enviados.",
				},
			],
		);
		expect(out.destaques[0]?.titulo).toMatch(/^Putin Breaks/);
		expect(out.destaques[0]?.texto).toMatch(/^The Russian/);
	});

	it("keeps the original when the model answers in English or empty", async () => {
		const out = await translateDraft(
			draft({
				destaques: [
					story("Qatar LNG carrier struck by objects in Gulf"),
					story(
						"Where are the most expensive midterm races and who is funding them?",
					),
				],
			}),
			async () => [
				{ t: "", b: "" },
				{
					t: "Where are the most expensive races and who is funding them?",
					b: "",
				},
			],
		);
		expect(out.destaques.map((d) => d.titulo)).toEqual([
			"Qatar LNG carrier struck by objects in Gulf",
			"Where are the most expensive midterm races and who is funding them?",
		]);
	});

	it("keeps everything when the translator has nothing", async () => {
		const out = await translateDraft(fixture(), async (units) =>
			units.map(() => null),
		);
		expect(out).toEqual(fixture());
	});

	it("does not call the translator for an all-Portuguese edition", async () => {
		const spy = vi.fn(fake);
		await translateDraft(
			draft({ destaques: [story("Cruzeiro é campeão da Libertadores")] }),
			spy,
		);
		expect(spy).not.toHaveBeenCalled();
	});

	it("never adds a body to an item that had none", async () => {
		const out = await translateDraft(
			draft({
				destaques: [story("Qatar LNG carrier struck by objects in Gulf")],
			}),
			async (units) =>
				units.map(() => ({
					t: "Navio do Catar é atingido no Golfo",
					b: "Texto inventado.",
				})),
		);
		expect(out.destaques[0]).toMatchObject({
			titulo: "Navio do Catar é atingido no Golfo",
			texto: "",
		});
	});

	it("stops translating once the time budget is spent", async () => {
		const spy = vi.fn(fake);
		const out = await translateDraft(fixture(), spy, 0);
		expect(spy).not.toHaveBeenCalled();
		expect(out).toEqual(fixture());
	});

	it("sends at most a bounded number of items per call", async () => {
		const many = draft({
			destaques: Array.from({ length: 40 }, (_, i) =>
				story(
					`Where are the most expensive races and who is funding them ${i}?`,
				),
			),
		});
		const sizes: number[] = [];
		await translateDraft(many, async (units) => {
			sizes.push(units.length);
			return units.map(() => null);
		});
		expect(Math.max(...sizes)).toBeLessThanOrEqual(15);
		expect(sizes.reduce((a, b) => a + b, 0)).toBe(40);
	});
});
