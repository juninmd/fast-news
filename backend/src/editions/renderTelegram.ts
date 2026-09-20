import { directUrl, esc } from "./escape.js";
import type { Edition, Story } from "./types.js";
import { formatLocalDate, formatLocalTime } from "./window.js";

export const TELEGRAM_LIMIT = 4096;
const LABEL = {
	manha: "Edição da Manhã",
	tarde: "Edição da Tarde",
	noite: "Edição da Noite",
};

function link(e: Edition, s: Story): string {
	const h = e.headlines.get(s.fontes[0] ?? -1);
	const url = h ? directUrl(h.url) : null;
	return url ? ` <a href="${esc(url)}">↗</a>` : "";
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
	return bits.join(" · ");
}

function build(e: Edition, stories: number, threads: number): string {
	const { draft, window: w } = e;
	const parts = [
		`🗞 <b>O Fio · ${LABEL[w.kind]}</b>`,
		`<i>${esc(formatLocalDate(w.day))} · ${formatLocalTime(w.start)} → ${formatLocalTime(w.end)}</i>`,
		"",
		`<b>${esc(draft.manchete.titulo)}</b>${link(e, draft.manchete)}`,
		esc(draft.manchete.linhaFina || draft.manchete.texto),
	];
	const market = marketLine(e);
	if (market) parts.push("", market);
	if (draft.numeros.length)
		parts.push(
			"",
			draft.numeros
				.map((n) => `${esc(n.rotulo)}: <b>${esc(n.valor)}</b>`)
				.join(" · "),
		);
	const highlights = [
		...draft.destaques,
		...draft.secoes.flatMap((s) => s.materias),
	].slice(0, stories);
	if (highlights.length)
		parts.push(
			"",
			"<b>Destaques</b>",
			...highlights.map((s) => `• ${esc(s.titulo)}${link(e, s)}`),
		);
	for (const t of draft.fio.slice(0, threads)) {
		parts.push("", `<b>O fio: ${esc(t.tema)}</b>`);
		for (const ev of t.eventos) {
			const h = e.headlines.get(ev.fonte);
			parts.push(`${h ? formatLocalTime(h.createdAt) : ""} ${esc(ev.texto)}`);
		}
	}
	parts.push("", "📎 O jornal completo está no arquivo abaixo.");
	return parts.join("\n");
}

/** Shrinks the message item by item until it fits Telegram's limit. */
export function renderTelegramSummary(e: Edition): string {
	for (let threads = 2; threads >= 0; threads--)
		for (let stories = 8; stories >= 3; stories--) {
			const text = build(e, stories, threads);
			if (text.length <= TELEGRAM_LIMIT) return text;
		}
	// Every field is length-clipped by sanitizeDraft, so this always fits.
	return build(e, 0, 0);
}
