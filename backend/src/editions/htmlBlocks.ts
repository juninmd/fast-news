import { directUrl, esc } from "./escape.js";
import { hourLabels } from "./select.js";
import type { Headline, QuizItem, Story, Thread } from "./types.js";
import { formatLocalTime } from "./window.js";

type Known = Map<number, Headline>;

export function sources(ids: number[], known: Known): string {
	const links = ids
		.map((id) => known.get(id))
		.filter((h): h is Headline => Boolean(h))
		.map((h) => {
			const url = directUrl(h.url);
			const name = esc(h.source.slice(0, 28));
			return url
				? `<a href="${esc(url)}" target="_blank" rel="noopener">${name}</a>`
				: name;
		});
	return links.length ? `<span class="src">${links.join(" · ")}</span>` : "";
}

export function story(s: Story, known: Known, tag = "article"): string {
	const kicker = s.chapeu ? `<p class="kicker">${esc(s.chapeu)}</p>` : "";
	return `<${tag}>${kicker}<h3>${esc(s.titulo)}</h3>${s.texto ? `<p>${esc(s.texto)}</p>` : ""}${sources(s.fontes, known)}</${tag}>`;
}

export function brief(items: string[]): string {
	return items.length
		? `<ul class="brief">${items.map((i) => `<li>${i}</li>`).join("")}</ul>`
		: "";
}

export function sectionHead(title: string): string {
	return `<div class="sec-h"><h2>${esc(title)}</h2></div>`;
}

export function threads(list: Thread[], known: Known): string {
	if (!list.length) return "";
	const cols = list
		.map((t) => {
			const items = t.eventos
				.map((e) => {
					const h = known.get(e.fonte);
					const time = h ? formatLocalTime(h.createdAt) : "";
					return `<li><time>${time}</time>${esc(e.texto)}</li>`;
				})
				.join("");
			return `<div><h4>${esc(t.tema)}</h4><ol>${items}</ol></div>`;
		})
		.join("");
	return `<section class="sec">${sectionHead("O fio do dia")}<div class="thread">${cols}</div>
<p class="note">Horários em que cada notícia chegou à redação do fast-news, não os de publicação na fonte.</p></section>`;
}

export function pulse(hourly: number[], start: Date): string {
	const W = 720;
	const H = 150;
	const pl = 34;
	const pt = 10;
	const pb = 24;
	const peak = Math.max(...hourly, 1);
	const step = peak > 200 ? 100 : peak > 80 ? 50 : peak > 20 ? 10 : 5;
	const max = Math.ceil(peak / step) * step;
	const bw = (W - pl - 6) / hourly.length;
	const y = (v: number) => pt + (H - pt - pb) * (1 - v / max);
	const labels = hourLabels(start);
	const grid = [];
	for (let v = 0; v <= max; v += step)
		grid.push(
			`<line x1="${pl}" x2="${W - 6}" y1="${y(v)}" y2="${y(v)}" stroke="var(--rule)"/><text x="${pl - 6}" y="${y(v) + 4}" text-anchor="end">${v}</text>`,
		);
	const bars = hourly
		.map((n, i) => {
			const x = pl + i * bw;
			return `<rect x="${x + 1}" y="${y(n)}" width="${bw - 2}" height="${y(0) - y(n)}" rx="2" fill="var(--accent)"><title>${labels[i]}h: ${n} notícias</title></rect><text x="${x + bw / 2}" y="${H - 6}" text-anchor="middle">${labels[i]}h</text>`;
		})
		.join("");
	const top = hourly.indexOf(peak);
	return `<section class="sec">${sectionHead("Pulso da redação")}<div class="pulse"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Notícias por hora; pico às ${labels[top]}h com ${peak}">${grid.join("")}${bars}</svg></div>
<p class="note">Notícias que chegaram por hora. O pico foi às ${labels[top]}h, com ${peak}.</p></section>`;
}

export function quiz(items: QuizItem[]): string {
	if (!items.length) return "";
	const sets = items
		.map(
			(q, i) =>
				`<fieldset><legend>${i + 1}. ${esc(q.pergunta)}</legend><div class="opts" data-c="${q.correta}">${q.opcoes
					.map(
						(o, j) =>
							`<button type="button" id="q${i}o${j}" data-i="${j}">${esc(o)}</button>`,
					)
					.join("")}</div></fieldset>`,
		)
		.join("");
	return `<div>${sectionHead("Você leu O Fio?")}<div class="quiz" id="quiz">${sets}</div><p class="score" id="score" aria-live="polite"></p></div>`;
}
