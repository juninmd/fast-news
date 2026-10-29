import { stripAccents, titleSimilarity } from "./textSimilarity.js";

export type DigestPeriod = "4h" | "daily" | "weekly" | "monthly";

export const DIGEST_PERIODS: Record<
	DigestPeriod,
	{ hours: number; limit: number; label: string; minScore: number }
> = {
	"4h": { hours: 4, limit: 8, label: "Últimas 4 horas", minScore: 6 },
	daily: { hours: 24, limit: 12, label: "Resumo do dia", minScore: 6 },
	weekly: { hours: 24 * 7, limit: 20, label: "Resumo da semana", minScore: 7 },
	monthly: { hours: 24 * 30, limit: 25, label: "Resumo do mês", minScore: 8 },
};

export function isDigestPeriod(v: unknown): v is DigestPeriod {
	return typeof v === "string" && v in DIGEST_PERIODS;
}

export interface DigestCandidate {
	id: string;
	title: string;
	url: string;
	source: string;
	category: string | null;
	themeCategory: string | null;
	summary: string | null;
	publishedAt: Date | string | null;
	relevanceScore: number | null;
	sourceCount: number;
	storyId: string | null;
}

export interface DigestItem extends DigestCandidate {
	rank: number;
}

const JUNK = /horóscopo|horoscopo|frase do dia|signos?\b|tarot|bbb\d*\b/i;

/**
 * Ranks without any model: the relevance score is already stored by ingestion,
 * and coverage by several outlets (a story seen in N sources) boosts it.
 */
export function rankCandidate(
	c: DigestCandidate,
	now: Date,
	hours: number,
): number {
	const score = c.relevanceScore ?? 5;
	const coverage = Math.min(Math.log2(Math.max(1, c.sourceCount)), 3);
	const published = c.publishedAt
		? new Date(c.publishedAt).getTime()
		: now.getTime();
	const ageH = Math.max(0, (now.getTime() - published) / 3_600_000);
	// Recent items win ties; the decay is mild so a big story from earlier in the window still ranks.
	const recency = 1 - Math.min(ageH / hours, 1) * 0.5;
	return (score + coverage) * recency;
}

/** Highest-ranked items, one per story and no near-identical headlines. */
export function selectDigestItems(
	candidates: DigestCandidate[],
	period: DigestPeriod,
	now: Date = new Date(),
): DigestItem[] {
	const spec = DIGEST_PERIODS[period];
	const ranked = candidates
		.filter((c) => !JUNK.test(stripAccents(c.title)))
		.filter((c) => (c.relevanceScore ?? 5) >= spec.minScore)
		.map((c) => ({ c, r: rankCandidate(c, now, spec.hours) }))
		.sort((a, b) => b.r - a.r);

	const out: DigestItem[] = [];
	const stories = new Set<string>();
	for (const { c } of ranked) {
		if (out.length >= spec.limit) break;
		if (c.storyId && stories.has(c.storyId)) continue;
		if (out.some((o) => titleSimilarity(o.title, c.title) >= 0.6)) continue;
		if (c.storyId) stories.add(c.storyId);
		out.push({ ...c, rank: out.length + 1 });
	}
	return out;
}

function fmtDate(d: Date, tz = "America/Sao_Paulo"): string {
	return d.toLocaleString("pt-BR", {
		day: "2-digit",
		month: "2-digit",
		hour: "2-digit",
		minute: "2-digit",
		timeZone: tz,
	});
}

export function renderDigestMarkdown(
	items: DigestItem[],
	period: DigestPeriod,
	now: Date = new Date(),
): string {
	const spec = DIGEST_PERIODS[period];
	if (!items.length) return `# ${spec.label}\n\nSem destaques no período.\n`;
	const lines = items.map((i) => {
		const outlets = i.sourceCount > 1 ? ` · ${i.sourceCount} fontes` : "";
		return `${i.rank}. [${i.title}](${i.url}) — _${i.source}_${outlets}`;
	});
	return `# ${spec.label}\n_${fmtDate(now)}_\n\n${lines.join("\n")}\n`;
}

/** Plain text for push channels: no markdown, one line per item. */
export function renderDigestText(
	items: DigestItem[],
	period: DigestPeriod,
	now: Date = new Date(),
): string {
	const spec = DIGEST_PERIODS[period];
	if (!items.length) return `${spec.label}: sem destaques no período.`;
	return `${spec.label} (${fmtDate(now)})\n\n${items
		.map((i) => `${i.rank}. ${i.title} — ${i.source}\n${i.url}`)
		.join("\n\n")}`;
}

/**
 * Spoken script for TTS (browser speechSynthesis or a server TTS): no URLs,
 * short sentences, and the headline order a listener can follow. Template
 * only — spending LLM tokens to read headlines aloud buys nothing.
 */
export function renderDigestScript(
	items: DigestItem[],
	period: DigestPeriod,
	now: Date = new Date(),
): string {
	const spec = DIGEST_PERIODS[period];
	if (!items.length) return `${spec.label}. Sem destaques no período.`;
	const intro = `Fast News. ${spec.label}, ${fmtDate(now)}. ${items.length} destaques.`;
	const body = items
		.map((i, idx) => {
			const title = i.title.replace(/\s+/g, " ").replace(/[.!?]+$/, "");
			return `${idx === 0 ? "Primeiro" : `Número ${idx + 1}`}: ${title}. Fonte: ${i.source}.`;
		})
		.join(" ");
	return `${intro} ${body} Fim do resumo.`;
}
