export type EditionKind = "manha" | "tarde" | "noite";

export interface EditionWindow {
	kind: EditionKind;
	start: Date;
	end: Date;
	/** Calendar day of the edition in America/Sao_Paulo, YYYY-MM-DD. */
	day: string;
}

export interface Headline {
	id: number;
	title: string;
	source: string;
	category: string;
	url: string;
	snippet: string;
	createdAt: Date;
	imageUrl: string | null;
}

export interface Story {
	chapeu?: string;
	titulo: string;
	texto: string;
	fontes: number[];
}

export interface Lead extends Story {
	linhaFina: string;
	paragrafos: string[];
	citacao?: { texto: string; autor: string };
}

export interface Section {
	nome: string;
	materias: Story[];
	notas: string[];
}

export interface ThreadEvent {
	fonte: number;
	texto: string;
}

export interface Thread {
	tema: string;
	eventos: ThreadEvent[];
}

export interface Figure {
	rotulo: string;
	valor: string;
	nota: string;
}

export interface QuizItem {
	pergunta: string;
	opcoes: string[];
	correta: number;
}

/** Editorial draft returned by the model; ids point into the headline list. */
export interface EditionDraft {
	manchete: Lead;
	destaques: Story[];
	secoes: Section[];
	fio: Thread[];
	numeros: Figure[];
	leve: string[];
	quiz: QuizItem[];
}

export interface MarketSnapshot {
	usdBrl: { value: number; changePct: number } | null;
	ibovespa: { value: number; changePct: number } | null;
	selicRate: number | null;
}

export interface Edition {
	window: EditionWindow;
	draft: EditionDraft;
	headlines: Map<number, Headline>;
	checagens: Headline[];
	hourly: number[];
	totalArticles: number;
	totalSources: number;
	market: MarketSnapshot;
}
