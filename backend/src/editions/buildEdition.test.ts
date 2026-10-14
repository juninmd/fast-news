import { beforeEach, describe, expect, it, vi } from "vitest";
import { headline } from "./fixtures.js";
import { renderEditionHtml } from "./renderHtml.js";
import {
	createEditionSnapshot,
	hydrateSnapshot,
	parseSnapshotEnvelope,
} from "./snapshot.js";
import { buildStaticEditionSite } from "./staticSite.js";
import type { Headline } from "./types.js";

const mocks = vi.hoisted(() => ({ collect: vi.fn(), generate: vi.fn() }));
vi.mock("./collect.js", () => ({ collectHeadlines: mocks.collect }));
vi.mock("../services/llmWithFallback.js", () => ({
	generateWithFallback: mocks.generate,
}));
vi.mock("../services/marketData.js", () => ({
	fetchMarketSnapshot: async () => ({
		usdBrl: null,
		ibovespa: null,
		selicRate: null,
	}),
}));
vi.mock("../config/env.js", () => ({
	config: {
		editions: {
			maxHeadlines: 350,
			perSource: 12,
			excludedCategories: [],
			aiTimeoutMs: 1000,
		},
	},
}));

const { buildEdition } = await import("./buildEdition.js");
const window = {
	kind: "noite" as const,
	day: "2026-09-30",
	start: new Date("2026-09-30T18:00:00Z"),
	end: new Date("2026-09-30T23:00:00Z"),
};

function articles(count: number, sourceCount = 20): Headline[] {
	return Array.from({ length: count }, (_, i) =>
		headline({
			id: i + 1,
			sourceId: `00000000-0000-4000-8000-${String(i + 1).padStart(12, "0")}`,
			title: `Notícia distinta número ${i + 1}`,
			snippet: `Fato confirmado número ${i + 1}`,
			source: `Fonte ${i % sourceCount}`,
			category: "Tecnologia",
			createdAt: new Date(window.start.getTime() + i * 1000),
		}),
	);
}

beforeEach(() => {
	mocks.collect.mockReset();
	mocks.generate.mockReset();
});

describe("edition coverage beyond the AI budget", () => {
	it.each([
		[600, 20],
		[1200, 20],
		[600, 1],
		[1200, 100],
	])("publishes all %i eligible articles from %i sources even when every AI call fails", async (count, sourceCount) => {
		const rows = articles(count, sourceCount);
		mocks.collect.mockResolvedValue(rows);
		mocks.generate.mockResolvedValue(null);
		const result = await buildEdition(window);
		expect(result.coverage.selectedForAi).toBe(Math.min(350, sourceCount * 12));
		expect(result.coverage.publishedArticles).toBe(count);
		expect(result.coverage.omittedFromEdition).toBe(0);
		expect(result.draft.secoes[0]?.materias).toHaveLength(count - 1);
		const html = renderEditionHtml(result);
		for (const row of rows) {
			expect(html).toContain(row.title);
			expect(html).toContain(`href="${row.url}"`);
		}
		expect(html).not.toContain("Cobertura parcial:");
		const restored = hydrateSnapshot(
			parseSnapshotEnvelope(
				JSON.parse(JSON.stringify(createEditionSnapshot(result))),
			),
		);
		expect(renderEditionHtml(restored)).toBe(html);
		const files = buildStaticEditionSite(
			[createEditionSnapshot(result)],
			"https://example.com/fast-news",
		);
		const pages = [...files].filter(([path]) => path.startsWith("edicoes/"));
		const published = pages.map(([, content]) => content).join("\n");
		for (const row of rows) expect(published).toContain(`href="${row.url}"`);
		for (const [, content] of pages)
			expect(Buffer.byteLength(content)).toBeLessThanOrEqual(500 * 1024);
	});

	it("splits the collector's 5000-article ceiling into bounded Pages artifacts without losing sources", async () => {
		const rows = articles(5000);
		for (const row of rows) row.snippet = "Texto factual. ".repeat(15);
		mocks.collect.mockResolvedValue(rows);
		mocks.generate.mockResolvedValue(null);
		const result = await buildEdition(window);
		const files = buildStaticEditionSite(
			[createEditionSnapshot(result)],
			"https://example.com/fast-news",
		);
		const pages = [...files].filter(([path]) => path.startsWith("edicoes/"));
		expect(pages).toHaveLength(50);
		const published = pages.map(([, html]) => html).join("\n");
		for (const row of rows) expect(published).toContain(`href="${row.url}"`);
		for (const [, html] of pages) {
			expect(Buffer.byteLength(html)).toBeLessThanOrEqual(500 * 1024);
			expect(html).toContain("Página");
		}
		expect(files.get("edicoes/2026-09-30/noite/2/index.html")).not.toContain(
			'class="lead"',
		);
	});

	it("keeps the editorial cover without duplicating it and rejects model references outside its input", async () => {
		const rows = articles(600);
		mocks.collect.mockResolvedValue(rows);
		// 600 is within the selected latest items; 1 was not sent to the model.
		mocks.generate.mockImplementation(async ({ logTag }) => {
			if (logTag === "Edition:front")
				return {
					manchete: {
						titulo: "Capa editorial",
						texto: "Resumo",
						fontes: [600],
						linhaFina: "",
						paragrafos: ["Resumo"],
					},
					destaques: [],
				};
			if (logTag === "Edition:sections")
				return {
					secoes: [
						{
							nome: "Tecnologia",
							materias: [
								{ titulo: "Referência inventada", texto: "", fontes: [1] },
							],
							notas: [],
						},
					],
				};
			return { fio: [], numeros: [], leve: ["Fechamento"], quiz: [] };
		});
		const result = await buildEdition(window);
		expect(result.coverage.modelFallback).toBe(false);
		expect(result.coverage.publishedArticles).toBe(600);
		expect(result.draft.manchete.titulo).toBe("Capa editorial");
		const html = renderEditionHtml(result);
		expect(html).not.toContain("Referência inventada");
		expect(
			result.draft.secoes.flatMap((s) => s.materias).flatMap((s) => s.fontes),
		).not.toContain(600);
		expect(createEditionSnapshot(result).snapshot.generationStatus).toBe(
			"ready",
		);
	});

	it("reports omissions caused by unsafe prose after final assembly", async () => {
		const rows = articles(600);
		rows[0]!.snippet = "as an ai language model";
		mocks.collect.mockResolvedValue(rows);
		mocks.generate.mockResolvedValue(null);
		const result = await buildEdition(window);
		expect(result.coverage.publishedArticles).toBe(599);
		expect(result.coverage.omittedFromEdition).toBe(1);
		expect(renderEditionHtml(result)).toContain("Cobertura parcial:");
	});
});
