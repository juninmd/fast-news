import { directUrl } from "./escape.js";
import type { Edition, Headline, Story, Thread } from "./types.js";
import { formatLocalDate, formatLocalTime } from "./window.js";

const LABEL = {
	manha: "Edição da Manhã",
	meiodia: "Edição do Meio-dia",
	tarde: "Edição da Tarde",
	noite: "Edição da Noite",
};
const nf = new Intl.NumberFormat("pt-BR");

type Known = Map<number, Headline>;

/** Neutralises markdown, raw HTML and Vue interpolation in untrusted text. */
export function mdEscape(value: string): string {
	return value
		.replace(/\s+/g, " ")
		.trim()
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/\{/g, "&#123;")
		.replace(/\}/g, "&#125;")
		.replace(/([\\`*_[\]|~])/g, "\\$1")
		.replace(/^(#|-|\+|:::)/, "\\$1")
		.replace(/^(\d+)([.)])/, "$1\\$2");
}

export function articleSlug(w: { day: string; kind: string }): string {
	return `${w.day}-${w.kind}`;
}

function sources(ids: number[], known: Known): string {
	const links = ids
		.map((id) => known.get(id))
		.filter((h): h is Headline => Boolean(h))
		.map((h) => {
			const url = directUrl(h.url);
			const name = mdEscape(h.source.slice(0, 28));
			return url ? `[${name}](<${url.replace(/>/g, "%3E")}>)` : name;
		});
	return links.length ? `*Fontes: ${links.join(" · ")}*` : "";
}

function story(s: Story, known: Known, level: number): string {
	const heading = "#".repeat(level);
	return [
		s.chapeu ? `**${mdEscape(s.chapeu).toUpperCase()}**\n` : "",
		`${heading} ${mdEscape(s.titulo)}`,
		s.texto ? `\n${mdEscape(s.texto)}` : "",
		`\n${sources(s.fontes, known)}`,
	]
		.filter(Boolean)
		.join("\n");
}

function threads(list: Thread[], known: Known): string {
	if (!list.length) return "";
	const blocks = list.map((t) => {
		const items = t.eventos.map((e) => {
			const h = known.get(e.fonte);
			const time = h ? `**${formatLocalTime(h.createdAt)}** · ` : "";
			return `- ${time}${mdEscape(e.texto)}`;
		});
		return `### ${mdEscape(t.tema)}\n\n${items.join("\n")}`;
	});
	return `## O fio do dia\n\n${blocks.join("\n\n")}\n\n*Horários em que cada notícia chegou ao fast-news, não os de publicação na fonte.*`;
}

function pct(v: number): string {
	return `${v > 0 ? "+" : ""}${v.toFixed(2).replace(".", ",")}%`;
}

function numbers(e: Edition): string {
	const rows: string[] = [];
	const { usdBrl, ibovespa, selicRate } = e.market;
	if (usdBrl)
		rows.push(
			`- **Dólar:** R$ ${usdBrl.value.toFixed(2).replace(".", ",")} (${pct(usdBrl.changePct)})`,
		);
	if (ibovespa)
		rows.push(
			`- **Ibovespa:** ${nf.format(Math.round(ibovespa.value))} (${pct(ibovespa.changePct)})`,
		);
	if (selicRate !== null)
		rows.push(`- **Selic:** ${selicRate.toFixed(2).replace(".", ",")}% a.a.`);
	for (const n of e.draft.numeros)
		rows.push(
			`- **${mdEscape(n.rotulo)}:** ${mdEscape(n.valor)} — ${mdEscape(n.nota)}`,
		);
	return rows.length ? `## Números\n\n${rows.join("\n")}` : "";
}

function coverage(e: Edition): string {
	const c = e.coverage;
	const published = c.publishedArticles ?? c.selectedForAi;
	const omitted = c.omittedFromEdition ?? c.omittedBeforeAi;
	const parts = [
		`${nf.format(published)} notícias representadas de ${nf.format(c.eligible)} elegíveis`,
	];
	if (omitted) parts.push(`${nf.format(omitted)} ficaram de fora`);
	if (c.modelFallback)
		parts.push(
			"parte usa títulos e trechos originais porque a IA não respondeu",
		);
	return `::: info Cobertura\n${parts.join("; ")}.\n:::`;
}

