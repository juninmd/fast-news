import { describe, expect, it } from "vitest";
import { computeTrends, storyHeat, type TrendArticle } from "./trends.js";

const NOW = new Date("2026-10-19T12:00:00Z");
const hoursAgo = (h: number) => new Date(NOW.getTime() - h * 3_600_000);

let n = 0;
function art(
	title: string,
	source: string,
	h: number,
	theme = "Mundo",
): TrendArticle {
	return { id: `a${n++}`, title, source, theme, publishedAt: hoursAgo(h) };
}

describe("computeTrends", () => {
	it("surfaces a term covered by several outlets and growing", () => {
		const articles = [
			art("Furacão Milton atinge a Flórida", "G1", 2),
			art("Furacão Milton deixa milhões sem energia", "BBC", 3),
			art("Furacão Milton: o que se sabe", "Folha", 5),
			art("Furacão Milton muda de rota", "CNN", 6),
			art("Selic mantida pelo Copom", "G1", 4),
			art("Receita da semana", "Folha", 7),
		];
		const report = computeTrends(articles, { now: NOW });
		expect(report.terms[0]?.term).toBe("furacão milton");
		expect(report.terms[0]?.sources).toBe(4);
		expect(report.terms[0]?.count).toBe(4);
		expect(report.totalArticles).toBe(6);
	});

	it("requires more than one outlet", () => {
		const articles = [
			art("Promoção relâmpago de notebook", "Loja", 1),
			art("Promoção relâmpago de celular", "Loja", 2),
			art("Promoção relâmpago de tablet", "Loja", 3),
		];
		expect(computeTrends(articles, { now: NOW }).terms).toEqual([]);
	});

	it("damps evergreen terms that were just as frequent in the previous window", () => {
		const fresh = [
			art("Bolsa fecha em alta", "A", 2),
			art("Bolsa fecha em queda", "B", 3),
			art("Bolsa fecha estável", "C", 4),
		];
		const old = Array.from({ length: 9 }, (_, i) =>
			art(`Bolsa abre ${i}`, i % 2 ? "A" : "B", 26 + i),
		);
		const report = computeTrends(
			[
				...fresh,
				...old,
				art("Eleições: apuração segue", "A", 1),
				art("Eleições: apuração avança", "B", 2),
				art("Eleições: apuração termina", "C", 3),
			],
			{ now: NOW },
		);
		const bolsa = report.terms.find((t) => t.term === "bolsa");
		const apuracao = report.terms.find((t) => t.term.includes("apuração"));
		expect(apuracao).toBeDefined();
		expect(bolsa ? bolsa.score : 0).toBeLessThan(apuracao?.score ?? 0);
	});

	it("keeps the phrase and drops the contained word", () => {
		const articles = [
			art("Donald Trump anuncia tarifa", "A", 1),
			art("Donald Trump defende tarifa", "B", 2),
			art("Donald Trump fala sobre tarifa", "C", 3),
		];
		const terms = computeTrends(articles, { now: NOW }).terms.map(
			(t) => t.term,
		);
		expect(terms).toContain("donald trump");
		expect(terms).not.toContain("donald");
		expect(terms).not.toContain("trump");
	});

	it("buckets mentions for the sparkline and ranks themes", () => {
		const articles = [
			art("Chip novo da Nvidia", "A", 1, "Tecnologia"),
			art("Chip novo da Nvidia impressiona", "B", 11, "Tecnologia"),
			art("Chip novo da Nvidia chega", "C", 23, "Tecnologia"),
			art("Time vence a final", "A", 2, "Esportes"),
		];
		const report = computeTrends(articles, { now: NOW });
		// "chip", "novo", "nvidia" and their phrases cover the same three articles: one topic.
		expect(report.terms).toHaveLength(1);
		expect(report.terms[0]?.hourly).toHaveLength(12);
		expect(report.terms[0]?.hourly.reduce((a, b) => a + b, 0)).toBe(3);
		expect(report.themes[0]).toMatchObject({ theme: "Tecnologia", count: 3 });
		expect(report.themes[0]?.share).toBeCloseTo(0.75);
	});
});

describe("storyHeat", () => {
	it("favours breadth over volume and decays with age", () => {
		const wide = storyHeat(
			{ sources: 6, articles: 6, lastUpdatedAt: hoursAgo(1) },
			NOW,
		);
		const loud = storyHeat(
			{ sources: 1, articles: 12, lastUpdatedAt: hoursAgo(1) },
			NOW,
		);
		const stale = storyHeat(
			{ sources: 6, articles: 6, lastUpdatedAt: hoursAgo(25) },
			NOW,
		);
		expect(wide).toBeGreaterThan(loud);
		expect(stale).toBeLessThan(wide / 3);
	});
});
