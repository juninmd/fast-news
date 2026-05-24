import { generateText } from "ai";
import { query } from "../database/client.js";
import { getFastModel } from "./aiProvider.js";
import {
	BIAS_LABEL,
	escapeHtml,
	FLAG_LABEL,
	SCORE_EMOJI,
	SEPARATOR,
} from "./telegram_format.js";

export async function generateSummary(
	title: string,
	content: string,
	model?: Awaited<ReturnType<typeof getFastModel>>,
): Promise<string> {
	try {
		const m = model ?? (await getFastModel());
		const { text } = await generateText({
			model: m,
			prompt: `Você é um editor sênior. Resuma esta notícia em 2-3 frases impactantes e profissionais em português (PT-BR).
Foque nos fatos e no impacto. Se o conteúdo original estiver em inglês ou outro idioma, traduza e resuma diretamente em português (PT-BR) fluente. Não use "Esta notícia fala sobre...". Vá direto ao ponto.\n\nTítulo: ${title}\n\nConteúdo: ${content.slice(0, 5000)}`,
			maxTokens: 180,
		});
		return text.trim();
	} catch {
		return "";
	}
}

export async function generateContext(
	title: string,
	content: string,
	category: string,
	model?: Awaited<ReturnType<typeof getFastModel>>,
): Promise<string> {
	try {
		const m = model ?? (await getFastModel());
		const seriousCategories = ["segurança", "mundo", "brasil", "negócios"];
		const isSerious = category
			? seriousCategories.includes(category.toLowerCase())
			: false;

		const prompt = isSerious
			? `Você é um analista geopolítico e de mercados sério e bem-informado. Com base na notícia abaixo, escreva UMA ou DUAS frases curtas em português (PT-BR) fornecendo um insight estratégico ou contexto factual importante sobre os desdobramentos, pessoas públicas ou corporações mencionadas. Vá direto ao ponto.\n\nTítulo: ${title}\n\nConteúdo: ${content.slice(0, 4000)}`
			: `Você é um colunista brasileiro irônico e bem-informado. Com base na notícia abaixo, escreva UMA ou DUAS frases curtas em português (PT-BR) seguindo esta prioridade:
1. Se houver uma pessoa pública: mencione o fato ou período mais marcante da carreira dela que seja RELEVANTE para esta notícia.
2. Depois, se couber, adicione uma observação sarcástica, irônica ou curiosa.
Título: ${title}\nConteúdo: ${content.slice(0, 4000)}`;

		const { text } = await generateText({
			model: m,
			prompt,
			maxTokens: 120,
		});
		const result = text.trim();
		const looksPortuguese =
			/\b(do|da|de|em|com|que|foi|para|uma|um|no|na)\b/i.test(result);
		return looksPortuguese ? result : "";
	} catch {
		return "";
	}
}

export function buildCredibilityBlock(article: {
	fakeNewsScore?: number | null;
	politicalBias?: string | null;
	isMilitant?: boolean;
	credibilityFlags?: string[];
	credibilityReasoning?: string | null;
}): string {
	if (article.fakeNewsScore == null) return "";
	const score = article.fakeNewsScore;
	const emoji = SCORE_EMOJI(score);
	const bias = article.politicalBias
		? (BIAS_LABEL[article.politicalBias] ?? article.politicalBias)
		: null;
	const flags = (article.credibilityFlags ?? []).map((f) => FLAG_LABEL[f] ?? f);
	const lines: string[] = [
		`${emoji} <b>Credibilidade: ${score}/10</b>${article.isMilitant ? "  ·  📢 Panfletário" : ""}`,
	];
	if (bias && article.politicalBias !== "neutral") lines.push(`${bias}`);
	if (flags.length) lines.push(flags.join("  ·  "));
	if (article.credibilityReasoning)
		lines.push(`<i>${escapeHtml(article.credibilityReasoning)}</i>`);
	return `\n\n${SEPARATOR}\n${lines.join("\n")}`;
}

export async function fetchRelatedArticles(
	articleId: string,
	category: string,
	limit = 2,
): Promise<Array<{ title: string; url: string; source: string }>> {
	try {
		const byVector = await query<{
			title: string;
			url: string;
			source: string;
		}>(
			`SELECT na.title, na.url, na.source FROM article_relations ar
       JOIN news_articles na ON na.id = CASE WHEN ar.article_a = $1 THEN ar.article_b ELSE ar.article_a END
       WHERE (ar.article_a = $1 OR ar.article_b = $1) ORDER BY ar.similarity DESC LIMIT $2`,
			[articleId, limit],
		);
		if (byVector.rows.length > 0) return byVector.rows;
		const byCategory = await query<{
			title: string;
			url: string;
			source: string;
		}>(
			`SELECT title, url, source FROM news_articles WHERE category = $1 AND id != $2
       AND published_at > NOW() - INTERVAL '48 hours' ORDER BY published_at DESC LIMIT $3`,
			[category, articleId, limit],
		);
		return byCategory.rows;
	} catch {
		return [];
	}
}
