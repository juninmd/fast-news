import { esc } from "./escape.js";
import {
	brief,
	pulse,
	quiz,
	sectionHead,
	sources,
	story,
	threads,
} from "./htmlBlocks.js";
import { EDITION_CSS, FONTS_HREF, QUIZ_SCRIPT } from "./htmlStyles.js";
import type { Edition } from "./types.js";
import { formatLocalDate, formatLocalTime } from "./window.js";

const LABEL = {
	manha: "Edição da Manhã",
	tarde: "Edição da Tarde",
	noite: "Edição da Noite",
};
const nf = new Intl.NumberFormat("pt-BR");

function front(e: Edition): string {
	const { manchete, destaques } = e.draft;
	const known = e.headlines;
	const paragraphs = manchete.paragrafos
		.map((p, i) => `<p${i === 0 ? ' class="drop"' : ""}>${esc(p)}</p>`)
		.join("");
	const quote = manchete.citacao
		? `<p class="q">"${esc(manchete.citacao.texto)}"<cite>${esc(manchete.citacao.autor)}</cite></p>`
		: "";
	const checks = e.checagens.length
		? `<article class="box"><p class="kicker">Checagem</p>${brief(
				e.checagens.map((h) => `${esc(h.title)}${sources([h.id], known)}`),
			)}</article>`
		: "";
	return `<section class="front"><article class="lead">
${manchete.chapeu ? `<p class="kicker">${esc(manchete.chapeu)}</p>` : ""}<h2>${esc(manchete.titulo)}</h2>
${manchete.linhaFina ? `<p class="deck">${esc(manchete.linhaFina)}</p>` : ""}
<div class="cols">${paragraphs}</div>${quote}${sources(manchete.fontes, known)}</article>
<aside class="rail">${destaques.map((s) => story(s, known)).join("")}${checks}</aside></section>`;
}

function sections(e: Edition): string {
	return e.draft.secoes
		.map((sec) => {
			const cls = sec.materias.length >= 3 ? "grid3" : "grid2";
			const notes = brief(sec.notas.map(esc));
			return `<section class="sec">${sectionHead(sec.nome)}<div class="${cls}">${sec.materias
				.map((s) => story(s, e.headlines))
				.join("")}${notes ? `<div>${notes}</div>` : ""}</div></section>`;
		})
		.join("");
}

function pct(v: number): string {
	const sign = v > 0 ? "+" : "";
	return `${sign}${v.toFixed(2).replace(".", ",")}%`;
}

function market(e: Edition): string {
	const { usdBrl, ibovespa, selicRate } = e.market;
	if (!usdBrl && !ibovespa && selicRate === null) return "";
	const tiles: string[] = [];
	if (usdBrl)
		tiles.push(
			`<div class="tick"><span>Dólar</span><b>R$ ${usdBrl.value.toFixed(2).replace(".", ",")}</b><small class="${usdBrl.changePct >= 0 ? "up" : "down"}">${pct(usdBrl.changePct)}</small></div>`,
		);
	if (ibovespa)
		tiles.push(
			`<div class="tick"><span>Ibovespa</span><b>${nf.format(Math.round(ibovespa.value))}</b><small class="${ibovespa.changePct >= 0 ? "up" : "down"}">${pct(ibovespa.changePct)}</small></div>`,
		);
	if (selicRate !== null)
		tiles.push(
			`<div class="tick"><span>Selic</span><b>${selicRate.toFixed(2).replace(".", ",")}%</b><small>meta a.a.</small></div>`,
		);
	return `<div class="ticker">${tiles.join("")}</div>`;
}

function ticker(e: Edition): string {
	if (!e.draft.numeros.length) return "";
	return `<div class="ticker">${e.draft.numeros
		.map(
			(n) =>
				`<div class="tick"><span>${esc(n.rotulo)}</span><b>${esc(n.valor)}</b><small>${esc(n.nota)}</small></div>`,
		)
		.join("")}</div>`;
}

export function renderEditionHtml(e: Edition): string {
	const { window: w, draft } = e;
	const closing =
		w.kind === "manha"
			? "Para ler com o café"
			: w.kind === "tarde"
				? "Para a pausa da tarde"
				: "Antes de dormir";
	const range = `${formatLocalTime(w.start)} → ${formatLocalTime(w.end)}`;
	return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>O Fio, ${esc(LABEL[w.kind])}, ${esc(w.day)}</title>
<link rel="stylesheet" href="${FONTS_HREF}"><style>${EDITION_CSS}</style></head>
<body class="${w.kind}"><main class="wrap"><header><div class="mast">
<div class="ear"><b>${nf.format(e.totalArticles)} notícias</b>de ${nf.format(e.totalSources)} fontes nesta edição</div>
<h1 class="name">O <i>F</i>io</h1>
<div class="ear r"><b>${esc(range)}</b>período coberto, horário de Brasília</div></div>
<div class="folio"><span class="ed">${LABEL[w.kind]}</span><span>${esc(formatLocalDate(w.day))}</span><span>fast-news</span></div></header>
${market(e)}${ticker(e)}${front(e)}${threads(draft.fio, e.headlines)}${sections(e)}
${draft.leve.length || draft.quiz.length ? `<section class="sec"><div class="grid2"><div>${draft.leve.length ? sectionHead(closing) + brief(draft.leve.map(esc)) : ""}</div>${quiz(draft.quiz)}</div></section>` : ""}
${pulse(e.hourly, w.start)}
<footer class="colophon">O Fio é montado automaticamente a partir das notícias captadas pelo fast-news. Os links levam à matéria original.</footer>
</main><script>${QUIZ_SCRIPT}</script></body></html>`;
}
