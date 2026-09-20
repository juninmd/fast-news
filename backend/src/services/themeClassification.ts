import { z } from "zod";
import { generateWithFallback } from "./llmWithFallback.js";

/**
 * Fixed editorial taxonomy for per-article theme classification. Derived
 * from the categories already assigned to feeds in sources.ts (deduped,
 * dropping the "fact_check" sentinel used by editions/select.ts and the
 * "Games" variant of "Gaming"), so it matches how the codebase already
 * classifies news rather than inventing a new one. "Política", "Economia",
 * "Clima" and "Regional" widen coverage on user request; none is a
 * gossip/celebrity bucket — that content is filtered upstream in sources.ts
 * (see RETIRED_FEED_URLS) and never reaches this classifier.
 */
export const THEME_TAXONOMY = [
	"Mundo",
	"Negócios",
	"Economia",
	"Política",
	"Brasil",
	"Regional",
	"Tecnologia",
	"Ciência",
	"Clima",
	"Saúde",
	"Entretenimento",
	"Esportes",
	"Educação",
	"Automóveis",
	"Cripto",
	"Startups",
	"Gaming",
	"Anime",
	"Big Techs",
	"AI Frontier",
	"Dev Tools",
	"Engenharia",
	"Open Source",
	"Segurança",
	"Geral",
] as const;

export type ThemeCategory = (typeof THEME_TAXONOMY)[number];

const ThemeSchema = z.object({
	theme: z
		.enum(THEME_TAXONOMY)
		.describe("A categoria editorial que melhor descreve o assunto da notícia"),
});

const THEME_PROMPT = `Classifique o assunto desta notícia em UMA categoria da lista abaixo.

CATEGORIAS: ${THEME_TAXONOMY.join(", ")}

TÍTULO: {title}
CONTEÚDO: {content}

Responda com a categoria que melhor descreve o ASSUNTO da notícia (não a fonte). Se nenhuma categoria específica se aplicar, use "Geral".`;

/**
 * Classifies an article's editorial theme via LLM. Never throws — falls
 * back to `fallbackCategory` (or "Mundo") on any failure, so a classifier
 * outage never blocks ingestion.
 */
export async function classifyTheme(
	title: string,
	content: string,
	fallbackCategory: string,
): Promise<string> {
	const fallback = (THEME_TAXONOMY as readonly string[]).includes(
		fallbackCategory,
	)
		? fallbackCategory
		: "Mundo";
	try {
		const prompt = THEME_PROMPT.replace("{title}", title).replace(
			"{content}",
			(content ?? "").slice(0, 2000),
		);
		const object = await generateWithFallback({
			schema: ThemeSchema,
			prompt,
			logTag: "themeClassification",
			mode: "json",
		});
		return object?.theme ?? fallback;
	} catch (err) {
		console.warn(
			"[themeClassification] Failed, falling back to:",
			fallback,
			(err as Error).message.slice(0, 80),
		);
		return fallback;
	}
}
