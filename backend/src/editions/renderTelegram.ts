import { directUrl, esc } from "./escape.js";
import {
	type Delivered,
	NOT_DELIVERED,
	outlets,
	planTelegramMedia,
	type TelegramMedia,
} from "./telegramMedia.js";
import { clipWords } from "./text.js";
import { kindMark } from "./threadKind.js";
import type { Edition, Story, Thread } from "./types.js";
import { formatLocalDate, formatLocalTime } from "./window.js";

export const TELEGRAM_LIMIT = 4096;
const LABEL: Record<string, string> = {
	manha: "Edição da Manhã",
	meiodia: "Edição do Meio-dia",
	tarde: "Edição da Tarde",
	noite: "Edição da Noite",
	especial: "Edição Especial Consolidada",
};

function header(e: Edition): string {
	const w = e.window;
	return [
		`🗞 <b>O Fio · ${LABEL[w.kind]}</b>`,
		`<i>${esc(formatLocalDate(w.day))} · ${formatLocalTime(w.start)} → ${formatLocalTime(w.end)}</i>`,
	].join("\n");
}

/** The lead story: headline, standfirst and every outlet that ran it. */
function leadBlock(e: Edition, deckMax: number): string {
	const m = e.draft.manchete;
	const deck = deckMax ? clipWords(m.linhaFina || m.texto, deckMax) : "";
	const by = outlets(m.fontes, e.headlines);
	return [
		`<b>${esc(m.titulo)}</b>`,
		deck ? esc(deck) : "",
		by ? `\n📰 ${by}` : "",
	]
		.filter(Boolean)
		.join("\n");
}

/** Photos (cover + album) to send ahead of the text summary. */
export function renderTelegramMedia(e: Edition): TelegramMedia {
	return planTelegramMedia(e, header(e), (deckMax) => leadBlock(e, deckMax));
}

function marketLine(e: Edition): string {
	const { usdBrl, ibovespa, selicRate } = e.market;
	const bits: string[] = [];
	if (usdBrl)
		bits.push(`Dólar: <b>R$ ${usdBrl.value.toFixed(2).replace(".", ",")}</b>`);
	if (ibovespa)
		bits.push(
			`Ibovespa: <b>${Math.round(ibovespa.value).toLocaleString("pt-BR")}</b>`,
		);
	if (selicRate !== null)
		bits.push(`Selic: <b>${selicRate.toFixed(2).replace(".", ",")}%</b>`);
	return bits.length ? `💹 ${bits.join(" · ")}` : "";
}

/** Figures the model already gave that the market line shows, so none is said twice. */
function figuresLine(e: Edition): string {
	const { usdBrl, ibovespa, selicRate } = e.market;
	const covered = (label: string): boolean =>
		(usdBrl !== null && /d[óo]lar/i.test(label)) ||
		(ibovespa !== null && /ibovespa/i.test(label)) ||
		(selicRate !== null && /selic/i.test(label));
	const rows = e.draft.numeros.filter((n) => !covered(n.rotulo));
	return rows.length
		? `🔢 ${rows.map((n) => `${esc(n.rotulo)}: <b>${esc(n.valor)}</b>`).join(" · ")}`
		: "";
}

function xTrendsLine(e: Edition): string {
	const list = (e.xTrends ?? []).slice(0, 6);
	return list.length
		? `📈 <b>Em alta no X</b>\n${list.map((t) => `<a href="${esc(t.url)}">${esc(t.name)}</a>`).join(" · ")}`
		: "";
}

function storyLine(e: Edition, s: Story): string {
	const by = outlets(s.fontes, e.headlines);
	return `▪️ <b>${esc(clipWords(s.titulo, 140))}</b>${by ? `\n     <i>${by}</i>` : ""}`;
}

/** Thread events whose headline a story above already cited are dropped. */
function threadLines(e: Edition, t: Thread, shown: Set<number>): string[] {
	const events = t.eventos.filter((ev) => !shown.has(ev.fonte));
	// A timeline needs at least two beats; one left over is a story already told.
	if (events.length < Math.min(2, t.eventos.length)) return [];
	return [
		"",
		`🧵 <b>O fio: ${esc(t.tema)}</b>`,
		...events.map((ev) => {
			const h = e.headlines.get(ev.fonte);
			const url = h ? directUrl(h.url) : null;
			const line = [
				h ? formatLocalTime(h.createdAt) : "",
				kindMark(ev.tipo)?.mark,
				esc(ev.texto),
			]
				.filter(Boolean)
				.join(" ");
			return `${line}${url ? ` <a href="${esc(url)}">↗</a>` : ""}`;
		}),
	];
}

function build(
	e: Edition,
	limits: { stories: number; threads: number },
	editionUrl: string | undefined,
	delivered: Delivered,
): string {
	const { draft } = e;
	const parts: string[] = delivered.cover
		? []
		: [header(e), "", leadBlock(e, 320)];
	const shown = new Set<number>(draft.manchete.fontes);

	const facts = [marketLine(e), figuresLine(e)].filter(Boolean);
	if (facts.length) parts.push(...(parts.length ? [""] : []), ...facts);
	const trending = xTrendsLine(e);
	if (trending) parts.push(...(parts.length ? [""] : []), trending);

	const inAlbum = new Set(delivered.album);
	const highlights = [
		...draft.destaques,
		...draft.secoes.flatMap((s) => s.materias),
	]
		.filter((s) => !inAlbum.has(s) && !s.fontes.some((id) => shown.has(id)))
		.slice(0, limits.stories);
	if (highlights.length) {
		parts.push(
			...(parts.length ? [""] : []),
			"⭐ <b>Destaques</b>",
			...highlights.map((s) => storyLine(e, s)),
		);
		for (const s of highlights) for (const id of s.fontes) shown.add(id);
	}
	for (const s of inAlbum) for (const id of s.fontes) shown.add(id);

	for (const t of draft.fio.slice(0, limits.threads))
		parts.push(...threadLines(e, t, shown));

	parts.push(
		...(parts.length ? [""] : []),
		editionUrl
			? `🔗 Jornal completo: ${esc(editionUrl)}`
			: "📎 O jornal completo está no arquivo abaixo.",
	);
	return parts.join("\n");
}

/**
 * Text summary; `delivered` says which photos already carried the masthead,
 * lead and album stories, so the text never repeats them. Shrinks item by
 * item until it fits Telegram's limit.
 */
export function renderTelegramSummary(
	e: Edition,
	editionUrl?: string,
	delivered: Delivered = NOT_DELIVERED,
): string {
	for (let threads = 2; threads >= 0; threads--)
		for (let stories = 8; stories >= 3; stories--) {
			const text = build(e, { stories, threads }, editionUrl, delivered);
			if (text.length <= TELEGRAM_LIMIT) return text;
		}
	// Every field is length-clipped by sanitizeDraft, so this always fits.
	return build(e, { stories: 0, threads: 0 }, editionUrl, delivered);
}
