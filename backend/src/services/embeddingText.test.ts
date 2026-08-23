import { describe, expect, it } from "vitest";
import {
	buildEmbeddingText,
	cleanForEmbedding,
	embeddingPrefix,
	normalizeVector,
	truncateOnBoundary,
	withEmbeddingPrefix,
} from "./embeddingText.js";
import { recencyWeight, rerankArticles } from "./ragRanking.js";

describe("buildEmbeddingText", () => {
	it("front-loads the headline and metadata, then the body", () => {
		const text = buildEmbeddingText({
			title: "Copom mantém a Selic em 10,5%",
			content: "<p>O Banco Central decidiu manter a taxa básica de juros.</p>",
			source: "Portal",
			category: "economia",
		});
		expect(text.startsWith("Copom mantém a Selic em 10,5%")).toBe(true);
		expect(text).toContain("economia · Portal");
		expect(text).toContain("O Banco Central decidiu manter");
		expect(text).not.toContain("<p>");
	});

	it("keeps the headline when there is no usable body", () => {
		expect(buildEmbeddingText({ title: "Dólar cai", content: "   " })).toBe(
			"Dólar cai",
		);
	});

	it("does not duplicate a body that only repeats the headline", () => {
		const text = buildEmbeddingText({
			title: "Dólar cai frente ao real",
			content: "Dólar cai frente ao real",
		});
		expect(text).toBe("Dólar cai frente ao real");
	});

	it("respects the character budget without cutting mid-word", () => {
		const text = buildEmbeddingText({
			title: "Título curto",
			content: `${"Uma frase completa sobre o assunto. ".repeat(60)}`,
			maxChars: 200,
		});
		expect(text.length).toBeLessThanOrEqual(200);
		expect(text.endsWith(" ")).toBe(false);
	});

	it("drops URLs so links never dominate the vector", () => {
		const text = buildEmbeddingText({
			title: "Notícia",
			content: "Acesse https://portal.com.br/muito/longo/link para saber mais.",
		});
		expect(text).not.toContain("http");
	});
});

describe("embedding prefixes", () => {
	it("uses asymmetric prefixes for nomic and e5", () => {
		expect(embeddingPrefix("nomic-embed-text", "document")).toBe(
			"search_document: ",
		);
		expect(embeddingPrefix("nomic-embed-text", "query")).toBe("search_query: ");
		expect(embeddingPrefix("multilingual-e5-large", "query")).toBe("query: ");
		expect(embeddingPrefix("text-embedding-3-small", "query")).toBe("");
	});

	it("never applies the prefix twice", () => {
		const once = withEmbeddingPrefix("texto", "nomic-embed-text", "query");
		expect(withEmbeddingPrefix(once, "nomic-embed-text", "query")).toBe(once);
	});
});

describe("normalizeVector", () => {
	it("returns a unit vector", () => {
		const normalized = normalizeVector([3, 4]);
		expect(normalized[0]).toBeCloseTo(0.6);
		expect(normalized[1]).toBeCloseTo(0.8);
	});

	it("leaves a zero vector untouched", () => {
		expect(normalizeVector([0, 0])).toEqual([0, 0]);
	});
});

describe("truncateOnBoundary", () => {
	it("cuts at the last sentence end inside the budget", () => {
		expect(
			truncateOnBoundary("Primeira frase aqui. Segunda frase bem maior.", 30),
		).toBe("Primeira frase aqui.");
	});
});

describe("cleanForEmbedding", () => {
	it("removes markup, emails and collapses whitespace", () => {
		expect(
			cleanForEmbedding("<b>Contato</b>   redacao@portal.com  agora"),
		).toBe("Contato agora");
	});
});

describe("rerankArticles", () => {
	const now = Date.parse("2026-01-10T00:00:00Z");
	const base = { content: "", category: "", image_url: null };

	it("prefers fresher coverage when relevance is close", () => {
		const ranked = rerankArticles(
			[
				{
					...base,
					id: "old",
					title: "Reforma tributária avança no Senado federal",
					url: "u1",
					source: "A",
					published_at: "2025-12-01T00:00:00Z",
					similarity: 0.82,
				},
				{
					...base,
					id: "new",
					title: "Senado aprova texto final da reforma",
					url: "u2",
					source: "B",
					published_at: "2026-01-09T00:00:00Z",
					similarity: 0.8,
				},
			],
			{ halfLifeDays: 7, now },
		);
		expect(ranked[0].id).toBe("new");
	});

	it("collapses the same story syndicated by several portals", () => {
		const ranked = rerankArticles(
			[
				{
					...base,
					id: "a",
					title: "Governo anuncia pacote de corte de gastos públicos",
					url: "u1",
					source: "A",
					published_at: "2026-01-09T00:00:00Z",
					similarity: 0.9,
				},
				{
					...base,
					id: "b",
					title: "Governo anuncia pacote de corte de gastos públicos",
					url: "u2",
					source: "B",
					published_at: "2026-01-09T00:00:00Z",
					similarity: 0.88,
				},
			],
			{ now },
		);
		expect(ranked).toHaveLength(1);
		expect(ranked[0].id).toBe("a");
	});

	it("caps how many results a single source contributes", () => {
		const articles = Array.from({ length: 5 }, (_, i) => ({
			...base,
			id: `a${i}`,
			title: `Assunto totalmente distinto número ${i} publicado hoje`,
			url: `u${i}`,
			source: "MesmoPortal",
			published_at: "2026-01-09T00:00:00Z",
			similarity: 0.9 - i * 0.01,
		}));
		expect(rerankArticles(articles, { maxPerSource: 2, now })).toHaveLength(2);
	});

	it("decays weight by half every half-life", () => {
		expect(recencyWeight("2026-01-03T00:00:00Z", 7, now)).toBeCloseTo(
			2 ** -1,
			1,
		);
	});
});
