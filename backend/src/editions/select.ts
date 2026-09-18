import type { Headline } from "./types.js";
import { localHour } from "./window.js";

const JUNK =
	/horóscopo|horoscopo|tarot|signos?\b|resultado d[oa] (concurso|sorteio)|lotof[aá]cil|quina hoje|mega-sena sorteia|dia de sorte|lotomania|\boferta\b|cupom|menor preço|day trade|mini-?índice|minidólar|como (ativar|acessar|baixar|apagar|ocultar|desconectar)|resumo de .+ próximo capítulo/i;

const FACT_CHECK = /^fact_check$/i;

export function isFactCheck(h: Headline): boolean {
	return FACT_CHECK.test(h.category) || /fato ou fake/i.test(h.source);
}

function normalizeTitle(title: string): string {
	return title
		.normalize("NFD")
		.replace(/[̀-ͯ]/g, "")
		.toLowerCase()
		.replace(/[^a-z0-9 ]/g, " ")
		.replace(/\s+/g, " ")
		.trim();
}

/** Drops empty, junk, excluded-category and duplicate-title headlines. */
export function cleanHeadlines(
	rows: Headline[],
	excludedCategories: string[],
): Headline[] {
	const excluded = new Set(excludedCategories.map((c) => c.toLowerCase()));
	const seen = new Set<string>();
	return rows.filter((h) => {
		const key = normalizeTitle(h.title);
		if (!key || JUNK.test(h.title) || excluded.has(h.category.toLowerCase()))
			return false;
		if (seen.has(key)) return false;
		seen.add(key);
		return true;
	});
}

/**
 * Picks at most `max` headlines, round-robin across sources (newest first
 * within each source), so one prolific feed cannot crowd out the rest.
 */
export function pickForPrompt(
	rows: Headline[],
	max: number,
	perSource: number,
): Headline[] {
	const bySource = new Map<string, Headline[]>();
	for (const h of [...rows].sort(
		(a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
	)) {
		const list = bySource.get(h.source) ?? [];
		if (list.length < perSource) list.push(h);
		bySource.set(h.source, list);
	}
	const queues = [...bySource.values()];
	const picked: Headline[] = [];
	for (let round = 0; picked.length < max && round < perSource; round++) {
		for (const q of queues) {
			const h = q[round];
			if (h) picked.push(h);
			if (picked.length >= max) break;
		}
	}
	return picked.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
}

/** Articles per local hour; index 0 is the window's first hour. */
export function hourlyCounts(dates: Date[], start: Date): number[] {
	const counts = new Array<number>(12).fill(0);
	for (const d of dates) {
		const slot = Math.floor((d.getTime() - start.getTime()) / 3_600_000);
		if (slot >= 0 && slot < 12) counts[slot] = (counts[slot] ?? 0) + 1;
	}
	return counts;
}

export function hourLabels(start: Date): number[] {
	return Array.from({ length: 12 }, (_, i) =>
		localHour(new Date(start.getTime() + i * 3_600_000)),
	);
}
