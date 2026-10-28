export type EditionKind = "manha" | "meiodia" | "tarde" | "noite" | "especial";

export interface EditionWindow {
	kind: EditionKind;
	start: Date;
	end: Date;
	/** Calendar day of the edition in America/Sao_Paulo, YYYY-MM-DD. */
	day: string;
}

export interface Headline {
	id: number;
	/** Persistent news_articles UUID. `id` remains the prompt-local reference. */
	sourceId?: string;
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

/** How an event moved its story, from story_timeline.event_type. */
export type ThreadEventKind =
	| "development"
	| "escalation"
	| "contradiction"
	| "resolution"
	| "impact";

export interface ThreadEvent {
	fonte: number;
	texto: string;
	/** Optional: absent in model-written threads and in older snapshots. */
	tipo?: ThreadEventKind;
}

export interface Thread {
	tema: string;
	eventos: ThreadEvent[];
	/** news_stories id when the thread comes from a stored story cluster. */
	storyId?: string;
}

export interface Figure {
	rotulo: string;
	valor: string;
	nota: string;
	/** Headline the number comes from, so the page can link to it. */
	fonte?: number;
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
	coverage: {
		collected: number;
		eligible: number;
		selectedForAi: number;
		omittedBeforeAi: number;
		/** Optional for compatibility with existing immutable snapshots. */
		publishedArticles?: number;
		omittedFromEdition?: number;
		modelFallback: boolean;
	};
	hourly: number[];
	totalArticles: number;
	totalSources: number;
	market: MarketSnapshot;
}
