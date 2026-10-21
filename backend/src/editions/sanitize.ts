import { isPollutedProse } from "./proseGuards.js";
import { clipWords, TitleIndex } from "./text.js";
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

const clip = clipWords;

function validIds(ids: number[], known: Map<number, Headline>): number[] {
	return [...new Set(ids)].filter((id) => known.has(id)).slice(0, 4);
}

function story(s: Story, known: Map<number, Headline>): Story | null {
	const fontes = validIds(s.fontes, known);
	const titulo = clip(s.titulo, 160);
	if (!titulo || fontes.length === 0) return null;
	if (isPollutedProse(s.titulo) || isPollutedProse(s.texto)) return null;
	return {
		chapeu: s.chapeu ? clip(s.chapeu, 40) : undefined,
		titulo,
		texto: clip(s.texto, 600),
		fontes,
	};
}

const titleKey = (title: string): string =>
	title
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, " ")
		.trim();

/** Tracks what the edition already says so no story appears twice. */
class Seen {
	private readonly ids = new Set<number>();
	private readonly titles = new Set<string>();
	private readonly similar = new TitleIndex<true>();

	/** Same headline cited, same title, or near-identical wording. */
	has(s: Story): boolean {
		return (
			s.fontes.some((id) => this.ids.has(id)) ||
			this.titles.has(titleKey(s.titulo)) ||
			this.similar.find(s.titulo, 0.6) !== undefined
		);
	}

	add(s: Story): void {
		for (const id of s.fontes) this.ids.add(id);
		this.titles.add(titleKey(s.titulo));
		this.similar.add(s.titulo, true);
	}
}

/** Drops stories that repeat one already kept earlier in the edition. */
function fresh(list: Story[], seen: Seen): Story[] {
	return list.filter((s) => {
		if (seen.has(s)) return false;
		seen.add(s);
		return true;
	});
}

/** Folds sections that share a name (any case/accent) into one. */
function mergeSections(list: Section[], limit: number): Section[] {
	const byName = new Map<string, Section>();
	for (const sec of list) {
		const key = titleKey(sec.nome);
		const into = byName.get(key);
		if (!into) {
			byName.set(key, { ...sec });
			continue;
		}
		into.materias = [...into.materias, ...sec.materias];
		into.notas = [...new Set([...into.notas, ...sec.notas])].slice(0, 4);
	}
	return [...byName.values()].map((sec) => ({
		...sec,
		materias: sec.materias.slice(0, limit),
	}));
}

function lead(l: Lead, known: Map<number, Headline>): Lead | null {
	const base = story(l, known);
	if (!base) return null;
	const paragrafos = l.paragrafos
		.filter((p) => !isPollutedProse(p))
		.map((p) => clip(p, 900))
		.filter(Boolean);
	return {
		...base,
		linhaFina: isPollutedProse(l.linhaFina) ? "" : clip(l.linhaFina, 320),
		paragrafos: (paragrafos.length ? paragrafos : [base.texto])
			.filter(Boolean)
			.slice(0, 4),
		citacao:
			l.citacao?.texto &&
			l.citacao.autor &&
			!isPollutedProse(`${l.citacao.texto} ${l.citacao.autor}`)
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
function figures(
	list: Figure[],
	corpus: string,
	known: Map<number, Headline>,
): Figure[] {
	return list
		.filter((f) => {
			const token = numberToken(f.valor);
			return token !== null && corpus.includes(token);
		})
		.map((f) => ({
			rotulo: clip(f.rotulo, 70),
			valor: clip(f.valor, 24),
			nota: clip(f.nota, 120),
			fonte: f.fonte !== undefined && known.has(f.fonte) ? f.fonte : undefined,
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
			return { tema: clip(t.tema, 90), eventos };
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
			opcoes: q.opcoes.map((o) => clip(o, 90)),
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
	sectionStoryLimit = 3,
): EditionDraft {
	const sourced = draft.destaques
		.map((s) => story(s, known))
		.filter((s): s is Story => s !== null);
	let manchete = lead(draft.manchete, known);
	if (!manchete) {
		const promoted = sourced.shift();
		if (!promoted) throw new Error("Edition has no sourced lead story");
		manchete = { ...promoted, linhaFina: "", paragrafos: [promoted.texto] };
	}
	// One story, one place: the cover, highlights and sections share `seen`.
	const seen = new Seen();
	seen.add(manchete);
	const destaques = fresh(sourced, seen);
	const sections: Section[] = draft.secoes
		.map((sec) => ({
			nome: clip(sec.nome, 40),
			materias: fresh(
				sec.materias
					.map((s) => story(s, known))
					.filter((s): s is Story => s !== null),
				seen,
			),
			notas: sec.notas
				.filter((n) => !isPollutedProse(n))
				.map((n) => clip(n, 220))
				.filter(Boolean)
				.slice(0, 4),
		}))
		.filter((sec) => sec.nome && (sec.materias.length || sec.notas.length));
	const secoes = mergeSections(sections, sectionStoryLimit);
	const corpus = [...known.values()]
		.map((h) => `${h.title} ${h.snippet}`)
		.join("\n");
	return {
		manchete,
		destaques: destaques.slice(0, 3),
		secoes,
		fio: threads(draft.fio, known),
		numeros: figures(draft.numeros, corpus, known),
		leve: draft.leve
			.filter((l) => !isPollutedProse(l))
			.map((l) => clip(l, 220))
			.filter(Boolean)
			.slice(0, 4),
		quiz: quiz(draft.quiz),
	};
}