export interface EditionMarkdown {
	slug: string;
	title: string;
	markdown: string;
}

/** One VitePress article per edition: frontmatter + the full newspaper as markdown. */
export function renderEditionMarkdown(e: Edition): EditionMarkdown {
	const { window: w, draft, headlines } = e;
	const date = formatLocalDate(w.day);
	const [year, month, day] = w.day.split("-");
	const title = `O Fio — ${LABEL[w.kind]}, ${day}/${month}/${year}`;
	const description =
		draft.manchete.linhaFina || draft.manchete.titulo || "Edição do O Fio";
	const range = `${formatLocalTime(w.start)} → ${formatLocalTime(w.end)}`;

	const front = [
		"---",
		`title: ${JSON.stringify(title)}`,
		`description: ${JSON.stringify(description.replace(/\s+/g, " ").trim())}`,
		`date: ${w.day}`,
		`edition: ${w.kind}`,
		"---",
	].join("\n");

	const lead = draft.manchete;
	const cover = [
		`# ${mdEscape(lead.titulo)}`,
		lead.chapeu ? `**${mdEscape(lead.chapeu).toUpperCase()}**` : "",
		lead.linhaFina ? `*${mdEscape(lead.linhaFina)}*` : "",
		`${LABEL[w.kind]} · ${date} · período ${range} (Brasília) · ${nf.format(e.totalArticles)} notícias de ${nf.format(e.totalSources)} fontes`,
		coverage(e),
		...lead.paragrafos.map(mdEscape),
		lead.citacao
			? `> ${mdEscape(lead.citacao.texto)}\n>\n> — ${mdEscape(lead.citacao.autor)}`
			: "",
		sources(lead.fontes, headlines),
	];

	const highlights = draft.destaques.length
		? `## Destaques\n\n${draft.destaques.map((s) => story(s, headlines, 3)).join("\n\n")}`
		: "";
	const checks = e.checagens.length
		? `## Checagem\n\n${e.checagens
				.map((h) => `- ${mdEscape(h.title)} ${sources([h.id], headlines)}`)
				.join("\n")}`
		: "";
	const sections = draft.secoes.map((sec) =>
		[
			`## ${mdEscape(sec.nome)}`,
			...sec.materias.map((s) => story(s, headlines, 3)),
			sec.notas.length
				? `**Notas**\n\n${sec.notas.map((n) => `- ${mdEscape(n)}`).join("\n")}`
				: "",
		]
			.filter(Boolean)
			.join("\n\n"),
	);
	const light = draft.leve.length
		? `## Para ler com calma\n\n${draft.leve.map((n) => `- ${mdEscape(n)}`).join("\n")}`
		: "";
	const quiz = draft.quiz.length
		? `## Você leu O Fio?\n\n${draft.quiz
				.map(
					(q, i) =>
						`${i + 1}. ${mdEscape(q.pergunta)}\n${q.opcoes
							.map(
								(o, j) => `   - ${String.fromCharCode(65 + j)}) ${mdEscape(o)}`,
							)
							.join(
								"\n",
							)}\n\n   ::: details Resposta\n   ${String.fromCharCode(65 + q.correta)}\n   :::`,
				)
				.join("\n\n")}`
		: "";

	const body = [
		...cover,
		numbers(e),
		highlights,
		checks,
		threads(draft.fio, headlines),
		...sections,
		light,
		quiz,
		"---\n\n*O Fio é montado automaticamente a partir das notícias captadas pelo fast-news. Os links levam à matéria original.*",
	]
		.filter(Boolean)
		.join("\n\n");

	return {
		slug: articleSlug(w),
		title,
		markdown: `${front}\n\n${body}\n`,
	};
}
