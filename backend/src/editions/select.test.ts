import { describe, expect, it } from "vitest";
import { headline } from "./fixtures.js";
import { cleanHeadlines, hourlyCounts, pickForPrompt } from "./select.js";

describe("cleanHeadlines", () => {
	it("removes lottery, horoscope and shopping noise so it never reaches the front page", () => {
		const rows = [
			headline({ title: "Horóscopo do dia: previsão para os 12 signos" }),
			headline({ title: "Lotofácil 3781 sorteia R$ 2 milhões" }),
			headline({ title: "Galaxy A37 em oferta com cupom" }),
			headline({ title: "Copom reduz Selic para 13,75%" }),
		];
		expect(cleanHeadlines(rows, []).map((h) => h.title)).toEqual([
			"Copom reduz Selic para 13,75%",
		]);
	});

	it("drops excluded categories and the same story repeated with other accents or case", () => {
		const rows = [
			headline({ title: "Fachin cancela sessão do STF" }),
			headline({ title: "FACHIN CANCELA SESSAO DO STF", source: "Poder360" }),
			headline({ title: "Novo trailer de GTA 6", category: "Gaming" }),
		];
		const out = cleanHeadlines(rows, ["gaming"]);
		expect(out).toHaveLength(1);
		expect(out[0]?.title).toBe("Fachin cancela sessão do STF");
	});
});

describe("pickForPrompt", () => {
	it("keeps one prolific feed from crowding out the others", () => {
		const flood = Array.from({ length: 50 }, () =>
			headline({ source: "Flood" }),
		);
		const others = ["A", "B", "C"].map((s) => headline({ source: s }));
		const picked = pickForPrompt([...flood, ...others], 10, 5);
		expect(picked).toHaveLength(8);
		expect(picked.filter((h) => h.source === "Flood")).toHaveLength(5);
		expect(new Set(picked.map((h) => h.source))).toEqual(
			new Set(["Flood", "A", "B", "C"]),
		);
	});

	it("respects the total budget and returns headlines in chronological order", () => {
		const rows = Array.from({ length: 30 }, (_, i) =>
			headline({ source: `S${i}` }),
		);
		const picked = pickForPrompt(rows, 12, 3);
		expect(picked).toHaveLength(12);
		const times = picked.map((h) => h.createdAt.getTime());
		expect(times).toEqual([...times].sort((a, b) => a - b));
	});
});

describe("hourlyCounts", () => {
	it("buckets by hour from the window start and ignores anything outside it", () => {
		const start = new Date("2026-09-18T10:00:00Z");
		const counts = hourlyCounts(
			[
				new Date("2026-09-18T10:05:00Z"),
				new Date("2026-09-18T10:59:59Z"),
				new Date("2026-09-18T21:30:00Z"),
				new Date("2026-09-18T09:59:00Z"),
				new Date("2026-09-18T22:00:00Z"),
			],
			start,
		);
		expect(counts[0]).toBe(2);
		expect(counts[11]).toBe(1);
		expect(counts.reduce((a, b) => a + b, 0)).toBe(3);
	});
});
