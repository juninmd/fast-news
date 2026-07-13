import { generateText } from "ai";
import { query } from "../database/client.js";
import { getArticleEmbedding, searchVectors } from "../database/vectorStore.js";
import { getFastModel } from "./aiProvider.js";
import { escapeHtml, SEPARATOR } from "./telegram_format.js";

function looksPortuguese(text: string): boolean {
	return /\b(do|da|de|em|com|que|foi|para|uma|um|no|na)\b/i.test(text);
}

const BLURB_PROMPT = `Você é um editor-chefe de notícias. Com base na notícia abaixo, escreva de 1 a 2 frases em português do Brasil (PT-BR) que cubram: (1) o fato principal com números e impacto real, e (2) por que isso importa ou qual é o desdobramento estratégico — tudo em uma narrativa corrida, sem subtítulos, sem introduções ("Esta notícia...", "O artigo..."). SEMPRE em PT-BR. NUNCA invente dados.`;

export async function generateArticleBlurb(
	title: string,
	content: string,
	_category?: string,
	model?: Awaited<ReturnType<typeof getFastModel>>,
): Promise<string> {
	try {
		const m = model ?? (await getFastModel());
		const input = `Título: ${title}\n\nConteúdo: ${content.slice(0, 8000)}`;
		const { text } = await generateText({
			model: m,
			prompt: `${BLURB_PROMPT}\n\n${input}`,
			maxTokens: 160,
		});
		const blurb = text.trim();
		if (looksPortuguese(blurb)) return blurb;
		const retry = await generateText({
			model: m,
			prompt: `${BLURB_PROMPT}\n\nATENÇÃO: responda OBRIGATORIAMENTE em português do Brasil. Traduza tudo.\n\n${input}`,
			maxTokens: 160,
		});
		const retried = retry.text.trim();
		return looksPortuguese(retried) ? retried : blurb;
	} catch {
		return "";
	}
}

/** @deprecated use generateArticleBlurb */
export async function generateSummary(
	title: string,
	content: string,
	model?: Awaited<ReturnType<typeof getFastModel>>,
): Promise<string> {
	return generateArticleBlurb(title, content, undefined, model);
}

/** @deprecated use generateArticleBlurb */
export async function generateContext(
	_title: string,
	_content: string,
	_category: string,
	_model?: Awaited<ReturnType<typeof getFastModel>>,
): Promise<string> {
	return "";
}

export async function rewriteMisleadingTitle(
	title: string,
	content: string,
	model?: Awaited<ReturnType<typeof getFastModel>>,
): Promise<string> {
	try {
		const m = model ?? (await getFastModel());
		const { text } = await generateText({
			model: m,
			prompt: `Reescreva este título sensacionalista para uma versão factual e direta em português (PT-BR). Máximo 100 caracteres. NUNCA invente fatos — baseie-se apenas no conteúdo.\n\nTítulo original: ${title}\n\nConteúdo: ${content.slice(0, 6000)}`,
			maxTokens: 80,
		});
		return text.trim() || title;
	} catch {
		return title;
	}
}

export async function fetchRelatedArticles(
	articleId: string,
	category: string,
	limit = 2,
): Promise<Array<{ title: string; url: string; source: string }>> {
	try {
		const embedding = await getArticleEmbedding(articleId);
		if (embedding) {
			const results = await searchVectors(embedding, limit + 1, {
				daysBack: 3,
				minSimilarity: 0.55,
			});

			// Filter out the original article itself
			const filtered = results
				.filter((r) => r.id !== articleId)
				.slice(0, limit);

			if (filtered.length > 0) {
				return filtered.map((r) => ({
					title: r.metadata?.title ?? "",
					url: r.metadata?.url ?? "",
					source: r.metadata?.source ?? "",
				}));
			}
		}

		// Fallback to category based
		const byCategory = await query<{
			title: string;
			url: string;
			source: string;
		}>(
			`SELECT title, url, source FROM news_articles WHERE category = $1 AND id != $2
       AND published_at > NOW() - INTERVAL '72 hours' ORDER BY published_at DESC LIMIT $3`,
			[category, articleId, limit],
		);
		return byCategory.rows;
	} catch {
		return [];
	}
}
