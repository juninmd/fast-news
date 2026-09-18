import type { Edition, EditionDraft, Headline } from "./types.js";

let seq = 0;

export function headline(over: Partial<Headline> = {}): Headline {
	seq++;
	return {
		id: seq,
		title: `Notícia ${seq}`,
		source: "Folha",
		category: "Brasil",
		url: `https://example.com/${seq}`,
		snippet: "",
		createdAt: new Date(Date.UTC(2026, 8, 18, 12, seq % 60)),
		...over,
	};
}

export function knownOf(list: Headline[]): Map<number, Headline> {
	return new Map(list.map((h) => [h.id, h]));
}

export function draft(over: Partial<EditionDraft> = {}): EditionDraft {
	return {
		manchete: {
			titulo: "Manchete",
			texto: "",
			fontes: [],
			linhaFina: "",
			paragrafos: [],
		},
		destaques: [],
		secoes: [],
		fio: [],
		numeros: [],
		leve: [],
		quiz: [],
		...over,
	};
}

export function edition(
	d: EditionDraft,
	known: Map<number, Headline>,
): Edition {
	const end = new Date("2026-09-18T22:00:00Z");
	return {
		window: {
			kind: "noite",
			start: new Date(end.getTime() - 12 * 3_600_000),
			end,
			day: "2026-09-18",
		},
		draft: d,
		headlines: known,
		checagens: [],
		hourly: new Array(12).fill(3),
		totalArticles: 36,
		totalSources: 5,
	};
}
