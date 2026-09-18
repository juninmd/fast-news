import type {
	EditionDraft,
	Figure,
	Headline,
	Lead,
	QuizItem,
	Section,
	Story,
	Thread,
} from "./types.js";

const clip = (s: string | undefined, max: number): string => {
	const t = (s ?? "").replace(/\s+/g, " ").trim();
	return t.length > max ? `${t.slice(0, max - 1).trimEnd()}…` : t;
};

function validIds(ids: number[], known: Map<number, Headline>): number[] {
	return [...new Set(ids)].filter((id) => known.has(id)).slice(0, 4);
}

function story(s: Story, known: Map<number, Headline>): Story | null {
	const fontes = validIds(s.fontes, known);
	const titulo = clip(s.titulo, 160);
	if (!titulo || fontes.length === 0) return null;
	return {
		chapeu: s.chapeu ? clip(s.chapeu, 40) : undefined,
		titulo,
		texto: clip(s.texto, 600),
		fontes,
	};
}

function lead(l: Lead, known: Map<number, Headline>): Lead | null {
	const base = story(l, known);
	if (!base) return null;
	const paragrafos = l.paragrafos.map((p) => clip(p, 900)).filter(Boolean);
	return {
		...base,
		linhaFina: clip(l.linhaFina, 320),
		paragrafos: (paragrafos.length ? paragrafos : [base.texto])
			.filter(Boolean)
			.slice(0, 4),
		citacao:
			l.citacao?.texto && l.citacao.autor
				? {
						texto: clip(l.citacao.texto, 220),
						autor: clip(l.citacao.autor, 80),
					}
				: undefined,
	};
}

function numberToken(valor: string): string | null {
	const m = valor.match(/\d+(?:[.,]\d+)*/);
	return m ? m[0] : null;
}

/** Keeps only figures whose number literally appears in the source text. */
function figures(list: Figure[], corpus: string): Figure[] {
	return list
		.filter((f) => {
			const token = numberToken(f.valor);
			return token !== null && corpus.includes(token);
		})
		.map((f) => ({
			rotulo: clip(f.rotulo, 40),
			valor: clip(f.valor, 18),
			nota: clip(f.nota, 60),
		}))
		.slice(0, 5);
}

function threads(list: Thread[], known: Map<number, Headline>): Thread[] {
	return list
		.map((t) => {
			const seen = new Set<number>();
			const eventos = t.eventos
				.filter((e) => {
					if (!known.has(e.fonte) || seen.has(e.fonte)) return false;
					seen.add(e.fonte);
					return true;
				})
				.map((e) => ({ fonte: e.fonte, texto: clip(e.texto, 200) }))
				.sort(
					(a, b) =>
						(known.get(a.fonte)?.createdAt.getTime() ?? 0) -
						(known.get(b.fonte)?.createdAt.getTime() ?? 0),
				)
				.slice(0, 6);
			return { tema: clip(t.tema, 50), eventos };
		})
		.filter((t) => t.tema && t.eventos.length >= 3)
		.slice(0, 3);
}

function quiz(list: QuizItem[]): QuizItem[] {
	return list
		.filter(
			(q) =>
				q.pergunta.trim() &&
				q.opcoes.length === 3 &&
				q.opcoes.every((o) => o.trim()) &&
				q.correta >= 0 &&
				q.correta <= 2,
		)
		.map((q) => ({
			pergunta: clip(q.pergunta, 160),
			opcoes: q.opcoes.map((o) => clip(o, 60)),
			correta: q.correta,
		}))
		.slice(0, 5);
}

/**
 * Enforces the edition contract on untrusted model output: every story must
 * cite a real headline, sizes are bounded, figures must exist in the input.
 * Throws when nothing usable is left for the front page.
 */
export function sanitizeDraft(
	draft: EditionDraft,
	known: Map<number, Headline>,
): EditionDraft {
	const destaques = draft.destaques
		.map((s) => story(s, known))
		.filter((s): s is Story => s !== null);
	let manchete = lead(draft.manchete, known);
	if (!manchete) {
		const promoted = destaques.shift();
		if (!promoted) throw new Error("Edition has no sourced lead story");
		manchete = { ...promoted, linhaFina: "", paragrafos: [promoted.texto] };
	}
	const secoes: Section[] = draft.secoes
		.map((sec) => ({
			nome: clip(sec.nome, 30),
			materias: sec.materias
				.map((s) => story(s, known))
				.filter((s): s is Story => s !== null)
				.slice(0, 3),
			notas: sec.notas
				.map((n) => clip(n, 220))
				.filter(Boolean)
				.slice(0, 4),
		}))
		.filter((sec) => sec.nome && (sec.materias.length || sec.notas.length))
		.slice(0, 6);
	const corpus = [...known.values()]
		.map((h) => `${h.title} ${h.snippet}`)
		.join("\n");
	return {
		manchete,
		destaques: destaques.slice(0, 3),
		secoes,
		fio: threads(draft.fio, known),
		numeros: figures(draft.numeros, corpus),
		leve: draft.leve
			.map((l) => clip(l, 220))
			.filter(Boolean)
			.slice(0, 4),
		quiz: quiz(draft.quiz),
	};
}
