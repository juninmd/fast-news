import { canonicalUrl } from "../services/textSimilarity.js";
import { TitleIndex } from "./text.js";
import type { Headline } from "./types.js";
import { localHour } from "./window.js";

const JUNK =
	/horóscopo|horoscopo|tarot|signos?\b|resultado d[oa] (concurso|sorteio)|lotof[aá]cil|quina hoje|mega-sena sorteia|dia de sorte|lotomania|\bem oferta\b|\boferta[- ]relâmpago|\boferta (na|no|da|do) (amazon|shopee|mercado livre|magalu|americanas|casas bahia)|\bmelhor oferta|cupom|menor preço|day trade|mini-?índice|minidólar|como (ativar|acessar|baixar|apagar|ocultar|desconectar)|resumo de .+ próximo capítulo/i;

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

/** How much a copy carries: a longer snippet and an image make the better one to keep. */
function richness(h: Headline): number {
	return h.snippet.length + (h.imageUrl ? 200 : 0);
}

/**
 * Drops empty, junk, excluded-category and duplicate-title or duplicate-link
 * headlines. Copies of one link merge into the richest copy, which keeps the
 * highest engagement seen across them.
 */
export function cleanHeadlines(
	rows: Headline[],
	excludedCategories: string[],
): Headline[] {
	const excluded = new Set(excludedCategories.map((c) => c.toLowerCase()));
	const seen = new Set<string>();
	const byUrl = new Map<string, number>();
	const kept: Headline[] = [];
	for (const h of rows) {
		const key = normalizeTitle(h.title);
		if (!key || JUNK.test(h.title) || excluded.has(h.category.toLowerCase()))
			continue;
		const url = canonicalUrl(h.url);
		const at = url ? byUrl.get(url) : undefined;
		if (at !== undefined) {
			const prev = kept[at] as Headline;
			const best = richness(h) > richness(prev) ? h : prev;
			const engagement = Math.max(prev.engagement ?? 0, h.engagement ?? 0);
			kept[at] = engagement > 0 ? { ...best, engagement } : best;
			continue;
		}
		// The same title on another site is the same story from another outlet:
		// kept so the edition can list both, not dropped with its link.
		const titleOnSite = `${key}|${url.split("/")[0]}`;
		if (seen.has(titleOnSite)) continue;
		seen.add(titleOnSite);
		if (url) byUrl.set(url, kept.length);
		kept.push(h);
	}
	return kept;
}

/**
 * Groups headlines that report the same fact in other words, so the page shows
 * the story once with every outlet linked. Greedy, in input order; a group
 * stops growing at `maxSize` so the overflow starts a group of its own.
 */
export function clusterHeadlines(
	rows: Headline[],
	threshold = 0.5,
	maxSize = 4,
): Headline[][] {
	const groups: Headline[][] = [];
	const leaders = new TitleIndex<Headline[]>();
	for (const h of rows) {
		const home = leaders.find(
			h.title,
			threshold,
			(g) => g.length < maxSize && !g.some((m) => m.source === h.source),
		);
		if (home) {
			home.push(h);
			continue;
		}
		const group = [h];
		groups.push(group);
		leaders.add(h.title, group);
	}
	return groups;
}

/**
 * Picks at most `max` headlines, round-robin across sources, so one prolific
 * feed cannot crowd out the rest. Within a source the most-discussed come
 * first (HN points, Reddit votes), then the newest.
 */
export function pickForPrompt(
	rows: Headline[],
	max: number,
	perSource: number,
): Headline[] {
	const bySource = new Map<string, Headline[]>();
	for (const h of [...rows].sort(
		(a, b) =>
			(b.engagement ?? 0) - (a.engagement ?? 0) ||
			b.createdAt.getTime() - a.createdAt.getTime(),
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
export function hourlyCounts(dates: Date[], start: Date, hours = 12): number[] {
	const counts = new Array<number>(hours).fill(0);
	for (const d of dates) {
		const slot = Math.floor((d.getTime() - start.getTime()) / 3_600_000);
		if (slot >= 0 && slot < hours) counts[slot] = (counts[slot] ?? 0) + 1;
	}
	return counts;
}

export function hourLabels(start: Date): number[] {
	return Array.from({ length: 12 }, (_, i) =>
		localHour(new Date(start.getTime() + i * 3_600_000)),
	);
}
