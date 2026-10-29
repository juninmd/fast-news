import { describe, expect, it } from "vitest";
import {
	type DigestCandidate,
	isDigestPeriod,
	renderDigestScript,
	renderDigestText,
	selectDigestItems,
} from "./digestBuilder.js";

const now = new Date("2026-01-02T12:00:00Z");
const cand = (over: Partial<DigestCandidate>): DigestCandidate => ({
	id: Math.random().toString(),
	title: "Titulo unico",
	url: "https://x.test",
	source: "S",
	category: null,
	themeCategory: null,
	summary: null,
	publishedAt: "2026-01-02T10:00:00Z",
	relevanceScore: 7,
	sourceCount: 1,
	storyId: null,
	...over,
});

describe("selectDigestItems", () => {
	it("ranks by score and coverage, and drops low scores", () => {
		const out = selectDigestItems(
			[
				cand({ id: "low", title: "Baixa relevancia aqui", relevanceScore: 4 }),
				cand({
					id: "mid",
					title: "Fato intermediario sobre juros",
					relevanceScore: 7,
				}),
				cand({
					id: "big",
					title: "Crise energetica atinge Europa",
					relevanceScore: 7,
					sourceCount: 8,
				}),
			],
			"daily",
			now,
		);
		expect(out.map((i) => i.id)).toEqual(["big", "mid"]);
		expect(out.map((i) => i.rank)).toEqual([1, 2]);
	});

	it("keeps one article per story and skips near-identical titles", () => {
		const out = selectDigestItems(
			[
				cand({
					id: "a",
					storyId: "s1",
					title: "Outro angulo da mesma historia",
				}),
				cand({
					id: "b",
					storyId: "s1",
					title: "Banco Central mantém Selic estável",
					relevanceScore: 8,
				}),
				cand({ id: "c", title: "Banco Central mantém Selic estável hoje" }),
			],
			"daily",
			now,
		);
		expect(out.map((i) => i.id)).toEqual(["b"]);
	});

	it("filters junk headlines", () => {
		expect(
			selectDigestItems(
				[cand({ title: "Horóscopo de hoje para todos os signos" })],
				"daily",
				now,
			),
		).toEqual([]);
	});

	it("uses a stricter bar for longer periods", () => {
		expect(
			selectDigestItems([cand({ relevanceScore: 7 })], "monthly", now),
		).toEqual([]);
		expect(
			selectDigestItems([cand({ relevanceScore: 7 })], "weekly", now),
		).toHaveLength(1);
	});
});

describe("renderers", () => {
	const items = selectDigestItems(
		[cand({ title: "Titulo A.", source: "Fonte X" })],
		"4h",
		now,
	);
	it("builds a spoken script without URLs", () => {
		const script = renderDigestScript(items, "4h", now);
		expect(script).toContain("Primeiro: Titulo A. Fonte: Fonte X.");
		expect(script).not.toContain("http");
	});
	it("handles an empty window", () => {
		expect(renderDigestText([], "daily", now)).toContain("sem destaques");
	});
	it("validates periods", () => {
		expect(isDigestPeriod("weekly")).toBe(true);
		expect(isDigestPeriod("yearly")).toBe(false);
	});
});
