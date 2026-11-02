import { describe, expect, it } from "vitest";
import { draft, headline, knownOf } from "./fixtures.js";
import { relatedIds } from "./relevance.js";
import { sanitizeDraft } from "./sanitize.js";

const militao = headline({
	title: "Casa de Éder Militão é invadida durante clássico",
	source: "Folha",
});
const bbc = headline({
	title: "Real Madrid defender Eder Militao's home burgled during Madrid derby",
	snippet: "Thieves took jewellery from the Brazilian's house",
});
const midterms = headline({
	title: "Análise: Democratas podem fazer onda azul na Câmara dos EUA",
	source: "CNN Brasil",
});
const toilets = headline({
	title: "World's best toilets",
	source: "Hacker News",
});

describe("relatedIds", () => {
	const known = knownOf([militao, bbc, midterms, toilets]);
	const story =
		"Casa de Éder Militão é invadida e jogador perde R$ 2,2 milhões";

	it("drops cited headlines that share nothing with the story", () => {
		expect(
			relatedIds([militao.id, bbc.id, midterms.id, toilets.id], known, story),
		).toEqual([militao.id, bbc.id]);
	});

	it("keeps an English outlet that names the same person", () => {
		expect(relatedIds([militao.id, bbc.id], known, story)).toEqual([
			militao.id,
			bbc.id,
		]);
	});

	it("promotes the headline that matches when the first citation is wrong", () => {
		expect(relatedIds([midterms.id, militao.id], known, story)).toEqual([
			militao.id,
		]);
	});

	it("keeps the first citation when nothing matches, so the story keeps a source", () => {
		expect(relatedIds([toilets.id, midterms.id], known, story)).toEqual([
			toilets.id,
		]);
	});

	it("leaves a single citation alone", () => {
		expect(relatedIds([toilets.id], known, story)).toEqual([toilets.id]);
	});
});

describe("sanitizeDraft source relevance", () => {
	it("publishes the story without the unrelated outlets", () => {
		const known = knownOf([militao, bbc, midterms, toilets]);
		const out = sanitizeDraft(
			draft({
				manchete: {
					titulo:
						"Casa de Éder Militão é invadida e jogador perde R$ 2,2 milhões",
					texto: "",
					linhaFina: "",
					paragrafos: [],
					fontes: [militao.id, bbc.id, midterms.id, toilets.id],
				},
			}),
			known,
		);
		expect(out.manchete.fontes).toEqual([militao.id, bbc.id]);
	});
});
